# Tasklane Knowledge

**Less searching. More knowing.** FlexiSAF deliverable 6: Retrieval-Augmented Frontend AI Experiences.

Continues Tasklane's project task desk with selected project documents, grounded AI answers, clickable citations, an exact-passage inspector, explicit uncertainty, and an honest no-result state. The board, proposal approvals, undo, and task activity remain at `/board`.

## Links and evidence

- Repository: https://github.com/PenielOkoli/tasklane-knowledge
- Live deployment: https://tasklane-knowledge.vercel.app
- [Assessment mapping](docs/modules/06/assessment.md)
- [Implementation plan and provenance](docs/modules/06/plan.md)
- [Verification](docs/modules/06/verification.md)
- [Retrieval and citation validation](src/lib/knowledge.ts)
- [Server workflow](src/app/api/knowledge/route.ts)
- [Retrieval tests](tests/knowledge.test.tsx)
- [Preserved action tests](tests/actions.test.tsx)

## Run

Node 22. `npm ci`, then configure `SESSION_SECRET` (32+ random characters) and `GROQ_API_KEY` in the server environment. Never use NEXT_PUBLIC_ for secrets. `npm run dev` starts the app; `npm run check` checks types, runs tests and builds. Each Vercel project uses its own sensitive Production settings. No credentials are committed.

`node --import tsx scripts/verify-knowledge.ts <origin>` checks the HTTP interface. Add `--live` to verify real Groq output. Results are written to the module evidence directory. Run against a test instance or the dedicated demo deployment.

## Retrieval workflow

Source selection → validate session and source IDs → lexical passage retrieval → stop on weak/no match → optional consented Groq synthesis → validate structured claims and citation IDs → answer with evidence and limits → source inspection.

Search works without AI consent. Synthesis sends only the question and up to four matching excerpts to Groq. The corpus is server-only and intentionally consists of fictional public project documents. The API returns metadata and bounded matching passages, never an arbitrary file or full document. This implements the curriculum's source-selection option; private uploads are not supported.

The answer's confidence label is heuristic, not a probability. Valid citation IDs do not guarantee semantic entailment. Users can inspect each cited passage, and the interface explicitly states this limitation. Lexical retrieval can miss synonyms or retrieve weak keyword matches. Provider failures preserve evidence without fabricating an answer. The retained board model can occasionally omit a proposal; manual controls remain available and all actual changes still require approval. See the verification record for observed failures and successful final checks.

## Controls and retention

Knowledge search is read-only. AI synthesis requires a visible opt-in. Board mutations preserve Tasklane's preview and approval checks; archiving requires ARCHIVE. Knowledge activity stays in page memory (latest ten requests, clears on refresh). Board state is a 24-hour encrypted HttpOnly cookie with bounded activity. This is not a multi-user database or durable audit system. Per-instance rate limits are best-effort, not distributed abuse protection. Concurrent requests outside the sequential UI may overwrite cookie state; old-cookie replay is not globally prevented.

## Continuity

The user explicitly chose to continue Tasklane for number 6 in a new repository and Vercel project. The implementation starts from the local number 5 source snapshot, whose Git HEAD was unborn at copy time. No previous repository/deployment was changed. Tasklane's earlier new-product exception to Module 1 continuity is documented, not silently claimed as curriculum compliance. ShelfSignal remains number 2; RoleBrief remains number 4.

## References

- https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data — structured schema output used by synthesis.
- https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling — preserved board tool workflow.

