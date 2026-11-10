import 'server-only';
import type { Source, Passage } from './knowledge';
// Intentionally public fictional demo documents. Never import this module into client components.
export const sources: Source[] = [
 { id: 'brief', title: 'Spring launch brief', category: 'Planning', updated: '2026-11-10', description: 'Scope, milestones, and the launch decision.' },
 { id: 'research', title: 'Customer discovery notes', category: 'Research', updated: '2026-11-08', description: 'Interview themes and the limits of the sample.' },
 { id: 'quality', title: 'Release quality checklist', category: 'Engineering', updated: '2026-11-09', description: 'Mobile, accessibility, and release readiness.' },
 { id: 'workflow', title: 'Team working agreement', category: 'Operations', updated: '2026-11-07', description: 'Ownership, priorities, and approval rules.' },
];
export const passages: Passage[] = [
 { id:'brief-1', sourceId:'brief', heading:'Launch scope', text:'The Spring launch focuses on a simpler onboarding flow and a checkout prototype. The launch announcement follows the release decision. Payment processing and a production checkout are outside this prototype scope.' },
 { id:'brief-2', sourceId:'brief', heading:'Release decision', text:'The target launch date is 24 November 2026. This is a target, not a confirmed commitment. The project lead approves the launch only after mobile review and the release quality checklist pass. An unresolved high-priority defect blocks release.' },
 { id:'brief-3', sourceId:'brief', heading:'Open decisions', text:'The project budget has not been approved. Pricing, revenue forecasts, and a final marketing spend are not documented. The project lead must provide these decisions before financial questions can be answered.' },
 { id:'research-1', sourceId:'research', heading:'Onboarding findings', text:'Five customers participating in discovery described onboarding as too long. Three struggled to identify the first useful action after sign-up. The design recommendation is to reduce required fields and make the next action clear.' },
 { id:'research-2', sourceId:'research', heading:'Research limitations', text:'The discovery study included five existing customers recruited by the team. It is a small convenience sample, not a representative survey. These interviews do not establish conversion improvements or prove what all customers prefer.' },
 { id:'quality-1', sourceId:'quality', heading:'Mobile review', text:'Review mobile layouts at 360, 390, and 768 pixels. Check navigation, form labels, readable text, and horizontal overflow. The mobile review owner records issues on the project board before the release decision.' },
 { id:'quality-2', sourceId:'quality', heading:'Release quality gate', text:'Before launch, complete a keyboard-only journey, visible focus checks, form error checks, and loading and empty states. High-priority defects must be fixed or the release is blocked. The project lead records the final approval.' },
 { id:'quality-3', sourceId:'quality', heading:'Checkout prototype', text:'The checkout prototype must show loading, validation errors, and a successful demo completion. Do not collect card details or claim that a real payment was made. Production payments require a separate integration and review.' },
 { id:'workflow-1', sourceId:'workflow', heading:'Task approvals', text:'Tasklane searches tasks without approval. Creating a task, moving it, changing its priority, or archiving it requires a preview and explicit human approval. Archiving additionally requires typing ARCHIVE. The latest approved change can be undone.' },
 { id:'workflow-2', sourceId:'workflow', heading:'Priority and ownership', text:'High priority means a release blocker or a dependency that prevents another task from moving. Medium priority covers planned work; low priority covers improvements that can wait. The project lead resolves ownership questions; named assignees have not been recorded in this sample agreement.' },
];

