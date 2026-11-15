const features = [
  {
    id: "oracle_router",
    name: "Nilaza Oracle",
    icon: "O",
    version: "2026-09-08-oracle-openrouter-v1",
    status: "Active",
    risk: "Medium",
    provider: "openrouter",
    model: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    schema: "oracle_router_v1",
    safety: "Reflection only + handoff safety boundary",
    description: "Central reflection router that returns a concise reply and typed next actions.",
    fields: [
      field("language", "Language", "low", true, "vi", "base"),
      field("userMessage", "Current question", "medium", true, "I keep second-guessing this decision.", "context_block"),
      field("tone", "Tone preference", "low", true, "gentle", "archetype"),
      field("recentSafeContext", "Recent safe context", "medium", true, "sanitized summaries only", "context_block"),
      field("rawPrivateChat", "Raw private chat", "high", false, "blocked"),
      field("birthProfile", "Birth profile", "high", false, "disabled by consent")
    ],
    prompt:
      "You are Nilaza Oracle, a warm and concise reflection router. Answer the current question in 2-4 short sentences, offer reflection rather than certainty, and suggest a safe next action. Never claim to predict the future, diagnose, provide professional advice, or reveal hidden routing details."
  },
  {
    id: "persona_chat",
    name: "Persona Chat",
    icon: "P",
    version: "2026-09-17-persona-openrouter-free-v1",
    status: "Active",
    risk: "Medium",
    provider: "openrouter",
    model: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    schema: "chat_reply_v2",
    safety: "Inspired-by + crisis boundary",
    description: "Warm guide chat with persona prompt, recent messages, and profile tone.",
    fields: [
      field("language", "Language", "low", true, "vi", "base"),
      field("tone", "Tone preference", "low", true, "gentle", "archetype"),
      field("recentMessages", "Last 6 turns", "medium", true, "sanitized conversation turns", "context_block"),
      field("personaProfile", "Persona profile", "low", true, "Laozi-inspired guide", "persona"),
      field("userGoals", "User goals", "medium", true, "self-understanding, calm", "context_block"),
      field("journalHistory", "Journal history", "high", false, "disabled by default"),
      field("birthProfile", "Birth profile", "high", false, "not needed for chat")
    ],
    prompt:
      "You are a Nilaza guide inspired by {{persona.name}}. Answer warmly and briefly. Be transparent that this is an AI inspired guide, not the real person or official representative. Use {{user.tone}} and {{messages.recent}} only when helpful."
  },
  {
    id: "ai_council",
    name: "AI Council",
    icon: "C",
    version: "2026-06-26-council-builder-v1",
    status: "Active",
    risk: "Medium",
    provider: "openrouter",
    model: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    schema: "ai_council_rounds_v2",
    safety: "Multi-persona inspired-by + sanitized context only",
    description: "Group advisory room where several selected guides respond to one user situation in a council-style thread.",
    fields: [
      field("language", "Language", "low", true, "vi", "base"),
      field("tone", "Tone preference", "low", true, "gentle", "archetype"),
      field("userGoals", "User goals", "medium", true, "self-understanding, love, career", "context_block"),
      field("userMessage", "Latest council question", "medium", true, "I am overthinking whether to change career paths.", "context_block"),
      field("selectedCouncilPersonas", "Selected council guides", "medium", true, "Aristotle, Confucius, Calm Living Mentor", "persona"),
      field("sanitizedCouncilHistory", "Sanitized council history", "medium", true, "last safe user and guide turns only", "context_block"),
      field("maxGuidesPerTurn", "Max guides per turn", "low", true, "3", "output"),
      field("journalHistory", "Journal history", "high", false, "disabled by default"),
      field("birthProfile", "Birth profile", "high", false, "disabled by default"),
      field("rawPrivateChat", "Raw private chat", "high", false, "blocked")
    ],
    prompt:
      "Orchestrate a Nilaza AI Council. For each {{userMessage}}, generate concise perspectives from {{selectedCouncilPersonas}} using {{user.tone}} and approved {{sanitizedCouncilHistory}} only. Preserve each guide lens, never claim the real person is speaking, and end with one safe small step or reflective question."
  },
  {
    id: "tarot_reading",
    name: "Tarot Reading",
    icon: "T",
    version: "v1.2.0",
    status: "Active",
    risk: "Medium",
    provider: "openrouter",
    model: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    schema: "tarot_reading_output_v3",
    safety: "Strict reflection gate",
    description: "Interpret app-selected cards with spread, question, deck, and safe reflection copy.",
    fields: [
      field("language", "Language", "low", true, "vi"),
      field("tone", "Tone preference", "low", true, "compassionate"),
      field("latestMessage", "Latest message", "medium", true, "Should I continue this relationship?"),
      field("selectedCards", "Selected tarot cards", "low", true, "The Moon, Two of Cups, Justice"),
      field("spreadType", "Spread type", "low", true, "three_card"),
      field("uploadedImage", "Uploaded image", "high", false, "blocked for tarot"),
      field("userName", "User name", "medium", false, "not required"),
      field("birthDate", "Birth date", "high", false, "not required"),
      field("zodiacSign", "Zodiac sign", "medium", false, "optional only")
    ],
    prompt:
      "Interpret app-selected cards symbolically for self-reflection. Use {{tarot.cards}}, {{tarot.spread}}, and {{user.question}}. Do not claim certain futures, scare users, or provide professional advice. End with one reflection question."
  },
  {
    id: "daily_insight",
    name: "Daily Insight",
    icon: "D",
    version: "v1.0.8",
    status: "Active",
    risk: "Low",
    provider: "openrouter",
    model: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    schema: "daily_insight_v1",
    safety: "Micro-action safe",
    description: "Short daily ritual copy personalized by goals, language, and tone.",
    fields: [
      field("language", "Language", "low", true, "vi"),
      field("tone", "Tone preference", "low", true, "wise"),
      field("userGoals", "User goals", "medium", true, "love, daily guidance"),
      field("timezone", "Timezone", "low", true, "Asia/Bangkok"),
      field("recentReadings", "Recent readings", "medium", false, "not active"),
      field("journalHistory", "Journal history", "high", false, "disabled")
    ],
    prompt:
      "Write one short, warm, lightly poetic message based on {{user.goals}} and {{user.tone}}. Add one safe micro-action for today. Avoid fate claims."
  },
  {
    id: "notifications",
    name: "Notifications",
    icon: "N",
    version: "v1.0.0",
    status: "Active",
    risk: "Medium",
    provider: "expo",
    model: "Expo Push Service",
    fallbackProvider: "expo",
    fallbackModel: "In-app inbox only",
    schema: "notification_event_v1",
    safety: "Opt-in + generic payload only",
    description: "In-app inbox and Expo push delivery for reminders and result-ready events without exposing private content.",
    fields: [
      field("language", "Language", "low", true, "vi"),
      field("notificationType", "Notification type", "low", true, "astrology_report_ready"),
      field("targetRoute", "Target route", "low", true, "astrology"),
      field("safeTitle", "Safe title", "low", true, "Your reflection is ready"),
      field("safeBody", "Safe body", "low", true, "Open Nilaza to view it."),
      field("expoPushToken", "Expo Push Token", "high", true, "stored in device_push_tokens"),
      field("rawChat", "Raw chat content", "high", false, "blocked"),
      field("journalNote", "Journal note", "high", false, "blocked"),
      field("birthProfile", "Birth profile", "high", false, "blocked"),
      field("tarotQuestion", "Tarot question", "high", false, "blocked")
    ],
    prompt:
      "Create only a safe notification envelope. Use generic title/body copy, a typed target route, and delivery metadata. Never include raw chat, journal notes, tarot questions, birth data, relationship details, or sensitive AI output in push payloads or admin logs."
  },
  {
    id: "astrology",
    name: "Astrology",
    icon: "A",
    version: "2026-09-25-ai-insight-v1",
    status: "Draft",
    risk: "Medium",
    provider: "openrouter",
    model: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    schema: "astrology_ai_insight_v1",
    safety: "Selected calculated facts · evidence citations · current focus only",
    description: "Premium reflective guide grounded in the current canonical chart contract. The server checks entitlement, consent, report ownership, and evidence before saving.",
    fields: [
      field("language", "Language", "low", true, "vi"),
      field("chartVersions", "Chart and calculation versions", "low", true, "canonical 0.2.0 · nilaza-a3-utc-tt-2"),
      field("selectedCalculatedFacts", "Selected placements, aspects, houses", "medium", true, "Allowlisted facts with confidence and caveat IDs"),
      field("calculationCaveats", "Calculation caveats", "low", true, "Independent accuracy review pending"),
      field("currentFocus", "Current question and theme", "medium", true, "One turn only · consent required"),
      field("birthDate", "Birth date", "high", false, "blocked before provider"),
      field("birthTime", "Birth time", "high", false, "blocked before provider"),
      field("birthPlace", "Birth place and coordinates", "high", false, "blocked before provider"),
      field("journalHistory", "Journal history", "high", false, "blocked"),
      field("chatHistory", "Private chat history", "high", false, "blocked"),
      field("accountIdentifiers", "Account/device identifiers", "high", false, "never sent to model")
    ],
    prompt:
      "Interpret only the supplied chart facts and caveats. Never invent placements. Connect selected facts to the current question with warm, specific reflection, preserve uncertainty, avoid fixed predictions and regulated advice, and return the versioned evidence-bound JSON schema. Birth details, journal, private chat, and account identifiers are excluded."
  },
  {
    id: "face_reading",
    name: "Face Reading",
    icon: "F",
    version: "disabled-v0.1",
    status: "Disabled",
    risk: "High",
    provider: "openrouter",
    model: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    schema: "symbolic_face_reading_v0",
    safety: "Consent + protected trait block",
    description: "Symbolic archetype reading only. Disabled until consent, deletion, and image safety are ready.",
    fields: [
      field("language", "Language", "low", true, "vi"),
      field("consent", "Explicit consent", "high", true, "required"),
      field("uploadedImage", "Uploaded image", "high", true, "retention-limited"),
      field("imageSafetyResult", "Image safety result", "high", true, "safe portrait"),
      field("userIntention", "User intention", "medium", true, "self-reflection"),
      field("identityInference", "Identity inference", "high", false, "blocked"),
      field("healthInference", "Health inference", "high", false, "blocked"),
      field("attractivenessScore", "Attractiveness score", "high", false, "blocked")
    ],
    prompt:
      "Create a symbolic archetype reading from user-provided intention and approved image summary only. Do not infer identity, protected traits, attractiveness, health, intelligence, criminality, or trustworthiness."
  }
];

const providerCatalog = {
  openai: {
    label: "OpenAI",
    status: "Connected",
    bestFor: "fast product responses, structured outputs, broad feature coverage",
    models: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o3-mini"]
  },
  gemini: {
    label: "Google / Gemini",
    status: "Ready to connect",
    bestFor: "long context, multimodal review, lower-cost high-volume paths",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-pro-exp", "gemini-2.0-flash", "gemini-1.5-pro"]
  },
  anthropic: {
    label: "Anthropic",
    status: "Ready to connect",
    bestFor: "careful reasoning, safer long-form reflection, nuanced tone",
    models: ["claude-3-7-sonnet-latest", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"]
  },
  openrouter: {
    label: "OpenRouter",
    status: "Connected",
    bestFor: "unified API access to multiple models including open-source ones",
    models: ["deepseek/deepseek-v4.1-flash", "xiaomi/mimo-v2.6-flash", "deepseek/deepseek-v4.1-flash-1017", "openai/gpt-5.4", "openai/gpt-5.4-mini", "anthropic/claude-sonnet-4.6", "google/gemini-3.5-flash", "openrouter/auto", "openrouter/free"]
  },
  expo: {
    label: "Expo",
    status: "Contract ready",
    bestFor: "mobile push delivery with ticket and receipt tracking",
    models: ["Expo Push Service", "In-app inbox only"]
  }
};

const personaConfigs = [
  {
    id: "laozi",
    name: "Laozi",
    archetype: "sage_mentor",
    tone: "quiet, poetic, spacious",
    pace: "slow",
    boundary: "Inspired by Laozi. This is a symbolic AI guide, not a historical person speaking.",
    strengths: ["letting go", "simplicity", "inner calm"],
    avoid: ["overly tactical advice", "productivity jargon", "certainty claims"],
    signatureMoves: ["answer with a gentle paradox", "suggest one small act of release", "ask one quiet reflection question"],
    responseFormat: ["quiet observation", "symbolic insight", "one reflection question"]
  },
  {
    id: "aristotle",
    name: "Aristotle",
    archetype: "sage_mentor",
    tone: "wise, structured, practical",
    pace: "measured",
    boundary: "Inspired by Aristotle. This is not Aristotle, his estate, or an official representative.",
    strengths: ["reasoning", "purpose", "habits", "decision clarity"],
    avoid: ["mystical certainty", "official representative claims", "professional advice"],
    signatureMoves: ["name the purpose behind the choice", "separate virtue from impulse", "offer one practical habit"],
    responseFormat: ["situation lens", "tradeoff", "practical next step", "reflection question"]
  },
  {
    id: "communication_mentor",
    name: "Communication Mentor",
    archetype: "love_reflection_guide",
    tone: "warm, clear, tactful",
    pace: "direct",
    boundary: "Inspired by general communication principles, not any single copyrighted book.",
    strengths: ["message drafting", "boundaries", "repair conversations"],
    avoid: ["manipulation", "pressure tactics", "copyrighted book imitation"],
    signatureMoves: ["name the emotional need", "offer a gentle message draft", "suggest a boundary-safe next step"],
    responseFormat: ["emotional validation", "boundary-aware interpretation", "message suggestion", "reflection question"]
  }
];

const councilTemplates = [
  {
    id: "love_confusion",
    name: "Love Confusion Council",
    useCase: "Relationship uncertainty, mixed signals, attachment loops",
    meetingMode: "supportive_roundtable",
    maxGuides: 3,
    status: "Ready for beta",
    roster: [
      { personaId: "communication_mentor", role: "moderator", purpose: "Clarify feelings, boundaries, and one message the user could send safely." },
      { personaId: "laozi", role: "mirror", purpose: "Slow the urgency and reflect what can be released." },
      { personaId: "aristotle", role: "practical_reasoner", purpose: "Separate desire, habit, and values before suggesting a grounded next step." }
    ],
    flow: [
      "Moderator frames the user's situation without adding facts.",
      "Each guide gives one distinct lens in 70 words or fewer.",
      "Moderator summarizes common signal, tension, and one emotionally safe next action."
    ],
    synthesisMode: "gentle_consensus",
    outputContract: ["roundId", "guideReplies[]", "moderatorSummary", "nextStep", "reflectionQuestion"]
  },
  {
    id: "career_fog",
    name: "Career Fog Council",
    useCase: "Career choice, motivation drop, identity versus stability",
    meetingMode: "advisory_board",
    maxGuides: 3,
    status: "Ready for beta",
    roster: [
      { personaId: "aristotle", role: "chair", purpose: "Name the purpose, tradeoff, and habit behind the decision." },
      { personaId: "communication_mentor", role: "translator", purpose: "Turn inner conflict into a clear question or message." },
      { personaId: "laozi", role: "pace_keeper", purpose: "Reduce urgency and ask what path feels less forced." }
    ],
    flow: [
      "Chair identifies the decision frame and missing information.",
      "Guides respond from purpose, communication, and inner pace.",
      "Chair closes with a small experiment the user can run this week."
    ],
    synthesisMode: "decision_next_step",
    outputContract: ["roundId", "decisionFrame", "guideReplies[]", "tradeoffs", "microExperiment"]
  },
  {
    id: "overthinking",
    name: "Overthinking Reset",
    useCase: "Rumination, anxiety spiral, replaying conversations",
    meetingMode: "calm_intervention",
    maxGuides: 2,
    status: "Draft review",
    roster: [
      { personaId: "laozi", role: "grounding_guide", purpose: "Help the user slow down and return to what is controllable." },
      { personaId: "communication_mentor", role: "reality_checker", purpose: "Separate observable facts from imagined interpretations." }
    ],
    flow: [
      "Grounding guide reflects the emotional loop with no diagnosis.",
      "Reality checker separates facts, assumptions, and a gentle check-in option.",
      "The council ends with one calming action and one reflective question."
    ],
    synthesisMode: "calming_reframe",
    outputContract: ["roundId", "facts", "assumptions", "guideReplies[]", "calmingAction", "reflectionQuestion"]
  },
  {
    id: "big_decision",
    name: "Big Decision Board",
    useCase: "Important choice where the user wants multiple lenses",
    meetingMode: "structured_debate",
    maxGuides: 3,
    status: "Draft review",
    roster: [
      { personaId: "aristotle", role: "values_chair", purpose: "Evaluate the choice through values, consequence, and practice." },
      { personaId: "communication_mentor", role: "stakeholder_lens", purpose: "Consider conversations, boundaries, and people affected." },
      { personaId: "laozi", role: "inner_weather", purpose: "Notice resistance, force, and what becomes simple when quiet." }
    ],
    flow: [
      "Chair states the decision and two plausible paths.",
      "Guides respond with values, relationships, and inner-signal lenses.",
      "Chair summarizes where the user needs more information before acting."
    ],
    synthesisMode: "balanced_tradeoff",
    outputContract: ["roundId", "choiceFrame", "guideReplies[]", "unknowns", "nextQuestion"]
  }
];

const promptLayers = {
  safety: "Global Safety Prompt",
  base: "Persona Chat Base Prompt",
  archetype: "Archetype Template",
  persona: "Persona-Specific Config",
  context_block: "Context Block",
  output: "Output Format"
};

const nodes = [
  { id: "trigger", label: "Trigger", type: "trigger", icon: "1", detail: "User submits feature request", badge: "Locked" },
  { id: "context", label: "Context Builder", type: "context", icon: "2", detail: "Local sample preview · backend contract is authoritative", badge: "Preview" },
  { id: "safety", label: "Safety Gate", type: "safety", icon: "3", detail: "Policy reference · inspect runtime trace", badge: "Read only" },
  { id: "prompt", label: "Prompt Composer", type: "prompt", icon: "4", detail: "Astrology backend prompt · local preview for other features", badge: "Feature-specific" },
  { id: "model", label: "Model Call", type: "model", icon: "5", detail: "Backend route draft and publish", badge: "Route" },
  { id: "output", label: "Output Validator", type: "output", icon: "6", detail: "Validate against feature contract", badge: "Locked" },
  { id: "save", label: "Save + Audit Log", type: "save", icon: "7", detail: "Trace and audit visibility", badge: "Locked" }
];

function councilPublishVersionSeed() {
  return `${features.find((item) => item.id === "ai_council")?.version || "ai-council"}-admin-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12)}`;
}

function adminFunctionEndpoint(name) {
  const base = typeof window.ENV?.SUPABASE_URL === "string" ? window.ENV.SUPABASE_URL.trim().replace(/\/$/, "") : "";
  return base ? `${base}/functions/v1/${name}` : "";
}

function hasSessionAdminTransport() {
  return typeof window.NilazaAdminRequest === "function";
}

function adminRequest(url, init, capability) {
  // Never fall back to an unauthenticated or hand-pasted token request.
  if (hasSessionAdminTransport()) return window.NilazaAdminRequest(url, init, capability);
  return Promise.reject(Error("Phiên đăng nhập Admin chưa sẵn sàng / Admin session unavailable"));
}

let state = {
  featureId: "tarot_reading",
  nodeId: "context",
  detail: "payload",
  personaId: "laozi",
  councilTemplateId: "love_confusion",
  councilPublishVersion: councilPublishVersionSeed(),
  mentionEditorId: null,
  mentionQuery: "",
  testRun: null,
  // Endpoints come from config.js only; the signed-in session transport attaches the token (A1, AD-21).
  councilAdminEndpoint: adminFunctionEndpoint("admin-ai-council-config"),
  councilAdminStatus: "Chưa tải / Not connected",
  councilAdminResult: null,
  councilAdminBusy: false,
  modelRouterAdminEndpoint: adminFunctionEndpoint("admin-model-router-config"),
  modelRouterAdminStatus: "Chưa kiểm tra",
  modelRouterAdminResult: null,
  modelRouterAdminBusy: false,
  modelRouterLoadedScope: null,
  modelRoutePendingPublication: null,
  modelRouterRemoteRoutes: [],
  modelRouterExperimentalRoutes: [],
  modelRouterAmbiguousRoutes: [],
  modelRouterHistory: [],
  astrologyPromptAdminEndpoint: adminFunctionEndpoint("admin-astrology-prompt-config"),
  astrologyPromptAdminBusy: false,
  astrologyPromptAdminStatus: "Not loaded",
  astrologyPromptActive: null,
  astrologyPromptHistory: [],
  astrologyPromptDraft: (() => { try { return JSON.parse(localStorage.getItem("nilaza.admin.astrologyPromptDraft.v1") || "{}"); } catch { return {}; } })(),
  aiAdminAuditEvents: null,
  aiAdminAuditBusy: false,
  aiAdminAuditStatus: "Chưa tải",
  aiStudioDrafts: {},
  traceExplorerRuns: [],
  traceExplorerDetail: null,
  traceExplorerSelectedId: "",
  traceExplorerFilter: "current",
  traceExplorerStatusFilter: "all",
  traceExplorerQuery: "",
  traceExplorerStatus: "Chưa tải",
  traceExplorerBusy: false,
  traceExplorerQaPayload: null,
  traceExplorerQaEpoch: 0,
  traceReadEpoch: 0,
  traceReadContextKey: "",
  traceDetailScope: null,
  traceDetailLoading: false,
  workflowBaseScopeKey: "",
  workflowSelection: null,
  workflowGraphMode: "graph",
  workflowGraphZoom: 1,
  workflowGraphScroll: { left: 0, top: 0 },
  workflowEvidence: null,
  workflowEvidenceScope: null,
  workflowEvidenceStatus: "No matching redacted trace applied. Source view only.",
  workflowTraceReaderState: "not-loaded",
  pendingPublish: null,
  publishFocusReturn: null,
  publishConfirmBlocked: false,
  lastPublishNote: "",
  promptCompiler: window.NilazaPromptCompiler || null,
  promptCompilerStatus: "Loading the shared prompt compiler…",
  oraclePreviewLocale: "vi",
  oraclePreviewTone: "gentle",
  oraclePreviewQuestion: "Mình muốn nhìn lại điều gì đã giúp mình bình tĩnh hôm nay.",
  oraclePreviewResult: null,
  oraclePreviewInputKey: null,
  oraclePreviewError: ""
};
document.documentElement.dataset.workspaceMode = window.parent === window ? "standalone" : "embedded";

// v1 remains untouched: an unscoped legacy draft is never assigned to a new owner.
function aiStudioDraftStorageKey() {
  const account = window.NilazaAdminSession?.userId;
  const target = typeof window.NilazaAdminTransportTarget === "string" ? window.NilazaAdminTransportTarget : window.ENV?.SUPABASE_URL || "local-preview";
  return account ? `nilaza.admin.aiStudio.draft.v2:${encodeURIComponent(account)}:${encodeURIComponent(target)}` : null;
}
const aiStudioInitialDraftKey = aiStudioDraftStorageKey();
const aiStudioUiStorageKey = "nilaza.admin.aiStudio.ui.v1";
// workspace-guard pins its Supabase client for this document. A mutable ENV
// value must not relabel data returned by that already-created transport.
const workflowTransportTarget = (() => {
  if (typeof window.NilazaAdminTransportTarget === "string") return window.NilazaAdminTransportTarget;
  try { return new URL(window.ENV?.SUPABASE_URL || "").origin; } catch { return ""; }
})();
const studioRouteDetails = { features: "aiFeatures", context: "contextConfig", providers: "providers", workflow: "payload", prompt: "prompt", "persona-studio": "personaStudio", "council-builder": "councilBuilder", "model-router": "modelRouter", "trace-explorer": "traceExplorer", test: "test", versions: "versions", audit: "audit", feedback: "feedback", switches: "switches" };
const workflowDetailSections = ["payload", "dataMindmap", "optimization"];

function studioRouteState() {
  const route = Object.keys(studioRouteDetails).find(key => studioRouteDetails[key] === state.detail) || "workflow";
  return { route, featureId: state.featureId, locale: state.oraclePreviewLocale, section: route === "workflow" ? state.detail : "" };
}

function syncStudioRoute() {
  const selection = studioRouteState();
  const params = new URLSearchParams({ feature: selection.featureId, locale: selection.locale });
  if (selection.route === "workflow" && selection.section !== "payload") params.set("section", selection.section);
  const hash = `#${selection.route}?${params}`;
  // replaceState avoids a second hash event overwriting a newer selection;
  // the parent records one navigation entry and handles Back/Forward.
  if (location.hash !== hash) history.replaceState(null, "", hash);
  if (window.parent !== window) window.parent.postMessage({ type: "nilaza.admin.route", workspaceId: "ai-studio", ...selection }, location.origin);
}

function restoreStudioRoute() {
  const [route, query = ""] = location.hash.slice(1).split("?");
  if (!Object.hasOwn(studioRouteDetails, route)) return;
  clearWorkflowObservation("URL navigation cleared the previous trace observation.");
  const params = new URLSearchParams(query);
  const nextFeature = params.get("feature");
  const nextLocale = params.get("locale");
  clearTraceQaPayload();
  if (features.some(item => item.id === nextFeature)) state.featureId = nextFeature;
  if (["vi", "en"].includes(nextLocale)) state.oraclePreviewLocale = nextLocale;
  state.detail = route === "workflow" && workflowDetailSections.includes(params.get("section")) ? params.get("section") : studioRouteDetails[route];
  state.nodeId = state.detail === "modelRouter" ? "model" : state.detail === "prompt" ? "prompt" : "context";
  persistAiStudioUiState();
  renderAll();
  if (state.detail === "prompt" && feature().id === "astrology" && !state.astrologyPromptActive) void loadAstrologyPromptConfig();
}

async function loadSharedPromptCompiler() {
  try {
    state.promptCompiler ??= await import("./generated/prompt-composition/compose.mjs");
    if (typeof state.promptCompiler.composePromptPreview !== "function" || !state.promptCompiler.PROMPT_BUNDLE?.manifest) throw Error("Unavailable compiler");
    state.promptCompilerStatus = "Shared canonical compiler loaded · local candidate only";
    invalidateOraclePreview();
  } catch {
    state.promptCompiler = null;
    state.promptCompilerStatus = "Shared compiler unavailable. The reviewed generated artifact must be included in this Admin build; no sample compiler is substituted.";
  }
  if (state.detail === "prompt" && state.featureId === "oracle_router") renderPromptDetail();
}

function oraclePreviewInputKey() {
  return JSON.stringify([state.featureId, state.oraclePreviewLocale, state.oraclePreviewTone, state.oraclePreviewQuestion]);
}

function invalidateOraclePreview() {
  state.oraclePreviewResult = null;
  state.oraclePreviewInputKey = null;
  state.oraclePreviewError = "";
}

function invalidateChangedOraclePreview() {
  if (state.oraclePreviewInputKey !== null && state.oraclePreviewInputKey !== oraclePreviewInputKey()) invalidateOraclePreview();
}

function compileOraclePreview() {
  invalidateOraclePreview();
  state.oraclePreviewInputKey = oraclePreviewInputKey();
  const compiler = state.promptCompiler;
  if (!compiler) { state.oraclePreviewError = "Shared compiler unavailable; no provider request was made."; return; }
  try {
    state.oraclePreviewResult = compiler.composePromptPreview({
      bundleVersion: compiler.PROMPT_BUNDLE.manifest.version,
      bundleSha256: compiler.PROMPT_BUNDLE.bundleSha256,
      feature: "oracle_router", locale: state.oraclePreviewLocale, tone: state.oraclePreviewTone,
      question: state.oraclePreviewQuestion
    });
  } catch (error) {
    // Never render a raw error, stack, or submitted sample in an error label.
    state.oraclePreviewError = `Preview rejected (${typeof error?.code === "string" && /^[A-Z_]+$/.test(error.code) ? error.code : "INVALID_INPUT"}). Use an allowed locale/tone and a non-empty fictional question within the size limit.`;
  }
}

function persistAiStudioUiState() {
  try {
    sessionStorage.setItem(aiStudioUiStorageKey, JSON.stringify({
      featureId: state.featureId,
      nodeId: state.nodeId,
      detail: state.detail
    }));
  } catch {
    // Selection persistence is best effort; access checks still run on each action.
  }
}

function restoreAiStudioUiState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(aiStudioUiStorageKey) || "{}");
    if (features.some((item) => item.id === saved.featureId)) state.featureId = saved.featureId;
    if (nodes.some((item) => item.id === saved.nodeId)) state.nodeId = saved.nodeId;
    const details = ["aiFeatures", "contextConfig", "providers", "payload", "dataMindmap", "prompt", "personaStudio", "councilBuilder", "optimization", "modelRouter", "traceExplorer", "test", "versions", "audit", "feedback", "switches"];
    if (details.includes(saved.detail)) state.detail = saved.detail;
  } catch {
    // Ignore stale or malformed local selection state.
  }
}

function normalizeProviderId(value) {
  const aliases = {
    OpenAI: "openai",
    Google: "gemini",
    "Google / Gemini": "gemini",
    Anthropic: "anthropic",
    OpenRouter: "openrouter",
    Expo: "expo"
  };
  const normalized = typeof value === "string" ? value.trim() : "";
  return aliases[normalized] || normalized.toLowerCase();
}

function readAiStudioDrafts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(aiStudioDraftStorageKey()) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function persistAiStudioDrafts() {
  try {
    const key = aiStudioDraftStorageKey();
    if (key && key === aiStudioInitialDraftKey) localStorage.setItem(key, JSON.stringify(state.aiStudioDrafts));
  } catch {
    // Local draft persistence is best effort; backend publish remains explicit.
  }
}

const modelRouteDraftFields = ["provider", "model", "fallbackProvider", "fallbackModel", "temperature", "maxOutputTokens", "fallbackWhen", "safetyPolicy"];

function hasModelRouteDraft(current = feature()) {
  const draft = state.aiStudioDrafts[current.id];
  return Boolean(draft && modelRouteDraftFields.some((key) => Object.hasOwn(draft, key)));
}

function persistFeatureDraft(current = feature(), part = "preview") {
  const draft = { ...(state.aiStudioDrafts[current.id] || {}) };
  if (part === "route") {
    for (const key of modelRouteDraftFields) draft[key] = current[key];
  }
  if (part === "prompt" || part === "preview") draft.prompt = current.prompt;
  if (part === "context" || part === "preview") {
    draft.fields = current.fields.map((item) => ({ id: item.id, enabled: item.enabled, inject: item.inject }));
  }
  state.aiStudioDrafts[current.id] = draft;
  persistAiStudioDrafts();
}

function clearPublishedModelRouteDraft(current) {
  const draft = state.aiStudioDrafts[current.id];
  if (!draft) return;
  for (const key of modelRouteDraftFields) delete draft[key];
  if (!Object.keys(draft).length) delete state.aiStudioDrafts[current.id];
  persistAiStudioDrafts();
}

function hydrateAiStudioDrafts() {
  state.aiStudioDrafts = readAiStudioDrafts();
  for (const current of features) {
    const draft = state.aiStudioDrafts[current.id];
    if (!draft || typeof draft !== "object") continue;
    const provider = normalizeProviderId(draft.provider);
    const fallbackProvider = normalizeProviderId(draft.fallbackProvider);
    if (providerCatalog[provider]) current.provider = provider;
    if (typeof draft.model === "string" && draft.model.trim()) current.model = draft.model;
    if (draft.fallbackProvider === "" || providerCatalog[fallbackProvider]) current.fallbackProvider = fallbackProvider;
    if (typeof draft.fallbackModel === "string") current.fallbackModel = draft.fallbackModel;
    if (Number.isFinite(Number(draft.temperature))) current.temperature = Number(draft.temperature);
    if (Number.isFinite(Number(draft.maxOutputTokens))) current.maxOutputTokens = Number(draft.maxOutputTokens);
    if (Array.isArray(draft.fallbackWhen)) current.fallbackWhen = draft.fallbackWhen;
    if (draft.safetyPolicy && typeof draft.safetyPolicy === "object") current.safetyPolicy = draft.safetyPolicy;
    if (typeof draft.prompt === "string") current.prompt = draft.prompt;
    if (Array.isArray(draft.fields)) {
      for (const savedField of draft.fields) {
        const field = current.fields.find((item) => item.id === savedField?.id);
        if (!field) continue;
        if (typeof savedField.enabled === "boolean") field.enabled = savedField.enabled;
        if (typeof savedField.inject === "string") field.inject = savedField.inject;
      }
    }
  }
}

function modelRouteFeatureId(featureId) {
  return featureId === "astrology" ? "astrology_report" : featureId;
}

function adminFeatureId(featureId) {
  return featureId === "astrology_report" ? "astrology" : featureId;
}

function applyRemoteModelRoutes(routes) {
  const safeRoutes = Array.isArray(routes) ? routes : [];
  const eligibleRoutes = safeRoutes.filter(route => route && ["active", "experimental"].includes(route.status)).map((route) => ({
    id: route.id,
    feature: route.feature,
    version: route.version,
    status: route.status,
    primary_provider: normalizeProviderId(route.primary_provider),
    primary_model: route.primary_model,
    fallback_provider: route.fallback_provider ? normalizeProviderId(route.fallback_provider) : null,
    fallback_model: route.fallback_model || null,
    response_schema: route.response_schema || null,
    temperature: route.temperature,
    max_output_tokens: route.max_output_tokens,
    fallback_when: route.fallback_when,
    safety_policy: route.safety_policy,
    steps: Array.isArray(route.steps) && route.steps.length ? route.steps : null
  }));
  const activeRoutes = eligibleRoutes.filter(route => route.status === "active");
  const activeCounts = new Map();
  for (const route of activeRoutes) activeCounts.set(route.feature, (activeCounts.get(route.feature) || 0) + 1);
  // A candidate is not the active baseline. Multiple active records are an
  // ambiguity to resolve, never an invitation to silently pick the first row.
  state.modelRouterExperimentalRoutes = eligibleRoutes.filter(route => route.status === "experimental");
  state.modelRouterAmbiguousRoutes = activeRoutes.filter(route => activeCounts.get(route.feature) > 1);
  state.modelRouterRemoteRoutes = activeRoutes.filter(route => activeCounts.get(route.feature) === 1);
  for (const route of state.modelRouterRemoteRoutes) {
    const current = features.find((item) => item.id === adminFeatureId(route.feature));
    if (!current) continue;
    const draft = state.aiStudioDrafts[current.id];
    // Controls not exposed by the form still belong to the published contract.
    // Loading an active policy must not replace it with seed defaults just
    // because an operator edited a model before the GET finished.
    if (!draft || !Object.hasOwn(draft, "fallbackWhen")) current.fallbackWhen = Array.isArray(route.fallback_when) ? route.fallback_when : [];
    if (!draft || !Object.hasOwn(draft, "safetyPolicy")) current.safetyPolicy = route.safety_policy || {};
    if (hasModelRouteDraft(current)) continue;
    if (!providerCatalog[route.primary_provider]) continue;
    current.provider = route.primary_provider;
    current.model = route.primary_model || current.model;
    current.fallbackProvider = route.fallback_provider && providerCatalog[route.fallback_provider] ? route.fallback_provider : "";
    current.fallbackModel = route.fallback_model || "";
    current.temperature = Number(route.temperature ?? current.temperature ?? 0.7);
    current.maxOutputTokens = Number(route.max_output_tokens ?? current.maxOutputTokens ?? 2000);
    current.fallbackWhen = Array.isArray(route.fallback_when) ? route.fallback_when : [];
    current.safetyPolicy = route.safety_policy || {};
    if (current.id === "astrology") {
      const currentContractRoute = route.response_schema === "astrology_ai_insight_v1";
      if (currentContractRoute) current.version = route.version || current.version;
      current.status = route.status === "active" && currentContractRoute ? "Active" : "Draft";
    } else {
      current.schema = route.response_schema || current.schema;
      current.version = route.version || current.version;
      current.status = route.status === "active" ? "Active" : "Draft";
    }
  }
}

const aiStudioInitialFeatures = JSON.parse(JSON.stringify(features));
function clearDraftsOnScopeChange() {
  if (aiStudioDraftStorageKey() === aiStudioInitialDraftKey) return;
  state.aiStudioDrafts = {};
  state.modelRouterLoadedScope = null;
  state.modelRoutePendingPublication = null;
  state.pendingPublish = null;
  state.modelRouterRemoteRoutes = [];
  state.modelRouterHistory = [];
  state.modelRouterAdminResult = null;
  for (let i = 0; i < features.length; i++) {
    for (const key of Object.keys(features[i])) delete features[i][key];
    Object.assign(features[i], JSON.parse(JSON.stringify(aiStudioInitialFeatures[i])));
  }
}
hydrateAiStudioDrafts();
restoreAiStudioUiState();
window.NilazaClearSensitiveAdminState = () => {
  window.NilazaAiFeatures?.clear();
  window.NilazaAiEvals?.clear();
  window.NilazaModelProviders?.clear();
  window.NilazaContextConfig?.clear();
  window.NilazaFeedbackInbox?.clear();
  window.NilazaFeatureSwitches?.clear();
  clearDraftsOnScopeChange();
  clearTraceQaPayload();
  clearWorkflowObservation("Workspace or session changed; previous trace observation cleared.");
  state.traceExplorerRuns = [];
  state.traceExplorerDetail = null;
  if (state.detail === "traceExplorer") renderTraceExplorerDetail();
  else if (state.detail === "payload") renderPayloadDetail();
};

// Publish dialogs (Tính năng AI, Prompt & phiên bản) and the feedback page open "Chạy thử & chấm điểm" with a feature,
// a draft or a sanitized case already selected.
window.NilazaOpenEvals = (request) => {
  window.NilazaAiEvals?.open(request);
  state.detail = "test";
  persistAiStudioUiState();
  renderHeader();
  renderDetail();
};

// Earlier builds let an operator paste a token, anon key or endpoint URL. Those inputs are gone;
// drop anything they left in this browser so it is never reused.
try {
  for (const key of ["nilaza.admin.aiCouncil.jwt", "nilaza.admin.aiCouncil.anonKey", "nilaza.admin.modelRouter.jwt", "nilaza.admin.modelRouter.anonKey"]) sessionStorage.removeItem(key);
  for (const key of ["nilaza.admin.aiCouncil.endpoint", "nilaza.admin.modelRouter.endpoint"]) localStorage.removeItem(key);
} catch { /* storage may be unavailable */ }

function field(id, label, risk, enabled, sample, inject = "context_block") {
  return { id, label, risk, enabled, sample, inject };
}

function $(selector) {
  return document.querySelector(selector);
}

function feature() {
  return features.find((item) => item.id === state.featureId) || features[0];
}

function mobileGatewayPath(featureId) {
  if (featureId === "oracle_router") return "/ai/oracle-turn";
  if (featureId === "astrology") return "/ai/astrology-insight";
  return `/ai/${featureId.replaceAll("_", "-")}`;
}

function node() {
  return nodes.find((item) => item.id === state.nodeId) || nodes[0];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderFeatures() {
  $("#feature-list").innerHTML = features
    .map((item) => {
      const active = item.id === state.featureId ? "active" : "";
      return `
        <button class="nav-button ${active}" data-feature="${item.id}" aria-current="${active ? "true" : "false"}">
          <span class="nav-icon">${item.icon}</span>
          <span>${escapeHtml(item.name)}</span>
        </button>
      `;
    })
    .join("");
}

function renderHeader() {
  const current = feature();
  const hasLocalDraft = Boolean(state.aiStudioDrafts[current.id]);
  const hasRouteDraft = hasModelRouteDraft(current);
  const remoteRoute = state.modelRouterRemoteRoutes.find((route) => route.feature === modelRouteFeatureId(current.id));
  const ambiguous = hasAmbiguousModelRoutes(current);
  $("#feature-title").textContent = state.detail === "aiFeatures" ? "Tính năng AI" : state.detail === "contextConfig" ? "Dữ liệu gửi cho AI" : state.detail === "providers" ? "Nhà cung cấp & Model" : `Luồng xử lý · ${current.name}`;
  $("#sidebar-version").textContent = ambiguous ? "Nhiều phiên bản cùng chạy" : hasRouteDraft ? `Nháp chuỗi model · ${remoteRoute?.version || current.version}` : remoteRoute?.version || current.version;
  $("#sidebar-version-label").textContent = ambiguous ? "Xung đột chuỗi model" : hasRouteDraft ? "Nháp chuỗi model" : remoteRoute ? "Phiên bản trên máy chủ" : "Hợp đồng trong mã";
  $("#sidebar-version-status").textContent = ambiguous ? "Nhiều phiên bản cùng chạy · chặn phát hành; nháp trên trình duyệt được giữ" : hasRouteDraft
    ? "Nháp chuỗi model trên trình duyệt · máy chủ chưa đổi"
    : remoteRoute?.status === "active"
      ? `Đang chạy trên máy chủ · ${remoteRoute.response_schema || "chưa rõ định dạng"}`
      : hasLocalDraft ? "Nháp xem trước đã lưu · chưa tải chuỗi trên máy chủ" : "Chưa tải chuỗi đang chạy trên máy chủ";
  $("#safety-state").textContent = current.safety;
  $("#risk-state").textContent = current.risk;
  $("#model-state").textContent = ambiguous ? "Nhiều phiên bản cùng chạy" : `${current.provider} / ${current.model}`;
  $("#schema-state").textContent = current.schema.replaceAll("_", " ");
  $("#satisfaction-state").textContent = "Chưa kết nối";
  const roleChip = $("#admin-role-chip");
  if (roleChip) roleChip.textContent = window.NilazaAdminSession?.role || "Admin";
  const target = $("#environment-status");
  if (target) {
    target.textContent = `Đang ghi vào: ${window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG"}`;
  }
  const health = $("#configuration-health");
  const healthSummary = $("#configuration-health-summary");
  if (health && healthSummary) {
    const graphView = state.detail === "payload";
    health.open = !graphView;
    healthSummary.hidden = !graphView;
    healthSummary.textContent = `Tình trạng cấu hình · ${ambiguous ? "Xung đột phiên bản đang chạy" : remoteRoute ? `Bản đang chạy ${remoteRoute.version}` : "Chưa tải bản đang chạy"} · sơ đồ từ mã nguồn, chưa kiểm chứng khi chạy`;
  }
  updatePublishButton();
}

function renderModelRouteEditor(current) {
    const draft = hasModelRouteDraft(current);
    const effectiveRoute = state.modelRouterRemoteRoutes.find((route) => route.feature === modelRouteFeatureId(current.id));
    const temperature = Number(current.temperature ?? effectiveRoute?.temperature ?? 0.7);
    const maxOutputTokens = Number(current.maxOutputTokens ?? effectiveRoute?.max_output_tokens ?? 2000);
    const reasoning = routeReasoningSetting(current);
    return `<div class="model-route-form">
      <div class="inspector-section">
        <p class="helper">Thay đổi được giữ làm nháp trên trình duyệt cho tới khi phát hành lên máy chủ. App vẫn chỉ gọi máy chủ Nilaza. Muốn chuỗi 3–4 bước hoặc nhà cung cấp trực tiếp, dùng trang “Nhà cung cấp & chuỗi model”.</p>
      </div>
      <div class="inspector-section">
        <label class="helper" for="provider-select">Nhà cung cấp chính</label>
        <select id="provider-select">${providerOptions(current.provider)}</select>
        <label class="helper" for="model-select">Model chính · tìm theo tên hoặc mã</label>
        <input id="model-select" class="input" type="search" list="primary-model-options" autocomplete="off" value="${escapeHtml(current.model)}" placeholder="Tìm model…" />
        <datalist id="primary-model-options">${modelOptions(current.provider, current.model)}</datalist>
      </div>
      <div class="inspector-section">
        <label class="helper" for="fallback-provider-select">Nhà cung cấp dự phòng</label>
        <select id="fallback-provider-select">${providerOptions(current.fallbackProvider, true)}</select>
        <label class="helper" for="fallback-model-select">Model dự phòng · tìm theo tên hoặc mã</label>
        <input id="fallback-model-select" class="input" type="search" list="fallback-model-options" autocomplete="off" value="${escapeHtml(current.fallbackModel)}" placeholder="Tìm model…" ${current.fallbackProvider ? "" : "disabled"} />
        <datalist id="fallback-model-options">${modelOptions(current.fallbackProvider, current.fallbackModel)}</datalist>
      </div>
      <div class="inspector-section route-limits">
        <div><label class="helper" for="model-temperature">Nhiệt độ</label><input id="model-temperature" class="input" type="number" min="0" max="2" step="0.05" value="${escapeHtml(temperature)}" /></div>
        <div><label class="helper" for="max-output-tokens">Số token trả lời tối đa</label><input id="max-output-tokens" class="input" type="number" min="64" max="8192" step="1" value="${escapeHtml(maxOutputTokens)}" /></div>
        <div><label class="helper" for="reasoning-mode">Suy luận ẩn</label><select id="reasoning-mode"><option value="" ${reasoning ? "" : "selected"}>Mặc định của model</option>${reasoningModes.map(([mode, label]) => `<option value="${mode}" ${reasoning?.mode === mode ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div><label class="helper" for="reasoning-max-tokens">Giới hạn token suy luận (không bắt buộc)</label><input id="reasoning-max-tokens" class="input" type="number" min="64" max="8192" step="1" placeholder="Theo mức đã chọn" value="${escapeHtml(reasoning?.maxTokens ?? "")}" ${reasoning && reasoning.mode !== "off" ? "" : "disabled"} /></div>
        <p class="helper">Chỉ áp dụng với OpenRouter. Token suy luận tính vào số token trả lời tối đa; Tắt là nhanh và rẻ nhất.</p>
        ${reasoningBudgetProblem(current) ? `<div class="warning-card" role="alert"><strong>Không đủ chỗ cho câu trả lời</strong><p class="helper">${escapeHtml(reasoningBudgetProblem(current))}</p></div>` : ""}
        <div class="mini-grid">
          <div class="mini-card"><span>Nguồn cấu hình</span><strong>${draft ? "Nháp trên trình duyệt" : effectiveRoute?.status === "active" ? "Đang chạy trên máy chủ" : "Chưa tải"}</strong></div>
          <div class="mini-card"><span>Định dạng trả lời</span><strong>${escapeHtml(effectiveRoute?.response_schema || current.schema)}</strong></div>
          <div class="mini-card"><span>Chính</span><strong>${escapeHtml(current.provider)}</strong></div>
          <div class="mini-card"><span>Dự phòng</span><strong>${escapeHtml(current.fallbackProvider)}</strong></div>
        </div>
      </div>
    </div>`;
}

// Owner decision 2026-11-01: offer the providers the backend reports as configured (Kiểm tra kết nối);
// before that check only OpenRouter is offered. A route's current provider always stays visible.
function providerAvailable(provider) {
  const status = state.modelRouterAdminResult?.providers;
  if (!Array.isArray(status)) return provider === "openrouter";
  return status.some((item) => item.provider === provider && item.configured === true);
}

function providerOptions(selected, includeNone = false) {
  return (includeNone ? `<option value="" ${!selected ? "selected" : ""}>Không dùng dự phòng</option>` : "") + Object.keys(providerCatalog)
    .filter((provider) => provider !== "expo" && (providerAvailable(provider) || provider === selected))
    .map((provider) => `<option value="${escapeHtml(provider)}" ${provider === selected ? "selected" : ""}>${escapeHtml(providerCatalog[provider].label)}${providerAvailable(provider) ? "" : " · chưa có khóa ở backend"}</option>`)
    .join("");
}

function modelOptions(provider, selected) {
  const models = providerCatalog[provider]?.models || [];
  if (selected && !models.includes(selected)) models.push(selected);
  return models.map((model) => `<option value="${escapeHtml(model)}"></option>`).join("");
}

function enabledFields() {
  return feature().fields.filter((item) => item.enabled);
}

function contextPayload() {
  return enabledFields().reduce((payload, item) => {
    payload[item.id] = item.sample;
    return payload;
  }, {});
}

function selectedPersona() {
  return personaConfigs.find((persona) => persona.id === state.personaId) || personaConfigs[0];
}

function personaById(id) {
  return personaConfigs.find((persona) => persona.id === id) || personaConfigs[0];
}

function selectedCouncilTemplate() {
  return councilTemplates.find((template) => template.id === state.councilTemplateId) || councilTemplates[0];
}

function personaSlugFromId(personaId) {
  return personaId.replaceAll("_", "-");
}

function councilStatusKey(status) {
  return status.toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

function localizedText(value) {
  return { en: value, vi: value };
}

function normalizeCouncilFlow(flow) {
  return {
    steps: flow,
    moderator: flow.filter((step) => step.toLowerCase().includes("moderator") || step.toLowerCase().includes("chair")),
    guideTurns: flow.filter((step) => step.toLowerCase().includes("guide"))
  };
}

function normalizeCouncilTemplateForPublish(template) {
  return {
    id: template.id,
    status: councilStatusKey(template.status),
    name: localizedText(template.name),
    useCase: localizedText(template.useCase),
    situationTags: template.useCase
      .split(",")
      .map((tag) => tag.trim().toLowerCase().replaceAll(" ", "_"))
      .filter(Boolean),
    meetingMode: template.meetingMode,
    maxGuides: template.maxGuides,
    synthesisMode: template.synthesisMode,
    roster: template.roster.map((member) => ({
      personaId: member.personaId,
      personaSlug: personaSlugFromId(member.personaId),
      role: member.role,
      purpose: localizedText(member.purpose)
    })),
    flow: normalizeCouncilFlow(template.flow),
    outputContract: template.outputContract
  };
}

function assembledCouncilConfig() {
  const template = selectedCouncilTemplate();
  return {
    configVersion: feature().version,
    templateId: template.id,
    templateStatus: councilStatusKey(template.status),
    meetingMode: template.meetingMode,
    maxGuidesPerTurn: template.maxGuides,
    synthesisMode: template.synthesisMode,
    roster: template.roster.map((member) => {
      const persona = personaById(member.personaId);
      return {
        personaId: member.personaId,
        guideName: persona.name,
        role: member.role,
        tone: persona.tone,
        boundary: persona.boundary,
        purpose: member.purpose
      };
    }),
    turnPolicy: template.flow,
    outputContract: template.outputContract,
    privacy: {
      allowedContext: ["language", "tone", "userGoals", "userMessage", "selectedCouncilPersonas", "sanitizedCouncilHistory"],
      disabledByDefault: ["journalHistory", "birthProfile", "rawPrivateChat"]
    }
  };
}

function assembledCouncilPublishPayload() {
  return {
    version: state.councilPublishVersion.trim() || councilPublishVersionSeed(),
    status: "active",
    defaultTemplateId: state.councilTemplateId,
    maxGuidesPerTurn: Math.max(...councilTemplates.map((item) => item.maxGuides)),
    maxTranscriptTurns: 32,
    contextPolicy: {
      allowed: ["language", "tone", "userGoals", "userMessage", "selectedCouncilPersonas", "sanitizedCouncilHistory", "councilTemplate"],
      disabledByDefault: ["journalHistory", "birthProfile", "rawPrivateChat", "uploadedImage"]
    },
    turnPolicy: {
      maxGuidesPerTurn: Math.max(...councilTemplates.map((item) => item.maxGuides)),
      maxGuideReplyWords: 70,
      requireModeratorSummary: true,
      requireOneSafeNextStep: true
    },
    safetyBoundaries: {
      transparency: "Each guide is an AI guide inspired by a figure or mentor pattern, not the real person or official representative.",
      prohibitedAdvice: ["medical", "legal", "financial", "mental_health_diagnosis"],
      deterministicPredictions: "blocked",
      contextAccess: "sanitized_council_history_only"
    },
    runtimeContract: {
      mobileEntryPoint: "Chat > AI Council > situation template",
      edgeFunction: "ai-council",
      sessionColumns: ["session_kind", "council_config_version_id", "council_template_key", "transcript_summary"],
      messageColumns: ["council_round_id", "response_lens", "output_schema"]
    },
    runtimeConfig: {
      endpoint: "/ai/ai-council",
      schema: "ai_council_rounds_v2",
      promptVersionId: "ai_council_system",
      configSourcePriority: ["supabase_active_config", "mobile_payload_fallback"]
    },
    templates: councilTemplates.map(normalizeCouncilTemplateForPublish)
  };
}

function promptInjectionPlan() {
  return enabledFields().reduce((plan, item) => {
    const layer = item.inject || "context_block";
    if (!plan[layer]) plan[layer] = [];
    plan[layer].push({ variable: `{{${item.id}}}`, value: item.sample, risk: item.risk });
    return plan;
  }, {});
}

function assembledPersonaSystemPrompt() {
  const persona = selectedPersona();
  const plan = promptInjectionPlan();
  return [
    `[${promptLayers.safety}]`,
    "Follow Nilaza safety rules. Do not provide medical, legal, financial, or mental-health diagnosis/advice. Do not claim certain futures. Escalate crisis or self-harm risk to immediate local support.",
    "",
    `[${promptLayers.base}]`,
    "You are a Nilaza AI guide. Help the user reflect, clarify emotions, and ask better questions. Be warm, concise, emotionally intelligent, and non-deterministic.",
    "",
    `[${promptLayers.archetype}]`,
    `Archetype: ${persona.archetype}. Voice should be ${persona.tone}. Pace should be ${persona.pace}.`,
    "",
    `[${promptLayers.persona}]`,
    `Persona: ${persona.name}. Boundary: ${persona.boundary}`,
    `Strengths: ${persona.strengths.join(", ")}.`,
    `Avoid: ${persona.avoid.join(", ")}.`,
    `Signature moves: ${persona.signatureMoves.join("; ")}.`,
    "",
    `[${promptLayers.context_block}]`,
    ...Object.entries(plan).map(([layer, items]) => `${promptLayers[layer]}: ${items.map((item) => `${item.variable}=${item.value}`).join("; ")}`),
    "",
    `[${promptLayers.output}]`,
    `Use this response format: ${persona.responseFormat.join(" -> ")}.`
  ].join("\n");
}

function safetyRules(current) {
  if (current.id === "face_reading") {
    return ["Explicit consent required", "No identity inference", "No protected trait inference", "Deletion controls required"];
  }
  if (current.id === "astrology") {
    return ["Use calculated placements only", "State missing birth-time limits", "No fixed fate claims"];
  }
  if (current.id === "persona_chat") {
    return ["Inspired-by transparency", "No official representative claim", "Crisis escalation boundary"];
  }
  if (current.id === "ai_council") {
    return ["Inspired-by transparency for every guide", "Use sanitized council history only", "No fake real-person debate", "No professional advice"];
  }
  if (current.id === "daily_insight") {
    return ["Safe micro-action only", "No diagnosis or advice", "No certain prediction"];
  }
  return ["Reflection only", "No deterministic predictions", "No fear language", "No professional advice"];
}

function renderDetail() {
  const editor = document.activeElement;
  const editorId = editor?.matches?.("input, select, textarea") ? editor.id : "";
  try { return renderDetailPanel(); }
  finally {
    if (editorId && !editor.isConnected && $("#modal").hidden && document.activeElement === document.body) document.getElementById(editorId)?.focus();
  }
}

function renderDetailPanel() {
  clearDraftsOnScopeChange();
  monitorWorkflowScope();
  invalidateChangedOraclePreview();
  document.body.dataset.studioSection = studioRouteState().route;
  if (state.detail !== "traceExplorer") clearTraceQaPayload();
  syncStudioRoute();
  if (state.detail !== "feedback") window.NilazaFeedbackInbox?.clear();
  if (state.detail !== "switches") window.NilazaFeatureSwitches?.clear();
  if (state.detail !== "aiFeatures") window.NilazaAiFeatures?.clear();
  if (state.detail !== "providers") window.NilazaModelProviders?.clear();
  if (state.detail !== "contextConfig") window.NilazaContextConfig?.clear();
  if (!["versions", "prompt", "personaStudio"].includes(state.detail)) window.NilazaPromptVersions?.clear();
  if (state.detail !== "test") window.NilazaAiEvals?.clear();
  document.querySelectorAll("[data-panel]").forEach(button => button.classList.toggle("active", button.dataset.panel === (state.detail === "aiFeatures" ? "features" : state.detail === "test" || state.detail === "versions" || state.detail === "audit" || state.detail === "feedback" || state.detail === "switches" ? state.detail : "workflow")));
  updatePublishButton();
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.detail === state.detail);
    tab.setAttribute("aria-selected", tab.dataset.detail === state.detail ? "true" : "false");
    tab.setAttribute("tabindex", tab.dataset.detail === state.detail ? "0" : "-1");
  });
  const detailPanel = $("#detail-content");
  const activeTab = $(`.tab[data-detail="${state.detail}"]`);
  if (detailPanel && activeTab?.id) detailPanel.setAttribute("aria-labelledby", activeTab.id);
  else if (detailPanel && state.detail === "feedback") detailPanel.setAttribute("aria-labelledby", "feedback-inbox-title");
  else if (detailPanel && state.detail === "switches") detailPanel.setAttribute("aria-labelledby", "feature-switches-title");
  else if (detailPanel && state.detail === "aiFeatures") detailPanel.setAttribute("aria-labelledby", "ai-features-title");
  else if (detailPanel && state.detail === "test" && window.NilazaAiEvals) detailPanel.setAttribute("aria-labelledby", "eval-title");
  else if (detailPanel && state.detail === "providers") detailPanel.setAttribute("aria-labelledby", "model-providers-title");
  else if (detailPanel && state.detail === "contextConfig") detailPanel.setAttribute("aria-labelledby", "context-config-title");
  if (state.detail === "aiFeatures") $("#feature-title").textContent = "Tính năng AI";
  if (state.detail === "providers") $("#feature-title").textContent = "Nhà cung cấp & Model";
  if (state.detail === "contextConfig") $("#feature-title").textContent = "Dữ liệu gửi cho AI";

  // Owner request 14/11: data blocks each AI feature sends to the model (apps/admin/context-config.js).
  if (state.detail === "contextConfig") {
    if (window.NilazaContextConfig) window.NilazaContextConfig.mount(detailPanel);
    else detailPanel.innerHTML = renderNotAppliedNote("Dữ liệu gửi cho AI", "Không tải được mô-đun Dữ liệu gửi cho AI. Tải lại trang.");
    return;
  }

  // A7: provider table and per-feature model chains (apps/admin/model-providers.js).
  if (state.detail === "providers") {
    if (window.NilazaModelProviders) window.NilazaModelProviders.mount(detailPanel);
    else detailPanel.innerHTML = renderNotAppliedNote("Nhà cung cấp & Model", "Không tải được mô-đun Nhà cung cấp & Model. Tải lại trang.");
    return;
  }

  if (state.detail === "aiFeatures") {
    if (window.NilazaAiFeatures) window.NilazaAiFeatures.mount(detailPanel);
    else detailPanel.innerHTML = renderNotAppliedNote("Tính năng AI", "Không tải được mô-đun Tính năng AI. Tải lại trang.");
    return;
  }

  if (state.detail === "prompt") {
    renderPromptDetail();
    return;
  }
  if (state.detail === "dataMindmap") {
    renderDataMindmapDetail();
    return;
  }
  if (state.detail === "personaStudio") {
    renderPersonaStudioDetail();
    return;
  }
  if (state.detail === "councilBuilder") {
    renderCouncilBuilderDetail();
    return;
  }
  if (state.detail === "optimization") {
    renderOptimizationDetail();
    return;
  }
  if (state.detail === "modelRouter") {
    renderModelRouterDetail();
    return;
  }
  if (state.detail === "switches") {
    window.NilazaFeatureSwitches?.mount(detailPanel);
    return;
  }
  if (state.detail === "feedback") {
    window.NilazaFeedbackInbox?.mount(detailPanel, (traceId, featureId) => {
      state.featureId = featureId === "astrology_insight" ? "astrology" : "tarot_reading";
      state.traceExplorerQuery = traceId;
      state.detail = "traceExplorer";
      persistAiStudioUiState(); renderHeader(); renderDetail();
    });
    return;
  }
  if (state.detail === "traceExplorer") {
    renderTraceExplorerDetail();
    return;
  }
  if (state.detail === "test") {
    renderTestDetail();
    return;
  }
  if (state.detail === "versions") {
    renderVersionsDetail();
    return;
  }
  if (state.detail === "audit") {
    renderAuditDetail();
    return;
  }
  renderPayloadDetail();
}

function renderOptimizationDetail() {
  const current = feature();
  $("#detail-content").innerHTML = `
    <div class="detail-layout single">
      <div class="warning-card">
        <p class="eyebrow">Prompt evaluation · not connected</p>
        <h3>${escapeHtml(current.name)} has no measured evaluation set yet</h3>
        <p>This workspace has no reviewer scores, user satisfaction events, or controlled prompt comparison connected. It cannot rank or promote prompt variants. Use Test output for a local preview and Trace Explorer for measured backend requests.</p>
        <p>Next operational step: add an approved synthetic evaluation set, record reviewer ratings separately from user content, then compare immutable prompt versions against the same cases.</p>
      </div>
    </div>
  `;
}

function councilAdminHeaders() {
  return { "Content-Type": "application/json" };
}

function isCouncilAdminReady() {
  return Boolean(state.councilAdminEndpoint.trim() && hasSessionAdminTransport());
}

// The guarded backend owns ai_council_config_versions and
// ai_council_template_versions; this seed editor is not an authoritative draft.
const councilPublishBlockedReason = "Council publishing is disabled: loaded backend settings are not applied to this preview editor, and atomic publication with version conflict checks is not verified.";

function canPublishModelRoute(current = feature()) {
  return !hasAmbiguousModelRoutes(current) && !activeModelRouteChain(current) && !["notifications", "face_reading"].includes(current.id) && current.status !== "Disabled";
}

// A7: when the running route has an explicit step chain, this 1 primary + 1 fallback editor would publish without the
// chain and silently drop steps 3-4 and the per-step settings. The chain is edited on "Nhà cung cấp & Model" instead.
function activeModelRouteChain(current = feature()) {
  const route = state.modelRouterRemoteRoutes.find(item => item.feature === modelRouteFeatureId(current.id));
  return Array.isArray(route?.steps) && route.steps.length ? route.steps : null;
}

// Owner decision 2026-11-02: hidden reasoning is set per route and stored in safetyPolicy.reasoning
// {mode, maxTokens}. Reasoning tokens count toward the output limit (OpenRouter takes about 10/20/50/80%
// of it for minimal/low/medium/high), so publishing is blocked when too little is left for the answer.
const reasoningModes = [["off", "Tắt"], ["minimal", "Rất ít"], ["low", "Ít"], ["medium", "Vừa"], ["high", "Nhiều"]];
const reasoningEffortShare = { minimal: 0.1, low: 0.2, medium: 0.5, high: 0.8 };
const minimumAnswerTokens = 512;

function routeReasoningSetting(current = feature()) {
  const value = current.safetyPolicy?.reasoning;
  return value && reasoningModes.some(([mode]) => mode === value.mode) ? value : null;
}

function reasoningBudgetProblem(current = feature()) {
  const setting = routeReasoningSetting(current);
  if (!setting || setting.mode === "off") return "";
  const maxOutput = Number(current.maxOutputTokens ?? 2000);
  const budget = Number(setting.maxTokens) || Math.round(maxOutput * reasoningEffortShare[setting.mode]);
  const left = maxOutput - budget;
  return left < minimumAnswerTokens
    ? `Suy luận ẩn có thể dùng khoảng ${budget} trên ${maxOutput} token trả lời, chỉ còn ${left} cho câu trả lời. Tăng số token trả lời tối đa hoặc giảm mức/giới hạn suy luận để còn ít nhất ${minimumAnswerTokens}.`
    : "";
}

function hasAmbiguousModelRoutes(current = feature()) {
  return state.modelRouterAmbiguousRoutes.some(route => route.feature === modelRouteFeatureId(current.id));
}

function modelRouteUnavailableReason(current = feature()) {
  if (hasAmbiguousModelRoutes(current)) return "Tính năng này có nhiều bản cùng đang chạy trên máy chủ. Admin không tự chọn bản nào và chặn phát hành. Hãy xử lý các bản đó trên máy chủ rồi Kiểm tra kết nối lại. Nháp trên trình duyệt vẫn được giữ.";
  const chain = activeModelRouteChain(current);
  if (chain) return `Tính năng này đang chạy chuỗi ${chain.length} bước. Sửa và phát hành ở trang “Nhà cung cấp & chuỗi model” để không làm mất các bước.`;
  return current.id === "notifications"
    ? "Thông báo dùng Expo Push và hộp thư trong app. Không gọi AI nên không có model ở đây."
    : "Đọc khuôn mặt đang hoãn và tắt. Chưa chọn hay phát hành model cho tới khi luồng đồng ý, xóa dữ liệu và an toàn được duyệt.";
}

function publishActionForSurface() {
  // The AI features page has its own Lưu nháp / Xem lại & phát hành per feature card.
  if (state.detail === "aiFeatures" || state.detail === "contextConfig" || state.detail === "providers") return "none";
  if (state.detail === "councilBuilder" && feature().id === "ai_council") return "councilBlocked";
  if (state.detail === "modelRouter") return canPublishModelRoute() ? "modelRoute" : "modelBlocked";
  if (state.detail === "prompt" && feature().id === "astrology") return "astrologyPrompt";
  return "browserDraft";
}

function modelRouteScope() {
  return JSON.stringify([window.NilazaAdminSession?.userId || "", workflowTransportTarget, window.ENV?.SUPABASE_URL || "", state.modelRouterAdminEndpoint.trim()]);
}
function stableRouteJson(value) {
  return JSON.stringify(value && !Array.isArray(value) && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(stableRouteJson(value[key]))])) : value);
}

function modelRoutePublishPayload(current, version, publishRequestId) {
  const primaryProvider = normalizeProviderId(current.provider);
  const fallbackProvider = normalizeProviderId(current.fallbackProvider);
  return {
    contractVersion: "model_route_publish_v2", publishRequestId,
    expectedActiveId: state.modelRouterRemoteRoutes.find(route => route.feature === modelRouteFeatureId(current.id))?.id || null,
    feature: modelRouteFeatureId(current.id), version, status: "active",
    primary: { provider: primaryProvider, model: current.model },
    fallback: ["openai", "openrouter", "gemini", "anthropic"].includes(fallbackProvider) && current.fallbackModel
      ? { provider: fallbackProvider, model: current.fallbackModel } : null,
    temperature: Number(current.temperature ?? 0.7),
    maxTokens: Number(current.maxOutputTokens ?? 2000),
    responseSchema: current.schema || "chat_reply_v2",
    fallbackWhen: current.fallbackWhen ?? ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: current.safetyPolicy ?? {}
  };
}

function currentPublishPayload(action, version, publishRequestId) {
  if (action === "modelRoute") return modelRoutePublishPayload(feature(), version, publishRequestId);
  if (action === "astrologyPrompt") return {
    version,
    expectedViVersion: state.astrologyPromptActive?.vi?.version || null,
    expectedEnVersion: state.astrologyPromptActive?.en?.version || null,
    vi: String(state.astrologyPromptDraft?.vi || ""),
    en: String(state.astrologyPromptDraft?.en || "")
  };
  return { prompt: feature().prompt, fields: feature().fields.map(item => ({ id: item.id, enabled: item.enabled, inject: item.inject })) };
}

function freezePublishReview(value) {
  for (const child of Object.values(value)) if (child && typeof child === "object") freezePublishReview(child);
  return Object.freeze(value);
}

function createPublishReview(action) {
  if (action === "modelRoute" && state.modelRoutePendingPublication && isPublishReviewCurrent(state.modelRoutePendingPublication)) return state.modelRoutePendingPublication;
  const versionBase = String(feature().version || feature().id).replace(/-admin-\d+$/, "");
  const version = action === "modelRoute" ? `${versionBase}-admin-${Date.now()}`
    : `astrology-owner-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
  return freezePublishReview({
    action, featureId: state.featureId, detail: state.detail,
    backendTarget: String(window.ENV?.SUPABASE_URL || ""), accountId: window.NilazaAdminSession?.userId || "",
    baseVersion: feature().version,
    endpoint: action === "modelRoute" ? state.modelRouterAdminEndpoint.trim()
      : action === "astrologyPrompt" ? state.astrologyPromptAdminEndpoint : "",
    payload: currentPublishPayload(action, version, action === "modelRoute" ? crypto.randomUUID() : undefined)
  });
}

function isPublishReviewCurrent(review) {
  if (!review || review.featureId !== state.featureId || review.detail !== state.detail || review.action !== publishActionForSurface()
    || review.backendTarget !== String(window.ENV?.SUPABASE_URL || "") || review.accountId !== (window.NilazaAdminSession?.userId || "") || review.baseVersion !== feature().version) return false;
  const endpoint = review.action === "modelRoute" ? state.modelRouterAdminEndpoint.trim()
    : review.action === "astrologyPrompt" ? state.astrologyPromptAdminEndpoint : "";
  return review.endpoint === endpoint
    && JSON.stringify(review.payload) === JSON.stringify(currentPublishPayload(review.action, review.payload.version, review.payload.publishRequestId));
}

function rejectChangedPublishReview() {
  closePublishModal();
  $("#draft-status").textContent = "Selection changed or configuration changed; review this configuration again before publishing";
}

function reviewedPublishRequest(review, headers) {
  return {
    method: "POST", headers,
    // The session transport awaits its own capability refresh. It reads this
    // body when creating fetch options, so recheck at that final send boundary.
    get body() {
      if (!isPublishReviewCurrent(review)) throw Error("Configuration changed after review; no publish request was sent");
      return JSON.stringify(review.payload);
    }
  };
}

const publishButtonLabels = Object.freeze({
  publish: "Xem lại & phát hành",
  browserDraft: "Lưu nháp trên trình duyệt này — chưa lên máy chủ"
});

function publishLockedReason(action = publishActionForSurface()) {
  if (action === "councilBlocked") return `Chưa phát hành được Hội đồng từ Admin. ${councilPublishBlockedReason}`;
  if (action === "modelBlocked") return `Chưa phát hành được model cho tính năng này. ${modelRouteUnavailableReason()}`;
  return "";
}

// Changes that have not reached the server: unpublished model route drafts and an Astrology prompt
// draft that differs from the active pair. Reported to the shell and to the leave-page warning.
function unsavedAiStudioChangeCount() {
  let count = features.filter(item => hasModelRouteDraft(item)).length;
  const draft = state.astrologyPromptDraft || {};
  const active = state.astrologyPromptActive || {};
  const changed = locale => typeof draft[locale] === "string"
    && (active[locale] ? draft[locale] !== (active[locale].prompt_text || "") : draft[locale].trim() !== "");
  if (changed("vi") || changed("en")) count += 1;
  return count;
}

function reportAiStudioUnsaved() {
  const count = unsavedAiStudioChangeCount();
  window.NilazaUnsaved?.set("ai-studio", count);
  const indicator = $("#unsaved-count");
  if (indicator) {
    indicator.textContent = count ? `${count} thay đổi chưa lưu` : "";
    indicator.hidden = !count;
  }
  return count;
}

function updatePublishButton() {
  const button = $("#publish-button");
  reportAiStudioUnsaved();
  if (!button) return;
  const action = publishActionForSurface();
  if (action === "none") {
    button.hidden = true;
    button.disabled = true;
    button.dataset.publishMeaning = "none";
    const none = $("#publish-locked-reason");
    if (none) { none.hidden = true; none.textContent = ""; }
    return;
  }
  // Owner decision 15/11: ai.manage (publishing AI settings) is owner only. A session that loaded its capability list and
  // lacks it sees no Phát hành button here; the click path and the server refuse as well.
  const ownerOnly = (action === "modelRoute" || action === "astrologyPrompt")
    && Array.isArray(window.NilazaAdminSession?.capabilities) && !window.NilazaAdminSession.capabilities.includes("ai.manage");
  const locked = ownerOnly || action === "councilBlocked" || action === "modelBlocked";
  button.textContent = action === "modelRoute" || action === "astrologyPrompt" ? publishButtonLabels.publish : publishButtonLabels.browserDraft;
  button.hidden = locked;
  button.disabled = locked;
  button.title = "";
  button.dataset.publishMeaning = locked ? "locked" : action === "browserDraft" ? "browser-draft" : "publish";
  const reason = $("#publish-locked-reason");
  if (reason) {
    reason.hidden = !locked;
    reason.textContent = locked ? (ownerOnly ? "Chỉ Owner phát hành cài đặt AI. Bạn vẫn xem và soạn nháp ở các mục khác." : publishLockedReason(action)) : "";
  }
}

function updateCouncilAdminButtonState() {
  const ready = isCouncilAdminReady() && !state.councilAdminBusy;
  const loadButton = $("#council-load-config");
  const statusPill = $(".council-admin-connector .pill");
  if (loadButton) loadButton.disabled = !ready;
  if (statusPill) statusPill.textContent = state.councilAdminStatus;
}

function summarizeCouncilAdminResult(result) {
  if (!result) return "No remote response yet.";
  if (typeof result === "string") return result;
  return JSON.stringify(result, null, 2);
}

async function loadCouncilAdminConfig() {
  if (!isCouncilAdminReady()) {
    state.councilAdminStatus = "Phiên đăng nhập Admin hoặc cấu hình máy chủ chưa sẵn sàng / Admin session or function endpoint is unavailable";
    renderDetail();
    return;
  }
  state.councilAdminBusy = true;
  state.councilAdminStatus = "Loading active council config...";
  renderDetail();
  try {
    const response = await adminRequest(state.councilAdminEndpoint.trim(), {
      method: "GET",
      headers: councilAdminHeaders()
    }, "ai.read");
    const body = await response.json().catch(() => ({ error: "Response was not valid JSON" }));
    state.councilAdminResult = body;
    state.councilAdminStatus = response.ok
      ? `Loaded ${body.configCount ?? 0} council config version(s) for read-only review; preview editor is unchanged`
      : `Load failed: ${body.error || response.statusText}`;
  } catch (error) {
    state.councilAdminResult = { error: error.message };
    state.councilAdminStatus = `Load failed: ${error.message}`;
  } finally {
    state.councilAdminBusy = false;
    renderDetail();
  }
}

function modelRouterAdminHeaders() {
  return { "Content-Type": "application/json" };
}

function isModelRouterAdminReady() {
  return Boolean(state.modelRouterAdminEndpoint.trim() && hasSessionAdminTransport());
}

function updateModelRouterAdminButtonState() {
  const ready = isModelRouterAdminReady() && !state.modelRouterAdminBusy;
  const publishButton = $("#model-router-publish-config");
  const checkButton = $("#model-router-check-connection");
  const statusPill = $(".model-router-admin-connector .pill");
  if (publishButton) publishButton.disabled = !ready;
  if (checkButton) checkButton.disabled = !ready;
  if (statusPill) statusPill.textContent = state.modelRouterAdminStatus;
}

async function checkModelRouterConnection() {
  if (state.modelRouterAdminBusy) return;
  if (!isModelRouterAdminReady()) return;
  state.modelRouterAdminBusy = true;
  state.modelRouterLoadedScope = null;
  state.modelRouterAdminResult = null;
  state.modelRouterAdminStatus = "Đang kiểm tra…";
  renderDetail();
  const endpoint = state.modelRouterAdminEndpoint.trim();
  const scope = modelRouteScope();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await adminRequest(endpoint, { method: "GET", headers: modelRouterAdminHeaders(), signal: controller.signal }, "ai.read");
    const body = await response.json();
    if (!response.ok || body.status !== "connected" || !Array.isArray(body.providers) || !Array.isArray(body.routes)) throw Error("check_failed");
    if (scope !== modelRouteScope()) return;
    // Explicit allowlist: never render an arbitrary backend response as credential diagnostics.
    state.modelRouterAdminResult = {
      projectHost: body.projectHost, checkedAt: body.checkedAt, contractVersion: body.contractVersion,
      providers: body.providers.map(item => ({ provider: item.provider, secretName: item.secretName, configured: item.configured === true, verification: "not_tested" })),
      routes: body.routes.map(item => ({ id: item.id, feature: item.feature, version: item.version, status: item.status, primary_provider: item.primary_provider, primary_model: item.primary_model, fallback_provider: item.fallback_provider, fallback_model: item.fallback_model, response_schema: item.response_schema, temperature: item.temperature, max_output_tokens: item.max_output_tokens, fallback_when: item.fallback_when, safety_policy: item.safety_policy, steps: Array.isArray(item.steps) && item.steps.length ? item.steps : null })),
      history: (Array.isArray(body.history) ? body.history : []).map(item => ({ id: item.id, feature: item.feature, version: item.version, status: item.status, primary_provider: item.primary_provider, primary_model: item.primary_model, fallback_provider: item.fallback_provider, fallback_model: item.fallback_model, response_schema: item.response_schema, temperature: item.temperature, max_output_tokens: item.max_output_tokens, fallback_when: item.fallback_when, safety_policy: item.safety_policy, published_at: item.published_at, created_at: item.created_at }))
    };
    state.modelRouterHistory = state.modelRouterAdminResult.history;
    applyRemoteModelRoutes(body.routes);
    if (body.contractVersion === "model_route_publish_v2" && body.routes.every(route => route.id)) state.modelRouterLoadedScope = scope;
    renderHeader();
    state.modelRouterAdminStatus = "Đã kết nối máy chủ";
  } catch {
    state.modelRouterAdminStatus = "Không kiểm tra được. Kiểm tra phiên đăng nhập, quyền hoặc kết nối rồi thử lại.";
  } finally {
    clearTimeout(timeout);
    state.modelRouterAdminBusy = false;
    renderDetail();
  }
}

async function publishModelRouterConfig(review) {
  if (state.modelRouterAdminBusy) return;
  if (state.detail !== "modelRouter" || !canPublishModelRoute()) {
    $("#draft-status").textContent = canPublishModelRoute() ? "Mở mục Model chính & dự phòng và xem lại trước khi phát hành" : modelRouteUnavailableReason();
    return;
  }
  if (review?.action !== "modelRoute" || !isPublishReviewCurrent(review)) { rejectChangedPublishReview(); return; }
  if (reasoningBudgetProblem()) { closePublishModal(); $("#draft-status").textContent = reasoningBudgetProblem(); return; }
  if (!await window.NilazaRequireCapability?.("ai.manage")) { $("#draft-status").textContent = "Không có quyền phát hành (cần ai.manage)"; return; }
  if (!isPublishReviewCurrent(review)) { rejectChangedPublishReview(); return; }
  if (state.modelRouterLoadedScope !== modelRouteScope()) {
    state.modelRouterAdminStatus = "Bấm Kiểm tra kết nối để tải bản đang chạy trước khi phát hành. Nháp trên trình duyệt vẫn được giữ.";
    renderDetail();
    return;
  }
  if (!isModelRouterAdminReady()) {
    state.modelRouterAdminStatus = "Phiên đăng nhập Admin hoặc cấu hình máy chủ chưa sẵn sàng";
    renderDetail();
    return;
  }
  state.modelRouterAdminBusy = true;
  state.modelRouterAdminStatus = "Đang phát hành lên máy chủ…";
  renderDetail();
  
  const current = feature();
  const payload = review.payload;
  const primaryProvider = payload.primary.provider;
  if (!providerCatalog[primaryProvider] || !["openai", "openrouter", "gemini", "anthropic"].includes(primaryProvider)) {
    state.modelRouterAdminStatus = "Máy chủ chưa hỗ trợ nhà cung cấp chính này";
    state.modelRouterAdminBusy = false;
    renderDetail();
    return;
  }
  try {
    state.modelRoutePendingPublication = review;
    const scope = modelRouteScope();
    const response = await adminRequest(review.endpoint, reviewedPublishRequest(review, modelRouterAdminHeaders()), "ai.manage");
    const body = await response.json().catch(() => ({ error: "Response was not valid JSON" }));
    if (scope !== modelRouteScope()) return;
    state.modelRouterAdminResult = body;
    if (response.ok) {
      const config = body.config;
      if (body.contractVersion !== "model_route_publish_v2" || body.publishRequestId !== payload.publishRequestId
        || !config || config.id !== body.configId || config.version !== payload.version || config.feature !== payload.feature
        || config.primary_provider !== payload.primary.provider || config.primary_model !== payload.primary.model
        || (config.fallback_provider ?? null) !== (payload.fallback?.provider ?? null) || (config.fallback_model ?? null) !== (payload.fallback?.model ?? null)
        || Number(config.temperature) !== payload.temperature || config.max_output_tokens !== payload.maxTokens
        || config.response_schema !== payload.responseSchema || JSON.stringify(config.fallback_when) !== JSON.stringify(payload.fallbackWhen)
        || stableRouteJson(config.safety_policy) !== stableRouteJson(payload.safetyPolicy)) throw Error("Biên nhận phát hành không khớp; nháp trên trình duyệt được giữ. Tải lại để kiểm tra bản trên máy chủ.");
      const unchanged = isPublishReviewCurrent(review);
      if (unchanged && config.status === "active") {
        current.version = body.version || payload.version;
        current.provider = primaryProvider;
        current.model = payload.primary.model;
        current.fallbackProvider = payload.fallback?.provider || "";
        current.fallbackModel = payload.fallback?.model || "";
        current.temperature = payload.temperature;
        current.maxOutputTokens = payload.maxTokens;
        current.status = "Active";
        clearPublishedModelRouteDraft(current);
      }
      state.modelRoutePendingPublication = null;
      state.modelRouterAdminStatus = `Đã phát hành ${body.version} (${config.status}); biên nhận khớp. Chưa kiểm chứng khi chạy thật.`;
      $("#draft-status").textContent = unchanged && config.status === "active" ? "Đã phát hành model; biên nhận khớp; chưa kiểm chứng khi chạy" : "Đã lưu bản đã xem lại; các sửa mới hơn trên trình duyệt được giữ";
      state.modelRouterLoadedScope = null;
    } else {
      if (response.status === 409) {
        state.modelRoutePendingPublication = null;
        state.modelRouterLoadedScope = null;
      }
      state.modelRouterAdminStatus = `Chưa phát hành được: ${response.status === 409 ? "bản đang chạy vừa thay đổi, tải lại rồi xem lại" : response.status === 403 ? "cần quyền ai.manage" : "máy chủ từ chối"}`;
    }
  } catch (error) {
    state.modelRouterAdminResult = { error: error.message };
    state.modelRouterAdminStatus = `Chưa phát hành được: ${error.message}`;
  } finally {
    state.modelRouterAdminBusy = false;
    renderDetail();
  }
  if (state.modelRouterAdminStatus.startsWith("Đã phát hành ")) await checkModelRouterConnection();
}

async function publishCouncilAdminConfig() {
  // Fail closed even when called directly or when a disabled control is bypassed.
  // Loading a response is not the same as hydrating/versioning this seed editor.
  state.councilAdminStatus = councilPublishBlockedReason;
  $("#draft-status").textContent = councilPublishBlockedReason;
  renderDetail();
}

function renderPayloadDetail() {
  const current = feature();
  $("#detail-content").innerHTML = `
    ${renderFeatureWorkflowGraph()}
  `;
}

function workflowCurrentScope(traceId = state.traceExplorerSelectedId) {
  let target = "";
  try { target = new URL(window.ENV?.SUPABASE_URL || "").origin; } catch { /* unknown target cannot carry observations */ }
  if (target !== workflowTransportTarget) target = "";
  return { accountId: window.NilazaAdminSession?.userId || "", target, traceId: traceId || "", featureId: state.featureId };
}

function clearWorkflowObservation(message = "Trace observation cleared.") {
  state.traceReadEpoch += 1;
  state.traceDetailScope = null;
  state.traceDetailLoading = false;
  state.traceExplorerBusy = false;
  state.workflowEvidence = null;
  state.workflowEvidenceScope = null;
  state.workflowEvidenceStatus = message;
  state.workflowTraceReaderState = "not-loaded";
}

function monitorWorkflowScope() {
  const scope = workflowCurrentScope();
  const baseKey = JSON.stringify([scope.accountId, scope.target, scope.featureId, window.NilazaAdminSession?.capabilities?.includes("ai.read") === true]);
  if (state.workflowBaseScopeKey && state.workflowBaseScopeKey !== baseKey) {
    const previousFeatureId = JSON.parse(state.workflowBaseScopeKey)[2];
    clearWorkflowObservation("Feature, account or backend target changed; previous trace observation cleared.");
    state.traceExplorerRuns = [];
    state.traceExplorerDetail = null;
    if (previousFeatureId !== scope.featureId) state.workflowSelection = null;
  }
  state.workflowBaseScopeKey = baseKey;
  const readKey = JSON.stringify([baseKey, state.detail]);
  if (state.traceReadContextKey !== readKey) {
    state.traceReadEpoch += 1;
    state.traceDetailScope = null;
    state.traceDetailLoading = false;
    state.traceExplorerBusy = false;
  }
  state.traceReadContextKey = readKey;
  if (!scope.accountId || !scope.target || !window.NilazaAdminSession?.capabilities?.includes("ai.read")) {
    state.workflowEvidence = null;
    state.workflowEvidenceScope = null;
  }
}

function workflowReadStillCurrent(scope, epoch, hash) {
  const current = workflowCurrentScope(scope.traceId);
  return epoch === state.traceReadEpoch && state.detail === "traceExplorer" && location.hash === hash
    && current.accountId === scope.accountId && current.target === scope.target && current.featureId === scope.featureId
    && window.NilazaAdminSession?.capabilities?.includes("ai.read") === true
    && !window.frameElement?.hidden;
}

function renderFeatureWorkflowGraph() {
  monitorWorkflowScope();
  const catalog = window.NilazaWorkflowCatalog;
  const view = window.NilazaWorkflowView;
  const graph = catalog?.getGraph?.(state.featureId);
  if (!graph || !view?.render || !view?.renderInspector) return `<section class="warning-card" role="status"><h3>Workflow graph unavailable</h3><p>The reviewed catalog and graph renderer must be included in this Admin build. No substitute execution graph is generated. Existing sample controls remain below.</p></section>`;
  const scope = workflowCurrentScope();
  if (state.workflowEvidenceScope && JSON.stringify(state.workflowEvidenceScope) !== JSON.stringify(scope)) {
    clearWorkflowObservation("Selected trace scope no longer matches. Apply a matching redacted trace again.");
  }
  if (!state.workflowSelection || !(state.workflowSelection.kind === "node" ? graph.nodes : graph.edges).some(item => item.id === state.workflowSelection.id)) state.workflowSelection = graph.nodes[0] ? { kind: "node", id: graph.nodes[0].id } : null;
  const options = { locale: state.oraclePreviewLocale, selection: state.workflowSelection, zoom: state.workflowGraphZoom, mode: state.workflowGraphMode, evidence: state.workflowEvidence };
  const route = state.modelRouterRemoteRoutes.find(item => item.feature === modelRouteFeatureId(state.featureId));
  return `<div class="workflow-graph-layout">${view.render(graph, options)}${view.renderInspector(graph, options)}</div><section class="workflow-evidence-strip" aria-label="Source and recorded trace"><div><strong>Source and recorded trace are separate</strong><p role="status">${escapeHtml(state.workflowEvidenceStatus)}</p><p>${state.workflowEvidence?.traceId ? `Applied trace: ${escapeHtml(state.workflowEvidence.traceId)}. Writer origin unverified; clients can submit trace records. ` : ""}Backend target: ${escapeHtml(scope.target || "unknown")}. ${scope.accountId ? "Account scope available." : "Account identity unavailable; observations cannot be applied."} Trace reader: ${escapeHtml(state.workflowTraceReaderState)}. Edges show source mappings, never an inferred executed path.</p><p>${route ? `Backend active route record: ${escapeHtml(route.version)} · ${escapeHtml(route.primary_provider)} / ${escapeHtml(route.primary_model)}. Record reads do not prove provider execution.` : "No unique active backend route record loaded."}</p></div><button type="button" class="button ghost" id="workflow-open-traces">Open Trace Explorer</button></section>`;
}

function refreshWorkflowGraph(focusSelector, resetScroll = false) {
  const previousViewport = $("#workflow-graph-viewport");
  if (previousViewport) state.workflowGraphScroll = { left: previousViewport.scrollLeft, top: previousViewport.scrollTop };
  if (resetScroll) state.workflowGraphScroll = { left: 0, top: 0 };
  renderPayloadDetail();
  const viewport = $("#workflow-graph-viewport");
  if (viewport) { viewport.scrollLeft = state.workflowGraphScroll.left; viewport.scrollTop = state.workflowGraphScroll.top; }
  if (focusSelector) $(focusSelector)?.focus?.({ preventScroll: true });
}

async function applyWorkflowTrace() {
  const catalog = window.NilazaWorkflowCatalog;
  const observed = state.traceDetailScope;
  const detail = state.traceExplorerDetail;
  const epoch = state.traceReadEpoch;
  if (!observed || !detail || !catalog?.projectTraceEvidence) { state.workflowEvidenceStatus = "Load a matching redacted trace detail first."; return; }
  if (!await window.NilazaRequireCapability?.("ai.read")) { clearWorkflowObservation("Không có quyền; chưa áp lượt nào vào sơ đồ."); renderDetail(); return; }
  const current = workflowCurrentScope();
  if (epoch !== state.traceReadEpoch || state.detail !== "traceExplorer" || JSON.stringify(observed) !== JSON.stringify(current) || !window.NilazaAdminSession?.capabilities?.includes("ai.read") || window.frameElement?.hidden) {
    clearWorkflowObservation("Trace scope changed while checking access; no observation applied."); renderDetail(); return;
  }
  state.workflowEvidence = catalog.projectTraceEvidence(state.featureId, detail, { observed, current });
  state.workflowEvidenceScope = current;
  const note = state.workflowEvidence.note;
  state.workflowEvidenceStatus = (typeof note === "string" ? note : note?.[state.oraclePreviewLocale] || note?.en) || "Redacted trace projection applied; unmatched nodes remain unobserved.";
  state.detail = "payload";
  persistAiStudioUiState();
  renderAll();
}

function renderPersonaStudioDetail() {
  const current = feature();
  const persona = selectedPersona();
  if (current.id !== "persona_chat") {
    $("#detail-content").innerHTML = `
      <div class="detail-layout single">
        <div class="warning-card">
          <strong>Persona Prompt Studio is for Persona Chat</strong>
          <p>Select Persona Chat in the left sidebar to configure archetypes, persona-specific voice, context policy, and response format for each guide.</p>
          <button class="button ghost" data-feature="persona_chat">Open Persona Chat</button>
        </div>
      </div>
    `;
    return;
  }

  $("#detail-content").innerHTML = `
    <div id="prompt-versions-persona"></div>
    <h3>Minh họa cách ghép prompt (chỉ xem trước)</h3>
    <p class="helper">Các ô dưới đây là bản minh họa trong trình duyệt, AI không đọc chúng. Prompt thật của từng người dẫn là bảng ở trên; gói phương pháp vẫn nằm trong mã (AI-13).</p>
    <div class="persona-studio">
      <div class="code-card">
        <p class="eyebrow">Personas</p>
        <div class="persona-list">
          ${personaConfigs.map((item) => `
            <button class="persona-button ${item.id === persona.id ? "active" : ""}" data-persona="${item.id}">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.archetype)} / ${escapeHtml(item.tone)}</span>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="layer-stack">
        <div class="rubric-grid">
          <div class="rubric-card">
            <p class="eyebrow">Archetype</p>
            <h3>${escapeHtml(persona.archetype)}</h3>
            <p>Reusable behavior template shared by similar personas.</p>
          </div>
          <div class="rubric-card">
            <p class="eyebrow">Voice</p>
            <h3>${escapeHtml(persona.tone)}</h3>
            <p>Pace: ${escapeHtml(persona.pace)}.</p>
          </div>
          <div class="rubric-card">
            <p class="eyebrow">Boundary</p>
            <h3>Inspired-by</h3>
            <p>${escapeHtml(persona.boundary)}</p>
          </div>
        </div>

        <div class="code-card">
          <p class="eyebrow">Layered prompt assembly</p>
          <div class="layer-stack">
            ${Object.entries(promptLayers).map(([key, label]) => renderLayerRow(key, label, persona)).join("")}
          </div>
        </div>

        <div class="code-card">
          <p class="eyebrow">Final assembled system prompt preview</p>
          <pre>${escapeHtml(assembledPersonaSystemPrompt())}</pre>
        </div>
      </div>
    </div>
  `;
  mountPromptVersions("#prompt-versions-persona", { mode: "persona" });
}

function renderCouncilBuilderDetail() {
  const current = feature();
  const template = selectedCouncilTemplate();
  const config = assembledCouncilConfig();
  const publishPayload = assembledCouncilPublishPayload();
  const canUseAdminApi = isCouncilAdminReady() && !state.councilAdminBusy;
  if (current.id !== "ai_council") {
    $("#detail-content").innerHTML = `
      <div class="detail-layout single">
        <div class="warning-card">
          <strong>Council Builder is for AI Council</strong>
          <p>Select AI Council in the left sidebar to configure meeting templates, guide roles, turn policy, and output contracts for multi-guide conversations.</p>
          <button class="button ghost" data-feature="ai_council">Open AI Council</button>
        </div>
      </div>
    `;
    return;
  }

  $("#detail-content").innerHTML = `
    <div class="council-builder">
      <div class="code-card">
        <p class="eyebrow">Situation templates</p>
        <div class="template-list">
          ${councilTemplates.map((item) => `
            <button class="template-button ${item.id === template.id ? "active" : ""}" data-council-template="${item.id}">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.useCase)}</span>
              <small>${escapeHtml(item.status)} / ${escapeHtml(item.meetingMode)}</small>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="layer-stack">
        <div class="council-toolbar">
          <div>
            <p class="eyebrow">Council meeting config</p>
            <h3>${escapeHtml(template.name)}</h3>
            <p>${escapeHtml(template.useCase)}</p>
          </div>
          <div class="council-controls">
            <label>
              <span>Mode</span>
              <select data-council-setting="meetingMode">
                ${["supportive_roundtable", "advisory_board", "calm_intervention", "structured_debate"].map((mode) => `<option value="${mode}" ${mode === template.meetingMode ? "selected" : ""}>${escapeHtml(mode)}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Guides</span>
              <select data-council-setting="maxGuides">
                ${[2, 3, 4].map((count) => `<option value="${count}" ${count === template.maxGuides ? "selected" : ""}>${count}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Synthesis</span>
              <select data-council-setting="synthesisMode">
                ${["gentle_consensus", "decision_next_step", "calming_reframe", "balanced_tradeoff"].map((mode) => `<option value="${mode}" ${mode === template.synthesisMode ? "selected" : ""}>${escapeHtml(mode)}</option>`).join("")}
              </select>
            </label>
          </div>
        </div>

        <div class="rubric-grid">
          <div class="rubric-card">
            <p class="eyebrow">Entry point</p>
            <h3>${escapeHtml(template.useCase.split(",")[0])}</h3>
            <p>Mobile can map situation chips to this preset before starting a group-style AI Council thread.</p>
          </div>
          <div class="rubric-card">
            <p class="eyebrow">Meeting style</p>
            <h3>${escapeHtml(template.meetingMode.replaceAll("_", " "))}</h3>
            <p>Guides respond as a coordinated advisory room, not isolated one-off chat replies.</p>
          </div>
          <div class="rubric-card">
            <p class="eyebrow">Safety posture</p>
            <h3>Sanitized only</h3>
            <p>No raw private journal, birth profile, or private chat history is enabled by default.</p>
          </div>
        </div>

        <div class="council-grid">
          <div class="code-card">
            <p class="eyebrow">Guide roster and roles</p>
            <div class="council-roster">
              ${template.roster.map(renderCouncilRole).join("")}
            </div>
          </div>
          <div class="code-card">
            <p class="eyebrow">Meeting flow</p>
            <div class="meeting-flow">
              ${template.flow.map(renderMeetingStep).join("")}
            </div>
            <div class="output-contract">
              <p class="eyebrow">Output contract</p>
              <div class="variable-list">
                ${template.outputContract.map((fieldName) => `<button>${escapeHtml(fieldName)}</button>`).join("")}
              </div>
            </div>
          </div>
        </div>

        <div class="code-card council-admin-connector">
          <div class="connector-header">
            <div>
              <p class="eyebrow">Supabase Admin Connector</p>
              <h3>Xem cấu hình Hội đồng · chưa phát hành được</h3>
              <p>Dùng phiên đăng nhập Admin hiện tại; không cần dán khóa hay token. <span class="helper">Uses the signed-in admin session.</span></p>
            </div>
            <span class="pill">${escapeHtml(state.councilAdminStatus)}</span>
          </div>
          <div class="connector-actions">
            <button class="button ghost" id="council-load-config" ${canUseAdminApi ? "" : "disabled"}>${state.councilAdminBusy ? "Đang tải…" : "Tải cấu hình đang chạy (chỉ xem)"}</button>
          </div>
          <p class="warning-card" role="note"><strong>Chưa áp dụng — cần backend.</strong> ${escapeHtml(councilPublishBlockedReason)} Load active config only displays a read-only response; it does not replace the local preview above.</p>
          <div class="connector-result">
            <p class="eyebrow">Latest remote response</p>
            <pre>${escapeHtml(summarizeCouncilAdminResult(state.councilAdminResult))}</pre>
          </div>
        </div>

        <div class="detail-layout">
          <details class="code-card technical-details"><summary>Chi tiết kỹ thuật · cấu hình xem trước (JSON)</summary>
            <pre>${escapeHtml(JSON.stringify(config, null, 2))}</pre>
          </details>
          <div class="warning-card">
            <strong>Operational rule</strong>
            <p>Each council turn should persist one user message, multiple guide messages with the same council round id, and one moderator summary when the selected template requires synthesis.</p>
            <p>Publishing is unavailable in this workspace until the active backend config can be safely edited and published with atomic version conflict checks.</p>
            <p>Publish only after testing at least one situation from each active template and confirming every guide keeps the inspired-by boundary.</p>
          </div>
        </div>
        <details class="code-card technical-details"><summary>Chi tiết kỹ thuật · payload mẫu, không phát hành được</summary>
          <pre>${escapeHtml(JSON.stringify(publishPayload, null, 2))}</pre>
        </details>
      </div>
    </div>
  `;
}

function renderCouncilRole(member) {
  const persona = personaById(member.personaId);
  return `
    <div class="council-role">
      <div>
        <strong>${escapeHtml(persona.name)}</strong>
        <span>${escapeHtml(member.role.replaceAll("_", " "))}</span>
      </div>
      <p>${escapeHtml(member.purpose)}</p>
      <small>${escapeHtml(persona.boundary)}</small>
    </div>
  `;
}

function renderMeetingStep(step, index) {
  return `
    <div class="meeting-step">
      <span>${index + 1}</span>
      <p>${escapeHtml(step)}</p>
    </div>
  `;
}

function renderLayerRow(key, label, persona) {
  const plan = promptInjectionPlan();
  const injected = plan[key] || [];
  const descriptions = {
    safety: "Global guardrails shared by every Nilaza AI experience.",
    base: "Persona Chat feature behavior shared by all guides.",
    archetype: `Template for ${persona.archetype}: reusable style and role logic.`,
    persona: `${persona.name} voice, strengths, avoids, boundaries, and signature moves.`,
    context_block: "User-selected context values passed as structured variables.",
    output: `Response format: ${persona.responseFormat.join(" -> ")}.`
  };
  return `
    <div class="layer-row">
      <strong>${escapeHtml(label)}</strong>
      <div>
        <p>${escapeHtml(descriptions[key])}</p>
        <p>${injected.length ? `Injected context: ${injected.map((item) => item.variable).join(", ")}` : "No context field mapped here."}</p>
      </div>
    </div>
  `;
}

function renderModelRouterReadiness() {
  const result = state.modelRouterAdminResult;
  if (!Array.isArray(result?.providers)) return "";
  const routeFeature = modelRouteFeatureId(feature().id);
  const routes = (Array.isArray(result.routes) ? result.routes : []).filter(row => row.feature === routeFeature);
  return `<section aria-label="Tình trạng máy chủ">
    <p><strong>Dự án thật:</strong> ${escapeHtml(result.projectHost || "Chưa rõ")}</p>
    <p>Kiểm tra lúc: ${escapeHtml(result.checkedAt || "")}</p>
    ${result.providers.map(item => `<p><strong>${escapeHtml(item.provider)}</strong>: ${item.configured ? "Đã có khóa ở máy chủ" : "Chưa có khóa"} — <code>${escapeHtml(item.secretName)}</code></p>`).join("")}
    <p>Chỉ kiểm có khóa hay không; chưa gọi model, chưa kiểm hạn mức. Kiểm tra khóa thật ở trang “Nhà cung cấp & chuỗi model”.</p>
    <h4>Bản trên máy chủ của tính năng đang xem</h4>
    ${routes.length ? routes.map(row => `<p>${escapeHtml(row.version)} (${escapeHtml(row.status)}): ${escapeHtml(row.primary_provider)} / ${escapeHtml(row.primary_model)} → ${escapeHtml(row.fallback_provider || "không")} / ${escapeHtml(row.fallback_model || "không")}${Array.isArray(row.steps) && row.steps.length ? ` · chuỗi ${row.steps.length} bước` : ""}</p>`).join("") : "<p>Chưa có bản nào được lưu cho tính năng này. Khi chạy có thể dùng cấu hình mặc định trong mã; danh mục mẫu phía trên không chứng minh bản đang chạy.</p>"}
  </section>`;
}

function renderModelRouteReferences(current) {
  const featureId = modelRouteFeatureId(current.id);
  const conflicts = state.modelRouterAmbiguousRoutes.filter(route => route.feature === featureId);
  const experimental = state.modelRouterExperimentalRoutes.filter(route => route.feature === featureId);
  const chain = activeModelRouteChain(current);
  const row = route => `<p>${escapeHtml(route.version)} · ${escapeHtml(route.status)} · ${escapeHtml(route.primary_provider)} / ${escapeHtml(route.primary_model)}</p>`;
  return `${chain ? `<section class="code-card" aria-label="Chuỗi đang chạy"><strong>Chuỗi đang chạy · chỉ xem</strong><ol>${chain.map(step => `<li>${escapeHtml(step.provider)} · ${escapeHtml(step.model)} · chờ ${escapeHtml(Math.round(Number(step.timeout_ms) / 1000))} giây</li>`).join("")}</ol></section>` : ""}${conflicts.length ? `<section class="warning-card" aria-label="Các bản đang chạy xung đột"><strong>Các bản cùng đang chạy · chỉ xem</strong>${conflicts.map(row).join("")}</section>` : ""}${experimental.length ? `<details><summary>Bản thử nghiệm · chỉ xem, không tính là bản đang chạy (${experimental.length})</summary><p>Đây là các bản lưu trên máy chủ. Chúng không được chọn hay nạp vào trình sửa này. Muốn biết khi chạy thật cần deploy và xem Nhật ký AI.</p>${experimental.map(row).join("")}</details>` : ""}`;
}

function renderModelRouterDetail() {
  const current = feature();
  if (!canPublishModelRoute(current)) {
    const chain = activeModelRouteChain(current);
    $("#detail-content").innerHTML = `<div class="detail-layout single"><div class="code-card"><p class="eyebrow">Chưa phát hành model ở đây được</p><h3>${hasAmbiguousModelRoutes(current) ? "Cần xử lý các bản cùng đang chạy" : chain ? "Tính năng này dùng chuỗi nhiều bước" : "Tính năng này không có model AI để chọn"}</h3><p>${escapeHtml(modelRouteUnavailableReason(current))}</p>${hasAmbiguousModelRoutes(current) ? `<button id="model-router-check-connection" class="button" ${isModelRouterAdminReady() && !state.modelRouterAdminBusy ? "" : "disabled"}>${state.modelRouterAdminBusy ? "Đang kiểm tra…" : "Kiểm tra kết nối lại"}</button>` : ""}${chain ? '<p><a class="button" href="#providers">Mở Nhà cung cấp & chuỗi model</a></p>' : ""}</div>${renderModelRouteReferences(current)}</div>`;
    return;
  }
  const remoteRoute = state.modelRouterRemoteRoutes.find((route) => route.feature === modelRouteFeatureId(current.id));
  const hasLocalDraft = hasModelRouteDraft(current);
  $("#detail-content").innerHTML = `
    <div class="detail-layout single">
      <div class="code-card"><p class="eyebrow">Model chính & dự phòng · ${hasLocalDraft ? "nháp trên trình duyệt" : remoteRoute ? `máy chủ: ${escapeHtml(remoteRoute.status)}` : "chưa tải từ máy chủ"}</p><h3>Model chính, dự phòng và giới hạn</h3>${renderModelRouteEditor(current)}</div>
      ${renderModelRouteReferences(current)}
      <details><summary>Danh mục model · để chọn, không phải bằng chứng về sức khỏe hay chất lượng</summary>
      <div class="variant-grid">
        ${Object.entries(providerCatalog).filter(([name]) => name !== "expo" && providerAvailable(name)).map(([name, provider]) => renderProviderCard(name, provider, current)).join("")}
      </div>
      <p>Danh mục phía trên giúp tìm model; tình trạng nhà cung cấp bên dưới chỉ xác nhận có khóa. Máy chủ đích hiện ở đầu trang và không đổi được trong phiên này.</p>
      </details>
      <div class="status-strip" aria-label="Nguồn cấu hình">
        <strong>Nguồn cấu hình:</strong>
        ${hasLocalDraft ? "Đang có nháp trên trình duyệt này; chưa phát hành." : remoteRoute ? `Bản ${escapeHtml(remoteRoute.status)} trên máy chủ: ${escapeHtml(remoteRoute.primary_provider)} / ${escapeHtml(remoteRoute.primary_model)}${remoteRoute.fallback_provider ? ` → ${escapeHtml(remoteRoute.fallback_provider)} / ${escapeHtml(remoteRoute.fallback_model || "")}` : " · không dự phòng"}` : "Chưa tải bản nào từ máy chủ."}
      </div>
      <div class="detail-layout">
        <div class="code-card">
          ${current.id === "astrology" && remoteRoute?.response_schema && remoteRoute.response_schema !== current.schema ? `<p class="warning-card">Máy chủ vẫn dùng định dạng ${escapeHtml(remoteRoute.response_schema)}. Phát hành bản này sẽ dùng ${escapeHtml(current.schema)} cho hợp đồng Chiêm tinh AI mới.</p>` : ""}
          <details class="technical-details"><summary>Chi tiết kỹ thuật · hợp đồng route (JSON)</summary>
          <pre>${escapeHtml(JSON.stringify({
            feature: modelRouteFeatureId(current.id),
            route: mobileGatewayPath(current.id),
            status: "active",
            responseSchema: current.schema,
            primary: { provider: current.provider, model: current.model },
            fallback: { provider: current.fallbackProvider, model: current.fallbackModel },
            temperature: Number(current.temperature ?? remoteRoute?.temperature ?? 0.7),
            maxTokens: Number(current.maxOutputTokens ?? remoteRoute?.max_output_tokens ?? 2000),
            fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
            safetyPolicy: {}
          }, null, 2))}</pre></details>
        </div>
        <div class="warning-card">
          <strong>Dùng nhà cung cấp thế nào</strong>
          <p>Danh mục và việc có khóa không đo chất lượng hay độ an toàn của câu trả lời. Gửi một yêu cầu thử trên staging rồi xem Nhật ký AI trước khi tin vào một cấu hình.</p>
        </div>
        <div class="code-card model-router-admin-connector">
          <div class="layer-row">
            <strong>Kết nối máy chủ Admin</strong>
            <span class="pill" role="status" aria-live="polite">${escapeHtml(state.modelRouterAdminStatus)}</span>
          </div>
          <p class="helper">Dùng phiên đăng nhập Admin hiện tại; Admin không bao giờ nhận hay hiện khóa nhà cung cấp.</p>
          <p>Kiểm tra chỉ đọc; không gọi AI, không phát sinh phí. Có khóa không có nghĩa khóa còn hiệu lực hay còn hạn mức — dùng Kiểm tra khóa ở trang “Nhà cung cấp & chuỗi model”.</p>
          <p>Khóa chỉ lưu trong Supabase Dashboard → Edge Functions → Secrets: OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, DEEPSEEK_API_KEY hoặc OPENROUTER_API_KEY. Không dán khóa vào chat, JWT hay cấu hình model.</p>
          <button id="model-router-check-connection" class="button" ${isModelRouterAdminReady() && !state.modelRouterAdminBusy ? "" : "disabled"}>Kiểm tra kết nối</button>
          <button id="model-router-publish-config" class="button ${isModelRouterAdminReady() ? "primary" : ""}" ${isModelRouterAdminReady() && !state.modelRouterAdminBusy ? "" : "disabled"}>
            ${state.modelRouterAdminBusy ? "Đang phát hành…" : "Xem lại & phát hành"}
          </button>
          ${Array.isArray(state.modelRouterAdminResult?.providers) ? renderModelRouterReadiness() : state.modelRouterAdminResult ? `<pre>${escapeHtml(JSON.stringify(state.modelRouterAdminResult, null, 2))}</pre>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderProviderCard(name, provider, current) {
  const isPrimary = current.provider === name;
  const isFallback = current.fallbackProvider === name;
  const stateLabel = isPrimary ? "Đang chọn làm chính" : isFallback ? "Đang chọn làm dự phòng" : "Trong danh mục · chưa kiểm tình trạng";

  let fetchButton = "";
  if (name === "openrouter") {
    fetchButton = `<button class="button text-button" data-fetch-models="${escapeHtml(name)}" style="padding: 0; font-size: 0.8rem; margin-top: 0.5rem;">Tải danh sách model từ OpenRouter</button>`;
  }

  return `
    <div class="variant-card ${isPrimary ? "winner" : ""}">
      <p class="eyebrow">${escapeHtml(provider.label)}</p>
      <h3>${escapeHtml(stateLabel)}</h3>
      <label class="visually-hidden" for="search-provider-${escapeHtml(name)}">Tìm model ${escapeHtml(provider.label)}</label><input type="search" class="input" id="search-provider-${escapeHtml(name)}" data-search-provider="${escapeHtml(name)}" placeholder="Tìm model…" style="width: 100%; margin-bottom: 0.5rem; font-size: 0.8rem; padding: 0.25rem 0.5rem;" />
      <div class="variable-list" id="model-list-${escapeHtml(name)}" style="max-height: 200px; overflow-y: auto;">
        ${provider.models.map((model) => `<button data-set-model-provider="${escapeHtml(name)}" data-set-model="${escapeHtml(model)}">${escapeHtml(model)}</button>`).join("")}
      </div>
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <label class="visually-hidden" for="custom-model-${escapeHtml(name)}">Mã model ${escapeHtml(provider.label)} tự nhập</label><input type="text" class="input" style="flex: 1; min-width: 120px; font-size: 0.8rem; padding: 0.25rem 0.5rem;" placeholder="Mã model tự nhập" id="custom-model-${escapeHtml(name)}" />
        <button class="button" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;" data-add-custom-model="${escapeHtml(name)}">Thêm</button>
      </div>
      ${fetchButton}
    </div>
  `;
}

function traceFeatureId() {
  return feature().id === "astrology" ? "astrology_report" : feature().id;
}

function traceFeatureOptions() {
  const options = [
    { value: "current", label: "Tính năng đang chọn (" + traceFeatureId() + ")" },
    { value: "all", label: "Mọi tính năng AI" }
  ];
  return options.map((option) => "<option value=\"" + escapeHtml(option.value) + "\" " +
    (state.traceExplorerFilter === option.value ? "selected" : "") + ">" +
    escapeHtml(option.label) + "</option>").join("");
}

function isOwnerDebugEnabled() {
  return Array.isArray(window.NilazaAdminSession?.capabilities)
    && window.NilazaAdminSession.capabilities.includes("roles.manage");
}

// Raw (already redacted) JSON is technical detail: it stays inside a collapsed "Chi tiết kỹ thuật" block (AD-20).
function traceJson(label, value) {
  return "<div class=\"code-card\"><p class=\"eyebrow\">" + escapeHtml(label) +
    "</p><pre>" + escapeHtml(JSON.stringify(value ?? {}, null, 2)) + "</pre></div>";
}

const traceStatusLabels = { completed: "Ổn", ok: "Ổn", fallback: "Ổn — dự phòng", blocked: "Chặn an toàn", error: "Lỗi", failed: "Lỗi", running: "Đang chạy" };
function traceStatusLabel(value) {
  return traceStatusLabels[value] || (value ? String(value) : "không rõ");
}

function traceStepRows(spans) {
  return "<table class=\"trace-steps\"><thead><tr><th scope=\"col\">Bước</th><th scope=\"col\">Kết quả</th><th scope=\"col\">Thời gian</th></tr></thead><tbody>" +
    spans.map((span) => {
      const latency = Number(span?.attributes?.latencyMs);
      return "<tr><td>" + escapeHtml(span.span_name || "bước") + "</td><td>" + escapeHtml(traceStatusLabel(span.status)) +
        "</td><td>" + (Number.isFinite(latency) ? escapeHtml(String(Math.round(latency))) + " ms" : "—") + "</td></tr>";
    }).join("") + "</tbody></table>";
}

function renderTraceExplorerDetail() {
  const runs = Array.isArray(state.traceExplorerRuns) ? state.traceExplorerRuns : [];
  const selected = state.traceExplorerDetail?.run ??
    runs.find((run) => run.trace_id === state.traceExplorerSelectedId);
  const spans = Array.isArray(state.traceExplorerDetail?.spans) ? state.traceExplorerDetail.spans : [];
  const runRows = runs.length ? runs.map((run) =>
    "<button class=\"layer-row " + (run.trace_id === state.traceExplorerSelectedId ? "active" : "") +
    "\" data-trace-id=\"" + escapeHtml(run.trace_id) +
    "\" style=\"width:100%; text-align:left; border:0; background:transparent; color:inherit; cursor:pointer;\">" +
    "<strong>" + escapeHtml(run.feature || "không rõ") + "</strong>" +
    "<span>" + escapeHtml(traceStatusLabel(run.status)) + " · " + escapeHtml(run.environment || "") + "</span>" +
    "<small>" + escapeHtml(run.trace_id || "") + " · " + escapeHtml(run.created_at || "") + "</small></button>"
  ).join("") : "<p>Chưa có lượt nào để hiển thị.</p>";
  const selectedHtml = selected ? (
    "<div class=\"code-card\"><p class=\"eyebrow\">Lượt đang xem</p><p><strong>" +
    escapeHtml(selected.feature || "") + "</strong> · " + escapeHtml(traceStatusLabel(selected.status)) +
    " · che dữ liệu: " + escapeHtml(selected.redaction_mode || "redacted") + "</p><p>Mã nhật ký: <code>" +
    escapeHtml(selected.trace_id || "") + "</code></p><p>Mã yêu cầu từ app: <code>" + escapeHtml(selected.client_request_id || "không ghi") + "</code></p></div>" +
    (spans.length ? "<div class=\"code-card\"><p class=\"eyebrow\">Các bước</p>" + traceStepRows(spans) + "</div>"
      : "<div class=\"code-card\"><p>Đang tải các bước của lượt này…</p></div>") +
    "<details class=\"technical-details code-card\"><summary>Chi tiết kỹ thuật (dữ liệu đã che)</summary>" +
    traceJson("Đầu vào gốc (đã che)", selected.root_input) +
    traceJson("Đầu ra gốc", selected.root_output) +
    traceJson("Thông tin kèm theo", selected.metadata) +
    spans.map((span) =>
      "<div class=\"code-card\"><p><strong>" + escapeHtml(span.span_name || "bước") + "</strong> · " + escapeHtml(traceStatusLabel(span.status)) + "</p>" +
      traceJson("Đầu vào", span.input) + traceJson("Đầu ra", span.output) + traceJson("Thuộc tính", span.attributes) + "</div>"
    ).join("") + "</details>" +
    `<div class="code-card"><p class="eyebrow">Đối chiếu với Luồng xử lý</p><p>Chỉ áp chi tiết đã che khớp đúng tài khoản, tính năng và máy chủ hiện tại. Sơ đồ không bao giờ hiện nội dung gửi cho nhà cung cấp.</p><button type="button" class="button ghost" id="workflow-apply-trace" ${state.traceDetailScope?.accountId && state.traceDetailScope?.target && state.traceExplorerDetail && !state.traceDetailLoading ? "" : "disabled"}>Áp chi tiết đã che vào Luồng xử lý</button></div>` +
    (isOwnerDebugEnabled() ? `<div class="code-card"><p class="eyebrow">Dữ liệu QA của Owner</p><p>Khi người dùng đồng ý, yêu cầu và câu trả lời chính xác với nhà cung cấp được mã hóa trên staging. Không mở được sau 24 giờ; mỗi lần mở được ghi vào nhật ký AI. Đây là bằng chứng Nilaza đã gửi và nhận gì, không phải những gì nhà cung cấp tự biến đổi bên trong.</p>${state.traceExplorerQaPayload ? `<button class="button ghost" id="trace-qa-clear">Ẩn dữ liệu QA</button><p>Hết hạn: ${escapeHtml(state.traceExplorerQaPayload.expiresAt || "")}</p><details class="technical-details" open><summary>Yêu cầu gửi OpenRouter và câu trả lời</summary>${traceJson("Exact OpenRouter request and provider response", state.traceExplorerQaPayload.payload)}</details>` : `<button class="button ghost" id="trace-qa-load">Reveal retained QA payload</button>`}</div>` : "")
  ) : "<div class=\"code-card\"><p>Chọn một lượt để xem các bước.</p></div>";

  $("#detail-content").innerHTML =
    "<div class=\"detail-layout single\"><div class=\"code-card\">" +
    "<div class=\"layer-row\"><div><p class=\"eyebrow\">Theo dõi AI</p><h3>Nhật ký AI</h3></div>" +
    "<span class=\"pill\" role=\"status\" aria-live=\"polite\">" + escapeHtml(state.traceExplorerStatus) + "</span></div>" +
    "<p>Đây là trạng thái được ghi lại; nguồn ghi chưa được xác minh nên không chứng minh model đã chạy, đã kiểm định dạng hay đã trả lời xong. Tìm theo mã nhật ký, mã yêu cầu hoặc tên model. Dữ liệu QA chính xác của Chiêm tinh cần người dùng đồng ý, staging và quyền Owner.</p>" +
    "<div class=\"param-row\"><label for=\"trace-feature-filter\">Tính năng:</label>" +
    "<select id=\"trace-feature-filter\" class=\"input\">" + traceFeatureOptions() + "</select>" +
    `<label for="trace-status-filter">Kết quả:</label><select id="trace-status-filter" class="input"><option value="all" ${state.traceExplorerStatusFilter === "all" ? "selected" : ""}>Tất cả</option><option value="completed" ${state.traceExplorerStatusFilter === "completed" ? "selected" : ""}>Ổn</option><option value="fallback" ${state.traceExplorerStatusFilter === "fallback" ? "selected" : ""}>Ổn — dự phòng</option><option value="blocked" ${state.traceExplorerStatusFilter === "blocked" ? "selected" : ""}>Chặn an toàn</option><option value="error" ${state.traceExplorerStatusFilter === "error" ? "selected" : ""}>Lỗi</option></select>` +
    `<label for="trace-query">Mã yêu cầu / model:</label><input id="trace-query" class="input" type="search" value="${escapeHtml(state.traceExplorerQuery)}" placeholder="Mã nhật ký, mã yêu cầu hoặc tên model" />` +
    "<button id=\"trace-load\" class=\"button primary\" " + (state.traceExplorerBusy ? "disabled" : "") + ">" +
    (state.traceExplorerBusy ? "Đang tải…" : "Tải nhật ký gần đây") + "</button></div>" +
    "<p class=\"muted\">" + (runs.length ? runs.length + " lượt đã tải. Chọn một lượt để xem các bước." :
      "Bấm tải để đọc nhật ký gần đây từ máy chủ được bảo vệ. Kết quả trống không có nghĩa là máy chủ thiếu bảng.") + "</p></div>" +
    "<div class=\"detail-layout\"><div class=\"code-card\"><p class=\"eyebrow\">Lượt gần đây</p>" +
    runRows + "</div><div>" + selectedHtml + "</div></div></div>";
}

async function loadTraceExplorer() {
  if (state.traceExplorerBusy) return;
  if (!await window.NilazaRequireCapability?.("ai.read")) {
    state.traceExplorerStatus = "Không có quyền xem nhật ký (cần ai.read)";
    renderDetail();
    return;
  }
  if (typeof window.NilazaAdminRpc !== "function") {
    state.traceExplorerStatus = "Chưa đọc được nhật ký: phiên đăng nhập chưa sẵn sàng";
    renderDetail();
    return;
  }
  if (workflowTransportTarget && !workflowCurrentScope().target) {
    state.traceExplorerStatus = "Cấu hình máy chủ đã đổi. Tải lại Admin trước khi đọc máy chủ này.";
    clearWorkflowObservation("Backend configuration changed; reload Admin before applying observations.");
    renderDetail();
    return;
  }
  state.traceExplorerBusy = true;
  state.workflowTraceReaderState = "loading";
  state.traceExplorerStatus = "Đang tải…";
  renderDetail();
  const scope = workflowCurrentScope();
  const epoch = ++state.traceReadEpoch;
  const hash = location.hash;
  try {
    const filter = state.traceExplorerFilter === "all" ? null : traceFeatureId();
    const data = await window.NilazaAdminRpc("search_ai_trace_runs", {
      limit_count: 50,
      feature_filter: filter,
      status_filter: state.traceExplorerStatusFilter === "all" ? null : state.traceExplorerStatusFilter,
      query_text: state.traceExplorerQuery.trim() || null
    }, "ai.read");
    if (!workflowReadStillCurrent(scope, epoch, hash)) return;
    state.traceExplorerRuns = Array.isArray(data) ? data : [];
    state.workflowTraceReaderState = state.traceExplorerRuns.length ? "loaded" : "empty";
    state.traceExplorerStatus = state.traceExplorerRuns.length + " lượt đã tải";
    if (!state.traceExplorerRuns.some((run) => run.trace_id === state.traceExplorerSelectedId)) {
      state.traceExplorerSelectedId = state.traceExplorerRuns[0]?.trace_id ?? "";
      state.traceExplorerDetail = null;
      clearTraceQaPayload();
    }
  } catch (error) {
    if (workflowReadStillCurrent(scope, epoch, hash)) { state.traceExplorerStatus = "Không tải được nhật ký (thiếu quyền, mất mạng hoặc máy chủ chưa có hàm đọc). Thử lại."; state.workflowTraceReaderState = "error"; }
  } finally {
    if (workflowReadStillCurrent(scope, epoch, hash)) { state.traceExplorerBusy = false; renderDetail(); }
  }
}

function clearTraceQaPayload() {
  state.traceExplorerQaPayload = null;
  state.traceExplorerQaEpoch += 1;
}

async function loadTraceQaPayload() {
  const traceId = state.traceExplorerSelectedId;
  const epoch = ++state.traceExplorerQaEpoch;
  if (!traceId || !isOwnerDebugEnabled() || !await window.NilazaRequireCapability?.("roles.manage")) return;
  if (epoch !== state.traceExplorerQaEpoch || state.detail !== "traceExplorer" || state.traceExplorerSelectedId !== traceId) return;
  const endpoint = adminFunctionEndpoint("admin-ai-trace-qa-payload");
  if (!endpoint) { state.traceExplorerStatus = "Chưa có địa chỉ máy chủ"; renderDetail(); return; }
  state.traceExplorerStatus = "Đang giải mã dữ liệu QA…";
  renderDetail();
  try {
    const response = await adminRequest(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ traceId })
    }, "roles.manage");
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(body.error || "QA payload unavailable");
    if (epoch === state.traceExplorerQaEpoch && state.detail === "traceExplorer" && state.traceExplorerSelectedId === traceId) {
      state.traceExplorerQaPayload = body;
      state.traceExplorerStatus = "Đã mở dữ liệu QA của Owner";
    }
  } catch (error) {
    if (epoch === state.traceExplorerQaEpoch && state.detail === "traceExplorer" && state.traceExplorerSelectedId === traceId) {
      state.traceExplorerStatus = "Không mở được dữ liệu QA (hết hạn, thiếu quyền hoặc mất mạng).";
    }
  }
  if (state.detail === "traceExplorer") renderDetail();
}

async function loadTraceDetail(traceId) {
  if (!traceId || typeof window.NilazaAdminRpc !== "function") return;
  if (workflowTransportTarget && !workflowCurrentScope(traceId).target) {
    clearWorkflowObservation("Backend configuration changed; reload Admin before applying observations.");
    state.traceExplorerStatus = "Cấu hình máy chủ đã đổi. Tải lại Admin trước khi đọc máy chủ này.";
    renderDetail();
    return;
  }
  const initialScope = workflowCurrentScope(traceId);
  const initialEpoch = state.traceReadEpoch;
  if (!await window.NilazaRequireCapability?.("ai.read")) return;
  if (state.detail !== "traceExplorer" || state.traceExplorerSelectedId !== traceId || initialEpoch !== state.traceReadEpoch || JSON.stringify(initialScope) !== JSON.stringify(workflowCurrentScope(traceId))) return;
  const scope = workflowCurrentScope(traceId);
  const epoch = ++state.traceReadEpoch;
  const hash = location.hash;
  state.traceDetailScope = null;
  state.traceDetailLoading = true;
  state.workflowTraceReaderState = "loading";
  state.traceExplorerStatus = "Đang tải chi tiết đã che…";
  renderDetail();
  try {
    const data = await window.NilazaAdminRpc("get_ai_trace_detail", {
      trace_id_input: traceId
    }, "ai.read");
    if (workflowReadStillCurrent(scope, epoch, hash) && state.traceExplorerSelectedId === traceId) {
      state.traceExplorerDetail = data && typeof data === "object" ? data : null;
      state.traceDetailScope = scope;
      state.traceDetailLoading = false;
      state.workflowTraceReaderState = "loaded";
      state.traceExplorerStatus = "Đã tải chi tiết đã che; muốn áp vào sơ đồ thì bấm nút áp.";
      renderDetail();
    }
  } catch (error) {
    if (workflowReadStillCurrent(scope, epoch, hash) && state.traceExplorerSelectedId === traceId) {
      state.traceDetailLoading = false;
      state.workflowTraceReaderState = "error";
      state.traceDetailScope = null;
      state.traceExplorerStatus = "Không tải được chi tiết lượt này. Thử lại.";
      renderDetail();
    }
  }
}

function renderPromptDetail() {
  const current = feature();
  const remoteRoute = state.modelRouterRemoteRoutes.find((route) => route.feature === modelRouteFeatureId(current.id));
  if (current.id === "astrology") {
    const active = state.astrologyPromptActive || {};
    const draft = state.astrologyPromptDraft || {};
    const versionVi = active.vi?.version || "none";
    const versionEn = active.en?.version || "none";
    const promptVi = typeof draft.vi === "string" ? draft.vi : (active.vi?.prompt_text || "");
    const promptEn = typeof draft.en === "string" ? draft.en : (active.en?.prompt_text || "");
    const loaded = Boolean(active.vi && active.en);
    $("#detail-content").innerHTML = `<div class="detail-layout single"><div class="code-card">
      <p class="eyebrow">Astrology backend prompt · ${escapeHtml(state.astrologyPromptAdminStatus)}</p>
      <p>These VI and EN prompts are the active runtime records from <code>prompt_versions</code>. Backend safety and output-schema instructions are appended after this text. Unsaved edits stay in this browser until the atomic pair publish.</p>
      <p>Current active versions: vi <strong>${escapeHtml(versionVi)}</strong> · en <strong>${escapeHtml(versionEn)}</strong></p>
      ${!loaded ? `<button id="astrology-prompt-load" class="button primary" ${state.astrologyPromptAdminBusy ? "disabled" : ""}>${state.astrologyPromptAdminBusy ? "Loading…" : "Load backend prompts"}</button>` : `
      <label class="helper" for="astrology-prompt-vi">System prompt · Vietnamese</label><textarea id="astrology-prompt-vi" data-astrology-prompt="vi">${escapeHtml(promptVi)}</textarea>
      <label class="helper" for="astrology-prompt-en">System prompt · English</label><textarea id="astrology-prompt-en" data-astrology-prompt="en">${escapeHtml(promptEn)}</textarea>
      <p id="astrology-prompt-draft-state" role="status">${escapeHtml(state.astrologyPromptAdminStatus)}</p>
      <button id="astrology-prompt-publish" class="button primary" ${promptVi.trim().length < 100 || promptEn.trim().length < 100 ? "disabled" : ""}>Xem lại & phát hành cặp prompt VI + EN</button>
      <details><summary>Version history</summary>${(state.astrologyPromptHistory || []).slice(0, 20).map(item => `<p>${escapeHtml(item.locale)} · ${escapeHtml(item.version)} · ${escapeHtml(item.status)} · ${escapeHtml(item.published_at || "")}</p>`).join("") || "<p>No history loaded.</p>"}</details>`}
      </div></div>`;
    return;
  }
  // A5: the real prompt of this feature is edited through the audited prompt_versions RPCs (prompt-versions.js).
  const promptFeature = promptVersionFeature(current.id);
  $("#detail-content").innerHTML = `
    <div class="detail-layout single">
      ${current.id === "oracle_router" ? renderSharedOraclePreview() : ""}
      ${promptFeature ? '<div id="prompt-versions-feature"></div>' : renderNotAppliedNote(`Prompt của ${current.name}`, "Tính năng này chưa có prompt hệ thống lưu trên máy chủ.")}
      <details class="technical-details"><summary>Chi tiết kỹ thuật</summary>
        <p class="helper">Backend route: ${escapeHtml(remoteRoute?.version || "not loaded")} · schema ${escapeHtml(remoteRoute?.response_schema || current.schema)}</p>
      </details>
    </div>
  `;
  if (promptFeature) mountPromptVersions("#prompt-versions-feature", { mode: "feature", feature: promptFeature });
}

// AI Studio feature id -> prompt_versions feature (Astrology keeps its own pair editor above).
function promptVersionFeature(featureId) {
  return ({ persona_chat: "persona_chat", tarot_reading: "tarot_reading", daily_insight: "daily_insight", ai_council: "ai_council", oracle_router: "oracle_router" })[featureId] || "";
}

function mountPromptVersions(selector, options) {
  const container = document.querySelector(selector);
  if (!container) return;
  if (window.NilazaPromptVersions) window.NilazaPromptVersions.mount(container, options);
  else container.innerHTML = renderNotAppliedNote("Prompt & phiên bản", "Không tải được mô-đun Prompt & phiên bản. Tải lại trang.");
}

function renderNotAppliedNote(title, detail) {
  return `<div class="warning-card not-applied" role="note"><p class="eyebrow">Chưa áp dụng — cần backend</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p></div>`;
}

function renderSharedOraclePreview() {
  invalidateChangedOraclePreview();
  const preview = state.oraclePreviewResult;
  const bundle = state.promptCompiler?.PROMPT_BUNDLE;
  const output = preview ? `
    <div class="composition-modules">${preview.sections.map(section => `<div class="composition-module"><strong>${escapeHtml(section.kind)}</strong><p>${escapeHtml(section.id)}<br>${escapeHtml(section.version)}</p></div>`).join("")}</div>
    <p class="helper">Exact compiler result · token count not assessed · providerReady: false. Character/byte checks are not token measurement. G1 input envelope requires a model-matched tokenizer and must stay within ${preview.provenance.usagePolicy.maxInputTokensPerAttempt} tokens.</p>
    <details><summary>Effective system prompt · exact compiled text</summary><pre id="oracle-effective-system">${escapeHtml(preview.system)}</pre></details>
    <details><summary>Messages · separate user data roles</summary><pre id="oracle-effective-messages">${escapeHtml(JSON.stringify(preview.messages, null, 2))}</pre></details>
    <details><summary>Bundle and module provenance</summary><pre id="oracle-preview-provenance">${escapeHtml(JSON.stringify(preview.provenance, null, 2))}</pre></details>`
    : `<p role="status">${escapeHtml(state.oraclePreviewError || (state.promptCompiler ? "Preview not compiled for the current selection. Select Compile shared preview; no provider request was made." : state.promptCompilerStatus))}</p>`;
  return `<section class="code-card" aria-labelledby="oracle-shared-title">
    <p class="eyebrow">Shared compiled candidate · not an active runtime release</p><h3 id="oracle-shared-title">Oracle: Core + Feature + Locale + Tone</h3>
    <p class="helper">One canonical compiler serves this preview. Common rules stay the same for VI/EN; only the reviewed locale and tone overlays change. No LLM request, quality score, save or backend publish is performed.</p>
    <p class="helper" role="status">${escapeHtml(state.promptCompilerStatus)}${bundle ? ` · Bundle ${escapeHtml(bundle.manifest.version)}` : ""}</p>
    <div class="shared-preview-controls">
      <label for="oracle-preview-locale">Response language<select id="oracle-preview-locale"><option value="vi" ${state.oraclePreviewLocale === "vi" ? "selected" : ""}>Tiếng Việt · vi</option><option value="en" ${state.oraclePreviewLocale === "en" ? "selected" : ""}>English · en</option></select></label>
      <label for="oracle-preview-tone">Reviewed tone<select id="oracle-preview-tone">${[["gentle", "Gentle"], ["balanced", "Balanced"], ["direct", "Direct"]].map(([value, label]) => `<option value="${value}" ${state.oraclePreviewTone === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="preview-question" for="oracle-preview-question">Fictional question · memory only<textarea id="oracle-preview-question" aria-describedby="oracle-preview-privacy">${escapeHtml(state.oraclePreviewQuestion)}</textarea></label>
      <button class="button ghost" id="oracle-preview-compile" ${state.promptCompiler ? "" : "disabled"}>Compile shared preview</button>
    </div><p class="helper" id="oracle-preview-privacy">Use fictional examples. This sample is not stored or synchronized. No profile, history, journal, birth data or uploads are included. Modules are pinned read-only; a future release must publish and evaluate the complete bundle.</p>
    <div id="oracle-compiled-output" aria-live="polite">${output}</div>
  </section>`;
}

async function loadAstrologyPromptConfig() {
  if (!await window.NilazaRequireCapability?.("ai.read")) { state.astrologyPromptAdminStatus = "Không có quyền đọc prompt (cần ai.read)"; renderDetail(); return; }
  if (state.astrologyPromptAdminBusy) return;
  const endpoint = state.astrologyPromptAdminEndpoint;
  if (!endpoint) { state.astrologyPromptAdminStatus = "Backend target unavailable"; renderDetail(); return; }
  state.astrologyPromptAdminBusy = true;
  state.astrologyPromptAdminStatus = "Loading active backend prompt pair…";
  renderDetail();
  try {
    const response = await adminRequest(endpoint, { method: "GET" }, "ai.read");
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.prompts) throw Error(body.error || response.statusText || "Prompt read failed");
    state.astrologyPromptActive = body.prompts.active || body.prompts;
    state.astrologyPromptHistory = Array.isArray(body.prompts.history) ? body.prompts.history : [];
    const draft = state.astrologyPromptDraft || {};
    if (typeof draft.vi !== "string" || !draft.vi) draft.vi = state.astrologyPromptActive.vi?.prompt_text || "";
    if (typeof draft.en !== "string" || !draft.en) draft.en = state.astrologyPromptActive.en?.prompt_text || "";
    state.astrologyPromptDraft = draft;
    state.astrologyPromptAdminStatus = `Loaded from ${body.projectHost || "backend"}`;
  } catch (error) {
    state.astrologyPromptAdminStatus = `Load failed: ${error.message}`;
  } finally {
    state.astrologyPromptAdminBusy = false;
    renderDetail();
  }
}

async function publishAstrologyPromptPair(review) {
  if (review?.action !== "astrologyPrompt" || !isPublishReviewCurrent(review)) { rejectChangedPublishReview(); return; }
  if (!await window.NilazaRequireCapability?.("ai.manage")) { state.astrologyPromptAdminStatus = "Không có quyền phát hành (cần ai.manage)"; renderDetail(); return; }
  if (!isPublishReviewCurrent(review)) { rejectChangedPublishReview(); return; }
  const payload = review.payload;
  const active = state.astrologyPromptActive || {};
  if (!active.vi || !active.en || payload.vi.trim().length < 100 || payload.en.trim().length < 100) {
    state.astrologyPromptAdminStatus = "Load and review both active prompts before publishing";
    renderDetail();
    return;
  }
  state.astrologyPromptAdminBusy = true;
  state.astrologyPromptAdminStatus = "Publishing VI + EN prompt pair atomically…";
  renderDetail();
  try {
    const response = await adminRequest(review.endpoint, reviewedPublishRequest(review, { "Content-Type": "application/json" }), "ai.manage");
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(body.error || response.statusText || "Prompt publish failed");
    const unchanged = isPublishReviewCurrent(review);
    if (unchanged) {
      state.astrologyPromptDraft = {};
      localStorage.removeItem("nilaza.admin.astrologyPromptDraft.v1");
    }
    state.astrologyPromptAdminStatus = `Published ${body.version || payload.version}`;
    $("#draft-status").textContent = unchanged ? "Astrology VI + EN prompt pair published" : "Reviewed Astrology prompt pair published; newer browser edits retained";
    state.astrologyPromptAdminBusy = false;
    if (unchanged) await loadAstrologyPromptConfig();
    else renderDetail();
  } catch (error) {
    state.astrologyPromptAdminStatus = `Publish failed: ${error.message}`;
    renderDetail();
  } finally {
    state.astrologyPromptAdminBusy = false;
  }
}

function mentionCatalog() {
  const contextItems = feature().fields.map((item) => ({
    id: item.id,
    label: item.label,
    value: `{{${item.id}}}`,
    group: item.enabled ? "Enabled context" : "Available context"
  }));
  const personaItems = feature().id === "persona_chat"
    ? [
        { id: "persona.name", label: "Persona name", value: "{{persona.name}}", group: "Persona" },
        { id: "persona.archetype", label: "Persona archetype", value: "{{persona.archetype}}", group: "Persona" },
        { id: "persona.signatureMoves", label: "Signature moves", value: "{{persona.signatureMoves}}", group: "Persona" },
        { id: "persona.responseFormat", label: "Response format", value: "{{persona.responseFormat}}", group: "Persona" }
      ]
    : [];
  const councilItems = feature().id === "ai_council"
    ? [
        { id: "council.personas", label: "Council persona roster", value: "{{selectedCouncilPersonas}}", group: "Council" },
        { id: "council.history", label: "Sanitized council history", value: "{{sanitizedCouncilHistory}}", group: "Council" },
        { id: "council.maxGuides", label: "Max guides per turn", value: "{{maxGuidesPerTurn}}", group: "Council" },
        { id: "council.outputSchema", label: "Council output schema", value: "{{ai_council_rounds_v2}}", group: "Council" },
        { id: "council.template", label: "Council situation template", value: "{{councilTemplate}}", group: "Council Builder" },
        { id: "council.roles", label: "Guide roles", value: "{{guideRoles}}", group: "Council Builder" },
        { id: "council.meetingMode", label: "Meeting mode", value: "{{meetingMode}}", group: "Council Builder" },
        { id: "council.synthesisMode", label: "Synthesis mode", value: "{{synthesisMode}}", group: "Council Builder" }
      ]
    : [];
  return [...contextItems, ...personaItems, ...councilItems];
}

function showMentionMenu(editor, query = "") {
  const menu = $("#mention-menu");
  const q = query.toLowerCase();
  const items = mentionCatalog().filter((item) => item.id.toLowerCase().includes(q) || item.label.toLowerCase().includes(q));
  if (!items.length) {
    hideMentionMenu();
    return;
  }
  const rect = editor.getBoundingClientRect();
  menu.innerHTML = items
    .slice(0, 9)
    .map((item) => `
      <button class="mention-item" data-mention-value="${escapeHtml(item.value)}">
        <strong>@${escapeHtml(item.id)}</strong>
        <span>${escapeHtml(item.group)} - ${escapeHtml(item.label)}</span>
      </button>
    `)
    .join("");
  menu.style.left = `${Math.min(rect.left + 18, window.innerWidth - 340)}px`;
  menu.style.top = `${Math.min(rect.top + 56, window.innerHeight - 320)}px`;
  menu.hidden = false;
  state.mentionEditorId = editor.id;
  state.mentionQuery = query;
}

function hideMentionMenu() {
  const menu = $("#mention-menu");
  if (menu) menu.hidden = true;
  state.mentionEditorId = null;
  state.mentionQuery = "";
}

function mentionTriggerInfo(editor) {
  const cursor = editor.selectionStart;
  const before = editor.value.slice(0, cursor);
  const match = before.match(/(^|\s)@([A-Za-z0-9_.-]*)$/);
  if (!match) return null;
  return {
    start: cursor - match[2].length - 1,
    end: cursor,
    query: match[2]
  };
}

function insertMention(value) {
  const editor = state.mentionEditorId ? document.getElementById(state.mentionEditorId) : null;
  if (!editor) return;
  const info = mentionTriggerInfo(editor);
  const start = info ? info.start : editor.selectionStart;
  const end = info ? info.end : editor.selectionStart;
  editor.value = `${editor.value.slice(0, start)}${value}${editor.value.slice(end)}`;
  const nextCursor = start + value.length;
  editor.focus();
  editor.setSelectionRange(nextCursor, nextCursor);
  feature().prompt = editor.value;
  persistFeatureDraft(feature(), "prompt");
  $("#draft-status").textContent = "Preview variable inserted and saved to browser draft";
  renderHeader();
  hideMentionMenu();
  if (editor.id === "prompt-edit") renderDetail();
}

function insertApprovedVariable(value) {
  const editor = $("#detail-prompt") || $("#prompt-edit");
  if (!editor) return;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.value = `${editor.value.slice(0, start)}${value}${editor.value.slice(end)}`;
  feature().prompt = editor.value;
  persistFeatureDraft(feature(), "prompt");
  editor.focus();
  editor.setSelectionRange(start + value.length, start + value.length);
  $("#draft-status").textContent = "Preview variable inserted and saved to browser draft";
  renderHeader();
}

function renderDataMindmapDetail() {
  const current = feature();
  const enabled = enabledFields();
  $("#detail-content").innerHTML = `
    <div class="mindmap">
      <div class="mindmap-column">
        <div class="mindmap-node source">
          <strong>User profile</strong>
          <span>${enabled.filter((item) => ["language", "tone", "userGoals", "birthDate", "birthTime", "birthPlace", "zodiacSign"].includes(item.id)).map((item) => `@${item.id}`).join(", ") || "No enabled profile context"}</span>
        </div>
        <div class="mindmap-node source">
          <strong>Messages</strong>
          <span>${enabled.filter((item) => ["recentMessages", "latestMessage"].includes(item.id)).map((item) => `@${item.id}`).join(", ") || "No enabled message context"}</span>
        </div>
        <div class="mindmap-node source">
          <strong>Feature data</strong>
          <span>${enabled.filter((item) => ["selectedCards", "spreadType", "personaProfile", "calculatedPlacements", "selectedCouncilPersonas", "maxGuidesPerTurn"].includes(item.id)).map((item) => `@${item.id}`).join(", ") || "No enabled feature data"}</span>
        </div>
      </div>
      <div class="mindmap-center">
        <div class="mindmap-node core">
          <strong>Local Context Preview</strong>
          <span>Shows selected sample fields. The server contract remains authoritative for the runtime request.</span>
        </div>
        <div class="flow-arrow">down</div>
        <div class="mindmap-node core">
          <strong>Effective prompt</strong>
          <span>Preview only. The runtime prompt is assembled in the backend and appears in a trace as a redacted payload.</span>
        </div>
        <div class="flow-arrow">down</div>
        <div class="mindmap-node core">
          <strong>Model Router</strong>
          <span>${escapeHtml(current.provider)} / ${escapeHtml(current.model)} with fallback ${escapeHtml(current.fallbackProvider)} / ${escapeHtml(current.fallbackModel)}</span>
        </div>
      </div>
      <div class="mindmap-column">
        <div class="mindmap-node output">
          <strong>Output schema</strong>
          <span>${escapeHtml(current.schema)} validates the response shape before it reaches the app.</span>
        </div>
        <div class="mindmap-node output">
          <strong>Response</strong>
          <span>Generated answer shown to user with safety-reviewed tone and persona behavior.</span>
        </div>
        <div class="mindmap-node output">
          <strong>Feedback loop</strong>
          <span>Live reviewer outcomes and satisfaction metrics are not connected to this workspace.</span>
        </div>
      </div>
    </div>
  `;
}

// A6: the Test route is the "Chạy thử & chấm điểm" page (ai-evals.js); the old status card stays as the fallback when the
// module is missing.
function renderTestDetail() {
  if (window.NilazaAiEvals) {
    window.NilazaAiEvals.mount($("#detail-content"));
    return;
  }
  const result = state.testRun || { title: "Chưa có lượt chạy thử nào với nhà cung cấp", body: "Muốn kiểm tra: gửi một yêu cầu thử từ app (đã đăng nhập) trên staging rồi xem ở Nhật ký AI. Mục này không tạo câu trả lời giả." };
  const metrics = result.metrics && typeof result.metrics === "object" ? result.metrics : null;
  $("#detail-content").innerHTML = `
    <div class="detail-layout">
      <div class="test-result">
        <p class="eyebrow">${escapeHtml(result.kind || "Tình trạng chạy thử")}</p>
        <h3>${escapeHtml(result.title)}</h3>
        <p>${escapeHtml(result.body)}</p>
      </div>
      ${metrics ? `<div class="test-result"><p class="eyebrow">Kết quả đo được</p><div class="mini-grid">${Object.entries(metrics).map(([key, value]) => `<div class="mini-card"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div></div>` : "<div class=\"test-result\"><p class=\"eyebrow\">Gọi nhà cung cấp</p><p>Lần kiểm tra này không gọi model, không ghi token, chi phí hay thời gian.</p></div>"}
    </div>
  `;
}

function renderVersionsDetail() {
  const current = feature();
  const hasLocalDraft = hasModelRouteDraft(current);
  const route = state.modelRouterRemoteRoutes.find((item) => item.feature === modelRouteFeatureId(current.id));
  const currentVersionActive = route?.status === "active" && !hasLocalDraft;
  const versionState = currentVersionActive ? "Đang chạy" : hasLocalDraft ? "Nháp trên trình duyệt" : route ? route.status : "Chưa tải";
  const versionLabel = hasLocalDraft ? `Nháp trên trình duyệt · ${current.version}` : route?.version || "Chưa tải chuỗi model từ máy chủ";
  const versionDescription = currentVersionActive
    ? `Backend active route: ${route.primary_provider}/${route.primary_model} (chuỗi model đang chạy trên máy chủ); định dạng ${route.response_schema}; tối đa ${route.max_output_tokens ?? "không rõ"} token đầu ra.`
    : hasLocalDraft
      ? "Bản nháp này chỉ ở trình duyệt, chưa phát hành. Chuỗi model trên máy chủ giữ nguyên."
      : "Chưa có lịch sử phiên bản ở đây. Chỉ khôi phục được khi máy chủ trả về các bản đã lưu trữ.";
  const routeHistory = (state.modelRouterHistory || []).filter((item) => item.feature === modelRouteFeatureId(current.id)).slice(0, 20);
  const promptHistory = current.id === "astrology" ? state.astrologyPromptHistory.slice(0, 20) : [];
  $("#detail-content").innerHTML = `
    <div class="detail-layout single">
      <div id="prompt-versions-all"></div>
      <h3>Chuỗi model và prompt Chiêm tinh</h3>
      <div class="version-list">
        <div class="version-row active">
          <div><strong>${escapeHtml(versionLabel)}</strong><br /><span>${escapeHtml(versionDescription)}</span></div>
          <span class="risk-chip ${currentVersionActive ? "low" : "medium"}">${escapeHtml(versionState)}</span>
        </div>
        <div class="version-row"><div><strong>Cặp prompt Chiêm tinh</strong><br /><span>Prompt VI và EN được phát hành cùng lúc ở mục Soạn prompt.</span></div><span>${promptHistory.length ? `${escapeHtml(String(promptHistory.filter((item) => item.status === "active").length))} ngôn ngữ đang chạy` : "Tải ở mục Soạn prompt"}</span></div>
        <h3>Lịch sử chuỗi model trên máy chủ</h3>
        ${routeHistory.length ? routeHistory.map((item) => `<div class="version-row"><div><strong>${escapeHtml(item.version)}</strong><br /><span>${escapeHtml(item.primary_provider)}/${escapeHtml(item.primary_model)} · định dạng ${escapeHtml(item.response_schema)} · ${escapeHtml(item.created_at || item.published_at || "")}</span></div><span class="risk-chip medium">${escapeHtml(item.status)}</span>${item.id && window.NilazaAdminSession?.capabilities?.includes("ai.manage") ? `<button class="button ghost" data-restore-route="${escapeHtml(item.id)}">Mở lại thành bản nháp mới</button>` : ""}</div>`).join("") : `<p>${state.modelRouterAdminResult ? "Máy chủ không trả về phiên bản đã lưu trữ nào." : "Tải lịch sử ở mục Chuỗi model đang chạy trước."}</p>`}
        ${current.id === "astrology" ? `<h3>Lịch sử prompt Chiêm tinh</h3>${promptHistory.length ? promptHistory.map((item) => `<div class="version-row"><div><strong>${escapeHtml(item.locale)} · ${escapeHtml(item.version)}</strong><br /><span>${escapeHtml(item.published_at || "")}</span></div><span class="risk-chip ${item.status === "active" ? "low" : "medium"}">${escapeHtml(item.status)}</span></div>`).join("") : "<p>Tải prompt Chiêm tinh từ máy chủ để xem lịch sử thật.</p>"}` : ""}
      </div>
    </div>
  `;
  mountPromptVersions("#prompt-versions-all", { mode: "all" });
}

function renderAuditDetail() {
  if (state.detail !== "traceExplorer") clearTraceQaPayload();
  const rows = Array.isArray(state.aiAdminAuditEvents) ? state.aiAdminAuditEvents : [];
  $("#detail-content").innerHTML = `
    <div class="detail-layout single">
      <div class="audit-list">
        <div class="audit-row"><div><strong>Lịch sử thao tác cấu hình AI</strong><br /><span>Thay đổi thật về công tắc, hạn mức, chuỗi model, prompt Chiêm tinh và các lần Owner mở dữ liệu QA. Nhật ký không bao giờ chứa nội dung prompt hay câu hỏi của người dùng.</span></div><button id="ai-audit-load" class="button ghost" ${state.aiAdminAuditBusy ? "disabled" : ""}>${state.aiAdminAuditBusy ? "Đang tải…" : "Tải thao tác gần đây"}</button></div>
        <p role="status">${escapeHtml(state.aiAdminAuditStatus)}</p>
        ${rows.length ? rows.map((item) => `<div class="audit-row"><div><strong>${escapeHtml(item.action || "")}</strong><br /><span>${escapeHtml(item.target_table || "")} · ${escapeHtml(item.created_at || "")}</span><details class="technical-details"><summary>Chi tiết kỹ thuật</summary><pre>${escapeHtml(JSON.stringify(item.metadata || {}, null, 2))}</pre></details></div><span class="risk-chip low">Đã ghi</span></div>`).join("") : `<div class="audit-row"><div><strong>Chưa tải thao tác nào</strong><br /><span>Tải các thao tác gần đây từ nhật ký được bảo vệ trên máy chủ.</span></div></div>`}
      </div>
    </div>
  `;
}

async function loadAiAdminAuditEvents() {
  if (!await window.NilazaRequireCapability?.("ai.read") || typeof window.NilazaAdminRpc !== "function") {
    state.aiAdminAuditStatus = "Không có quyền xem lịch sử thao tác AI"; renderAuditDetail(); return;
  }
  state.aiAdminAuditBusy = true;
  state.aiAdminAuditStatus = "Đang tải nhật ký thao tác…";
  renderAuditDetail();
  try {
    const data = await window.NilazaAdminRpc("get_ai_admin_audit_events", { limit_count: 100 }, "ai.read");
    state.aiAdminAuditEvents = Array.isArray(data) ? data : [];
    state.aiAdminAuditStatus = `${state.aiAdminAuditEvents.length} thao tác đã tải`;
  } catch (error) {
    state.aiAdminAuditStatus = "Không tải được lịch sử thao tác. Thử lại.";
  } finally {
    state.aiAdminAuditBusy = false;
    renderAuditDetail();
  }
}

function runTest() {
  const current = feature();
  if (current.id === "astrology") {
    state.testRun = {
      kind: "Cần chạy thử trên staging",
      title: "AI Studio chưa chạy thử với nhà cung cấp",
      body: "Nút chạy thử của Chiêm tinh không gọi máy chủ. Gửi một yêu cầu thử từ app (đã đăng nhập), rồi tìm mã yêu cầu đó trong Nhật ký AI. Ở đây không suy ra lượt gọi model, điểm đạt, token, chi phí hay thời gian."
    };
    state.detail = "test";
    $("#draft-status").textContent = "Không gọi nhà cung cấp";
    persistAiStudioUiState();
    renderDetail();
    return;
  }
  state.testRun = {
    kind: "Chưa kết nối",
    title: `${current.name}: chưa chạy thử với nhà cung cấp`,
    body: "Tính năng này chưa có điểm chạy thử trên staging trong AI Studio. Dùng nhật ký của một yêu cầu thật từ app; ở đây không suy ra điểm đạt, token, chi phí hay thời gian."
  };
  state.detail = "test";
  $("#draft-status").textContent = "Không gọi nhà cung cấp";
  persistAiStudioUiState();
  renderDetail();
}

function runOptimizer() {
  state.testRun = {
    kind: "Chưa kết nối",
    title: "Gợi ý cải thiện prompt chưa nối với lượt chạy thử thật",
    body: "Không tạo điểm hay mức hài lòng nào cho tới khi có chạy thử & chấm điểm thật (bước A6)."
  };
  $("#draft-status").textContent = "Gợi ý cải thiện chưa nối với chạy thử";
  state.detail = "optimization";
  persistAiStudioUiState();
  renderDetail();
}

async function openPublishModal() {
  if (publishActionForSurface() === "none") return;
  const trigger = document.activeElement;
  const review = createPublishReview(publishActionForSurface());
  if (!await window.NilazaRequireCapability?.("ai.manage")) { $("#draft-status").textContent = "Không có quyền phát hành (cần ai.manage)"; return; }
  if (!isPublishReviewCurrent(review)) { rejectChangedPublishReview(); return; }
  const action = review.action;
  if (action === "councilBlocked" || action === "modelBlocked") {
    $("#draft-status").textContent = publishLockedReason(action);
    return;
  }
  const astrologyPromptPublish = action === "astrologyPrompt";
  const modelCallPublish = action === "modelRoute";
  state.pendingPublish = review;
  const modelCallReady = isModelRouterAdminReady();
  const confirmButton = $("#confirm-publish");
  const payload = review.payload;
  const summary = $("#publish-summary");
  const warning = $("#publish-warning");
  $("#modal-title").textContent = modelCallPublish ? "Xem lại & phát hành model route" : astrologyPromptPublish ? "Xem lại & phát hành prompt Chiêm tinh (VI + EN)" : "Lưu nháp trên trình duyệt này?";
  const isPublish = modelCallPublish || astrologyPromptPublish;
  const environment = window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG";
  const environmentLine = $("#publish-environment");
  if (environmentLine) environmentLine.textContent = isPublish ? `Đang ghi vào: ${environment}` : `Không ghi lên máy chủ (${environment} giữ nguyên).`;
  const noteField = $("#publish-note-field");
  const note = $("#publish-note");
  if (noteField) noteField.hidden = !isPublish;
  if (note) note.value = "";
  let backendHost = "not configured";
  try { backendHost = new URL(window.ENV?.SUPABASE_URL || "").hostname || backendHost; } catch { /* keep safe fallback */ }
  const promptVi = astrologyPromptPublish ? payload.vi : "";
  const promptEn = astrologyPromptPublish ? payload.en : "";
  const promptReady = Boolean(state.astrologyPromptActive?.vi && state.astrologyPromptActive?.en
    && promptVi.trim().length >= 100 && promptEn.trim().length >= 100 && adminFunctionEndpoint("admin-astrology-prompt-config"));
  if (summary) summary.textContent = modelCallPublish
    ? `${payload.feature} · ${payload.primary.provider}/${payload.primary.model} · fallback ${payload.fallback?.provider || "none"}/${payload.fallback?.model || "none"} · temperature ${payload.temperature} · max output ${payload.maxTokens} · schema ${payload.responseSchema}. Version ${payload.version}. Target ${backendHost}.`
    : astrologyPromptPublish
      ? `Publish one atomic VI + EN pair to ${backendHost}. Vietnamese: ${promptVi.length} characters; English: ${promptEn.length} characters. Active versions: vi ${payload.expectedViVersion || "none"}, en ${payload.expectedEnVersion || "none"}. New version ${payload.version}.`
      : "Only this browser draft will be saved. The backend prompt and route will remain unchanged.";
  if (warning) warning.textContent = modelCallPublish
    ? "Provider health and response quality have not been tested by this publish. Use a synthetic staging request and check its end-to-end trace after publishing."
    : astrologyPromptPublish
      ? "This replaces the active Astrology prompt in both languages in one transaction. The backend appends its safety and JSON-schema instructions. No provider call is made."
      : "This action does not publish a prompt or activate a backend version.";
  state.publishConfirmBlocked = (modelCallPublish && !modelCallReady) || (astrologyPromptPublish && !promptReady);
  if (confirmButton) {
    confirmButton.textContent = modelCallPublish ? (modelCallReady ? "Phát hành route" : "Backend connector unavailable")
      : astrologyPromptPublish ? (promptReady ? "Phát hành cặp prompt" : "Load and review both prompts") : publishButtonLabels.browserDraft;
  }
  updatePublishConfirmState();
  $("#modal").hidden = false;
  state.publishFocusReturn = { element: trigger, id: trigger?.id || "" };
  $(".studio-shell").inert = true;
  $(".studio-shell").setAttribute("aria-hidden", "true");
  hideMentionMenu();
  $("#cancel-publish").focus();
}

function publishNoteRequired() {
  return state.pendingPublish?.action === "modelRoute" || state.pendingPublish?.action === "astrologyPrompt";
}

function publishNoteValue() {
  return String($("#publish-note")?.value || "").trim();
}

function updatePublishConfirmState() {
  const confirmButton = $("#confirm-publish");
  if (!confirmButton) return;
  confirmButton.disabled = state.publishConfirmBlocked || (publishNoteRequired() && publishNoteValue().length < 5);
}

function closePublishModal() {
  $("#modal").hidden = true;
  state.pendingPublish = null;
  $(".studio-shell").inert = false;
  $(".studio-shell").removeAttribute("aria-hidden");
  const trigger = state.publishFocusReturn;
  state.publishFocusReturn = null;
  const returnTarget = trigger?.element?.isConnected ? trigger.element : trigger?.id ? document.getElementById(trigger.id) : null;
  returnTarget?.focus();
}

async function confirmPublish() {
  const pending = state.pendingPublish;
  if (!await window.NilazaRequireCapability?.("ai.manage")) { closePublishModal(); $("#draft-status").textContent = "Không có quyền phát hành (cần ai.manage)"; return; }
  if (pending !== state.pendingPublish || $("#modal").hidden || !isPublishReviewCurrent(pending)) {
    rejectChangedPublishReview();
    return;
  }
  if (publishNoteRequired() && publishNoteValue().length < 5) {
    updatePublishConfirmState();
    $("#publish-note")?.focus();
    return;
  }
  // The publish functions do not accept a note yet; keep it with this session's status line.
  state.lastPublishNote = publishNoteRequired() ? publishNoteValue() : "";
  if (pending.action === "astrologyPrompt") {
    closePublishModal();
    await publishAstrologyPromptPair(pending);
    return;
  }
  if (pending.action === "modelRoute") {
    closePublishModal();
    await publishModelRouterConfig(pending);
    return;
  }
  persistFeatureDraft(feature(), state.detail === "prompt" ? "prompt" : "preview");
  $("#draft-status").textContent = "Đã lưu nháp trên trình duyệt này; máy chủ chưa thay đổi / Browser draft saved; backend configuration is unchanged";
  closePublishModal();
  state.detail = "versions";
  persistAiStudioUiState();
  renderAll();
}

function renderAll() {
  const focusedEditor = document.activeElement;
  const focusId = focusedEditor?.matches?.("input, select, textarea") ? focusedEditor.id : "";
  const selection = focusId && typeof focusedEditor.selectionStart === "number" ? [focusedEditor.selectionStart, focusedEditor.selectionEnd] : null;
  renderFeatures();
  renderHeader();
  renderDetail();
  if (focusId && !focusedEditor.isConnected && $("#modal").hidden) {
    const replacement = document.getElementById(focusId);
    replacement?.focus();
    if (selection && typeof replacement?.setSelectionRange === "function") { try { replacement.setSelectionRange(...selection); } catch { /* number inputs do not expose a text selection */ } }
  }
}

async function hydrateRemoteModelRoutesOnLoad() {
  if (!isModelRouterAdminReady()) return;
  await checkModelRouterConnection();
}

document.addEventListener("click", (event) => {
  const restoreRoute = event.target.closest("[data-restore-route]");
  if (restoreRoute) {
    const saved = state.modelRouterHistory.find(item => item.id === restoreRoute.dataset.restoreRoute && item.feature === modelRouteFeatureId(state.featureId));
    if (!saved || !window.NilazaAdminSession?.capabilities?.includes("ai.manage") || state.modelRouterLoadedScope !== modelRouteScope()) return;
    const current = feature();
    current.provider = saved.primary_provider; current.model = saved.primary_model;
    current.fallbackProvider = saved.fallback_provider || ""; current.fallbackModel = saved.fallback_model || "";
    current.temperature = Number(saved.temperature); current.maxOutputTokens = saved.max_output_tokens;
    current.fallbackWhen = saved.fallback_when || []; current.safetyPolicy = saved.safety_policy || {};
    // Preserve the current API schema: old schema versions require a separate migration review.
    persistFeatureDraft(current, "route");
    state.detail = "modelRouter"; state.nodeId = "model";
    renderAll();
    $("#draft-status").textContent = `Restored settings from ${saved.version} as a browser draft. Review and publish a new revision; active configuration is unchanged.`;
    return;
  }
  const graphNode = event.target.closest("[data-workflow-node]");
  const graphEdge = event.target.closest("[data-workflow-edge]");
  if (graphNode || graphEdge) {
    const kind = graphNode ? "node" : "edge";
    const id = (graphNode || graphEdge).dataset[graphNode ? "workflowNode" : "workflowEdge"];
    const graph = window.NilazaWorkflowCatalog?.getGraph?.(state.featureId);
    if (!(kind === "node" ? graph?.nodes : graph?.edges)?.some(item => item.id === id)) return;
    state.workflowSelection = { kind, id };
    refreshWorkflowGraph(`[data-workflow-${kind}="${id}"]`);
    return;
  }
  const graphControl = event.target.closest("[data-workflow-view]");
  if (graphControl) {
    const action = graphControl.dataset.workflowView;
    if (action === "inspect") {
      const inspector = $("#workflow-graph-inspector");
      inspector?.setAttribute("tabindex", "-1");
      inspector?.focus({ preventScroll: true });
      inspector?.scrollIntoView?.({ block: "start" });
      return;
    }
    if (action === "zoom-in") state.workflowGraphZoom = Math.min(1.5, state.workflowGraphZoom + 0.1);
    if (action === "zoom-out") state.workflowGraphZoom = Math.max(0.2, state.workflowGraphZoom - 0.1);
    if (action === "mode") state.workflowGraphMode = state.workflowGraphMode === "list" ? "graph" : "list";
    if (action === "fit") {
      state.workflowGraphMode = "graph";
      const viewport = $("#workflow-graph-viewport");
      const width = viewport?.clientWidth || $(".workflow-graph-panel")?.clientWidth;
      const height = viewport?.clientHeight || (window.innerWidth <= 720 ? 380 : 460);
      const graph = window.NilazaWorkflowCatalog?.getGraph?.(state.featureId);
      const bounds = graph && window.NilazaWorkflowView?.getBounds(graph);
      if (width && height && bounds) state.workflowGraphZoom = Math.max(0.2, Math.min(1, (width - 30) / bounds.width, (height - 30) / bounds.height));
    }
    refreshWorkflowGraph(`[data-workflow-view="${action}"]`, action === "fit");
    return;
  }
  if (event.target.closest("#workflow-open-traces")) { state.detail = "traceExplorer"; persistAiStudioUiState(); renderDetail(); return; }
  if (event.target.closest("#workflow-apply-trace")) { void applyWorkflowTrace(); return; }
  const detailShortcut = event.target.closest("[data-open-detail]");
  if (detailShortcut) { $(`.tab[data-detail="${detailShortcut.dataset.openDetail}"]`)?.click(); return; }
  const featureButton = event.target.closest("[data-feature]");
  if (featureButton) {
    clearTraceQaPayload();
    state.featureId = featureButton.dataset.feature;
    state.nodeId = state.detail === "modelRouter" ? "model" : state.detail === "prompt" ? "prompt" : "context";
    state.testRun = null;
    persistAiStudioUiState();
    renderAll();
    return;
  }

  const nodeButton = event.target.closest("[data-node]");
  if (nodeButton) {
    if (state.detail === "traceExplorer") clearTraceQaPayload();
    state.nodeId = nodeButton.dataset.node;
    state.detail = state.nodeId === "model" ? "modelRouter" : state.nodeId === "prompt" ? "prompt" : "payload";
    persistAiStudioUiState();
    renderHeader();
    renderDetail();
    if (state.detail === "prompt" && feature().id === "astrology" && !state.astrologyPromptActive) void loadAstrologyPromptConfig();
    return;
  }

  const personaButton = event.target.closest("[data-persona]");
  if (personaButton) {
    state.personaId = personaButton.dataset.persona;
    renderDetail();
    return;
  }

  const councilTemplateButton = event.target.closest("[data-council-template]");
  if (councilTemplateButton) {
    state.councilTemplateId = councilTemplateButton.dataset.councilTemplate;
    $("#draft-status").textContent = "Council template selected";
    renderDetail();
    return;
  }

  const tabButton = event.target.closest("[data-detail]");
  if (tabButton) {
    if (state.detail === "traceExplorer" && tabButton.dataset.detail !== "traceExplorer") {
      clearTraceQaPayload();
    }
    state.detail = tabButton.dataset.detail;
    state.nodeId = state.detail === "modelRouter" ? "model" : state.detail === "prompt" ? "prompt" : state.nodeId;
    persistAiStudioUiState();
    renderHeader();
    renderDetail();
    if (state.detail === "prompt" && feature().id === "astrology" && !state.astrologyPromptActive) void loadAstrologyPromptConfig();
    return;
  }

  if (event.target.closest("#astrology-prompt-load")) { void loadAstrologyPromptConfig(); return; }
  if (event.target.closest("#astrology-prompt-publish")) { openPublishModal(); return; }
  if (event.target.closest("#ai-audit-load")) { void loadAiAdminAuditEvents(); return; }

  if (event.target.closest("#trace-load")) {
    void loadTraceExplorer();
    return;
  }
  const traceButton = event.target.closest("[data-trace-id]");
  if (traceButton) {
    state.traceExplorerSelectedId = traceButton.dataset.traceId;
    state.traceExplorerDetail = null;
    clearTraceQaPayload();
    renderDetail();
    void loadTraceDetail(state.traceExplorerSelectedId);
    return;
  }
  if (event.target.closest("#trace-qa-load")) { void loadTraceQaPayload(); return; }
  if (event.target.closest("#trace-qa-clear")) {
    clearTraceQaPayload();
    state.traceExplorerStatus = "Đã ẩn dữ liệu QA";
    renderDetail();
    return;
  }

  const panelButton = event.target.closest("[data-panel]");
  if (panelButton) {
    document.querySelectorAll("[data-panel]").forEach((button) => button.classList.remove("active"));
    panelButton.classList.add("active");
    if (panelButton.dataset.panel === "test") runTest();
    if (panelButton.dataset.panel === "versions") {
      state.detail = "versions";
      persistAiStudioUiState();
      renderDetail();
    }
    if (panelButton.dataset.panel === "feedback") {
      state.detail = "feedback"; persistAiStudioUiState(); renderDetail();
    }
    if (panelButton.dataset.panel === "switches") {
      state.detail = "switches"; persistAiStudioUiState(); renderDetail();
    }
    if (panelButton.dataset.panel === "features") {
      state.detail = "aiFeatures"; persistAiStudioUiState(); renderAll();
    }
    if (panelButton.dataset.panel === "audit") {
      state.detail = "audit";
      persistAiStudioUiState();
      renderDetail();
    }
    if (panelButton.dataset.panel === "workflow") {
      state.detail = "payload";
      state.nodeId = "context";
      persistAiStudioUiState();
      renderDetail();
    }
    return;
  }

  if (event.target.closest("#oracle-preview-compile")) {
    state.oraclePreviewQuestion = $("#oracle-preview-question")?.value || "";
    compileOraclePreview();
    renderPromptDetail();
    return;
  }

  if (event.target.closest("#open-test")) runTest();
  const variableButton = event.target.closest("[data-insert-var]");
  if (variableButton) {
    insertApprovedVariable(variableButton.dataset.insertVar);
    return;
  }
  if (event.target.closest("#optimize-button")) {
    state.detail = "optimization";
    persistAiStudioUiState();
    renderDetail();
  }
  if (event.target.closest("#run-optimizer")) runOptimizer();
  if (event.target.closest("#council-load-config")) {
    loadCouncilAdminConfig();
    return;
  }
  if (event.target.closest("#council-publish-config")) {
    publishCouncilAdminConfig();
    return;
  }
  if (event.target.closest("#model-router-publish-config")) {
    if (reasoningBudgetProblem()) { $("#draft-status").textContent = reasoningBudgetProblem(); return; }
    openPublishModal();
    return;
  }
  if (event.target.closest("#model-router-check-connection")) {
    checkModelRouterConnection();
    return;
  }
  const mentionButton = event.target.closest("[data-mention-value]");
  if (mentionButton) {
    insertMention(mentionButton.dataset.mentionValue);
    return;
  }
  const setModelButton = event.target.closest("[data-set-model-provider]");
  if (setModelButton) {
    feature().provider = normalizeProviderId(setModelButton.dataset.setModelProvider);
    feature().model = setModelButton.dataset.setModel;
    persistFeatureDraft(feature(), "route");
    $("#draft-status").textContent = "Model route saved to draft";
    state.nodeId = "model";
    renderAll();
  }

  const addCustomModelButton = event.target.closest("[data-add-custom-model]");
  if (addCustomModelButton) {
    const providerName = addCustomModelButton.dataset.addCustomModel;
    const input = document.getElementById(`custom-model-${providerName}`);
    if (input && input.value.trim()) {
      const newModel = input.value.trim();
      if (!providerCatalog[providerName].models.includes(newModel)) {
        providerCatalog[providerName].models.push(newModel);
      }
      input.value = "";
      renderAll();
    }
    return;
  }

  const fetchModelsButton = event.target.closest("[data-fetch-models]");
  if (fetchModelsButton) {
    const providerName = fetchModelsButton.dataset.fetchModels;
    if (providerName === "openrouter") {
      fetchModelsButton.textContent = "Fetching...";
      fetchModelsButton.disabled = true;
      fetch("https://openrouter.ai/api/v1/models")
        .then(res => res.json())
        .then(data => {
          if (data && data.data) {
            const models = data.data.map(m => m.id);
            for (const m of models) {
              if (!providerCatalog.openrouter.models.includes(m)) {
                providerCatalog.openrouter.models.push(m);
              }
            }
            renderAll();
          }
        })
        .catch(err => {
          console.error(err);
          fetchModelsButton.textContent = "Failed to fetch";
          fetchModelsButton.disabled = false;
        });
    }
    return;
  }

  if (event.target.closest("#publish-button")) openPublishModal();
  if (event.target.closest("#close-modal") || event.target.closest("#cancel-publish")) closePublishModal();
  if (event.target.closest("#confirm-publish")) confirmPublish();
  if (event.target.closest("#reset-feature")) {
    state.nodeId = "context";
    state.detail = "payload";
    persistAiStudioUiState();
    renderAll();
  }
});

document.addEventListener("change", (event) => {
  if (["oracle-preview-locale", "oracle-preview-tone"].includes(event.target.id)) {
    if (event.target.id === "oracle-preview-locale") state.oraclePreviewLocale = event.target.value;
    else state.oraclePreviewTone = event.target.value;
    invalidateOraclePreview();
    renderDetail();
    document.getElementById(event.target.id)?.focus();
    return;
  }
  if (event.target.id === "trace-feature-filter") {
    state.traceExplorerFilter = event.target.value;
    state.traceExplorerRuns = [];
    state.traceExplorerDetail = null;
    clearTraceQaPayload();
    state.traceExplorerSelectedId = "";
    renderDetail();
    return;
  }
  if (event.target.id === "trace-status-filter") {
    state.traceExplorerStatusFilter = event.target.value;
    state.traceExplorerRuns = [];
    state.traceExplorerDetail = null;
    clearTraceQaPayload();
    renderDetail();
    return;
  }
  const fieldInput = event.target.closest("[data-field]");
  if (fieldInput) {
    const target = feature().fields.find((item) => item.id === fieldInput.dataset.field);
    if (target) target.enabled = fieldInput.checked;
    persistFeatureDraft(feature(), "context");
    $("#draft-status").textContent = "Draft saved just now";
    renderDetail();
  }
  const injectSelect = event.target.closest("[data-field-inject]");
  if (injectSelect) {
    const target = feature().fields.find((item) => item.id === injectSelect.dataset.fieldInject);
    if (target) target.inject = injectSelect.value;
    persistFeatureDraft(feature(), "context");
    $("#draft-status").textContent = "Context prompt mapping saved";
    renderDetail();
  }
  if (event.target.id === "provider-select") {
    const current = feature();
    current.provider = normalizeProviderId(event.target.value);
    current.model = providerCatalog[current.provider].models[0];
    persistFeatureDraft(current, "route");
    $("#draft-status").textContent = "Primary provider saved to draft";
    renderAll();
  }
  if (event.target.id === "model-select") {
    feature().model = event.target.value;
    persistFeatureDraft(feature(), "route");
    $("#draft-status").textContent = "Primary model saved to draft";
    renderAll();
  }
  if (event.target.id === "fallback-provider-select") {
    const current = feature();
    current.fallbackProvider = normalizeProviderId(event.target.value);
    current.fallbackModel = providerCatalog[current.fallbackProvider]?.models[0] || "";
    persistFeatureDraft(current, "route");
    $("#draft-status").textContent = "Fallback provider saved to draft";
    renderAll();
  }
  if (event.target.id === "fallback-model-select") {
    feature().fallbackModel = event.target.value;
    persistFeatureDraft(feature(), "route");
    $("#draft-status").textContent = "Fallback model saved to draft";
    renderAll();
  }
  if (event.target.id === "model-temperature" || event.target.id === "max-output-tokens") {
    const current = feature();
    const value = Number(event.target.value);
    const isTemperature = event.target.id === "model-temperature";
    const minimum = isTemperature ? 0 : 64;
    const maximum = isTemperature ? 2 : 8192;
    if (!Number.isFinite(value) || value < minimum || value > maximum) {
      event.target.setCustomValidity(`Enter a value from ${minimum} to ${maximum}.`);
      event.target.reportValidity();
      return;
    }
    event.target.setCustomValidity("");
    if (isTemperature) current.temperature = value;
    else current.maxOutputTokens = Math.trunc(value);
    persistFeatureDraft(current, "route");
    $("#draft-status").textContent = "Model route settings saved to browser draft";
    renderHeader();
    renderDetail();
  }
  if (event.target.id === "reasoning-mode" || event.target.id === "reasoning-max-tokens") {
    const current = feature();
    const { reasoning: previous, ...policy } = current.safetyPolicy || {};
    const mode = event.target.id === "reasoning-mode" ? event.target.value : previous?.mode;
    const capText = event.target.id === "reasoning-max-tokens" ? event.target.value.trim() : String(previous?.maxTokens ?? "");
    const cap = Number(capText);
    if (capText && (!Number.isInteger(cap) || cap < 64 || cap > 8192)) {
      event.target.setCustomValidity("Enter a whole number from 64 to 8192, or leave it empty.");
      event.target.reportValidity();
      return;
    }
    event.target.setCustomValidity("");
    current.safetyPolicy = mode
      ? { ...policy, reasoning: mode !== "off" && capText ? { mode, maxTokens: cap } : { mode } }
      : policy;
    persistFeatureDraft(current, "route");
    $("#draft-status").textContent = "Hidden reasoning saved to browser draft";
    renderHeader();
    renderDetail();
  }
  const councilSetting = event.target.closest("[data-council-setting]");
  if (councilSetting) {
    const template = selectedCouncilTemplate();
    const key = councilSetting.dataset.councilSetting;
    template[key] = key === "maxGuides" ? Number(councilSetting.value) : councilSetting.value;
    $("#draft-status").textContent = "Council preview updated in memory only; publishing is disabled";
    renderDetail();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "publish-note") { updatePublishConfirmState(); return; }
  if (event.target.id === "oracle-preview-question") {
    state.oraclePreviewQuestion = event.target.value;
    invalidateOraclePreview();
    const output = $("#oracle-compiled-output");
    if (output) output.textContent = "Sample changed; compile the preview again. No provider request was made.";
    return;
  }
  if (event.target.matches("[data-astrology-prompt]")) {
    const language = event.target.dataset.astrologyPrompt;
    state.astrologyPromptDraft = { ...(state.astrologyPromptDraft || {}), [language]: event.target.value };
    try { localStorage.setItem("nilaza.admin.astrologyPromptDraft.v1", JSON.stringify(state.astrologyPromptDraft)); } catch { /* browser draft is best effort */ }
    const saveButton = $("#astrology-prompt-publish");
    const valid = String(state.astrologyPromptDraft.vi || "").trim().length >= 100 && String(state.astrologyPromptDraft.en || "").trim().length >= 100;
    if (saveButton) saveButton.disabled = !valid;
    const draftState = $("#astrology-prompt-draft-state");
    if (draftState) draftState.textContent = "Unsaved browser draft · backend prompt is unchanged";
    $("#draft-status").textContent = "Astrology prompt browser draft saved";
    reportAiStudioUnsaved();
    return;
  }
  if (event.target.id === "trace-query") {
    state.traceExplorerQuery = event.target.value;
    return;
  }
  if (event.target.matches("[data-search-provider]")) {
    const providerName = event.target.dataset.searchProvider;
    const list = document.getElementById(`model-list-${providerName}`);
    if (list) {
      const query = event.target.value.toLowerCase();
      const buttons = list.querySelectorAll("button");
      buttons.forEach(btn => {
        const modelName = btn.dataset.setModel.toLowerCase();
        if (modelName.includes(query)) {
          btn.style.display = "";
        } else {
          btn.style.display = "none";
        }
      });
    }
    return;
  }
});

document.addEventListener("keydown", (event) => {
  if (!$("#modal").hidden) {
    if (event.key === "Escape") { event.preventDefault(); closePublishModal(); return; }
    if (event.key === "Tab") {
      const controls = [...$("#publish-dialog").querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(control => !control.closest("[hidden]"));
      const first = controls[0] || $("#publish-dialog");
      const last = controls.at(-1) || first;
      if (event.shiftKey && (document.activeElement === first || !$("#publish-dialog").contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !$("#publish-dialog").contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
    return;
  }
  const graphItem = event.target.closest?.("[data-workflow-node], [data-workflow-edge]");
  if (graphItem && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    graphItem.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return;
  }
  const activeTab = event.target.closest?.('[role="tab"]');
  if (activeTab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 :
      (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  }
  if (event.key === "Escape") hideMentionMenu();
  if (event.key === "Enter" && !$("#mention-menu").hidden) {
    const first = $("#mention-menu [data-mention-value]");
    if (first) {
      event.preventDefault();
      insertMention(first.dataset.mentionValue);
    }
  }
});

window.NilazaUnsaved?.setWorkspace("ai-studio");
// env-band.js is deferred and runs after this script; refresh the "Đang ghi vào" label once it is available.
document.addEventListener("DOMContentLoaded", () => {
  const target = $("#environment-status");
  if (target) target.textContent = `Đang ghi vào: ${window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG"}`;
}, { once: true });
window.addEventListener("hashchange", restoreStudioRoute);
if (Object.hasOwn(studioRouteDetails, location.hash.slice(1).split("?")[0])) restoreStudioRoute();
else renderAll();
void loadSharedPromptCompiler();
void hydrateRemoteModelRoutesOnLoad();
