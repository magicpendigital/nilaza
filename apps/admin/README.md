# Nilaza Admin Console — implementation state, 2026-10-03

Desktop-oriented content and operations console with protected workspaces under one shell. Since step A2 (2026-11-13) the shell shows one Vietnamese left navigation (Tổng quan; Nội dung; AI; Vận hành; Tăng trưởng, proposal 03/11 §5) that deep-links to the workspace routes below; items appear only for the account's capabilities, and work that still needs backend opens an honest `#/pending/*` page. The map lives in `navGroups` in `shell.js`; `scripts/admin-a2-navigation.test.mjs` checks that every manifest route stays reachable.

- **Overview** (`overview.html`): AI switch lights, open feedback count and recent AI errors from existing protected RPCs; no cost figures until a backend reader exists.
- **AI features** (`ai-features.js`, AI Studio route `features`): per-feature switch with a reason and versioned settings (daily limit, Council follow-ups, total model wait, quota/paused copy) through `get_ai_feature_configs`, `save_ai_feature_config_draft` and `publish_ai_feature_config` (migration `20261113090100`; the page says so when it is not applied).

- **Content Operations**: personas, tarot decks, deck-specific 78-card libraries, assets with visual previews, and front-end content. Since step A3, when migration `20261113100000_admin_content_items.sql` is on the server, "Lưu nháp" saves one item (`save_content_item_draft`, content.draft) and "Xem lại & phát hành" shows the diff against the published item, asks for a note and publishes only that item (`publish_content_items`, content.publish; persona publish also updates `public.personas`). Lists filter Đang dùng / Nháp / Thiếu bản dịch (cards: Thiếu bản dịch / Thiếu ảnh / Sửa chưa phát hành); "Lịch sử" lists versions and "Khôi phục" turns one into a new draft. Image upload goes to the `content-images` bucket (migration `20261113100200`). Helpers live in `content-items.js`. Without the migration the page keeps the whole-bundle path described below and names the missing migration.
- **Timeline** (`timeline.html`, nav "Lịch sử thao tác"): read-only staff action history from `get_admin_timeline` (hub.read, migration `20261113100100`); names the migration when it is not applied.
- **AI Studio**: feature workflows, prompts, persona prompt layers, AI Council Builder templates, model routing, tests, versions, and audit.
- **Growth Operations**: product readiness/evidence, 12 VI/EN concept drafts, measurement gaps and prioritized next steps from a checked repository snapshot; separate waitlist funnel, campaign map and delivery/suppression aggregates.

## Run

From the repository root:

```powershell
npm run feature:run -- --record docs/feature-plans/admin-workflow-graph-2026-10-03.json --script admin:dev
```

Open:

```text
http://localhost:4173/apps/admin/#/content/personas
```

If port `4173` is already occupied, start the same loopback server on a
different port and use that port in the URL:

```powershell
$env:PORT = 4174
npm run admin:dev
```

AI Studio:

```text
http://localhost:4173/apps/admin/#/ai-studio/workflow
```

Growth Operations:

```text
http://localhost:4173/apps/admin/#/growth/overview
```

Growth Operations requests `get_growth_waitlist_overview()` through the current signed-in Supabase session and requires `overview.read`. The RPC returns aggregate counts only—never emails, hashes, tokens, UTM payloads, or message bodies. When the live source is unavailable, the Waitlist views show the error and offer a separate `Review synthetic fixture` action; repository review stays independent and sample data is never substituted silently. No outbound email provider, queue, or Cron schedule is connected in v1.

The default Growth overview now describes the internal operating baseline. `Product Readiness`, `Content Drafts`, `Measurement` and `Next Steps` use `apps/admin/generated/growth-operations.json`, selected from `packages/growth-nilaza`; they remain available after a waitlist RPC failure. The `Waitlist` tab retains aggregate funnel review. `Refresh sources` retries both sources; a successful live retry replaces an explicitly selected fixture. A confirmed pool is not send eligibility, suppression reason counts can overlap, and unavailable or empty denominators never become zero conversion.

The snapshot contains sanitized project context only. The workspace guard controls display but the static JSON URL is not a server-authenticated private resource. Never add confidential strategy, real interview responses, audience lists, private user content, receipts or credentials. Concept QA fields are self-reported seed metadata; inspectable copy is not rendered creative, independent hash-bound QA or a publishing approval.

After reviewing a Growth source change, regenerate through the preflight runner:

```powershell
npm run feature:run -- --record docs/feature-plans/growth-operations-sync-2026-09-30.json --script admin:growth:seed
npm run admin:growth:check
```

Refresh the record's source hashes and working-tree review when sources change. `admin:check` and `admin:test` enforce snapshot parity, privacy, references and the additive route contract. Current acceptance and deferred channel tasks are in `docs/GROWTH_OPERATIONS_HANDOFF_2026-09-30.vi.md`.

Open the AI Council feature and the `Council Builder` tab to review situation presets, guide roles, meeting flow, the backend-ready council config preview, and the Supabase publish payload for `ai_council_config_versions` plus `ai_council_template_versions`.

Open the `Trace Explorer` tab to load recent redacted AI traces through the guarded `ai.read` RPCs. It is read-only and shows model-route/provider spans, fallback, safety, latency, usage, and prompt/context shape without exposing raw private chat or journal text. Use `docs/AI_TRACE_OBSERVABILITY.md` to enable Langfuse OTLP debug traces in staging.

Council GET is read-only in this UI. Publication remains blocked until fetched config hydrates the complete editor and the backend has reviewed atomic/CAS publication. Sign in with a real Supabase QA account; authenticated connectors use that session and recheck capabilities before requests. Manual JWT connector fields are legacy isolated-local tools, not the normal operator workflow.

AI Studio Model Call uses the same explicit connector pattern through `admin-model-router-config`. On reload, the workspace loads the active backend route when there is no unsaved local draft. The Publish checklist now identifies whether the Model Call route is included; provider/model changes must be made in the Model Call block and published through that connector. A generic prompt/content publish does not silently change runtime model routing.

Do not open the HTML through `file://`; Content Operations loads its generated repository seed over HTTP.

## Hosted configuration

The static console reads `window.__NILAZA_ENV__` (or `window.NILAZA_ENV`) when it is deployed. Inject the production Supabase URL and publishable/anon key before loading `config.js`, for example:

```html
<script>window.__NILAZA_ENV__={SUPABASE_URL:"https://<project-ref>.supabase.co",SUPABASE_ANON_KEY:"<publishable-key>"};</script>
<script src="./config.js"></script>
```

On a hosted domain with no injected values the console fails closed instead of silently using the local database. Never inject a service-role key, API provider key, or access token into this static bundle.

The Vercel staging project uses `vercel.json` and `build-hosted-config.mjs` to inject the two public Supabase settings during the build. Configure `NILAZA_QA_SUPABASE_URL` and `NILAZA_QA_SUPABASE_PUBLISHABLE_KEY` for both Preview and Production; the build also emits an inline bootstrap so a stale browser cache cannot leave `window.ENV` empty. Promote only a READY preview deployment to the stable staging alias after checking the hosted login screen and Content Operations data.

After sign-in, AI Studio and Model Router use the current Supabase browser session automatically and re-check the required capability before each request. Manual JWT fields are retained only for isolated local connector tests.

For local owner QA against a hosted Supabase project, start `npm run admin:dev` with `NILAZA_QA_SUPABASE_URL` and `NILAZA_QA_SUPABASE_PUBLISHABLE_KEY` in the process environment. The loopback-only server injects public configuration into every workspace's `config.js`; it rejects secret/service-role keys and does not serve repository environment files. This is a local test console, not a hosted production release. Content drafts stay local; explicit AI Studio connector publishing writes to the selected backend. Session requests are restricted to the configured project and reviewed admin endpoints, with redirects forbidden.

## Authentication and drafts

There are no usable demo passwords. Access requires Supabase Auth and current capability grants; the protected shell preserves Content Operations, AI Studio and Growth Operations (27 capabilities). Role labels are display metadata, not authorization.

Content Operations now uses Supabase staging as the shared source of truth for versioned content bundles. Save creates an online draft when the signed-in account has `content.draft`; Publish/rollback uses the guarded `publish_content_bundle` RPC and keeps previous versions archived. Local storage remains an offline cache/outbox, so local and hosted Admin sessions can recover safely when the network is unavailable.

The shared bundle currently covers personas, decks, deck-specific 78-card libraries, assets, and front-end content blocks. Mobile/runtime clients read only the published bundle through `get_published_content_bundle`; they never receive Admin drafts or provider secrets. The first collaboration slice is version-based review/publish (not field-level merge), so concurrent editors should sync before publishing and resolve a stale-version warning by reloading.

These browser stores are origin-local. Localhost and the hosted Admin do not automatically share sessions or AI drafts:

- Shared session: `nilaza.admin.session.v1`
- Content review cache: `nilaza.admin.content.v4`
- Pending content outbox: `nilaza.admin.content.outbox.v1`
- AI Studio model/prompt/context drafts: `nilaza.admin.aiStudio.draft.v1`

Resetting local review data reloads the generated repository seed locally; use `Publish local seed online` in the Content Operations overview when staging needs to be bootstrapped or deliberately re-seeded.

## Repository seed

`scripts/build-admin-seed.mjs` composes the default Content Operations data from the canonical persona, tarot deck, tarot card, and deck-back JSON files.

```powershell
npm run feature:run -- --record docs/feature-plans/configure-parity-implementation-2026-10-03.json --script admin:seed
npm run admin:check
```

`admin:check` fails if the generated seed is stale or if either protected workspace/capability contract is removed.

## Validation

```powershell
npm run admin:check
npm run admin:test
npm run validate:data
```

## Workflow graph and evidence

The Workflow detail opens a read-only, feature-specific graph. Select a node to inspect input/output types, source, use, destination, privacy and implementation references. Select an edge for its control/data relationship, condition and field mappings. Multiple outgoing edges can represent conditional branches or data dependencies; they do not establish parallel execution. Zoom, Fit and the accessible List view support laptop review. The previous seven-block view remains a collapsed reference for existing configuration editors.

The catalog describes reviewed local implementation sources, with separate candidate/deferred states. `scripts/validate-admin-workflow-catalog.mjs`, included in `admin:check`, detects source drift. It does not certify that those sources have been deployed to Supabase. Oracle remains a provider-disabled local candidate; Council currently uses one model call for multiple voices; Notifications has no LLM; Face Reading remains deferred.

Only an authorized redacted trace matching the current feature, account, initialized backend target and trace selection can contribute matching records. The reviewed trace SQL permits authenticated self-owned inserts, so provider span rows have unverified writer origin and do not establish provider execution. Root completion, route loads and GET success never establish that every stage ran; uninstrumented stages and edges remain unobserved. Switching scope or leaving the view clears records, including delayed responses. The graph copies only allowlisted span names/status, never private prompts, questions, journal/birth data, raw QA or trace attributes. Selecting nodes and edges sends no execution or publish request. Trusted server-only trace writing needs a separate reviewed QA backend/database gate.

The workspace transport pins its Supabase URL and public key when initialized. Changing either in an already-open page invalidates access, clears sensitive state and rejects new or in-flight read responses until a reload. `NilazaAdminTransportTarget` exposes only the immutable initialized origin so graph attribution cannot follow a mutable environment label while the cached client still reads another project.

This is an observation interface, not an executable workflow builder. Backend instrumentation, DAG editing/execution and cloud function parity are separate delivery work. Local/hosted graph acceptance and synchronization gaps are recorded in `docs/mvp-remediation/2026-10-03/workflow-graph/`.

## Shared Oracle preview and release boundaries

Oracle Prompt Composer uses the canonical Core + Feature + Locale + Tone bundle packaged into `generated/prompt-composition/`. The fictional sample stays in RAM and makes no LLM, save or publish request. Modules are pinned read-only; token status is `not-assessed` and `providerReady` is false. The backend source candidate consumes the identical compiler but remains provider-gated. The older deployed QA function is a separate revision.

Generate both Admin and Edge consumers with the preflight runner's `prompt:consumers:generate` script; `npm run prompt:consumers:check` verifies exact source bytes. Hosted builds verify manifest, file checksums and bundle provenance before injecting public configuration. Generated sources are not independently editable.

The packaged preview modules contain only generic, non-confidential seed instructions. Static files are downloadable regardless of the workspace UI guard. Do not add private operator prompts, private user data, credentials, QA evidence or internal documents to this directory. Private prompt management needs an authenticated backend resource. UI protection does not establish file confidentiality.

Deep links preserve workspace, feature, section and content locale. They carry no prompt text, sample, token or private content. The review dialog freezes the target and payload and supports keyboard focus/escape; backend CAS, full diff, restore/rollback UI and project/account-scoped AI draft migration remain separate work.

The user is creating a paid clean QA project. Until its bootstrap is accepted, local and hosted Admin use the legacy QA target; no old-QA schema repair or cutover is part of this release. Frontend deployment does not deploy Edge Functions, publish AI configuration or update native mobile. Current sync gaps and acceptance evidence are recorded in `docs/mvp-remediation/2026-10-03/configure-implementation/`.
