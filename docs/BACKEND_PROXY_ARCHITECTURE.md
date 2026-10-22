# Nilaza Backend Proxy Architecture

> Runtime status update — 2026-09-20: Supabase Edge Functions and typed mobile wrappers are active for the supported online flows. This document contains both current implementation and target architecture; treat wording that says “future” as a target only when it is not already represented under `supabase/functions` and `apps/mobile/src/backendClient.ts`.

Last updated: 2026-06-07

## Recommendation

Use Supabase as the first production backend because Nilaza already needs:

- Auth and user profiles.
- Postgres data storage.
- Row-level security.
- Storage for future image/report assets.
- Realtime subscriptions for job status.
- Edge Functions as the API boundary for AI, tarot, astrology, and admin actions.

Do not call AI providers, astrology providers, or image-analysis providers directly from the mobile app.

## Backend Components

Recommended v1 stack:

- Supabase Auth: user identity.
- Supabase Postgres: durable app data.
- Supabase RLS: user-level data isolation.
- Supabase Storage: future face-reading images and generated assets.
- Supabase Edge Functions: backend proxy for AI/model/API calls.
- Supabase Realtime: notify the client when async jobs finish while the app is open.
- Expo Push Notifications: notify the device when async jobs finish while the app is closed.
- Optional queue/worker layer: Supabase Queues, Vercel Queues, or another worker service once jobs need retries/concurrency control.

## API Boundary

Mobile app calls only Nilaza backend endpoints:

- `POST /ai/oracle-turn`
- `POST /ai/persona-chat`
- `POST /ai/ai-council`
- `POST /ai/tarot-reading`
- `POST /ai/daily-insight`
- `POST /ai/daily-zodiac-pulse`
- `POST /ai/astrology-report`
- `POST /ai/face-reading`
- `POST /jobs`
- `GET /jobs/:id`
- `POST /admin/prompts`
- `POST /admin/content`
- `GET /admin/ai-council-config`
- `POST /admin/ai-council-config`
- `GET /admin/metrics`

For direct Supabase Edge Function staging, set `EXPO_PUBLIC_NILAZA_API_URL` to the project functions base URL, for example:

```text
https://<project-ref>.supabase.co/functions/v1
```

The mobile backend client maps gateway paths to Supabase function names:

| Mobile contract path | Supabase Edge Function |
| --- | --- |
| `/ai/oracle-turn` | `ai-oracle-turn` |
| `/ai/persona-chat` | `ai-persona-chat` |
| `/ai/ai-council` | `ai-council` |
| `/ai/tarot-reading` | `ai-tarot-reading` |
| `/ai/daily-insight` | `ai-daily-insight` |
| `/ai/daily-zodiac-pulse` | `ai-daily-zodiac-pulse` |
| `/ai/astrology-report` | `ai-astrology-report` |
| `/profile/upsert` | `profile-upsert` |
| `/journal/entries` | `journal-entries` |

When Supabase Auth is connected, pass the user's access token through the backend client `authToken` option so Edge Functions can run with JWT verification enabled. Temporary internal mocks may be deployed without JWT only while local-first auth is still being replaced; do not use public unauthenticated functions for external beta.

Backend then calls:

- OpenAI or another model provider.
- Nilaza's astrology calculator, currently backed by open-source Astronomy Engine in an Edge Function, with a future provider slot for Swiss Ephemeris or another licensed calculation service.
- Future image model provider for face-reading.
- Database/storage/logging services.

## Sync vs Async Jobs

Fast jobs can return immediately:

- Short persona chat replies.
- One-card tarot interpretation.
- Daily insight.

Longer jobs should be async:

- Full astrology report.
- Deep tarot reading.
- Face-reading image analysis.
- Long-form persona report.
- Batch prompt/content validation.

## Async Flow

1. Client submits request to backend.
2. Backend creates `generation_jobs` row with status `queued`.
3. Backend returns `jobId` immediately.
4. Worker processes the job.
5. Worker stores result in the relevant table.
6. Worker updates job status to `completed` or `failed`.
7. If app is open, client receives Realtime event or polls `GET /jobs/:id`.
8. If app is closed, backend sends Expo push notification.
9. When user opens the app, client loads the result by `jobId`.

The user does not need to keep the app open for async jobs if push tokens and durable jobs are configured.

## Push Notifications

Push notification support now has a v1 contract for local/staging implementation. In-app inbox is the baseline channel; push is opt-in and uses Expo Push Service. Email remains transactional only for auth/account/payment flows, while SMS, Zalo, and WhatsApp are future channels.

Required backend/mobile pieces:

- Mobile asks notification permission after value is demonstrated, not during first onboarding.
- Mobile registers Expo Push Token and saves it to `device_push_tokens`.
- Backend sends push through Expo Push Service when a job finishes.
- Backend handles invalid tokens and removes them.
- User can turn off notifications.

Notification types:

- `daily_insight_ready`
- `tarot_reading_ready`
- `astrology_report_ready`
- `journal_reflection_reminder`
- `account_security`
- `payment_subscription`
- `admin_test`

Content rules:

- Push payloads must be generic, such as "Your reflection is ready."
- Raw chat, journal notes, tarot questions, birth data, relationship details, and sensitive AI output must never be sent in push payloads or admin delivery logs.
- Detailed content remains inside the authenticated app and is available through `in_app_notifications`.
- Marketing notifications need a separate opt-in and opt-out before launch.

Notification backend contracts:

- `POST /notifications/register-device`
- `GET|POST /notifications/preferences`
- `GET|POST /notifications/inbox`
- `POST /notifications/send-test`
- Internal/admin dispatch: `notification-dispatch`
- Internal/admin receipt cleanup: `notification-receipts`

## Data Tables

Minimum backend schema:

- `users`
- `user_profiles`
- `birth_profiles`
- `personas`
- `persona_sources`
- `prompt_versions`
- `ai_council_config_versions`
- `ai_council_template_versions`
- `chat_sessions`
- `chat_messages`
- `tarot_decks`
- `tarot_cards`
- `tarot_readings`
- `astrology_reports`
- `face_readings`
- `journal_entries`
- `generation_jobs`
- `usage_events`
- `safety_events`
- `device_push_tokens`
- `notification_preferences`
- `notification_events`
- `notification_deliveries`
- `in_app_notifications`
- `admin_audit_logs`

## Feature Handling

### Persona Chat

- Use sync request for normal short chat.
- Save messages to `chat_messages`.
- Use moderation before and after model call.
- Store prompt version and persona version on each AI message.

### AI Council

- Use sync request for short multi-guide council turns.
- Endpoint contract: `POST /ai/ai-council`.
- Accept `language`, `councilVersion`, `councilTemplate`, `userMessage`, `selectedPersonas`, `userContext`, and `sanitizedHistory`.
- `councilTemplate` carries `id`, `meetingMode`, `synthesisMode`, `maxGuidesPerTurn`, guide roles, and output contract from `packages/agent-config/ai-council.json`.
- Published Council Builder configuration is stored in `ai_council_config_versions` and `ai_council_template_versions`; runtime chat sessions can reference `council_config_version_id` and `council_template_key`.
- When JWT/DB are available, the Edge Function should read the active published config/template first, including roster order, and use the mobile `councilTemplate` only as a fallback.
- Return `turns[]` with `personaId`, `text`, `lens`, `kind`, `replyToPersonaId`, `sequence`, and `promptVersionId`, plus `schemaVersion`, `councilConfigVersionId`, `councilConfigSource`, `councilTemplateId`, `meetingMode`, `synthesisMode`, and `moderationStatus`.
- Persist the room in `chat_sessions` with `session_kind = 'ai_council'`.
- Persist selected guides in `chat_session_personas`.
- Persist each user round and guide response in `chat_messages`, using one shared `council_round_id` per user turn plus all guide replies.
- Do not automatically include journal history, birth profile, raw private chat, or uploaded images.
- Store `ai_council_system` prompt version metadata, `ai_council_rounds_v2` output schema, ordered round metadata, and council template metadata for audit. Existing v1 rows remain readable because the v2 columns are nullable.

### Tarot

- App/backend selects cards deterministically.
- AI receives selected card IDs, deck version, spread, question, and user language.
- Save selected cards and generated interpretation for replay.

### Astrology

- Backend calculates chart through provider abstraction.
- MVP backend provider: open-source `astronomy-engine@2.1.19` inside `supabase/functions/ai-astrology-report`, so birth data is not sent to a third-party astrology API for chart calculation.
- Scale-up provider path: keep the same API/database contract and replace or supplement the calculation engine with Swiss Ephemeris or a dedicated astrology service after license/commercial review.
- Geocoding and historical timezone lookup should stay behind backend endpoints. The current function accepts latitude, longitude, timezone, and UTC offset when available, and returns explicit caveats when they are missing.
- Store provider name, provider version if available, input hash, placements, and generated interpretation.
- If birth time/place is missing, result must show caveat.

### Face Reading

- Keep disabled until consent, retention, deletion, and image safety are implemented.
- Process as async job.
- Do not infer protected traits or identity.

## Provider Abstraction

Implement backend providers behind interfaces:

- `ModelProvider`
- `AstrologyProvider`
- `ImageAnalysisProvider`
- `NotificationProvider`

This allows FreeAstroAPI or another astrology provider to be used in beta and replaced later without changing the mobile app. Notification v1 uses `ExpoNotificationProvider`; the same `NotificationProvider` boundary can later support direct APNs/FCM or regional channels.

## Admin Dashboard

Admin should show:

- Usage overview.
- AI cost estimates.
- Job queue status.
- Error and retry rate.
- Prompt versions.
- Content inventory.
- Safety events.
- User reports.
- Provider health.

Admin edits should be versioned and auditable.

## Current implementation and remaining gaps

Implemented in the repository; the supported online paths use the linked Supabase project when public runtime configuration and a signed-in session are present:

- Prompt library draft editing.
- Local usage logs.
- Local audit panel.
- Local astrology mock and provider strategy.
- MVP Supabase schema contract in `supabase/migrations/202606120001_mvp_schema.sql`.
- Mobile backend client wrapper with local fallback for persona chat, AI Council, tarot reading, daily insight, astrology report, profile sync, and journal sync.
- AI Council Supabase contract migration in `supabase/migrations/20260626000000_ai_council_contract.sql`.
- AI Council Admin config migration in `supabase/migrations/20260626000002_ai_council_admin_config.sql`, plus generated seed rows for `ai_council_config_versions` and `ai_council_template_versions` from `packages/agent-config/ai-council.json`.
- Admin AI Council config Edge Function contract in `supabase/functions/admin-ai-council-config`, guarded by JWT plus `is_admin`, for reading current config and publishing new config/template versions.
- Provider-mock Supabase Edge Function contracts in `supabase/functions/ai-persona-chat`, `supabase/functions/ai-council`, `supabase/functions/ai-tarot-reading`, and `supabase/functions/ai-daily-insight`; when Supabase env and JWT are available, these persist chat sessions, council rounds, tarot readings, and usage events. `ai-persona-chat` now assembles active feature prompt plus selected persona skill prompt before returning the mock response. `ai-council` now prefers active published Admin config rows before falling back to mobile-sent template metadata.
- Open-source astrology calculator contract in `supabase/functions/ai-astrology-report` backed by `astronomy-engine@2.1.19`, plus `supabase/migrations/20260627000000_astrology_backend_contract.sql` for enriched `birth_profiles` and `astrology_reports`.
- DB-backed staging sync functions in `supabase/functions/profile-upsert` and `supabase/functions/journal-entries` when Supabase env and JWT are available, with safe local staging fallback otherwise.
- Journal mobile sync migration in `supabase/migrations/20260626000001_journal_mobile_contract.sql`.
- In-app notification inbox, Expo push token/preference contracts, notification dispatch, and receipt cleanup are implemented locally/staging-first in mobile and Supabase function contracts.
- Supabase seed entrypoint in `supabase/seed.sql`, generated payload in `supabase/seed.generated.sql`, and scripts `supabase:seed:generate`, `supabase:seed:verify`, and `supabase:seed:apply` for importing personas, tarot content, global prompt versions, persona skill prompt versions, and AI Council config.

Not yet proven or intentionally deferred:

- Authenticated staging E2E for every protected route. AI Council has a dedicated manual CI scenario, which requires a sanitized staging account and secrets before it can supply live evidence.
- Production-grade provider behavior and failover for every AI route. Contracts may persist fallback/mock responses; do not describe a provider as live until an authenticated staging run and provider-health evidence confirm it.
- Durable async job queue.
- Production device QA, live notification dispatch scheduling, and receipt operations staging verification.
- Real AI provider calls.
- Production geocoding/timezone provider calls for astrology place search and historical UTC offsets.
- Real admin auth/RLS.

## Official References

- Supabase Edge Functions: `https://supabase.com/docs/guides/functions`
- Supabase Realtime: `https://supabase.com/docs/guides/realtime`
- Supabase Queues: `https://supabase.com/docs/guides/queues`
- Expo Push Notifications: `https://docs.expo.dev/push-notifications/overview/`
