import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

const contracts = [
  { gatewayPath: "/ai/feedback", functionName: "ai-feedback" },
  { gatewayPath: "/share/events", functionName: "share-events" },
  { gatewayPath: "/ai/oracle-turn", functionName: "ai-oracle-turn" },
  { gatewayPath: "/ai/persona-chat", functionName: "ai-persona-chat" },
  { gatewayPath: "/ai/ai-council", functionName: "ai-council" },
  { gatewayPath: "/ai/tarot-reading", functionName: "ai-tarot-reading" },
  { gatewayPath: "/tarot/guest-draw", functionName: "tarot-guest-draw" },
  { gatewayPath: "/ai/daily-insight", functionName: "ai-daily-insight" },
  { gatewayPath: "/ai/daily-zodiac-pulse", functionName: "ai-daily-zodiac-pulse" },
  { gatewayPath: "/ai/astrology-insight", functionName: "ai-astrology-insight" },
  { gatewayPath: "/profile/upsert", functionName: "profile-upsert" },
  { gatewayPath: "/journal/entries", functionName: "journal-entries" },
  { gatewayPath: "/notifications/register-device", functionName: "notification-register-device" },
  { gatewayPath: "/notifications/preferences", functionName: "notification-preferences" },
  { gatewayPath: "/notifications/inbox", functionName: "notification-inbox" },
  { gatewayPath: "/notifications/send-test", functionName: "notification-send-test" }
];

const adminFunctions = ["admin-ai-council-config", "admin-model-router-config", "admin-model-campaigns", "admin-ai-provider-probe", "admin-astrology-prompt-config", "admin-ai-trace-qa-payload", "admin-documentation", "admin-ai-eval-run", "admin-team-invite", "notification-send-test", "notification-dispatch", "notification-receipts"];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const backendClient = read("apps/mobile/src/backendClient.ts");
const runtimeConfig = read("apps/mobile/src/runtimeConfig.ts");
const mobileApp = read("apps/mobile/App.tsx");
assert(backendClient.includes("authToken?: string"), "backendClient BackendOptions must support authToken");
assert(backendClient.includes("apiKey?: string"), "backendClient BackendOptions must support Supabase apikey");
assert(backendClient.includes("headers.apikey"), "backendClient must attach apikey when apiKey is supplied");
assert(backendClient.includes("headers.Authorization"), "backendClient must attach Authorization when authToken is supplied");
assert(runtimeConfig.includes("EXPO_PUBLIC_SUPABASE_URL"), "runtimeConfig must expose optional Supabase URL env");
assert(runtimeConfig.includes("EXPO_PUBLIC_SUPABASE_ANON_KEY"), "runtimeConfig must expose optional Supabase anon/publishable key env");
assert(mobileApp.includes("backendSession?.accessToken"), "mobile App must forward Supabase access token into backend options");
assert(mobileApp.includes("supabaseAnonKey"), "mobile App must forward Supabase anon key into backend options");
assert(backendClient.includes("getPublishedContent") && backendClient.includes("get_published_content_bundle"), "mobile backend client must read the authenticated published content bundle");
for (const { gatewayPath, functionName } of contracts) {
  assert(backendClient.includes(`"${gatewayPath}"`), `backendClient missing gateway path ${gatewayPath}`);
  assert(backendClient.includes(`"/${functionName}"`), `backendClient missing Supabase function mapping ${functionName}`);
}

for (const { functionName } of contracts) {
  const indexPath = path.join(root, "supabase", "functions", functionName, "index.ts");
  assert(fs.existsSync(indexPath), `Missing Supabase Edge Function ${functionName}/index.ts`);
  if (fs.existsSync(indexPath)) {
    // Nil P1-B: ai-astrology-insight keeps its request handling in handler.ts; check both files together.
    const source = fs.readFileSync(indexPath, "utf8") + (functionName === "ai-astrology-insight"
      ? "\n" + read("supabase/functions/ai-astrology-insight/handler.ts") : "");
    const oracleFactory = functionName === "ai-oracle-turn"
      && source.includes("export function createOracleHandler(")
      && source.includes("serve(createOracleHandler())");
    assert(source.includes("serve(async (req)") || oracleFactory, `${functionName} must define a serve handler`);
    if (functionName === "ai-oracle-turn") {
      const handler = read("supabase/functions/ai-oracle-turn/handler.ts");
      const guard = read("supabase/functions/_shared/ai-request-guard.ts");
      const adapter = read("supabase/functions/_shared/oracle-runtime.mjs");
      assert(source.includes("supabase.auth.getUser(token)") && source.includes("aiAuthUserOrUnavailable(data?.user, error)") && source.includes("createOracleRuntimeHandler"), "Oracle must wire verified caller authentication into the shared handler");
      assert(handler.includes("await guardAiJsonRequest(req, deps)") && handler.indexOf("await guardAiJsonRequest(req, deps)") < handler.indexOf("readOracleQuestion(input)"), "Oracle must authenticate and bound JSON before using private messages");
      assert(guard.includes("user.isAnonymous !== false") && guard.indexOf("await deps.authenticate(token)") < guard.indexOf("await readBoundedJson(req"), "Oracle shared guard must reject anonymous/unknown auth before reading input");
      assert(!source.includes("await req.json()") && !handler.includes("await req.json()"), "Oracle must not bypass bounded body parsing");
      assert(handler.indexOf("if (safetySignal)") < handler.indexOf("compileOracleInput(input)") && handler.includes("actionCards: []"), "Oracle static safety support must bypass compilation and spiritual handoffs");
      // oracle-ai-tools-2026-11-11: the model may run only from index.ts, metered by the switch and the shared daily attempt,
      // and the handler must check both (after static safety support) before calling generate.
      const metered = source.includes("claimDailyAttempt(") && source.includes("featurePaused(")
        && handler.indexOf("deps.paused") > handler.indexOf("if (safetySignal)")
        && handler.indexOf("deps.claimAttempt") > -1 && handler.indexOf("deps.claimAttempt") < handler.indexOf("deps.generate!(");
      assert(adapter.includes('from "./prompt-composition/compose.mjs"') && !handler.includes("generateWithModelRoute") && (!source.includes("generateWithModelRoute") || metered), "Oracle must use the packaged compiler and never activate a provider without switch and quota");
      assert(fs.existsSync(path.join(root, "supabase/tests/oracle_auth_test.ts")), "Oracle must retain direct-handler authentication regression tests");
    }
    if (functionName === "ai-feedback") {
      const handler = read("supabase/functions/ai-feedback/handler.ts");
      assert(source.includes("createFeedbackHandler") && source.includes("supabase.auth.getUser"), "Feedback must use the authenticated handler");
      assert(handler.includes("await guardAiJsonRequest") && handler.includes("parseFeedbackSubmission") && handler.includes("parseFeedbackReceipt") && handler.includes("parseFeedbackExport"), "Feedback must guard input and validate all acknowledgements");
    }
    if (functionName === "share-events") {
      const handler = read("supabase/functions/share-events/handler.ts");
      assert(source.includes("createShareEventsHandler") && source.includes("caller.auth.getUser("), "Share events must verify the caller before storing");
      assert(handler.includes("await guardAiJsonRequest") && handler.indexOf("guardAiJsonRequest") < handler.indexOf("parseShareEvents(input)"), "Share events must authenticate and bound JSON before parsing events");
      assert(handler.includes("user_id: userId") && !/user_id:\s*(input|event)/.test(handler), "Share events must write the verified user id, never one from the request");
      assert(source.includes('"usage_events"') && handler.includes('feature: "share"'), "Share events must write enumerated rows to usage_events with feature share");
      assert(handler.includes("onlyKeys(") && handler.includes("DAILY_EVENT_LIMIT"), "Share events must reject extra keys and keep its daily limit");
    }
    assert(source.includes("Access-Control-Allow-Origin"), `${functionName} must include CORS headers`);
    if (["ai-persona-chat", "ai-council", "ai-tarot-reading", "ai-daily-insight", "ai-daily-zodiac-pulse", "ai-astrology-insight", "profile-upsert", "journal-entries", "notification-register-device", "notification-preferences", "notification-inbox", "notification-send-test"].includes(functionName)) {
      assert(source.includes("@supabase/supabase-js"), `${functionName} must use supabase-js for DB-backed sync`);
      assert(source.includes("supabase.auth.getUser"), `${functionName} must verify the user from the JWT before DB writes`);
    }
    if (["ai-persona-chat", "ai-council", "ai-tarot-reading", "ai-daily-insight", "ai-daily-zodiac-pulse"].includes(functionName)) {
      assert(source.includes("usage_events"), `${functionName} must write usage_events when DB-backed`);
      assert(source.includes("persistenceStatus"), `${functionName} must return persistenceStatus for staging diagnostics`);
    }
    if (functionName === "ai-astrology-insight") {
      const authPosition = source.indexOf("supabase.auth.getUser(");
      const bodyPosition = source.indexOf("await req.text()");
      assert(authPosition >= 0 && bodyPosition > authPosition, "ai-astrology-insight must authenticate before reading private request data");
      for (const required of ["ASTROLOGY_AI_CONTRACT.entitlement.requiredEntitlement", "usage_events", "astrology_reports", "strictTraceRedaction: true", "ASTROLOGY_AI_CONTRACT.responseSchema.name", "prompt_not_ready", "selectedFactIds", "user_id: userId", "runtime_environment_not_configured", "AI_TRACE_ENVIRONMENT", "FAILED_ATTEMPT_ALLOWANCE", "astrology_claim_report", "p_daily_limit: dailyAttemptLimit", "astrologyLockKey(", "report_in_progress"]) {
        assert(source.includes(required), `ai-astrology-insight must preserve ${required}`);
      }
    }
    if (functionName === "ai-daily-zodiac-pulse") {
      for (const required of ["daily_zodiac_pulse_mvp_v1", "profileCompleteness", "caveats", "not a certain prediction"]) {
        assert(source.includes(required), `ai-daily-zodiac-pulse function must preserve ${required}`);
      }
    }
    if (functionName === "ai-persona-chat") {
      for (const required of [
        "../_shared/persona-prompt-assembler.ts",
        "assemblePersonaPromptStack",
        "promptStackSource",
        "personaSkillVersion",
        "personaSkillPromptVersionId"
      ]) {
        assert(source.includes(required), `ai-persona-chat must preserve prompt assembler metadata: ${required}`);
      }
    }
    if (functionName.startsWith("notification-")) {
      for (const required of ["notification", "local_fallback"]) {
        assert(source.includes(required), `${functionName} must preserve notification fallback contract: ${required}`);
      }
    }
    if (["ai-persona-chat", "ai-council"].includes(functionName)) {
      assert(!source.includes('moderation_status: "fallback"'), `${functionName} must not persist fallback as chat_messages.moderation_status`);
      assert(!source.includes("moderation_status: moderationStatus"), `${functionName} must map response fallback to a valid DB moderation status`);
    }
    if (functionName === "ai-council") {
      for (const required of ["councilTemplate", "meetingMode", "synthesisMode", "councilTemplateId", "ai_council_config_versions", "ai_council_template_versions", "council_config_version_id", "council_template_key", "councilConfigSource", "supabase_active_config", "rosterSlugs", "runtimePersonasFromTemplate", "councilContract", "councilContractVersion", "council_sequence", "council_turn_kind", "council_reply_to_persona_id"]) {
        assert(source.includes(required), `ai-council function must preserve ${required} metadata`);
      }
    }
  }
}

for (const functionName of adminFunctions) {
  const indexPath = path.join(root, "supabase", "functions", functionName, "index.ts");
  assert(fs.existsSync(indexPath), `Missing Supabase admin Edge Function ${functionName}/index.ts`);
  if (fs.existsSync(indexPath)) {
    const source = fs.readFileSync(indexPath, "utf8");
    const requiredAdminTokens = functionName === "admin-ai-council-config"
      ? [
        "serve(async (req)",
        "Access-Control-Allow-Origin",
        "@supabase/supabase-js",
        "supabase.auth.getUser",
        'supabase.rpc("has_admin_capability",',
        "Admin role required",
        "ai_council_config_versions",
        "ai_council_template_versions",
        "admin_ai_council_config_published"
      ]
      : functionName === "admin-model-router-config" ? [
        "serve(async (req)", "Access-Control-Allow-Origin", "@supabase/supabase-js", "supabase.auth.getUser",
        'supabase.rpc("has_admin_capability",', "Admin role required", "model_route_versions"
      ] : functionName === "admin-model-campaigns" ? [
        // Model campaigns (2026-11-24): the signed-in admin's own session; the SQL RPCs re-check the capability.
        "serve(async (req)", "Access-Control-Allow-Origin", "@supabase/supabase-js", "supabase.auth.getUser",
        'supabase.rpc("has_admin_capability",', 'req.method === "GET" ? "ai.read" : "ai.manage"', "Admin role required",
        "createModelCampaignsHandler"
      ] : functionName === "admin-ai-provider-probe" ? [
        "serve(async (req)", "Access-Control-Allow-Origin", "@supabase/supabase-js", "supabase.auth.getUser",
        'supabase.rpc("has_admin_capability",', 'capability: "ai.manage"', "Admin role required", 'service.rpc("record_ai_provider_probe",'
      ] : functionName === "admin-team-invite" ? [
        "serve(async (req)", "Access-Control-Allow-Origin", "@supabase/supabase-js", "supabase.auth.getUser",
        'supabase.rpc("has_admin_capability",', 'capability: "roles.manage"', "Admin role required",
        'service.rpc("admin_team_invite_begin",', 'service.rpc("admin_team_invite_finish",', "inviteUserByEmail", "REDIRECT_ENV"
      ] : functionName === "admin-astrology-prompt-config" ? [
        "serve(async (req)", "Access-Control-Allow-Origin", "@supabase/supabase-js", "supabase.auth.getUser",
        'supabase.rpc("has_admin_capability",', 'req.method === "GET" ? "ai.read" : "ai.manage"',
        'supabase.rpc("get_astrology_prompt_config")', 'supabase.rpc("publish_astrology_prompt_pair",'
      ] : functionName === "admin-ai-trace-qa-payload" ? [
        "serve(async (req)", "Access-Control-Allow-Origin", "@supabase/supabase-js", "supabase.auth.getUser",
        'supabase.rpc("has_admin_capability",', 'capability: "roles.manage"', 'supabase.rpc("get_ai_trace_qa_capture",',
        'AI_TRACE_QA_CAPTURE_ENABLED', 'AI_TRACE_ENVIRONMENT', 'crypto.subtle.decrypt', 'Cache-Control'
      ] : functionName === "admin-ai-eval-run" ? [
        "serve(async (req)", "Access-Control-Allow-Origin", "@supabase/supabase-js", "supabase.auth.getUser",
        'supabase.rpc("has_admin_capability",', "Admin role required", 'service.rpc("start_ai_eval_run",',
        'service.rpc("finish_ai_eval_run",', "generateWithModelRoute", "strictTraceRedaction: true"
      ] : functionName === "admin-documentation" ? [
        "serve(async req", "Access-Control-Allow-Origin", "@supabase/supabase-js", "userClient.auth.getUser",
        'userClient.rpc("has_admin_capability",', 'capability: "ai.read"', "admin_document_access_log", "ownerGuideMarkdown"
      ] : functionName === "notification-send-test" ? [
        "serve(async (req)", "Access-Control-Allow-Origin", "@supabase/supabase-js", "supabase.auth.getUser",
        'supabase.rpc("has_admin_capability",', "Admin role required", "notification_events"
      ] : [
        "serve(async (req)",
        "Access-Control-Allow-Origin",
        "@supabase/supabase-js",
        "supabase.auth.getUser",
        'supabase.rpc("has_admin_capability",',
        "Admin role required",
        "notification_deliveries"
      ];
    for (const required of requiredAdminTokens) {
      assert(source.includes(required), `${functionName} missing admin contract token: ${required}`);
    }
  }
}

const migration = read("supabase/migrations/20260626000000_ai_council_contract.sql");
assert(migration.includes("'ai_council'"), "AI Council migration must include ai_council constraints");
assert(migration.includes("council_round_id"), "AI Council migration must include council_round_id");

const baseMigration = read("supabase/migrations/202606120001_mvp_schema.sql");
for (const required of [
  "grant usage on schema public to authenticated",
  "grant select, insert, update, delete on all tables in schema public to authenticated"
]) {
  assert(baseMigration.includes(required), `Base MVP migration missing explicit Data API privilege: ${required}`);
}

const upgradeMigration = read("supabase/migrations/20260622000000_upgrade_mvp.sql");
assert(
  upgradeMigration.includes("grant select, insert, update, delete on table public.chat_session_personas to authenticated"),
  "Upgrade MVP migration missing authenticated grant for chat_session_personas"
);

const councilAdminMigration = read("supabase/migrations/20260626000002_ai_council_admin_config.sql");
for (const required of [
  "ai_council_config_versions",
  "ai_council_template_versions",
  "council_config_version_id",
  "council_template_key",
  "enable row level security",
  "grant select, insert, update, delete on table public.ai_council_config_versions to authenticated",
  "grant select, insert, update, delete on table public.ai_council_template_versions to authenticated",
  "to authenticated",
  "public.is_admin()"
]) {
  assert(councilAdminMigration.includes(required), `AI Council admin config migration missing ${required}`);
}

const journalMigration = read("supabase/migrations/20260626000001_journal_mobile_contract.sql");
assert(journalMigration.includes("local_id"), "Journal mobile migration must include local_id");
assert(journalMigration.includes("source_snapshot"), "Journal mobile migration must include source_snapshot");
assert(journalMigration.includes("'share_card'"), "Journal mobile migration must allow share_card source_type");

const astrologyMigration = read("supabase/migrations/20260627000000_astrology_backend_contract.sql");
for (const required of [
  "astrology_reports",
  "latitude",
  "longitude",
  "utc_offset_minutes",
  "input_hash",
  "chart_data",
  "interpretation",
  "enable row level security",
  "grant select, insert, update, delete on table public.astrology_reports to authenticated",
  "to authenticated"
]) {
  assert(astrologyMigration.includes(required), `Astrology backend migration missing ${required}`);
}
// Nil P1-B: the lock migration narrows those grants: the app only reads its own rows; the server claims a key.
const astrologyLockMigration = read("supabase/migrations/20261115110000_astrology_lock.sql");
for (const required of [
  "revoke insert, update, delete on table public.astrology_reports from public, anon, authenticated",
  "create unique index if not exists astrology_reports_user_lock_key_uidx",
  "create trigger astrology_reports_guard before update on public.astrology_reports",
  "public.astrology_claim_report(",
  "public.astrology_soft_delete_reports("
]) {
  assert(astrologyLockMigration.includes(required), `Astrology lock migration missing ${required}`);
}

const notificationMigration = read("supabase/migrations/20260710000000_notifications_contract.sql");
for (const required of [
  "notification_preferences",
  "notification_events",
  "notification_deliveries",
  "in_app_notifications",
  "device_push_tokens",
  "enable row level security",
  "users manage own notification preferences",
  "users manage own in app notifications",
  "admins manage notification deliveries"
]) {
  assert(notificationMigration.includes(required), `Notification migration missing ${required}`);
}

const modelRouteMigration = read("supabase/migrations/20260630000000_model_route_versions.sql");
for (const required of [
  "model_route_versions",
  "primary_provider",
  "fallback_provider",
  "response_schema",
  "fallback_when",
  "safety_policy",
  "enable row level security",
  "public.is_admin()"
]) {
  assert(modelRouteMigration.includes(required), `Model route migration missing ${required}`);
}
const oracleRouteMigration = read("supabase/migrations/20260908000000_oracle_model_route.sql");
assert(oracleRouteMigration.includes("oracle_router"), "Oracle model route migration must allow oracle_router");
const traceMigration = read("supabase/migrations/20260909014614_ai_trace_observability.sql");
for (const required of [
  "ai_trace_runs",
  "ai_trace_spans",
  "ai_trace_payload_refs",
  "ai_trace_scores",
  "enable row level security",
  "trace runs insert own row",
  "get_ai_trace_runs",
  "get_ai_trace_detail",
  "prune_ai_traces",
  "ai.read"
]) {
  assert(traceMigration.includes(required), `AI trace migration missing ${required}`);
}
const marketingMigration = read("supabase/migrations/20260909020528_marketing_waitlist_and_admin_documentation.sql");
for (const required of ["marketing_waitlist", "admin_document_access_log", "enable row level security", "revoke all on table public.marketing_waitlist from public, anon, authenticated", "grant select, insert, update on table public.marketing_waitlist to service_role"]) {
  assert(marketingMigration.includes(required), `Marketing/admin docs migration missing ${required}`);
}
const waitlistEntrypoint = read("supabase/functions/marketing-waitlist/index.ts");
assert(waitlistEntrypoint.includes('import { createWaitlistHandler } from "./handler.ts"') && waitlistEntrypoint.includes('serve(createWaitlistHandler('), "marketing-waitlist must wire the canonical request handler");
const waitlistSource = waitlistEntrypoint + read("supabase/functions/marketing-waitlist/handler.ts");
for (const required of ["SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_SECRET_KEY", "WAITLIST_ALLOWED_ORIGINS", "register_marketing_waitlist_request", "p_email_hash", "Access-Control-Allow-Origin"]) {
  assert(waitlistSource.includes(required), `marketing-waitlist missing security contract: ${required}`);
}
assert(!waitlistSource.includes('.upsert('), "marketing-waitlist must use the atomic consent RPC instead of an unrestricted upsert");
assert(!waitlistSource.includes('status: "subscribed"'), "marketing-waitlist must not silently reactivate a contact");
const marketingConsentMigration = read("supabase/migrations/20260913143958_marketing_consent_suppression_foundation.sql");
for (const required of [
  "marketing_consent_events",
  "marketing_suppressions",
  "marketing_email_tokens",
  "marketing_deliveries",
  "beta_invites",
  "pending_confirmation",
  "resubscribe_requested",
  "register_marketing_waitlist_request",
  "suppression_preserved",
  "enable row level security",
  "revoke all on function public.register_marketing_waitlist_request"
]) {
  assert(marketingConsentMigration.includes(required), `Marketing consent foundation missing ${required}`);
}
const growthAggregateMigration = read("supabase/migrations/20260913184421_growth_waitlist_aggregate_read_model.sql");
for (const required of [
  "get_growth_waitlist_overview",
  "growth_waitlist_overview",
  "overview.read",
  "live_aggregate",
  "security definer",
  "set search_path = ''",
  "revoke all on function nilaza_private.growth_waitlist_overview(), public.get_growth_waitlist_overview()",
  "to authenticated",
  "'engaged', null"
]) {
  assert(growthAggregateMigration.includes(required), `Growth aggregate read model missing ${required}`);
}
for (const forbidden of ["w.email", "w.email_hash", "w.utm", "token_hash"]) {
  assert(!growthAggregateMigration.includes(forbidden), `Growth aggregate read model must not select ${forbidden}`);
}
const supabaseConfig = read("supabase/config.toml").replaceAll("\r\n", "\n");
assert(supabaseConfig.includes("[functions.marketing-waitlist]\nverify_jwt = false"), "marketing-waitlist must be explicitly public in config.toml");
assert(supabaseConfig.includes("[functions.admin-documentation]\nverify_jwt = true"), "admin-documentation must require JWT verification in config.toml");
assert(supabaseConfig.includes("[functions.admin-team-invite]\nverify_jwt = true"), "admin-team-invite must require JWT verification in config.toml");

// Billing lot 1 (2026-11-15): RevenueCat webhook is public at the gateway but guarded by a shared secret.
assert(supabaseConfig.includes("[functions.revenuecat-webhook]\nverify_jwt = false"), "revenuecat-webhook must be explicitly public in config.toml (RevenueCat sends no JWT)");
const revenuecatEntrypoint = read("supabase/functions/revenuecat-webhook/index.ts");
const revenuecatHandler = read("supabase/functions/revenuecat-webhook/handler.ts");
assert(revenuecatEntrypoint.includes('import { createRevenueCatWebhookHandler } from "./handler.ts"') && revenuecatEntrypoint.includes("serve(async req => await handler(req))"), "revenuecat-webhook must wire the tested handler");
for (const required of ["REVENUECAT_WEBHOOK_AUTH", "SUPABASE_SERVICE_ROLE_KEY"]) {
  assert(revenuecatEntrypoint.includes(required), `revenuecat-webhook entrypoint missing ${required}`);
}
for (const required of ["secretMatches", "MIN_SECRET_LENGTH", "MAX_BODY_BYTES", "nilaza_apply_revenuecat_event", "PREMIUM_ENTITLEMENT", "\"Cache-Control\": \"no-store\"", "transfer_not_applied", "test_event"]) {
  assert(revenuecatHandler.includes(required), `revenuecat-webhook handler missing ${required}`);
}
assert(revenuecatHandler.indexOf("await secretMatches(req.headers") > 0 && revenuecatHandler.indexOf("await secretMatches(req.headers") < revenuecatHandler.indexOf("await readBoundedText(req)"), "revenuecat-webhook must check the secret before reading the body");
assert(!revenuecatHandler.includes("await req.json()") && !revenuecatEntrypoint.includes("Access-Control-Allow-Origin"), "revenuecat-webhook must use bounded parsing and expose no CORS");
assert(fs.existsSync(path.join(root, "supabase/functions/revenuecat-webhook/handler_test.ts")), "revenuecat-webhook must keep its handler tests");
// Two migrations with one version prefix break the migration history table (found 2026-11-16).
{
  const seen = new Map();
  for (const name of fs.readdirSync(path.join(root, "supabase/migrations")).filter((file) => file.endsWith(".sql"))) {
    const version = name.split("_")[0];
    assert(!seen.has(version), `duplicate migration version ${version}: ${seen.get(version)} and ${name}`);
    seen.set(version, name);
  }
}
// Billing lot 3 (2026-11-16): account deletion removes the RevenueCat customer, after the purge and
// before the auth user, fail-closed, with the secret key read from the function environment only.
const accountDeleteEntrypoint = read("supabase/functions/account-delete/index.ts");
const accountDeleteHandler = read("supabase/functions/account-delete/handler.ts");
const accountDeleteBilling = read("supabase/functions/account-delete/billing.ts");
assert(accountDeleteEntrypoint.includes('Deno.env.get("REVENUECAT_API_KEY")') && accountDeleteEntrypoint.includes("createRevenueCatCustomerDeleter"), "account-delete must build the billing delete from REVENUECAT_API_KEY");
assert(accountDeleteBilling.includes('"https://api.revenuecat.com/v1"') && accountDeleteBilling.includes('method: "DELETE"') && accountDeleteBilling.includes("AbortController") && !accountDeleteBilling.includes("console."), "account-delete billing call must be a bounded DELETE to RevenueCat v1 without logging");
const purgeAt = accountDeleteHandler.indexOf("nilaza_account_delete_purge\", {");
const billingAt = accountDeleteHandler.indexOf("deps!.deleteBillingCustomer(userId)");
const authDeleteAt = accountDeleteHandler.indexOf("deps!.deleteUser(userId)");
assert(purgeAt > 0 && billingAt > purgeAt && authDeleteAt > billingAt && accountDeleteHandler.includes('fail("billing_delete_failed")'), "account-delete must delete the billing customer after the purge and before the auth user, failing closed");
assert(fs.existsSync(path.join(root, "supabase/functions/account-delete/billing_test.ts")), "account-delete must keep its billing tests");
const revenuecatMigration = read("supabase/migrations/20261116090000_revenuecat_entitlements.sql");
for (const required of [
  "nilaza_private.revenuecat_webhook_events",
  "force row level security",
  "revoke all on table nilaza_private.revenuecat_webhook_events from public, anon, authenticated",
  "public.nilaza_apply_revenuecat_event",
  "set search_path = public, nilaza_private, pg_temp",
  "from public, anon, authenticated",
  "to service_role",
  "'duplicate'",
  "'stale'",
  "'unknown_user'",
  "on conflict (user_id, provider) do update"
]) {
  assert(revenuecatMigration.includes(required), `RevenueCat entitlement migration missing ${required}`);
}
assert(!/create\s+table\s+(if\s+not\s+exists\s+)?public\./i.test(revenuecatMigration) && !/(drop|create|alter)\s+policy/i.test(revenuecatMigration), "RevenueCat migration must not add public tables or change RLS policies");
const astrologyInsightSource = read("supabase/functions/ai-astrology-insight/handler.ts");
assert(astrologyInsightSource.includes("resolveServerTier(") && astrologyInsightSource.includes("PREMIUM_ENTITLEMENTS"), "ai-astrology-insight must judge Premium through _shared/premium-entitlement.ts");
const modelRouterSource = read("supabase/functions/_shared/model-router.ts");
assert(modelRouterSource.includes("createAiTrace") && modelRouterSource.includes("traceContext") && modelRouterSource.includes("traceHooks"), "Model router must emit AI trace context and provider hooks");
for (const provider of ["openai", "anthropic", "gemini", "openrouter"]) {
  assert(read(`supabase/functions/_shared/providers/${provider}.ts`).includes("traceHooks"), `Provider adapter missing trace hook: ${provider}`);
}

const seedSqlPath = path.join(root, "supabase", "seed.generated.sql");
assert(fs.existsSync(seedSqlPath), "Missing generated Supabase seed SQL. Run npm run supabase:seed:generate");
if (fs.existsSync(seedSqlPath)) {
  const seedSql = fs.readFileSync(seedSqlPath, "utf8");
  for (const required of ["public.personas", "public.tarot_decks", "public.tarot_cards", "public.prompt_versions", "Persona chat skill prompt versions", "'persona_chat' and owner_type = 'persona'", "active_prompt_version_id", "public.ai_council_config_versions", "public.ai_council_template_versions", "public.model_route_versions", "ai_council", "tarot_reading"]) {
    assert(seedSql.includes(required), `Generated Supabase seed missing ${required}`);
  }
}
const seedEntrypointPath = path.join(root, "supabase", "seed.sql");
assert(fs.existsSync(seedEntrypointPath), "Missing Supabase seed entrypoint supabase/seed.sql");
if (fs.existsSync(seedEntrypointPath)) {
  const seedEntrypoint = fs.readFileSync(seedEntrypointPath, "utf8");
  assert(seedEntrypoint.includes("\\ir seed.generated.sql"), "Supabase seed entrypoint must include seed.generated.sql");
}
const seedApplyScript = read("scripts/apply-supabase-seed.mjs");
for (const required of ["SUPABASE_DB_URL", "DATABASE_URL", "--dry-run", "psql", "ON_ERROR_STOP=1", "Supabase seed applied and verified successfully", "personaSkillPromptVersions", "activePersonaPromptPointers"]) {
  assert(seedApplyScript.includes(required), `Supabase seed apply script missing ${required}`);
}

const functionsReadme = read("supabase/functions/README.md");
for (const { gatewayPath, functionName } of contracts) {
  assert(functionsReadme.includes(gatewayPath), `Supabase functions README missing ${gatewayPath}`);
  assert(functionsReadme.includes(functionName), `Supabase functions README missing ${functionName}`);
}
for (const functionName of adminFunctions) assert(functionsReadme.includes(functionName), `Supabase functions README missing ${functionName}`);
assert(functionsReadme.includes("Authorization: Bearer"), "Supabase functions README must document JWT Authorization header");
assert(functionsReadme.includes("apikey"), "Supabase functions README must document Supabase apikey header");

if (errors.length) {
  console.error("Backend contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Backend contract validation passed.");
console.log(`Gateway paths: ${contracts.length}`);
console.log(`Supabase Edge Functions: ${new Set([...contracts.map(contract => contract.functionName), ...adminFunctions]).size}`);
