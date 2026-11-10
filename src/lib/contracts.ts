import { z } from 'zod';

export const prioritySchema = z.enum(['low', 'medium', 'high']);
export const statusSchema = z.enum(['todo', 'doing', 'done']);
export const tagSchema = z.enum(['design', 'engineering', 'research', 'content']);
const text = (max: number) => z.string().trim().min(1).max(max);
export const taskIdSchema = z.string().regex(/^tsk-[a-z0-9-]{1,32}$/);
export const searchInput = z.object({ query: z.string().trim().max(100), status: z.enum(['all', 'todo', 'doing', 'done']), priority: z.enum(['all', 'low', 'medium', 'high']) }).strict();
export const createInput = z.object({ title: text(80), description: text(180), priority: prioritySchema, tag: tagSchema }).strict();
export const priorityInput = z.object({ taskId: taskIdSchema, priority: prioritySchema }).strict();
export const moveInput = z.object({ taskId: taskIdSchema, status: statusSchema }).strict();
export const archiveInput = z.object({ taskId: taskIdSchema }).strict();
export const actionSchema = z.discriminatedUnion('toolName', [
  z.object({ toolName: z.literal('createTask'), input: createInput }).strict(),
  z.object({ toolName: z.literal('setPriority'), input: priorityInput }).strict(),
  z.object({ toolName: z.literal('moveTask'), input: moveInput }).strict(),
  z.object({ toolName: z.literal('archiveTask'), input: archiveInput }).strict(),
]);
export type Action = z.infer<typeof actionSchema>;
export type ToolName = Action['toolName'] | 'searchTasks';
export type Priority = z.infer<typeof prioritySchema>;
export type Status = z.infer<typeof statusSchema>;
export const taskSchema = createInput.extend({ id: taskIdSchema, status: statusSchema }).strict();
export type Task = z.infer<typeof taskSchema>;
export const proposalSchema = z.object({ id: z.string().uuid(), action: actionSchema, baseRevision: z.number().int().nonnegative(), expiresAt: z.number(), source: z.enum(['ai', 'manual', 'demo']), failOnce: z.boolean() }).strict();
export type Proposal = z.infer<typeof proposalSchema>;
export const logSchema = z.object({ id: z.string(), toolName: z.string().max(40), status: z.enum(['proposed', 'succeeded', 'failed', 'declined', 'rolled_back']), detail: z.string().max(160), at: z.number(), durationMs: z.number().nonnegative(), input: z.string().max(500) }).strict();
export type LogEntry = z.infer<typeof logSchema>;
export const undoSchema = z.object({ id: z.string().uuid(), action: actionSchema, before: taskSchema.nullable(), after: taskSchema.nullable(), revision: z.number().int() }).strict();
export const sessionSchema = z.object({ id: z.string().uuid(), expiresAt: z.number(), revision: z.number().int().nonnegative(), tasks: z.array(taskSchema).max(12), logs: z.array(logSchema).max(10), proposal: proposalSchema.nullable(), undo: undoSchema.nullable() }).strict();
export type Session = z.infer<typeof sessionSchema>;
export type Workspace = Pick<Session, 'revision' | 'tasks' | 'logs' | 'proposal' | 'undo'>;
export const proposeRequest = z.object({ prompt: text(1200), revision: z.number().int().nonnegative() }).strict();
export const manualRequest = z.object({ action: actionSchema, revision: z.number().int().nonnegative() }).strict();
export const decisionRequest = z.object({ proposalId: z.string().uuid(), revision: z.number().int().nonnegative(), decision: z.enum(['approve', 'decline']), confirmation: z.string().max(20) }).strict();
export const undoRequest = z.object({ undoId: z.string().uuid(), revision: z.number().int().nonnegative() }).strict();
export const demoRequest = z.object({ scenario: z.enum(['create', 'priority', 'archive', 'failure']), revision: z.number().int().nonnegative() }).strict();
export const labels: Record<Status, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
export const toolLabels: Record<ToolName, string> = { searchTasks: 'Search tasks', createTask: 'Create a task', setPriority: 'Change priority', moveTask: 'Move a task', archiveTask: 'Archive a task' };
export function publicWorkspace(session: Session): Workspace { const { revision, tasks, logs, proposal, undo } = session; return { revision, tasks, logs, proposal, undo }; }
