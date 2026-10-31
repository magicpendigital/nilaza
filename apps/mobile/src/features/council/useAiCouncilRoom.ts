import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";

import type { ChatParticipant } from "../../a2ui";
import { BackendLimitError, BackendOptions, generateAiCouncilTurn, getChatSessions, getChatMessages } from "../../backendClient";
import { oracleSafetyReply, oracleSafetySignal } from "../../../../../packages/ai-contracts/oracle-safety.mjs";
import { localizedList, localizedText } from "../../i18n";
import type { AccountStorage } from "../../auth/accountStorage";
import { mergeById } from "../../auth/personalData";
import { AiCouncilConfig, AiCouncilTemplate, GenerationActivity, JournalEntry, Language, LocalizedText, Persona, Profile } from "../../types";
import type { AiCouncilGuideDetail, AiCouncilQuickReply, AiCouncilRoomProps, AiCouncilSessionSummary, AiCouncilSynthesis, AiCouncilTurn } from "./AiCouncilRoom";

type TrackFn = (name: string, metadata?: Record<string, string | number | boolean>) => void;

type UseAiCouncilRoomOptions = {
  backendAvailable: boolean;
  storage: AccountStorage;
  accountReady: boolean;
  backendOptions: BackendOptions;
  config: AiCouncilConfig;
  getPersonaThumbnail: (persona: Persona) => ImageSourcePropType;
  language: Language;
  onFeedback: (text: string) => void;
  onGenerationFinished?: (activity: GenerationActivity, status: "ready" | "failed") => void;
  onGenerationStarted?: () => GenerationActivity;
  onSave: (entry: Omit<JournalEntry, "id" | "createdAt">) => void;
  onTrack: TrackFn;
  personas: Persona[];
  personasById: Record<string, Persona>;
  profile: Profile;
  /** Which personas the account may invite; defaults to free personas only. */
  canUsePersona?: (persona: Persona) => boolean;
};

type UseAiCouncilRoomResult = {
  roomProps: Omit<AiCouncilRoomProps, "onBack" | "onOpenGuideChat">;
};

const setupCollapsedStorageKey = "nilaza.aiCouncilSetupCollapsed";

const customCouncilStorageKey = "nilaza.aiCouncilCustom.v1";
const maxStoredSessions = 20;
const nowId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type StoredAiCouncilTurn = Omit<AiCouncilTurn, "persona"> & {
  personaId?: string;
};

type StoredAiCouncilSession = {
  id: string;
  turns?: StoredAiCouncilTurn[];
  createdAt: string;
  customCouncil?: StoredCustomCouncil | null;
  followUps: string[];
  guestPersonaIds: string[];
  templateId: string;
  title: string;
  guideCount: number;
  turnCount: number;
  updatedAt: string;
  synthesis?: AiCouncilSynthesis | null;
};

type StoredCustomCouncil = {
  id: string;
  name: string;
  personaIds: string[];
  templateId: string;
  tone: string;
  updatedAt: string;
};

const containsRiskyRequest = (text: string) => {
  const normalized = text.toLowerCase();
  return ["tự tử", "tu tu", "self harm", "diagnose", "chẩn đoán", "chan doan", "lawyer", "stock", "chứng khoán", "chung khoan"].some((word) =>
    normalized.includes(word)
  );
};

function personaTraitLabel(value: string, language: Language) {
  const labels: Record<string, LocalizedText> = {
    anxiety: { vi: "lo âu", en: "anxiety" },
    calm: { vi: "bình tâm", en: "calm" },
    career: { vi: "sự nghiệp", en: "career" },
    communication: { vi: "giao tiếp", en: "communication" },
    conflict: { vi: "xung đột", en: "conflict" },
    control: { vi: "kiểm soát", en: "control" },
    daily: { vi: "hằng ngày", en: "daily" },
    decision: { vi: "quyết định", en: "decision" },
    discipline: { vi: "kỷ luật", en: "discipline" },
    empathy: { vi: "thấu cảm", en: "empathy" },
    ethics: { vi: "đạo đức", en: "ethics" },
    flow: { vi: "dòng chảy", en: "flow" },
    gentle: { vi: "dịu", en: "gentle" },
    grounded: { vi: "vững", en: "grounded" },
    habits: { vi: "thói quen", en: "habits" },
    inner_peace: { vi: "bình an", en: "inner peace" },
    journaling: { vi: "journal", en: "journaling" },
    letting_go: { vi: "buông bỏ", en: "letting go" },
    love: { vi: "tình cảm", en: "love" },
    practical: { vi: "thực tế", en: "practical" },
    purpose: { vi: "mục đích", en: "purpose" },
    quiet: { vi: "tĩnh", en: "quiet" },
    reflective: { vi: "chiêm nghiệm", en: "reflective" },
    relational: { vi: "quan hệ", en: "relational" },
    relationships: { vi: "quan hệ", en: "relationships" },
    resilience: { vi: "bền bỉ", en: "resilience" },
    self_care: { vi: "tự chăm sóc", en: "self care" },
    spiritual: { vi: "tâm linh", en: "spiritual" },
    strategy: { vi: "chiến lược", en: "strategy" },
    strategic: { vi: "chiến lược", en: "strategic" },
    supportive: { vi: "nâng đỡ", en: "supportive" },
    warm: { vi: "ấm áp", en: "warm" },
    wisdom: { vi: "minh triết", en: "wisdom" }
  };
  return localizedText(labels[value], language, value.replace(/_/g, " "));
}

function personaGoalScore(persona: Persona, profile: Profile) {
  const signals = new Set([...persona.themes, ...persona.tone, persona.slug]);
  const goalMap: Record<string, string[]> = {
    career: ["career", "strategy", "decision", "purpose", "discipline", "practical"],
    curious: ["spiritual", "wisdom", "flow", "poetic"],
    daily: ["daily", "calm", "grounded", "reflective", "practical"],
    healing: ["healing", "calm", "self_care", "inner_peace", "gentle", "supportive"],
    love: ["relationships", "communication", "empathy", "love", "relational"],
    self: ["purpose", "habits", "ethics", "inner_peace", "journaling", "reflective"]
  };

  return profile.goals.reduce((score, goal) => score + (goalMap[goal] ?? []).filter((signal) => signals.has(signal)).length, 0);
}

function recommendedPersonasForProfile(profile: Profile, personas: Persona[]) {
  return [...personas]
    .map((persona) => ({ persona, score: personaGoalScore(persona, profile) }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 3)
    .map((item) => item.persona);
}

function personaRoleLabel(persona: Persona, language: Language) {
  if (persona.displayRole) return localizedText(persona.displayRole, language);
  if (persona.type === "book_inspired_guide") {
    return language === "vi" ? "Người dẫn đường theo chủ đề sách" : "Book-inspired guide";
  }
  return localizedText(persona.sourceInspiration, language, persona.type);
}

function personaConversationLens(persona: Persona, language: Language) {
  if (persona.displayRole) return localizedText(persona.displayRole, language);
  const traits = [...persona.tone, ...persona.themes].slice(0, 2).map((item) => personaTraitLabel(item, language));
  if (traits.length) return traits.join(language === "vi" ? " và " : " and ");
  return personaRoleLabel(persona, language);
}

function councilTemplateById(config: AiCouncilConfig, id?: string) {
  return config.councilTemplates.find((template) => template.id === id) ?? config.councilTemplates.find((template) => template.id === config.defaultTemplateId) ?? config.councilTemplates[0];
}

function councilPersonasForProfile(config: AiCouncilConfig, personas: Persona[], profile: Profile, template?: AiCouncilTemplate) {
  const recommended = recommendedPersonasForProfile(profile, personas);
  const templateSlugs = template?.roster.map((member) => member.personaSlug) ?? [];
  const configuredSlugs = [...templateSlugs, ...config.defaultPersonaSlugs, ...config.fallbackPersonaSlugs];
  const fallback = configuredSlugs
    .map((slug) => personas.find((persona) => persona.slug === slug))
    .filter(Boolean) as Persona[];
  const unique = [...fallback, ...recommended].filter((persona, index, list) => list.findIndex((item) => item.id === persona.id) === index);
  return unique.slice(0, Math.min(template?.maxGuides ?? config.maxGuidesPerTurn, config.maxGuidesPerTurn));
}

function buildCouncilTemplatePayload(template: AiCouncilTemplate, selectedPersonas: Persona[]) {
  const rosterRoleBySlug = template.roster.reduce<Record<string, string>>((acc, member) => {
    acc[member.personaSlug] = member.role;
    return acc;
  }, {});
  return {
    id: template.id,
    meetingMode: template.meetingMode,
    synthesisMode: template.synthesisMode,
    maxGuidesPerTurn: Math.max(template.maxGuides, selectedPersonas.length),
    guideRoles: selectedPersonas.map((persona) => ({
      personaId: persona.id,
      personaSlug: persona.slug,
      role: rosterRoleBySlug[persona.slug] ?? "guest_guide"
    })),
    outputContract: template.outputContract
  };
}

function buildCouncilReply(config: AiCouncilConfig, persona: Persona, question: string, language: Language, index: number, template?: AiCouncilTemplate) {
  const lens = personaConversationLens(persona, language).toLowerCase();
  const templateCue = template ? localizedText(template.name, language) : "AI Council";
  const trimmedQuestion = question.trim();
  const shortQuestion = trimmedQuestion.length > 100 ? `${trimmedQuestion.slice(0, 100)}...` : trimmedQuestion;
  const responseModes = language === "vi"
    ? [
      `Nếu nhìn qua ${lens}, điều quan trọng không phải là tìm câu trả lời tuyệt đối, mà là gọi tên tiêu chí đang dẫn dắt bạn.`,
      `Mình sẽ bắt đầu từ sự tôn trọng: điều gì trong chuyện này cần được nói rõ, nhưng vẫn giữ lòng mềm với chính bạn và người khác?`,
      `Hãy giảm lực ép xuống một nấc. Một bước nhỏ, đủ thật, thường mở đường tốt hơn một kết luận quá lớn.`
    ]
    : [
      `Through ${lens}, the important move is not to force a final answer, but to name the criteria guiding you.`,
      `I would begin with respect: what needs to be said clearly while staying gentle with yourself and the other person?`,
      `Lower the pressure by one step. A small honest move often opens more than a grand conclusion.`
    ];
  const action = language === "vi"
    ? `Bước tiếp theo: viết một câu về "${shortQuestion || "vấn đề này"}" theo dạng "Điều mình biết / điều mình chưa biết / điều mình có thể thử".`
    : `Next step: write one line about "${shortQuestion || "this situation"}" as "what I know / what I do not know / what I can try".`;

  return {
    persona,
    text: `${responseModes[index % responseModes.length]} ${language === "vi" ? `Trong ${templateCue}, ` : `In ${templateCue}, `}${action}`,
    lens,
    promptVersionId: config.contract.promptVersionId
  };
}

function buildFallbackSynthesis(language: Language): AiCouncilSynthesis {
  return {
    consensus: language === "vi"
      ? "Các guide cùng mời bạn tách điều biết rõ khỏi điều còn thiếu."
      : "The guides invite you to separate what is known from what is missing.",
    tensions: [language === "vi" ? "Chưa đủ dữ kiện để kết luận thay bạn." : "There is not enough context to conclude for you."],
    assumptions: [language === "vi" ? "Đây là phản chiếu, không phải dự đoán chắc chắn." : "This is reflection, not a certain prediction."],
    nextStep: language === "vi" ? "Thử một bước nhỏ trong 24 giờ tới." : "Try one small step in the next 24 hours.",
    reflectionQuestion: language === "vi" ? "Bạn cần biết thêm điều gì trước khi quyết định?" : "What do you need to know before deciding?"
  };
}

export function councilRoleLabel(role: string | undefined, language: Language) {
  const labels: Record<string, LocalizedText> = {
    chair: { vi: "Chủ tọa", en: "Chair" },
    moderator: { vi: "Lắng nghe trước", en: "Listens first" },
    mirror: { vi: "Nhìn chậm lại", en: "Slows things down" },
    practical_reasoner: { vi: "Cân nhắc thực tế", en: "Weighs the practical" },
    translator: { vi: "Người diễn giải", en: "Translator" },
    pace_keeper: { vi: "Giữ nhịp", en: "Pace keeper" },
    grounding_guide: { vi: "Neo lại", en: "Grounding guide" },
    reality_checker: { vi: "Kiểm chứng thực tại", en: "Reality checker" },
    values_chair: { vi: "Chủ tọa giá trị", en: "Values chair" },
    stakeholder_lens: { vi: "Lăng kính quan hệ", en: "Stakeholder lens" },
    inner_weather: { vi: "Thời tiết bên trong", en: "Inner weather" }
  };
  if (!role) return language === "vi" ? "Người dẫn đường" : "Guide";
  return localizedText(labels[role], language, role.replace(/_/g, " "));
}

export function councilModeLabel(value: string, language: Language) {
  const labels: Record<string, LocalizedText> = {
    advisory_board: { vi: "Hội đồng tư vấn", en: "Advisory board" },
    calm_intervention: { vi: "Phiên làm dịu", en: "Calm intervention" },
    structured_debate: { vi: "Thảo luận có cấu trúc", en: "Structured debate" },
    supportive_roundtable: { vi: "Bàn tròn hỗ trợ", en: "Supportive roundtable" }
  };
  return localizedText(labels[value], language, value.replace(/_/g, " "));
}

export function councilSynthesisLabel(value: string, language: Language) {
  const labels: Record<string, LocalizedText> = {
    balanced_tradeoff: { vi: "Cân bằng đánh đổi", en: "Balanced tradeoff" },
    calming_reframe: { vi: "Tái khung nhẹ nhàng", en: "Calming reframe" },
    decision_next_step: { vi: "Bước tiếp theo", en: "Decision next step" },
    gentle_consensus: { vi: "Đồng thuận dịu", en: "Gentle consensus" }
  };
  return localizedText(labels[value], language, value.replace(/_/g, " "));
}

function councilStarterPrompts(template: AiCouncilTemplate, language: Language) {
  const tagSet = new Set(template.situationTags);
  if (language === "vi") {
    if (tagSet.has("love")) {
      return ["Người ấy lúc nóng lúc lạnh, mình nên hiểu thế nào?", "Mình nên nhắn gì mà vẫn giữ được ranh giới?", "Cảm xúc nào của mình cần được gọi tên trước?"];
    }
    if (tagSet.has("career")) {
      return ["Mình đang mù mờ về bước tiếp theo trong công việc.", "Giúp mình tách chuyện ổn định với điều mình thật sự muốn.", "Tuần này mình có thể thử một việc nhỏ nào?"];
    }
    if (tagSet.has("overthinking")) {
      return ["Mình cứ nghĩ đi nghĩ lại một cuộc trò chuyện mà không thoát ra được.", "Đâu là sự thật, đâu là điều mình đang đoán?", "Giúp mình chậm lại trong 2 phút."];
    }
    return ["Mình đang đứng trước một lựa chọn lớn.", "Giúp mình nhìn rõ được và mất của từng hướng.", "Mình cần biết thêm điều gì trước khi quyết định?"];
  }
  if (tagSet.has("love")) {
    return ["I am reading mixed signals and need the council's view.", "What could I text while keeping my boundary?", "What feeling should I name first?"];
  }
  if (tagSet.has("career")) {
    return ["I feel foggy about the next career step.", "Help me separate stability from identity.", "What small experiment should I run this week?"];
  }
  if (tagSet.has("overthinking")) {
    return ["I keep replaying a conversation and cannot step out.", "What is fact, and what is my assumption?", "Help me slow this down for two minutes."];
  }
  return ["I am facing a big choice.", "Help me see the tradeoffs.", "What do I need to know before acting?"];
}

function councilFallbackFollowUps(template: AiCouncilTemplate, language: Language) {
  const prompts = councilStarterPrompts(template, language);
  return language === "vi"
    ? [prompts[1] ?? "Hội đồng có thể đi sâu hơn không?", "Mỗi guide sẽ chọn một bước nhỏ nào?", prompts[2] ?? "Điều gì mình đang bỏ sót?"]
    : [prompts[1] ?? "Can the council go deeper?", "What small step would each guide choose?", prompts[2] ?? "What am I missing?"];
}

function serializeThread(thread: AiCouncilTurn[]): StoredAiCouncilTurn[] {
  return thread.map(({ persona, ...turn }) => ({
    ...turn,
    personaId: persona?.id
  }));
}

function hydrateDbMessages(messages: any[], personasById: Record<string, Persona>): AiCouncilTurn[] {
  return messages.map((m) => {
    const relation = Array.isArray(m.personas) ? m.personas[0] : m.personas;
    const persona = personasById[m.persona_id] ?? Object.values(personasById).find(item => item.slug === relation?.slug);
    return {
      id: m.id,
      role: m.role as "user" | "guide",
      text: m.content,
      persona,
      lens: m.response_lens,
      promptVersionId: m.prompt_version_id
    };
  });
}

function hydrateThread(turns: StoredAiCouncilTurn[], personasById: Record<string, Persona>): AiCouncilTurn[] {
  return turns.map(({ personaId, ...turn }) => ({
    ...turn,
    persona: personaId ? personasById[personaId] : undefined
  }));
}

function titleForThread(thread: AiCouncilTurn[], template: AiCouncilTemplate, language: Language) {
  const firstUserTurn = thread.find((turn) => turn.role === "user");
  const rawTitle = firstUserTurn?.text.trim() || localizedText(template.name, language);
  return rawTitle.length > 54 ? `${rawTitle.slice(0, 54)}...` : rawTitle;
}

export function useAiCouncilRoom({
  backendAvailable,
  backendOptions,
  storage,
  accountReady,
  config,
  getPersonaThumbnail,
  language,
  onFeedback,
  onGenerationFinished,
  onGenerationStarted,
  onSave,
  onTrack,
  personas,
  personasById,
  profile,
  canUsePersona
}: UseAiCouncilRoomOptions): UseAiCouncilRoomResult {
  const { loadJson, saveJson } = storage;
  const [question, setQuestion] = useState("");
  const requestVersion = useRef(0);
  const [activeSessionId, setActiveSessionId] = useState(nowId);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [storedSessions, setStoredSessions] = useState<StoredAiCouncilSession[]>([]);
  const [templateId, setTemplateId] = useState(config.defaultTemplateId);
  const [thread, setThread] = useState<AiCouncilTurn[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [synthesis, setSynthesis] = useState<AiCouncilSynthesis | null>(null);
  const [guestPersonaIds, setGuestPersonaIds] = useState<string[]>([]);
  const [customCouncil, setCustomCouncil] = useState<StoredCustomCouncil | null>(null);
  const [customCouncilName, setCustomCouncilName] = useState("");
  const [customCouncilTone, setCustomCouncilTone] = useState(profile.tone || "gentle");
  const [customPersonaIds, setCustomPersonaIds] = useState<string[] | null>(null);
  const [setupExpanded, setSetupExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  // A safety reply replaces the council's turns for that message; it uses no turn.
  const [safetyNotice, setSafetyNotice] = useState<{ text: string; crisis: boolean } | null>(null);
  const previousThreadLengthRef = useRef(thread.length);

  useEffect(() => {
    if (!accountReady) return;
    let mounted = true;
    async function hydrate() {
      try {
        const [collapsed, savedCouncil, cached] = await Promise.all([
          loadJson(setupCollapsedStorageKey, false),
          loadJson<StoredCustomCouncil | null>(customCouncilStorageKey, null),
          loadJson<StoredAiCouncilSession[]>("nilaza.aiCouncilSessions.v2", [])
        ]);
        if (!mounted) return;
        if (collapsed) setSetupExpanded(false);
        if (savedCouncil) {
          const ids = savedCouncil.personaIds.filter(id => personasById[id]).slice(0, 4);
          if (ids.length >= 2) {
            setCustomCouncil({ ...savedCouncil, personaIds: ids });
            setCustomCouncilName(savedCouncil.name);
            setCustomCouncilTone(savedCouncil.tone || profile.tone || "gentle");
            setCustomPersonaIds(ids);
            setTemplateId(savedCouncil.templateId || config.defaultTemplateId);
          }
        }
        setStoredSessions(cached);
        const latest = cached[0];
        if (latest) {
          setActiveSessionId(latest.id);
          setTemplateId(latest.templateId);
          setThread(hydrateThread(latest.turns ?? [], personasById));
          setFollowUps(latest.followUps);
          setSynthesis(latest.synthesis ?? null);
        }
        setSessionsLoaded(true);
        if (!backendAvailable) return;
        try {
          const raw = await getChatSessions(backendOptions);
          if (!mounted) return;
          const remote: StoredAiCouncilSession[] = raw.filter(s => s.session_kind === "ai_council").map(s => ({
            id: s.id, createdAt: s.created_at, updatedAt: s.updated_at, title: s.title || "AI Council",
            templateId: s.transcript_summary?.templateId || config.defaultTemplateId,
            guideCount: s.transcript_summary?.guideCount || 0, turnCount: 0,
            followUps: [], guestPersonaIds: [], customCouncil: null
          }));
          // Never replace locally written turns with an empty/error server response.
          setStoredSessions(current => mergeById(current, remote).slice(0, maxStoredSessions));
        } catch {
          if (mounted) onFeedback(language === "vi" ? "Chưa tải được lịch sử hội đồng. Bản lưu trên máy vẫn còn." : "Council history is unavailable. Local history is preserved.");
        }
      } catch {
        // Do not enable persistence after a failed cache read.
        if (mounted) onFeedback(language === "vi" ? "Chưa đọc được bản lưu hội đồng. Hãy mở lại ứng dụng để thử lại." : "Council cache could not be read. Reopen the app to retry.");
      }
    }
    void hydrate();
    return () => { mounted = false; requestVersion.current += 1; };
  }, [accountReady, storage]);

  useEffect(() => {
    if (!sessionsLoaded || thread.length === 0) return;
    const now = new Date().toISOString();
    setStoredSessions(current => {
      const previous = current.find(item => item.id === activeSessionId);
      const snapshot: StoredAiCouncilSession = {
        id: activeSessionId, createdAt: previous?.createdAt ?? now, updatedAt: now,
        title: titleForThread(thread, councilTemplateById(config, templateId), language),
        templateId, guideCount: new Set(thread.map(turn => turn.persona?.id).filter(Boolean)).size,
        turnCount: thread.length, turns: serializeThread(thread), followUps, guestPersonaIds, customCouncil, synthesis
      };
      return [snapshot, ...current.filter(item => item.id !== activeSessionId)].slice(0, maxStoredSessions);
    });
  }, [sessionsLoaded, activeSessionId, thread, templateId, followUps, guestPersonaIds, customCouncil, synthesis]);

  useEffect(() => {
    if (sessionsLoaded) void saveJson("nilaza.aiCouncilSessions.v2", storedSessions);
  }, [sessionsLoaded, storedSessions, storage]);

  useEffect(() => {
    const previousThreadLength = previousThreadLengthRef.current;
    previousThreadLengthRef.current = thread.length;
    if (previousThreadLength === 0 && thread.length > 0 && setupExpanded) {
      setSetupExpanded(false);
      void saveJson(setupCollapsedStorageKey, true);
    }
  }, [setupExpanded, thread.length]);

  const activeTemplates = useMemo(() => config.councilTemplates.filter((template) => template.status !== "disabled"), [config.councilTemplates]);
  const template = useMemo(() => councilTemplateById(config, templateId), [config, templateId]);
  const templatePersonas = useMemo(() => councilPersonasForProfile(config, personas, profile, template), [config, personas, profile, template]);
  const guestPersonas = useMemo(
    () => guestPersonaIds
      .map((id) => personasById[id])
      .filter((persona): persona is Persona => Boolean(persona) && !templatePersonas.some((item) => item.id === persona.id)),
    [guestPersonaIds, personasById, templatePersonas]
  );
  const customPersonas = useMemo(
    () => customPersonaIds
      ?.map((id) => personasById[id])
      .filter((persona): persona is Persona => Boolean(persona))
      .slice(0, 4),
    [customPersonaIds, personasById]
  );
  const councilPersonas = useMemo(
    () => customPersonas && customPersonas.length >= 2 ? customPersonas : [...templatePersonas, ...guestPersonas].slice(0, 4),
    [customPersonas, guestPersonas, templatePersonas]
  );
  const inviteCandidates = useMemo(
    () => personas
      .filter((persona) => !councilPersonas.some((item) => item.id === persona.id))
      .filter((persona) => canUsePersona ? canUsePersona(persona) : persona.accessTier === "free")
      .slice(0, 6),
    [canUsePersona, councilPersonas, personas]
  );
  const templatePayload = useMemo(() => buildCouncilTemplatePayload(template, councilPersonas), [councilPersonas, template]);
  const councilFlow = useMemo(() => localizedList(template.flow, language), [language, template.flow]);
  const visiblePrompts = useMemo(() => {
    const starterPrompts = councilStarterPrompts(template, language);
    return (followUps.length > 0 ? followUps : starterPrompts).slice(0, 3);
  }, [followUps, language, template]);
  const guideDetails: AiCouncilGuideDetail[] = useMemo(() => councilPersonas.map((persona) => {
    const member = template.roster.find((item) => item.personaSlug === persona.slug);
    return {
      persona,
      role: member ? councilRoleLabel(member.role, language) : (language === "vi" ? "Người dẫn đường được mời" : "Guest guide"),
      purpose: localizedText(member?.purpose, language, personaConversationLens(persona, language))
    };
  }), [councilPersonas, language, template.roster]);
  const participants: ChatParticipant[] = useMemo(() => guideDetails.map(({ persona, role }) => ({
    id: persona.id,
    name: localizedText(persona.name, language),
    role,
    avatar: getPersonaThumbnail(persona)
  })), [getPersonaThumbnail, guideDetails, language]);
  const quickReplies: AiCouncilQuickReply[] = useMemo(() => visiblePrompts.map((prompt, index) => ({
    id: `${template.id}-${followUps.length > 0 ? "follow-up" : "starter"}-${index}`,
    label: prompt
  })), [followUps.length, template.id, visiblePrompts]);
  const sessionSummaries: AiCouncilSessionSummary[] = useMemo(() => storedSessions.map((session) => {
    const sessionTemplate = councilTemplateById(config, session.templateId);
    return {
      id: session.id,
      guideCount: session.guideCount,
      templateName: session.customCouncil?.name || localizedText(sessionTemplate.name, language),
      title: session.title || session.customCouncil?.name || localizedText(sessionTemplate.name, language),
      turnCount: session.turnCount,
      updatedAt: session.updatedAt
    };
  }), [config, language, storedSessions]);

  const startNewSession = (nextTemplateId = customCouncil?.templateId ?? config.defaultTemplateId) => {
    requestVersion.current += 1;
    setActiveSessionId(nowId());
    setTemplateId(nextTemplateId);
    setSafetyNotice(null);
    if (customCouncil) {
      setCustomCouncilName(customCouncil.name);
      setCustomCouncilTone(customCouncil.tone || profile.tone || "gentle");
      setCustomPersonaIds(customCouncil.personaIds.filter((id) => personasById[id]).slice(0, 4));
      setGuestPersonaIds(customCouncil.personaIds.filter((id) => !templatePersonas.some((persona) => persona.id === id)));
    } else {
      setGuestPersonaIds([]);
      setCustomPersonaIds(null);
      setCustomCouncilName("");
    }
    setThread([]);
    setFollowUps([]);
    setSynthesis(null);
    setQuestion("");
    setSetupExpanded(false);
    onTrack("ai_council_session_started", { templateId: nextTemplateId });
  };

  const resumeSession = async (sessionId: string) => {
    const session = storedSessions.find((item) => item.id === sessionId);
    if (!session) return;
    setActiveSessionId(session.id);
    setTemplateId(session.templateId);
    setGuestPersonaIds(session.guestPersonaIds ?? []);
    if (session.customCouncil) {
      setCustomCouncil(session.customCouncil);
      setCustomCouncilName(session.customCouncil.name);
      setCustomCouncilTone(session.customCouncil.tone || profile.tone || "gentle");
      setCustomPersonaIds(session.customCouncil.personaIds.filter((id) => personasById[id]).slice(0, 4));
    } else {
      setCustomPersonaIds(null);
      setCustomCouncilName("");
      setCustomCouncilTone(profile.tone || "gentle");
    }
    
    const version = ++requestVersion.current;
    setThread(hydrateThread(session.turns ?? [], personasById));
    if (backendAvailable && !session.turns?.length) {
      try {
        const messages = await getChatMessages(session.id, backendOptions);
        if (version !== requestVersion.current || !backendOptions.session?.active) return;
        setThread(hydrateDbMessages(messages, personasById));
      } catch {
        if (version === requestVersion.current) onFeedback(language === "vi" ? "Chưa tải được cuộc trò chuyện. Hãy chọn lại để thử." : "Conversation unavailable. Select it again to retry.");
      }
    }
    
    setFollowUps(session.followUps ?? []);
    setSynthesis(session.synthesis ?? null);
    setQuestion("");
    setSetupExpanded(false);
    onTrack("ai_council_session_resumed", {
      templateId: session.templateId,
      turnCount: session.turnCount
    });
  };

  const toggleGuest = (persona: Persona) => {
    setCustomPersonaIds((current) => {
      const baseIds = current ?? councilPersonas.map((item) => item.id);
      const selected = baseIds.includes(persona.id);
      if (selected && baseIds.length <= 2) {
        onFeedback(language === "vi" ? "Hội đồng cần ít nhất 2 người dẫn để giữ nhiều góc nhìn." : "Keep at least 2 guides so the council has multiple perspectives.");
        return baseIds;
      }
      if (!selected && baseIds.length >= 4) {
        onFeedback(language === "vi" ? "Hội đồng nên giữ tối đa 4 người dẫn để câu trả lời không bị loãng." : "Keep the room to 4 guides so the answers stay focused");
        return baseIds;
      }
      const next = selected ? baseIds.filter((id) => id !== persona.id) : [...baseIds, persona.id];
      const templateIds = new Set(templatePersonas.map((item) => item.id));
      setGuestPersonaIds(next.filter((id) => !templateIds.has(id)));
      if (!customCouncilName.trim()) setCustomCouncilName(localizedText(template.name, language));
      return next;
    });
    onTrack("ai_council_guest_toggled", {
      personaId: persona.id,
      templateId: template.id
    });
  };

  const selectTemplate = (nextTemplate: AiCouncilTemplate) => {
    if (thread.length > 0) {
      startNewSession(nextTemplate.id);
      return;
    }
    setTemplateId(nextTemplate.id);
    setFollowUps([]);
    setCustomCouncil(null);
    setCustomPersonaIds(null);
    setCustomCouncilName("");
    setCustomCouncilTone(profile.tone || "gentle");
    onTrack("ai_council_template_selected", {
      templateId: nextTemplate.id,
      meetingMode: nextTemplate.meetingMode
    });
  };

  const selectQuickReply = (reply: AiCouncilQuickReply) => {
    setQuestion(reply.label);
    onTrack("ai_council_prompt_selected", {
      templateId: template.id,
      source: followUps.length > 0 ? "follow_up" : "starter"
    });
  };

  const send = async () => {
    const userQuestion = question.trim();
    if (generating || !sessionsLoaded) return;
    // An empty box sends nothing, so no council turn is used (analysis CO-02).
    if (!userQuestion) {
      onFeedback(language === "vi" ? "Hãy viết tình huống của bạn trước khi mở hội đồng." : "Write your situation before opening the council.");
      return;
    }
    const version = ++requestVersion.current;
    setGenerating(true);
    const activity = onGenerationStarted?.();
    const userTurnId = nowId();
    setThread((current) => [...current, { id: userTurnId, role: "user" as const, text: userQuestion }].slice(-config.maxTranscriptTurns));
    setQuestion("");
    setFollowUps([]);
    setSafetyNotice(null);
    try {
      const result = await generateAiCouncilTurn(
        {
          language,
          councilId: config.id,
          councilVersion: config.configVersion,
          councilContractVersion: config.contract.version,
          councilTemplate: templatePayload,
          userMessage: userQuestion,
          selectedPersonas: councilPersonas,
          userContext: {
            goals: profile.goals,
            tone: customCouncilTone || profile.tone
          },
          sanitizedHistory: thread.slice(-config.maxTranscriptTurns).map((turn) => ({
            role: turn.role,
            text: turn.text,
            personaId: turn.persona?.id
          }))
        },
        () => {
          // Offline, the same safety policy answers on the device.
          const signal = oracleSafetySignal(userQuestion);
          if (signal) return { turns: [], moderationStatus: "blocked", safety: signal === "self_harm_signal" ? "crisis" : "boundary", safetyText: oracleSafetyReply(language, signal) };
          return {
          turns: councilPersonas.map((persona, index) => {
            const response = buildCouncilReply(config, persona, userQuestion, language, index, template);
            return {
              personaId: response.persona.id,
              text: response.text,
              lens: response.lens,
              kind: index === 0 ? "opening" as const : "response" as const,
              replyToPersonaId: index > 0 ? councilPersonas[index - 1]?.id : undefined,
              sequence: index + 1,
              promptVersionId: response.promptVersionId
            };
          }),
          promptVersionId: config.contract.promptVersionId,
          councilTemplateId: template.id,
          meetingMode: template.meetingMode,
          synthesisMode: template.synthesisMode,
          synthesis: buildFallbackSynthesis(language),
          moderationStatus: containsRiskyRequest(userQuestion) ? "blocked" : "fallback"
          };
        },
        backendOptions
      );
      if (version !== requestVersion.current || !backendOptions.session?.active) {
        if (activity) onGenerationFinished?.(activity, "failed");
        return;
      }
      if (result.safety) {
        setSafetyNotice({ text: result.safetyText || oracleSafetyReply(language, result.safety === "crisis" ? "self_harm_signal" : "regulated_request"), crisis: result.safety === "crisis" });
        onTrack("ai_council_safety_redirect", { language, safety: result.safety });
        if (activity) onGenerationFinished?.(activity, "ready");
        return;
      }
      const guideTurns: AiCouncilTurn[] = result.turns.map((turn) => {
        const persona = councilPersonas.find((item) => item.id === turn.personaId) ?? personasById[turn.personaId] ?? councilPersonas[0];
        return {
          id: nowId(),
          role: "guide",
          text: turn.text,
          persona,
          lens: turn.lens ?? personaConversationLens(persona, language).toLowerCase(),
          kind: turn.kind,
          replyToPersonaId: turn.replyToPersonaId,
          sequence: turn.sequence,
          promptVersionId: turn.promptVersionId ?? result.promptVersionId ?? config.contract.promptVersionId
        };
      });
      setThread((current) => [...current, ...guideTurns].slice(-config.maxTranscriptTurns));
      const suggestedFollowUps = (result.suggestedFollowUps ?? []).map((item) => item.trim()).filter(Boolean);
      setFollowUps(suggestedFollowUps.length > 0 ? suggestedFollowUps.slice(0, 3) : councilFallbackFollowUps(template, language).slice(0, 3));
      // Older staging functions may return valid turns without the optional
      // synthesis object. Keep the structured Council UI useful while those
      // functions are being rolled forward.
      setSynthesis(result.synthesis ?? buildFallbackSynthesis(language));
      if (result.remoteSessionId && result.remoteSessionId !== activeSessionId) {
        setActiveSessionId(result.remoteSessionId);
      }

      onTrack("ai_council_turn_created", {
        language,
        guideCount: guideTurns.length,
        templateId: result.councilTemplateId ?? template.id,
        meetingMode: result.meetingMode ?? template.meetingMode,
        backend: backendAvailable,
        moderationStatus: result.moderationStatus
      });
      if (activity) onGenerationFinished?.(activity, "ready");
    } catch (error) {
      if (error instanceof BackendLimitError) {
        // Give the question back so nothing the user wrote is lost.
        setThread((current) => current.filter((turn) => turn.id !== userTurnId));
        setQuestion(userQuestion);
        onFeedback(error.status === 401
          ? (language === "vi" ? "Đăng nhập để dùng Hội đồng 3 góc nhìn." : "Sign in to use the council.")
          : (language === "vi" ? "Hôm nay bạn đã dùng lượt hội đồng. Hẹn bạn ngày mai." : "You have used today's council. See you tomorrow."));
        onTrack("ai_council_turn_limited", { language, status: error.status, code: error.code });
        if (activity) onGenerationFinished?.(activity, "failed");
        return;
      }
      onFeedback(language === "vi" ? "Hội đồng chưa trả lời được, hãy thử lại sau một chút." : "The council could not answer yet. Try again in a moment.");
      onTrack("ai_council_turn_failed", {
        language,
        backend: backendAvailable
      });
      if (activity) onGenerationFinished?.(activity, "failed");
    } finally {
      setGenerating(false);
    }
  };

  const saveTranscript = () => {
    if (thread.length === 0) {
      onFeedback(language === "vi" ? "Hãy bắt đầu hội đồng trước khi lưu." : "Open the council before saving");
      return;
    }
    onSave({
      sourceType: "chat",
      title: language === "vi" ? "Hội đồng 3 góc nhìn" : "Three-view council",
      summary: thread
        .map((item) => item.role === "user" ? `${language === "vi" ? "Bạn" : "You"}: ${item.text}` : `${localizedText(item.persona?.name, language, "Guide")}: ${item.text}`)
        .join("\n\n"),
      mood: "reflective",
      sourceSnapshot: {
        type: "ai_council",
        customCouncilName: customCouncilName.trim() || localizedText(template.name, language),
        customCouncilTone: customCouncilTone || profile.tone,
        turnCount: thread.length,
        templateId: template.id,
        templateName: localizedText(template.name, language),
        meetingMode: template.meetingMode,
        synthesisMode: template.synthesisMode,
        guideRoles: templatePayload.guideRoles,
        personaIds: councilPersonas.map((item) => item.id),
        configVersion: config.configVersion,
        councilContractVersion: config.contract.version,
        outputSchema: config.contract.responseSchema,
        promptVersionId: config.contract.promptVersionId
      }
    });
  };

  const saveCustomCouncil = () => {
    const personaIds = (customPersonaIds ?? councilPersonas.map((persona) => persona.id)).slice(0, 4);
    if (personaIds.length < 2) {
      onFeedback(language === "vi" ? "Hãy chọn ít nhất 2 người dẫn cho hội đồng." : "Choose at least 2 guides for your Council.");
      return;
    }
    const now = new Date().toISOString();
    const nextCustomCouncil: StoredCustomCouncil = {
      id: customCouncil?.id ?? "local-custom-council",
      name: customCouncilName.trim() || localizedText(template.name, language),
      personaIds,
      templateId: template.id,
      tone: customCouncilTone || profile.tone || "gentle",
      updatedAt: now
    };
    setCustomCouncil(nextCustomCouncil);
    setCustomCouncilName(nextCustomCouncil.name);
    setCustomCouncilTone(nextCustomCouncil.tone);
    setCustomPersonaIds(nextCustomCouncil.personaIds);
    void saveJson(customCouncilStorageKey, nextCustomCouncil);
    onFeedback(language === "vi" ? "Đã lưu hội đồng của bạn." : "Custom Council saved.");
    onTrack("ai_council_custom_saved", {
      guideCount: nextCustomCouncil.personaIds.length,
      templateId: nextCustomCouncil.templateId,
      tone: nextCustomCouncil.tone
    });
  };

  const toggleSetup = () => {
    setSetupExpanded((value) => {
      const next = !value;
      void saveJson(setupCollapsedStorageKey, !next);
      return next;
    });
  };

  const openSetup = () => {
    setSetupExpanded(true);
    void saveJson(setupCollapsedStorageKey, false);
  };

  return {
    roomProps: {
      activeTemplates,
      activeSessionId,
      councilFlow,
      customCouncilName: customCouncilName || localizedText(template.name, language),
      customCouncilSavedAt: customCouncil?.updatedAt,
      customCouncilTone,
      customToneOptions: [
        { id: "gentle", label: language === "vi" ? "Dịu dàng" : "Gentle" },
        { id: "direct", label: language === "vi" ? "Thẳng thắn" : "Direct" },
        { id: "practical", label: language === "vi" ? "Thực tế" : "Practical" },
        { id: "spiritual", label: language === "vi" ? "Tâm linh" : "Spiritual" }
      ],
      generating,
      getModeLabel: councilModeLabel,
      getPersonaThumbnail,
      getSynthesisLabel: councilSynthesisLabel,
      guestPersonaIds,
      guideDetails,
      inviteCandidates,
      language,
      onAddGuide: openSetup,
      onCustomCouncilNameChange: setCustomCouncilName,
      onCustomCouncilToneChange: setCustomCouncilTone,
      onQuestionChange: setQuestion,
      onResumeSession: (id: string) => { void resumeSession(id); },
      onSaveCustomCouncil: saveCustomCouncil,
      onSaveTranscript: saveTranscript,
      onSelectQuickReply: selectQuickReply,
      onSelectTemplate: selectTemplate,
      onSend: send,
      onStartNewSession: () => startNewSession(),
      onToggleGuest: toggleGuest,
      onToggleSetup: toggleSetup,
      participants,
      personas: councilPersonas,
      question,
      quickReplies,
      sessionSummaries,
      safetyNotice,
      setupExpanded,
      synthesis,
      template,
      thread
    }
  };
}
