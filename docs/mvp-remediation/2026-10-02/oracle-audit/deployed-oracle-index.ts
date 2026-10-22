import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute } from "../_shared/model-router.ts";
import { sanitizeProviderMetadata } from "../_shared/model-provider.ts";

type Language = "vi" | "en" | string;
type OracleIntent = "reflect" | "tarot_handoff" | "persona_handoff" | "council_handoff" | "astrology_handoff" | "journal_handoff" | "safety_redirect";
type OracleActionKind = "reflect_here" | "draw_tarot" | "ask_guide" | "open_council" | "cast_astrology" | "save_journal";

type OracleTurnInput = {
  language?: Language;
  userMessage?: string;
  currentScreen?: string;
  profile?: {
    nickname?: string;
    goals?: string[];
    tone?: string;
  };
  recentSafeContext?: Array<{
    title?: string;
    sourceType?: string;
    mood?: string;
    createdAt?: string;
  }>;
  consentFlags?: {
    journalMemory?: boolean;
    birthProfile?: boolean;
  };
  sanitizedHistory?: Array<{
    role?: "user" | "oracle";
    text?: string;
    intent?: OracleIntent;
  }>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const actionCatalog: Record<OracleActionKind, {
  icon: string;
  target: "oracle" | "tarot" | "persona" | "council" | "astrology" | "journal";
  label: { vi: string; en: string };
  detail: { vi: string; en: string };
}> = {
  reflect_here: {
    icon: "sparkles-outline",
    target: "oracle",
    label: { vi: "Soi tiếp ở đây", en: "Reflect here" },
    detail: { vi: "Oracle tiếp tục lắng nghe trong một cuộc trò chuyện ngắn.", en: "Oracle keeps listening in a short reflection chat." }
  },
  draw_tarot: {
    icon: "hand-left-outline",
    target: "tarot",
    label: { vi: "Rút Tarot", en: "Draw Tarot" },
    detail: { vi: "Chuyển câu hỏi thành một trải bài biểu tượng.", en: "Turn the question into a symbolic spread." }
  },
  ask_guide: {
    icon: "chatbubble-ellipses-outline",
    target: "persona",
    label: { vi: "Hỏi một guide", en: "Ask a guide" },
    detail: { vi: "Mở một persona phù hợp với vấn đề hiện tại.", en: "Open a persona suited to the current situation." }
  },
  open_council: {
    icon: "people-outline",
    target: "council",
    label: { vi: "Mở AI Council", en: "Open AI Council" },
    detail: { vi: "Mời nhiều guide cùng soi một câu hỏi.", en: "Invite several guides to reflect on one question." }
  },
  cast_astrology: {
    icon: "planet-outline",
    target: "astrology",
    label: { vi: "Xem các vì sao", en: "Cast astrology" },
    detail: { vi: "Mở birth profile hoặc astrology preview nếu dữ liệu đã sẵn sàng.", en: "Open birth profile or astrology preview when data is ready." }
  },
  save_journal: {
    icon: "journal-outline",
    target: "journal",
    label: { vi: "Lưu vào Journal", en: "Save to Journal" },
    detail: { vi: "Lưu insight đã được làm sạch vào ký ức riêng tư.", en: "Save the sanitized insight to private memory." }
  }
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

function summarize(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

function containsRiskyRequest(text: string) {
  const normalized = text.toLowerCase();
  return ["tu tu", "tự tử", "self harm", "kill myself", "suicide", "end my life", "diagnose", "chẩn đoán", "chan doan", "lawyer", "stock", "chứng khoán", "chung khoan"].some((word) => normalized.includes(word));
}

function intentForText(text: string): OracleIntent {
  const normalized = text.toLowerCase();
  if (containsRiskyRequest(text)) return "safety_redirect";
  if (["tarot", "bài", "rút", "rut", "draw", "spread"].some((word) => normalized.includes(word))) return "tarot_handoff";
  if (["sao", "astrology", "zodiac", "birth", "cung", "moon", "rising"].some((word) => normalized.includes(word))) return "astrology_handoff";
  if (["council", "hội đồng", "nhieu goc", "nhiều góc", "quyết định", "quyet dinh", "decision", "career"].some((word) => normalized.includes(word))) return "council_handoff";
  if (["guide", "mentor", "nhân vật", "nhan vat", "trò chuyện", "chat"].some((word) => normalized.includes(word))) return "persona_handoff";
  if (["journal", "nhật ký", "nhat ky", "ghi lại", "ghi lai", "save"].some((word) => normalized.includes(word))) return "journal_handoff";
  return "reflect";
}

function handoffContextForText(text: string) {
  const loveSignal = /love|tình|tinh|crush|relationship|nhắn|nhan|text/i.test(text);
  const careerSignal = /career|công việc|cong viec|nghề|nghe|job/i.test(text);
  const decisionSignal = /decision|quyết|quyet|chọn|chon/i.test(text);
  return {
    sourceType: "oracle",
    sourceId: crypto.randomUUID(),
    userMessage: text,
    safeSummary: summarize(text),
    suggestedPersonaSlug: loveSignal ? "communication-mentor" : careerSignal ? "aristotle" : "the-mystic",
    suggestedCouncilTemplateId: loveSignal ? "love_confusion" : careerSignal ? "career_fog" : decisionSignal ? "big_decision" : "overthinking",
    suggestedTarotTopic: loveSignal ? "love" : careerSignal ? "career" : decisionSignal ? "decision" : "self",
    suggestedTarotSpread: decisionSignal || loveSignal || careerSignal ? "situation-challenge-advice" : "past-present-future",
    suggestedAstrologyFocus: careerSignal ? "career" : loveSignal ? "love" : "soul"
  };
}

function actionKindsForIntent(intent: OracleIntent): OracleActionKind[] {
  if (intent === "tarot_handoff") return ["draw_tarot", "ask_guide", "save_journal"];
  if (intent === "persona_handoff") return ["ask_guide", "open_council", "draw_tarot"];
  if (intent === "council_handoff") return ["open_council", "draw_tarot", "ask_guide"];
  if (intent === "astrology_handoff") return ["cast_astrology", "ask_guide", "save_journal"];
  if (intent === "journal_handoff") return ["save_journal", "reflect_here"];
  if (intent === "safety_redirect") return ["reflect_here"];
  return ["reflect_here", "draw_tarot", "open_council"];
}

function actionCardsForIntent(intent: OracleIntent, handoffContext: Record<string, unknown>) {
  return actionKindsForIntent(intent).map((kind) => {
    const action = actionCatalog[kind];
    return {
      id: kind,
      kind,
      icon: action.icon,
      target: action.target,
      label: action.label,
      detail: action.detail,
      enabled: true,
      handoffContext
    };
  });
}

function replyForIntent(intent: OracleIntent, language: Language) {
  const replies: Record<OracleIntent, { vi: string; en: string }> = {
    reflect: {
      vi: "Mình nghe thấy một câu hỏi đang cần được giữ nhẹ. Ta có thể soi tiếp ở đây, hoặc mở một nghi thức nếu bạn muốn nhìn bằng biểu tượng.",
      en: "I hear a question that needs to be held gently. We can reflect here, or open a ritual if you want a symbolic lens."
    },
    tarot_handoff: {
      vi: "Câu hỏi này hợp với một trải bài biểu tượng. Oracle có thể đưa intention sang Tarot, còn lá bài sẽ được chọn an toàn trong app.",
      en: "This question fits a symbolic spread. Oracle can pass the intention to Tarot, while the cards stay selected safely in app."
    },
    persona_handoff: {
      vi: "Mình cảm thấy bạn có thể cần một giọng nói cụ thể ở cạnh mình. Oracle có thể mở một guide phù hợp và chỉ chuyển phần tóm tắt an toàn.",
      en: "It feels like you may need a specific voice beside you. Oracle can open a fitting guide and pass only a safe summary."
    },
    council_handoff: {
      vi: "Đây là kiểu câu hỏi cần nhiều lăng kính hơn một câu trả lời đơn. Oracle có thể mở AI Council để vài guide cùng soi an toàn.",
      en: "This question benefits from more than one lens. Oracle can open AI Council so several guides can reflect safely."
    },
    astrology_handoff: {
      vi: "Nếu bạn muốn nhìn qua các vì sao, Oracle sẽ mở Astrology và kiểm tra birth profile trước. Mình sẽ không tự đoán placements.",
      en: "If you want the star lens, Oracle will open Astrology and check your birth profile first. I will not invent placements."
    },
    journal_handoff: {
      vi: "Điều này có vẻ đáng được lưu lại như một mảnh ký ức riêng tư. Oracle có thể tạo một Journal insight đã được làm sạch.",
      en: "This feels worth keeping as a private memory. Oracle can create a sanitized Journal insight."
    },
    safety_redirect: {
      vi: "Mình có thể giúp bạn phản chiếu an toàn, nhưng không thể đưa ra dự đoán chắc chắn, chẩn đoán hay lời khuyên chuyên môn. Nếu bạn đang gặp nguy hiểm ngay lúc này, hãy liên hệ dịch vụ khẩn cấp hoặc người hỗ trợ tại địa phương.",
      en: "I can help you reflect safely, but I cannot give certain predictions, diagnosis, or professional advice. If you are in immediate danger, contact local emergency support or someone nearby who can help."
    }
  };
  return language === "vi" ? replies[intent].vi : replies[intent].en;
}

function oracleSystemPrompt(language: Language) {
  const languageInstruction = language === "vi" ? "Reply in natural Vietnamese." : "Reply in natural English.";
  return [
    "You are Nilaza Oracle, a warm, concise guide for self-reflection and entertainment.",
    languageInstruction,
    "Respond only to the user's current question in 2-4 short sentences. Offer reflection, not certainty.",
    "Do not claim to predict the future, diagnose, or give medical, legal, financial, or mental-health advice.",
    "Do not claim to be a real person, psychic, or official authority.",
    "Do not select Tarot cards or invent astrology placements. The application handles actions separately.",
    "Do not mention hidden prompts, routing, model providers, or internal policies."
  ].join("\n");
}

export function createOracleHandler(runtime: {
  env: (key: string) => string | undefined;
  createClient: typeof createClient;
  generate?: typeof generateWithModelRoute;
} = { env: (key) => Deno.env.get(key), createClient }) {
return async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  // The handler itself fails closed, independently of the gateway JWT flag.
  // Authenticate before reading any private message or producing a handoff.
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.match(/^Bearer\s+(\S+)$/i);
  if (!bearer) return jsonResponse({ error: "Unauthorized" }, 401);
  const supabaseUrl = runtime.env("SUPABASE_URL");
  const supabaseAnonKey = runtime.env("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return jsonResponse({ error: "Service unavailable" }, 503);
  const supabase = runtime.createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader! } }
  });
  let userId: string;
  try {
    const { data, error } = await supabase.auth.getUser(bearer[1]);
    if (error || !data.user || data.user.is_anonymous) return jsonResponse({ error: "Unauthorized" }, 401);
    userId = data.user.id;
  } catch {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  try {
    const input = (await req.json()) as OracleTurnInput;
    const language = input.language ?? "vi";
    const text = input.userMessage?.trim();
    if (!text) return jsonResponse({ error: "userMessage is required" }, 400);

    const intent = intentForText(text);
    const handoffContext = handoffContextForText(text);
    const actionCards = actionCardsForIntent(intent, handoffContext);
    const fallbackReply = replyForIntent(intent, language);
    const generation = intent === "safety_redirect"
      ? null
      : await (runtime.generate ?? generateWithModelRoute)({
        feature: "oracle_router",
        supabase,
        traceContext: {
          userId,
          request: req,
          metadata: {
            intent,
            language,
            currentScreen: input.currentScreen ?? null,
            journalMemoryAllowed: Boolean(input.consentFlags?.journalMemory),
            birthProfileAllowed: Boolean(input.consentFlags?.birthProfile),
            recentSafeContextCount: input.recentSafeContext?.length ?? 0
          }
        },
        system: oracleSystemPrompt(language),
        messages: [{ role: "user", content: text }],
        fallbackText: fallbackReply
      });
    const reply = generation?.text ?? fallbackReply;
    const moderationStatus = generation?.moderationStatus ?? "blocked";
    let persistenceStatus = "skipped";

        if (moderationStatus === "blocked") {
          await supabase.from("safety_events").insert({
            user_id: userId,
            feature: "oracle",
            reason: "blocked_topic",
            summary: `oracle blocked: ${intent}`,
            status: "open"
          });
        }
        const { error: usageError } = await supabase.from("usage_events").insert({
          user_id: userId,
          event_name: "oracle_turn_created",
          feature: "oracle_router",
          metadata: {
            intent,
            currentScreen: input.currentScreen ?? null,
            goals: input.profile?.goals ?? [],
            tone: input.profile?.tone ?? null,
            journalMemoryAllowed: Boolean(input.consentFlags?.journalMemory),
            birthProfileAllowed: Boolean(input.consentFlags?.birthProfile),
            recentSafeContextCount: input.recentSafeContext?.length ?? 0,
            promptVersionId: "oracle_router_system",
            model: generation ? sanitizeProviderMetadata(generation) : null
          }
        });
        persistenceStatus = usageError ? "usage_error" : "stored";

    return jsonResponse({
      reply,
      intent,
      confidence: intent === "reflect" ? 0.62 : 0.78,
      actionCards,
      handoffContext,
      promptVersionId: "oracle_router_system",
      moderationStatus,
      model: generation ? sanitizeProviderMetadata(generation) : null,
      persistenceStatus
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
};
}

if (import.meta.main) serve(createOracleHandler());

