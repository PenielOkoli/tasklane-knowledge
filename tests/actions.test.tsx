import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { freshSession } from '../src/lib/seed';
import { appendLog, decide, propose, rollback, searchTasks, validateAction, ActionError } from '../src/lib/engine';
import { encodeSession, decodeSession } from '../src/lib/session';
import { readJSON } from '../src/lib/http';
import { ProposalCard } from '../src/components/proposal';
const secret = 'test-secret-only-never-use-in-production-123456789';
const create = { toolName: 'createTask', input: { title: 'Test task', description: 'Test description', priority: 'medium', tag: 'design' } };
const approve = (s: ReturnType<typeof freshSession>, confirmation = '') => decide(s, { proposalId: s.proposal!.id, revision: s.revision, decision: 'approve', confirmation });
const rejects = (fn: () => unknown, status: number) => assert.throws(fn, e => e instanceof ActionError && e.status === status);

test('a model proposal does not mutate tasks or revision', () => {
  const s = freshSession(); const before = structuredClone(s.tasks); propose(s, create, 'ai');
  assert.deepEqual(s.tasks, before); assert.equal(s.revision, 0); assert.equal(s.logs[0].status, 'proposed');
});
test('creation runs only after approval and can be rolled back', () => {
  const s = freshSession(); const before = structuredClone(s.tasks); propose(s, create, 'ai'); approve(s);
  assert.equal(s.tasks.length, 7); assert.equal(s.revision, 1); assert.equal(s.proposal, null); assert.equal(s.logs[0].status, 'succeeded');
  rollback(s, { undoId: s.undo!.id, revision: s.revision }); assert.deepEqual(s.tasks, before); assert.equal(s.logs[0].status, 'rolled_back');
});
test('archive is rejected without the exact confirmation and leaves task intact', () => {
  const s = freshSession(); propose(s, { toolName: 'archiveTask', input: { taskId: s.tasks[0].id } }, 'ai');
  for (const word of ['', 'archive', 'yes']) rejects(() => approve(s, word), 403);
  assert.equal(s.tasks.length, 6); approve(s, 'ARCHIVE'); assert.equal(s.tasks.length, 5);
  rollback(s, { undoId: s.undo!.id, revision: s.revision }); assert.equal(s.tasks.length, 6);
});
test('priority and movement changes preserve unrelated fields and undo restores them', () => {
  for (const action of [{toolName:'setPriority',input:{taskId:'tsk-research',priority:'high'}},{toolName:'moveTask',input:{taskId:'tsk-research',status:'doing'}}]) {
    const s = freshSession(); const before = structuredClone(s.tasks[0]); propose(s, action, 'manual'); approve(s);
    const after = s.tasks.find(t => t.id === before.id)!; assert.equal(after.description, before.description); assert.notDeepEqual(after,before);
    rollback(s,{undoId:s.undo!.id,revision:s.revision}); assert.deepEqual(s.tasks.find(t=>t.id===before.id),before);
  }
});
test('decline clears the proposal without changing tasks', () => {
  const s = freshSession(); const before = structuredClone(s.tasks); propose(s,create,'ai');
  decide(s,{proposalId:s.proposal!.id,revision:0,decision:'decline',confirmation:''}); assert.deepEqual(s.tasks,before); assert.equal(s.proposal,null); assert.equal(s.logs[0].status,'declined');
});
test('expired proposals and stale revisions cannot execute', () => {
  const s=freshSession(); propose(s,create,'ai',1000);
  rejects(()=>decide(s,{proposalId:s.proposal!.id,revision:0,decision:'approve',confirmation:''},601001),409);
  s.proposal!.expiresAt=Date.now()+10000; rejects(()=>decide(s,{proposalId:s.proposal!.id,revision:99,decision:'approve',confirmation:''}),409);
  assert.equal(s.tasks.length,6);
});
test('cross-session proposal IDs cannot approve another workspace', () => {
  const a=freshSession(),b=freshSession(); propose(a,create,'ai'); propose(b,create,'manual');
  rejects(()=>decide(b,{proposalId:a.proposal!.id,revision:0,decision:'approve',confirmation:''}),409); assert.equal(b.tasks.length,6);
});
test('sequential repeated approval and undo are rejected', () => {
  const s=freshSession(); propose(s,create,'ai'); const id=s.proposal!.id; approve(s);
  rejects(()=>decide(s,{proposalId:id,revision:1,decision:'approve',confirmation:''}),409);
  const undoId=s.undo!.id; rollback(s,{undoId,revision:1}); rejects(()=>rollback(s,{undoId,revision:2}),409);
});
test('pending proposals block another proposal and undo', () => {
  const s=freshSession(); propose(s,create,'ai'); approve(s); const undoId=s.undo!.id; propose(s,create,'manual');
  rejects(()=>propose(s,create,'ai'),409); rejects(()=>rollback(s,{undoId,revision:1}),409);
});
test('unknown tools, extra inputs, invalid enums, and foreign task IDs fail closed', () => {
  const s=freshSession();
  for(const action of [{toolName:'deleteAll',input:{}},{toolName:'archiveTask',input:{taskId:'tsk-research',approved:true}},{toolName:'setPriority',input:{taskId:'tsk-research',priority:'urgent'}},{...create,input:{...create.input,title:''}}]) rejects(()=>validateAction(s,action),400);
  rejects(()=>validateAction(s,{toolName:'archiveTask',input:{taskId:'tsk-foreign'}}),404);
});
test('inputs and ownership are revalidated at execution time', () => {
  const s=freshSession(); propose(s,{toolName:'archiveTask',input:{taskId:s.tasks[0].id}},'ai'); s.tasks.shift(); rejects(()=>approve(s,'ARCHIVE'),404);
});
test('simulated failure leaves board unchanged and retry commits exactly once', () => {
  const s=freshSession(); const before=structuredClone(s.tasks); propose(s,create,'demo',Date.now(),true);
  rejects(()=>approve(s),503); assert.deepEqual(s.tasks,before); assert.equal(s.revision,0); assert.equal(s.logs[0].status,'failed');
  approve(s); assert.equal(s.tasks.length,7); assert.equal(s.logs[0].status,'succeeded');
});
test('search uses validated filters and never changes the board', () => {
  const s=freshSession(); const before=structuredClone(s);
  assert.equal(searchTasks(s,{query:'',status:'all',priority:'high'}).length,2);
  assert.equal(searchTasks(s,{query:'checkout',status:'doing',priority:'all'})[0].id,'tsk-checkout');
  assert.deepEqual(s,before); rejects(()=>searchTasks(s,{query:'',status:'all',priority:'critical'}),400);
});
test('cookie round-trip preserves the workspace and detects tampering, wrong secret and expiry', () => {
  const s=freshSession(); const encoded=encodeSession(s,secret); assert.deepEqual(decodeSession(encoded,secret),s);
  const changed=Buffer.from(encoded,'base64url'); changed[35]^=1;
  rejects(()=>decodeSession(changed.toString('base64url'),secret),401); rejects(()=>decodeSession(encoded,secret+'wrong'),401); rejects(()=>decodeSession(encoded,secret,s.expiresAt+1),401);
});
test('session encryption uses random nonces and refuses missing production-strength keys', () => {
  const s=freshSession(); assert.notEqual(encodeSession(s,secret),encodeSession(s,secret)); rejects(()=>encodeSession(s,'short'),503);
});
test('activity is bounded and records parameters, outcomes and duration', () => {
  const s=freshSession(); for(let i=0;i<15;i++) appendLog(s,'searchTasks','succeeded','Search finished',{query:'design'},3);
  assert.equal(s.logs.length,10); assert.equal(s.logs[0].durationMs,3); assert.match(s.logs[0].input,/design/); assert.ok(encodeSession(s,secret).length<3700);
});
test('approval card shows a before/after preview and archive gate', () => {
  const s=freshSession(); propose(s,{toolName:'archiveTask',input:{taskId:s.tasks[0].id}},'ai');
  const render=(confirmation:string)=>renderToStaticMarkup(<ProposalCard proposal={s.proposal!} tasks={s.tasks} confirmation={confirmation} setConfirmation={()=>{}} onDecision={()=>{}} busy={false}/>);
  const html=render(''); assert.match(html,/BEFORE/); assert.match(html,/AFTER/); assert.match(html,/Archive confirmation/); assert.match(html,/disabled=""/); assert.match(html,/Customer interview synthesis/);
  assert.doesNotMatch(render('ARCHIVE'),/disabled=""/);
});
test('untrusted task text is escaped in previews', () => {
  const s=freshSession(); propose(s,{...create,input:{...create.input,title:'<script>alert(1)</script>'}},'ai');
  const html=renderToStaticMarkup(<ProposalCard proposal={s.proposal!} tasks={s.tasks} confirmation="" setConfirmation={()=>{}} onDecision={()=>{}} busy={false}/>);
  assert.match(html,/&lt;script&gt;/); assert.doesNotMatch(html,/<script>/);
});
test('HTTP boundary rejects cross-origin, wrong-media, malformed and oversized input', async () => {
  for(const [body,type,origin,status] of [['{}','application/json','https://other.test',403],['{}','text/plain','https://task.test',415],['{','application/json','https://task.test',400],['x'.repeat(12001),'application/json','https://task.test',413]] as const) {
    await assert.rejects(readJSON(new Request('https://task.test/api/workspace',{method:'POST',headers:{origin,'content-type':type},body})),e=>e instanceof ActionError&&e.status===status);
  }
});
