import type { AnswerProvenance } from "../../../packages/ai-contracts/answer-provenance";
export type Language = "vi" | "en" | "zh-Hans" | "ja" | "ko";

export type LocalizedRecord<T> = Partial<Record<Language, T>> & {
  en: T;
  vi?: T;
};

export type LocalizedText = LocalizedRecord<string>;

export type LocalizedList = LocalizedRecord<string[]>;

export type ContentSection = {
  id: string;
  ownerType: "persona" | "tarot_deck" | "tarot_card" | "journal_template" | "share_template";
  ownerId: string;
  sectionKey: string;
  title?: LocalizedText;
  subtitle?: LocalizedText;
  body?: LocalizedText;
  blocks: Array<Record<string, unknown>>;
  displayStyle?: "list" | "editorial" | "quote" | "grid" | "card";
  sortOrder: number;
};

export type MediaAsset = {
  id: string;
  ownerType: "persona" | "tarot_deck" | "tarot_card" | "reading" | "brand";
  ownerId?: string;
  kind: "portrait_primary" | "deck_hero" | "card_back" | "card_face" | "share_card" | "brand_mark";
  localKey?: string;
  altText?: LocalizedText;
  dominantColors?: string[];
  metadata?: Record<string, string | number | boolean>;
};

export type TarotSpreadConfig = {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  accessTier: "free" | "premium-preview" | "premium";
  positions: Array<{
    key: string;
    label: LocalizedText;
    order: number;
  }>;
};

export type TarotDeck = {
  id: string;
  slug: string;
  accessTier: "free" | "premium-preview" | "premium";
  status: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  vibe: LocalizedText;
  theme: string[];
  accentColor: string;
  visualDirection: LocalizedText;
  readingStyle: LocalizedText;
  cardIntroductions?: Record<string, LocalizedText>;
};

export type TarotCard = {
  id: string;
  arcana: "major" | "minor";
  number: number;
  suit?: "wands" | "cups" | "swords" | "pentacles" | null;
  rank?: string | null;
  element?: string;
  name: LocalizedText;
  keywords: LocalizedList;
  intro: LocalizedText;
  personalityPortrait: LocalizedText;
  uprightMeaning: LocalizedText;
  reversedMeaning: LocalizedText;
  reflectionQuestion: LocalizedText;
};

export type Persona = {
  id: string;
  type: "historical_figure" | "book_inspired_guide" | "archetype_guide";
  slug: string;
  status: string;
  accessTier: "free" | "premium-preview" | "premium";
  name: LocalizedText;
  displayRole?: LocalizedText;
  sourceInspiration?: LocalizedText;
  shortDescription: LocalizedText;
  portrait: {
    style: string;
    colors: string[];
  };
  tone: string[];
  themes: string[];
  suggestedPrompts: LocalizedList;
  transparencyNote: LocalizedText;
};

export type Profile = {
  onboarded: boolean;
  nickname: string;
  language: Language;
  goals: string[];
  tone: string;
  currentStreak: number;
  lastActivityDate: string;
};

export type AuthView = "welcome" | "sign-in" | "sign-up" | "forgot-password";

export type AuthProvider = "email" | "apple" | "google" | "facebook" | "x" | "legacy-local";

export type LocalAuthUser = {
  id: string;
  name: string;
  email: string;
  provider: AuthProvider;
  /** Account creation time from the auth provider, when it supplies one. */
  createdAt?: string;
};

export type LocalAuthBackendSession = {
  provider: "supabase";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type LegacyLocalAuthState =
  | {
      version: 1;
      status: "signed_out";
    }
  | {
      version: 1;
      status: "signed_in";
      user: LocalAuthUser;
      backendSession?: LocalAuthBackendSession;
    };

export type SessionStateV2 =
  | {
      version: 2;
      status: "signed_out";
    }
  | {
      version: 2;
      status: "guest";
      guestId: string;
      createdAt: string;
      onboarding: {
        completed: boolean;
        step: number;
        language: Language;
        goals: string[];
        tone: string;
      };
    }
  | {
      version: 2;
      status: "signed_in";
      user: LocalAuthUser;
      backendSession?: LocalAuthBackendSession;
    };

export type LocalAuthState = SessionStateV2;

export type AuthGateReason = "save" | "journal" | "oracle_send" | "sync" | "premium";

export type JournalEntry = {
  id: string;
  remoteId?: string;
  syncStatus?: "synced" | "local";
  sourceType: "tarot" | "chat" | "daily" | "astrology" | "manual" | "share_card";
  title: string;
  summary: string;
  createdAt: string;
  mood?: string;
  userNote?: string;
  sourceId?: string;
  sourceSnapshot?: Record<string, unknown>;
};

export type DailyInsight = {
  id: string;
  dateKey: string;
  title: string;
  text: string;
  reflectionPrompt: string;
  source: "local" | "backend";
  rerollCount: number;
  createdAt: string;
};

export type PendingGuestArtifact = {
  kind: "journal";
  entry: Omit<JournalEntry, "id" | "createdAt">;
  createdAt: string;
};

export type ZodiacProfileStatus = "empty" | "sun_only" | "birth_time_missing" | "full_pending_backend" | "full";

export type ZodiacPulse = {
  id: string;
  dateKey: string;
  sign?: string;
  signId?: string;
  profileCompleteness: ZodiacProfileStatus;
  mood: string;
  title: string;
  reflection: string;
  microAction: string;
  caveats: string[];
  source: "local" | "backend";
  hasBirthDate: boolean;
};

export type AiCouncilConfig = {
  id: "ai_council";
  status: "active" | "draft" | "disabled";
  configVersion: string;
  contractRef: "ai_council_contract";
  contract: {
    id: "ai_council_contract";
    version: string;
    endpoint: "/ai/ai-council";
    responseSchema: "ai_council_rounds_v2";
    promptVersionId: string;
  };
  name: LocalizedText;
  description: LocalizedText;
  defaultTemplateId: string;
  defaultPersonaSlugs: string[];
  fallbackPersonaSlugs: string[];
  maxGuidesPerTurn: number;
  maxTranscriptTurns: number;
  allowSingleGuideFollowup: boolean;
  journalSaveEnabled: boolean;
  contextPolicy: {
    allowed: string[];
    disabledByDefault: string[];
  };
  turnPolicy: LocalizedList;
  safetyBoundaries: LocalizedList;
  emptyState: LocalizedText;
  councilTemplates: AiCouncilTemplate[];
};

export type AiCouncilTemplate = {
  id: string;
  status: "ready_for_beta" | "draft_review" | "disabled";
  name: LocalizedText;
  useCase: LocalizedText;
  situationTags: string[];
  meetingMode: string;
  maxGuides: number;
  synthesisMode: string;
  roster: Array<{
    personaSlug: string;
    role: string;
    purpose: LocalizedText;
  }>;
  flow: LocalizedList;
  outputContract: string[];
};

export type AiCouncilThreadTurn = {
  id: string;
  role: "user" | "guide";
  text: string;
  personaId?: string;
  lens?: string;
  kind?: "opening" | "perspective" | "response" | "synthesis";
  replyToPersonaId?: string;
  sequence?: number;
  createdAt: string;
  promptVersionId?: string;
};

export type ChatMessage = {
  id: string;
  personaId: string;
  role: "user" | "guide";
  text: string;
  createdAt: string;
  promptVersionId?: string;
  uiMetadata?: Record<string, string | number | boolean>;
};

export type ChatHandoffContext = {
  sourceType: "tarot_reading" | "tarot_card" | "astrology_report" | "daily_zodiac_pulse" | "oracle_reflection" | "book_quote";
  sourceId: string;
  sourceLabel: string;
  userQuestion?: string;
  safeSummary: string;
  tarot?: {
    topic: string;
    spread: string;
    deckName: string;
    cardFocus?: {
      name: string;
      orientation: "upright" | "reversed" | "library";
      deckName: string;
      archetype: string;
      reflectionPrompt: string;
    };
    cards: Array<{
      name: string;
      position: string;
      orientation: "upright" | "reversed";
    }>;
    synthesis: string;
    reflectionPrompt: string;
  };
  astrology?: {
    focus: string;
    birthDate?: string;
    birthTimeKnown: boolean;
    birthPlace?: string;
    calculationStatus: "partial_local" | "backend_ready";
    provider?: string;
    sunSign?: string;
    moonSign?: string;
    risingSign?: string;
    caveats: string[];
    sections: Array<{
      title: string;
      body: string;
    }>;
  };
  zodiacPulse?: ZodiacPulse;
};

export type OracleIntent =
  | "reflect"
  | "tarot_handoff"
  | "persona_handoff"
  | "council_handoff"
  | "astrology_handoff"
  | "journal_handoff"
  | "safety_redirect";

export type OracleActionKind =
  | "reflect_here"
  | "draw_tarot"
  | "ask_guide"
  | "open_council"
  | "cast_astrology"
  | "save_journal";

export type OracleHandoffContext = {
  sourceType: "oracle";
  sourceId: string;
  userMessage: string;
  safeSummary: string;
  suggestedPersonaSlug?: string;
  suggestedCouncilTemplateId?: string;
  suggestedTarotTopic?: string;
  suggestedTarotSpread?: string;
  suggestedAstrologyFocus?: string;
};

export type OracleActionCard = {
  id: string;
  kind: OracleActionKind;
  label: LocalizedText;
  detail: LocalizedText;
  icon: string;
  target: "oracle" | "tarot" | "persona" | "council" | "astrology" | "journal";
  enabled: boolean;
  requiresConsent?: "journal_memory" | "birth_profile";
  handoffContext?: OracleHandoffContext;
};

export type OracleTurn = {
  id: string;
  role: "user" | "oracle";
  text: string;
  createdAt: string;
  intent?: OracleIntent;
  confidence?: number;
  actionCards?: OracleActionCard[];
  handoffContext?: OracleHandoffContext;
  promptVersionId?: string;
  moderationStatus?: "passed" | "blocked" | "fallback";
  /** "crisis" shows the Gọi 115 card under the reply (analysis OR-05, Owner: 115 only). */
  safety?: "crisis" | "boundary";
};

export type OracleMemoryConsent = {
  journalMemory: boolean;
  birthProfile: boolean;
};

export type TarotReadingCardSnapshot = {
  cardId: string;
  deckId: string;
  positionKey: string;
  positionLabel: LocalizedText;
  orientation: "upright" | "reversed";
  spread: string;
  interpretation: LocalizedText;
  imageAssetId?: string;
};

export type TarotReadingSection = {
  key: string;
  title: LocalizedText;
  body: LocalizedText;
  cardIds?: string[];
};

export type TarotReadingV2 = {
  provenance?: AnswerProvenance;
  id: string;
  topic: string;
  question: string;
  deck: Pick<TarotDeck, "id" | "slug" | "name" | "accessTier">;
  spread: Pick<TarotSpreadConfig, "id" | "slug" | "name" | "positions">;
  cards: TarotReadingCardSnapshot[];
  synthesis: LocalizedText;
  reflectionPrompt: LocalizedText;
  sections?: TarotReadingSection[];
  language?: Language;
  contentVersion?: string;
  promptVersionId?: string;
  moderationStatus: "passed" | "blocked" | "fallback";
  createdAt: string;
};

export type GeneratedArtifact = {
  id: string;
  sourceType: "tarot_reading" | "chat_message" | "astrology_report" | "journal_entry";
  sourceId: string;
  artifactType: "share_card" | "export_image" | "summary_text";
  templateKey?: string;
  payload: Record<string, unknown>;
  visibility: "private" | "shared" | "deleted";
  createdAt: string;
  deletedAt?: string;
};

export type UsageEvent = {
  id: string;
  name: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
};

export type SafetyEvent = {
  id: string;
  feature: "oracle" | "chat" | "ai_council" | "tarot" | "journal" | "profile" | "astrology" | "artifact";
  sourceId?: string;
  reason: "user_report" | "blocked_topic" | "generation_failure" | "moderation_failure";
  summary: string;
  status: "open" | "reviewed";
  createdAt: string;
};

export type NotificationChannel = "in_app" | "push" | "email" | "sms" | "zalo" | "whatsapp";

export type NotificationType =
  | "daily_insight_ready"
  | "tarot_reading_ready"
  | "astrology_report_ready"
  | "ai_response_ready"
  | "journal_reflection_reminder"
  | "account_security"
  | "payment_subscription"
  | "admin_test";

export type NotificationPreference = {
  id: string;
  channel: NotificationChannel;
  type: NotificationType;
  enabled: boolean;
  updatedAt: string;
};

export type NotificationPermissionState = "unknown" | "granted" | "denied" | "unavailable";

export type DevicePushRegistration = {
  expoPushToken?: string;
  deviceId: string;
  platform: "ios" | "android" | "web" | "unknown";
  permissionStatus: NotificationPermissionState;
  appVersion?: string;
  locale: Language;
  timezone?: string;
  updatedAt: string;
};

export type InAppNotification = {
  id: string;
  type: NotificationType;
  title: LocalizedText;
  body: LocalizedText;
  channel: "in_app";
  status: "unread" | "read" | "dismissed";
  sourceType?: "daily" | "tarot" | "astrology" | "journal" | "account" | "payment" | "admin" | "chat" | "council";
  sourceId?: string;
  targetRoute?: "home" | "tarot" | "astrology" | "journal" | "profile" | "chat";
  // Opaque local routing metadata. It allows the inbox to reopen the exact
  // conversation without placing the user's prompt or AI response in a notification.
  targetMode?: "oracle" | "room" | "council";
  personaId?: string;
  createdAt: string;
  readAt?: string;
};

/**
 * A private, account-scoped marker for work the user has already asked Nilaza
 * to do. It deliberately excludes the question and AI output so an activity
 * can be shown safely in the shell and notification inbox.
 */
export type GenerationActivity = {
  id: string;
  feature: "persona_chat" | "oracle" | "ai_council" | "tarot_reading" | "astrology_report";
  status: "working" | "ready" | "failed" | "dismissed";
  title: LocalizedText;
  detail: LocalizedText;
  targetRoute: "chat" | "tarot" | "astrology";
  targetMode?: "oracle" | "room" | "council";
  personaId?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PromptDraft = {
  id: string;
  version: string;
  feature: string;
  content: LocalizedText;
  updatedAt: string;
};
