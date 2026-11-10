# Verification — Module 6

Verified 10 November 2026 (Africa/Lagos).

## Deployment

- Live: https://tasklane-knowledge.vercel.app
- Repository: https://github.com/PenielOkoli/tasklane-knowledge
- Verified application commit: `da1959750c7fbd5ca187fdfb9725d077aa7b383c`
- GitHub-triggered Production deployment: `dpl_3c9MGH3gUE1bvDt2817wBSGbjooX`, Ready; alias confirmed by Vercel inspect.
- Separate Vercel project `tasklane-knowledge`, connected to the same-named GitHub repository. Automatic deployment was observed after updating main.
- Separate sensitive Production `SESSION_SECRET` generated directly into Vercel, and `GROQ_API_KEY` entered by the user. Values were not placed in tracked files or output. Vercel link generated an ignored OIDC environment file automatically; that file was promptly removed without reading its value.

## Results

| Check | Result |
|---|---|
| TypeScript | Pass, including the final proposal-stage correction |
| Unit and rendering tests | 28/28 pass; includes 19 preserved action checks and 9 retrieval/citation/schema checks |
| Production build | Pass locally; final application commit also built successfully on Vercel |
| Knowledge HTTP checks | 9/9 groups pass, including real Groq grounded answer, validated citations, missing budget, selected sources, session access, invalid inputs, cross-origin and body-size rejection |
| Retained board HTTP/model checks | Latest run: 10/10 groups pass, including real search, AI mutation proposal, approval, undo, archive confirmation and isolation |
| Desktop browser | Source search, live answer, numbered citation dialog, exact passage, Escape dismissal and focus return, activity expansion, and no-result state observed |
| Mobile browser | 390 by 844 viewport, no horizontal overflow (document width 375 within viewport 390); two-column source cards and empty-selection disabling observed |

Machine-readable evidence: `local-verification.json`, `live-verification.json`, `board-verification.json`. Screenshots: `screenshots/live-answer.jpg`, `live-citation.jpg`, `live-no-result.jpg`, and `mobile-selection.jpg`.

## Failures, corrections, and honest limits

- The first local HTTP attempt could not reach the host preview from the restricted execution environment. Re-running with host access passed; no application change was needed for that infrastructure failure.
- The initial inherited board workflow sometimes returned no mutation proposal. `initial-board-verification.json` retains the failure. Inspection of the installed AI SDK showed prepared system instructions carry into later steps. The new repository explicitly switches to proposal-stage instructions after search. One subsequent full run still omitted a proposal; a focused fresh-session request and the final complete run passed. Model tool selection remains nondeterministic; this is not evidence of a perfect success rate. Manual proposal controls remain available and no missing proposal bypasses approval.
- A live knowledge response returned “None” as its model-supplied limitation. The server now always prefixes the sample-data and retrieval caveat. The final browser capture confirms it cannot disappear.
- Knowledge uses lexical retrieval over fictional demo documents, not embeddings or live company data. Confidence is heuristic; citation-ID validation does not prove entailment. The observed launch answer was manually checked against its cited passages.
- Private uploads, durable document storage, shared-user permissions, durable audit records and distributed rate limiting are not implemented or claimed. Knowledge activity clears on refresh; board cookie limitations are documented in README.
- New evidence-only commits may redeploy the same application code. The application commit above is the tested baseline; later documentation/screenshots do not change runtime behavior.
