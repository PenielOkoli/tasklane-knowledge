# Module 6 — Tasklane Knowledge

Continue Tasklane in a new repository and a new GitHub-connected Vercel project. User corrected an initial fresh-product choice on 10 November 2026: Tasklane is the approved continuation. Prior submitted repositories and deployments stay unchanged. Module 5's source is the local `tasklane/` snapshot (its Git HEAD was unborn when copied); no Git metadata, secrets, node_modules, deployment identity, or historical evidence were copied.

## Acceptance criteria

- Preserve task board, validated mutation previews, approvals, undo and activity at `/board`.
- Default route: selectable project source cards, question composer, consent for provider synthesis, retrieved passages, clickable claim citations, and a keyboard-accessible source dialog.
- Server-only fixed demo corpus; metadata listing and bounded passage inspection; no arbitrary path, URL fetch, private uploads, or full corpus client bundle.
- Selected-source lexical retrieval with conservative thresholds, then schema-constrained Groq synthesis with validated citation IDs. Show no-result, weak matches, provider unavailable, cancellation and errors honestly.
- Confidence is an explanatory coverage label, not calibrated probability. Never claim automatic citation ID validation proves semantic support.
- Keep tests, live/API/browser results and remaining limits in the repository. New GitHub repo and separate Vercel variables and deployment.

## Workflow and controls

Select sources → explicit optional AI consent → server validates input/session/source allowlist → retrieve bounded passages → abstain on weak/no matches → synthesize only with consent → validate claim citation IDs → display answer/evidence/limits → inspect exact passage. Knowledge does not mutate tasks. Task changes remain in the separate board approval workflow.

The source-selection branch of the supplied “upload or select” requirement is implemented. Documents are fictional public demo content. Private ingestion, vector embeddings, durable audit storage, concurrent shared workspaces and production document ACLs are out of scope and not claimed.
