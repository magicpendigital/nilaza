# Owner / cloud continuation — 2026-09-03

## Plan and whole-app impact gate

- Goal: verify the exact confirmed production identity `magicpendigital@gmail.com`, grant application owner after the capability boundary is live, and resume previously blocked Edge Function deployments. User has authorized production trial deployment; no billing changes or new paid resources.
- Entry: Profile → Owner Hub → separately authenticated Content Operations / AI Studio. A local demo login does not authenticate against production.
- Data: forward-only missing schema migrations, one exact owner assignment and immutable role audit. No production test identities, no private-content export, no seed overwrite. Staging synthetic fixtures roll back.
- Backend: compare live migrations/functions first; validate dependencies and staging RLS test; deploy with JWT verification; verify deployed state and unauthorized responses. Preserve model/prompt/card-selection behavior.
- Admin/privacy: canonical capabilities, fresh server checks, sanitized aggregate data only. Provider secrets remain server-side; do not print credentials or place tokens in workspace URLs. Review session transport destination before frontend production use.
- Observability: migration/function inventory, role audit, sanitized pass/fail results and security advisors. SQL role simulation is not a real authenticated HTTP/UI test.
- Rollback: no destructive schema rollback or reopening RLS. Existing publisher-compatible `is_admin()` remains; hub fails closed on backend errors. Do not revoke the only active owner. Redeploy reviewed previous function source if needed.
- Untouched: responsive UI, Tarot algorithm, AI content/models, seed content, payments, opt-ins, other users' roles/data, Supabase organization membership/plan.
- Expected edits: this report; only scoped deployment/support fixes and their tests if verification finds blockers. Preserve all existing worktree changes.
- Validation: backend/readiness/admin checks; staging `owner_capability_boundary.sql`; production exact assignment + capability RPC under authenticated SQL role; function inventory/JWT flags and no-token HTTP probes; security advisors.
- Manager acceptance: real production login can load `owner`, all 11 app capabilities including `ai.manage`/`roles.manage`; ordinary/revoked users denied on staging; no owner bypass of other users' Journal/chat; no need to paste JWTs into AI Studio. Hosted admin URL/configuration and real login E2E must be reported separately if unavailable.

## Read-only preflight

- Connector is available again. Production `Nilaza` is `ACTIVE_HEALTHY`.
- Exactly one matching user; email confirmed; zero existing role assignments for the requested identity. No owner grant had been performed previously.
- Production has 8 historical migrations and 8 old Edge Functions. Staging has 13 migrations including capability boundary, and zero deployed functions.
- Missing production contracts must be reconciled before applying capability migration; the old handoff's instruction to apply capability migration alone is incomplete.
- Supabase skill applied: reviewed current changelog and RLS documentation. New Data API grants must be checked independently of RLS. No change to billing required for this task.

## Completed cloud operations

- Production identity verified as unique and email-confirmed. Granted exactly one `owner` assignment with status `active`; role audit exists. No other accounts changed and no Supabase organization membership changed.
- `get_admin_access()` under the account's authenticated SQL identity returns all 11 canonical capabilities, including `ai.manage`, `roles.manage`, and `hub.read`. Owner overview returns sanitized counts. Foreign Journal/chat queries return zero rows. This is DB/RLS verification, not a real browser login.
- Applied production migrations in dependency order: `reconcile_owner_prerequisites`, `20260630000000_model_route_versions`, `20260706000000_oracle_contract`, `20260710000000_notifications_contract`, `owner_capability_boundary`.
- Reconciliation is required because production already has the original credit ledger and its policy, while missing four tables from the old `add_missing_tables` migration. Replaying that old migration unchanged would collide with the existing policy. The new migration preserves credit columns/data and creates only missing daily/source tables. It was applied on staging first; the full six-identity rollback test passed again.
- Both projects now have **17 ACTIVE runtime functions**, all `verify_jwt=true`, with matching deployed source hashes. Old production source snapshots are preserved under `artifacts/owner-cloud-2026-09-03/rollback/`. Do not use the old snapshots to restore insecure authorization.
- No production synthetic identities, no seed overwrite, no provider invocation, no notification dispatch, no billing/plan change.

## Deployment blocker found and fixed

- Initial Oracle production deployment was rejected because handler-level authentication was optional: the handler could return a reflection after auth failed. Deployment queue stopped; the rejected source was not retried unchanged.
- Materially safer replacement: authenticate with `getUser` before parsing the request body; reject missing/malformed/invalid/anonymous sessions and auth outages; missing server configuration returns 503. Keep gateway JWT verification enabled as a second boundary. Prompt/routing logic unchanged.
- Added seven direct-handler tests, including proof that unauthorized requests do not consume the body or write telemetry. Tests passed; fixed Oracle was deployed on staging, smoke-tested, then deployed on production.

## Local owner QA and transport hardening

- Local console: `http://localhost:4174/apps/admin/#/ai-studio/workflow`, connected to production through public project configuration injected into every workspace's config response. Original mobile QA configuration was not changed.
- The user must sign in using the real production account; no password/session was read or fabricated. Login form was opened and email prepared. UI after real login, publish/rollback, and LLM responses remain unverified.
- AI Studio session transport now accepts only exact approved admin endpoints on the configured Supabase origin, with method-specific capability checks, identity/generation checks, redirects forbidden, and cookies omitted. It rejects arbitrary or persisted attacker URLs before attaching a bearer token.
- QA server exposes only admin/public-asset/content paths; `.env`, `.git/config`, and mobile environment files return 403. Only publishable/anon keys can be injected. Content Operations remains local draft storage; explicit AI Studio publishes affect the selected production trial backend.
- Added configuration/credential-destination regression coverage. Updated backend validators to include Oracle and count unique functions, not duplicate send-test entries.

## Verification

- Staging SQL: six synthetic identities; isolation, escalation, draft/publish, ownership, review, ops capability, last-owner guard, audit, revocation and RPC ACL **PASS**; transaction rolled back.
- Direct Oracle tests: **7 passed**, no real network/DB/provider calls.
- Admin tests: **16 passed**; admin capability contract **2 workspaces / 26 UI capabilities**. This UI inventory is distinct from the 11 server access capabilities.
- Mobile TypeScript, data validation, backend contract checks, syntax/whitespace checks passed. Readiness: **56 pass / 9 local env warnings / 0 fail**. All 20 local function entrypoints type-checked; only the 17 approved runtime functions deployed, not the three legacy workers.
- Live staging and production: every one of 17 functions returned OPTIONS 200/`ok` and unauthenticated POST 401. This verifies startup and denial, not authenticated business operations. Inventory and source hashes: `artifacts/owner-cloud-2026-09-03/deployment-inventory.json`.
- Browser: real-config login form renders; direct Content/AI Studio HTML routes respond; protected workspace happy paths require user sign-in. No hosted HTTPS admin deployment or native/mobile production build performed in this slice.

## Remaining gates / manager test path

1. Sign in on the local Owner QA page with `magicpendigital@gmail.com`; verify owner label and open both Content Operations and AI Studio. Do not use the old demo password table in README for production.
2. Test authenticated AI Studio GET and a reviewed draft/publish/rollback flow. No automatic production publish test was performed; provider keys and model outputs are not verified yet.
3. Provider secrets must be entered through Supabase Edge Function Secrets (not mobile, pasted JWT fields, or chat). The current connector has no secret-management tool; no secret values were requested/read. Owner in the app does not itself grant access to the Supabase organization dashboard.
4. Configure a hosted HTTPS admin URL and the real mobile build environment before claiming in-app Profile → Owner Hub → AI Studio works end-to-end. The loopback page is for testing only.
5. Two production security advisories remain: [vector extension in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The former follows the legacy schema contract; move it only with an explicit dependency migration. The latter is unchanged; no paid upgrade was made. Prior public security-definer `is_admin` warnings are gone.

This report supersedes older notes claiming connector access is blocked or production has not been updated. It does not mark the entire responsive/guest/MVP release plan complete.
