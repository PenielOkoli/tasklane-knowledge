import { randomUUID } from 'node:crypto';
import { actionSchema, searchInput, type Action, type LogEntry, type Session, type Task } from './contracts';

export class ActionError extends Error { constructor(public status: number, message: string) { super(message); } }
export function appendLog(session: Session, toolName: string, status: LogEntry['status'], detail: string, input: unknown = {}, durationMs = 0) {
  session.logs = [{ id: randomUUID(), toolName, status, detail: detail.slice(0, 160), input: JSON.stringify(input).slice(0, 500), at: Date.now(), durationMs }, ...session.logs].slice(0, 10);
}
export function requireRevision(session: Session, revision: number) { if (revision !== session.revision) throw new ActionError(409, 'This board has changed. Refresh before trying again.'); }
export function validateAction(session: Session, raw: unknown): Action {
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) throw new ActionError(400, 'The tool parameters do not match the allowed schema.');
  const action = parsed.data;
  if (action.toolName === 'createTask') {
    if (session.tasks.length >= 12) throw new ActionError(409, 'This demo holds up to 12 tasks. Archive a task before adding another.');
  } else {
    const task = session.tasks.find(t => t.id === action.input.taskId);
    if (!task) throw new ActionError(404, 'That task is not in your workspace.');
    if (action.toolName === 'setPriority' && task.priority === action.input.priority) throw new ActionError(409, 'This task already has that priority.');
    if (action.toolName === 'moveTask' && task.status === action.input.status) throw new ActionError(409, 'This task is already in that column.');
  }
  return action;
}
export function searchTasks(session: Session, raw: unknown) {
  const parsed = searchInput.safeParse(raw);
  if (!parsed.success) throw new ActionError(400, 'Invalid search parameters.');
  const { query, status, priority } = parsed.data;
  return session.tasks.filter(t => `${t.title} ${t.description} ${t.tag}`.toLowerCase().includes(query.toLowerCase()) && (status === 'all' || t.status === status) && (priority === 'all' || t.priority === priority));
}
export function propose(session: Session, raw: unknown, source: 'ai' | 'manual' | 'demo', now = Date.now(), failOnce = false) {
  if (session.proposal) throw new ActionError(409, 'Approve or decline the current proposal before requesting another.');
  const action = validateAction(session, raw);
  session.proposal = { id: randomUUID(), action, baseRevision: session.revision, expiresAt: now + 600000, source, failOnce };
  appendLog(session, action.toolName, 'proposed', 'Validated proposal. Waiting for your approval.', action.input);
  return session.proposal;
}
export function decide(session: Session, input: { proposalId: string; revision: number; decision: 'approve' | 'decline'; confirmation: string }, now = Date.now()) {
  requireRevision(session, input.revision);
  const proposal = session.proposal;
  if (!proposal || proposal.id !== input.proposalId) throw new ActionError(409, 'This proposal is no longer pending in your workspace.');
  if (input.decision === 'decline') { appendLog(session, proposal.action.toolName, 'declined', 'You declined the proposal. No task was changed.'); session.proposal = null; return; }
  if (proposal.expiresAt < now) throw new ActionError(409, 'This proposal expired. Decline it and request a fresh one.');
  requireRevision(session, proposal.baseRevision);
  // Revalidate both input schema and session ownership at execution time.
  const action = validateAction(session, proposal.action);
  if (action.toolName === 'archiveTask' && input.confirmation !== 'ARCHIVE') throw new ActionError(403, 'Type ARCHIVE to confirm removing this task from the board.');
  if (proposal.failOnce) {
    proposal.failOnce = false;
    appendLog(session, action.toolName, 'failed', 'Simulated failure before commit. Board unchanged; retry is available.', action.input);
    throw new ActionError(503, 'Simulated failure: nothing changed. You can retry the same proposal.');
  }
  const before: Task | null = action.toolName === 'createTask' ? null : structuredClone(session.tasks.find(t => t.id === action.input.taskId)!);
  let after: Task | null;
  if (action.toolName === 'createTask') after = { id: `tsk-${randomUUID().slice(0, 8)}`, status: 'todo', ...action.input };
  else if (action.toolName === 'archiveTask') after = null;
  else if (action.toolName === 'setPriority') after = { ...before!, priority: action.input.priority };
  else after = { ...before!, status: action.input.status };
  const nextTasks = session.tasks.filter(t => !before || t.id !== before.id);
  if (after) nextTasks.push(after);
  session.tasks = nextTasks;
  session.revision++;
  session.undo = { id: randomUUID(), action, before, after, revision: session.revision };
  session.proposal = null;
  appendLog(session, action.toolName, 'succeeded', 'Approved change committed. Undo is available until the next change.', action.input);
}
export function rollback(session: Session, input: { undoId: string; revision: number }) {
  requireRevision(session, input.revision);
  if (session.proposal) throw new ActionError(409, 'Finish or decline the pending proposal before undoing.');
  const undo = session.undo;
  if (!undo || undo.id !== input.undoId || undo.revision !== session.revision) throw new ActionError(409, 'This change can no longer be undone.');
  session.tasks = session.tasks.filter(t => t.id !== undo.after?.id);
  if (undo.before) session.tasks.push(undo.before);
  session.revision++;
  session.undo = null;
  appendLog(session, undo.action.toolName, 'rolled_back', 'The last change was undone and its previous state restored.');
}
