import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import type { Workspace } from '../src/lib/contracts';
const base = process.argv[2] || 'https://tasklane.vercel.app';
const live = process.argv.includes('--live');
type Client = { cookie: string; workspace: Workspace | null };
const checks: {name:string; passed:boolean; detail?:unknown}[] = [];
const a:Client={cookie:'',workspace:null}, b:Client={cookie:'',workspace:null};
async function call(client:Client, operation?:string, data?:unknown) {
  const response=await fetch(`${base}/api/workspace`, operation ? {method:'POST',headers:{'content-type':'application/json',origin:base,...(client.cookie?{cookie:client.cookie}:{})},body:JSON.stringify({operation,data})} : {headers:client.cookie?{cookie:client.cookie}:{}});
  const cookie=response.headers.get('set-cookie'); if(cookie) client.cookie=cookie.split(';')[0];
  const body=await response.json(); if(body.workspace) client.workspace=body.workspace;
  return {status:response.status,body};
}
async function check(name:string, fn:()=>Promise<unknown>) { try {const detail=await fn();checks.push({name,passed:true,...(detail?{detail}:{})});}catch(e){checks.push({name,passed:false,detail:e instanceof Error?e.message:'failed'});} }
const revision=()=>a.workspace!.revision;
const decision=(confirmation='',choice='approve')=>({proposalId:a.workspace!.proposal!.id,revision:revision(),decision:choice,confirmation});
async function main(){
  await check('pages',async()=>{for(const path of ['/','/guide']) assert.equal((await fetch(`${base}${path}`)).status,200);});
  await check('isolated sessions and secure cookie',async()=>{assert.equal((await call(a)).status,200);assert.equal((await call(b)).status,200);assert.notEqual(a.cookie,b.cookie);assert.equal(a.workspace!.tasks.length,6);});
  await check('unknown tool rejected and logged',async()=>{assert.equal((await call(a,'manual',{revision:revision(),action:{toolName:'deleteAll',input:{}}})).status,400);assert.equal(a.workspace!.logs[0].status,'failed');});
  await check('archive approval gate and cross-session isolation',async()=>{
    const before=a.workspace!.tasks.length;assert.equal((await call(a,'demo',{scenario:'archive',revision:revision()})).status,200);assert.equal(a.workspace!.tasks.length,before);
    assert.equal((await call(b,'decide',{...decision('ARCHIVE'),revision:b.workspace!.revision})).status,409);
    assert.equal((await call(a,'decide',decision())).status,403);assert.equal(a.workspace!.tasks.length,before);
    assert.equal((await call(a,'decide',decision('ARCHIVE'))).status,200);assert.equal(a.workspace!.tasks.length,before-1);
    assert.equal(b.workspace!.tasks.length,6);
  });
  await check('rollback restores archive',async()=>{const undo=a.workspace!.undo!;assert.equal((await call(a,'undo',{undoId:undo.id,revision:revision()})).status,200);assert.equal(a.workspace!.tasks.length,6);assert.equal(a.workspace!.logs[0].status,'rolled_back');});
  await check('simulated failure, retry, replay prevention, rollback',async()=>{
    assert.equal((await call(a,'demo',{scenario:'failure',revision:revision()})).status,200);const first=decision();
    assert.equal((await call(a,'decide',first)).status,503);assert.equal(a.workspace!.tasks.length,6);assert.equal(a.workspace!.logs[0].status,'failed');
    assert.equal((await call(a,'decide',first)).status,200);assert.equal(a.workspace!.tasks.length,7);
    assert.equal((await call(a,'decide',{...first,revision:revision()})).status,409);assert.equal(a.workspace!.tasks.length,7);
    assert.equal((await call(a,'undo',{undoId:a.workspace!.undo!.id,revision:revision()})).status,200);assert.equal(a.workspace!.tasks.length,6);
  });
  await check('server ownership and stale revision checks',async()=>{
    assert.equal((await call(a,'manual',{revision:revision(),action:{toolName:'archiveTask',input:{taskId:'tsk-foreign'}}})).status,404);
    assert.equal((await call(a,'demo',{scenario:'create',revision:999})).status,409);
  });
  await check('HTTP boundary checks',async()=>{
    for(const [body,type,origin,status] of [['{}','application/json','https://other.test',403],['{}','text/plain',base,415],['{','application/json',base,400],['x'.repeat(12001),'application/json',base,413]] as const){const r=await fetch(`${base}/api/workspace`,{method:'POST',headers:{origin,'content-type':type,cookie:a.cookie},body});assert.equal(r.status,status);}
  });
  if(live){
    await check('real AI search tool',async()=>{const before=JSON.stringify(a.workspace!.tasks);const r=await call(a,'propose',{prompt:'Find all high-priority tasks. Do not change anything.',revision:revision()});assert.equal(r.status,200);assert.equal(r.body.source,'ai');assert.equal(JSON.stringify(a.workspace!.tasks),before);assert.equal(a.workspace!.proposal,null);assert.ok(a.workspace!.logs.some(l=>l.toolName==='searchTasks'&&l.status==='succeeded'));return {matches:r.body.matches?.length};});
    await check('real AI mutation proposal requires approval',async()=>{const r=await call(a,'propose',{prompt:'Set the priority of Review mobile layouts (tsk-mobile) to high. Propose only this one change.',revision:revision()});assert.equal(r.status,200);assert.equal(a.workspace!.proposal?.source,'ai');assert.equal(a.workspace!.proposal?.action.toolName,'setPriority');assert.equal(a.workspace!.tasks.find(t=>t.id==='tsk-mobile')!.priority,'medium');
      assert.equal((await call(a,'decide',decision())).status,200);assert.equal(a.workspace!.tasks.find(t=>t.id==='tsk-mobile')!.priority,'high');assert.equal((await call(a,'undo',{undoId:a.workspace!.undo!.id,revision:revision()})).status,200);assert.equal(a.workspace!.tasks.find(t=>t.id==='tsk-mobile')!.priority,'medium');});
  }
  const report={checkedAt:new Date().toISOString(),url:base,liveRequested:live,passed:checks.every(c=>c.passed),checks};writeFileSync('docs/modules/05/live-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
