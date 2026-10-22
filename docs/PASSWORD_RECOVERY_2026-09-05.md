# Password recovery implementation

## Plan and whole-app impact gate

- Goal: login → request email → explicit recovery callback → new password → login, without granting admin capabilities or exposing existing passwords.
- Lane: auth/mobile/admin. First implement and verify the admin vertical slice, then mobile callback integration.
- Entry: admin login and a separate recovery page; mobile forgot-password and native/web callback.
- Data: only Supabase Auth password/session API; no schema, role, seed, Journal, chat or profile changes. Recovery credentials stay in memory and are removed from browser URL before third-party scripts load.
- Backend: built-in resetPasswordForEmail/setSession/getUser/updateUser; no new Edge Function or service-role key. Explicit redirect allowlist must be verified per deployment.
- Admin: existing capability checks and both protected workspaces remain unchanged; recovery never opens a workspace or adopts the regular session.
- Privacy/analytics: never log email, password, recovery URL or tokens. No new analytics. Generic request success prevents account enumeration.
- UI: loading, retry, invalid/expired link, mismatch, success; 44px controls and scrollable narrow layouts. Existing palette and bilingual recovery copy.
- Rollback: remove recovery entry points; no migration to reverse. Missing backend fails visibly, no simulated email success.
- Untouched: content, AI Studio configuration, owner grants, premium, Tarot and background services.
- Validation: admin:check, admin:test, validate:data; targeted recovery tests; mobile typecheck/tests when integrated. Browser QA on 320px and landscape, both workspace guards. Real email/password happy path requires user-private password entry.

## Acceptance path

1. Login has no demo credentials. Open forgot password, submit email once.
2. Repeated clicks cannot send duplicate requests during busy/cooldown states.
3. Missing, invalid or expired recovery links cannot update a password.
4. Valid recovery allows matching new passwords, then requires ordinary login; owner permission is still checked independently.
5. Recovery does not load private app data or overwrite another account's persisted session.

## Deployment gate

Add the exact deployed callback to Supabase Auth → URL Configuration → Redirect URLs, preserving existing URLs. Local owner QA callback: `http://localhost:4174/apps/admin/recovery.html`. Localhost is only reachable on the computer running QA; do not open that email link on another device. A public HTTPS callback is required for remote testers. SMTP delivery and actual password change must be verified separately; code tests do not prove email delivery.

Mobile callbacks: `nilaza://auth/recovery` for installed native builds; web uses the current origin/path with `?recovery=1` (QA root: `http://localhost:8084/?recovery=1`). Register exact environment URLs, not wildcard production origins. Expo Go is not proof that the app's custom scheme works; test an installed development/release build. Mobile QA stays on its existing backend configuration; it was not pointed at production by this change.

## Implementation and verification

- Admin: explicit email request and callback page, VI/EN copy, generic success, 60-second resend cooldown, 12-character minimum and confirmation, in-memory recovery session, URL scrubbing before CDN load, no-referrer policy, bounded network requests. Existing shell ignores URL sessions and requires ordinary login/capability checks.
- Mobile: explicit web/native redirect, isolated recovery client, boundary ahead of private account UI, generation guards for stale callbacks, safe-area/keyboard-aware scroll form, VI/EN and validation, resend cooldown. App account scope/storage code stays unchanged.
- Removed misleading admin demo credentials. No password was read or changed; no email was sent.
- Admin tests: 21 passed; admin capability/seed check passed; canonical data validation passed.
- Mobile full regression: 19 suites / 148 tests passed before adding two boundary component cases. TypeScript passed at that point; final boundary/type check recorded separately below.
- Browser: request form rendered; invalid callback scrubbed URL and displayed request-new-link state; unauthenticated Content and AI Studio routes both showed login without private data. Authenticated workspace happy paths are pending the user's password recovery.
- Local owner QA server restarted on 4174 using only production publishable config in process memory. No env files overwritten.
- Cloud blocker: connector has no Auth URL/SMTP configuration operation; dashboard redirects to Supabase sign-in. User was asked to sign in privately. Allowlist and real email delivery are NOT verified. Do not describe this as production-ready until email → callback → private password entry → owner login and both workspace checks pass.
- Remaining device QA: native cold/warm links, keyboard, 320px and tablet landscape visual checks. No physical-device coverage claimed.

### Follow-up in the same turn

- Two boundary component tests passed: private children do not mount during recovery, and normal startup/invalid-link rendering remain isolated. Final mobile TypeScript and admin capability checks passed.
- User signed into the dashboard. Verified production had **no Redirect URLs**, and Site URL was `http://localhost:3000`; this explains why requests without an explicit allowed callback could land on the wrong page.
- User explicitly approved adding the three exact callbacks above. No wildcard, Site URL, role or password change was authorized as part of that configuration operation.
- Dashboard confirmed **Total URLs: 3**, with all three exact callbacks and Site URL unchanged. The earlier dashboard/allowlist blocker is resolved.
- Sent exactly one recovery request through the production-connected local QA form for `magicpendigital@gmail.com`. UI reached generic success and disabled resend during cooldown. This proves the request completed without a reported error, not inbox delivery. No password or recovery credential was read/entered. User must open the email on the QA computer and complete new-password entry privately, then ordinary owner login.
- Skills applied: Supabase for Auth/session isolation and documentation checks; React Best Practices for lifecycle/stale-request review; agent-browser workflow inspected but CLI unavailable, so browser checks used the supported in-app browser fallback.
