# Nilaza online QA and release readiness

## Purpose

Move the existing local-first MVP into a controlled online test without exposing LLM credentials, private prompts, or production user data. This is a staging-first plan; production is a promotion target, not the first test environment.

## Environments

| Environment | Intended use | Supabase project | Provider key | User data |
| --- | --- | --- | --- | --- |
| Local | UI development and deterministic fallback checks | isolated local fallback or owner-approved staging only; no production data | never in app | device-only test data |
| Staging QA | real auth, Edge Functions, Realtime, model routing and device builds | `Nilaza Staging QA` | staging-only `OPENROUTER_API_KEY` secret | disposable QA accounts only |
| Production pilot | invited real users after staging sign-off | `Nilaza` | production-only secret | real user data |

The mobile build receives only its Supabase URL and publishable/anon key. `OPENROUTER_API_KEY`, service-role credentials, and provider configuration remain in Edge Function secrets or protected admin APIs.

## Current stop condition - 2026-10-04

Read docs/SUPABASE_MIGRATION_LEDGER.md and docs/release/RELEASE_RUNBOOK.md first. The ledger remains blocked_pending_reconciliation; the historical steps below are not permission to apply SQL, deploy, repair history or retarget a project. Never import MCY SQL to make history match. Rehearse the reviewed Nilaza schema and synthetic upgrade, then obtain exact target/manifest approval before a separately authorized cloud action. Historical September observations are not fresh live evidence.

## Stage-gate 1: prepare staging (historical sequence, currently blocked)

1. Apply the generation-activity migration and deploy the matching Edge Functions to **Nilaza Staging QA**.
2. Add a staging-only OpenRouter key as `OPENROUTER_API_KEY`; begin with a free, explicitly selected model and a per-user request limit.
3. Confirm RLS with three accounts: ordinary user, owner, and signed-out visitor. An ordinary user must never read another user's chat, journal, notification, or job row.
4. Enable Realtime only for the approved `generation_jobs` contract. Verify publication and RLS before subscribing from the app.
5. Add staging Auth redirect URLs for the preview build and test password recovery, logout, account switching, and deep-link return.
6. Build Android/iOS preview binaries using staging app configuration. Test on physical phone and tablet; web is QA only.

### Observed staging status (2026-09-09)

- `Nilaza Staging QA` is `ACTIVE_HEALTHY`; all required Edge Functions are deployed with JWT verification enabled.
- EAS `preview` has the Staging API URL, Supabase URL, and publishable/anon key. EAS `production` has no variables yet and must remain unpublished until the promotion gate.
- The `oracle_router` route is now allowed by the forward migration `20260908000000_oracle_model_route` and an active `openrouter/free` route is present in Staging.
- The reviewed content/config seed is now loaded in Staging through a controlled, ordered database workflow: 17 personas, 6 tarot decks, 78 tarot cards, 48 prompt versions, 34 persona skill prompts, 4 AI Council templates, 17 active persona prompt pointers, and 6 active/experimental model routes.
- A read-only Edge Function smoke passed for all 17 Staging functions: CORS preflight returned 200 and unauthenticated POSTs returned 401, including `ai-oracle-turn`.
- A verified QA account completed two live Oracle turns from the Staging web build. Both were `moderationStatus=passed`, routed through OpenRouter with `fallbackUsed=false`, and completed in approximately 1.2 seconds; the selected free model may vary by OpenRouter routing. The “Soi tiếp ở đây” action created and completed the follow-up turn successfully.
- Security advisors still report the existing `vector`-in-`public` and leaked-password-protection warnings; resolve or explicitly accept them before a public production pilot.

## Stage-gate 2: long-response UX

For Persona, Oracle, AI Council, Tarot, and Astrology:

- Start a deliberately slow provider request.
- Stay on screen: the inline “đang suy ngẫm” indicator remains visible and send is disabled.
- Navigate elsewhere: the floating Nilaza activity bubble appears without covering the tab bar or primary CTA.
- Let the result arrive: a generic, privacy-safe in-app notice appears; selecting it restores the relevant room/result.
- Force a provider failure, network loss, sign-out, and app restart. The UI must never claim that a response is ready when the client cannot safely recover it.
- Test 60/90/120-second server patience windows. A client timeout is a product limit, not a provider kill switch.

The current client activity layer intentionally marks in-flight local requests as failed after an app restart. A later durable-job worker is required before promising completion after the app is killed; that worker must save only a redacted presentation contract and publish final state through Realtime/push.

## Stage-gate 3: promotion to production pilot

Promote only after all checks below pass in staging:

- Migration is applied and reversible by disabling the feature flag; no client depends on a destructive rollback.
- Edge Function logs show no provider keys, raw private prompts, or full model responses.
- Owner controls work only for the owner role; user Profile → AI Studio links point to the configured protected admin URL.
- Error rate, provider latency, fallback rate, request quota, and job completion state are observable without recording private content.
- Mobile responsive matrix passes: 320x568, 390x884, 844x390, 768x1024, 1024x768, and a 500–700px split view.
- Privacy policy, data-deletion path, birth-profile consent, persona disclosure, and notification opt-in language are ready for store review.

## Paid-model transition

Do not change the app to carry a paid model ID or provider key. Change the active model in AI Studio/model routing for the desired environment, then use a staged rollout:

1. Test one owner account with a fixed paid model and 90–120 second backend patience.
2. Check first-token/complete latency, cost per response, timeout and retry behaviour.
3. Route a small invited cohort behind a remote configuration flag.
4. Keep a lower-cost or free fallback model and a clear “try again later” state; never silently charge repeated retries.

## Manager acceptance path

1. Install the staging preview build and create a fresh non-owner test account.
2. Send a Persona message, leave for Explore while it is waiting, then open the activity bubble once the generic completion notice appears.
3. Repeat with a Tarot interpretation and with the device offline.
4. Sign out, sign in as a different user, and confirm no prior chat, journal, notification, or activity is visible.
5. Sign in as the owner and confirm that AI Studio opens only through the protected admin address.

## Rollback

Disable the responsive activity-bubble/guest entry flags independently. Retain the existing inline loading and local fallback paths. Do not remove the migration in production; stop writing/subscribing to its new fields until a forward migration is reviewed.
