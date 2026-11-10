import { z } from 'zod';
import { decisionRequest, demoRequest, manualRequest, proposeRequest, publicWorkspace, undoRequest, type Session } from '@/lib/contracts';
import { freshSession } from '@/lib/seed';
import { ActionError, appendLog, decide, propose, requireRevision, rollback } from '@/lib/engine';
import { sessionCookie, sessionFromRequest } from '@/lib/session';
import { readJSON } from '@/lib/http';
import { planWithAI } from '@/lib/agent';

export const runtime = 'nodejs';
export const maxDuration = 60;
const requestSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('propose'), data: proposeRequest }).strict(),
  z.object({ operation: z.literal('manual'), data: manualRequest }).strict(),
  z.object({ operation: z.literal('decide'), data: decisionRequest }).strict(),
  z.object({ operation: z.literal('undo'), data: undoRequest }).strict(),
  z.object({ operation: z.literal('demo'), data: demoRequest }).strict(),
  z.object({ operation: z.literal('reset'), data: z.object({ confirmation: z.literal('RESET') }).strict() }).strict(),
]);
function reply(body: object, session: Session | null, status = 200) {
  return Response.json({ ...body, ...(session ? { workspace: publicWorkspace(session) } : {}), configured: Boolean(process.env.GROQ_API_KEY) }, { status, headers: { 'Cache-Control': 'no-store', ...(session ? { 'Set-Cookie': sessionCookie(session) } : {}) } });
}
export async function GET(request: Request) {
  try { return reply({}, sessionFromRequest(request) ?? freshSession()); }
  catch (error) { return reply({ error: error instanceof ActionError ? error.message : 'The workspace could not load.' }, null, error instanceof ActionError ? error.status : 500); }
}
let rateStart = 0, calls = 0;
export async function POST(request: Request) {
  let session: Session | null = null;
  let operation = 'request';
  try {
    const body = await readJSON(request);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      session = sessionFromRequest(request);
      throw new ActionError(400, 'Invalid request or unexpected parameters.');
    }
    const input = parsed.data; operation = input.operation;
    if (operation === 'reset') return reply({ message: 'A fresh demo workspace is ready.' }, freshSession());
    session = sessionFromRequest(request);
    if (!session) throw new ActionError(401, 'Open the workspace before making a request.');
    if (input.operation === 'reset') throw new ActionError(400, 'Invalid operation.');
    requireRevision(session, input.data.revision);
    if (input.operation === 'propose') {
      if (Date.now() - rateStart > 60000) { calls = 0; rateStart = Date.now(); }
      if (calls >= 10) throw new ActionError(429, 'The assistant is busy. Please try again in a minute.');
      calls++;
      const result = await planWithAI(session, input.data.prompt, request.signal);
      return reply(result, session);
    }
    if (input.operation === 'manual') propose(session, input.data.action, 'manual');
    if (input.operation === 'decide') decide(session, input.data);
    if (input.operation === 'undo') rollback(session, input.data);
    if (input.operation === 'demo') {
      const target = session.tasks.find(t => t.status === 'done') ?? session.tasks[0];
      const scenario = input.data.scenario;
      if (scenario === 'create' || scenario === 'failure') propose(session, { toolName: 'createTask', input: { title: 'Check the keyboard journey', description: 'Walk through the core screens using only the keyboard and record any blockers.', priority: 'medium', tag: 'design' } }, 'demo', Date.now(), scenario === 'failure');
      else if (!target) throw new ActionError(404, 'Create a task before running this scenario.');
      else if (scenario === 'archive') propose(session, { toolName: 'archiveTask', input: { taskId: target.id } }, 'demo');
      else propose(session, { toolName: 'setPriority', input: { taskId: target.id, priority: target.priority === 'high' ? 'medium' : 'high' } }, 'demo');
    }
    console.info(JSON.stringify({ event: 'workspace_action', operation, revision: session.revision, outcome: session.logs[0]?.status }));
    return reply({ message: input.operation === 'undo' ? 'Last change undone. The previous task state has been restored.' : input.operation === 'decide' ? input.data.decision === 'approve' ? 'Approved change completed.' : 'Proposal declined. Your board is unchanged.' : 'Proposal ready. Review it before anything changes.' }, session);
  } catch (error) {
    const known = error instanceof ActionError;
    const status = known ? error.status : 502;
    const message = known ? error.message : 'The AI could not complete the request. No task was changed. Please try again.';
    if (session && !(known && error.message.startsWith('Simulated failure'))) appendLog(session, operation, 'failed', message);
    const providerError = error as { name?: string; statusCode?: number; responseBody?: string };
    let providerCode: string | undefined;
    try { const code = JSON.parse(providerError.responseBody || '{}')?.error?.code; if (typeof code === 'string' && /^[a-z_]{1,60}$/.test(code)) providerCode = code; } catch {}
    console.warn(JSON.stringify({ event: 'workspace_action', operation, outcome: 'failed', status, errorName: providerError.name, providerStatus: providerError.statusCode, providerCode }));
    try { return reply({ error: message }, session, status); }
    catch { return reply({ error: 'Workspace storage is full. No new state was saved. Reset the demo to continue.' }, null, 409); }
  }
}
