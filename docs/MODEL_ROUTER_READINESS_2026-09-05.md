# Model Router readiness — Plan/QC

- Goal: owner opens AI Studio → Model Router → checks backend connection without publishing a route or running paid AI.
- Entry/UI: additive read-only check, actual project identity, active route summary, server secret-presence states and safe secret-management instructions. Local catalog labels are not evidence of live provider connectivity.
- Backend: authenticated GET on existing admin-model-router-config; ai.read capability; fixed provider environment names, never secret values, fingerprints or lengths. Database read errors fail visibly. POST retains ai.manage.
- Data writes: none during QA. No schema, roles, prompts, user data or model defaults changed. Existing POST publish behavior outside this slice; no sample publish.
- Privacy/analytics: no new logs of tokens, keys, user messages or questions. Key entry remains in Supabase's secret manager, not static browser storage. No AI/provider network calls.
- Scope: admin app.js, workspace-guard, existing Edge Function plus pure readiness module/tests. Mobile and Content Operations unchanged.
- Rollback: remove GET/check UI or redeploy previous function; no migration.
- Acceptance: owner sees connected/missing-key/route status accurately; signed-out denied; read-only check cannot publish; credentials never appear in response; failed check can retry. Keys-present explicitly does NOT mean provider validated or quota available.
- Checks: admin tests/check, validate:data, backend validation, Deno tests/typecheck; authenticated browser GET after deployment. Both workspaces must retain access.

## Verification and deployment

- 23 admin tests passed, including read-only GET, secret-field exclusion and retry after permission failure. Admin capability/seed, data and backend contract validation passed. Deno check passed and two secret-redaction tests passed.
- Deployed admin-model-router-config v2 to staging `akgrokwnkfqnfjqrildi` and production trial `uannkrywhxzrulufgqvx`, verify_jwt remains true. Only GET/readiness and auth error handling added; no route publish, key mutation or paid provider call was performed.
- Both deployed endpoints return OPTIONS 200 and unauthenticated GET 401.
- In-app browser session and old QA process were gone on resume. Restarted localhost:4174 with existing production publishable process-only config, did not change env files. Current browser shows login; asked user to authenticate for live GET verification. Provider key presence is still unknown until that check succeeds.
- Secret management intentionally uses Supabase Dashboard → Edge Functions → Secrets. Nilaza app owner does not automatically imply Supabase organization secret-management rights. Never collect API keys in chat or store them in browser drafts.
- Follow-up before live publishing: validate/normalize provider identifiers (Google catalog vs runtime gemini), replace stale model samples, and make version activation transactional. Existing POST uses insert then archive and is not exercised or claimed production-hardened by this read-only slice.
- Supabase skill informed the fixed-name boolean diagnostics and backend-only secrets approach; browser CLI skill inspected, supported in-app browser used because CLI unavailable.
