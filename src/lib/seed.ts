import { randomUUID } from 'node:crypto';
import type { Session, Task } from './contracts';
export const seedTasks: Task[] = [
  { id: 'tsk-research', title: 'Customer interview synthesis', description: 'Pull the key themes from the discovery notes into one clear readout.', status: 'todo', priority: 'medium', tag: 'research' },
  { id: 'tsk-onboarding', title: 'Map the onboarding flow', description: 'Sketch a simpler path from sign-up to the first useful moment.', status: 'todo', priority: 'high', tag: 'design' },
  { id: 'tsk-email', title: 'Draft launch announcement', description: 'Write a short introduction to the new experience and its main benefits.', status: 'todo', priority: 'low', tag: 'content' },
  { id: 'tsk-checkout', title: 'Build checkout prototype', description: 'Connect the core screens and include loading and error states.', status: 'doing', priority: 'high', tag: 'engineering' },
  { id: 'tsk-mobile', title: 'Review mobile layouts', description: 'Check navigation, form fields, and content at small screen sizes.', status: 'doing', priority: 'medium', tag: 'design' },
  { id: 'tsk-tokens', title: 'Publish design tokens', description: 'Document the shared colours, spacing, and type styles.', status: 'done', priority: 'low', tag: 'design' },
];
export function freshSession(now = Date.now()): Session { return { id: randomUUID(), expiresAt: now + 86400000, revision: 0, tasks: structuredClone(seedTasks), logs: [], proposal: null, undo: null }; }
