# Module 6 assessment mapping

| Required behavior | Implementation |
|---|---|
| Document/source selection | `src/components/knowledge-desk.tsx`: four independently selectable source cards, select/deselect all, empty-selection state |
| Retrieval and evidence | `src/lib/knowledge.ts`: lexical match coverage, bounded top four passages; `src/lib/corpus.ts`: server-only fictional corpus |
| Grounded AI answer | `src/app/api/knowledge/route.ts`: selected excerpts only, structured output, allowlisted citation IDs, conservative abstention |
| Clickable citations and source links | Claim citation buttons open exact source passage dialog; authenticated same-origin passage URL |
| Confidence, limitations, missing context | Moderate/low/none labels with explanation; missing facts are not guessed; no-results and provider failures remain distinct |
| Privacy boundary | No full documents in client bundle; strict input and source allowlists, bounded body, session requirement, no-store responses; no private-file support claimed |
| Agent workflow | Visible per-request steps and documented retrieval pipeline |
| Approval controls | Explicit AI-provider consent; preserved task mutation previews and approvals at `/board` |
| Activity log | In-memory knowledge search log; preserved board action log; retention limitations visible |

The supplied submission bullets (agent workflow, approval controls, activity log) overlap Module 7. This deliverable includes reviewable versions of these while prioritizing Module 6's explicit retrieval outcome. It does not claim to complete Module 7's supervised-agent requirements.

## Reviewer walkthrough

1. Search “What must pass before launch?” without AI consent: inspect relevant passages; no generated answer is claimed.
2. Enable AI synthesis and repeat. Inspect every numbered citation, exact excerpt, source identity and passage link.
3. Deselect all: search is disabled. Select only Customer discovery notes; ask about release gates and observe restricted evidence.
4. Ask “What is our office Wi-Fi password?”: honest no-result state.
5. Ask “What is the approved advertising budget?”: inspect missing-context/weak-evidence behavior; no amount should be invented.
6. Inspect workflow steps and activity. Cancel a pending query and retry.
7. Open Project board; inspect and decline a task proposal before approving another.

## Curriculum continuity

Continues Tasklane (number 5) at the user's explicit request, in a separate repository/deployment. Tasklane itself was a new-product exception to the original Module 1 continuity instruction. ShelfSignal remains the user's number 2 submission. RoleBrief remains number 4.
