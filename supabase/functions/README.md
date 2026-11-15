# Nilaza Supabase Edge Functions

These functions contain implemented backend contracts and separately gated release candidates; local source is not proof of a deployed revision. Most AI paths use the shared model router with server-only provider secrets. The 2026-10-03 Oracle source candidate deliberately performs no provider dispatch: it uses a packaged canonical compiler, deterministic safety support and explicit `provider_gate_pending` fallback. Clean QA, matched tokenizer, durable usage reservation and real-model evaluation are required before activation. The previously deployed legacy-QA Oracle revision is unchanged by these local edits. Profile/journal persistence and other feature readiness require their own authenticated acceptance evidence.

## Mobile Base URL

For direct Supabase staging, set the mobile app environment variable to the functions base URL:

```text
EXPO_PUBLIC_NILAZA_API_URL=https://<project-ref>.supabase.co/functions/v1
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

The mobile client maps API-style paths to Supabase function names:

| Mobile path | Function |
| --- | --- |
| `/share/events` | `share-events` |
| `/ai/oracle-turn` | `ai-oracle-turn` |
| `/ai/persona-chat` | `ai-persona-chat` |
| `/ai/ai-council` | `ai-council` |
| `/ai/tarot-reading` | `ai-tarot-reading` |
| `/ai/daily-insight` | `ai-daily-insight` |
| `/ai/daily-zodiac-pulse` | `ai-daily-zodiac-pulse` |
| `/ai/astrology-insight` | `ai-astrology-insight` |
| `/profile/upsert` | `profile-upsert` |
| `/journal/entries` | `journal-entries` |
| `/notifications/register-device` | `notification-register-device` |
| `/notifications/preferences` | `notification-preferences` |
| `/notifications/inbox` | `notification-inbox` |
| `/notifications/send-test` | `notification-send-test` |

Admin-only paths are not exposed as mobile navigation routes. They are called by the protected admin console with a Supabase Auth JWT:

| Admin path | Function | Required capability |
| --- | --- | --- |
| `/admin/ai-council-config` | `admin-ai-council-config` | `ai.read` (GET) / `ai.manage` (POST) |
| `/admin/model-router-config` | `admin-model-router-config` | `ai.read` (GET) / `ai.manage` (POST) |
| `/admin/astrology-prompt-config` | `admin-astrology-prompt-config` | `ai.read` (GET) / `ai.manage` (POST) |
| `/admin/ai-trace-qa-payload` | `admin-ai-trace-qa-payload` | `roles.manage` (POST, staging Owner only) |
| `/admin/documentation` | `admin-documentation` | `ai.read` (GET) |
| `/admin/ai-eval-run` | `admin-ai-eval-run` | `ai.manage`, or `ai.read` + `content.draft` (POST; Admin A6, needs migration `20261113110000_ai_eval_release_gate.sql`) |
| `/admin/ai-provider-probe` | `admin-ai-provider-probe` | `ai.manage` (POST; Kiểm tra khóa, never returns key values) |
| `/admin/team-invite` | `admin-team-invite` | `roles.manage` (POST; Thành viên & quyền, needs migration `20261114090000_admin_team_roles.sql`) |

AI Studio operations use the reviewed migration `20260926152118_ai_studio_operations.sql`, present in the legacy QA audit. The overall migration ledger remains blocked by foreign-schema divergence: no generic db push/repair is allowed. Clean QA is awaiting the user-created project and a separately accepted bootstrap. QA payload capture additionally requires `AI_TRACE_QA_CAPTURE_ENABLED=true`, a 32-byte base64 `AI_TRACE_QA_ENCRYPTION_KEY`, `AI_TRACE_ENVIRONMENT=staging`, and a verified purge schedule. Keep capture disabled if `pg_cron` or the actual purge schedule is missing.

`admin-team-invite` (Thành viên & quyền, 14/11) checks `roles.manage` with the caller's own session, then uses the service role only for `admin_team_invite_begin` / `admin_team_invite_finish` (service-role-only RPCs that re-check the Owner, refuse self changes and enforce a per-Owner daily cap of 10 email invites) and `auth.admin.inviteUserByEmail`. An email that already has an account gets the role at once and no email. Sending invites needs the function secret `ADMIN_INVITE_REDIRECT_URL` (https URL of the Admin `recovery.html` for that environment, for example `https://<admin-host>/recovery.html`); the same URL must be listed in Supabase Auth → URL Configuration → Redirect URLs. Without it the function answers `invite_not_configured` and only existing accounts can be added. The function never returns or logs the invite link or any key. Listing, role changes and revocation go through the `roles.manage` RPCs `list_admin_team`, `get_admin_role_matrix`, `set_admin_member_role` and `revoke_admin_member`, each audited in `admin_audit_logs`.

The public marketing site calls `marketing-waitlist` without a JWT. That function validates the origin, consent, input, honeypot, and optional Turnstile token before writing through a server-only service role. The underlying `marketing_waitlist` table grants no access to `anon` or `authenticated`.

AI trace reads use protected RPCs (`search_ai_trace_runs`, `get_ai_trace_runs`, `get_ai_trace_detail`, and `get_ai_admin_audit_events`) with `ai.read`; the admin console never queries trace tables directly. Exact Astrology provider wire capture is a separate opt-in and is not stored in public trace tables. The Owner reveal endpoint decrypts only the current Owner's staging trace and records each reveal in `admin_audit_logs`.

## Deploy Order

The following is an inventory, not permission to deploy the whole set. Verify target, migration dependencies and each feature gate before deploying. Do not deploy the provider-gated Oracle candidate over legacy QA and claim live-LLM parity:

```powershell
supabase functions deploy ai-oracle-turn
supabase functions deploy ai-persona-chat
supabase functions deploy ai-council
supabase functions deploy ai-tarot-reading
supabase functions deploy ai-daily-insight
supabase functions deploy ai-daily-zodiac-pulse
supabase functions deploy ai-astrology-insight
supabase functions deploy profile-upsert
supabase functions deploy journal-entries
supabase functions deploy admin-ai-council-config
supabase functions deploy admin-model-router-config
supabase functions deploy admin-astrology-prompt-config
supabase functions deploy admin-ai-trace-qa-payload
supabase functions deploy admin-documentation
supabase functions deploy admin-ai-eval-run
supabase functions deploy admin-ai-provider-probe
supabase functions deploy admin-team-invite
supabase functions deploy marketing-waitlist --no-verify-jwt
supabase functions deploy notification-register-device
supabase functions deploy notification-preferences
supabase functions deploy notification-inbox
supabase functions deploy notification-send-test
supabase functions deploy notification-dispatch
supabase functions deploy notification-receipts
```

Keep provider secrets only in Supabase function secrets or another backend secret store. Do not put provider keys in Expo public environment variables.

## Seed Data

Regenerate and verify the SQL seed before applying it to a Supabase project:

```powershell
npm run supabase:seed:generate
npm run supabase:seed:verify
```

`supabase/seed.sql` is the stable Supabase seed entrypoint and includes `supabase/seed.generated.sql`. To apply directly from a machine with PostgreSQL client tools, set `SUPABASE_DB_URL` or `DATABASE_URL`, then run:

```powershell
npm run supabase:seed:apply
```

Apply migrations before seed data. The apply script runs the seed and then verifies database counts for active personas, global prompt versions, persona skill prompt versions, active persona prompt pointers, and AI Council templates.

## Auth Posture

`ai-oracle-turn` verifies the bearer token with Supabase Auth before parsing a message, generating handoffs, or writing telemetry. Missing, invalid, unavailable, and anonymous authentication fail closed. CORS preflight alone is public and performs no work; keep gateway `verify_jwt=true` as an additional boundary. Test the handler with `deno test supabase/tests/oracle_auth_test.ts`.

Target closed-beta posture is JWT-protected functions with the mobile app passing the Supabase Auth access token as `Authorization: Bearer <token>`.

Current mobile auth stays local-first when Supabase env is missing. When `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present, the app uses Supabase email/password auth, persists the session through `@supabase/supabase-js`, sends the anon key as the Supabase `apikey` header, and passes the access token through `BackendOptions.authToken` to every backend AI/sync call.

Admin functions also require `Authorization: Bearer <token>` and check the canonical capability boundary (`public.has_admin_capability(...)`) before reading, drafting, publishing, or dispatching. The legacy `public.is_admin()` wrapper is publisher-only compatibility for older callers; regular mobile users should not call admin functions.

`profile-upsert` writes `user_profiles` and optional `birth_profiles` through RLS. `journal-entries` upserts `journal_entries` by `(user_id, local_id)` and stores `source_snapshot` for audit/replay.

Notification functions are privacy-first:

- `notification-register-device`: saves the Expo Push Token in `device_push_tokens` only after user opt-in, plus locale/timezone/device metadata.
- `notification-preferences`: syncs per-channel and per-type preferences. In-app notifications are the durable baseline; push is opt-in.
- `notification-inbox`: syncs sanitized in-app inbox rows by local id. It does not store raw chat, journal notes, birth data, or tarot questions.
- `notification-send-test`: creates an admin-only safe test notification and audit log.
- `notification-dispatch`: admin/internal dispatcher that sends pending generic push payloads through Expo Push Service and writes `notification_deliveries`.
- `notification-receipts`: admin/internal receipt checker that records Expo receipt status and marks invalid tokens.

AI functions persist staging data when possible:

- `ai-persona-chat`: assembles the active persona chat system prompt plus the selected persona skill prompt, then creates a `persona_chat` session, user message, guide message, selected persona link, prompt stack metadata, and usage event.
- `ai-council`: creates an `ai_council` session, selected guide roster, one user round, multiple guide messages sharing `council_round_id`, and usage event. The `ai_council_rounds_v2` output keeps ordered turns, turn kind, and reply-to-guide metadata while remaining backward-readable for v1 rows. The request includes `councilTemplate` metadata (`id`, `meetingMode`, `synthesisMode`, `maxGuidesPerTurn`, guide roles, and output contract). When Supabase JWT/DB are available, the function first reads the active `ai_council_config_versions` row and matching `ai_council_template_versions` row; if found, that published Admin config overrides the mobile payload for runtime guide count, guide roster order, meeting mode, synthesis mode, output contract, and persisted audit metadata. If config lookup is unavailable, it falls back to the mobile payload.
- `ai-tarot-reading`: stores `tarot_readings` with selected card JSON, generated interpretation, and usage event.
- `ai-daily-insight`: stores a `usage_events` row for daily insight generation.
- `ai-daily-zodiac-pulse`: returns a daily Sun-sign reflection cue with explicit caveats, never invents Moon/Rising/aspects, and stores a `usage_events` row for staging diagnostics.
- `ai-astrology-report` (retired 2026-11-15, Owner decision): the legacy server-side chart report was removed from the app and this repository. Charts are calculated on the device by `packages/astrology-core`; AI reads go through `ai-astrology-insight`. The deployed copy is deleted separately with Owner approval.
- `ai-astrology-insight`: authenticated AI interpretation for the device-calculated canonical chart. It requires explicit fact-sharing consent, a server-verified `premium_astrology_ai` entitlement, an active `astrology_ai_insight_v1` route, and an active locale prompt. Raw birth details, coordinates, Journal, and chat history are excluded. The question is not stored in the report or ordinary usage metadata. The trace root remains open through parse, contract validation, report persistence, and response status. A sanitized report is stored under the authenticated user so they can revisit or delete it. A separate raw capture can only be requested by an opted-in Owner QA build, is encrypted in staging, and remains unreadable after 24 hours; its server gate is off by default.

AI provider calls use the model router when the corresponding Supabase Function secret is present (the Staging QA Oracle route currently uses `OPENROUTER_API_KEY` and `openrouter/free`). Provider metadata is sanitized before telemetry is stored; a safe local fallback remains for provider timeout, rate limit, missing key, or malformed output. Persona chat prompt selection/assembly is wired for active Supabase prompt rows, with payload fallback when staging seed data is not available.

## Account Deletion

`account-delete` (JWT required, `verify_jwt = true`) deletes the signed-in person's account. The body must be exactly `{"confirm":"delete-my-account"}`; the user id comes only from the verified access token. Anonymous users and active staff accounts are refused (staff deletion needs an Owner review). Flow: `nilaza_account_delete_begin` (records a request keyed by a domain-separated SHA-256 of the user id, never an email) → email lookup through the Auth admin API → `nilaza_account_delete_purge` (deletes `generation_jobs` and `usage_events`, scrubs `safety_events` text, removes the email-hash waitlist row) → `auth.admin.deleteUser` (cascades all other user rows) → `nilaza_account_delete_finish`. A repeated request is harmless; a failed step answers `502 deletion_incomplete` with `retry: true` and is never reported as success. The service-role key stays inside the function; the three database functions and the request table are executable only by `service_role`. The function is not deployed and the mobile app is not wired to it yet; gateway path and in-app button are a later slice.

## AI Trace Observability

Every shared model-router call can emit a trace root plus one span per primary/fallback provider attempt. The trace records route version, provider/model, redacted prompt shape and wire request/response, latency, usage, fallback, error, and safety outcome. Astrology adds the later server pipeline status. Production stores only redacted index rows in `ai_trace_runs` and `ai_trace_spans`; optional Langfuse OTLP export is configured through backend secrets. See `docs/AI_TRACE_OBSERVABILITY.md` and the dated SQL review for environment settings, retention, and the admin Trace Explorer test path.

## AI Council Admin Config

Council Builder in Admin Studio prepares a publish-ready payload for:

- `ai_council_config_versions`: active config version, default template, context policy, safety boundaries, and runtime routing.
- `ai_council_template_versions`: situation templates, guide roster roles, meeting mode, synthesis mode, flow, and output contract.

Apply migrations before loading `supabase/seed.generated.sql`. The generated seed now imports `packages/agent-config/ai-council.json` into those tables. The static admin prototype does not write directly to production data; production publish should go through an authenticated admin API or reviewed SQL import, with capability-aware RLS restricting writes to `ai.manage`.

Runtime behavior:

- Mobile sends a council template payload so local-first and offline fallback continue to work.
- Supabase runtime prefers the active published Admin config when `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `Authorization: Bearer <token>` are present.
- The function returns `councilConfigSource` as `supabase_active_config` or `mobile_payload` for staging diagnostics.

Admin publish API:

- `admin-ai-council-config` supports `GET` for the current active/draft config list and `POST` to create a new config version plus template rows.
- `POST` archives the previous active config when the new payload status is `active`, then inserts `ai_council_config_versions` and `ai_council_template_versions`.
- Reads and writes are protected twice: the function checks `ai.read`/`ai.manage`, and table RLS applies the same capability boundary.
- The expected POST body mirrors the Council Builder publish payload: `version`, `status`, `defaultTemplateId`, `maxGuidesPerTurn`, `maxTranscriptTurns`, policy objects, runtime config, and `templates[]`.

## Local Verification

Run from the repo root:

```powershell
npm run supabase:check
npm run validate:backend
npm --workspace apps/mobile test -- backendClient.test.ts --runInBand
```

`supabase:check` verifies required migrations, Edge Function entrypoints, generated seed payloads, package scripts, deploy tools, staging env presence, and the absence of obvious Expo-public provider secrets. Missing local tools or staging env values are warnings; missing artifacts fail the check. `validate:backend` checks that mobile wrapper paths, Supabase function directories, CORS headers, and the AI Council migration contract stay aligned.
# AI operations update — local implementation reviewed 2026-10-16

`/ai/feedback` maps to `ai-feedback`. Authenticated, non-anonymous callers may submit bounded categories and technical IDs, export their feedback, delete one item, or delete all feedback and answer receipts. The shared handler authenticates before body parsing and validates acknowledgements. Questions, generated prose, notes and birth data are rejected, not captured.

Tarot and Astrology Insight emit `nilaza.answer-provenance.v1` and attempt a service-only `record_ai_answer_receipt` write. Feedback with a receipt must match its owner, feature, request ID, locale and section. No receipt means unverified correlation; a failed receipt write does not discard a valid answer. Legacy trace rows remain independently unverified.

Local prerequisites: `20261014074711_model_route_publish_contract_v2.sql`, `20261014080754_ai_feedback_receipts_v1.sql`, matching Admin and mobile contracts. The first adds atomic CAS/idempotent route publication; the second adds private receipt/feedback tables, owner-scoped export/delete, `safety.review` triage and audit metadata. These files are **not evidence of deployment**. Reconcile the migration ledger and obtain exact-target release approval before any cloud application or retarget.

Feedback/receipts expire after 30 days in read paths. `prune_ai_feedback_data()` must be scheduled and its successful execution verified in the approved environment before claiming physical retention enforcement. No remote scheduler was created by this change. Keep ordinary trace redaction enabled; this workflow does not enable raw capture.
