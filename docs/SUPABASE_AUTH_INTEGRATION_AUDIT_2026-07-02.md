# Supabase Auth Integration Audit

Date: 2026-07-02

## Executive Summary

Supabase email/password auth is partially integrated and the staging project is reachable, but the integration is not fully verified end to end.

The most likely reason a registered account cannot log in is email confirmation. The Supabase Auth public settings for the configured project show:

- Email auth is enabled.
- Signup is enabled.
- Email autoconfirm is disabled.

That means a newly registered user may exist in Supabase Auth but cannot sign in until the confirmation email link has been clicked. The mobile app already has copy for this case, but from a tester point of view it can still feel like "I registered, but login does not work."

## What Is Working

1. Mobile auth code is wired to Supabase when env exists.
   - `apps/mobile/src/runtimeConfig.ts` reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   - `apps/mobile/src/auth/supabaseAuth.ts` creates a Supabase client with AsyncStorage session persistence.
   - `apps/mobile/App.tsx` calls Supabase sign-up/sign-in when Supabase env is configured.

2. The local mobile env points to the linked Supabase project.
   - `EXPO_PUBLIC_NILAZA_API_URL` host: `uannkrywhxzrulufgqvx.supabase.co`, path `/functions/v1`
   - `EXPO_PUBLIC_SUPABASE_URL` host: `uannkrywhxzrulufgqvx.supabase.co`
   - The anon key is present in `apps/mobile/.env.local`. The key value was not printed in this audit.

3. Supabase Auth endpoint is reachable.
   - A password-token probe against a fake account returned `400 invalid_credentials`.
   - This is the expected response for a valid project/key with a nonexistent or wrong account, and confirms the project URL and anon key are accepted by Supabase Auth.

4. Supabase Auth settings are reachable.
   - `/auth/v1/settings` returned `200`.
   - Public settings reported `external.email=true`, `disable_signup=false`, and `mailer_autoconfirm=false`.

5. Most Edge Functions are deployed and respond to `OPTIONS`.
   - `ai-persona-chat`: 200
   - `ai-council`: 200
   - `ai-tarot-reading`: 200
   - `ai-daily-insight`: 200
   - `ai-astrology-report`: 200
   - `profile-upsert`: 200
   - `journal-entries`: 200
   - `admin-ai-council-config`: 200

6. Public REST schema smoke checks are mostly healthy.
   - `user_profiles?select=user_id&limit=1`: 200
   - `birth_profiles?select=id&limit=1`: 200
   - `journal_entries?select=id&limit=1`: 200
   - `chat_sessions?select=id&limit=1`: 200
   - `tarot_readings?select=id&limit=1`: 200
   - `prompt_versions?select=id&limit=1`: 200

## What Is Not Complete

1. Full remote Supabase CLI verification is blocked by missing CLI login/access token.
   - `supabase functions list --project-ref uannkrywhxzrulufgqvx` failed with `LegacyPlatformAuthRequiredError`.
   - Remote migration status could not be confirmed through CLI in this environment.
   - This means the audit verified public runtime behavior, but not the official remote migration history.

2. One expected Edge Function is not deployed or not reachable.
   - `ai-daily-zodiac-pulse` returned `404` for `OPTIONS`.
   - The mobile backend client and readiness docs expect this function to exist.
   - This does not block login, but it proves Supabase runtime is not fully complete.

3. The repo readiness script does not load `apps/mobile/.env.local`.
   - `npm.cmd run supabase:check` passed all required artifacts, but warned that mobile env vars were missing.
   - The env vars do exist in `apps/mobile/.env.local`; the script only checks process env.
   - This can confuse release readiness checks.

4. A real sign-up/sign-in round trip was not created during this audit.
   - Creating a test Auth user would write to the staging Supabase project.
   - This audit avoided creating a new cloud user without explicit approval.

5. Older local-only accounts can be mistaken for Supabase accounts.
   - If a user registered while Supabase env was missing, the app created only a local AsyncStorage account.
   - After Supabase env is enabled, the app uses real Supabase Auth, so that previous local-only account will not exist in Supabase.

## Likely Causes For "Registered Account Cannot Login"

### Cause 1: Email Has Not Been Confirmed

This is the most likely cause based on the live Supabase setting `mailer_autoconfirm=false`.

User experience:

1. User signs up.
2. Supabase creates a user but returns no session because email confirmation is required.
3. User tries to log in before clicking the email confirmation link.
4. Supabase returns `Invalid login credentials`.

Fix options:

- For beta testing, temporarily enable email autoconfirm in Supabase Auth settings.
- Or keep confirmation enabled but make the app show a stronger post-signup screen with:
  - "Check your email to confirm your account."
  - "Resend confirmation email."
  - "I confirmed, sign in again."
- Ensure Supabase email templates and SMTP sender are configured so confirmation emails are actually delivered.

### Cause 2: The Account Was Created In A Local-Only Build

If the user registered before `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` were configured, the app created a local preview account only.

Fix options:

- Ask affected testers to register again after installing the Supabase-enabled build.
- Add UI text in beta builds: "This account is saved to Supabase" versus "Local preview account".
- Optionally migrate local profile data after successful Supabase sign-up.

### Cause 3: Wrong Password Or Wrong Project

The configured mobile project is `uannkrywhxzrulufgqvx`. If the user registered in a different Supabase project or a previous staging build, the current build will not find that account.

Fix options:

- Confirm the app build uses the same `EXPO_PUBLIC_SUPABASE_URL` as the project where the user was created.
- Use Supabase Dashboard Auth Users to confirm the email exists in project `uannkrywhxzrulufgqvx`.
- Use password reset from the app if the email exists but password is uncertain.

## Recommended Fix Plan

### P0: Unblock Login Testing

1. In Supabase Dashboard, open Auth Users and check the user's email.
2. If the user exists but is unconfirmed, either:
   - manually confirm the user for testing, or
   - ask the user to click the confirmation email.
3. If confirmation emails are not arriving, configure SMTP/email templates or temporarily enable autoconfirm for closed beta.
4. Run one approved test with a disposable account:
   - sign up,
   - confirm email or autoconfirm,
   - sign in,
   - close/reopen app and verify session restore.

### P1: Finish Supabase Runtime Verification

1. Authenticate Supabase CLI:
   - `node_modules\.bin\supabase.cmd login`, or set `SUPABASE_ACCESS_TOKEN`.
2. Verify remote migrations:
   - `node_modules\.bin\supabase.cmd migration list --linked`
3. Verify deployed functions:
   - `node_modules\.bin\supabase.cmd functions list --project-ref uannkrywhxzrulufgqvx`
4. Deploy missing function:
   - `node_modules\.bin\supabase.cmd functions deploy ai-daily-zodiac-pulse --project-ref uannkrywhxzrulufgqvx`

### P2: Improve App UX Around Confirmation

1. Add a dedicated "Confirm your email" state after signup instead of treating it like a blocking error.
2. Add resend confirmation email support.
3. Add clearer Vietnamese copy for this state.
4. Add telemetry details for auth failures:
   - `email_not_confirmed`
   - `invalid_credentials`
   - `network_timeout`
   - `missing_supabase_env`

### P3: Improve Readiness Tooling

1. Update `scripts/check-supabase-readiness.mjs` to optionally load `apps/mobile/.env.local`.
2. Add a non-mutating Auth probe that checks:
   - Auth endpoint reachable.
   - Anon key accepted.
   - email auth enabled.
   - autoconfirm status.
3. Add a non-mutating Edge Function probe for expected functions.

## Validation Performed

Commands run:

- `npm.cmd run supabase:check`
  - Result: 44 pass, 9 warn, 0 fail.
- `npm.cmd run validate:backend`
  - Result: passed.
- `npm.cmd --workspace apps/mobile run check`
  - Result: TypeScript passed.
- Supabase Auth fake-login probe:
  - Result: `400 invalid_credentials`.
- Supabase Auth settings probe:
  - Result: `200`, email enabled, signup enabled, autoconfirm disabled.
- Edge Function `OPTIONS` probe:
  - Result: all expected functions returned 200 except `ai-daily-zodiac-pulse`, which returned 404.

## Final Status

Supabase Auth is connected enough for real email/password login, but the beta login flow is not fully production-ready because email confirmation is required and the tester-facing flow does not yet make that state clear enough.

Supabase backend integration is partially complete. Most schema/function runtime surfaces are present, but one expected function is missing and remote CLI verification cannot be completed until Supabase CLI is authenticated.
