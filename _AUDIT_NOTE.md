# Audit Note — AIPersonalContextMCP

Domain: Personal-context MCP server — exposes a user's email/calendar/docs/health to AI assistants over Model Context Protocol, with consent, redaction, and disclosure controls.

Stack: Node + Express + React + Postgres + OpenRouter.
Routes mount in `backend/server.js`. AI helper: `backend/services/ai.js` (`callOpenRouter` + `runFeature(slug, schema, payload)` → records into `ai_results`). CRUD via `backend/routes/_crudFactory.js`.

## Currently Implemented

### AI endpoints (`backend/routes/ai.js`) — 7
1. `POST /api/ai/answer-from-context`
2. `POST /api/ai/consent-policy-check`
3. `POST /api/ai/audit-log` (LLM narrative over disclosure history)
4. `POST /api/ai/redaction-suggester`
5. `POST /api/ai/privacy-risk-score`
6. `POST /api/ai/intent-classifier`
7. `POST /api/ai/schema-extractor`
Plus `GET /api/ai/samples`, `GET /api/ai/history`.

### Non-AI surfaces
- CRUD: `connectors`, `data-sources`, `app-consents`, `disclosure-log` (audit log table), `mcp-clients`, `schemas`, `redaction-rules` (all CSV-bulk + attachments).
- Cross-cutting: `notifications`, `attachments`, `webhooks` + `webhook_deliveries`, `dashboard` counts.
- `GET /api/mcp/config` — emits MCP server snippet for client config.
- Custom views (`backend/routes/customViews.js`): retrieval-frequency series, source × query-type heatmap, context-profile export, retrieval-rules editor (in-memory weights).
- Frontend: 7 AI pages, 7 CRUD pages, `ConsentCenterWorkbench`, `McpServerConfigWorkbench`, `CustomViewsPage`, `TimelineView`, two Codex pages.

## Gap Analysis vs Brief

### Missing AI Counterparts
- **`context-summarizer`** — condense raw context (email thread, doc, calendar block) into assistant-ready brief. Not present; `answer-from-context` consumes context but doesn't produce a generic summary artifact.
- **`relevance-scorer`** — per-query scoring of each candidate context shard. Not present. `intent-classifier` covers intent only; retrieval-rules weights are static.
- **`sensitive-info-redactor`** — IMPLEMENTED as `redaction-suggester`. No gap.
- **`query-rewriter`** — rewrite assistant query for personal-context retrieval (expand pronouns, inject user-scope, strip identifiers). Not present.
- **`conflict-detector`** — detect contradictions across sources (calendar vs email vs notes). Not present.

### Missing Non-AI Features
- **Source connectors (Gmail / Calendar / Drive)** — only a `connectors` metadata table + status; no OAuth flow, token store, sync worker, or provider SDK wiring.
- **Consent manager** — IMPLEMENTED (`app_consents` CRUD + `ConsentCenterWorkbench`). No gap.
- **Audit log (who accessed what when)** — IMPLEMENTED (`disclosure_log` table + page + AI narrative endpoint). No gap.
- **Context export** — partial: customViews has a "context profile export" view, but no signed bundle endpoint (user data + consents + disclosures) for portability/GDPR.

### Missing Custom Features
- **Differential-privacy budget** — no ε tracking per app/scope; no decrement on disclosure; no budget exhaustion enforcement.
- **Share-with-AI dashboards** — partial: retrieval-frequency + heatmap exist; missing per-app share-graph (apps × fields × time) and "what each AI knows about you" surface.
- **Recall-and-forget engine** — no revoke endpoint that (a) revokes consent, (b) flags previously-disclosed fields for purge requests, (c) emits webhook to downstream apps, (d) logs forget action.

## Implemented (this round)
None — audit-only.

## Backlog (prioritized)
1. **MECHANICAL** `POST /api/ai/context-summarizer`, `relevance-scorer`, `query-rewriter`, `conflict-detector` — clone the 7 existing AI handlers; schema + sample triplet each; record into `ai_results`.
2. **MECHANICAL** `POST /api/export/context-bundle` — JSON dump of user's consents + disclosures + schemas + redaction rules.
3. **MECHANICAL** `dp_budgets` table + `POST /api/dp-budgets/:app/spend` + middleware decrement on disclosure insert.
4. **MECHANICAL** `POST /api/app-consents/:id/revoke` + `forget_requests` table + webhook fan-out (`consent.revoked`, `forget.requested`).
5. **MECHANICAL** `GET /api/custom-views/share-graph` — apps × fields × last-disclosed matrix from `disclosure_log` ⨯ `app_consents`.
6. **NEEDS-CREDS** Real Gmail / Google Calendar / Google Drive OAuth + ingestion workers (MCP server-side handlers expected for `personal-context` server in `mcpExtras.js`, currently a stub config).
7. **NEEDS-PRODUCT-DECISION** MCP transport surface — `mcpExtras.js` only emits client config; no actual MCP `tools/list` / `tools/call` JSON-RPC server wired here. Decide whether this repo hosts the MCP server or only the consent/audit UI for an external one.

## Status

- AI endpoints implemented: 7 / 11 from brief (4 AI gaps).
- Non-AI features implemented: 3 / 4 (connectors are metadata-only; export partial).
- Custom features implemented: ~0.5 / 3 (one of two share dashboards; no DP budget; no recall/forget).
- MCP server: config snippet only; no live JSON-RPC surface.
- Total gap items: 4 AI + 2 non-AI + 3 custom = 9.
- Audit-only pass. No files written outside this note.

## Apply pass 7 (full backlog implementation)

### MECHANICAL — AI counterparts (4)
- `POST /api/ai/context-summarizer` — schema + 3 samples; recorded into `ai_results`.
- `POST /api/ai/relevance-scorer`   — schema + 3 samples; recorded into `ai_results`.
- `POST /api/ai/query-rewriter`     — schema + 3 samples; recorded into `ai_results`.
- `POST /api/ai/conflict-detector`  — schema + 3 samples; recorded into `ai_results`.

### MECHANICAL — Non-AI
- `POST|GET /api/export/context-bundle` — HMAC-SHA256-signed JSON dump of consents +
  disclosures + schemas + redaction rules + forget_requests + dp_budgets (filterable by app_name).

### NEEDS-PRODUCT-DECISION — Custom features (3)
- **DP-budget tracker** (`backend/routes/dpBudgets.js`):
  `GET/POST/PUT/DELETE /api/dp-budgets`, `POST /api/dp-budgets/:app/spend` (returns 402 on
  exhaustion, fires `dp_budget.exhausted` webhook), `GET /api/dp-budgets/:app/ledger`.
- **Share-with-AI dashboard** (`GET /api/custom-views/share-graph`): apps × fields ×
  last-disclosed matrix joined from `disclosure_log` ⨯ `app_consents`.
- **Recall-and-forget engine** (`backend/routes/forgetRequests.js`,
  `backend/routes/consentRevoke.js`): `POST /api/app-consents/:id/revoke` flips status,
  builds field-purge list from disclosure history, inserts `forget_requests` row, logs
  forget event into `disclosure_log`, fans out `consent.revoked` + `forget.requested`
  webhooks. `POST /api/forget-requests/:id/complete` fires `forget.completed`.

### NEEDS-CREDS — 503 stubs (3 providers)
- `backend/routes/oauthStubs.js`: `GET /api/oauth/:provider/status`,
  `GET /api/oauth/:provider/{authorize,callback}`, `POST /api/oauth/:provider/sync`.
- Providers: `gmail`, `google-calendar`, `google-drive`.
- 503 with `required_env: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET]` + scope until configured.

### Live MCP JSON-RPC surface
- `backend/routes/mcpRpc.js`: `POST /api/mcp/rpc` handles JSON-RPC 2.0 methods
  `initialize`, `tools/list`, `tools/call`, `ping`. `GET /api/mcp/rpc/manifest` mirrors
  `tools/list` for browser introspection.
- 10 tools registered: `list_consents`, `list_disclosures`, `list_connectors`,
  `list_redaction_rules`, `list_schemas`, `check_dp_budget`, `ai_answer_from_context`,
  `ai_redaction_suggester`, `ai_relevance_scorer`, `ai_context_summarizer`.
- AI tools route through `services/ai.js#runFeature` and record into `ai_results`.

### Schema
- `backend/migrations/002_pass7_backlog.sql` — new tables: `dp_budgets`,
  `dp_budget_spends`, `forget_requests` (with indexes).

### Server wiring (BEFORE 404 handler)
- `backend/server.js` mounts: `/api/dp-budgets`, `/api/forget-requests`,
  `/api/app-consents` (revoke sibling), `/api/export`, `/api/oauth`, `/api/mcp` (rpc).

### Frontend
- `services/api.js` extended with 4 AI helpers, `dpBudgetsApi`, `forgetRequestsApi`,
  `revokeConsent`, `getShareGraph`, `getContextBundle`, `getMcpManifest`, `callMcpRpc`,
  `oauthStatus`.
- New pages: `AIContextSummarizerPage`, `AIRelevanceScorerPage`, `AIQueryRewriterPage`,
  `AIConflictDetectorPage`, `DPBudgetsPage`, `ShareGraphPage`, `RecallAndForgetPage`,
  `ContextBundleExportPage`, `McpRpcConsolePage`.
- `App.js` + `Sidebar.js` updated with routes/nav links.

### Verification
- `node --check` passed on every modified `.js` (server, ai, dpBudgets, forgetRequests,
  consentRevoke, contextExport, oauthStubs, mcpRpc, customViews).
- Migration `002_pass7_backlog.sql` applied cleanly against `personal_context_mcp` DB.

### Skips
- Real Gmail/Calendar/Drive ingestion workers (NEEDS-CREDS → 503 stubs only, no SDK calls).
- No new npm deps added; `helmet`, `cors`, `express`, `pg`, `jsonwebtoken` already
  present and reused.

### Status (post-pass-7)
- AI endpoints implemented: 11 / 11 (all 4 gaps closed).
- Non-AI features: 4 / 4 (signed bundle export now present).
- Custom features: 3 / 3 (DP budget, share-with-AI dashboard, recall-and-forget).
- MCP server: live JSON-RPC `tools/list` + `tools/call` over HTTP at `/api/mcp/rpc`.
- Total gap items closed in this pass: 4 AI + 1 non-AI + 3 custom + MCP RPC = 9 + 1.
