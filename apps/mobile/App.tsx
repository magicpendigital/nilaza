import { FeedbackPanel, type FeedbackPanelTarget } from "./src/features/feedback/FeedbackPanel";
import { submitAiFeedback, exportAiFeedback, deleteAllAiFeedback, BackendLimitError, BackendUnavailableError } from "./src/backendClient";
import { createAnswerAttempt, parseAnswerProvenance, type AnswerProvenance } from "../../packages/ai-contracts/answer-provenance";
import { useEffect, useMemo, useRef, useState } from "react";
import { OwnerHub } from "./src/features/owner/OwnerHub";
import Ionicons from "@expo/vector-icons/Ionicons";
import { EBGaramond_400Regular } from "@expo-google-fonts/eb-garamond/400Regular";
import { EBGaramond_500Medium } from "@expo-google-fonts/eb-garamond/500Medium";
import { EBGaramond_600SemiBold } from "@expo-google-fonts/eb-garamond/600SemiBold";
import { HankenGrotesk_400Regular } from "@expo-google-fonts/hanken-grotesk/400Regular";
import { HankenGrotesk_400Regular_Italic } from "@expo-google-fonts/hanken-grotesk/400Regular_Italic";
import { HankenGrotesk_500Medium } from "@expo-google-fonts/hanken-grotesk/500Medium";
import { HankenGrotesk_600SemiBold } from "@expo-google-fonts/hanken-grotesk/600SemiBold";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useFontReadiness } from "./src/brand/useFontReadiness";
import { HomeExperience, type HomeLatest } from "./src/features/home/HomeExperience";
import { TodayCardActions, TodayCardReflection } from "./src/features/home/TodayCardReflection";
import { InboxScreen } from "./src/features/notifications/InboxScreen";
import { GoalsScreen } from "./src/features/onboarding/GoalsScreen";
import { persistOnboarding } from "./src/features/onboarding/completeOnboarding";
import { brandCopy } from "./src/brand/copy";
import { scrollBandFor, type ScrollBand } from "./src/scrollThresholds";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
import {
  Animated,
  BackHandler,
  Image,
  ImageSourcePropType,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";

import tarotDeckData from "../../packages/content/data/tarot-decks.json";
import tarotCardData from "../../packages/content/data/tarot-cards.json";
import { canonicalTarotDeckId, findTarotDeckById } from "./src/tarotDeckIdentity";
import figureData from "../../packages/content/data/personas-figures.json";
import bookData from "../../packages/content/data/personas-books.json";
import archetypeData from "../../packages/content/data/personas-archetypes.json";
import personaDetailContent from "../../packages/content/data/persona-detail-content.json";
import adminMetricsData from "../../packages/agent-config/admin-metrics.json";
import promptLibraryData from "../../packages/agent-config/prompt-library.json";
import productAgents from "../../packages/agent-config/product-agents.json";
import aiCouncilConfigData from "../../packages/agent-config/ai-council.json";
import councilContractData from "../../packages/agent-config/council-contract.json";
import oracleActionsData from "../../packages/agent-config/oracle-actions.json";
import safetyRules from "../../packages/agent-config/safety-rules.json";
import aiUsagePolicy from "../../packages/agent-config/ai-usage-policy.json";
import {
  BackendOptions,
  OracleTurnResult,
  deleteAstrologyAiReportForChart,
  deleteAstrologyAiReports,
  generateDailyInsight,
  requestAccountDeletion,
  generateDailyZodiacPulse,
  generatePersonaReply,
  generateOracleTurn,
  generateTarotReading,
  registerNotificationDevice,
  sendNotificationTest,
  syncJournalMutation,
  syncNotificationInbox,
  syncNotificationPreferences,
  syncUserProfile,
  getAllPersonaChatMessages,
  getJournalEntries,
  getProfileSnapshot,
  getUsageEvents,
  getSafetyEvents,
  getDailyInsight,
  getAdminAccess,
  getPublishedContent,
  requestAstrologyAiInsight,
  sendShareEvents
} from "./src/backendClient";
import {
  ActionTile,
  CalendarDatePicker,
  ChatSessionSummary,
  Chip,
  ChoiceTile,
  FeatureWide,
  Header,
  IconButton,
  IconText,
  LanguageSelector,
  MiniStat,
  OnboardingProgress,
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  StatusLine,
  ContentBlock,
  Brand,
  GenerationActivityBubble,
  RitualLoading,
  ScreenShell,
  SectionLabel,
  SubflowTopBar,
  TopBar,
  FadeInView
} from "./src/a2ui";
import { formatLocalDate, formatLocalDateTime, localizedList, localizedText, normalizeLanguage, relativeDayLabel } from "./src/i18n";
import { guestEntryEnabled, isSupabaseAuthConfigured, nilazaAdminUrl, nilazaBackendBaseUrl, nilazaHelpUrlFor, nilazaLegalUrlFor, onlineModeRequired, onlineRuntimeReady, responsiveShellEnabled, supabaseAnonKey, supabaseUrl } from "./src/runtimeConfig";
import { useAdaptiveLayout } from "./src/responsive";
import { AdaptiveScaffold, ResponsiveGrid, OverflowChipRail } from "./src/a2ui/layout";
import { AdaptiveNavigation, type NavigationChrome } from "./src/a2ui/AdaptiveNavigation";
import { playTarotRevealHaptic } from "./src/features/tarot/interactions";
import { TarotArtworkButton } from "./src/features/tarot/TarotArtworkButton";
import { ReadingDetails } from "./src/a2ui/ReadingDetails";
import { normalizeTarotSections, tarotSnapshotMeaning, tarotResultSource } from "./src/features/tarot/readingPresentation";
import { getTarotLearningSections, tarotQuestionExamples } from "./src/features/tarot/learning";
import { getTarotCardGuide } from "./src/features/tarot/cardGuide";
import { TarotCardGuide } from "./src/features/tarot/TarotCardGuide";
import { TarotAskStep } from "./src/features/tarot/TarotAskStep";
import { TarotDrawStep } from "./src/features/tarot/TarotDrawStep";
import { TarotResultDock, TarotResultView } from "./src/features/tarot/TarotResultView";
import type { AskTopic } from "./src/features/tarot/askHelpers";
import { MythologyEntry, MythologyWorld } from "./src/features/astrology/MythologyWorld";
import { AstrologyChartFoundation } from "./src/features/astrology/AstrologyChartFoundation";
import { astrologySignIds, localizeAstrologySign, toAstrologyChartPresentation, type AstrologyRawChart, type AstrologySignId } from "./src/features/astrology/contracts";
import { AstrologySignGuide } from "./src/features/astrology/AstrologySignGuide";
import { GuestPreview } from "./src/features/guest/GuestPreview";
import { dailyRhythmFor } from "./src/features/home/dailyRhythm";
import { localizePulseSign } from "./src/features/home/localizePulseSign";
import { colors, layout, radius, spacing, typography } from "./src/theme";
import { getDeckVisual, getFeatureVisual, getPersonaVisual } from "./src/visualAssets";
import { AuthFlow } from "./src/auth/AuthFlow";
import { AiCouncilRoom, type AiCouncilRoomProps, type AiCouncilSessionSummary, useAiCouncilRoom } from "./src/features/council";
import { OracleRoom } from "./src/features/oracle";
import { ChatHub } from "./src/features/chat/ChatHub";
import { JournalHome } from "./src/features/journal/JournalHome";
import { savedReadingCards } from "./src/features/journal/savedReading";
import { cardInline, cardSubtitle, cardTitle } from "./src/features/tarot/cardName";
import { readingShareText } from "./src/features/tarot/shareText";
import { ShareCardSheet, type ShareEventMeta, type ShareEventName } from "./src/features/share/ShareCardSheet";
import { readingModel, todayCardModel, type ShareCardModel, type ShareRequest } from "./src/features/share/shareCardContent";
import { buildShareUrl, newShareId } from "./src/features/share/shareLink";
import { toShareEventPayload } from "./src/features/share/shareEvents";
import { homeNextStep, homeNextStepCopy } from "./src/features/home/nextStep";
import { previousDayKey, visibleStreak } from "./src/features/home/streak";
import { CardLibrary } from "./src/features/tarot/CardLibrary";
import { ExploreHome } from "./src/features/explore/ExploreHome";
import personaShortNamesData from "../../packages/content/data/persona-short-names.json";

// Owner-approved short names and one-line taglines for guide grids (2026-10-31); full names stay on detail screens.
const personaShortNames = personaShortNamesData.personas as Record<string, { short: { vi: string; en: string }; tagline: { vi: string; en: string } }>;
function personaShortName(persona: Persona, language: Language) {
  const entry = personaShortNames[persona.id];
  return entry ? (language === "vi" ? entry.short.vi : entry.short.en) : localizedText(persona.name, language);
}
function personaTagline(persona: Persona, language: Language) {
  const entry = personaShortNames[persona.id];
  if (entry) return language === "vi" ? entry.tagline.vi : entry.tagline.en;
  return persona.displayRole ? localizedText(persona.displayRole, language) : localizedText(persona.shortDescription, language);
}

const learnedTarotCardsKey = "nilaza.learnedTarotCards.v1";
import { ProfileHome } from "./src/features/profile/ProfileHome";
import { DeleteAccountPanel } from "./src/features/profile/DeleteAccountPanel";

// Flip after the Owner approves deploying account-delete and its SQL (Google Play account deletion).
const accountDeleteLive = false;
import { applyDailyReminder, dailyReminderKey, defaultDailyReminder, normalizeDailyReminder, type DailyReminder } from "./src/features/profile/dailyReminder";
import appConfig from "./app.json";
import { normalizeOracleText, oracleIntent, oracleSafetyReply, oracleSafetySignal } from "../../packages/ai-contracts/oracle-safety.mjs";
import { PersonaChatRoom } from "./src/features/persona";
import { createEmailAuthState, displayNameFromEmail } from "./src/auth/localAuth";
import { resendSupabaseSignupConfirmation, resetSupabasePasswordForEmail, signInWithSupabaseEmail, signUpWithSupabaseEmail } from "./src/auth/supabaseAuth";
import {
  AuthView,
  AiCouncilConfig,
  ChatHandoffContext,
  ChatMessage,
  ContentSection,
  DailyInsight,
  DevicePushRegistration,
  GeneratedArtifact,
  GenerationActivity,
  InAppNotification,
  JournalEntry,
  Language,
  LocalAuthState,
  LocalizedList,
  LocalizedText,
  NotificationPreference,
  NotificationType,
  OracleActionCard,
  OracleActionKind,
  OracleHandoffContext,
  OracleIntent,
  OracleMemoryConsent,
  OracleTurn,
  Persona,
  Profile,
  PromptDraft,
  SafetyEvent,
  TarotCard,
  TarotDeck,
  UsageEvent,
  ZodiacProfileStatus,
  ZodiacPulse
} from "./src/types";
import { useAccountSession } from "./src/auth/useAccountSession";
import { PasswordRecoveryBoundary } from "./src/auth/PasswordRecoveryBoundary";
import { EmailConfirmationBoundary } from "./src/auth/EmailConfirmationBoundary";
import { useDailyInsight } from "./src/features/home/useDailyInsight";
import { createAccountStorage } from "./src/auth/accountStorage";
import { createJournalRepository, createJournalSaveCoordinator, journalStateKey } from "./src/features/journal/journalRepository";
import { JournalComposer } from "./src/features/journal/JournalComposer";
import { useSaveNoteOnLeave } from "./src/features/journal/useSaveNoteOnLeave";
import { createJournalDraftStore, journalDraftStorageKey, type JournalDraftStore } from "./src/features/journal/journalDraftStore";
import { buildLocalExport } from "./src/features/privacy/localExport";
import { cleanupExportFiles, deliverExport } from "./src/features/privacy/deliverExport";
import { AstrologyExperience } from "./src/features/astrology/AstrologyExperience";
import { clearAstrologyBirthData } from "./src/features/astrology/persistence";
import { buildSafeAstrologyContext } from "./src/features/astrology/handoff";
import { mapDailyInsight, mapJournalRows, mapPersonaMessages, mapProfileSnapshot, mergeById } from "./src/auth/personalData";
import { buildDevicePushRegistration, requestNotificationPermission, subscribeToNotificationResponses } from "./src/notifications";
import {
  canViewContentTier,
  getAnnualPriceHypothesisMath,
  isOwnerTierPreviewActive,
  premiumPriceHypothesisVnd,
  resolveDisplayedTier,
  type AccountTier,
  type OwnerTierPreview,
} from "./src/features/owner/tierPreview";
import { premiumOnSale, resolveAccountTier } from "./src/features/owner/accountTierPolicy";
import { drawRandomCards } from "./src/features/tarot/randomDraw";

type ImageRequireContext = {
  (path: string): ImageSourcePropType;
  keys: () => string[];
};

type ImageRequire = {
  (path: string): ImageSourcePropType;
  context: (directory: string, useSubdirectories?: boolean, regExp?: RegExp) => ImageRequireContext;
};

declare const require: ImageRequire;

type Tab = "home" | "explore" | "chat" | "journal" | "profile";
type Screen = Tab | "tarot" | "astrology" | "inbox";
type AdminView = "dashboard" | "prompts" | "content" | "localization" | "jobs" | "notifications" | "safety";
type ChatMode = "oracle" | "list" | "detail" | "room" | "council" | "councilHub";
type PersonalSyncArea = "chat" | "journal";
type ChatCategory = "all" | "favorites" | "sages" | "love" | "career" | "books" | "healing";
type ExploreGuideCategory = "recommended" | ChatCategory;
type TarotStage = "intro" | "learn" | "topic" | "spread" | "deck" | "deckDetail" | "library" | "cardMeaning" | "draw" | "result" | "share";
const tarotStages: TarotStage[] = ["intro", "learn", "topic", "spread", "deck", "deckDetail", "library", "cardMeaning", "draw", "result", "share"];
const isTarotStage = (value: unknown): value is TarotStage => typeof value === "string" && tarotStages.includes(value as TarotStage);
type RitualDrawPhase = "grounding" | "draw_card_1" | "pause_and_breathe" | "draw_card_2" | "draw_card_3" | "reveal";
type AstrologyStage = "world" | "hub" | "intention" | "birth" | "casting" | "report";
type AstrologyFocus = "soul" | "career" | "love" | "shadow";
type PersonaDetailTab = "reflections" | "chronicle";
type TarotTopic = "love" | "career" | "self" | "decision" | "open";
type TarotSpread = "daily-one" | "past-present-future" | "situation-challenge-advice" | "love-three" | "crossroads-four";
type DrawnTarotCard = TarotCard & { reversed: boolean; spread: string };
type FullscreenTarotCard = {
  card: TarotCard | DrawnTarotCard;
  meta: string;
  source: ImageSourcePropType;
};
type SituationId = "overthinking" | "text-someone" | "perspective" | "love-confusion" | "career-fog";

type BirthProfileDraft = {
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  consentVersion: string;
  timezone?: string;
  updatedAt?: string;
};

type ConfirmationDialogState = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
} | null;

type ConfirmationDialogConfig = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
};

type AstrologyReport = {
  id: string;
  focus: AstrologyFocus;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthTimeKnown: boolean;
  calculationStatus: "partial_local" | "backend_ready";
  chart?: AstrologyRawChart;
  provider?: string;
  calculationVersion?: string;
  caveats?: Array<Record<string, unknown>>;
  sunSign?: string;
  moonSign?: string;
  risingSign?: string;
  sections: Array<{
    key: string;
    title: string;
    body: string;
    icon: keyof typeof Ionicons.glyphMap;
  }>;
  createdAt: string;
};

type ExploreSearchResultKind = "experience" | "deck" | "guide";

type ExploreSearchResult = {
  id: string;
  kind: ExploreSearchResultKind;
  title: string;
  meta: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  imageSource?: ImageSourcePropType;
  searchText: string;
  disabled?: boolean;
  onPress?: () => void;
};

const decks = tarotDeckData as TarotDeck[];
const cards = tarotCardData as TarotCard[];
const personas = [...(figureData as Persona[]), ...(bookData as Persona[]), ...(archetypeData as Persona[])];

const personasById: Record<string, Persona> = personas.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, Persona>);
const decksById: Record<string, TarotDeck> = decks.reduce((acc, d) => { acc[d.id] = d; return acc; }, {} as Record<string, TarotDeck>);

function applyPublishedContentBundle(bundle: Awaited<ReturnType<typeof getPublishedContent>>) {
  const payload = bundle?.payload;
  if (!payload || !Array.isArray(payload.personas) || !Array.isArray(payload.decks)) return false;
  const nextPersonas = payload.personas
    .filter((item) => ["active", "published"].includes(item.status))
    .map((item) => ({
      ...item,
      type: (item as any).type === "archetype" ? "archetype_guide" : item.type,
      displayRole: item.displayRole ?? (item as any).role,
      shortDescription: item.shortDescription ?? (item as any).description,
      transparencyNote: item.transparencyNote ?? (item as any).transparency
    })) as Persona[];
  const nextDecks = payload.decks
    .filter((item) => ["active", "published"].includes(item.status))
    .map((item) => ({
      ...item,
      shortDescription: item.shortDescription ?? (item as any).description,
      readingStyle: item.readingStyle ?? (item as any).prompt,
      accentColor: item.accentColor || "#C9A45C"
    })) as TarotDeck[];
  const nextCards = (payload.baseCards?.length ? payload.baseCards : payload.cards)
    .filter((item: any) => !item.status || ["active", "published"].includes(item.status)) as TarotCard[];
  // A partial remote bundle must never blank a working local app.
  if (nextPersonas.length === 0 || nextDecks.length === 0 || nextCards.length < 78) return false;
  personas.splice(0, personas.length, ...nextPersonas);
  decks.splice(0, decks.length, ...nextDecks);
  cards.splice(0, cards.length, ...nextCards);
  Object.keys(personasById).forEach((key) => delete personasById[key]);
  personas.forEach((item) => { personasById[item.id] = item; });
  Object.keys(decksById).forEach((key) => delete decksById[key]);
  decks.forEach((item) => { decksById[item.id] = item; });
  return true;
}

const promptLibrary = promptLibraryData as any[];
const adminMetrics = adminMetricsData as any;
const aiCouncilConfig = { ...aiCouncilConfigData, contract: councilContractData } as AiCouncilConfig;
const oracleActionCatalog = (oracleActionsData as { actions: OracleActionCard[] }).actions;

const managedLanguages: Language[] = ["vi", "en", "zh-Hans", "ja", "ko"];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ContentSource = {
  id: string;
  label: { vi: string; en: string };
  sourcePath: string;
  records: any[];
  keyStrategy: "slug" | "id";
  owner: string;
  action: { vi: string; en: string };
};

const contentSources: ContentSource[] = [
  {
    id: "tarot-decks",
    label: { vi: "Bộ bài tarot", en: "Tarot decks" },
    sourcePath: "packages/content/data/tarot-decks.json",
    records: decks,
    keyStrategy: "slug",
    owner: "Content",
    action: {
      vi: "Sửa tên, vibe, tier, visual direction và trạng thái publish.",
      en: "Edit names, vibe, tier, visual direction, and publish status."
    }
  },
  {
    id: "tarot-cards",
    label: { vi: "78 lá tarot", en: "78 tarot cards" },
    sourcePath: "packages/content/data/tarot-cards.json",
    records: cards,
    keyStrategy: "id",
    owner: "Content",
    action: {
      vi: "Quản lý meaning, keyword, reflection prompt theo từng lá.",
      en: "Manage meanings, keywords, and reflection prompts per card."
    }
  },
  {
    id: "personas",
    label: { vi: "Persona guide", en: "Persona guides" },
    sourcePath: "packages/content/data/personas-*.json",
    records: personas,
    keyStrategy: "slug",
    owner: "Persona",
    action: {
      vi: "Quản lý vai trò, mô tả, prompt gợi ý, tier và transparency note.",
      en: "Manage roles, descriptions, suggested prompts, tier, and transparency notes."
    }
  },
  {
    id: "prompts",
    label: { vi: "Prompt versions", en: "Prompt versions" },
    sourcePath: "packages/agent-config/prompt-library.json",
    records: promptLibrary,
    keyStrategy: "id",
    owner: "AI Ops",
    action: {
      vi: "Sửa draft song ngữ, chạy audit safety, publish/rollback version.",
      en: "Edit bilingual drafts, run safety audit, publish or roll back versions."
    }
  },
  {
    id: "ai-council",
    label: { vi: "AI Council config", en: "AI Council config" },
    sourcePath: "packages/agent-config/ai-council.json",
    records: [aiCouncilConfig],
    keyStrategy: "id",
    owner: "AI Ops",
    action: {
      vi: "Quản lý roster guide, endpoint, schema, context policy và prompt version cho hội đồng.",
      en: "Manage guide roster, endpoint, schema, context policy, and prompt version for the council."
    }
  },
  {
    id: "safety-rules",
    label: { vi: "Safety rules", en: "Safety rules" },
    sourcePath: "packages/agent-config/safety-rules.json",
    records: [safetyRules],
    keyStrategy: "id",
    owner: "Trust",
    action: {
      vi: "Giữ disclaimer, fallback và rule chặn chủ đề nhạy cảm.",
      en: "Maintain disclaimers, fallbacks, and sensitive-topic rules."
    }
  }
];

const moonGardenCardImages: Record<string, ImageSourcePropType> = {
  "major-00-fool": require("./assets/runtime/tarot/moon-garden/cards/major-00-fool.jpg"),
  "major-01-magician": require("./assets/runtime/tarot/moon-garden/cards/major-01-magician.jpg"),
  "major-02-high-priestess": require("./assets/runtime/tarot/moon-garden/cards/major-02-high-priestess.jpg"),
  "major-03-empress": require("./assets/runtime/tarot/moon-garden/cards/major-03-empress.jpg"),
  "major-04-emperor": require("./assets/runtime/tarot/moon-garden/cards/major-04-emperor.jpg"),
  "major-05-hierophant": require("./assets/runtime/tarot/moon-garden/cards/major-05-hierophant.jpg"),
  "major-06-lovers": require("./assets/runtime/tarot/moon-garden/cards/major-06-lovers.jpg"),
  "major-07-chariot": require("./assets/runtime/tarot/moon-garden/cards/major-07-chariot.jpg"),
  "major-08-strength": require("./assets/runtime/tarot/moon-garden/cards/major-08-strength.jpg"),
  "major-09-hermit": require("./assets/runtime/tarot/moon-garden/cards/major-09-hermit.jpg"),
  "major-10-wheel": require("./assets/runtime/tarot/moon-garden/cards/major-10-wheel.jpg"),
  "major-11-justice": require("./assets/runtime/tarot/moon-garden/cards/major-11-justice.jpg"),
  "major-12-hanged-man": require("./assets/runtime/tarot/moon-garden/cards/major-12-hanged-man.jpg"),
  "major-13-death": require("./assets/runtime/tarot/moon-garden/cards/major-13-death.jpg"),
  "major-14-temperance": require("./assets/runtime/tarot/moon-garden/cards/major-14-temperance.jpg"),
  "major-15-devil": require("./assets/runtime/tarot/moon-garden/cards/major-15-devil.jpg"),
  "major-16-tower": require("./assets/runtime/tarot/moon-garden/cards/major-16-tower.jpg"),
  "major-17-star": require("./assets/runtime/tarot/moon-garden/cards/major-17-star.jpg"),
  "major-18-moon": require("./assets/runtime/tarot/moon-garden/cards/major-18-moon.jpg"),
  "major-19-sun": require("./assets/runtime/tarot/moon-garden/cards/major-19-sun.jpg"),
  "major-20-judgement": require("./assets/runtime/tarot/moon-garden/cards/major-20-judgement.jpg"),
  "major-21-world": require("./assets/runtime/tarot/moon-garden/cards/major-21-world.jpg"),
  "minor-wands-ace": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-ace.jpg"),
  "minor-wands-two": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-two.jpg"),
  "minor-wands-three": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-three.jpg"),
  "minor-wands-four": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-four.jpg"),
  "minor-wands-five": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-five.jpg"),
  "minor-wands-six": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-six.jpg"),
  "minor-wands-seven": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-seven.jpg"),
  "minor-wands-eight": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-eight.jpg"),
  "minor-wands-nine": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-nine.jpg"),
  "minor-wands-ten": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-ten.jpg"),
  "minor-wands-page": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-page.jpg"),
  "minor-wands-knight": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-knight.jpg"),
  "minor-wands-queen": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-queen.jpg"),
  "minor-wands-king": require("./assets/runtime/tarot/moon-garden/cards/minor-wands-king.jpg"),
  "minor-cups-ace": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-ace.jpg"),
  "minor-cups-two": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-two.jpg"),
  "minor-cups-three": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-three.jpg"),
  "minor-cups-four": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-four.jpg"),
  "minor-cups-five": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-five.jpg"),
  "minor-cups-six": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-six.jpg"),
  "minor-cups-seven": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-seven.jpg"),
  "minor-cups-eight": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-eight.jpg"),
  "minor-cups-nine": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-nine.jpg"),
  "minor-cups-ten": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-ten.jpg"),
  "minor-cups-page": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-page.jpg"),
  "minor-cups-knight": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-knight.jpg"),
  "minor-cups-queen": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-queen.jpg"),
  "minor-cups-king": require("./assets/runtime/tarot/moon-garden/cards/minor-cups-king.jpg"),
  "minor-swords-ace": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-ace.jpg"),
  "minor-swords-two": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-two.jpg"),
  "minor-swords-three": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-three.jpg"),
  "minor-swords-four": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-four.jpg"),
  "minor-swords-five": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-five.jpg"),
  "minor-swords-six": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-six.jpg"),
  "minor-swords-seven": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-seven.jpg"),
  "minor-swords-eight": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-eight.jpg"),
  "minor-swords-nine": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-nine.jpg"),
  "minor-swords-ten": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-ten.jpg"),
  "minor-swords-page": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-page.jpg"),
  "minor-swords-knight": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-knight.jpg"),
  "minor-swords-queen": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-queen.jpg"),
  "minor-swords-king": require("./assets/runtime/tarot/moon-garden/cards/minor-swords-king.jpg"),
  "minor-pentacles-ace": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-ace.jpg"),
  "minor-pentacles-two": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-two.jpg"),
  "minor-pentacles-three": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-three.jpg"),
  "minor-pentacles-four": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-four.jpg"),
  "minor-pentacles-five": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-five.jpg"),
  "minor-pentacles-six": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-six.jpg"),
  "minor-pentacles-seven": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-seven.jpg"),
  "minor-pentacles-eight": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-eight.jpg"),
  "minor-pentacles-nine": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-nine.jpg"),
  "minor-pentacles-ten": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-ten.jpg"),
  "minor-pentacles-page": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-page.jpg"),
  "minor-pentacles-knight": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-knight.jpg"),
  "minor-pentacles-queen": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-queen.jpg"),
  "minor-pentacles-king": require("./assets/runtime/tarot/moon-garden/cards/minor-pentacles-king.jpg")
};

const deckPreviewCardIds = ["major-18-moon", "minor-cups-two", "major-17-star"];
const fallbackCardImage = moonGardenCardImages["major-18-moon"];

function buildCardImageMap(context: ImageRequireContext) {
  return context.keys().reduce((acc, key) => {
    const cardId = key.replace("./", "").replace(/\.(png|jpe?g)$/i, "");
    acc[cardId] = context(key);
    return acc;
  }, {} as Record<string, ImageSourcePropType>);
}

const deckCardImages: Record<string, Record<string, ImageSourcePropType>> = {
  "moon-garden": moonGardenCardImages,
  "rose-mirror": buildCardImageMap(require.context("./assets/runtime/tarot/rose-mirror/cards", false, /\.jpg$/)),
  "golden-thread": buildCardImageMap(require.context("./assets/runtime/tarot/golden-thread/cards", false, /\.jpg$/)),
  "astral-pop-atelier": buildCardImageMap(require.context("./assets/runtime/tarot/astral-pop-atelier/cards", false, /\.jpg$/)),
  "star-seeker": buildCardImageMap(require.context("./assets/runtime/tarot/star-seeker/cards", false, /\.jpg$/)),
  "stellar-mosaic": buildCardImageMap(require.context("./assets/runtime/tarot/stellar-academy/cards", false, /\.jpg$/)),
  "classic-arcana": buildCardImageMap(require.context("./assets/runtime/tarot/classic-arcana/cards", false, /\.jpg$/)),
  "celestial-reverie": buildCardImageMap(require.context("./assets/runtime/tarot/celestial-reverie/cards", false, /\.jpg$/))
};

/** One rotation rule for every image of a drawn card, so reversed art never shows upright. */
function reversedCardArt(card: { reversed?: boolean } | null | undefined) {
  return card?.reversed ? reversedCardArtStyle : null;
}
const reversedCardArtStyle = { transform: [{ rotate: "180deg" }] };

function pushPermissionLabel(status: string | undefined, language: Language) {
  const vi = language === "vi";
  if (status === "granted") return vi ? "Đã cho phép" : "Allowed";
  if (status === "denied") return vi ? "Đã tắt trong Cài đặt máy" : "Turned off in device Settings";
  if (status === "unavailable") return vi ? "Máy này không hỗ trợ" : "Not supported on this device";
  return vi ? "Chưa hỏi quyền" : "Not asked yet";
}

/** Question and card lines of a saved Tarot reading (analysis JO-05): name, position and orientation per card. */
function savedReadingLines(snapshot: unknown, language: Language): string[] {
  const vi = language === "vi";
  const saved = snapshot as { type?: string; question?: unknown } | undefined;
  if (saved?.type !== "tarot_reading") return [];
  const lines = typeof saved.question === "string" && saved.question.trim() ? [`${vi ? "Câu hỏi" : "Question"}: ${saved.question.trim()}`] : [];
  for (const card of savedReadingCards(snapshot, language)) {
    const known = cards.find((item) => item.id === card.id);
    if (!known) continue;
    lines.push(`${displayTarotCardInline(known, language)}${card.position ? ` · ${card.position}` : ""} · ${card.reversed ? (vi ? "Ngược" : "Reversed") : (vi ? "Xuôi" : "Upright")}`);
  }
  return lines;
}

/** Text a Journal entry shows: a manual note falls back to its body when the note is blank. */
function journalEntryBody(entry: JournalEntry) {
  return entry.sourceType === "manual" && entry.userNote?.trim() ? entry.userNote : entry.summary;
}

/** Starting value of the note editor, the same from the Journal list and from Home "Recent". */
function journalDraftNoteFor(entry: JournalEntry | undefined) {
  if (!entry) return "";
  if (entry.userNote?.trim()) return entry.userNote;
  return entry.sourceType === "manual" ? entry.summary : "";
}

function getTarotCardImage(deckId: string, cardId?: string) {
  if (!cardId) return fallbackCardImage;
  deckId = canonicalTarotDeckId(deckId);
  const deckImage = deckCardImages[deckId]?.[cardId];
  if (deckImage) return deckImage;
  if (deckId === "moon-garden") return moonGardenCardImages[cardId] ?? fallbackCardImage;
  return getDeckBackImage(deckId);
}

const personaDomainVisuals: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  calm: { icon: "moon-outline", color: colors.teal },
  communication: { icon: "chatbubble-ellipses-outline", color: colors.gold },
  control: { icon: "shield-checkmark-outline", color: colors.gold },
  decision: { icon: "git-compare-outline", color: colors.gold },
  discipline: { icon: "compass-outline", color: colors.gold },
  ethics: { icon: "sparkles-outline", color: colors.gold },
  flow: { icon: "water-outline", color: colors.teal },
  grounding: { icon: "leaf-outline", color: colors.moon },
  grounded: { icon: "leaf-outline", color: colors.moon },
  habits: { icon: "repeat-outline", color: colors.gold },
  inner_peace: { icon: "moon-outline", color: colors.gold },
  letting_go: { icon: "leaf-outline", color: colors.moon },
  poetic: { icon: "infinite-outline", color: colors.rose },
  purpose: { icon: "sparkles-outline", color: colors.gold },
  quiet: { icon: "moon-outline", color: colors.moon },
  reflective: { icon: "water-outline", color: colors.teal },
  relationships: { icon: "heart-outline", color: colors.rose },
  resilience: { icon: "shield-outline", color: colors.gold },
  simplicity: { icon: "ellipse-outline", color: colors.moon },
  spiritual: { icon: "sparkles-outline", color: colors.gold },
  strategic: { icon: "compass-outline", color: colors.gold },
  structured: { icon: "grid-outline", color: colors.moon },
  wise: { icon: "book-outline", color: colors.gold }
};
const personaEditorialOverrides: Record<
  string,
  {
    chronicleEyebrow?: LocalizedText;
    chronicleHeading?: LocalizedText;
    chronicleQuote?: LocalizedText;
    domainLabels?: LocalizedList;
    heroSubtitle?: LocalizedText;
    heroTitle?: LocalizedText;
    recentInsights?: LocalizedList;
    reflectionQuote?: LocalizedText;
    reflectionSummary?: LocalizedText;
  }
> = {
  laozi: {
    heroTitle: { vi: "Guide lấy cảm hứng từ Lão Tử", en: "Laozi-inspired Guide" },
    heroSubtitle: { vi: "Bậc thầy của dòng chảy", en: "The Old Master" },
    domainLabels: {
      vi: ["Dòng chảy tự nhiên", "Bình an nội tâm", "Nghĩ trong nghịch lý", "Hành động thuận tự nhiên"],
      en: ["Natural Flow", "Inner Peace", "Paradoxical Thinking", "Effortless Action"]
    },
    reflectionQuote: {
      vi: "Tự nhiên không vội vàng, nhưng mọi điều vẫn hoàn tất.",
      en: "Nature does not hurry, yet everything is accomplished."
    },
    reflectionSummary: {
      vi: "Hãy chờ một giọng nói điềm tĩnh, chiêm nghiệm và đôi khi hơi huyền nhiệm, luôn kéo bạn quay về bên trong thay vì tìm câu trả lời từ bên ngoài.",
      en: "Expect responses that are calm, reflective, and occasionally cryptic, encouraging you to look within rather than seeking external answers."
    },
    recentInsights: {
      vi: ["Cái hữu dụng của chiếc cốc nằm ở khoảng trống bên trong.", "Muốn dẫn dắt người khác, đôi khi hãy bước chậm phía sau họ."],
      en: ["The usefulness of a cup is in its emptiness.", "To lead people, walk behind them."]
    },
    chronicleEyebrow: { vi: "Bậc hiền triết vượt thời gian", en: "The Eternal Sage" },
    chronicleHeading: { vi: "Con đường của dòng chảy", en: "The Path of Flow" },
    chronicleQuote: {
      vi: "Đi theo Đạo là trở về trạng thái mộc mạc nguyên sơ. Khi tâm trí lặng xuống, nhịp sống bên trong mới bắt đầu rõ hơn.",
      en: "To follow the Tao is to return to a state of the uncarved block. In the silence of the mind, the inner rhythm becomes easier to hear."
    }
  }
};

const tarotGuideDeckDefaults: Record<string, string> = {
  "moon-garden": "inner-child-healer",
  "rose-mirror": "the-love-oracle",
  "golden-thread": "the-clear-strategist",
  "star-seeker": "the-star-weaver",
  "stellar-mosaic": "the-clear-strategist",
  "astral-pop-atelier": "the-shadow-mirror"
};

const tarotGuideDeckReasons: Record<string, Record<string, LocalizedText>> = {
  "moon-garden": {
    "inner-child-healer": {
      vi: "Hợp với bộ bài chậm, dịu và thiên về chăm sóc cảm xúc.",
      en: "Best for a slow, gentle deck centered on emotional care."
    },
    "the-mystic": {
      vi: "Đọc sâu hơn về biểu tượng và trực giác trong từng lá.",
      en: "Reads deeper into symbols and intuition in each card."
    }
  },
  "rose-mirror": {
    "the-love-oracle": {
      vi: "Hợp với câu hỏi tình cảm, ranh giới và nói điều thật một cách dịu dàng.",
      en: "Best for love, boundaries, and saying the true thing gently."
    },
    "inner-child-healer": {
      vi: "Làm mềm những cảm xúc dễ bị tự trách trong mối quan hệ.",
      en: "Softens feelings that can turn into self-blame in relationships."
    }
  },
  "golden-thread": {
    "the-clear-strategist": {
      vi: "Hợp với quyết định, chiến lược cá nhân và bước tiếp theo rõ ràng.",
      en: "Best for decisions, personal strategy, and a clear next step."
    },
    "the-shadow-mirror": {
      vi: "Soi rõ phần bạn đang né tránh trước khi chọn bước tiếp theo.",
      en: "Surfaces what you may be avoiding before choosing the next step."
    }
  },
  "star-seeker": {
    "the-star-weaver": {
      vi: "Hợp với năng lượng trẻ, hy vọng và trực giác hình ảnh.",
      en: "Best for youthful hope, imagery, and intuitive symbolism."
    },
    "the-mystic": {
      vi: "Giữ trải bài sáng nhưng vẫn bình tĩnh và có thể viết journal.",
      en: "Keeps the reading bright, calm, and journal-ready."
    }
  },
  "stellar-mosaic": {
    "the-clear-strategist": {
      vi: "Hợp với bài học, trưởng thành và cách hiểu mình trong tập thể.",
      en: "Best for lessons, growth, and understanding yourself in community."
    },
    "the-mystic": {
      vi: "Giúp biến bài học thành thực hành nhỏ và vững vàng.",
      en: "Turns the lesson into a small, steady practice."
    }
  },
  "astral-pop-atelier": {
    "the-shadow-mirror": {
      vi: "Hợp với cảm xúc nhiều lớp, bản sắc và ngôn ngữ mới cho chính mình.",
      en: "Best for layered feelings, identity, and finding a new self-language."
    },
    "the-star-weaver": {
      vi: "Thêm chiều biểu tượng cho những cảm xúc khó gọi tên.",
      en: "Adds symbolic depth to feelings that are hard to name."
    }
  }
};

const defaultTarotGuideSlugs = [
  "the-mystic",
  "inner-child-healer",
  "the-love-oracle",
  "the-shadow-mirror",
  "the-clear-strategist",
  "the-star-weaver"
];

function findPersonaBySlug(slug: string) {
  return personas.find((persona) => persona.slug === slug);
}

function getRecommendedTarotGuide(deckId: string) {
  return findPersonaBySlug(tarotGuideDeckDefaults[deckId] ?? "the-mystic") ?? findPersonaBySlug("the-mystic") ?? personas[0];
}

function getTarotGuideReason(deckId: string, persona: Persona, language: Language) {
  const reason = tarotGuideDeckReasons[deckId]?.[persona.slug];
  if (reason) return localizedText(reason, language);
  if (persona.slug === "the-mystic") {
    return language === "vi"
      ? "Lựa chọn linh hoạt khi bạn muốn đọc trải bài bằng biểu tượng và trực giác."
      : "A flexible choice when you want symbols and intuition to lead the reading.";
  }
  if (persona.slug === "inner-child-healer") {
    return language === "vi"
      ? "Hợp khi trải bài chạm vào cảm xúc mong manh hoặc cần được nâng đỡ."
      : "Useful when the reading touches tender feelings or needs emotional support.";
  }
  return language === "vi"
    ? "Một lăng kính khác để hỏi AI về cùng trải bài mà không đổi bộ bài."
    : "Another lens for asking AI about the same reading without changing decks.";
}

function getTarotGuideOptions(deckId: string) {
  const recommended = getRecommendedTarotGuide(deckId);
  const slugs = [
    recommended.slug,
    ...Object.keys(tarotGuideDeckReasons[deckId] ?? {}),
    ...defaultTarotGuideSlugs
  ];
  const seen = new Set<string>();
  return slugs
    .filter((slug) => {
      if (seen.has(slug)) return false;
      seen.add(slug);
      return true;
    })
    .map(findPersonaBySlug)
    .filter((persona): persona is Persona => Boolean(persona))
    .slice(0, 6);
}

const defaultProfile: Profile = {
  onboarded: false,
  nickname: "Luna",
  language: "vi",
  goals: [],
  tone: "gentle",
  currentStreak: 0,
  lastActivityDate: ""
};

const birthProfileStorageKey = "nilaza.birthProfile";
const favoritePersonaStorageKey = "nilaza.favoritePersonaIds";
const birthConsentVersion = "astrology_birth_data_v1";

const defaultBirthProfile: BirthProfileDraft = {
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  birthPlace: "",
  consentVersion: birthConsentVersion
};

const notificationTypes: Array<{ id: NotificationType; vi: string; en: string; channelDefault: "in_app" | "push" }> = [
  { id: "daily_insight_ready", vi: "Thông điệp mỗi ngày", en: "Daily insight ready", channelDefault: "push" },
  { id: "tarot_reading_ready", vi: "Kết quả trải bài đã sẵn sàng", en: "Tarot reading ready", channelDefault: "push" },
  { id: "astrology_report_ready", vi: "Lá số chiêm tinh đã sẵn sàng", en: "Astrology report ready", channelDefault: "push" },
  { id: "journal_reflection_reminder", vi: "Nhắc viết Nhật ký", en: "Journal reflection reminder", channelDefault: "push" },
  { id: "account_security", vi: "Tài khoản và bảo mật", en: "Account and security", channelDefault: "in_app" },
  { id: "payment_subscription", vi: "Thanh toán và gói Premium", en: "Payment and subscription", channelDefault: "in_app" },
  { id: "admin_test", vi: "Thông báo thử", en: "Test notification", channelDefault: "in_app" }
];

function defaultNotificationPreferences(now = new Date().toISOString()): NotificationPreference[] {
  return notificationTypes.flatMap((item) => [
    {
      id: `in_app:${item.id}`,
      channel: "in_app",
      type: item.id,
      enabled: true,
      updatedAt: now
    },
    {
      id: `push:${item.id}`,
      channel: "push",
      type: item.id,
      enabled: item.channelDefault === "push" ? false : false,
      updatedAt: now
    }
  ]);
}

function notificationPreferenceLabel(type: NotificationType, language: Language) {
  const item = notificationTypes.find((entry) => entry.id === type);
  return item ? localizedText(item, language, type) : type;
}

function isNotificationEnabled(preferences: NotificationPreference[], channel: NotificationPreference["channel"], type: NotificationType) {
  return preferences.find((item) => item.channel === channel && item.type === type)?.enabled ?? channel === "in_app";
}

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function getDeckBackImage(deckId: string) {
  return getDeckVisual(deckId, "back");
}

function getDeckThumbnailImage(deckId: string) {
  return getDeckVisual(deckId, "cover");
}

const tarotDeckStories: Record<string, {
  origin: { vi: string; en: string };
  ritual: { vi: string; en: string };
  audience: { vi: string; en: string };
  prompts: { vi: string[]; en: string[] };
}> = {
  "moon-garden": {
    origin: {
      vi: "Moon Garden giống một khu vườn đêm được thắp bằng ánh trăng: chậm, mềm và đủ yên để người dùng nghe lại tiếng nói bên trong.",
      en: "Moon Garden feels like a night garden lit by moonlight: slow, soft, and quiet enough for users to hear themselves again."
    },
    ritual: {
      vi: "Hợp với check-in hằng ngày, tự chăm sóc, những lúc cảm xúc đang mơ hồ hoặc khi người dùng cần một câu hỏi đẹp để viết journal.",
      en: "Best for daily check-ins, self-care, unclear emotions, and moments when the user needs a beautiful journal question."
    },
    audience: {
      vi: "Dành cho người mới bắt đầu tarot, người thích nhịp đọc dịu và những bạn đang tìm sự an toàn cảm xúc trước khi ra quyết định.",
      en: "For tarot beginners, people who like gentle readings, and users seeking emotional safety before deciding."
    },
    prompts: {
      vi: ["Mình đang né tránh cảm xúc nào?", "Hôm nay mình cần chăm sóc điều gì?", "Một bước nhỏ nào giúp mình dịu lại?"],
      en: ["What feeling am I avoiding?", "What needs care today?", "What small step would help me soften?"]
    }
  },
  "rose-mirror": {
    origin: {
      vi: "Rose Mirror là chiếc gương của tình cảm: không phán xét, không hứa hẹn kết quả, chỉ giúp người dùng nhìn rõ nhu cầu, ranh giới và lòng tự trọng.",
      en: "Rose Mirror is an emotional mirror: no judgment, no promised outcome, just clarity around needs, boundaries, and self-worth."
    },
    ritual: {
      vi: "Hợp với chuyện tình cảm, tình bạn, gia đình, self-worth và những câu hỏi cần sự thật dịu dàng hơn là lời khuyên cứng.",
      en: "Best for love, friendship, family, self-worth, and questions that need gentle honesty over hard advice."
    },
    audience: {
      vi: "Dành cho người dùng thích nội dung sâu về mối quan hệ, cần cảm giác được lắng nghe và muốn đặt ranh giới lành mạnh.",
      en: "For users drawn to relationship depth, feeling heard, and building healthier boundaries."
    },
    prompts: {
      vi: ["Mối quan hệ này đang phản chiếu điều gì?", "Mình cần ranh giới nào để thấy an toàn?", "Đâu là điều mình chưa dám nói thật?"],
      en: ["What is this relationship reflecting?", "What boundary would help me feel safe?", "What truth have I not said yet?"]
    }
  },
  "golden-thread": {
    origin: {
      vi: "Golden Thread đi theo hình ảnh một sợi chỉ sáng nối các lựa chọn rời rạc thành một bản đồ có trật tự.",
      en: "Golden Thread imagines a bright thread connecting scattered choices into a clearer map."
    },
    ritual: {
      vi: "Hợp với quyết định lớn, định hướng nghề nghiệp, chiến lược cá nhân và những thời điểm người dùng cần nhìn rõ hệ quả.",
      en: "Best for big decisions, career direction, personal strategy, and moments that need consequence-aware clarity."
    },
    audience: {
      vi: "Dành cho người thích giọng đọc sắc nét, trưởng thành, ít mơ hồ và có bước hành động cụ thể.",
      en: "For users who prefer a sharper, more mature reading with practical next steps."
    },
    prompts: {
      vi: ["Lựa chọn nào đang kéo mình ra khỏi giá trị cốt lõi?", "Nút thắt thật sự của quyết định này là gì?", "Bước tiếp theo nào vừa rõ vừa tử tế với mình?"],
      en: ["Which choice pulls me away from my values?", "What is the real knot in this decision?", "What next step is clear and kind?"]
    }
  },
  "star-seeker": {
    origin: {
      vi: "Star Seeker mang nhịp anime rực sáng: trẻ, giàu hy vọng, nhưng vẫn giữ tarot như một công cụ tự phản chiếu.",
      en: "Star Seeker carries a vivid anime mood: bright, youthful, and hopeful while keeping tarot as self-reflection."
    },
    ritual: {
      vi: "Hợp với ước mơ, bản sắc cá nhân, mục tiêu tương lai và những lúc người dùng cần được nhắc rằng mình còn nhiều khả năng.",
      en: "Best for dreams, identity, future goals, and moments when users need to remember their possibilities."
    },
    audience: {
      vi: "Dành cho Gen Z thích hình ảnh rực rỡ, lời đọc truyền cảm hứng và trải nghiệm có thể chia sẻ.",
      en: "For Gen Z users who enjoy vivid visuals, uplifting readings, and shareable moments."
    },
    prompts: {
      vi: ["Ước mơ nào vẫn đang gọi mình?", "Phiên bản tương lai của mình muốn nhắn gì?", "Mình có thể tin vào điều gì thêm một chút?"],
      en: ["Which dream is still calling me?", "What would my future self say?", "What can I believe in a little more?"]
    }
  },
  "stellar-mosaic": {
    origin: {
      vi: "Stellar Mosaic đặt hành trình trưởng thành vào những ô kính màu: mỗi lá là một mảnh bài học, phản chiếu cách người dùng học, sai và lớn lên.",
      en: "Stellar Mosaic places growth inside stained glass: each card is a lesson shard reflecting how users learn, stumble, and grow."
    },
    ritual: {
      vi: "Hợp với học tập, định vị bản thân trong tập thể, phát triển cá nhân và những câu hỏi về việc mình đang trở thành ai.",
      en: "Best for learning, belonging, self-development, and questions about who the user is becoming."
    },
    audience: {
      vi: "Dành cho người yêu mood học viện huyền ảo, thích cảm giác cổ điển nhưng vẫn muốn nội dung gần gũi.",
      en: "For users who love mystical academy moods, classic visuals, and emotionally accessible guidance."
    },
    prompts: {
      vi: ["Bài học nào đang lặp lại với mình?", "Mình đang so sánh bản thân ở đâu?", "Mình cần học điều gì bằng lòng dịu hơn?"],
      en: ["Which lesson keeps repeating?", "Where am I comparing myself?", "What do I need to learn more gently?"]
    }
  },
  "astral-pop-atelier": {
    origin: {
      vi: "Astral Pop Atelier là xưởng sáng tạo sau nửa đêm, nơi cảm xúc khó gọi tên được biến thành màu sắc, biểu tượng và bản đồ sao riêng.",
      en: "Astral Pop Atelier is a midnight studio where unnamed feelings become color, symbols, and a personal star map."
    },
    ritual: {
      vi: "Hợp với bản sắc, cảm xúc nhiều lớp, lựa chọn sáng tạo và những ngày người dùng cần ngôn ngữ mới cho chính mình.",
      en: "Best for identity, layered emotions, creative choices, and days when users need a new language for themselves."
    },
    audience: {
      vi: "Dành cho người thích phong cách hiện đại, điện ảnh, giàu cá tính và có chiều sâu cảm xúc.",
      en: "For users who like modern, cinematic, expressive visuals with emotional depth."
    },
    prompts: {
      vi: ["Cảm xúc nào của mình chưa có tên?", "Mình đang muốn tạo ra phiên bản nào?", "Điều gì sẽ thành bản đồ nếu mình chịu nhìn lâu hơn?"],
      en: ["Which feeling has no name yet?", "What version of myself am I creating?", "What could become a map if I looked longer?"]
    }
  },
  "classic-arcana": {
    origin: {
      vi: "Classic Arcana là diễn giải mới của Nilaza, gợi cảm hứng từ hình tượng Tarot châu Âu thế kỷ XV và tranh in tô màu thủ công; đây không phải bản phục dựng của một bộ bài lịch sử cụ thể. Tarot thuở đầu được dùng trong trò chơi bài, còn bộ này mời bạn gặp lại những biểu tượng quen thuộc như chất liệu để tự suy ngẫm.",
      en: "Classic Arcana is a new Nilaza interpretation inspired by fifteenth-century European tarot imagery and hand-colored prints; it is not a reconstruction of a specific historical deck. Tarot began as a card game, and this deck uses its familiar symbols as material for reflection."
    },
    ritual: {
      vi: "Hợp với người muốn làm quen cấu trúc 78 lá, trở lại với các biểu tượng quen thuộc hoặc so sánh một hình ảnh cổ điển với trải nghiệm hiện tại. Hãy đọc như một gợi ý suy ngẫm, không phải lời tiên đoán.",
      en: "Best for learning the 78-card structure, returning to familiar symbols, or comparing a classic image with present experience. Read each card as a reflection prompt, not a prediction."
    },
    audience: {
      vi: "Dành cho người từng trải nghiệm Tarot ở nơi khác và người mới muốn bắt đầu bằng ngôn ngữ hình ảnh dễ nhận ra, điềm tĩnh.",
      en: "For people who have encountered tarot elsewhere and newcomers who want to begin with a recognizable, grounded visual language."
    },
    prompts: {
      vi: ["Biểu tượng nào trên lá bài khiến mình chú ý đầu tiên?", "Hình ảnh quen thuộc này gợi trải nghiệm nào của mình?", "Mình muốn giữ lại câu hỏi nào sau lần đọc này?"],
      en: ["Which symbol on the card catches my attention first?", "What experience does this familiar image bring to mind?", "What question do I want to carry with me after this reading?"]
    }
  },
  "celestial-reverie": {
    "origin": {
      "vi": "Tinh Quang mở ra một miền hồ núi nơi ánh vàng cổ đi qua sương teal và đậu trên những việc rất đỗi con người: bắt đầu, lựa chọn, yêu thương, tranh luận, nghỉ ngơi và chăm sóc điều đang lớn. Bầu trời không viết sẵn tương lai. Nó đổi ánh sáng để bạn có thể nhìn một câu chuyện từ nhiều phía.\n\nHành trình của 22 lá Major đi qua những ngưỡng cửa lớn của trải nghiệm. Bốn bộ Minor trở về với nhịp sống cụ thể: Wands giữ ngọn lửa hành động và sáng tạo; Cups theo dòng cảm xúc và kết nối; Swords giúp nhìn vào suy nghĩ, lời nói và xung đột; Pentacles đặt chân xuống đất của công việc, nguồn lực và sự chăm sóc hằng ngày. Mỗi cảnh là một thế giới nhỏ có trọng lượng, điểm tựa và khoảng thở.\n\nTrong bộ bài này, vẻ đẹp không phủ lên khó khăn để xóa nó đi. Cơn mưa, bóng tối và những điều khép lại vẫn có chỗ, bên cạnh ánh ấm, tình bạn và niềm vui. Lá bài không ra lệnh cho bạn phải cảm thấy thế nào. Nó đưa ra một hình ảnh để đối thoại, một câu hỏi để giữ lại và quyền lựa chọn vẫn thuộc về bạn.",
      "en": "Celestial Reverie opens onto a realm of mountain lakes, where antique-gold light passes through teal mist and settles on deeply human acts: beginning, choosing, loving, disagreeing, resting and tending what is growing. The sky does not write the future in advance. It changes the light so that a story can be seen from more than one side.\n\nThe 22 Major cards move through the larger thresholds of experience. The four Minor suits return to everyday rhythms: Wands hold the fire of action and creativity; Cups follow feeling and connection; Swords attend to thought, language and conflict; Pentacles bring us to the ground of work, resources and daily care. Each scene is a small world with weight, support and room to breathe.\n\nBeauty in this deck does not cover difficulty to erase it. Rain, darkness and endings have a place alongside warmth, friendship and joy. A card does not tell you what you must feel. It offers an image to speak with, a question to carry, and a choice that remains your own."
    },
    "ritual": {
      "vi": "Một lá để đặt nhịp suy ngẫm cho ngày; Viết nhật ký về lựa chọn, cảm xúc và ranh giới; Khám phá một ý tưởng hoặc dự án sáng tạo; Trải ba lá: Điều đang hiện diện / Điều cần thêm chú ý / Một bước có thể thử; Trò chuyện tự nguyện về trải nghiệm của chính mình, không suy đoán ý nghĩ người vắng mặt.",
      "en": "One card to frame a day’s reflection; Journaling about choices, feelings and boundaries; Exploring a creative idea or project; A three-card spread: What is present / What needs attention / One step to try; Voluntary conversation about one’s own experience, without claiming to know an absent person’s thoughts."
    },
    "audience": {
      "vi": "Dành cho người trưởng thành mới làm quen hoặc đã đọc tarot, yêu mỹ thuật cổ tích thiên thể và muốn một giọng đọc giàu cảm xúc nhưng tôn trọng quyền tự quyết. Không đòi hỏi niềm tin siêu nhiên. Người đọc có thể dùng hình ảnh như chất liệu sáng tạo và tự phản tư.",
      "en": "For adult beginners and experienced tarot readers who enjoy celestial fairytale art and want an emotionally attentive voice that respects agency. No supernatural belief is required. Images can be used as creative and reflective material."
    },
    "prompts": {
      "vi": [
        "Chi tiết nào trong hình giữ ánh mắt mình lâu nhất?",
        "Điều gì ở đây giống trải nghiệm của mình, và điều gì không giống?",
        "Mình biết chắc điều gì, và đang suy đoán điều gì?",
        "Cảm xúc nào đang cần được gọi tên thay vì giải quyết ngay?",
        "Mình đang giữ một ranh giới, hay giữ quá chặt?",
        "Nguồn lực hoặc sự hỗ trợ nào đang có trong tầm với?",
        "Nếu đổi góc nhìn, câu chuyện này còn cách hiểu nào khác?",
        "Một bước nhỏ, cụ thể và vừa sức mình có thể thử là gì?"
      ],
      "en": [
        "Which detail in the image holds my attention longest?",
        "What here resembles my experience, and what does not?",
        "What do I know, and what am I assuming?",
        "What feeling needs to be named rather than immediately solved?",
        "Am I holding a boundary, or holding too tightly?",
        "What resource or support is within reach?",
        "What other reading becomes possible if I change perspective?",
        "What small, specific and manageable step could I try?"
      ]
    }
  }
};

function getTarotDeckStory(deckId: string) {
  return tarotDeckStories[canonicalTarotDeckId(deckId)] ?? tarotDeckStories["moon-garden"];
}

function getDeckExperience(deckId: string, language: Language, accessTier: TarotDeck["accessTier"]) {
  const premiumLabel = accessTier === "free"
    ? language === "vi" ? "Trải nghiệm đã gồm" : "Included experience"
    : language === "vi" ? "Sắp ra mắt" : "Coming soon";
  const sharedUnlocks = language === "vi"
    ? ["Giọng đọc riêng của bộ bài", "Chat với archetype từng lá", "Thẻ chia sẻ theo phong cách bộ bài"]
    : ["Deck-specific reading voice", "Chat with each card archetype", "Theme-matched share cards"];
  const catalog: Record<string, { sample: { vi: string; en: string }; unlocks?: { vi: string[]; en: string[] } }> = {
    "moon-garden": {
      sample: {
        vi: "Một reading Moon Garden không vội trả lời; nó làm dịu nhịp thở trước, rồi mới hỏi: cảm xúc nào đang cần được chăm sóc?",
        en: "A Moon Garden reading does not rush to answer; it softens the breath first, then asks which feeling needs care."
      }
    },
    "rose-mirror": {
      sample: {
        vi: "Rose Mirror đọc tình cảm như một chiếc gương ấm: không phán xét ai đúng sai, chỉ giúp bạn gọi tên nhu cầu và ranh giới.",
        en: "Rose Mirror reads love like a warm mirror: not judging who is right, but naming needs and boundaries."
      }
    },
    "golden-thread": {
      sample: {
        vi: "Golden Thread biến một lựa chọn rối thành bản đồ: đâu là giá trị cốt lõi, đâu là hệ quả, đâu là bước tiếp theo đủ sáng suốt.",
        en: "Golden Thread turns a tangled choice into a map: core values, consequences, and one discerning next step."
      },
      unlocks: {
        vi: ["Reading theo logic quyết định", "Gợi ý hành động ít mơ hồ hơn", "Card chat cho career và turning point"],
        en: ["Decision-logic readings", "Less vague action guidance", "Card chat for career and turning points"]
      }
    },
    "star-seeker": {
      sample: {
        vi: "Star Seeker đọc như một lời nhắc sáng: ước mơ nào vẫn đang gọi bạn, và niềm tin nào cần được thắp lại hôm nay?",
        en: "Star Seeker reads like a bright reminder: which dream is still calling, and which belief needs relighting today?"
      }
    },
    "stellar-mosaic": {
      sample: {
        vi: "Stellar Mosaic đọc mỗi lá như một mảnh kính màu: bài học nào đang lặp lại, và bạn đang lớn lên qua nó ra sao?",
        en: "Stellar Mosaic reads each card like stained glass: which lesson repeats, and how are you growing through it?"
      }
    },
    "astral-pop-atelier": {
      sample: {
        vi: "Astral Pop Atelier cho cảm xúc chưa có tên một bảng màu riêng, rồi biến nó thành câu hỏi bạn có thể thật sự sống cùng.",
        en: "Astral Pop Atelier gives unnamed feelings their own palette, then turns them into a question you can live with."
      }
    },
    "classic-arcana": {
      sample: {
        vi: "Classic Arcana đọc biểu tượng quen thuộc như một tấm gương: lá bài có thể mở ra câu hỏi, còn bạn là người chọn điều gì phù hợp với hoàn cảnh của mình.",
        en: "Classic Arcana treats familiar symbols as a mirror: a card can open a question, while you decide what fits your own circumstances."
      }
    },
    "celestial-reverie": {
      "sample": {
        "vi": "Ví dụ minh họa cho câu hỏi: “Mình muốn tiếp tục một dự án sáng tạo, nhưng chưa rõ bước tiếp theo.” Đây là một cách đọc có thể có, không phải dự đoán.\n\nTrong tuần này, bạn muốn thử một phần việc nhỏ nào và dùng dấu hiệu gì để biết nó có hữu ích?",
        "en": "Illustrative question: “I want to continue a creative project, but I am unsure of the next step.” This is one possible reading, not a prediction.\n\nWhat small piece of work would you like to try this week, and what sign would tell you whether it helped?"
      }
    }
  };
  const item = catalog[canonicalTarotDeckId(deckId)] ?? catalog["moon-garden"];
  return {
    label: premiumLabel,
    sample: localizedText(item.sample, language),
    unlocks: localizedList(item.unlocks ?? { vi: sharedUnlocks, en: sharedUnlocks }, language)
  };
}

const localContentSections: ContentSection[] = [
  ...(personaDetailContent as ContentSection[]),
  {
    id: "persona-laozi-reflections",
    ownerType: "persona",
    ownerId: "laozi",
    sectionKey: "reflections",
    title: { vi: "Góc phản chiếu", en: "Reflection Lenses" },
    body: {
      vi: "Một guide hợp khi bạn cần chậm lại, giảm nhiễu và phân biệt điều tự nhiên với điều đang bị ép buộc.",
      en: "A guide for slowing down, reducing noise, and separating what is natural from what is being forced."
    },
    blocks: [
      { title: { vi: "Điều mềm vẫn có sức mạnh", en: "Softness Still Has Power" }, body: { vi: "Không phải mọi quyết định đều cần được đẩy nhanh.", en: "Not every decision needs to be pushed faster." } },
      { title: { vi: "Quan sát trước khi phản ứng", en: "Observe Before Reacting" }, body: { vi: "Khoảng dừng nhỏ có thể cho thấy nhu cầu thật.", en: "A small pause can reveal the real need." } }
    ],
    displayStyle: "editorial",
    sortOrder: 10
  },
  {
    id: "persona-laozi-chronicle",
    ownerType: "persona",
    ownerId: "laozi",
    sectionKey: "chronicle",
    title: { vi: "Chronicle", en: "Chronicle" },
    body: {
      vi: "Nilaza không đóng vai người thật. Persona này là AI guide lấy cảm hứng từ các chủ đề Đạo gia đã được biên tập an toàn.",
      en: "Nilaza does not impersonate a real person. This persona is an inspired AI guide shaped by safely edited Taoist themes."
    },
    blocks: [],
    displayStyle: "quote",
    sortOrder: 20
  },
  {
    id: "tarot-deck-moon-garden-composition",
    ownerType: "tarot_deck",
    ownerId: "moon-garden",
    sectionKey: "composition",
    title: { vi: "Cấu trúc bộ bài", en: "Deck Composition" },
    subtitle: { vi: "78 lá, đọc theo nhịp cảm xúc", en: "78 cards, read through emotional rhythm" },
    body: {
      vi: "Moon Garden dùng hệ Rider-Waite làm nền nhưng nhấn vào biểu tượng mặt trăng, khu vườn, nước và ánh vàng dịu để hỗ trợ self-reflection.",
      en: "Moon Garden uses a Rider-Waite foundation while emphasizing moonlight, garden, water, and soft gold symbols for self-reflection."
    },
    blocks: [],
    displayStyle: "card",
    sortOrder: 10
  },
  {
    id: "share-template-daily-reading",
    ownerType: "share_template",
    ownerId: "daily_reading_card",
    sectionKey: "payload",
    title: { vi: "Share Card", en: "Share Card" },
    body: {
      vi: "Template local chỉ chứa deck, spread, lá chính và synthesis. Ghi chú riêng tư không xuất hiện trên thẻ.",
      en: "The local template only includes deck, spread, primary card, and synthesis. Private notes never appear on the card."
    },
    blocks: [],
    displayStyle: "card",
    sortOrder: 10
  }
];

function getContentSections(ownerType: ContentSection["ownerType"], ownerId: string, sectionKey?: string) {
  return localContentSections
    .filter((section) => section.ownerType === ownerType && section.ownerId === ownerId && (!sectionKey || section.sectionKey === sectionKey))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function localizedBlockValue(block: Record<string, unknown>, key: string, language: Language, fallback = "") {
  const value = block[key];
  if (value && typeof value === "object") return localizedText(value as any, language, fallback);
  return typeof value === "string" ? value : fallback;
}

const copy = {
  vi: {
    start: "Bắt đầu",
    continue: "Tiếp tục",
    save: "Lưu",
    saved: "Đã lưu vào Nhật ký",
    back: "Quay lại",
    skipForNow: "Bỏ qua lúc này",
    home: "Trang chủ",
    explore: "Khám phá",
    chat: "Trò chuyện",
    journal: "Nhật ký",
    profile: "Hồ sơ",
    welcomeTitle: "Nilaza",
    welcomeText: "Một người bạn AI dịu dàng, giúp bạn lắng nghe bản thân rõ hơn qua Tarot, chiêm tinh và nhật ký.",
    language: "Ngôn ngữ",
    nickname: "Tên hiển thị",
    seeking: "Hôm nay bạn đang tìm điều gì?",
    tone: "Bạn muốn người dẫn đường trò chuyện theo giọng nào?",
    birth: "Thông tin sinh tùy chọn",
    birthDate: "Ngày sinh YYYY-MM-DD",
    birthTime: "Giờ sinh HH:mm",
    birthPlace: "Nơi sinh",
    skipBirth: "Có thể bỏ qua và cập nhật sau.",
    birthPrivacyNote: "Ngày, giờ và nơi sinh chỉ dùng để cá nhân hóa phần chiêm tinh khi bạn chủ động mở tính năng đó. Bạn có thể để trống.",
    birthTimeUnknownHint: "Không biết giờ sinh, Nilaza vẫn gợi ý được Tarot, người dẫn đường và câu hỏi Nhật ký.",
    disclaimer: "Nội dung dùng cho giải trí và tự phản chiếu, không phải lời khuyên chuyên môn.",
    dailyTitle: "Dẫn hướng hôm nay",
    dailyInsight: "Hôm nay mời bạn lắng nghe trước khi quyết định. Một khoảng dừng nhỏ có thể cho thấy đâu là mong muốn thật của mình.",
    reflectNow: "Chiêm nghiệm ngay",
    drawTarot: "Rút nhanh",
    exploreTarot: "Khám phá Tarot",
    learnDeck: "Tìm hiểu bộ bài",
    drawWithDeck: "Rút với bộ này",
    quickDraw: "Rút nhanh một lá",
    tarotIntroTitle: "Bạn muốn bắt đầu theo cách nào?",
    tarotIntroText: "Nếu bạn mới dùng Nilaza, hãy xem cảm giác từng bộ bài trước. Nếu đã quen, bạn có thể rút nhanh ngay với bộ bài gần nhất.",
    deckBestFor: "Phù hợp với",
    deckVisualMood: "Không khí hình ảnh",
    deckReadingStyle: "Phong cách đọc",
    chatGuide: "Trò chuyện",
    openJournal: "Nhật ký",
    recommendedGuide: "Người dẫn gợi ý",
    recent: "Lượt rút gần đây",
    chooseGuide: "Chọn người dẫn",
    askSomething: "Viết điều bạn đang nghĩ...",
    send: "Gửi",
    newChat: "Hội thoại mới",
    report: "Báo cáo",
    chooseTopic: "Bạn muốn rõ ràng về điều gì?",
    chooseSpread: "Bạn muốn trải bài kiểu nào?",
    questionOptional: "Câu hỏi của bạn (không bắt buộc)",
    chooseDeck: "Chọn bộ bài",
    drawCards: "Chạm để rút 3 lá",
    reading: "Thông điệp của bạn",
    reflection: "Nhật ký gợi ý",
    emptyJournal: "Nhật ký của bạn còn trống.",
    privacy: "Kiểm soát riêng tư",
    reset: "Xóa dữ liệu trên thiết bị",
    exportData: "Xuất dữ liệu trên thiết bị",
    deleteAccountData: "Xóa dữ liệu trên thiết bị",
    clearBirthProfile: "Xóa hồ sơ ngày sinh",
    birthProfileCleared: "Đã xóa hồ sơ ngày sinh trên máy",
    exportPreview: "Đây là số liệu đang lưu trên máy này.",
    adminTitle: "Thao tác Admin",
    premium: "Nilaza Premium",
    upgrade: "Sắp ra mắt",
    restore: "Khôi phục giao dịch mua",
    missingNickname: "Hãy nhập tên hiển thị để Nilaza xưng hô tự nhiên hơn.",
    missingGoals: "Chọn ít nhất một điều bạn đang tìm kiếm hôm nay.",
    unknownBirthTime: "Tôi không biết giờ sinh",
    soulPreviewTitle: "Hồ sơ khởi đầu của bạn",
    soulPreviewText: "Nilaza sẽ dùng những lựa chọn này để gợi ý người dẫn đường, Tarot và Nhật ký phù hợp hơn. Bạn luôn có thể chỉnh lại trong Hồ sơ.",
    soulPreviewLoading: "Đang lưu lựa chọn, tạo dẫn hướng đầu tiên và đưa bạn vào Trang chủ.",
    createProfile: "Tạo hồ sơ",
    enterHome: "Vào Nilaza",
    creatingProfile: "Đang tạo khoảnh khắc đầu tiên...",
    generatingAnswer: "Người dẫn đang lắng nghe…",
    chatError: "Chưa tạo được câu trả lời. Bạn có thể thử lại hoặc hỏi ngắn hơn.",
    generatingReading: "Đang mở trải bài...",
    tarotError: "Chưa tạo được lời diễn giải. Các lá bạn đã rút vẫn được giữ nguyên.",
    retry: "Thử lại",
    freePlan: "Gói miễn phí",
    credits: "Lượt dùng",
    premiumPreview: "Xem trước gói Premium",
    restorePreview: "Khôi phục giao dịch sẽ có khi gói Premium ra mắt.",
    upgradePreview: "Gói Premium sắp ra mắt. Nilaza sẽ báo bạn khi nội dung này mở.",
    freeExperience: "Bạn vẫn có lá bài hôm nay, trải Tarot và trò chuyện với người dẫn đường.",
    dailyCredits: "Lượt tarot hôm nay",
    dailyLimit: "Giới hạn/ngày",
    freeCreditsReset: "Lượt trải bài làm mới vào đầu ngày mai.",
    creditLimitReached: "Bạn đã dùng hết lượt trải bài hôm nay. Lượt mới mở vào đầu ngày mai; trong lúc chờ, bạn có thể đọc thư viện 78 lá hoặc mở lại trải bài đã lưu.",
    premiumDeckPreview: "Bộ bài này sẽ mở khi gói Premium ra mắt. Bạn vẫn xem được câu chuyện và tranh; hôm nay hãy chọn một bộ miễn phí để trải bài.",
    premiumPersonaPreview: "Người dẫn đường này sẽ mở khi gói Premium ra mắt. Hôm nay hãy chọn một người dẫn đường miễn phí để trò chuyện.",
    reported: "Đã ghi nhận. Nilaza sẽ xem lại nội dung này.",
    reportReading: "Báo cáo lượt trải bài",
    shareReading: "Tạo thẻ chia sẻ",
    sharePreviewReady: "Xem lại nội dung trước khi chia sẻ.",
    sharePrivateNote: "Không kèm câu hỏi hay ghi chú riêng của bạn.",
    cardMeaning: "Ý nghĩa lá bài",
    deckComposition: "Cấu trúc bộ bài",
    oracleSynthesis: "Tổng hợp của Oracle",
    safetyEvents: "Sự kiện an toàn"
  },
  en: {
    start: "Start",
    continue: "Continue",
    save: "Save",
    saved: "Saved to Journal",
    back: "Back",
    skipForNow: "Skip for now",
    home: "Home",
    explore: "Explore",
    chat: "Chat",
    journal: "Journal",
    profile: "Profile",
    welcomeTitle: "Nilaza",
    welcomeText: "A mystical AI companion for listening to yourself with more clarity and care.",
    language: "Language",
    nickname: "Display name",
    seeking: "What are you seeking today?",
    tone: "How should your guide answer?",
    birth: "Optional birth profile",
    birthDate: "Birth date YYYY-MM-DD",
    birthTime: "Birth time HH:mm",
    birthPlace: "Birth place",
    skipBirth: "You can skip and update this later.",
    birthPrivacyNote: "Birth date, time, and place are only used to personalize astrology when you choose to open that feature. You can leave them blank.",
    birthTimeUnknownHint: "Nilaza can still suggest tarot, guides, and journal prompts if you do not know your birth time.",
    disclaimer: "Content is for entertainment and self-reflection, not professional advice.",
    dailyTitle: "Daily guidance",
    dailyInsight: "Today asks you to listen before you decide. A small pause may reveal which desire is truly yours.",
    reflectNow: "Reflect now",
    drawTarot: "Quick draw",
    exploreTarot: "Explore Tarot",
    learnDeck: "Learn the deck",
    drawWithDeck: "Draw with this deck",
    quickDraw: "Quick one-card draw",
    tarotIntroTitle: "How would you like to begin?",
    tarotIntroText: "If you are new to Nilaza, explore each deck's mood first. If you already know your reflection practice, draw quickly with your last deck.",
    deckBestFor: "Best for",
    deckVisualMood: "Visual mood",
    deckReadingStyle: "Reading style",
    chatGuide: "Chat guide",
    openJournal: "Journal",
    recommendedGuide: "Featured guide",
    recent: "Recent draws",
    chooseGuide: "Choose your guide",
    askSomething: "Pour your thoughts here...",
    send: "Send",
    newChat: "New",
    report: "Report",
    chooseTopic: "What do you want clarity on?",
    chooseSpread: "Which spread fits today?",
    questionOptional: "Your question (optional)",
    chooseDeck: "Choose a deck",
    drawCards: "Tap to draw 3 cards",
    reading: "Your reading",
    reflection: "Journal prompt",
    emptyJournal: "Your Journal is empty.",
    privacy: "Privacy controls",
    reset: "Clear local data",
    exportData: "Export data on this device",
    deleteAccountData: "Delete data on this device",
    clearBirthProfile: "Clear birth profile",
    birthProfileCleared: "Local birth profile cleared",
    exportPreview: "These are the counts stored on this device.",
    adminTitle: "Admin operations",
    premium: "Nilaza Premium",
    upgrade: "Coming soon",
    restore: "Restore purchases",
    missingNickname: "Enter a display name so Nilaza can address you naturally.",
    missingGoals: "Choose at least one thing you are seeking today.",
    unknownBirthTime: "I do not know my birth time",
    soulPreviewTitle: "Your starting profile",
    soulPreviewText: "Nilaza will use these choices to suggest better guides, tarot readings, and journal prompts. You can edit them later in Profile.",
    soulPreviewLoading: "Saving your choices, preparing the first daily insight, and taking you Home.",
    createProfile: "Create profile",
    enterHome: "Enter Nilaza",
    creatingProfile: "Creating your first reflection...",
    generatingAnswer: "Your guide is listening...",
    chatError: "The answer could not be created yet. Try again or use a shorter prompt.",
    generatingReading: "Opening your spread...",
    tarotError: "The reading could not be created yet. The cards were still selected safely in app.",
    retry: "Retry",
    freePlan: "Free plan",
    credits: "Credits",
    premiumPreview: "Premium preview",
    restorePreview: "Restoring purchases will be available when Premium launches.",
    upgradePreview: "Premium is coming soon. Nilaza will let you know when this opens.",
    freeExperience: "You still get today's card, Tarot readings and guide chats.",
    dailyCredits: "Tarot today",
    dailyLimit: "Daily limit",
    freeCreditsReset: "Tarot readings reset at the start of tomorrow.",
    creditLimitReached: "You have used today's Tarot readings. New readings open at the start of tomorrow; meanwhile you can browse the 78-card library or reopen a saved reading.",
    premiumDeckPreview: "This deck opens when Premium launches. You can still read its story and see the art; choose a Free deck to read today.",
    premiumPersonaPreview: "This guide opens when Premium launches. Choose a Free guide to chat today.",
    reported: "Saved for safety review.",
    reportReading: "Report reading",
    shareReading: "Create share card",
    sharePreviewReady: "Check what will be shared first.",
    sharePrivateNote: "Your question and private notes are not included.",
    cardMeaning: "Card meaning",
    deckComposition: "Deck composition",
    oracleSynthesis: "Oracle's Synthesis",
    safetyEvents: "Safety events"
  }
};

type Copy = (typeof copy)[keyof typeof copy];
export const getCopy = (language: Language): Copy => copy[language as keyof typeof copy] ?? copy.en;

// Onboarding goals (design canvas Onboarding, Owner decision 2026-10-31). "daily" was retired.
const goals = [
  { id: "love", vi: "Tình yêu", en: "Love" },
  { id: "career", vi: "Công việc", en: "Work" },
  { id: "self", vi: "Hiểu bản thân", en: "Understanding myself" },
  { id: "healing", vi: "Chữa lành", en: "Healing" },
  { id: "decision", vi: "Ra quyết định", en: "Making decisions" },
  { id: "curious", vi: "Tò mò tâm linh", en: "Spiritual curiosity" }
];

// Saved profiles with the retired "daily" goal move to "self".
function migrateGoals(saved: string[]) {
  return [...new Set(saved.map((goal) => (goal === "daily" ? "self" : goal)))].filter((goal) => goals.some((item) => item.id === goal)).slice(0, 3);
}

const tones = [
  { id: "gentle", vi: "Dịu dàng", en: "Gentle", previewVi: "Mình sẽ nói nhẹ, chậm, và an toàn.", previewEn: "I will answer softly, slowly, and safely." },
  { id: "direct", vi: "Thẳng thắn", en: "Direct", previewVi: "Mình sẽ ngắn gọn và rõ ràng hơn.", previewEn: "I will keep it concise and clear." },
  { id: "wise", vi: "Thông thái", en: "Wise", previewVi: "Mình sẽ dùng nhiều góc nhìn sâu hơn.", previewEn: "I will bring a more reflective lens." },
  { id: "playful", vi: "Vui nhẹ", en: "Playful", previewVi: "Mình sẽ giữ nhịp nhẹ và sáng.", previewEn: "I will keep the mood light and bright." },
  { id: "spiritual", vi: "Tâm linh", en: "Spiritual", previewVi: "Mình sẽ nói bằng ngôn ngữ biểu tượng hơn.", previewEn: "I will lean into symbolic language." }
];

const topics: Array<{ id: TarotTopic; vi: string; en: string }> = [
  { id: "love", vi: "Tình yêu", en: "Love" },
  { id: "career", vi: "Công việc", en: "Career" },
  { id: "self", vi: "Bản thân", en: "Self" },
  { id: "decision", vi: "Quyết định", en: "Decision" },
  { id: "open", vi: "Câu hỏi mở", en: "Open question" }
];

const spreads: Array<{
  id: TarotSpread;
  vi: string;
  en: string;
  cards: number;
  detail: { vi: string; en: string };
  learn: {
    bestFor: { vi: string; en: string };
    avoidWhen: { vi: string; en: string };
    example: { vi: string; en: string };
  };
  labels: { vi: string[]; en: string[] };
  /** Wording of the tile on the Ask step when it differs from "N lá" and the position list. */
  tile?: { title: { vi: string; en: string }; detail: { vi: string; en: string } };
}> = [
  {
    id: "daily-one",
    vi: "Một lá hôm nay",
    en: "One-card daily message",
    cards: 1,
    detail: { vi: "Nhanh, nhẹ, hợp check-in hằng ngày.", en: "Fast, light, ideal for a daily check-in." },
    learn: {
      bestFor: {
        vi: "Khi bạn mới bắt đầu, chỉ cần một lời nhắc nhẹ hoặc muốn check-in cảm xúc trong ngày.",
        en: "When you are new, want a light nudge, or only need a daily emotional check-in."
      },
      avoidWhen: {
        vi: "Không lý tưởng nếu câu hỏi có nhiều người, nhiều mốc thời gian hoặc cần phân tích bối cảnh.",
        en: "Less ideal when the question has many people, timelines, or needs more context."
      },
      example: {
        vi: "Hôm nay mình nên chú ý điều gì trong lòng mình?",
        en: "What should I pay attention to within myself today?"
      }
    },
    labels: { vi: ["Thông điệp"], en: ["Message"] }
  },
  {
    id: "past-present-future",
    vi: "Quá khứ / hiện tại / tiềm năng",
    en: "Past / present / future",
    cards: 3,
    detail: { vi: "Tốt cho câu hỏi cần nhìn theo dòng thời gian.", en: "Good for seeing a question across time." },
    learn: {
      bestFor: {
        vi: "Khi bạn muốn hiểu điều gì đã dẫn đến hiện tại và hướng phát triển có thể mở ra.",
        en: "When you want to understand what led here and what direction may be opening."
      },
      avoidWhen: {
        vi: "Không nên dùng như dự đoán chắc chắn về tương lai; lá cuối là tiềm năng, không phải kết luận.",
        en: "Do not treat it as a certain future prediction; the last card is potential, not a verdict."
      },
      example: {
        vi: "Mình đang học được gì từ chuyện này, và hướng nào đang mở ra?",
        en: "What am I learning from this, and what direction is opening?"
      }
    },
    labels: { vi: ["Quá khứ", "Hiện tại", "Tiềm năng"], en: ["Past", "Present", "Future"] }
  },
  {
    id: "situation-challenge-advice",
    vi: "Tình huống / thử thách / lời nhắc",
    en: "Situation / challenge / advice",
    cards: 3,
    detail: { vi: "Hợp khi bạn cần một bước tiếp theo rõ hơn.", en: "Useful when you need a clearer next step." },
    learn: {
      bestFor: {
        vi: "Khi bạn đã có một tình huống cụ thể và muốn biết điểm nghẽn cùng bước nhỏ tiếp theo.",
        en: "When you have a concrete situation and want the friction point plus a next small step."
      },
      avoidWhen: {
        vi: "Không phù hợp nếu bạn chỉ muốn một thông điệp rất nhanh hoặc câu hỏi còn quá rộng.",
        en: "Less useful if you only want a very quick message or the question is still too broad."
      },
      example: {
        vi: "Mình đang mắc ở đâu, và bước dịu nhất tiếp theo là gì?",
        en: "Where am I stuck, and what is the gentlest next step?"
      }
    },
    labels: { vi: ["Tình huống", "Thử thách", "Lời nhắc"], en: ["Situation", "Challenge", "Advice"] }
  },
  {
    id: "love-three",
    vi: "Tình yêu: bạn / người ấy / mối quan hệ",
    en: "Love: you / the other person / the relationship",
    cards: 3,
    detail: { vi: "Nhìn một mối quan hệ từ ba phía: bạn, người ấy và khoảng giữa hai người.", en: "Looks at a relationship from three sides: you, them and the space between." },
    learn: {
      bestFor: {
        vi: "Khi bạn muốn hiểu mình đang mang điều gì vào mối quan hệ và điều gì đang diễn ra giữa hai người.",
        en: "When you want to see what you bring into a relationship and what is happening between you two."
      },
      avoidWhen: {
        vi: "Không dùng để đoán người kia nghĩ hay cảm thấy gì. Lá “Người ấy” chỉ gợi cách bạn đang cảm nhận về họ và điều bạn có thể hỏi họ.",
        en: "Do not use it to guess what the other person thinks or feels. The “other person” card only reflects how you perceive them and what you could ask them."
      },
      example: {
        vi: "Mình đang mang điều gì vào mối quan hệ này, và điều gì cần được nói rõ hơn?",
        en: "What am I bringing into this relationship, and what needs to be said more clearly?"
      }
    },
    labels: { vi: ["Bạn", "Người ấy", "Mối quan hệ"], en: ["You", "The other person", "The relationship"] },
    tile: {
      title: { vi: "3 lá tình yêu", en: "3 love cards" },
      detail: { vi: "Bạn · Người ấy · Mối quan hệ", en: "You · Them · The relationship" }
    }
  },
  {
    id: "crossroads-four",
    vi: "Ngã rẽ: bốn lá cho một quyết định",
    en: "Crossroads: four cards for a decision",
    cards: 4,
    detail: { vi: "Đặt hai hướng đi cạnh nhau để cân nhắc, không để quyết định thay bạn.", en: "Sets two directions side by side to weigh, without deciding for you." },
    learn: {
      bestFor: {
        vi: "Khi bạn đang đứng trước hai lựa chọn rõ ràng và muốn nhìn từng hướng đi trước khi quyết định.",
        en: "When you face two clear options and want to look at each direction before deciding."
      },
      avoidWhen: {
        vi: "Không phải câu trả lời “nên” hay “không nên”. Các lá gợi điều đáng cân nhắc, quyết định vẫn là của bạn, và các việc về sức khỏe, pháp lý, tài chính cần người có chuyên môn.",
        en: "It is not a yes or no answer. The cards suggest what to weigh and the decision stays yours; health, legal and money questions need a qualified person."
      },
      example: {
        vi: "Mình đang cân nhắc hai hướng này, mỗi hướng cho mình thấy điều gì?",
        en: "I am weighing these two directions; what does each one show me?"
      }
    },
    labels: {
      vi: ["Điểm bạn đang đứng", "Nếu bước tới", "Nếu giữ nguyên", "Lời nhắc"],
      en: ["Where you stand", "If you step forward", "If you hold still", "Advice"]
    },
    tile: {
      title: { vi: "4 lá", en: "4 cards" },
      detail: { vi: "Ngã rẽ: nên hay không", en: "Crossroads: whether to" }
    }
  }
];

const tarotLearningModules: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  level: { vi: string; en: string };
  title: { vi: string; en: string };
  summary: { vi: string; en: string };
  bullets: { vi: string[]; en: string[] };
  practice: { vi: string; en: string };
}> = [
  {
    icon: "eye-outline",
    level: { vi: "Nền tảng", en: "Foundation" },
    title: { vi: "Tarot là chiếc gương biểu tượng", en: "Tarot as a symbolic mirror" },
    summary: {
      vi: "Tarot trong Nilaza không nói thay số phận. Nó giúp bạn gọi tên cảm xúc, nhìn bối cảnh và đặt câu hỏi tốt hơn.",
      en: "Tarot in Nilaza does not decide fate. It helps name feelings, read context, and ask better questions."
    },
    bullets: {
      vi: ["78 lá là 78 biểu tượng tâm lý và đời sống.", "Lá bài mở góc nhìn, không đóng lại lựa chọn.", "Một reading tốt luôn để lại một câu hỏi phản chiếu."],
      en: ["The 78 cards are symbolic lenses for inner and everyday life.", "Cards open perspective instead of closing choice.", "A good reading leaves you with a reflective question."]
    },
    practice: {
      vi: "Hãy hỏi: “Mình cần nhìn điều gì rõ hơn trong tình huống này?”",
      en: "Try asking: “What do I need to see more clearly in this situation?”"
    }
  },
  {
    icon: "hand-left-outline",
    level: { vi: "Bắt đầu", en: "Beginner" },
    title: { vi: "Cách rút và đặt ý định", en: "Drawing with intention" },
    summary: {
      vi: "Ý định là la bàn của trải bài. Câu hỏi càng mở và cụ thể, AI càng có cơ sở diễn giải có ích.",
      en: "Intention is the compass of a spread. The more open and specific the question, the more useful the reading."
    },
    bullets: {
      vi: ["Ưu tiên câu hỏi bắt đầu bằng “mình nên hiểu gì”, “mình đang né điều gì”.", "Tránh hỏi kết luận chắc chắn như “có xảy ra không”.", "Chọn spread theo độ sâu: một lá để check-in, ba lá để nhìn bối cảnh."],
      en: ["Prefer questions like “what should I understand” or “what am I avoiding”.", "Avoid certainty questions like “will this happen”.", "Pick spread depth: one card for a check-in, three cards for context."]
    },
    practice: {
      vi: "Viết lại một câu hỏi dự đoán thành câu hỏi phản chiếu trước khi rút.",
      en: "Rewrite a prediction question into a reflection question before drawing."
    }
  },
  {
    icon: "swap-vertical-outline",
    level: { vi: "Thực hành", en: "Practice" },
    title: { vi: "Đọc xuôi và ngược", en: "Reading upright and reversed" },
    summary: {
      vi: "Xuôi/ngược không phải tốt/xấu. Nó nói về cách năng lượng của lá đang lưu thông, bị chặn, hoặc quay vào bên trong.",
      en: "Upright/reversed does not mean good/bad. It shows whether the card energy is flowing, blocked, or turned inward."
    },
    bullets: {
      vi: ["Lá xuôi: chủ đề đang hiện rõ hoặc có thể hành động.", "Lá ngược: chủ đề cần chậm lại, chữa lành, hoặc xem lại niềm tin.", "Nilaza dùng trạng thái xuôi/ngược để điều chỉnh giọng đọc, không để phán xét bạn."],
      en: ["Upright: the theme is visible or ready for action.", "Reversed: the theme needs slowing down, healing, or reframing.", "Nilaza uses orientation to tune the reading, not judge you."]
    },
    practice: {
      vi: "Khi gặp lá ngược, hãy hỏi: “Điều gì đang bị kẹt hoặc chưa được lắng nghe?”",
      en: "When a card is reversed, ask: “What is stuck or not being heard yet?”"
    }
  },
  {
    icon: "albums-outline",
    level: { vi: "Bản đồ lá bài", en: "Card map" },
    title: { vi: "Ẩn chính, Ẩn phụ và bốn chất", en: "Major, Minor, and the four suits" },
    summary: {
      vi: "Hiểu nhóm lá giúp bạn biết vì sao một reading nghiêng về bài học lớn, cảm xúc, hành động, suy nghĩ hay đời sống thực tế.",
      en: "Card families explain whether a reading leans toward larger lessons, feelings, action, thought, or practical life."
    },
    bullets: {
      vi: ["Major Arcana nói về bước ngoặt và bài học lớn.", "Cups là cảm xúc và kết nối; Wands là động lực và sáng tạo.", "Swords là suy nghĩ và sự thật; Pentacles là cơ thể, tiền bạc, công việc và thói quen."],
      en: ["Major Arcana points to turning points and larger lessons.", "Cups covers feelings and connection; Wands covers drive and creativity.", "Swords covers thought and truth; Pentacles covers body, money, work, and habits."]
    },
    practice: {
      vi: "Khi đọc 3 lá, hãy xem nhóm nào xuất hiện nhiều nhất để hiểu trọng tâm của trải bài.",
      en: "In a three-card spread, notice which family appears most to find the reading’s center of gravity."
    }
  },
  {
    icon: "git-merge-outline",
    level: { vi: "Trung cấp", en: "Intermediate" },
    title: { vi: "Kết hợp nhiều lá thành một câu chuyện", en: "Combining cards into one story" },
    summary: {
      vi: "Một trải bài không phải ba câu trả lời rời rạc. Vị trí của lá và quan hệ giữa các lá tạo thành mạch diễn giải.",
      en: "A spread is not separate answers. Positions and relationships between cards create the interpretation."
    },
    bullets: {
      vi: ["Đọc từng lá theo vị trí trước: tình huống, thử thách, lời nhắc.", "Tìm điểm lặp: cùng chất, cùng số, cùng chủ đề cảm xúc.", "Tổng hợp bằng một thông điệp có thể hành động nhẹ nhàng."],
      en: ["Read each card by position first: situation, challenge, advice.", "Look for repetition: same suit, number, or emotional theme.", "Synthesize into one gentle, actionable message."]
    },
    practice: {
      vi: "Sau khi đọc từng lá, hãy viết một câu: “Ba lá này cùng đang mời mình...”",
      en: "After reading each card, write: “Together, these cards are inviting me to...”"
    }
  },
  {
    icon: "sparkles-outline",
    level: { vi: "Tin cậy AI", en: "AI trust" },
    title: { vi: "Vì sao Nilaza AI giải thích như vậy", en: "Why Nilaza AI explains it this way" },
    summary: {
      vi: "Nilaza không để AI tự bịa lá. App chọn lá trước, rồi AI diễn giải dựa trên dữ liệu có cấu trúc.",
      en: "Nilaza does not let AI invent cards. The app selects cards first, then AI interprets structured data."
    },
    bullets: {
      vi: ["Đầu vào gồm lá đã rút, vị trí, xuôi/ngược, câu hỏi và nghĩa lá đã lưu.", "AI nối biểu tượng với ngữ cảnh người dùng bằng giọng phản chiếu.", "Kết quả luôn là gợi ý tự hiểu mình, không phải lời chắc chắn về tương lai."],
      en: ["Inputs include selected cards, positions, orientation, your question, and stored meanings.", "AI connects symbols to user context in a reflective voice.", "The result is self-understanding guidance, not certainty about the future."]
    },
    practice: {
      vi: "Khi đọc kết quả, hãy kiểm tra: AI đã nhắc đúng lá, đúng vị trí và đúng câu hỏi của mình chưa?",
      en: "When reading a result, check: did AI reference the right cards, positions, and question?"
    }
  }
];

const astrologyFocusOptions: Array<{
  id: AstrologyFocus;
  icon: keyof typeof Ionicons.glyphMap;
  title: { vi: string; en: string };
  subtitle: { vi: string; en: string };
}> = [
  {
    id: "soul",
    icon: "sparkles-outline",
    title: { vi: "Linh hồn & bản chất", en: "Soul & Essence" },
    subtitle: { vi: "Tổng quan tính cách", en: "General overview" }
  },
  {
    id: "career",
    icon: "compass-outline",
    title: { vi: "Con đường & mục đích", en: "Path & Purpose" },
    subtitle: { vi: "Sự nghiệp & tiếng gọi", en: "Career & vocation" }
  },
  {
    id: "love",
    icon: "heart-outline",
    title: { vi: "Trái tim & kết nối", en: "Heart & Connection" },
    subtitle: { vi: "Tình yêu & quan hệ", en: "Love & relationships" }
  },
  {
    id: "shadow",
    icon: "moon-outline",
    title: { vi: "Tầng sâu ẩn giấu", en: "Hidden Depths" },
    subtitle: { vi: "Bài học nội tâm", en: "Inner lesson" }
  }
];

const tarotThemeLabels: Record<string, { vi: string; en: string }> = {
  self: { vi: "hiểu bản thân", en: "self-discovery" },
  healing: { vi: "tự chăm sóc", en: "self-care" },
  daily: { vi: "dẫn hướng hằng ngày", en: "daily guidance" },
  love: { vi: "tình cảm", en: "love" },
  relationship: { vi: "mối quan hệ", en: "relationships" },
  boundaries: { vi: "ranh giới", en: "boundaries" },
  decision: { vi: "quyết định", en: "decisions" },
  career: { vi: "sự nghiệp", en: "career" },
  strategy: { vi: "chiến lược", en: "strategy" },
  classic: { vi: "biểu tượng cổ điển", en: "classic symbolism" },
  explore: { vi: "khám phá", en: "exploration" }
};

const suitLensesVi: Record<NonNullable<TarotCard["suit"]>, string> = {
  wands: "động lực, sức sống và cách bạn bắt đầu",
  cups: "cảm xúc, kết nối và ranh giới mềm",
  swords: "sự thật, suy nghĩ và cách bạn gọi tên vấn đề",
  pentacles: "cơ thể, công việc và nguồn lực thực tế"
};

const majorThemesVi: Record<number, string> = {
  0: "khởi đầu",
  1: "ý chí",
  2: "trực giác",
  3: "nuôi dưỡng",
  4: "ranh giới",
  5: "niềm tin",
  6: "lựa chọn",
  7: "hướng đi",
  8: "can đảm",
  9: "chiêm nghiệm",
  10: "chu kỳ",
  11: "công bằng",
  12: "buông kiểm soát",
  13: "chuyển hóa",
  14: "điều hòa",
  15: "ràng buộc",
  16: "đổ vỡ cần thiết",
  17: "hy vọng",
  18: "vô thức",
  19: "sức sống",
  20: "thức tỉnh",
  21: "hoàn tất"
};

const rankGuidanceVi: Record<string, { upright: string; reversed: string }> = {
  ace: {
    upright: "hãy bảo vệ mầm ý định đầu tiên và cho nó một bước thử thật nhỏ",
    reversed: "đừng ép một mầm mới thành kết quả ngay; hãy hỏi nó cần điều kiện gì để lớn lên"
  },
  two: {
    upright: "hãy cân bằng hai nhu cầu đang kéo bạn theo hai hướng khác nhau",
    reversed: "hãy giảm nhịp và chọn một ưu tiên đủ rõ thay vì ôm cả hai phía"
  },
  three: {
    upright: "hãy để sự hợp tác, phản hồi hoặc góc nhìn bên ngoài giúp bạn thấy cấu trúc rõ hơn",
    reversed: "hãy kiểm tra xem mình có đang xây quá nhanh mà thiếu nền tảng hay không"
  },
  four: {
    upright: "hãy tạo một điểm tựa an toàn để bạn có thể thở và nhìn lại",
    reversed: "hãy mở một khe cửa nhỏ nếu sự an toàn đang biến thành đóng băng"
  },
  five: {
    upright: "hãy gọi tên va chạm thật sự, rồi chọn cách phản ứng ít làm tổn thương mình nhất",
    reversed: "hãy rời khỏi cuộc đấu không còn nuôi dưỡng bạn"
  },
  six: {
    upright: "hãy nhận ra phần hỗ trợ đang có và cho phép mình tiến thêm một bước",
    reversed: "hãy kiểm tra xem việc tìm công nhận bên ngoài có đang làm bạn xa mình hơn không"
  },
  seven: {
    upright: "hãy kiên nhẫn bảo vệ điều quan trọng mà không tự cô lập mình",
    reversed: "hãy phân biệt giữa cảnh giác lành mạnh và việc đóng cửa vì mệt mỏi"
  },
  eight: {
    upright: "hãy chú ý nhịp lặp lại; một điều nhỏ được làm đều có thể mở đường",
    reversed: "hãy dừng vòng lặp tự động và nhớ lại vì sao mình bắt đầu"
  },
  nine: {
    upright: "hãy tôn trọng giới hạn của mình và nhìn xem điều gì đã đủ chín",
    reversed: "hãy nghỉ trước khi sự bền bỉ biến thành tự gồng"
  },
  ten: {
    upright: "hãy nhận ra chu kỳ nào đã đầy và cần được sắp xếp lại",
    reversed: "hãy đặt xuống phần trách nhiệm không còn thuộc về bạn"
  },
  page: {
    upright: "hãy cho phần non trẻ trong bạn được tò mò, học hỏi và thử sai an toàn",
    reversed: "hãy mềm với sự vụng về của mình, nhưng vẫn chọn thực hành thay vì mơ hồ"
  },
  knight: {
    upright: "hãy để tốc độ đi cùng mục đích, không chỉ đi cùng cảm xúc nhất thời",
    reversed: "hãy chậm lại trước khi động lực mạnh biến thành hấp tấp"
  },
  queen: {
    upright: "hãy chăm sóc không gian bên trong trước khi chăm sóc mọi thứ xung quanh",
    reversed: "hãy để lòng tốt có ranh giới, nhất là khi bạn đang quên mình"
  },
  king: {
    upright: "hãy lãnh đạo bằng sự rõ ràng, điềm tĩnh và trách nhiệm",
    reversed: "hãy kiểm tra nơi quyền lực đang thiếu mềm mại hoặc biến thành áp đặt"
  }
};

const moodOptions = [
  { id: "calm", vi: "Bình an", en: "Calm" },
  { id: "curious", vi: "Tò mò", en: "Curious" },
  { id: "reflective", vi: "Suy ngẫm", en: "Reflective" },
  { id: "hopeful", vi: "Hy vọng", en: "Hopeful" },
  { id: "stuck", vi: "Mắc kẹt", en: "Stuck" }
];

const situationEntries: Array<{
  id: SituationId;
  icon: keyof typeof Ionicons.glyphMap;
  personaSlug: string;
  label: { vi: string; en: string };
  detail: { vi: string; en: string };
  prompt: { vi: string; en: string };
}> = [
  {
    id: "overthinking",
    icon: "cloudy-night-outline",
    personaSlug: "calm-living-mentor",
    label: { vi: "Mình đang overthinking", en: "I'm overthinking" },
    detail: { vi: "Gỡ rối thành một bước dễ thở.", en: "Untangle it into one breathable step." },
    prompt: {
      vi: "Mình đang overthinking. Hãy giúp mình gọi tên điều thật sự đang làm mình căng, rồi đề xuất một bước nhỏ an toàn trong hôm nay.",
      en: "I am overthinking. Help me name what is actually creating tension, then suggest one safe small step for today."
    }
  },
  {
    id: "text-someone",
    icon: "chatbubble-ellipses-outline",
    personaSlug: "communication-mentor",
    label: { vi: "Giúp mình nhắn tin", en: "Help me text someone" },
    detail: { vi: "Nói thật nhưng vẫn tinh tế.", en: "Be honest without sounding harsh." },
    prompt: {
      vi: "Mình cần nhắn một tin nhắn nhạy cảm. Hãy giúp mình viết theo cách thẳng thắn, tử tế, không gây áp lực cho người nhận.",
      en: "I need to send a sensitive message. Help me write it clearly and kindly without pressuring the other person."
    }
  },
  {
    id: "perspective",
    icon: "compass-outline",
    personaSlug: "aristotle",
    label: { vi: "Mình cần góc nhìn", en: "I need perspective" },
    detail: { vi: "Nhìn vấn đề bằng tiêu chí rõ hơn.", en: "Clarify the criteria beneath the choice." },
    prompt: {
      vi: "Mình cần một góc nhìn sáng suốt. Hãy giúp mình phân tích tình huống này bằng các tiêu chí rõ ràng, rồi kết thúc bằng một câu hỏi phản chiếu.",
      en: "I need a wiser perspective. Help me analyze this situation with clear criteria, then end with one reflection question."
    }
  },
  {
    id: "love-confusion",
    icon: "heart-outline",
    personaSlug: "confucius",
    label: { vi: "Mối quan hệ đang rối", en: "Love confusion" },
    detail: { vi: "Ranh giới, cảm xúc, và sự tôn trọng.", en: "Feelings, boundaries, and respect." },
    prompt: {
      vi: "Mình đang rối trong một mối quan hệ. Hãy giúp mình phân biệt cảm xúc, nhu cầu và ranh giới, không đưa ra dự đoán chắc chắn.",
      en: "I feel confused in a relationship. Help me separate feelings, needs, and boundaries without making certain predictions."
    }
  },
  {
    id: "career-fog",
    icon: "briefcase-outline",
    personaSlug: "sun-tzu",
    label: { vi: "Sự nghiệp mù mờ", en: "Career fog" },
    detail: { vi: "Nhìn nguồn lực và thời điểm.", en: "Map resources, timing, and next action." },
    prompt: {
      vi: "Mình đang mù mờ về công việc/sự nghiệp. Hãy giúp mình nhìn lại nguồn lực, rủi ro, thời điểm và một hành động nhỏ nên thử.",
      en: "I feel foggy about work or career. Help me map my resources, risks, timing, and one small action to try."
    }
  }
];

const premiumBenefits = [
  { vi: "Nhiều lượt chat guide hơn", en: "More persona chat" },
  { vi: "Reading tarot sâu hơn", en: "Deeper tarot readings" },
  { vi: "Premium guides", en: "Premium guides" },
  { vi: "Toàn bộ lịch sử Nhật ký", en: "Full journal history" },
  { vi: "Báo cáo chiêm tinh nâng cao", en: "Advanced astrology reports" }
];

const tabs: Tab[] = ["home", "explore", "chat", "journal", "profile"];

const adminViews: Array<{ id: AdminView; vi: string; en: string }> = [
  { id: "dashboard", vi: "Dashboard", en: "Dashboard" },
  { id: "prompts", vi: "Prompts", en: "Prompts" },
  { id: "content", vi: "Nội dung", en: "Content" },
  { id: "localization", vi: "Slug/i18n", en: "Slug/i18n" },
  { id: "jobs", vi: "Jobs", en: "Jobs" },
  { id: "notifications", vi: "Notifications", en: "Notifications" },
  { id: "safety", vi: "Safety", en: "Safety" }
];

const mockJobs = [
  { id: "#a8f9b2", feature: "Tarot reading", provider: "model-api", status: "completed", time: "2m ago", retry: 0 },
  { id: "#c4d7e1", feature: "Astrology chart", provider: "astro-api", status: "queued", time: "5m ago", retry: 0 },
  { id: "#f9a2b1", feature: "Tarot reading", provider: "model-api", status: "failed", time: "12m ago", retry: 1 }
];

const nowId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createPersonaSessionId = (personaId: string) => `persona-${personaId}-${nowId()}`;

const legacyPersonaSessionId = (personaId: string) => `legacy-${personaId}`;

const personaSessionIdForMessage = (message: ChatMessage) => {
  const sessionId = message.uiMetadata?.sessionId;
  return typeof sessionId === "string" && sessionId.trim().length > 0 ? sessionId : legacyPersonaSessionId(message.personaId);
};

type RecentConversation = {
  id: string;
  kind: "oracle" | "persona" | "council";
  title: string;
  preview: string;
  updatedAt: string;
  personaId?: string;
  sessionId?: string;
  /** Last message of the conversation, for the Tiếp tục card. */
  latestText?: string;
};

function buildRecentConversations(
  messages: ChatMessage[],
  oracleTurns: OracleTurn[],
  councilSessions: Array<{ id: string; title: string; templateName: string; turnCount: number; updatedAt: string }>,
  language: Language
): RecentConversation[] {
  const personaSessions = new Map<string, ChatMessage[]>();
  messages.forEach((message) => {
    const sessionId = personaSessionIdForMessage(message);
    const key = `${message.personaId}:${sessionId}`;
    personaSessions.set(key, [...(personaSessions.get(key) ?? []), message]);
  });
  const personaItems = Array.from(personaSessions.entries()).map(([key, sessionMessages]) => {
    const sorted = [...sessionMessages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const [personaId, sessionId] = key.split(":", 2);
    const persona = personasById[personaId];
    const latest = sorted[sorted.length - 1];
    const firstQuestion = sorted.find((message) => message.role === "user");
    return {
      id: `persona:${key}`,
      kind: "persona" as const,
      title: localizedText(persona?.name, language, language === "vi" ? "Guide" : "Guide"),
      preview: (firstQuestion?.text ?? latest?.text ?? "").replace(/\s+/g, " ").trim().slice(0, 72),
      updatedAt: latest?.createdAt ?? "",
      personaId,
      sessionId,
      latestText: (latest?.text ?? "").replace(/\s+/g, " ").trim().slice(0, 96)
    };
  });
  const oracleLatest = [...oracleTurns].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  const oracleItem = oracleLatest ? [{
    id: "oracle",
    kind: "oracle" as const,
    title: "Nilaza Oracle",
    preview: oracleLatest.text.replace(/\s+/g, " ").trim().slice(0, 72),
    updatedAt: oracleLatest.createdAt
  }] : [];
  const councilItems = councilSessions.map((session) => ({
    id: `council:${session.id}`,
    kind: "council" as const,
    title: session.title || "AI Council",
    preview: `${session.templateName} · ${session.turnCount} ${language === "vi" ? "lượt" : "turns"}`,
    updatedAt: session.updatedAt,
    sessionId: session.id
  }));
  return [...oracleItem, ...personaItems, ...councilItems]
    .filter((item) => item.updatedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function buildPersonaSessionSummaries(messages: ChatMessage[], personaId: string, language: Language): ChatSessionSummary[] {
  const grouped = new Map<string, ChatMessage[]>();

  messages
    .filter((message) => message.personaId === personaId)
    .forEach((message) => {
      const sessionId = personaSessionIdForMessage(message);
      grouped.set(sessionId, [...(grouped.get(sessionId) ?? []), message]);
    });

  return Array.from(grouped.entries())
    .map(([id, sessionMessages]) => {
      const sorted = [...sessionMessages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const firstUserMessage = sorted.find((message) => message.role === "user");
      const latestMessage = sorted[sorted.length - 1];
      const titleSource = firstUserMessage?.text ?? latestMessage?.text ?? "";
      const title = titleSource.trim().length > 0
        ? titleSource.replace(/\s+/g, " ").trim().slice(0, 64)
        : language === "vi" ? "Cuộc trò chuyện chưa có tiêu đề" : "Untitled chat";
      const userTurns = sorted.filter((message) => message.role === "user").length;
      return {
        id,
        meta: `${userTurns} ${language === "vi" ? "lượt hỏi" : "turns"} / ${new Date(latestMessage?.createdAt ?? Date.now()).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}`,
        title,
        updatedAt: latestMessage?.createdAt ?? ""
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(({ updatedAt, ...session }) => session);
}

const summarizeForSafety = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 180);

// Day keys follow the device calendar, so "today" and daily allowances turn over at
// local midnight instead of 07:00 in Vietnam (UTC+7).
const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const todayKey = () => localDateKey(new Date());
// Free follows the approved usage policy; Premium keeps the earlier client value until the Owner sets one.
// Owner 2026-11-04: 1 Tarot AI reading per day for every account; the server enforces the same limit.
const premiumDailyTarotLimit = 1;
const dailyTarotLimitFor = (tier: AccountTier) => tier === "premium" ? premiumDailyTarotLimit : aiUsagePolicy.freeDaily.tarotOneCard;

const isDateKey = (createdAt: string, dateKey: string) => {
  const created = new Date(createdAt);
  return Number.isNaN(created.getTime()) ? createdAt.slice(0, 10) === dateKey : localDateKey(created) === dateKey;
};

const previousDateKey = previousDayKey;

function buildNextStreakProfile(profile: Profile, dateKey: string): Profile {
  if (profile.lastActivityDate === dateKey) return profile;

  const continuedYesterday = profile.lastActivityDate === previousDateKey(dateKey);
  return {
    ...profile,
    currentStreak: continuedYesterday ? Math.max(1, profile.currentStreak + 1) : 1,
    lastActivityDate: dateKey
  };
}

const containsRiskyRequest = (text: string) => {
  const normalized = text.toLowerCase();
  return ["tự tử", "tu tu", "self harm", "diagnose", "chẩn đoán", "chan doan", "lawyer", "stock", "chứng khoán", "chung khoan"].some((word) =>
    normalized.includes(word)
  );
};

function oracleActionByKind(kind: OracleActionKind, handoffContext: OracleHandoffContext): OracleActionCard {
  const action = oracleActionCatalog.find((item) => item.kind === kind) ?? oracleActionCatalog[0];
  return {
    ...action,
    enabled: true,
    handoffContext
  };
}

function oracleIntentForText(text: string): OracleIntent {
  const intent = oracleIntent(text) as OracleIntent;
  if (intent !== "reflect") return intent;
  return /\b(?:quyet dinh|nen chon|lua chon|decide|decision)\b/.test(normalizeOracleText(text)) ? "council_handoff" : "reflect";
}

function buildOracleHandoffContext(text: string, intent: OracleIntent): OracleHandoffContext {
  const loveSignal = /love|tình|tinh|crush|relationship|nhắn|nhan|text/i.test(text);
  const careerSignal = /career|công việc|cong viec|nghề|nghe|job/i.test(text);
  const decisionSignal = /decision|quyết|quyet|chọn|chon/i.test(text);
  return {
    sourceType: "oracle",
    sourceId: nowId(),
    userMessage: text,
    safeSummary: summarizeForSafety(text),
    suggestedPersonaSlug: loveSignal ? "communication-mentor" : careerSignal ? "aristotle" : "the-mystic",
    suggestedCouncilTemplateId: loveSignal ? "love_confusion" : careerSignal ? "career_fog" : decisionSignal ? "big_decision" : "overthinking",
    suggestedTarotTopic: loveSignal ? "love" : careerSignal ? "career" : decisionSignal ? "decision" : "self",
    suggestedTarotSpread: decisionSignal || loveSignal || careerSignal ? "situation-challenge-advice" : "past-present-future",
    suggestedAstrologyFocus: careerSignal ? "career" : loveSignal ? "love" : "soul"
  };
}

function oracleActionsForIntent(intent: OracleIntent, handoffContext: OracleHandoffContext): OracleActionCard[] {
  const actionKinds: Record<OracleIntent, OracleActionKind[]> = {
    reflect: ["draw_tarot", "ask_guide", "save_journal"],
    tarot_handoff: ["draw_tarot", "ask_guide", "save_journal"],
    persona_handoff: ["ask_guide", "open_council", "draw_tarot"],
    council_handoff: ["open_council", "draw_tarot", "ask_guide"],
    astrology_handoff: ["cast_astrology", "ask_guide", "save_journal"],
    journal_handoff: ["save_journal", "reflect_here"],
    safety_redirect: []
  };
  return (actionKinds[intent] ?? actionKinds.reflect).map((kind) => oracleActionByKind(kind, handoffContext));
}

function buildOracleFallbackResult(text: string, language: Language): OracleTurnResult {
  const intent = oracleIntentForText(text);
  const handoffContext = buildOracleHandoffContext(text, intent);
  const actionCards = oracleActionsForIntent(intent, handoffContext);
  const replyByIntent: Record<OracleIntent, string> = {
    reflect: language === "vi"
      ? "Cảm ơn bạn đã kể. Bạn có thể trải vài lá bài để nhìn chuyện này qua biểu tượng, hỏi một người dẫn, hoặc viết vài dòng cho riêng mình."
      : "Thank you for sharing. You could draw a few cards to see this through symbols, ask a guide, or write a few lines for yourself.",
    tarot_handoff: language === "vi"
      ? "Câu hỏi này hợp với một lần trải bài. Mình sẽ mang câu hỏi của bạn sang phần Tarot; lá bài vẫn do bạn tự chọn."
      : "This question suits a tarot spread. I will carry your question to Tarot; you still choose the cards yourself.",
    persona_handoff: language === "vi"
      ? "Có vẻ bạn cần một người dẫn để trò chuyện tiếp. Bạn có thể mở một người dẫn phù hợp; chỉ phần tóm tắt câu hỏi được mang theo."
      : "It sounds like you would like a guide to talk this through. You can open a fitting guide; only a summary of your question goes with you.",
    council_handoff: language === "vi"
      ? "Chuyện này đáng được nhìn từ nhiều góc. Hội đồng 3 góc nhìn có thể giúp bạn cân nhắc trước khi quyết định."
      : "This is worth seeing from several angles. The three-view council can help you weigh it before you decide.",
    astrology_handoff: language === "vi"
      ? "Nếu bạn muốn nhìn qua lá số, mình sẽ mở phần Chiêm tinh. Lá số cần ngày, giờ và nơi sinh của bạn."
      : "If you would like to look through your chart, I will open Astrology. A chart needs your birth date, time and place.",
    journal_handoff: language === "vi"
      ? "Điều này có vẻ đáng được giữ lại. Bạn có thể viết vài dòng vào Nhật ký, chỉ lưu trên thiết bị của bạn."
      : "This seems worth keeping. You can write a few lines in your Journal, saved only on your device.",
    safety_redirect: localizedText(safetyRules.safeFallbacks, language)
  };
  return {
    reply: replyByIntent[intent],
    intent,
    confidence: intent === "reflect" ? 0.62 : 0.78,
    actionCards,
    handoffContext,
    promptVersionId: "oracle_router_system",
    moderationStatus: intent === "safety_redirect" ? "blocked" : "fallback"
  };
}

function initialPromptDrafts(): PromptDraft[] {
  return promptLibrary.map((prompt) => ({
    id: prompt.id,
    version: prompt.version,
    feature: prompt.feature,
    content: prompt.prompt,
    updatedAt: new Date().toISOString()
  }));
}

const hasManagedLocale = (value: any) =>
  value &&
  typeof value === "object" &&
  managedLanguages.some((language) => Object.prototype.hasOwnProperty.call(value, language));

const hasFilledLocaleValue = (value: any) =>
  (typeof value === "string" && value.trim().length > 0) || (Array.isArray(value) && value.length > 0);

function inspectLocaleCoverage(value: any, result = { localized: 0, viEnReady: 0, missingFuture: 0 }) {
  if (!value || typeof value !== "object") return result;

  if (hasManagedLocale(value)) {
    result.localized += 1;
    if (hasFilledLocaleValue(value.vi) && hasFilledLocaleValue(value.en)) result.viEnReady += 1;
    if (!hasFilledLocaleValue(value["zh-Hans"]) || !hasFilledLocaleValue(value.ja) || !hasFilledLocaleValue(value.ko)) {
      result.missingFuture += 1;
    }
  }

  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") inspectLocaleCoverage(nested, result);
  }

  return result;
}

function summarizeContentSource(source: ContentSource) {
  const keys = source.records
    .map((record) => (source.keyStrategy === "slug" ? record.slug : record.id))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  const duplicateKeys = keys.length - new Set(keys).size;
  const invalidSlugs = source.keyStrategy === "slug" ? keys.filter((key) => !slugPattern.test(key)) : [];
  const locale = inspectLocaleCoverage(source.records);

  return {
    ...source,
    duplicateKeys,
    invalidSlugs,
    locale,
    recordsCount: source.records.length
  };
}

const contentSourceSummaries = contentSources.map(summarizeContentSource);
const totalLocalizedRecords = contentSourceSummaries.reduce((sum, source) => sum + source.locale.localized, 0);
const totalViEnReady = contentSourceSummaries.reduce((sum, source) => sum + source.locale.viEnReady, 0);
const invalidSlugCount = contentSourceSummaries.reduce((sum, source) => sum + source.invalidSlugs.length, 0);
const duplicateKeyCount = contentSourceSummaries.reduce((sum, source) => sum + source.duplicateKeys, 0);
const futureLocaleGaps = contentSourceSummaries.reduce((sum, source) => sum + source.locale.missingFuture, 0);

const formatRatio = (ready: number, total: number) => (total > 0 ? `${Math.round((ready / total) * 100)}%` : "n/a");

function buildOracleChatHandoffContext(context: OracleHandoffContext, language: Language): ChatHandoffContext {
  return {
    sourceType: "oracle_reflection",
    sourceId: context.sourceId,
    sourceLabel: language === "vi" ? "Nilaza Oracle" : "Nilaza Oracle",
    userQuestion: context.userMessage,
    safeSummary: context.safeSummary
  };
}

// Analysis CH-06 (Owner 2026-11-02): the composer only suggests a short sentence; the cards, question
// and summary travel as userContext.handoffContext with every message, so clearing the box keeps them.
function buildHandoffPrompt(context: ChatHandoffContext, language: Language) {
  const vi = language === "vi";
  if (context.sourceType === "tarot_card" && context.tarot?.cardFocus) {
    return vi ? `Mình muốn hiểu thêm về lá ${context.tarot.cardFocus.name}.` : `I'd like to understand ${context.tarot.cardFocus.name} better.`;
  }
  if (context.sourceType === "tarot_reading") return vi ? "Mình muốn hỏi sâu hơn về trải bài vừa rồi." : "I'd like to go deeper into this reading.";
  if (context.sourceType === "astrology_report") return vi ? "Mình muốn hỏi thêm về lá số của mình." : "I'd like to ask more about my chart.";
  if (context.sourceType === "daily_zodiac_pulse") return vi ? "Mình muốn hỏi thêm về bầu trời hôm nay." : "I'd like to ask more about today's sky.";
  return vi ? "Mình muốn nói thêm về điều này." : "I'd like to talk more about this.";
}

function buildHandoffReplyPrefix(persona: Persona, context: ChatHandoffContext, language: Language) {
  const personaName = localizedText(persona.name, language);
  if (context.sourceType === "tarot_card" && context.tarot?.cardFocus) {
    const card = context.tarot.cardFocus;
    return language === "vi"
      ? `${personaName} đang mở một cuộc trò chuyện với archetype của ${card.name} trong ${card.deckName}. Mình sẽ giúp bạn hỏi lá bài như một biểu tượng sống, không biến nó thành lời phán chắc chắn.`
      : `${personaName} is opening a conversation with the archetype of ${card.name} in ${card.deckName}. I will help you speak with the card as a living symbol, not a fixed prediction.`;
  }

  if (context.sourceType === "tarot_reading" && context.tarot) {
    const cardNames = context.tarot.cards.map((card) => card.name).slice(0, 3).join(language === "vi" ? ", " : ", ");
    return language === "vi"
      ? `${personaName} đang nhìn lại trải bài ${context.tarot.spread} với ${cardNames}. Mình sẽ giữ nó như một chiếc gương biểu tượng, không phải dự đoán chắc chắn.`
      : `${personaName} is looking back at your ${context.tarot.spread} reading with ${cardNames}. I will hold it as a symbolic mirror, not a certain prediction.`;
  }

  if (context.sourceType === "astrology_report" && context.astrology) {
    const signs = [context.astrology.sunSign, context.astrology.moonSign, context.astrology.risingSign].filter(Boolean).join(" / ");
    return language === "vi"
      ? `${personaName} đang đọc astrology preview của bạn${signs ? ` qua ${signs}` : ""}. Mình sẽ tách dữ liệu đã có khỏi phần diễn giải mềm.`
      : `${personaName} is reading your astrology preview${signs ? ` through ${signs}` : ""}. I will separate available data from gentle interpretation.`;
  }

  if (context.sourceType === "daily_zodiac_pulse" && context.zodiacPulse) {
    return language === "vi"
      ? `${personaName} đang đọc Zodiac Pulse hôm nay${context.zodiacPulse.sign ? ` qua ${context.zodiacPulse.sign}` : ""}. Mình sẽ giữ đây là một khoảnh khắc phản chiếu, không phải dự đoán chắc chắn.`
      : `${personaName} is reading today's Zodiac Pulse${context.zodiacPulse.sign ? ` through ${context.zodiacPulse.sign}` : ""}. I will keep this as a reflective moment, not a certain prediction.`;
  }

  return language === "vi"
    ? `${personaName} đang tiếp nối context trước đó của bạn một cách an toàn.`
    : `${personaName} is continuing from your previous context safely.`;
}

function buildTarotHandoffContext(reading: ReturnType<typeof drawReading>, language: Language): ChatHandoffContext {
  const spreadLabel = localizedText(spreads.find((spread) => spread.id === reading.spread), language, reading.spread);
  const topicLabel = localizedText(topics.find((topic) => topic.id === reading.topic), language, reading.topic);
  const cardsForContext = reading.selected.map((card, index) => ({
    name: displayTarotCardInline(card, language),
    position: localizedText(reading.cards[index]?.positionLabel, language, card.spread),
    orientation: card.reversed ? "reversed" as const : "upright" as const
  }));

  return {
    sourceType: "tarot_reading",
    sourceId: reading.id,
    sourceLabel: language === "vi" ? "trải bài tarot" : "tarot reading",
    userQuestion: reading.question,
    safeSummary: summarizeForSafety(reading.summary),
    tarot: {
      topic: topicLabel,
      spread: spreadLabel,
      deckName: localizedText(reading.deck.name, language),
      cards: cardsForContext,
      synthesis: reading.summary,
      reflectionPrompt: reading.reflection
    }
  };
}

function buildTarotCardHandoffContext(
  card: TarotCard | DrawnTarotCard,
  deck: TarotDeck,
  language: Language,
  reading?: ReturnType<typeof drawReading> | null
): ChatHandoffContext {
  const cardName = displayTarotCardInline(card, language);
  const deckName = localizedText(deck.name, language);
  const orientation = "reversed" in card
    ? card.reversed
      ? "reversed" as const
      : "upright" as const
    : "library" as const;
  const orientationLabel = orientation === "library"
    ? language === "vi" ? "khám phá thư viện" : "library study"
    : orientation;
  const archetype = localizedText(card.personalityPortrait, language, localizedText(card.intro, language));
  const reflectionPrompt = localizedText(card.reflectionQuestion, language);
  const sourceSummary = reading
    ? `${reading.summary} ${cardName}: ${displayTarotMeaning(card, language)}`
    : `${cardName} in ${deckName}: ${displayTarotMeaning(card, language)} ${reflectionPrompt}`;

  return {
    sourceType: "tarot_card",
    sourceId: `${deck.id}:${card.id}`,
    sourceLabel: language === "vi" ? `lá ${cardName}` : `${cardName} card`,
    userQuestion: reading?.question,
    safeSummary: summarizeForSafety(sourceSummary),
    tarot: {
      topic: reading
        ? localizedText(topics.find((topic) => topic.id === reading.topic), language, reading.topic)
        : language === "vi" ? "Khám phá lá bài" : "Card study",
      spread: reading
        ? localizedText(spreads.find((spread) => spread.id === reading.spread), language, reading.spread)
        : language === "vi" ? "Thư viện 78 lá" : "78-card library",
      deckName,
      cardFocus: {
        name: cardName,
        orientation,
        deckName,
        archetype,
        reflectionPrompt
      },
      cards: [{
        name: cardName,
        position: "spread" in card ? card.spread : orientationLabel,
        orientation: orientation === "reversed" ? "reversed" : "upright"
      }],
      synthesis: reading?.summary ?? displayTarotMeaning(card, language),
      reflectionPrompt
    }
  };
}

function buildAstrologyHandoffContext(report: AstrologyReport, language: Language): ChatHandoffContext {
  const focusLabel = localizedText(astrologyFocusOptions.find((item) => item.id === report.focus)?.title, language, report.focus);
  const redactBirthFields = (value: string) => {
    let redacted = value;
    if (report.birthDate) redacted = redacted.replaceAll(report.birthDate, "birth date");
    if (report.birthPlace) redacted = redacted.replaceAll(report.birthPlace, "birth place");
    return redacted;
  };
  const safeSections = report.sections.map((section) => ({
    title: section.title,
    body: redactBirthFields(section.body)
  }));
  return {
    sourceType: "astrology_report",
    sourceId: report.id,
    sourceLabel: language === "vi" ? "bài đọc chiêm tinh" : "astrology reading",
    safeSummary: summarizeForSafety(safeSections.map((section) => `${section.title}: ${section.body}`).join(" ")),
    astrology: {
      focus: focusLabel,
      birthTimeKnown: report.birthTimeKnown,
      calculationStatus: report.calculationStatus,
      provider: report.provider,
      sunSign: report.sunSign,
      moonSign: report.moonSign,
      risingSign: report.risingSign,
      caveats: (report.caveats ?? []).map((item) => summarizeForSafety(JSON.stringify(item))),
      sections: safeSections
    }
  };
}

function buildZodiacHandoffContext(pulse: ZodiacPulse, language: Language): ChatHandoffContext {
  return {
    sourceType: "daily_zodiac_pulse",
    sourceId: pulse.id,
    sourceLabel: language === "vi" ? "Zodiac Pulse hôm nay" : "today's Zodiac Pulse",
    safeSummary: summarizeForSafety(`${pulse.title}. ${pulse.reflection}. ${pulse.microAction}`),
    zodiacPulse: pulse
  };
}

function buildPersonaReply(persona: Persona, text: string, language: Language, handoffContext?: ChatHandoffContext) {
  if (containsRiskyRequest(text)) {
    return localizedText(safetyRules.safeFallbacks, language);
  }

  const prompt = localizedList(persona.suggestedPrompts, language)[0] ?? "";
  const personaName = localizedText(persona.name, language);
  const lens = personaConversationLens(persona, language);
  const base =
    language === "vi"
      ? `Mình là AI guide lấy cảm hứng từ ${localizedText(persona.name, "vi", personaName)}. Qua lăng kính ${lens.toLowerCase()}, câu hỏi này đang mời bạn chậm lại và tách điều thật sự quan trọng khỏi tiếng ồn xung quanh.`
      : `I am an AI guide inspired by ${localizedText(persona.name, "en", personaName)}. Through the lens of ${lens.toLowerCase()}, this question invites you to slow down and separate what matters from the surrounding noise.`;
  const close =
    language === "vi"
      ? `Một bước nhỏ: viết ra 1 điều bạn có thể làm trong 24 giờ tới. Nếu muốn tiếp tục, hãy hỏi: "${prompt}"`
      : `One small step: write one thing you can do in the next 24 hours. To continue, ask: "${prompt}"`;
  const handoffPrefix = handoffContext ? `${buildHandoffReplyPrefix(persona, handoffContext, language)}\n\n` : "";
  return `${handoffPrefix}${base}\n\n${close}`;
}

function selectTarotCards(spread: TarotSpread, language: Language): DrawnTarotCard[] {
  const spreadOption = spreads.find((item) => item.id === spread) ?? spreads[1];
  const spreadLabels = localizedList(spreadOption.labels, language);
  return drawRandomCards(spreadOption.cards, cards.length).map((pick, position) => ({
    ...cards[pick.index],
    reversed: pick.reversed,
    spread: spreadLabels[position]
  }));
}

function buildLocalTarotInterpretation(
  deck: TarotDeck,
  topic: TarotTopic,
  spread: TarotSpread,
  question: string,
  language: Language,
  selected: DrawnTarotCard[]
) {
  const spreadOption = spreads.find((item) => item.id === spread) ?? spreads[1];
  const topicLabel = localizedText(topics.find((item) => item.id === topic), language, topic);
  const spreadLabel = localizedText(spreadOption, language, spreadOption.id);
  const cardNames = selected.map((card) => displayTarotCardInline(card, language)).join(", ");
  const summary =
    language === "vi"
      ? `${question.trim() ? `Bạn đang khám phá câu hỏi: “${question.trim()}”. ` : `Bạn đang phản chiếu về ${topicLabel.toLowerCase()}. `}Trải ${spreadLabel.toLowerCase()} với ${localizedText(deck.name, "vi")} gồm ${cardNames}. Đây là ý nghĩa có sẵn để bạn tự đối chiếu với câu hỏi; diễn giải AI chưa hoàn tất. Hãy chọn một chi tiết khiến bạn chú ý và viết điều nó gợi ra, thay vì xem lá bài là kết luận về tương lai.`
      : `${question.trim() ? `You are exploring: “${question.trim()}”. ` : `You are reflecting on ${topicLabel.toLowerCase()}. `}Your ${spreadLabel.toLowerCase()} spread with ${localizedText(deck.name, "en")} contains ${cardNames}. These are reference meanings to compare with your question; AI interpretation has not completed. Choose one detail that catches your attention and write what it brings up rather than treating it as a verdict about the future.`;

  return {
    summary,
    reflection: buildTarotReflectionPrompt(selected[0], topic, language),
    moderationStatus: "fallback" as const
  };
}

function buildTarotReflectionPrompt(card: TarotCard, topic: TarotTopic, language: Language) {
  if (language !== "vi") return localizedText(card.reflectionQuestion, language);

  const keyword = displayTarotReflectionTopic(card);
  const topicLabel = localizedText(topics.find((item) => item.id === topic), "vi", "bản thân").toLowerCase();
  return `Nếu ${keyword.toLowerCase()} đang là chủ đề chính trong ${topicLabel}, một hành động nhỏ nào sẽ giúp bạn thành thật hơn với mình hôm nay?`;
}

function displayTarotCardName(card: TarotCard, _language?: Language) {
  return cardTitle(card.name);
}

function displayTarotCardSubtitle(card: TarotCard, language: Language) {
  return cardSubtitle(card.name, language);
}

function displayTarotCardInline(card: TarotCard, language: Language) {
  return cardInline(card.name, language);
}

const majorNumerals = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
const suitNames: Record<NonNullable<TarotCard["suit"]>, { vi: string; en: string }> = {
  wands: { vi: "Gậy", en: "Wands" },
  cups: { vi: "Cốc", en: "Cups" },
  swords: { vi: "Kiếm", en: "Swords" },
  pentacles: { vi: "Tiền", en: "Pentacles" }
};

// "Ngôi Sao · Ẩn chính XVII · Xuôi": the Vietnamese name only when it differs from the original title.
function displayTarotCardMeta(card: TarotCard & { reversed?: boolean }, language: Language) {
  const vi = language === "vi";
  const subtitle = displayTarotCardSubtitle(card, language);
  const parts = subtitle ? [subtitle] : [];
  if (card.arcana === "major" && typeof card.number === "number") parts.push(`${vi ? "Ẩn chính" : "Major Arcana"} ${majorNumerals[card.number] ?? card.number}`);
  else if (card.suit) parts.push(vi ? `Ẩn phụ · Bộ ${suitNames[card.suit].vi}` : `Minor Arcana · ${suitNames[card.suit].en}`);
  parts.push(card.reversed ? (vi ? "Ngược" : "Reversed") : (vi ? "Xuôi" : "Upright"));
  return parts.join(" · ");
}

// "Ẩn chính · VI" / "Ẩn phụ · Bộ Cốc" for the card guide kicker.
function tarotArcanaLabel(card: TarotCard, language: Language) {
  const vi = language === "vi";
  if (card.arcana === "major" && typeof card.number === "number") return `${vi ? "Ẩn chính" : "Major Arcana"} · ${majorNumerals[card.number] ?? card.number}`;
  return card.suit ? (vi ? `Ẩn phụ · Bộ ${suitNames[card.suit].vi}` : `Minor Arcana · ${suitNames[card.suit].en}`) : vi ? "Ẩn phụ" : "Minor Arcana";
}

function displayTarotReflectionTopic(card: TarotCard) {
  if (card.arcana === "major" && typeof card.number === "number") {
    return majorThemesVi[card.number] ?? "điều đang nổi lên";
  }

  return card.suit ? suitLensesVi[card.suit] : "điều đang nổi lên";
}

function displayTarotMeaning(card: TarotCard & { reversed?: boolean }, language: Language) {
  return localizedText(card.reversed ? card.reversedMeaning : card.uprightMeaning, language, language === "vi"
    ? "Hãy giữ lá bài như một câu hỏi mở cho bước tiếp theo."
    : "Hold this card as an open question for your next step.");
}

export function buildTarotReadingResult(
  deck: TarotDeck,
  topic: TarotTopic,
  spread: TarotSpread,
  question: string,
  selected: DrawnTarotCard[],
  interpretation: { summary: string; reflection: string; provenance?: AnswerProvenance; sections?: unknown; promptVersionId?: string; moderationStatus?: "passed" | "blocked" | "fallback" },
  language: Language = "vi"
) {
  const spreadOption = spreads.find((item) => item.id === spread) ?? spreads[1];
  const positions = selected.map((card, index) => {
    const position = spreadOption.labels.en[index] ?? card.spread;
    const positionKey = position.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `card_${index + 1}`;
    return {
      cardId: card.id,
      deckId: deck.id,
      positionKey,
      positionLabel: {
        en: spreadOption.labels.en[index] ?? card.spread,
        vi: spreadOption.labels.vi[index] ?? card.spread
      },
      orientation: card.reversed ? "reversed" as const : "upright" as const,
      spread: card.spread,
      interpretation: {
        en: displayTarotMeaning(card, "en"),
        vi: displayTarotMeaning(card, "vi")
      }
    };
  });

  return {
    id: nowId(),
    deck,
    topic,
    spread,
    question,
    selected,
    cards: positions,
    synthesis: {
      en: interpretation.summary,
      vi: interpretation.summary
    },
    reflectionPrompt: {
      en: interpretation.reflection,
      vi: interpretation.reflection
    },
    summary: interpretation.summary,
    reflection: interpretation.reflection,
    sections: interpretation.moderationStatus === "blocked" ? [] : normalizeTarotSections(interpretation.sections, language),
    language,
    contentVersion: "tarot-reading-presentation-v1",
    provenance: parseAnswerProvenance(interpretation.provenance, { feature: "tarot_reading", locale: language === "en" ? "en" : "vi" }),
    promptVersionId: interpretation.promptVersionId,
    moderationStatus: interpretation.moderationStatus ?? "fallback",
    createdAt: new Date().toISOString()
  };
}

function drawReading(deck: TarotDeck, topic: TarotTopic, spread: TarotSpread, question: string, language: Language) {
  const selected = selectTarotCards(spread, language);
  const interpretation = buildLocalTarotInterpretation(deck, topic, spread, question, language, selected);
  return buildTarotReadingResult(deck, topic, spread, question, selected, interpretation, language);
}

function getApproximateSunSign(birthDate: string): string | undefined {
  const [, monthRaw, dayRaw] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim()) ?? [];
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!month || !day) return undefined;
  const starts = [
    ["Capricorn", 1, 1], ["Aquarius", 1, 20], ["Pisces", 2, 19], ["Aries", 3, 21],
    ["Taurus", 4, 20], ["Gemini", 5, 21], ["Cancer", 6, 21], ["Leo", 7, 23],
    ["Virgo", 8, 23], ["Libra", 9, 23], ["Scorpio", 10, 23], ["Sagittarius", 11, 22],
    ["Capricorn", 12, 22]
  ] as const;
  return starts.reduce((current, [sign, startMonth, startDay]) => (
    month > startMonth || (month === startMonth && day >= startDay) ? sign : current
  ), "Capricorn");
}

function getGoalPhraseVi(goalId: string): string {
  switch (goalId) {
    case "love": return "tình yêu";
    case "career": return "công việc";
    case "self": return "việc thấu hiểu bản thân";
    case "healing": return "hành trình chữa lành";
    case "decision": return "việc ra quyết định";
    case "daily": return "định hướng mỗi ngày";
    case "curious": return "sự tò mò tâm linh";
    default: return "bản thân";
  }
}

function getGoalPhraseEn(goalId: string): string {
  switch (goalId) {
    case "love": return "love";
    case "career": return "your work";
    case "self": return "self-discovery";
    case "healing": return "healing";
    case "decision": return "making decisions";
    case "daily": return "daily guidance";
    case "curious": return "mystical exploration";
    default: return "self";
  }
}

function buildDailyInsight(profile: Profile, entries: JournalEntry[], language: Language, rerollCount = 0): DailyInsight {
  const primaryGoal = profile.goals[0] ?? "self";
  const latestEntry = entries[0];
  const toneLabel = localizedText(tones.find((tone) => tone.id === profile.tone), language, profile.tone);
  const hasRecentInsight = Boolean(latestEntry);
  const title = language === "vi" ? "Dẫn hướng hôm nay" : "Daily guidance";

  const goalPhrase = language === "vi" ? getGoalPhraseVi(primaryGoal) : getGoalPhraseEn(primaryGoal);

  const text =
    language === "vi"
      ? rerollCount > 0
        ? `Lần nhìn lại thứ ${rerollCount + 1}: hôm nay hãy chọn một hành động nhỏ cho ${goalPhrase}, nhưng giữ nhịp ${toneLabel.toLowerCase()} với chính mình. ${hasRecentInsight ? "Một nhật ký gần đây đang nhắc bạn quay lại điều đã chạm tới mình." : "Không cần vội có câu trả lời lớn; chỉ cần một câu hỏi thật."}`
        : `Hôm nay mời bạn đặt ${goalPhrase} vào trung tâm, rồi lắng nghe trước khi quyết định. ${hasRecentInsight ? "Nhật ký gần nhất có thể là một sợi chỉ nhỏ để lần theo." : "Một khoảng dừng nhỏ có thể cho thấy đâu là mong muốn thật của mình."}`
      : rerollCount > 0
        ? `Reflection ${rerollCount + 1}: choose one small action for ${goalPhrase}, while keeping a ${toneLabel.toLowerCase()} rhythm with yourself. ${hasRecentInsight ? "A recent saved insight is asking to be revisited." : "You do not need a grand answer; one honest question is enough."}`
        : `Today asks you to place ${goalPhrase} at the center, then listen before you decide. ${hasRecentInsight ? "Your latest saved insight may be a thread worth following." : "A small pause may reveal which desire is truly yours."}`;
  const reflectionPrompt =
    language === "vi"
      ? `Mình đang cần hỏi điều gì về ${goalPhrase} trước khi hành động?`
      : `What do I need to ask about ${goalPhrase} before I act?`;

  return {
    id: nowId(),
    dateKey: todayKey(),
    title,
    text,
    reflectionPrompt,
    source: "local",
    rerollCount,
    createdAt: new Date().toISOString()
  };
}

function stableIndex(seed: string, max: number) {
  if (max <= 0) return 0;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % max;
}

function buildTodayPulse(profile: Profile, entries: JournalEntry[], dailyInsight: DailyInsight, language: Language, deck: TarotDeck) {
  const primaryGoal = profile.goals[0] ?? "self";
  // Keep today's card stable for the whole day: saving to the Journal must not swap it.
  const seed = `${dailyInsight.dateKey}:${primaryGoal}:${profile.tone}`;
  const card = cards[stableIndex(seed, cards.length)] ?? cards[0];
  const latestMood = entries.find((entry) => entry.mood)?.mood;
  const moodText = latestMood ? moodLabel(latestMood, language).toLowerCase() : (language === "vi" ? "chưa đặt tên" : "unnamed");
  const goalPhrase = language === "vi" ? getGoalPhraseVi(primaryGoal) : getGoalPhraseEn(primaryGoal);
  // The pause and the small action change every local day from the 30-day bank (analysis HO-02).
  const rhythm = dailyRhythmFor(dailyInsight.dateKey, language);
  const wisdomLine = language === "vi"
    ? `Nilaza mời bạn bước vào ${goalPhrase} bằng một khoảng dừng nhỏ: ${rhythm.pause}`
    : `Nilaza invites you into ${goalPhrase} with one small pause: ${rhythm.pause}`;
  const microAction = rhythm.action;

  return {
    card,
    deck,
    wisdomLine,
    microAction,
    moodText,
    reflectionPrompt: dailyInsight.reflectionPrompt
  };
}

function buildZodiacProfileStatus(
  birthDate: string,
  birthTime: string,
  birthTimeUnknown: boolean,
  birthPlace: string,
  report?: AstrologyReport | null
): ZodiacProfileStatus {
  if (!birthDate.trim()) return "empty";
  if (report?.calculationStatus === "backend_ready") return "full";
  if (!birthTime.trim() || birthTimeUnknown) return "birth_time_missing";
  if (birthPlace.trim()) return "full_pending_backend";
  return "sun_only";
}

function buildDailyZodiacPulse(
  birthDate: string,
  birthTime: string,
  birthTimeUnknown: boolean,
  birthPlace: string,
  dailyInsight: DailyInsight,
  language: Language,
  profile: Profile,
  entries: JournalEntry[],
  report?: AstrologyReport | null
): ZodiacPulse {
  const sunSign = getApproximateSunSign(birthDate);
  const primaryGoal = profile.goals[0] ?? "self";
  const goalPhrase = language === "vi" ? getGoalPhraseVi(primaryGoal) : getGoalPhraseEn(primaryGoal);
  const profileCompleteness = buildZodiacProfileStatus(birthDate, birthTime, birthTimeUnknown, birthPlace, report);
  const recentZodiacCount = entries.filter((entry) => entry.sourceType === "astrology" || entry.sourceSnapshot?.type === "daily_zodiac_pulse").slice(0, 7).length;
  const seed = `${dailyInsight.dateKey}:${sunSign ?? "unknown"}:${profile.tone}:${primaryGoal}:${recentZodiacCount}`;
  const moods = language === "vi"
    ? ["dịu lại", "rõ hơn", "can đảm mềm", "lắng nghe sâu"]
    : ["softening", "clearer", "gentle courage", "deep listening"];
  const cues = language === "vi"
    ? [
      "chọn một việc nhỏ giúp cơ thể thấy an toàn hơn",
      "nói chậm lại trước khi trả lời một tin nhắn quan trọng",
      "để trực giác có thêm bằng chứng trước khi kết luận",
      "viết một dòng thật thà thay vì tìm một đáp án hoàn hảo"
    ]
    : [
      "choose one small thing that helps your body feel safer",
      "slow down before answering an important message",
      "let your intuition gather evidence before concluding",
      "write one honest line instead of hunting for a perfect answer"
    ];
  const cue = cues[stableIndex(seed, cues.length)] ?? cues[0];
  const mood = moods[stableIndex(`${seed}:mood`, moods.length)] ?? moods[0];
  const caveats = profileCompleteness === "empty"
    ? [language === "vi" ? "Cần ngày sinh để mở Sun-sign pulse." : "Birth date is needed for a Sun-sign pulse."]
    : [
      language === "vi"
        ? "Đây là gợi ý tự phản chiếu, không phải dự đoán chắc chắn."
        : "This is a self-reflection cue, not a certain prediction.",
      ...(profileCompleteness === "birth_time_missing"
        ? [language === "vi" ? "Thiếu giờ sinh nên Rising/house chưa được dùng." : "Birth time is missing, so Rising/houses are not used."]
        : []),
      ...(profileCompleteness === "full_pending_backend"
        ? [language === "vi" ? "Moon/Rising cần backend calculator trước khi dùng trong daily pulse." : "Moon/Rising need the backend calculator before daily use."]
        : [])
    ];

  if (!sunSign) {
    return {
      id: `zodiac-${dailyInsight.dateKey}-pending`,
      dateKey: dailyInsight.dateKey,
      profileCompleteness,
      hasBirthDate: false,
      sign: language === "vi" ? "Chưa có cung Mặt Trời" : "Sun sign pending",
      mood,
      title: "Daily Zodiac Pulse",
      reflection: language === "vi"
        ? "Thêm ngày sinh để Nilaza tạo một tín hiệu cung hoàng đạo nhẹ cho ngày hôm nay. Đây sẽ là gợi ý tự phản chiếu, không phải dự đoán chắc chắn."
        : "Add your birth date for a light zodiac signal today. It will be a self-reflection cue, not a certain prediction.",
      microAction: language === "vi" ? "Mở Zodiac khi bạn muốn cá nhân hóa nhịp ngày." : "Open Zodiac when you want a more personal daily rhythm.",
      caveats,
      source: "local"
    };
  }

  const signLabel = localizeAstrologySign(sunSign.toLowerCase() as AstrologySignId, language);
  return {
    id: `zodiac-${dailyInsight.dateKey}-${sunSign.toLowerCase()}`,
    dateKey: dailyInsight.dateKey,
    profileCompleteness,
    hasBirthDate: true,
    sign: signLabel,
    signId: sunSign.toLowerCase(),
    mood,
    title: language === "vi" ? `${signLabel} hôm nay` : `${signLabel} today`,
    reflection: language === "vi"
      ? `Với ${signLabel} như một điểm bắt đầu biểu tượng, hôm nay hãy bước vào ${goalPhrase} bằng cách ${cue}.`
      : `With ${signLabel} as a symbolic starting point, today invites you into ${goalPhrase} by choosing to ${cue}.`,
    microAction: language === "vi"
      ? "Giữ đây như một câu hỏi trong ngày, không phải kết luận về tương lai."
      : "Hold this as a question for the day, not a conclusion about the future.",
    caveats,
    source: report?.calculationStatus === "backend_ready" ? "backend" : "local"
  };
}

function buildJournalMemory(entries: JournalEntry[], language: Language) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentEntries = entries.filter((entry) => new Date(entry.createdAt).getTime() >= sevenDaysAgo);
  const moodCounts = recentEntries.reduce<Record<string, number>>((acc, entry) => {
    if (entry.mood) acc[entry.mood] = (acc[entry.mood] ?? 0) + 1;
    return acc;
  }, {});
  const sourceCounts = recentEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.sourceType] = (acc[entry.sourceType] ?? 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as JournalEntry["sourceType"] | undefined;
  const noteCount = recentEntries.filter((entry) => entry.sourceType === "manual" || entry.userNote?.trim()).length;
  const fallbackPrompt = language === "vi"
    ? "Tuần này, điều gì cứ quay lại xin bạn chú ý?"
    : "This week, what keeps returning for your attention?";
  const prompt = topMood
    ? language === "vi"
      ? `Cảm xúc “${moodLabel(topMood, language)}” xuất hiện nhiều nhất. Điều gì đang cần được chăm sóc thay vì chỉ được giải thích?`
      : `"${moodLabel(topMood, language)}" is showing up most. What needs care rather than more explanation?`
    : fallbackPrompt;

  return {
    recentCount: recentEntries.length,
    noteCount,
    topMood,
    topSource,
    prompt,
    summary: language === "vi"
      ? `${recentEntries.length} insight trong 7 ngày, ${noteCount} ghi chú riêng${topSource ? `, nguồn nổi bật: ${journalSourceLabel(topSource, language)}` : ""}.`
      : `${recentEntries.length} insights in 7 days, ${noteCount} private notes${topSource ? `, strongest source: ${journalSourceLabel(topSource, language)}` : ""}.`
  };
}

function buildLocalAudit(language: Language) {
  const passed = [
    "No backend keys in mobile client",
    "Prompt library has versions",
    "Persona transparency copy exists",
    "Tarot uses app-selected cards",
    "Seed data validation exists",
    "Canonical slugs are ASCII lowercase and unique"
  ];
  const pending = [
    "Replace keyword moderation with backend moderation",
    "Move sensitive chat and journal storage behind auth",
    "Add real account deletion and export",
    "Add backend proxy and RLS policies",
    "Run dependency audit before store release",
    "Add zh-Hans, ja, and ko translations before launching those locales"
  ];
  return {
    passed,
    pending,
    summary:
      language === "vi"
        ? `${passed.length} mục local đã đạt, ${pending.length} mục cần xử lý trước publish.`
        : `${passed.length} local checks passed, ${pending.length} items remain before publishing.`
  };
}

export default function App() {
  return <PasswordRecoveryBoundary><EmailConfirmationBoundary><AccountBoundary /></EmailConfirmationBoundary></PasswordRecoveryBoundary>;
}

/** Guest preview before sign-in: the default deck's 78 cards with meanings and the 12 sign guides. */
function GuestPreviewScreen({ language, onCreateAccount, onSignIn, onExit }: { language: Language; onCreateAccount: () => void; onSignIn: () => void; onExit: () => void }) {
  const deck = decks[0];
  const renderCard = (cardId: string, open: (id: string) => void) => {
    const index = Math.max(0, cards.findIndex((item) => item.id === cardId));
    const card = cards[index];
    const previous = cards[(index + cards.length - 1) % cards.length];
    const next = cards[(index + 1) % cards.length];
    return (
      <TarotCardGuide
        key={card.id}
        language={language}
        name={displayTarotCardName(card, language)}
        originalName={displayTarotCardSubtitle(card, language)}
        arcanaLabel={tarotArcanaLabel(card, language)}
        image={getTarotCardImage(deck.id, card.id)}
        uprightMeaning={localizedText(card.uprightMeaning, language)}
        reversedMeaning={localizedText(card.reversedMeaning, language)}
        guide={getTarotCardGuide(card.id, language)}
        practice={localizedText(card.reflectionQuestion, language)}
        onOpenImage={() => undefined}
        previous={{ name: displayTarotCardName(previous, language), onPress: () => open(previous.id) }}
        next={{ name: displayTarotCardName(next, language), onPress: () => open(next.id) }}
      />
    );
  };
  return (
    <ScreenShell>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
      <GuestPreview
        language={language}
        deckName={localizedText(deck.name, language)}
        cards={cards.map((card) => ({
          id: card.id,
          group: card.arcana === "major" ? "major" as const : (card.suit as "cups" | "wands" | "swords" | "pentacles"),
          name: displayTarotCardName(card, language),
          sub: [card.arcana === "major" ? (majorNumerals[card.number] ?? String(card.number)) : "", displayTarotCardSubtitle(card, language)].filter(Boolean).join(" · "),
          image: getTarotCardImage(deck.id, card.id),
          learned: false
        }))}
        renderCard={renderCard}
        signs={astrologySignIds.map((id) => ({ id, name: localizeAstrologySign(id, language) }))}
        renderSign={(signId) => <AstrologySignGuide signId={signId as AstrologySignId} language={language} mode="detail" />}
        onCreateAccount={onCreateAccount}
        onSignIn={onSignIn}
        onExit={onExit}
      />
    </ScreenShell>
  );
}

function RuntimeConfigurationNotice() {
  return (
    <ScreenShell>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
      <Text style={{ color: colors.ivory, paddingHorizontal: 20, paddingTop: 24, fontFamily: typography.headlineFontFamily, fontSize: 28 }}>
        Nilaza chưa được kết nối
      </Text>
      <Text style={{ color: colors.moon, padding: 20, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24 }}>
        Bản phát hành này thiếu cấu hình máy chủ online. Hãy cài bản preview mới nhất hoặc liên hệ đội ngũ Nilaza.
        {"\n\n"}
        This release is missing its online server configuration. Install the latest preview build or contact the Nilaza team.
      </Text>
    </ScreenShell>
  );
}

function AccountBoundary() {
  const session = useAccountSession();
  useEffect(() => {
    // Release the native splash as soon as the auth boundary has a safe answer.
    // AccountApp can then show its lightweight in-app loader while local data
    // and fonts finish hydrating instead of keeping the native splash on screen.
    if (session.ready || session.error || (onlineModeRequired && !onlineRuntimeReady)) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [session.error, session.ready]);
  useEffect(() => {
    // Do not leave the native splash covering a slow or offline auth check.
    // The boundary below is safe to show before identity is known.
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => undefined);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);
  if (onlineModeRequired && !onlineRuntimeReady) return <RuntimeConfigurationNotice />;
  if (!session.ready || session.error) {
    return (
      <ScreenShell>
        {session.error ? (
          <Text style={{ color: colors.ivory, padding: 20 }}>
            Chưa thể mở phiên an toàn. Vui lòng thử lại.
          </Text>
        ) : (
          <RitualLoading label="Đang khôi phục phiên… / Restoring your session…" />
        )}
        {session.error && <SecondaryButton label="Thử lại" onPress={session.retry} />}
      </ScreenShell>
    );
  }
  // Only identity changes remount private UI. Token refresh/rotation do not.
  return <AccountApp key={session.scope.key} session={session} />;
}

function AccountApp({ session }: { session: ReturnType<typeof useAccountSession> }) {
  const { authState, scope } = session;
  const setAuthState = (next: LocalAuthState) => {
    if (scope.active) session.setAuthState(next);
  };
  const [storageError, setStorageError] = useState(false);
  const [deletingLocalData, setDeletingLocalData] = useState<"idle" | "pending" | "failed">("idle");
  const [hydrationFailed, setHydrationFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [syncFailures, setSyncFailures] = useState<Record<PersonalSyncArea, boolean>>({
    chat: false,
    journal: false
  });
  const [syncAttempt, setSyncAttempt] = useState(0);
  const storage = useMemo(() => createAccountStorage(scope, () => setStorageError(true)), [scope]);
  const { loadJson, saveJson } = storage;
  const journalDraftStore = useMemo(() => createJournalDraftStore({
    read: () => storage.loadJson(journalDraftStorageKey, null),
    write: state => storage.saveJsonOrThrow(journalDraftStorageKey, state),
    isActive: () => scope.active
  }), [scope, storage]);
  const viewportLayout = useAdaptiveLayout();
  const adaptiveLayout = responsiveShellEnabled ? viewportLayout : {
    ...viewportLayout, navMode: "bottom" as const, contentMaxWidth: 520, gutter: 20
  };
  const [fontsLoaded, fontError] = useFonts({
    EBGaramond_400Regular,
    EBGaramond_500Medium,
    EBGaramond_600SemiBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_400Regular_Italic,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold
  });
  const fontsReady = useFontReadiness(fontsLoaded, fontError);
  const [profile, setProfile] = useState<Profile>(() => ({
    ...defaultProfile, nickname: authState.status === "signed_in" ? authState.user.name : defaultProfile.nickname
  }));
  const [authView, setAuthView] = useState<AuthView>("welcome");
  const [guestPreview, setGuestPreview] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [loaded, setLoaded] = useState(false);
  const [localHydrated, setLocalHydrated] = useState(false);
  const [dailyReminder, setDailyReminder] = useState<DailyReminder>(defaultDailyReminder);
  const [learnedCardIds, setLearnedCardIds] = useState<string[]>([]);
  const [contentBundleVersion, setContentBundleVersion] = useState<number | null>(null);
  const onboardingSaving = useRef(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [scrollBand, setScrollBand] = useState<ScrollBand>(0);
  const [journalComposing, setJournalComposing] = useState(false);
  const [journalPrompt, setJournalPrompt] = useState<string | null>(null);
  const [navigationChrome, setNavigationChrome] = useState<NavigationChrome>("expanded");
  const navigationChromeRef = useRef<NavigationChrome>("expanded");
  const lastContentScrollYRef = useRef(0);
  const compactNavigationStartRef = useRef(-1);
  const navigationIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState(personas[0].id);
  const [favoritePersonaIds, setFavoritePersonaIds] = useState<string[]>([]);
  const [chatMode, setChatMode] = useState<ChatMode>("oracle");
  const [chatInput, setChatInput] = useState("");
  const [oracleInput, setOracleInput] = useState("");
  const [oracleTurns, setOracleTurns] = useState<OracleTurn[]>([]);
  const [oracleGenerating, setOracleGenerating] = useState(false);
  const [oracleError, setOracleError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerTierPreview, setOwnerTierPreview] = useState<OwnerTierPreview>("account");
  const [oracleMemoryConsent, setOracleMemoryConsent] = useState<OracleMemoryConsent>({ journalMemory: false, birthProfile: false });
  const [chatHandoffContext, setChatHandoffContext] = useState<ChatHandoffContext | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePersonaSessionIds, setActivePersonaSessionIds] = useState<Record<string, string>>({});
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalEntryToOpen, setJournalEntryToOpen] = useState<string | null>(null);
  const [journalPendingCount, setJournalPendingCount] = useState(0);
  const [journalMutationSyncFailed, setJournalMutationSyncFailed] = useState(false);
  const [journalLocalWriteFailed, setJournalLocalWriteFailed] = useState(false);
  const exportInProgress = useRef(false);
  useEffect(() => { void cleanupExportFiles().catch(() => undefined); }, []);
  const journalEntriesRef = useRef(journalEntries);
  journalEntriesRef.current = journalEntries;
  const [generatedArtifacts, setGeneratedArtifacts] = useState<GeneratedArtifact[]>([]);
  const [dailyInsight, setDailyInsight] = useState<DailyInsight | null>(null);
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [tarotStage, setTarotStage] = useState<TarotStage>("topic");
  const [tarotStageHistory, setTarotStageHistory] = useState<TarotStage[]>([]);
  const [tarotReturnScreen, setTarotReturnScreen] = useState<Tab>("home");
  const [tarotTopic, setTarotTopic] = useState<TarotTopic>("self");
  const [tarotSpread, setTarotSpread] = useState<TarotSpread>("daily-one");
  const [tarotQuestion, setTarotQuestion] = useState("");
  const [tarotKeepSelectedDeck, setTarotKeepSelectedDeck] = useState(false);
  const [tarotIntentionReviewed, setTarotIntentionReviewed] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState(decks[0].id);
  const [selectedTarotGuideId, setSelectedTarotGuideId] = useState(getRecommendedTarotGuide(decks[0].id).id);
  const [reading, setReading] = useState<ReturnType<typeof drawReading> | null>(null);
  const [selectedTarotCardId, setSelectedTarotCardId] = useState<string | null>(null);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [promptDrafts, setPromptDrafts] = useState<PromptDraft[]>(initialPromptDrafts);
  const [auditResult, setAuditResult] = useState<ReturnType<typeof buildLocalAudit> | null>(null);
  const [adminView, setAdminView] = useState<AdminView>("dashboard");
  const [showAdmin, setShowAdmin] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(false);
  const [birthPlace, setBirthPlace] = useState("");
  const [searchText, setSearchText] = useState("");
  const [toast, setToast] = useState("");
  const [onboardingError, setOnboardingError] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [chatGenerating, setChatGenerating] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatErrorRetryable, setChatErrorRetryable] = useState(true);
  const [lastChatPrompt, setLastChatPrompt] = useState("");
  const [tarotGenerating, setTarotGenerating] = useState(false);
  const tarotGenerationInFlight = useRef(false);
  const [tarotError, setTarotError] = useState("");
  const [astrologyStage, setAstrologyStage] = useState<AstrologyStage>("hub");
  const [astrologyReturnScreen, setAstrologyReturnScreen] = useState<Tab>("home");
  const [astrologyFocus, setAstrologyFocus] = useState<AstrologyFocus>("soul");
  const [astrologyReport, setAstrologyReport] = useState<AstrologyReport | null>(null);
  const [astrologyGenerating, setAstrologyGenerating] = useState(false);
  const [astrologyError, setAstrologyError] = useState("");
  const [remoteZodiacPulse, setRemoteZodiacPulse] = useState<{ requestKey: string; pulse: ZodiacPulse } | null>(null);
  const [revealedTodayPulseKey, setRevealedTodayPulseKey] = useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference[]>(defaultNotificationPreferences);
  const [devicePushRegistration, setDevicePushRegistration] = useState<DevicePushRegistration | null>(null);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  const [generationActivities, setGenerationActivities] = useState<GenerationActivity[]>([]);
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackPanelTarget | null>(null);
  const [shareSheet, setShareSheet] = useState<{ model: ShareCardModel; url: string; primary: "image" | "link" } | null>(null);
  const screenRef = useRef(screen);
  const chatModeRef = useRef(chatMode);
  const selectedPersonaIdRef = useRef(selectedPersonaId);
  screenRef.current = screen;
  chatModeRef.current = chatMode;
  selectedPersonaIdRef.current = selectedPersonaId;

  const language = normalizeLanguage(profile.language);
  const c = getCopy(language);
  const selectedPersona = personasById[selectedPersonaId] ?? personas[0];
  const selectedDeck = findTarotDeckById(decksById, selectedDeckId) ?? decks[0];
  // No subscription resolver yet: the closed-test policy decides the display tier.
  // Server endpoints keep their own entitlement checks.
  const accountTier = resolveAccountTier({
    signedIn: authState.status === "signed_in",
    accountCreatedAt: authState.status === "signed_in" ? authState.user.createdAt : undefined
  });
  const displayedTier = resolveDisplayedTier({ accountTier, isOwner, preview: ownerTierPreview });
  const isOwnerPreviewActive = isOwnerTierPreviewActive({ isOwner, preview: ownerTierPreview });
  const personaSessionSummaries = useMemo(
    () => buildPersonaSessionSummaries(messages, selectedPersonaId, language),
    [language, messages, selectedPersonaId]
  );
  const activePersonaSessionId = useMemo(
    () => activePersonaSessionIds[selectedPersonaId] ?? personaSessionSummaries[0]?.id ?? createPersonaSessionId(selectedPersonaId),
    [activePersonaSessionIds, personaSessionSummaries, selectedPersonaId]
  );
  const currentMessages = useMemo(
    () => messages.filter((message) => message.personaId === selectedPersonaId && personaSessionIdForMessage(message) === activePersonaSessionId),
    [activePersonaSessionId, messages, selectedPersonaId]
  );
  const currentDateKey = todayKey();
  // Answer to the today card question (analysis HO-03); a new local day starts empty.
  const [todayNote, setTodayNote] = useState("");
  useEffect(() => { setTodayNote(""); }, [currentDateKey]);
  const tarotReadingsToday = usageEvents.filter((event) => event.name === "tarot_reading_drawn" && isDateKey(event.createdAt, currentDateKey)).length;
  const chatTurnsToday = messages.filter((message) => message.role === "user" && isDateKey(message.createdAt, currentDateKey)).length;
  const dailyTarotCreditLimit = dailyTarotLimitFor(displayedTier);
  // The account tier policy sets the Tarot allowance; the old credit ledger endpoint is not used (live QA 2026-10-31).
  const creditBalance = Math.max(0, dailyTarotCreditLimit - tarotReadingsToday);
  // Keep the fallback stable: Zodiac's effect depends on this object through
  // localZodiacPulse. A new fallback on every render causes a request/render loop.
  const effectiveDailyInsight = useDailyInsight(
    dailyInsight, profile, journalEntries, language, currentDateKey, buildDailyInsight
  );
  const todayPulse = useMemo(
    () => buildTodayPulse(profile, journalEntries, effectiveDailyInsight, language, selectedDeck),
    [effectiveDailyInsight, journalEntries, language, profile, selectedDeck]
  );
  const localZodiacPulse = useMemo(
    () => buildDailyZodiacPulse(birthDate, birthTime, birthTimeUnknown, birthPlace, effectiveDailyInsight, language, profile, journalEntries, astrologyReport),
    [astrologyReport, birthDate, birthPlace, birthTime, birthTimeUnknown, effectiveDailyInsight, journalEntries, language, profile]
  );
  const zodiacPulseRequestKey = useMemo(
    () => [
      localZodiacPulse.dateKey,
      birthDate.trim(),
      birthTimeUnknown ? "unknown-time" : birthTime.trim(),
      birthPlace.trim(),
      profile.tone,
      profile.goals.join("|")
    ].join(":"),
    [birthDate, birthPlace, birthTime, birthTimeUnknown, localZodiacPulse.dateKey, profile.goals, profile.tone]
  );
  const zodiacPulse = remoteZodiacPulse?.requestKey === zodiacPulseRequestKey ? remoteZodiacPulse.pulse : localZodiacPulse;
  const journalMemory = useMemo(() => buildJournalMemory(journalEntries, language), [journalEntries, language]);
  const todayPulseRevealed = revealedTodayPulseKey === effectiveDailyInsight.dateKey;
  const unreadNotificationCount = inAppNotifications.filter((notification) => notification.status === "unread").length;
  // A working request needs a visible return path. Once it is ready, the
  // notification inbox is the durable, non-obstructive return path instead
  // of reserving part of every tab for a completed task.
  const activeGenerationActivity = generationActivities.find((activity) => activity.status === "working")
    ?? generationActivities.find((activity) => activity.status === "ready");
  const hasDedicatedGenerationSurface = screen === "chat" || screen === "tarot" || screen === "astrology";
  const showGenerationBubble = activeGenerationActivity?.status === "working" && !hasDedicatedGenerationSurface;
  const pushEnabled = notificationPreferences.some((preference) => preference.channel === "push" && preference.enabled);
  const backendOptions = useMemo(
    () => ({
      apiKey: supabaseAnonKey,
      authToken: authState.status === "signed_in" ? authState.backendSession?.accessToken : undefined,
      baseUrl: nilazaBackendBaseUrl,
      supabaseUrl,
      userId: scope.userId,
      session: scope
    }),
    [scope]
  );
  const journalRepository = useMemo(() => createJournalRepository({
    active: () => scope.active,
    canSync: () => Boolean(scope.active && scope.accessToken && nilazaBackendBaseUrl),
    persist: state => storage.saveJsonOrThrow(journalStateKey, state),
    send: mutation => syncJournalMutation(mutation, backendOptions),
    onChange: state => {
      journalEntriesRef.current = state.entries;
      setJournalEntries(state.entries);
      setJournalPendingCount(state.pending.length);
    },
    onLocalFailure: context => {
      if (context === "mutation") setJournalLocalWriteFailed(true);
      else setSyncFailures(current => ({ ...current, journal: true }));
    },
    onSyncFailure: setJournalMutationSyncFailed
  }), [backendOptions, scope, storage]);
  const journalSaveCoordinator = useMemo(() => createJournalSaveCoordinator(), [journalRepository]);
  const latestPersonaSessionId = personaSessionSummaries[0]?.id;

  useEffect(() => {
    let active = true;
    if (!scope.active || !scope.userId) return () => { active = false; };
    void getPublishedContent(backendOptions)
      .then((bundle) => {
        if (!active || !bundle || !applyPublishedContentBundle(bundle)) return;
        setContentBundleVersion(bundle.version);
        setSelectedPersonaId((current) => personasById[current] ? current : personas[0]?.id || current);
        setSelectedDeckId((current) => findTarotDeckById(decksById, current)?.id || decks[0]?.id || current);
        setSelectedTarotGuideId((current) => personasById[current] ? current : getRecommendedTarotGuide(decks[0]?.id || "").id);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [backendOptions, scope.active, scope.userId]);

  useEffect(() => {
    let active = true;
    setIsAdmin(false);
    setIsOwner(false);
    setOwnerTierPreview("account");
    if (!scope.active || !scope.userId) return () => { active = false; };

    void getAdminAccess(backendOptions)
      .then(access => {
        if (active) {
          const owner = access.roles.includes("owner");
          setIsAdmin(access.capabilities.includes("hub.read"));
          setIsOwner(owner);
          if (!owner) setOwnerTierPreview("account");
        }
      })
      .catch(() => {
        if (active) {
          setIsAdmin(false);
          setIsOwner(false);
          setOwnerTierPreview("account");
        }
      });

    return () => { active = false; };
  }, [backendOptions, scope.active, scope.userId]);

  useEffect(() => {
    if (!latestPersonaSessionId) return;
    setActivePersonaSessionIds((current) => {
      if (current[selectedPersonaId]) return current;
      return { ...current, [selectedPersonaId]: latestPersonaSessionId };
    });
  }, [latestPersonaSessionId, selectedPersonaId]);

  useEffect(() => {
    if (!loaded) return;
    if (isOwnerPreviewActive) {
      setRemoteZodiacPulse(null);
      return;
    }
    if (!nilazaBackendBaseUrl) {
      setRemoteZodiacPulse(null);
      return;
    }
    let active = true;
    void generateDailyZodiacPulse(
      {
        language,
        dateKey: localZodiacPulse.dateKey,
        profile: {
          nickname: profile.nickname,
          goals: profile.goals,
          tone: profile.tone
        },
        birthProfile: {
          birthDate: birthDate.trim() || undefined,
          birthTime: birthTimeUnknown ? undefined : birthTime.trim() || undefined,
          birthTimeKnown: !birthTimeUnknown && Boolean(birthTime.trim()),
          birthPlace: birthPlace.trim() || undefined,
          consentVersion: birthConsentVersion,
          timezone: getDeviceTimezone()
        },
        recentEntries: journalEntries.slice(0, 5).map((entry) => ({
          title: entry.title,
          sourceType: entry.sourceType,
          mood: entry.mood,
          createdAt: entry.createdAt
        }))
      },
      () => ({ ...localZodiacPulse, calculationVersion: "local_daily_zodiac_pulse_v1" }),
      backendOptions
    ).then((result) => {
      if (!active) return;
      setRemoteZodiacPulse({ requestKey: zodiacPulseRequestKey, pulse: localizePulseSign(result, language) });
      recordEvent("daily_zodiac_pulse_loaded", {
        dateKey: result.dateKey,
        source: result.source,
        profileCompleteness: result.profileCompleteness,
        backend: result.source === "backend"
      });
    });
    return () => {
      active = false;
    };
  }, [
    backendOptions,
    birthDate,
    birthPlace,
    birthTime,
    birthTimeUnknown,
    isOwnerPreviewActive,
    journalEntries,
    language,
    loaded,
    localZodiacPulse,
    nilazaBackendBaseUrl,
    profile.goals,
    profile.nickname,
    profile.tone,
    zodiacPulseRequestKey
  ]);

  useEffect(() => {
    let active = true;
    setHydrationFailed(false);
    async function load() {
      try {
        const [savedProfile, savedBirthProfile, savedOracleMemoryConsent, savedArtifacts, savedPrompts,
          savedSelectedDeckId, savedRevealedTodayPulseKey, savedFavoritePersonaIds, savedNotificationPreferences,
          savedDevicePushRegistration, savedInAppNotifications, savedGenerationActivities, savedMessages, savedOracle, savedJournal,
          savedInsight, savedUsage, savedSafety, savedHiddenIds, savedJournalState] = await Promise.all([
          loadJson<Profile | null>("nilaza.profile", null),
          loadJson<BirthProfileDraft | null>(birthProfileStorageKey, null),
          loadJson<OracleMemoryConsent>("nilaza.oracleMemoryConsent", { journalMemory: false, birthProfile: false }),
          loadJson<GeneratedArtifact[]>("nilaza.generatedArtifacts", []),
          loadJson<PromptDraft[]>("nilaza.promptDrafts", initialPromptDrafts()),
          loadJson<string>("nilaza.selectedDeckId", decks[0].id),
          loadJson<string | null>("nilaza.todayPulseRevealedDate", null),
          loadJson<string[]>(favoritePersonaStorageKey, []),
          loadJson<NotificationPreference[]>("nilaza.notificationPreferences", defaultNotificationPreferences()),
          loadJson<DevicePushRegistration | null>("nilaza.devicePushRegistration", null),
          loadJson<InAppNotification[]>("nilaza.inAppNotifications", []),
          loadJson<GenerationActivity[]>("nilaza.generationActivities", []),
          loadJson<ChatMessage[]>("nilaza.messages", []),
          loadJson<OracleTurn[]>("nilaza.oracleTurns", []),
          loadJson<JournalEntry[]>("nilaza.journal", []),
          loadJson<DailyInsight | null>("nilaza.dailyInsight", null),
          loadJson<UsageEvent[]>("nilaza.events", []),
          loadJson<SafetyEvent[]>("nilaza.safetyEvents", []),
          loadJson<string[]>("nilaza.hiddenJournalIds", []),
          loadJson<unknown>(journalStateKey, null)
        ]);
        if (active && scope.active) setLocalHydrated(true);
        // Recover an existing cloud profile by its verified owner, not by guessing
        // ownership of the pre-namespace global cache.
        // Cloud profile hydration is an enhancement over the namespaced local
        // cache. A first-login RLS/network failure must not strand the user on
        // the local-data error screen or cause any local value to be replaced.
        const remoteSnapshot = !savedProfile && scope.accessToken && supabaseUrl
          ? await getProfileSnapshot(backendOptions).catch(() => null) : null;
        const remoteProfile = remoteSnapshot
          ? (() => { try { return mapProfileSnapshot(remoteSnapshot, profile); } catch { return null; } })()
          : null;
        if (!active || !scope.active) return;
        const restoredProfile = savedProfile ?? remoteProfile?.profile ?? profile;
        const restoredBirth = savedBirthProfile ?? remoteProfile?.birth ?? defaultBirthProfile;
        setProfile({ ...restoredProfile, goals: migrateGoals(restoredProfile.goals ?? []), language: normalizeLanguage(restoredProfile.language) });
        setBirthDate(restoredBirth.birthDate ?? "");
        setBirthTime(restoredBirth.birthTime ?? "");
        setBirthTimeUnknown(Boolean(restoredBirth.birthTimeUnknown));
        setBirthPlace(restoredBirth.birthPlace ?? "");
        setSelectedDeckId(findTarotDeckById(decksById, savedSelectedDeckId)?.id ?? decks[0].id);
        setOracleMemoryConsent(savedOracleMemoryConsent);
        setGeneratedArtifacts(savedArtifacts);
        setMessages(savedMessages);
        setOracleTurns(savedOracle);
        journalRepository.initialize(savedJournalState, savedJournal, savedHiddenIds);
        setDailyInsight(savedInsight);
        setUsageEvents(savedUsage);
        setSafetyEvents(savedSafety);
        setPromptDrafts(savedPrompts);
        setRevealedTodayPulseKey(savedRevealedTodayPulseKey === todayKey() ? savedRevealedTodayPulseKey : null);
        setFavoritePersonaIds(savedFavoritePersonaIds.filter(id => Boolean(personasById[id])));
        setNotificationPreferences(savedNotificationPreferences);
        setDevicePushRegistration(savedDevicePushRegistration);
        setInAppNotifications(savedInAppNotifications);
        // A request cannot safely continue after the app process was killed.
        // Retain it as a failed marker rather than pretending it is still running.
        setGenerationActivities(savedGenerationActivities.map((activity) => activity.status === "working"
          ? { ...activity, status: "failed" as const, updatedAt: new Date().toISOString() }
          : activity).slice(0, 12));
        storage.markHydrated();
        setLoaded(true);
      } catch {
        if (active && scope.active) setHydrationFailed(true);
      }
    }
    void load();
    return () => { active = false; };
  }, [storage, journalRepository, loadAttempt]);

  useEffect(() => {
    if (!loaded || !scope.userId || !scope.accessToken || !supabaseUrl) return;
    let active = true;
    setSyncFailures({ chat: false, journal: false });
    const journalBaseline = journalEntriesRef.current;
    // A failed optional enhancement (analytics, a daily suggestion, or an
    // owner capability refresh) must not make the whole account look offline.
    // Reserve the account-sync banner for the data a person expects to carry
    // between devices: conversation history and saved Journal entries.
    const apply = async <T,>(
      read: () => Promise<T>,
      update: (data: T) => void | Promise<void>,
      affectsPersonalSync: PersonalSyncArea | null = null,
      onFailure?: () => void
    ) => {
      try {
        const data = await read();
        if (active && scope.active) await update(data);
      } catch {
        if (onFailure && active && scope.active) onFailure();
        if (affectsPersonalSync && active && scope.active) {
          setSyncFailures((current) => ({ ...current, [affectsPersonalSync]: true }));
        }
      }
    };
    void Promise.all([
      apply(() => getAllPersonaChatMessages(backendOptions), rows => {
        const mapped = mapPersonaMessages(rows, personas);
        setMessages(current => mergeById(current, mapped));
      }, "chat"),
      // Oracle endpoint currently writes usage/safety only. Keep its account-local turns.
      apply(() => getJournalEntries(backendOptions), async rows => {
        const deletedIds = rows.filter(row => row.deleted_at).map(row => row.local_id ?? row.id);
        const mapped = mapJournalRows(rows.filter(row => !row.deleted_at));
        await journalRepository.mergeRemote(mapped, journalBaseline, deletedIds);
      }, "journal"),
      apply(() => getUsageEvents(backendOptions), rows => setUsageEvents(current => mergeById(current, rows.map(u => ({
        id: u.id, name: u.event_name, createdAt: u.created_at, metadata: u.metadata
      }))))),
      apply(() => getSafetyEvents(backendOptions), rows => setSafetyEvents(current => mergeById(current, rows.map(s => ({
        id: s.id, feature: s.feature, sourceId: s.source_id, reason: s.reason,
        summary: s.summary, status: s.status, createdAt: s.created_at
      }))))),
      apply(() => getDailyInsight(todayKey(), backendOptions), row => {
        const insight = mapDailyInsight(row);
        if (insight) setDailyInsight(current => !current || current.createdAt < insight.createdAt ? insight : current);
      }),
      apply(() => getAdminAccess(backendOptions), access => {
        const owner = access.roles.includes("owner");
        setIsAdmin(access.capabilities.includes("hub.read"));
        setIsOwner(owner);
        if (!owner) setOwnerTierPreview("account");
      }, null, () => {
        setIsAdmin(false);
        setIsOwner(false);
        setOwnerTierPreview("account");
      })
    ]);
    return () => { active = false; };
  }, [loaded, scope, syncAttempt]);

  useEffect(() => {
    if (loaded) void journalRepository.flush();
  }, [loaded, journalRepository, syncAttempt]);

  useEffect(() => {
    if ((localHydrated && fontsReady) || hydrationFailed) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [localHydrated, fontsReady, hydrationFailed]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const styleId = "nilaza-scrollbar-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      html {
        scrollbar-color: rgba(201, 164, 92, 0.78) #151416;
        scrollbar-width: thin;
      }
      *::-webkit-scrollbar {
        height: 10px;
        width: 10px;
      }
      *::-webkit-scrollbar-track {
        background: #151416;
      }
      *::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #C9A45C 0%, #8B6A32 54%, #0E5A5A 100%);
        border: 2px solid #151416;
        border-radius: 999px;
      }
      *::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #E8C176 0%, #C9A45C 48%, #0E5A5A 100%);
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") return;
    const handleWindowScroll = () => {
      const nextScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setScrollBand(scrollBandFor(nextScrollY));
    };
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    handleWindowScroll();
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);

  useEffect(() => {
    setScrollBand(0);
  }, [screen, chatMode, selectedPersonaId]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.profile", profile);
  }, [loaded, profile]);

  useEffect(() => {
    if (!loaded) return;
    void saveJson<BirthProfileDraft>(birthProfileStorageKey, {
      birthDate,
      birthTime,
      birthTimeUnknown,
      birthPlace,
      consentVersion: birthConsentVersion,
      updatedAt: new Date().toISOString()
    });
  }, [birthDate, birthPlace, birthTime, birthTimeUnknown, loaded]);

  useEffect(() => {
    if (loaded) void saveJson(favoritePersonaStorageKey, favoritePersonaIds);
  }, [favoritePersonaIds, loaded]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.messages", messages);
  }, [loaded, messages]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.oracleTurns", oracleTurns);
  }, [loaded, oracleTurns]);

  useEffect(() => {
    if (!localHydrated) return;
    let active = true;
    void loadJson<unknown>(dailyReminderKey, defaultDailyReminder).then((value) => {
      if (active) setDailyReminder(normalizeDailyReminder(value));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [localHydrated]);
  useEffect(() => {
    if (!localHydrated) return;
    let active = true;
    void loadJson<unknown>(learnedTarotCardsKey, []).then((value) => {
      if (active && Array.isArray(value)) setLearnedCardIds(value.filter((id): id is string => typeof id === "string" && cards.some((card) => card.id === id)));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [localHydrated]);
  const markCardLearned = (cardId: string) => {
    setLearnedCardIds((current) => {
      if (current.includes(cardId)) return current;
      const next = [...current, cardId];
      void saveJson(learnedTarotCardsKey, next);
      return next;
    });
  };
  const changeDailyReminder = async (next: DailyReminder) => {
    setDailyReminder(next);
    void saveJson(dailyReminderKey, next);
    const result = await applyDailyReminder(next, language);
    if ((result === "denied" || result === "unsupported") && next.enabled) {
      // Nothing was scheduled, so the switch must not stay on.
      const off = { ...next, enabled: false };
      setDailyReminder(off);
      void saveJson(dailyReminderKey, off);
      showToast(result === "denied"
        ? (language === "vi" ? "Hãy cho phép Nilaza gửi thông báo trong cài đặt điện thoại." : "Allow Nilaza notifications in your phone settings.")
        : (language === "vi" ? "Nhắc nhở chỉ chạy trên ứng dụng điện thoại." : "Reminders only work in the phone app."));
    } else if (result === "scheduled") {
      showToast(language === "vi" ? "Đã đặt nhắc lá bài hôm nay." : "Today's card reminder is set.");
    }
  };

  useEffect(() => {
    if (loaded) void saveJson("nilaza.oracleMemoryConsent", oracleMemoryConsent);
  }, [loaded, oracleMemoryConsent]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.generatedArtifacts", generatedArtifacts);
  }, [loaded, generatedArtifacts]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.dailyInsight", dailyInsight);
  }, [loaded, dailyInsight]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.todayPulseRevealedDate", revealedTodayPulseKey);
  }, [loaded, revealedTodayPulseKey]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.events", usageEvents);
  }, [loaded, usageEvents]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.safetyEvents", safetyEvents);
  }, [loaded, safetyEvents]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.promptDrafts", promptDrafts);
  }, [loaded, promptDrafts]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.selectedDeckId", selectedDeck.id);
  }, [loaded, selectedDeck.id]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.notificationPreferences", notificationPreferences);
  }, [loaded, notificationPreferences]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.devicePushRegistration", devicePushRegistration);
  }, [devicePushRegistration, loaded]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.inAppNotifications", inAppNotifications);
  }, [inAppNotifications, loaded]);

  useEffect(() => {
    if (loaded) void saveJson("nilaza.generationActivities", generationActivities);
  }, [generationActivities, loaded]);

  useEffect(() => {
    if (!loaded) return;
    return subscribeToNotificationResponses((targetRoute) => {
      if (targetRoute === "tarot") startTarot("intro");
      else if (targetRoute === "astrology") startAstrology("hub");
      else if (targetRoute === "journal") navigate("journal");
      else if (targetRoute === "profile") navigate("profile");
      else if (targetRoute === "chat") openChat("oracle");
      else navigate("home");
      recordEvent("notification_response_opened", { targetRoute: targetRoute ?? "home" });
    });
  }, [loaded]);

  useEffect(() => {
    const availableGuideIds = getTarotGuideOptions(selectedDeck.id).map((persona) => persona.id);
    setSelectedTarotGuideId((currentId) => (
      availableGuideIds.includes(currentId) ? currentId : getRecommendedTarotGuide(selectedDeck.id).id
    ));
  }, [selectedDeck.id]);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 1800);
  };

  const requestConfirmation = (dialog: ConfirmationDialogConfig) => {
    setConfirmationDialog({
      ...dialog,
      cancelLabel: dialog.cancelLabel ?? c.back
    });
  };

  const confirmDestructiveAction = (action: () => void) => {
    setConfirmationDialog(null);
    action();
  };

  const recordEvent = (name: string, metadata?: UsageEvent["metadata"]) => {
    setUsageEvents((current) => [
      { id: nowId(), name, metadata, createdAt: new Date().toISOString() },
      ...current
    ].slice(0, 80));
  };

  const syncPreferencesSnapshot = (nextPreferences: NotificationPreference[]) => {
    void syncNotificationPreferences(
      {
        preferences: nextPreferences,
        locale: language,
        timezone: getDeviceTimezone()
      },
      () => ({ status: "local_fallback", preferences: nextPreferences }),
      backendOptions
    ).then((result) => {
      recordEvent("notification_preferences_synced", {
        status: result.status,
        backend: Boolean(nilazaBackendBaseUrl)
      });
    });
  };

  const syncInboxSnapshot = (nextNotifications: InAppNotification[]) => {
    void syncNotificationInbox(
      { notifications: nextNotifications.slice(0, 30) },
      () => ({ status: "local_fallback", notifications: nextNotifications }),
      backendOptions
    ).then((result) => {
      recordEvent("notification_inbox_synced", {
        status: result.status,
        count: nextNotifications.length,
        backend: Boolean(nilazaBackendBaseUrl)
      });
    });
  };

  const updateNotificationPreference = (channel: NotificationPreference["channel"], type: NotificationType, enabled: boolean) => {
    setNotificationPreferences((current) => {
      const now = new Date().toISOString();
      const next = current.some((item) => item.channel === channel && item.type === type)
        ? current.map((item) => item.channel === channel && item.type === type ? { ...item, enabled, updatedAt: now } : item)
        : [{ id: `${channel}:${type}`, channel, type, enabled, updatedAt: now }, ...current];
      syncPreferencesSnapshot(next);
      recordEvent("notification_preference_changed", { channel, type, enabled });
      return next;
    });
  };

  const enqueueInAppNotification = (input: Omit<InAppNotification, "id" | "channel" | "status" | "createdAt">) => {
    if (!isNotificationEnabled(notificationPreferences, "in_app", input.type)) return;
    const nextNotification: InAppNotification = {
      ...input,
      id: nowId(),
      channel: "in_app",
      status: "unread",
      createdAt: new Date().toISOString()
    };
    setInAppNotifications((current) => {
      const next = [nextNotification, ...current].slice(0, 50);
      syncInboxSnapshot(next);
      return next;
    });
    recordEvent("in_app_notification_created", { type: input.type, targetRoute: input.targetRoute ?? "home" });
  };

  const beginGenerationActivity = (input: Omit<GenerationActivity, "id" | "status" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const activity: GenerationActivity = { ...input, id: nowId(), status: "working", createdAt: now, updatedAt: now };
    setGenerationActivities((current) => [activity, ...current.filter((item) => item.status !== "working")].slice(0, 12));
    recordEvent("generation_activity_started", { feature: activity.feature });
    return activity;
  };

  const finishGenerationActivity = (activity: GenerationActivity, status: "ready" | "failed") => {
    const completed = { ...activity, status, updatedAt: new Date().toISOString() };
    setGenerationActivities((current) => current.map((item) => item.id === activity.id ? completed : item));
    if (status === "ready") {
      const stillFocused = screenRef.current === completed.targetRoute
        && (completed.targetRoute !== "chat"
          || (chatModeRef.current === completed.targetMode
            && (!completed.personaId || completed.personaId === selectedPersonaIdRef.current)));
      if (stillFocused) {
        recordEvent("generation_activity_ready_in_context", { feature: activity.feature });
        return;
      }
      const sourceType = completed.feature === "tarot_reading" ? "tarot"
        : completed.feature === "astrology_report" ? "astrology"
          : completed.feature === "ai_council" ? "council" : "chat";
      // This is intentionally generic: notifications never carry private prompts or AI output.
      enqueueInAppNotification({
        type: "ai_response_ready",
        title: { vi: "Phản hồi của Nilaza đã sẵn sàng", en: "Your Nilaza response is ready" },
        body: { vi: "Mở lại đúng cuộc trò chuyện để đọc phản hồi.", en: "Return to the conversation to read it." },
        sourceType,
        targetRoute: completed.targetRoute,
        targetMode: completed.targetMode,
        personaId: completed.personaId
      });
      showToast(language === "vi" ? "Phản hồi AI đã sẵn sàng." : "Your AI response is ready.");
    }
    recordEvent(status === "ready" ? "generation_activity_ready" : "generation_activity_failed", { feature: activity.feature });
  };

  const openGenerationActivity = (activity: GenerationActivity) => {
    if (activity.feature === "persona_chat") {
      if (activity.personaId) setSelectedPersonaId(activity.personaId);
      setChatHandoffContext(undefined);
      setChatMode("room");
      navigate("chat");
    } else if (activity.feature === "oracle") {
      setChatMode("oracle");
      navigate("chat");
    } else if (activity.feature === "ai_council") {
      setChatMode("council");
      navigate("chat");
    } else if (activity.feature === "tarot_reading") {
      setScreen("tarot");
      setTarotStage(activity.status === "ready" ? "result" : "draw");
    } else {
      setScreen("astrology");
      setAstrologyStage(activity.status === "ready" ? "report" : "casting");
    }
    setGenerationActivities((current) => current.map((item) => item.id === activity.id
      ? { ...item, status: item.status === "ready" ? "dismissed" : item.status, updatedAt: new Date().toISOString() }
      : item));
  };

  const enablePushNotifications = async () => {
    const pushTypes = notificationTypes.filter((item) => item.channelDefault === "push").map((item) => item.id);
    const now = new Date().toISOString();
    const nextPreferences = notificationPreferences.map((preference) =>
      preference.channel === "push" && pushTypes.includes(preference.type)
        ? { ...preference, enabled: true, updatedAt: now }
        : preference
    );
    setNotificationPreferences(nextPreferences);
    syncPreferencesSnapshot(nextPreferences);

    const permissionStatus = await requestNotificationPermission();
    const registration = await buildDevicePushRegistration(language);
    const nextRegistration = { ...registration, permissionStatus };
    setDevicePushRegistration(nextRegistration);
    const enabledTypes = nextPreferences.filter((preference) => preference.channel === "push" && preference.enabled).map((preference) => preference.type);
    const result = await registerNotificationDevice(
      { ...nextRegistration, enabledTypes },
      () => ({ status: "local_fallback" }),
      backendOptions
    );
    recordEvent("push_notification_registration_completed", {
      status: result.status,
      permissionStatus,
      hasToken: Boolean(nextRegistration.expoPushToken),
      backend: Boolean(nilazaBackendBaseUrl)
    });
    if (permissionStatus === "granted" && nextRegistration.expoPushToken) {
      showToast(language === "vi" ? "Đã bật thông báo cho lời nhắc an toàn." : "Notifications enabled for safe reminders.");
    } else {
      showToast(language === "vi" ? "Chưa bật được thông báo trên máy. Hộp thư trong app vẫn hoạt động." : "Push unavailable or permission denied. Inbox still works.");
    }
  };

  const markNotificationRead = (id: string) => {
    setInAppNotifications((current) => {
      const next = current.map((notification) => (
        notification.id === id ? { ...notification, status: "read" as const, readAt: new Date().toISOString() } : notification
      ));
      syncInboxSnapshot(next);
      return next;
    });
    recordEvent("in_app_notification_read", { notificationId: id });
  };

  const markAllNotificationsRead = () => {
    setInAppNotifications((current) => {
      const readAt = new Date().toISOString();
      const next = current.map((notification) => notification.status === "unread" ? { ...notification, status: "read" as const, readAt } : notification);
      syncInboxSnapshot(next);
      return next;
    });
    recordEvent("in_app_notifications_marked_read");
  };

  const dismissNotification = (id: string) => {
    setInAppNotifications((current) => {
      const next = current.map((notification) => (
        notification.id === id ? { ...notification, status: "dismissed" as const } : notification
      ));
      syncInboxSnapshot(next);
      return next;
    });
    recordEvent("in_app_notification_dismissed", { notificationId: id });
  };

  // Hoàn tác after dismissing brings the notification back as read (analysis PR-05).
  const restoreNotification = (id: string) => {
    setInAppNotifications((current) => {
      const next = current.map((notification) => (
        notification.id === id && notification.status === "dismissed" ? { ...notification, status: "read" as const } : notification
      ));
      syncInboxSnapshot(next);
      return next;
    });
    recordEvent("in_app_notification_restored", { notificationId: id });
  };

  const openNotification = (notification: InAppNotification) => {
    markNotificationRead(notification.id);
    if (notification.targetRoute === "chat") {
      if (notification.personaId) setSelectedPersonaId(notification.personaId);
      setChatHandoffContext(undefined);
      setChatMode(notification.targetMode ?? "oracle");
      navigate("chat");
    } else if (notification.targetRoute === "tarot") {
      setScreen("tarot");
      setTarotStage("result");
    } else if (notification.targetRoute === "astrology") {
      setScreen("astrology");
      setAstrologyStage("report");
    } else if (notification.targetRoute === "journal") {
      navigate("journal");
    } else if (notification.targetRoute === "profile") {
      navigate("profile");
    } else {
      navigate("home");
    }
    recordEvent("in_app_notification_opened", { notificationId: notification.id, targetRoute: notification.targetRoute ?? "home" });
  };

  const createAdminTestNotification = async () => {
    const fallbackNotification: InAppNotification = {
      id: nowId(),
      type: "admin_test",
      title: { vi: "Thông báo thử của Nilaza", en: "Nilaza test notification" },
      body: { vi: "Đây là thông báo thử an toàn, không chứa dữ liệu riêng tư.", en: "This is a safe test notification with no private content." },
      channel: "in_app",
      status: "unread",
      sourceType: "admin",
      targetRoute: "profile",
      createdAt: new Date().toISOString()
    };
    const result = await sendNotificationTest(
      { locale: language, targetRoute: "profile" },
      () => ({ status: "local_fallback", notification: fallbackNotification }),
      backendOptions
    );
    const notification = result.notification ?? fallbackNotification;
    setInAppNotifications((current) => {
      const next = [notification, ...current].slice(0, 50);
      syncInboxSnapshot(next);
      return next;
    });
    recordEvent("admin_test_notification_created", { status: result.status, backend: Boolean(nilazaBackendBaseUrl) });
    showToast(language === "vi" ? "Đã tạo thông báo thử." : "Test notification created.");
  };

  const completeDailyRitual = (reason: string) => {
    const dateKey = todayKey();
    const shouldAdvance = profile.lastActivityDate !== dateKey;
    setProfile((current) => buildNextStreakProfile(current, dateKey));
    if (shouldAdvance) {
      recordEvent("daily_streak_advanced", { dateKey, reason });
    }
  };

  const recordSafetyEvent = (event: Omit<SafetyEvent, "id" | "createdAt" | "status">, notify = true) => {
    const nextEvent: SafetyEvent = {
      ...event,
      id: nowId(),
      createdAt: new Date().toISOString(),
      status: "open"
    };
    setSafetyEvents((current) => [nextEvent, ...current].slice(0, 80));
    recordEvent("safety_event_created", { feature: event.feature, reason: event.reason });
    if (notify) showToast(c.reported);
  };

  const markSafetyReviewed = (id: string) => {
    setSafetyEvents((current) => current.map((event) => (event.id === id ? { ...event, status: "reviewed" } : event)));
    recordEvent("safety_event_reviewed", { safetyEventId: id });
  };

  const refreshDailyInsight = async (premiumReroll = false) => {
    if (isOwnerPreviewActive) {
      showToast(language === "vi"
        ? "Bạn đang xem thử giao diện bậc tài khoản. Nội dung AI chưa được tạo trong chế độ này."
        : "You are previewing an account tier. AI content is not generated in this view.");
      return;
    }
    const currentDateKey = todayKey();
    const canRefresh = !dailyInsight || dailyInsight.dateKey !== currentDateKey || premiumReroll;
    if (!canRefresh) {
      showToast(language === "vi" ? "Mỗi ngày có một dẫn hướng hôm nay. Ngày mai sẽ có dẫn hướng mới." : "Free plan has one daily insight per day. Premium will unlock rerolls.");
      recordEvent("daily_insight_reroll_preview", { dateKey: currentDateKey });
      return;
    }

    const rerollCount = premiumReroll ? (dailyInsight?.rerollCount ?? 0) + 1 : 0;
    const nextInsight = await generateDailyInsight(
      {
        language,
        dateKey: currentDateKey,
        rerollCount,
        profile: {
          nickname: profile.nickname,
          goals: profile.goals,
          tone: profile.tone
        },
        // Owner 2026-11-04: only a mood label written in the last 24 hours, never journal text.
        ...(() => {
          const latest = journalEntries.find((entry) => entry.mood && Date.now() - Date.parse(entry.createdAt) <= 24 * 60 * 60 * 1000);
          return latest?.mood ? { recentMood: latest.mood.slice(0, 32) } : {};
        })()
      },
      () => buildDailyInsight(profile, journalEntries, language, rerollCount),
      backendOptions
    );
    setDailyInsight(nextInsight);
    enqueueInAppNotification({
      type: "daily_insight_ready",
      title: { vi: "Thông điệp hôm nay đã sẵn sàng", en: "Today's insight is ready" },
      body: { vi: "Mở Nilaza để đọc phần phản chiếu trong app.", en: "Open Nilaza to read the reflection inside the app." },
      sourceType: "daily",
      sourceId: nextInsight.id,
      targetRoute: "home"
    });
    recordEvent("daily_insight_refreshed", { dateKey: nextInsight.dateKey, rerollCount: nextInsight.rerollCount });
  };

  const previewDailyReroll = () => {
    recordEvent("daily_insight_reroll_preview", { dateKey: todayKey() });
    showToast(c.upgradePreview);
  };

  const syncProfileSnapshot = (nextProfile: Profile) => {
    const hasBirthTime = !birthTimeUnknown && Boolean(birthTime.trim());
    void syncUserProfile(
      {
        profile: nextProfile,
        birthProfile: {
          birthDate: birthDate.trim() || undefined,
          birthTime: hasBirthTime ? birthTime.trim() : undefined,
          birthTimeKnown: hasBirthTime,
          birthPlace: birthPlace.trim() || undefined,
          consentVersion: birthConsentVersion,
          timezone: getDeviceTimezone()
        }
      },
      () => ({ status: "local_fallback" }),
      backendOptions
    ).then((result) => {
      recordEvent("profile_sync_completed", {
        status: result.status,
        backend: Boolean(nilazaBackendBaseUrl)
      });
    });
  };

  useEffect(() => {
    if (!loaded || !profile.onboarded) return;
    const timer = setTimeout(() => {
      syncProfileSnapshot(profile);
    }, 900);
    return () => clearTimeout(timer);
  }, [birthDate, birthPlace, birthTime, birthTimeUnknown, loaded, profile]);

  const navigate = (next: Screen, journalEntryId?: string) => {
    setShowAdmin(false);
    if (next === "journal") setJournalEntryToOpen(journalEntryId ?? null);
    setScreen(next);
    recordEvent("screen_opened", { screen: next });
  };
  const currentTabOrHome = (): Tab => tabs.includes(screen as Tab) ? screen as Tab : "home";

  const resetTarotSession = () => {
    setReading(null);
    setSelectedTarotCardId(null);
    setTarotQuestion("");
    setTarotKeepSelectedDeck(false);
    setTarotIntentionReviewed(false);
    setTarotError("");
    setTarotStageHistory([]);
    setTarotStage("topic");
  };

  const requestTarotStartOver = () => {
    const unsavedReading = reading && !journalEntriesRef.current.some((entry) => entry.sourceType === "tarot" && entry.sourceId === reading.id);
    if (!unsavedReading) {
      resetTarotSession();
      return;
    }
    requestConfirmation({
      title: language === "vi" ? "Bắt đầu lượt mới?" : "Start a new reading?",
      body: language === "vi" ? "Trải bài này chưa được lưu vào Nhật ký. Nếu bắt đầu lượt mới, bạn sẽ không mở lại được nó." : "This reading is not saved to your Journal yet. If you start a new one, you cannot reopen it.",
      confirmLabel: language === "vi" ? "Bắt đầu lượt mới" : "Start new reading",
      tone: "danger",
      onConfirm: () => confirmDestructiveAction(resetTarotSession)
    });
  };

  const startTarot = (stage: TarotStage = "intro") => {
    setTarotReturnScreen(currentTabOrHome());
    resetTarotSession();
    setScreen("tarot");
    const safeStage = isTarotStage(stage) ? stage : "intro";
    setTarotStage(safeStage);
    recordEvent("tarot_opened", { stage: safeStage });
  };

  const startAstrology = (stage: AstrologyStage = "hub") => {
    setAstrologyReturnScreen(currentTabOrHome());
    setScreen("astrology");
    setAstrologyStage(stage);
    setAstrologyError("");
    recordEvent("astrology_opened", { stage });
  };

  const startQuickTarot = () => {
    setTarotReturnScreen(currentTabOrHome());
    resetTarotSession();
    setScreen("tarot");
    setTarotTopic("self");
    setTarotSpread("daily-one");
    setTarotQuestion("");
    setTarotKeepSelectedDeck(true);
    setTarotStage("topic");
    recordEvent("tarot_quick_opened", { deckId: selectedDeck.id });
  };

  const goToTarotStage = (nextStage: TarotStage) => {
    if (tarotStage === nextStage) return;
    if (tarotStage === "topic" && (nextStage === "spread" || nextStage === "draw")) setTarotIntentionReviewed(true);
    if (tarotStage === "cardMeaning") {
      setTarotStageHistory((currentHistory) =>
        currentHistory[currentHistory.length - 1] === nextStage ? currentHistory.slice(0, -1) : currentHistory
      );
      setTarotStage(nextStage);
      return;
    }
    setTarotStageHistory((currentHistory) => [...currentHistory, tarotStage].slice(-16));
    setTarotStage(nextStage);
  };

  // Android Back: close a dialog, step back inside Tarot or a chat room, else return to Hôm nay.
  // Astrology handles its own stages; on Hôm nay the system default (leave the app) applies.
  const backRef = useRef<() => boolean>(() => false);
  backRef.current = () => {
    if (confirmationDialog) {
      setConfirmationDialog(null);
      return true;
    }
    if (screen === "astrology") return false;
    if (screen === "tarot") {
      handleTarotBack();
      return true;
    }
    if (screen === "chat" && chatMode !== "list") {
      setChatMode("list");
      return true;
    }
    if (screen !== "home") {
      navigate("home");
      return true;
    }
    return false;
  };
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => backRef.current());
    return () => subscription.remove();
  }, []);

  const handleTarotBack = () => {
    const previousStage = tarotStageHistory[tarotStageHistory.length - 1];
    if (!previousStage) {
      navigate(tarotReturnScreen);
      return;
    }
    setTarotStageHistory((currentHistory) => currentHistory.slice(0, -1));
    setTarotStage(previousStage);
  };

  const saveAstrologyPreview = () => {
    if (!astrologyReport) return;
    const focusLabel = localizedText(astrologyFocusOptions.find((item) => item.id === astrologyReport.focus)?.title, language, astrologyReport.focus);
    saveJournal({
      sourceType: "astrology",
      sourceId: astrologyReport.id,
      title: `Astrology preview - ${focusLabel}`,
      summary: astrologyReport.sections.map((section) => `${section.title}: ${section.body}`).join("\n\n"),
      sourceSnapshot: {
        type: "astrology_report_preview",
        calculationStatus: astrologyReport.calculationStatus,
        focus: astrologyReport.focus,
        birthDate: astrologyReport.birthDate,
        birthTimeKnown: astrologyReport.birthTimeKnown,
        birthPlace: astrologyReport.birthPlace,
        sunSign: astrologyReport.sunSign,
        moonSign: astrologyReport.moonSign,
        risingSign: astrologyReport.risingSign,
        provider: astrologyReport.provider,
        calculationVersion: astrologyReport.calculationVersion,
        caveats: astrologyReport.caveats
      }
    });
  };

  const saveZodiacPulse = () => {
    saveJournal({
      sourceType: "daily",
      sourceId: zodiacPulse.id,
      title: language === "vi" ? `Zodiac Pulse - ${zodiacPulse.title}` : `Zodiac Pulse - ${zodiacPulse.title}`,
      summary: `${zodiacPulse.reflection}\n\n${zodiacPulse.microAction}`,
      sourceSnapshot: {
        type: "daily_zodiac_pulse",
        zodiacPulse
      }
    });
    recordEvent("zodiac_pulse_saved", {
      dateKey: zodiacPulse.dateKey,
      profileCompleteness: zodiacPulse.profileCompleteness,
      source: zodiacPulse.source
    });
  };

  const openChat = (mode: ChatMode = "oracle", personaId?: string, handoffContext?: ChatHandoffContext) => {
    if (personaId) setSelectedPersonaId(personaId);
    setChatHandoffContext(handoffContext);
    if (handoffContext) setChatInput(buildHandoffPrompt(handoffContext, language));
    setChatMode(mode);
    navigate("chat");
  };

  const toggleFavoritePersona = (personaId: string) => {
    const persona = personasById[personaId];
    if (!persona) return;
    const personaName = localizedText(persona.name, language);
    const exists = favoritePersonaIds.includes(personaId);
    setFavoritePersonaIds((current) => (current.includes(personaId)
      ? current.filter((id) => id !== personaId)
      : [personaId, ...current]));
    recordEvent(exists ? "persona_favorite_removed" : "persona_favorite_added", { personaId });
    showToast(exists
      ? (language === "vi" ? "Đã xoá khỏi guide yêu thích" : "Removed from favorite guides")
      : (language === "vi" ? `Đã lưu ${personaName} vào guide yêu thích` : `${personaName} saved to favorite guides`));
  };

  const sendOracleMessage = async (preset?: string) => {
    if (isOwnerPreviewActive) {
      showToast(language === "vi"
        ? "Bạn đang xem thử giao diện bậc tài khoản. Lượt gửi AI đang tạm dừng trong chế độ này."
        : "You are previewing an account tier. AI requests are paused in this view.");
      return;
    }
    const text = (preset ?? oracleInput).trim();
    if (!text || oracleGenerating) return;
    const userTurn: OracleTurn = {
      id: nowId(),
      role: "user",
      text,
      createdAt: new Date().toISOString()
    };
    setOracleInput("");
    setOracleError("");
    setOracleGenerating(true);
    const activity = beginGenerationActivity({
      feature: "oracle",
      title: { vi: "Nilaza Oracle đang lắng nghe", en: "Nilaza Oracle is listening" },
      detail: { vi: "Bạn có thể tiếp tục khám phá", en: "You can keep exploring" },
      targetRoute: "chat",
      targetMode: "oracle"
    });
    const previousTurns = oracleTurns;
    setOracleTurns((current) => [...current, userTurn].slice(-40));
    const useAi = Boolean(nilazaBackendBaseUrl && backendOptions.authToken);
    try {
      const signal = oracleSafetySignal(text);
      const localResult = (): OracleTurnResult => signal
        ? { ...buildOracleFallbackResult(text, language), reply: oracleSafetyReply(language, signal), intent: "safety_redirect", actionCards: [], moderationStatus: "blocked", safety: signal === "self_harm_signal" ? "crisis" : "boundary" }
        : buildOracleFallbackResult(text, language);
      // Crisis and boundary replies answer on the device, free and instant; everything else asks the AI when signed in.
      const tone = ["balanced", "gentle", "direct", "wise", "playful", "spiritual"].includes(profile.tone) ? profile.tone : undefined;
      const result: OracleTurnResult = signal || !useAi ? localResult() : await generateOracleTurn({
        language,
        userMessage: text,
        currentScreen: "oracle",
        profile: {
          ...(profile.nickname?.trim() ? { nickname: profile.nickname.trim().slice(0, 80) } : {}),
          goals: profile.goals.slice(0, 5).map((goal) => goal.slice(0, 300)),
          ...(tone ? { tone } : {})
        },
        recentSafeContext: [],
        consentFlags: { journalMemory: false, birthProfile: false, history: true, profile: true },
        sanitizedHistory: previousTurns
          .filter((turn) => turn.text.trim())
          .slice(-8)
          .map((turn) => ({ role: turn.role, text: turn.text.replace(/\s+/g, " ").trim().slice(0, 1500) }))
      }, localResult, backendOptions);
      const oracleTurn: OracleTurn = {
        id: nowId(),
        role: "oracle",
        text: result.reply,
        createdAt: new Date().toISOString(),
        intent: result.intent,
        confidence: result.confidence,
        actionCards: result.actionCards,
        handoffContext: result.handoffContext,
        promptVersionId: result.promptVersionId,
        ...(result.safety ? { safety: result.safety } : {}),
        moderationStatus: result.moderationStatus
      };
      setOracleTurns((current) => [...current, oracleTurn].slice(-40));
      recordEvent("oracle_turn_created", {
        intent: result.intent,
        moderationStatus: result.moderationStatus,
        backend: useAi && !signal,
        actionCount: result.actionCards.length
      });
      if (result.moderationStatus === "blocked") {
        recordSafetyEvent({
          feature: "oracle",
          reason: "blocked_topic",
          summary: summarizeForSafety(`oracle_intent=${result.intent}; promptLength=${text.length}`)
        }, false);
      }
      finishGenerationActivity(activity, "ready");
    } catch (error) {
      // Give the question back and say why, like guide chat (ai-unavailable-notice-2026-11-11).
      setOracleTurns((current) => current.filter((turn) => turn.id !== userTurn.id));
      setOracleInput(text);
      const reason = error instanceof BackendUnavailableError ? error.reason
        : error instanceof BackendLimitError ? error.code : "error";
      setOracleError(reason === "daily_limit_reached"
        ? (language === "vi" ? "Bạn đã dùng hết lượt trò chuyện hôm nay (Oracle dùng chung lượt với người dẫn đường). Lượt mới mở vào đầu ngày mai." : "You have used today's conversations (Oracle shares them with guide chat). New ones open at the start of tomorrow.")
        : reason === "feature_paused"
          ? (language === "vi" ? "Oracle đang tạm nghỉ một chút. Hãy thử lại sau." : "Oracle is resting for a while. Please try again later.")
          : reason === "offline"
            ? (language === "vi" ? "Đường truyền đang gián đoạn. Bạn kiểm tra kết nối Internet rồi gửi lại; câu của bạn vẫn còn trong ô nhập." : "The connection is interrupted. Check your Internet and send again; your message is still in the box.")
            : reason === "auth"
              ? (language === "vi" ? "Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại rồi gửi lại nhé." : "Your sign-in has expired. Sign in again, then send again.")
              : (language === "vi" ? "Oracle chưa trả lời được lúc này. Câu của bạn vẫn còn trong ô nhập, hãy thử lại sau ít phút." : "Oracle cannot answer right now. Your message is still in the box; try again in a few minutes."));
      finishGenerationActivity(activity, "failed");
      recordEvent("oracle_turn_failed", { backend: useAi, reason });
    } finally {
      setOracleGenerating(false);
    }
  };

  const latestOracleReply = [...oracleTurns].reverse().find((turn) => turn.role === "oracle");

  const saveLatestOracleInsight = () => {
    if (!latestOracleReply) {
      showToast(language === "vi" ? "Chưa có gợi ý nào từ Oracle để lưu" : "No Oracle insight to save yet");
      return;
    }
    saveJournal({
      sourceType: "chat",
      sourceId: latestOracleReply.id,
      title: "Nilaza Oracle",
      summary: latestOracleReply.text,
      sourceSnapshot: {
        type: "oracle_turn",
        intent: latestOracleReply.intent,
        confidence: latestOracleReply.confidence,
        promptVersionId: latestOracleReply.promptVersionId,
        memoryConsent: oracleMemoryConsent
      }
    });
    recordEvent("oracle_insight_saved", { intent: latestOracleReply.intent ?? "unknown" });
  };

  const reportLatestOracleReply = () => {
    recordSafetyEvent({
      feature: "oracle",
      sourceId: latestOracleReply?.id,
      reason: "user_report",
      summary: summarizeForSafety(`oracle=${latestOracleReply?.intent ?? "none"}; answerLength=${latestOracleReply?.text.length ?? 0}`)
    });
  };

  const handleOracleAction = (action: OracleActionCard) => {
    const context = action.handoffContext ?? latestOracleReply?.handoffContext ?? buildOracleHandoffContext(oracleInput, "reflect");
    recordEvent("oracle_action_selected", { kind: action.kind, target: action.target });
    if (action.kind === "reflect_here") {
      void sendOracleMessage(context.safeSummary);
      recordEvent("oracle_handoff_completed", { target: "oracle" });
      return;
    }
    if (action.kind === "draw_tarot") {
      const nextTopic = topics.some((topic) => topic.id === context.suggestedTarotTopic) ? context.suggestedTarotTopic as TarotTopic : "self";
      const nextSpread = spreads.some((spread) => spread.id === context.suggestedTarotSpread) ? context.suggestedTarotSpread as TarotSpread : "past-present-future";
      setTarotTopic(nextTopic);
      setTarotSpread(nextSpread);
      setTarotQuestion(context.userMessage);
      startTarot("spread");
      recordEvent("oracle_handoff_completed", { target: "tarot", topic: nextTopic, spread: nextSpread });
      return;
    }
    if (action.kind === "ask_guide") {
      const persona = personas.find((item) => item.slug === context.suggestedPersonaSlug) ?? personas.find((item) => item.slug === "the-mystic") ?? selectedPersona;
      openChat("room", persona.id, buildOracleChatHandoffContext(context, language));
      recordEvent("oracle_handoff_completed", { target: "persona", personaId: persona.id });
      return;
    }
    if (action.kind === "open_council") {
      const template = councilRoomProps.activeTemplates.find((item) => item.id === context.suggestedCouncilTemplateId);
      if (template) councilRoomProps.onSelectTemplate(template);
      councilRoomProps.onQuestionChange(context.safeSummary);
      openChat("council");
      recordEvent("oracle_handoff_completed", { target: "council", templateId: template?.id ?? councilRoomProps.template.id });
      return;
    }
    if (action.kind === "cast_astrology") {
      if (context.suggestedAstrologyFocus === "career" || context.suggestedAstrologyFocus === "love") {
        setAstrologyFocus(context.suggestedAstrologyFocus);
      } else {
        setAstrologyFocus("soul");
      }
      startAstrology(birthDate.trim() ? "hub" : "birth");
      recordEvent("oracle_handoff_completed", { target: "astrology", hasBirthDate: Boolean(birthDate.trim()) });
      return;
    }
    if (action.kind === "save_journal") {
      saveJournal({
        sourceType: "chat",
        sourceId: context.sourceId,
        title: "Nilaza Oracle",
        summary: latestOracleReply?.text ?? context.safeSummary,
        sourceSnapshot: {
          type: "oracle_handoff",
          safeSummary: context.safeSummary,
          userMessage: context.userMessage
        }
      });
      recordEvent("oracle_handoff_completed", { target: "journal" });
    }
  };

  const startTarotFollowup = (personaId?: string) => {
    if (!reading) return;
    const mystic = (personaId ? personasById[personaId] : undefined) ?? getRecommendedTarotGuide(reading.deck.id) ?? selectedPersona;
    const context = buildTarotHandoffContext(reading, language);
    openChat("room", mystic.id, context);
    recordEvent("tarot_followup_chat_opened", { readingId: reading.id, personaId: mystic.id, deckId: reading.deck.id });
  };

  const startTarotCardChat = (card: TarotCard | DrawnTarotCard, deck: TarotDeck, sourceReading?: ReturnType<typeof drawReading> | null) => {
    const mystic = personas.find((persona) => persona.slug === "the-mystic") ?? selectedPersona;
    const context = buildTarotCardHandoffContext(card, deck, language, sourceReading);
    openChat("room", mystic.id, context);
    recordEvent("tarot_card_chat_opened", {
      cardId: card.id,
      deckId: deck.id,
      readingId: sourceReading?.id ?? "library",
      personaId: mystic.id
    });
  };

  const startAstrologyFollowup = () => {
    if (!astrologyReport) return;
    const astrologer = personas.find((persona) => persona.slug === "the-astrologer") ?? selectedPersona;
    const context = buildAstrologyHandoffContext(astrologyReport, language);
    openChat("room", astrologer.id, context);
    recordEvent("astrology_followup_chat_opened", {
      reportId: astrologyReport.id,
      personaId: astrologer.id,
      calculationStatus: astrologyReport.calculationStatus
    });
  };

  const startZodiacFollowup = () => {
    const astrologer = personas.find((persona) => persona.slug === "the-astrologer") ?? selectedPersona;
    const context = buildZodiacHandoffContext(zodiacPulse, language);
    openChat("room", astrologer.id, context);
    recordEvent("zodiac_followup_chat_opened", {
      dateKey: zodiacPulse.dateKey,
      personaId: astrologer.id,
      profileCompleteness: zodiacPulse.profileCompleteness
    });
  };

  const startSituation = (situation: (typeof situationEntries)[number]) => {
    const persona = personas.find((item) => item.slug === situation.personaSlug) ?? recommendedPersonasForProfile(profile)[0] ?? personas[0];
    const prompt = localizedText(situation.prompt, language);
    setChatHandoffContext(undefined);
    setSelectedPersonaId(persona.id);
    setChatInput(prompt);
    setChatMode("room");
    navigate("chat");
    recordEvent("situation_entry_opened", { situationId: situation.id, personaId: persona.id });
  };

  const saveMoodCheck = (moodId: string) => {
    saveJournal({
      sourceType: "daily",
      title: language === "vi" ? "Cảm xúc hôm nay" : "Today's mood check",
      summary: language === "vi"
        ? `Cảm xúc: ${moodLabel(moodId, language)}. ${todayPulse.microAction}`
        : `Mood: ${moodLabel(moodId, language)}. ${todayPulse.microAction}`,
      mood: moodId,
      sourceSnapshot: {
        type: "today_pulse",
        dateKey: currentDateKey,
        cardId: todayPulse.card.id,
        deckId: todayPulse.deck.id,
        reflectionPrompt: todayPulse.reflectionPrompt
      }
    });
    recordEvent("daily_mood_check_saved", { mood: moodId });
  };

  const revealTodayPulseCard = () => {
    if (!todayPulseRevealed) {
      setRevealedTodayPulseKey(effectiveDailyInsight.dateKey);
      recordEvent("today_pulse_card_revealed", {
        cardId: todayPulse.card.id,
        dateKey: effectiveDailyInsight.dateKey,
        deckId: selectedDeck.id
      });
      completeDailyRitual("today_pulse_reveal");
    }
  };

  const saveTodayPulseCard = () => {
    const card = todayPulse.card;
    const cardName = displayTarotCardInline(card, language);
    void saveJournal({
      sourceType: "daily",
      sourceId: todayCardSourceId(currentDateKey),
      title: language === "vi" ? `Lá bài hôm nay · ${cardName}` : `Today's card · ${cardName}`,
      summary: [displayTarotMeaning(card, language), localizedText(card.reflectionQuestion, language, todayPulse.reflectionPrompt), todayPulse.microAction].join("\n\n"),
      ...(todayNote.trim() ? { userNote: todayNote.trim() } : {}),
      sourceSnapshot: {
        type: "today_pulse",
        dateKey: currentDateKey,
        cardId: card.id,
        deckId: todayPulse.deck.id,
        reflectionPrompt: todayPulse.reflectionPrompt
      }
    });
    recordEvent("today_card_saved", { cardId: card.id, deckId: todayPulse.deck.id, dateKey: currentDateKey });
  };

  // One entry for every share: the sheet shows the card, builds the tracked link and records share_tapped / share_completed.
  const openShareSheet = (request: ShareRequest) => {
    setShareSheet({
      model: request.model,
      primary: request.primary ?? "image",
      url: buildShareUrl({ language, surface: request.model.surface, id: newShareId(), cardIds: request.cardIds, sunSign: request.sunSign })
    });
  };
  const recordShareEvent = (name: ShareEventName, meta: ShareEventMeta) => {
    recordEvent(name, { surface: meta.surface, action: meta.action, ...(meta.outcome ? { outcome: meta.outcome } : {}) });
    // Server count: enumerated values only, signed-in sessions only, never delays or blocks the share.
    const payload = toShareEventPayload(name, meta);
    if (payload) void sendShareEvents([payload], backendOptions);
  };

  // Share only the card and its library meaning: never the user's question, mood or Journal text.
  const shareTodayPulseCard = () => {
    const card = todayPulse.card;
    openShareSheet({
      model: todayCardModel({
        language,
        cardName: displayTarotCardInline(card, language),
        meaning: displayTarotMeaning(card, language),
        image: getTarotCardImage(todayPulse.deck.id, card.id)
      }),
      cardIds: [card.id]
    });
  };

  // Prefill Oracle only; the question is sent when the user presses send there.
  const openOracleWithQuestion = (text: string) => {
    openChat("oracle");
    if (text) setOracleInput(text);
    recordEvent("home_ask_opened", { prefilled: Boolean(text) });
  };

  const startTarotForTopic = (topic: TarotTopic) => {
    startTarot("topic");
    setTarotTopic(topic);
    recordEvent("home_goal_suggestion_opened", { topic });
  };

  const toggleGoal = (goal: string) => {
    setOnboardingError("");
    setProfile((current) => ({
      ...current,
      goals: current.goals.includes(goal)
        ? current.goals.filter((item) => item !== goal)
        : [...current.goals, goal].slice(0, 3)
    }));
  };

  const continueFromGoals = () => {
    if (profile.goals.length === 0) {
      setOnboardingError(brandCopy(language).missingGoals);
      return;
    }
    setOnboardingError("");
    void completeOnboarding();
  };

  const skipOnboardingProfile = () => {
    setOnboardingError("");
    completeOnboarding(true);
  };

  const signUpLocally = async (name: string, email: string, password: string) => {
    if (isSupabaseAuthConfigured) {
      try {
        const result = await signUpWithSupabaseEmail(name, email, password);
        if (result) {
          if (!result.authState && result.pendingEmailConfirmation) {
            recordEvent("supabase_signup_confirmation_requested", {
              provider: "email",
              pendingEmailConfirmation: true
            });
            return "pending-email-confirmation" as const;
          }
          if (!result.authState) {
            recordEvent("supabase_account_create_failed", { provider: "email", reason: "missing_auth_state" });
            throw new Error(language === "vi" ? "Supabase chưa trả về phiên đăng ký. Hãy thử lại sau ít phút." : "Supabase did not return a sign-up session. Please try again in a few minutes.");
          }
          setProfile((current) => ({
            ...current,
            onboarded: false,
            nickname: name.trim(),
            goals: []
          }));
          setAuthState(result.authState);
          setAuthView("welcome");
          recordEvent("supabase_account_created", {
            provider: "email",
            pendingEmailConfirmation: Boolean(result.pendingEmailConfirmation)
          });
          if (result.pendingEmailConfirmation) {
            showToast(language === "vi" ? "Kiểm tra email để xác nhận tài khoản Supabase." : "Check your email to confirm your Supabase account.");
          }
          return;
        }
      } catch (error) {
        const rawMessage = error instanceof Error && error.message ? error.message : (language === "vi" ? "Không thể tạo tài khoản Supabase." : "Could not create Supabase account.");
        const lowerRaw = rawMessage.toLowerCase();
        const isNetworkError = lowerRaw.includes("failed to fetch") || lowerRaw.includes("network request failed") || lowerRaw.includes("networkrequestfailed") || lowerRaw.includes("timed out");
        const message = rawMessage.includes("already be registered")
          ? (language === "vi" ? "Email này có thể đã được đăng ký. Hãy đăng nhập bằng mật khẩu cũ hoặc đặt lại mật khẩu." : rawMessage)
          : isNetworkError
            ? (language === "vi" ? "Không thể kết nối đến máy chủ xác thực. Hãy kiểm tra kết nối mạng hoặc máy chủ Supabase." : "Unable to reach the authentication server. Please check your network or Supabase server.")
            : rawMessage;
        recordEvent("supabase_account_create_failed", { provider: "email" });
        throw new Error(message);
      }
      recordEvent("supabase_account_create_failed", { provider: "email", reason: "missing_session" });
      throw new Error(language === "vi" ? "Supabase chưa trả về phiên đăng ký. Hãy thử lại sau ít phút." : "Supabase did not return a sign-up session. Please try again in a few minutes.");
    }
    setProfile((current) => ({
      ...current,
      onboarded: false,
      nickname: name.trim(),
      goals: []
    }));
    setAuthState(createEmailAuthState(name, email));
    setAuthView("welcome");
    recordEvent("local_account_created", { provider: "email" });
  };

  const signInLocally = async (email: string, password: string) => {
    if (isSupabaseAuthConfigured) {
      try {
        const result = await signInWithSupabaseEmail(email, password);
        if (result?.authState?.status === "signed_in") {
          const nextAuthState = result.authState;
          const nextName = nextAuthState.user.name;
          if (!profile.onboarded) {
            setProfile((current) => ({ ...current, nickname: nextName, goals: [] }));
          }
          setAuthState(nextAuthState);
          setAuthView("welcome");
          recordEvent("supabase_account_signed_in", { provider: "email" });
          return;
        }
      } catch (error) {
        const rawMessage = error instanceof Error && error.message ? error.message : (language === "vi" ? "Không thể đăng nhập Supabase." : "Could not sign in with Supabase.");
        const lowerRaw = rawMessage.toLowerCase();
        const isNetworkError = lowerRaw.includes("failed to fetch") || lowerRaw.includes("network request failed") || lowerRaw.includes("networkrequestfailed") || lowerRaw.includes("timed out");
        const message = lowerRaw.includes("invalid login credentials")
          ? (language === "vi" ? "Thông tin đăng nhập không đúng. Nếu bạn vừa đăng ký, hãy kiểm tra email xác nhận hoặc thử đặt lại mật khẩu." : "Invalid login credentials. If you just signed up, check your confirmation email or try password reset.")
          : isNetworkError
            ? (language === "vi" ? "Không thể kết nối đến máy chủ xác thực. Hãy kiểm tra kết nối mạng hoặc máy chủ Supabase." : "Unable to reach the authentication server. Please check your network or Supabase server.")
            : rawMessage;
        recordEvent("supabase_account_sign_in_failed", { provider: "email" });
        throw new Error(message);
      }
      recordEvent("supabase_account_sign_in_failed", { provider: "email", reason: "missing_session" });
      throw new Error(language === "vi" ? "Supabase chưa trả về phiên đăng nhập. Hãy kiểm tra tài khoản rồi thử lại." : "Supabase did not return a sign-in session. Check the account and try again.");
    }
    const name = profile.onboarded && profile.nickname.trim()
      ? profile.nickname
      : displayNameFromEmail(email);
    if (!profile.onboarded) {
      setProfile((current) => ({ ...current, nickname: name, goals: [] }));
    }
    setAuthState(createEmailAuthState(name, email));
    setAuthView("welcome");
    recordEvent("local_account_signed_in", { provider: "email" });
  };

  const resetPasswordLocally = async (email: string) => {
    if (isSupabaseAuthConfigured) {
      try {
        const sent = await resetSupabasePasswordForEmail(email);
        if (sent) {
          recordEvent("supabase_password_reset_requested", { provider: "email" });
          showToast(language === "vi" ? "Hãy kiểm tra email để đặt lại mật khẩu." : "Check your email to reset your password.");
          return;
        }
      } catch (error) {
        recordEvent("supabase_password_reset_failed", { provider: "email" });
        throw error;
      }
    }
    recordEvent("local_password_reset_preview", { provider: "email" });
    throw new Error(language === "vi"
      ? "Khôi phục mật khẩu sẽ gửi email khi Supabase được kết nối. Bản local hiện chỉ mô phỏng luồng này."
      : "Password reset email will be sent when Supabase is connected. This local build only previews the flow.");
  };

  const resendSignupConfirmation = async (email: string) => {
    if (isSupabaseAuthConfigured) {
      try {
        const sent = await resendSupabaseSignupConfirmation(email);
        if (sent) {
          recordEvent("supabase_signup_confirmation_resent", { provider: "email" });
          return;
        }
      } catch (error) {
        recordEvent("supabase_signup_confirmation_resend_failed", { provider: "email" });
        throw error;
      }
    }
    recordEvent("local_signup_confirmation_resend_preview", { provider: "email" });
    throw new Error(language === "vi"
      ? "Email xác nhận sẽ được gửi khi Supabase được kết nối."
      : "The confirmation email will be sent when Supabase is connected.");
  };

  const signOutLocally = () => { void session.signOut(); };

  const markBirthTimeUnknown = () => {
    setBirthTime("");
    setBirthTimeUnknown((current) => !current);
  };

  const saveJournal = async (entry: Omit<JournalEntry, "id" | "createdAt">) => {
    if (!scope.active) return false;
    const dedupeKey = entry.sourceId ? `${entry.sourceType}:${entry.sourceId}` : null;
    if (dedupeKey && journalEntriesRef.current.some((item) => item.sourceType === entry.sourceType && item.sourceId === entry.sourceId)) {
      showToast(language === "vi" ? "Mục này đã được lưu" : "This insight is already saved");
      return true;
    }
    return journalSaveCoordinator.run(dedupeKey, async () => {
    const nextEntry: JournalEntry = { ...entry, id: nowId(), createdAt: new Date().toISOString(), syncStatus: "local" };
    try {
      await journalRepository.upsert(nextEntry);
      if (!scope.active) return false;
      setJournalLocalWriteFailed(false);
      recordEvent("journal_entry_saved", { sourceType: entry.sourceType, persistence: "local_acknowledged" });
      completeDailyRitual(`journal_${entry.sourceType}`);
      showToast(scope.accessToken
        ? language === "vi" ? "Đã lưu trên máy; đang chờ đồng bộ" : "Saved on this device; sync pending"
        : c.saved);
      void journalRepository.flush();
      return true;
    } catch {
      if (scope.active) showToast(language === "vi" ? "Chưa lưu được trải nghiệm. Hãy thử lưu lại." : "This insight could not be saved. Try saving again.");
      return false;
    }
    });
  };

  const reopenJournalSource = (entry: JournalEntry) => {
    const snapshotType = entry.sourceSnapshot?.type;
    if (entry.sourceType === "tarot" && snapshotType === "tarot_reading") {
      reopenTarotJournal(entry);
      return;
    }
    if (entry.sourceType === "chat" && snapshotType === "chat_message") {
      const source = messages.find(message => message.id === entry.sourceId);
      if (source && personasById[source.personaId]) {
        setActivePersonaSessionIds(current => ({ ...current, [source.personaId]: personaSessionIdForMessage(source) }));
        openChat("room", source.personaId);
        return;
      }
    }
    if (entry.sourceType === "chat" && (snapshotType === "oracle_turn" || snapshotType === "oracle_handoff") &&
      oracleTurns.some(turn => turn.id === entry.sourceId)) {
      openChat("oracle");
      return;
    }
    showToast(language === "vi"
      ? "Nguồn gốc chưa mở lại được trên thiết bị này. Nội dung đã lưu vẫn ở trong nhật ký."
      : "The original source is unavailable on this device. Your saved content remains in the journal.");
  };

  const reopenTarotJournal = (entry: JournalEntry) => {
    const snapshot = entry.sourceSnapshot as {
      type?: string;
      readingId?: string;
      provenance?: AnswerProvenance;
      deckId?: string;
      spread?: string;
      topic?: string;
      question?: string;
      cards?: Array<{
        cardId?: string;
        id?: string;
        orientation?: string;
        reversed?: boolean;
        spread?: string;
        name?: string | { en?: string; vi?: string };
        title?: string;
      }>;
      synthesis?: { en?: string; vi?: string };
      reflectionPrompt?: { en?: string; vi?: string };
      sections?: unknown;
      language?: Language;
      promptVersionId?: string;
      moderationStatus?: "passed" | "blocked" | "fallback";
    } | undefined;
    if (snapshot?.type !== "tarot_reading") {
      showToast(language === "vi" ? "Nguồn trải bài cũ chưa đủ dữ liệu để mở lại. Nội dung đã lưu vẫn trong nhật ký." : "This older reading has insufficient data to reopen. Your saved content remains in the journal.");
      return;
    }
    const deck = findTarotDeckById(decksById, snapshot.deckId ?? "");
    if (!deck) {
      showToast(language === "vi" ? "Bộ bài gốc chưa có trên thiết bị này. Nội dung đã lưu vẫn trong nhật ký." : "The original deck is unavailable on this device. Your saved content remains in the journal.");
      return;
    }
    const spread = spreads.some((item) => item.id === snapshot.spread)
      ? snapshot.spread as TarotSpread
      : "past-present-future";
    const topic = topics.some((item) => item.id === snapshot.topic)
      ? snapshot.topic as TarotTopic
      : "self";
    const snapshotCards = Array.isArray(snapshot.cards) ? snapshot.cards : [];
    const savedText = `${entry.title} ${entry.summary}`.toLocaleLowerCase();
    const selected = snapshotCards
      .map((savedCard) => {
        const savedCardId = savedCard.cardId ?? savedCard.id;
        const savedName = typeof savedCard.name === "string"
          ? savedCard.name
          : (language === "vi" ? savedCard.name?.vi : savedCard.name?.en) ?? savedCard.name?.en ?? savedCard.name?.vi ?? savedCard.title;
        const normalizedSavedId = savedCardId?.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-");
        const card = cards.find((item) => item.id === savedCardId)
          ?? cards.find((item) => normalizedSavedId && item.id.toLocaleLowerCase() === normalizedSavedId)
          ?? cards.find((item) => savedName && [item.name.en, item.name.vi]
            .some((name) => (name ?? "").toLocaleLowerCase() === savedName.toLocaleLowerCase()))
          ?? cards.find((item) => [item.name.en, item.name.vi]
            .some((name) => (name ?? "").length >= 6 && savedText.includes((name ?? "").toLocaleLowerCase())));
        return card
          ? {
              ...card,
              reversed: savedCard.orientation === "reversed" || savedCard.reversed === true,
              spread: savedCard.spread ?? "card"
            }
          : null;
      })
      .filter(Boolean) as DrawnTarotCard[];
    if (!selected.length || selected.length !== snapshotCards.length) {
      showToast(language === "vi" ? "Không thể khôi phục đủ lá bài. Nội dung đã lưu vẫn trong nhật ký." : "The saved cards could not be fully restored. Your saved content remains in the journal.");
      return;
    }
    const fallbackSynthesis = entry.summary || snapshot.synthesis?.vi || snapshot.synthesis?.en || "";
    const fallbackReflection = snapshot.reflectionPrompt?.vi || snapshot.reflectionPrompt?.en || "";
    const restoredReading = buildTarotReadingResult(deck, topic, spread, snapshot.question ?? "", selected, {
      summary: fallbackSynthesis,
      reflection: fallbackReflection,
      sections: snapshot.sections,
      provenance: parseAnswerProvenance(snapshot.provenance),
      promptVersionId: snapshot.promptVersionId,
      moderationStatus: snapshot.moderationStatus ?? "fallback"
    }, snapshot.language ?? language);
    const nextReading: ReturnType<typeof drawReading> = {
      ...restoredReading,
      id: snapshot.readingId ?? entry.sourceId ?? entry.id,
      createdAt: entry.createdAt,
      cards: snapshotCards as ReturnType<typeof drawReading>["cards"],
      language: snapshot.language ?? language,
      synthesis: {
        en: snapshot.synthesis?.en || fallbackSynthesis,
        vi: snapshot.synthesis?.vi || fallbackSynthesis
      },
      reflectionPrompt: {
        en: snapshot.reflectionPrompt?.en || fallbackReflection,
        vi: snapshot.reflectionPrompt?.vi || fallbackReflection
      }
    };
    setTarotReturnScreen("journal");
    setTarotStageHistory([]);
    setTarotTopic(topic);
    setTarotSpread(spread);
    setTarotQuestion(snapshot.question ?? "");
    setSelectedDeckId(deck.id);
    setSelectedTarotCardId(selected[0]?.id ?? null);
    setReading(nextReading);
    setTarotError("");
    setScreen("tarot");
    setTarotStage("result");
    recordEvent("tarot_journal_reopened", { readingId: nextReading.id, deckId: deck.id, spread });
  };

  const updateJournalEntry = async (id: string, patch: Partial<Pick<JournalEntry, "mood" | "userNote">>) => {
    try {
      await journalRepository.update(id, patch);
      if (!scope.active) return;
      setJournalLocalWriteFailed(false);
      recordEvent("journal_entry_updated", { entryId: id, persistence: "local_acknowledged" });
      showToast(language === "vi" ? "Đã cập nhật trên máy" : "Updated on this device");
      void journalRepository.flush();
    } catch {
      if (scope.active) showToast(language === "vi" ? "Chưa lưu thay đổi. Hãy giữ ghi chú và thử lưu lại." : "Changes were not saved. Keep your note and retry.");
    }
  };

  const deleteJournalEntry = async (id: string) => {
    try {
      await journalRepository.remove([id]);
      if (!scope.active) return;
      setJournalLocalWriteFailed(false);
      recordEvent("journal_entry_deleted", { entryId: id, persistence: "local_acknowledged" });
      showToast(language === "vi" ? "Đã xóa trên máy; sẽ đồng bộ khi có kết nối" : "Deleted on this device; sync pending");
      void journalRepository.flush();
    } catch {
      if (scope.active) showToast(language === "vi" ? "Chưa xóa được. Hãy thử lại." : "Could not delete. Try again.");
    }
  };

  // The entry is hidden right away and deleted after 5 seconds unless the person taps Hoàn tác.
  const pendingJournalDelete = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [hiddenJournalId, setHiddenJournalId] = useState<string | null>(null);
  const requestJournalDelete = (id: string) => {
    const previous = pendingJournalDelete.current;
    if (previous) {
      clearTimeout(previous.timer);
      void deleteJournalEntry(previous.id);
    }
    const timer = setTimeout(() => {
      pendingJournalDelete.current = null;
      setHiddenJournalId(null);
      void deleteJournalEntry(id);
    }, 5000);
    pendingJournalDelete.current = { id, timer };
    setHiddenJournalId(id);
  };
  const undoJournalDelete = () => {
    const pending = pendingJournalDelete.current;
    if (pending) clearTimeout(pending.timer);
    pendingJournalDelete.current = null;
    setHiddenJournalId(null);
  };

  const clearChatHistory = () => {
    setMessages([]);
    recordEvent("chat_history_cleared");
    showToast(language === "vi" ? "Đã xoá lịch sử chat local" : "Local chat history cleared");
  };

  const clearJournalHistory = async () => {
    try {
      await journalRepository.clear();
      if (!scope.active) return;
      setJournalLocalWriteFailed(false);
      setGeneratedArtifacts([]);
      recordEvent("journal_history_cleared", { persistence: "local_acknowledged" });
      showToast(language === "vi" ? "Đã xóa Nhật ký trên máy; đang chờ đồng bộ" : "Journal deleted on this device; sync pending");
      void journalRepository.flush();
    } catch {
      if (scope.active) showToast(language === "vi" ? "Chưa xóa được Nhật ký. Hãy thử lại." : "Could not delete Journal. Try again.");
    }
  };

  const clearBirthProfile = async () => {
    try {
      if (backendOptions.authToken) await deleteAstrologyAiReports(backendOptions);
      await clearAstrologyBirthData(storage);
    } catch {
      setStorageError(true);
      showToast(language === "vi"
        ? "Chưa xóa được dữ liệu chiêm tinh đã đồng bộ. Hãy thử lại khi có kết nối."
        : "Synced Astrology data could not be deleted. Try again when connected.");
      return;
    }
    setAstrologyReport(null);
    setBirthDate("");
    setBirthTime("");
    setBirthTimeUnknown(false);
    setBirthPlace("");
    recordEvent("birth_profile_cleared");
    showToast(backendOptions.authToken
      ? language === "vi"
        ? "Đã xóa hồ sơ ngày sinh và các bài đọc AI Chiêm tinh đã đồng bộ"
        : "Birth profile and synced Astrology AI reports deleted"
      : c.birthProfileCleared);
  };

  const exportLocalData = async () => {
    if (!scope.active || !scope.userId || exportInProgress.current) return;
    exportInProgress.current = true;
    try {
      const json = await buildLocalExport({ userId: scope.userId, active: () => scope.active,
        read: storage.loadJson, journalSnapshot: () => journalRepository.snapshot() });
      if (!scope.active) return;
      const outcome = await deliverExport(json, `nilaza-data-${new Date().toISOString().replace(/:/g, "-")}.json`, () => scope.active);
      if (!scope.active) return;
      recordEvent("local_data_export_prepared", { outcome });
      if (outcome === "download_requested") showToast(language === "vi" ? "File JSON đã được gửi cho trình duyệt để tải xuống." : "The JSON file was sent to your browser for download.");
    } catch {
      if (scope.active) showToast(language === "vi" ? "Chưa xuất được file dữ liệu. Hãy thử lại; dữ liệu của bạn vẫn được giữ nguyên." : "Could not export the data file. Try again; your data is still preserved.");
    } finally { exportInProgress.current = false; }
  };

  const clearAllLocalAccountData = () => {
    // Clear only this namespace, including Council/consent caches, then close auth.
    scope.close();
    setDeletingLocalData("pending");
    void storage.clear().then(() => session.signOut()).catch(() => {
      setDeletingLocalData("failed");
    });
  };
  const startPersonaSession = (personaId = selectedPersonaId) => {
    setActivePersonaSessionIds((current) => ({
      ...current,
      [personaId]: createPersonaSessionId(personaId)
    }));
  };

  const startFreshPersonaChat = () => {
    startPersonaSession(selectedPersonaId);
    setChatInput("");
    setChatHandoffContext(undefined);
    recordEvent("persona_chat_reset", { personaId: selectedPersonaId });
    showToast(language === "vi" ? "Đã bắt đầu phiên chat mới" : "Started a fresh chat");
  };

  const resumePersonaSession = (sessionId: string) => {
    setActivePersonaSessionIds((current) => ({
      ...current,
      [selectedPersonaId]: sessionId
    }));
    setChatInput("");
    setChatHandoffContext(undefined);
    recordEvent("persona_chat_resumed", { personaId: selectedPersonaId });
  };

  const sendMessage = (preset?: string, retry = false) => {
    if (isOwnerPreviewActive) {
      showToast(language === "vi"
        ? "Bạn đang xem thử giao diện bậc tài khoản. Câu hỏi chưa được gửi tới AI."
        : "You are previewing an account tier. Your question was not sent to AI.");
      return;
    }
    const text = (preset ?? chatInput).trim();
    if (!text || chatGenerating) return;
    const clientRequestId = nowId();
    const sanitizedHistory = currentMessages
      .slice(-8)
      .map((message) => ({
        role: message.role,
        text: message.text.replace(/\s+/g, " ").trim().slice(0, 800)
      }))
      .filter((message) => message.text.length > 0);
    setChatGenerating(true);
    setChatError("");
    setLastChatPrompt(text);
    const userMessage: ChatMessage = {
      id: nowId(),
      personaId: selectedPersonaId,
      role: "user",
      text,
      createdAt: new Date().toISOString(),
      uiMetadata: {
        sessionId: activePersonaSessionId,
        ...(chatHandoffContext
          ? {
            handoffSourceType: chatHandoffContext.sourceType,
            handoffSourceId: chatHandoffContext.sourceId
          }
          : {}),
        clientRequestId
      }
    };
    setChatInput("");
    // Thử lại resends the failed message that is already in the room instead of adding a copy (analysis CH-11).
    const lastMessage = currentMessages[currentMessages.length - 1];
    if (!(retry && lastMessage?.role === "user" && lastMessage.text === text)) setMessages((current) => [...current, userMessage]);
    const activity = beginGenerationActivity({
      feature: "persona_chat",
      title: { vi: `${localizedText(selectedPersona.name, language)} đang suy ngẫm`, en: `${localizedText(selectedPersona.name, "en")} is reflecting` },
      detail: { vi: "Bạn có thể tiếp tục khám phá", en: "You can keep exploring" },
      targetRoute: "chat",
      targetMode: "room",
      personaId: selectedPersonaId,
      sessionId: activePersonaSessionId
    });
    setTimeout(async () => {
      try {
        const reply = await generatePersonaReply(
          {
            language,
            persona: selectedPersona,
            text,
            sessionId: activePersonaSessionId,
            clientRequestId,
            sanitizedHistory,
            userContext: {
              goals: profile.goals,
              tone: profile.tone,
              ...(profile.nickname?.trim() ? { nickname: profile.nickname.trim().slice(0, 40) } : {}),
              handoffContext: chatHandoffContext
            }
          },
          () => {
            // Offline, the same safety policy answers on the device.
            const signal = oracleSafetySignal(text);
            if (signal) return { text: oracleSafetyReply(language, signal), moderationStatus: "blocked", safety: signal === "self_harm_signal" ? "crisis" : "boundary" };
            return {
              text: buildPersonaReply(selectedPersona, text, language, chatHandoffContext),
              moderationStatus: containsRiskyRequest(text) ? "blocked" : "fallback"
            };
          },
          backendOptions
        );
        const guideMessage: ChatMessage = {
          id: nowId(),
          personaId: selectedPersonaId,
          role: "guide",
          text: reply.text,
          createdAt: new Date().toISOString(),
          promptVersionId: reply.promptVersionId,
          uiMetadata: {
            sessionId: activePersonaSessionId,
            clientRequestId,
            // A canned reply (AI unavailable) is labelled in the room.
            ...(reply.moderationStatus === "fallback" ? { fallback: true } : {}),
            ...(reply.safety === "crisis" ? { safety: "crisis" } : {}),
            ...(chatHandoffContext
              ? {
                handoffSourceType: chatHandoffContext.sourceType,
                handoffSourceId: chatHandoffContext.sourceId
              }
              : {})
          }
        };
        setMessages((current) => [...current, guideMessage]);
        // The streak counts only once a reply has arrived (analysis CH-11).
        completeDailyRitual("persona_chat");
        if (reply.remoteSessionId && reply.remoteSessionId !== activePersonaSessionId) {
          setMessages((current) => current.map((message) => (
            personaSessionIdForMessage(message) === activePersonaSessionId && message.personaId === selectedPersonaId
              ? { ...message, uiMetadata: { ...message.uiMetadata, sessionId: reply.remoteSessionId! } }
              : message
          )));
          setActivePersonaSessionIds((current) => ({ ...current, [selectedPersonaId]: reply.remoteSessionId! }));
        }
        recordEvent("persona_message_sent", {
          personaId: selectedPersonaId,
          language,
          backend: Boolean(nilazaBackendBaseUrl),
          moderationStatus: reply.moderationStatus,
          handoffSourceType: chatHandoffContext?.sourceType ?? "none",
          sessionReused: Boolean(reply.remoteSessionId && reply.remoteSessionId === activePersonaSessionId),
          methodPackId: reply.methodPackId ?? "unknown",
          methodPackVersion: reply.methodPackVersion ?? "unknown"
        });
        finishGenerationActivity(activity, "ready");
      } catch (error) {
        // A guide paused from Admin is shown as resting, not as a failed answer. Limits and pauses offer no
        // Retry; a lost connection or a busy AI says so instead of showing a canned reply (device test 11/11).
        const unavailableReason = error instanceof BackendUnavailableError ? error.reason : undefined;
        setChatErrorRetryable(!(error instanceof BackendLimitError));
        setChatError(error instanceof BackendLimitError && error.code === "feature_paused"
          ? (language === "vi" ? "Trò chuyện với người dẫn đường đang tạm nghỉ một chút. Hãy thử lại sau." : "Guide chat is resting for a while. Please try again later.")
          : error instanceof BackendLimitError && error.code === "daily_limit_reached"
            ? (language === "vi" ? "Bạn đã dùng hết lượt trò chuyện với người dẫn đường hôm nay. Lượt mới mở vào đầu ngày mai; tin nhắn của bạn vẫn được giữ." : "You have used today's guide messages. New ones open at the start of tomorrow; your message is kept.")
            : unavailableReason === "offline"
              ? (language === "vi" ? "Đường truyền đang gián đoạn. Bạn kiểm tra kết nối Internet rồi bấm Thử lại; tin nhắn của bạn vẫn được giữ." : "The connection is interrupted. Check your Internet, then tap Retry; your message is kept.")
              : unavailableReason === "busy"
                ? (language === "vi" ? "Người dẫn đường chưa trả lời được lúc này. Bạn thử lại sau ít phút; tin nhắn của bạn vẫn được giữ." : "The guide cannot answer right now. Try again in a few minutes; your message is kept.")
                : unavailableReason === "auth"
                  ? (language === "vi" ? "Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại rồi thử lại nhé." : "Your sign-in has expired. Sign in again, then retry.")
                  : c.chatError);
        finishGenerationActivity(activity, "failed");
        recordEvent("persona_message_failed", { personaId: selectedPersonaId, reason: unavailableReason ?? (error instanceof BackendLimitError ? error.code : "error") });
        recordSafetyEvent({
          feature: "chat",
          sourceId: selectedPersonaId,
          reason: "generation_failure",
          summary: summarizeForSafety(`persona=${selectedPersonaId}; promptLength=${text.length}; risky=${containsRiskyRequest(text)}`)
        }, false);
      } finally {
        setChatGenerating(false);
      }
    }, 650);
  };

  const retryChat = () => {
    if (!lastChatPrompt || chatGenerating) return;
    sendMessage(lastChatPrompt, true);
  };

  const completeOnboarding = async (skippedProfile = false) => {
    if (onboardingSaving.current || !scope.active) return;
    onboardingSaving.current = true;
    setCreatingProfile(true);
    setOnboardingError("");
    try {
      const nextProfile = await persistOnboarding(profile, next => storage.saveJsonOrThrow("nilaza.profile", next), () => scope.active);
      setProfile(nextProfile);
      setScreen("home");
      recordEvent("onboarding_completed", { language, goals: nextProfile.goals.length, skippedProfile });
    } catch {
      if (scope.active) setOnboardingError(brandCopy(language).saveError);
    } finally {
      onboardingSaving.current = false;
      if (scope.active) setCreatingProfile(false);
    }
  };

  const drawCards = (preselectedCards?: DrawnTarotCard[], retryReading?: ReturnType<typeof drawReading>) => {
    if (tarotGenerating || tarotGenerationInFlight.current) return;
    if (isOwnerPreviewActive) {
      setTarotError(language === "vi"
        ? "Đang xem thử bậc tài khoản. Chưa tạo reading, trừ lượt hay gửi câu hỏi tới AI."
        : "Account tier preview is active. No reading, credit deduction, or AI request was made.");
      showToast(language === "vi"
        ? "Đang xem thử giao diện; lượt trải bài AI đang tạm dừng."
        : "UI preview is active; AI readings are paused.");
      return;
    }
    if (!canViewContentTier(selectedDeck.accessTier, displayedTier)) {
      setTarotError(c.premiumDeckPreview);
      recordEvent("premium_deck_preview", { deckId: selectedDeck.id, accessTier: selectedDeck.accessTier });
      showToast(c.upgradePreview);
      return;
    }
    if (creditBalance <= 0 && !retryReading) {
      setTarotError(c.creditLimitReached);
      recordEvent("tarot_credit_limit_preview", { dateKey: currentDateKey, limit: dailyTarotCreditLimit });
      showToast(c.creditLimitReached);
      return;
    }
    tarotGenerationInFlight.current = true;
    setTarotGenerating(true);
    setTarotError("");
    const activity = beginGenerationActivity({
      feature: "tarot_reading",
      title: { vi: "Trải bài đang được diễn giải", en: "Your reading is being interpreted" },
      detail: { vi: "Bạn có thể tiếp tục khám phá", en: "You can keep exploring" },
      targetRoute: "tarot"
    });
    const correlation = createAnswerAttempt("tarot_reading", language === "en" ? "en" : "vi", retryReading?.provenance?.interactionId);
    const activeScope = scope;
    setTimeout(async () => {
      if (!activeScope.active) return;
      try {
        const selectedCards = preselectedCards?.length
          ? preselectedCards
          : selectTarotCards(tarotSpread, language);
        const interpretation = await generateTarotReading(
          {
            language,
            deck: selectedDeck,
            topic: tarotTopic,
            spread: tarotSpread,
            question: tarotQuestion,
            selectedCards
          },
          () => buildLocalTarotInterpretation(selectedDeck, tarotTopic, tarotSpread, tarotQuestion, language, selectedCards),
          backendOptions,
          correlation
        );
        if (backendOptions.session?.active === false) return;
        const generated = buildTarotReadingResult(selectedDeck, tarotTopic, tarotSpread, tarotQuestion, selectedCards, interpretation, language);
        const nextReading = retryReading ? { ...generated, id: retryReading.id, createdAt: retryReading.createdAt } : generated;
        setReading(nextReading);
        if (!retryReading) setTarotStageHistory((currentHistory) => [...currentHistory, tarotStage].slice(-16));
        setTarotStage("result");
        recordEvent(retryReading ? "tarot_interpretation_retried" : "tarot_reading_drawn", {
          deckId: selectedDeck.id,
          topic: tarotTopic,
          spread: tarotSpread,
          backend: Boolean(nilazaBackendBaseUrl),
          moderationStatus: interpretation.moderationStatus
        });
        completeDailyRitual("tarot_reading");
        finishGenerationActivity(activity, "ready");
      } catch (error) {
        if (!activeScope.active) return;
        const limit = error instanceof BackendLimitError ? error.code : undefined;
        const message = limit === "daily_limit_reached" ? c.creditLimitReached
          : limit === "feature_paused" ? (language === "vi" ? "Diễn giải Tarot bằng AI đang tạm nghỉ một chút. Lượt của bạn vẫn còn, hãy thử lại sau." : "Tarot AI readings are resting for a while. Your turn is kept; please try again later.")
          : c.tarotError;
        setTarotError(message);
        if (limit) showToast(message);
        finishGenerationActivity(activity, "failed");
        recordEvent("tarot_reading_failed", { deckId: selectedDeck.id, topic: tarotTopic, spread: tarotSpread });
        recordSafetyEvent({
          feature: "tarot",
          sourceId: selectedDeck.id,
          reason: "generation_failure",
          summary: summarizeForSafety(`${selectedDeck.id} / ${tarotTopic} / ${tarotSpread}`)
        }, false);
      } finally {
        if (!activeScope.active) return;
        tarotGenerationInFlight.current = false;
        setTarotGenerating(false);
      }
    }, 700);
  };

  const createShareArtifact = () => {
    if (!reading) {
      showToast(language === "vi" ? "Hãy hoàn tất một lượt trải bài trước." : "Complete a reading first.");
      return;
    }

    const spreadLabel = localizedText(spreads.find((spread) => spread.id === reading.spread), language, reading.spread);
    const shareCards = reading.selected.map((card, index) => ({
      id: card.id,
      title: displayTarotCardName(card, language),
      spread: card.spread,
      orientation: card.reversed ? "reversed" : "upright",
      position: index + 1,
      imageKey: `${reading.deck.id}/${card.id}`
    }));
    const payload = {
      title: localizedText(reading.deck.name, language),
      deckId: reading.deck.id,
      spread: spreadLabel,
      topic: localizedText(topics.find((topic) => topic.id === reading.topic), language, reading.topic),
      cardTitle: shareCards.map((card) => card.title).join(" / "),
      cards: shareCards,
      synthesis: reading.summary,
      reflectionPrompt: reading.reflection,
      createdAt: reading.createdAt,
      privateNoteIncluded: false
    };
    const artifact: GeneratedArtifact = {
      id: nowId(),
      sourceType: "tarot_reading",
      sourceId: reading.id,
      artifactType: "share_card",
      templateKey: "daily_reading_card",
      payload,
      visibility: "private",
      createdAt: new Date().toISOString()
    };

    setGeneratedArtifacts((current) => [artifact, ...current].slice(0, 40));
    setTarotStageHistory((currentHistory) => [...currentHistory, tarotStage].slice(-16));
    setTarotStage("share");
    recordEvent("share_card_created", { sourceId: reading.id, artifactType: artifact.artifactType });
    // Analysis TA-11: preview first; the share sheet opens only from the preview's Share button.
    showToast(c.sharePreviewReady);
  };

  const councilRoomProps = useAiCouncilRoom({
    backendAvailable: Boolean(scope.accessToken && supabaseUrl),
    backendOptions,
    storage,
    accountReady: loaded,
    config: aiCouncilConfig,
    getPersonaThumbnail,
    language,
    onFeedback: showToast,
    onGenerationFinished: finishGenerationActivity,
    onGenerationStarted: () => beginGenerationActivity({
      feature: "ai_council",
      title: { vi: "AI Council đang thảo luận", en: "AI Council is discussing" },
      detail: { vi: "Bạn có thể tiếp tục khám phá", en: "You can keep exploring" },
      targetRoute: "chat",
      targetMode: "council"
    }),
    onSave: saveJournal,
    onTrack: recordEvent,
    personas,
    personasById,
    profile,
    canUsePersona: (persona) => canViewContentTier(persona.accessTier, displayedTier)
  }).roomProps;
  const latestCouncilSession = councilRoomProps.sessionSummaries[0];
  const recentConversations = useMemo(
    () => buildRecentConversations(messages, oracleTurns, councilRoomProps.sessionSummaries, language),
    [councilRoomProps.sessionSummaries, language, messages, oracleTurns]
  );
  const openAiCouncilRoom = () => openChat("council");
  const openAiCouncilHub = () => openChat("councilHub");

  const navigationScrollEligible = adaptiveLayout.navMode === "bottom" && ["home", "explore", "journal", "profile"].includes(screen);
  const updateNavigationChrome = (next: NavigationChrome) => {
    navigationChromeRef.current = next;
    setNavigationChrome(next);
  };
  const scheduleNavigationRestore = () => {
    if (navigationIdleTimerRef.current) clearTimeout(navigationIdleTimerRef.current);
    if (!navigationScrollEligible) return;
    navigationIdleTimerRef.current = setTimeout(() => {
      compactNavigationStartRef.current = -1;
      updateNavigationChrome("expanded");
    }, 1200);
  };
  const handleMainScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextScrollY = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = nextScrollY - lastContentScrollYRef.current;
    lastContentScrollYRef.current = nextScrollY;
    setScrollBand(scrollBandFor(nextScrollY));
    if (!navigationScrollEligible) return;
    if (navigationIdleTimerRef.current) clearTimeout(navigationIdleTimerRef.current);
    // Labels stay visible: the bar never shrinks to icons only, and it slides away only after a long scroll down.
    if (delta > 6 && nextScrollY > 48) {
      if (navigationChromeRef.current === "expanded") {
        if (compactNavigationStartRef.current < 0) compactNavigationStartRef.current = nextScrollY;
        else if (nextScrollY - compactNavigationStartRef.current > 160) updateNavigationChrome("hidden");
      }
    } else if (delta < -6) {
      compactNavigationStartRef.current = -1;
      updateNavigationChrome("expanded");
    }
  };

  useEffect(() => () => {
    if (navigationIdleTimerRef.current) clearTimeout(navigationIdleTimerRef.current);
  }, []);
  useEffect(() => {
    lastContentScrollYRef.current = 0;
    compactNavigationStartRef.current = -1;
    updateNavigationChrome("expanded");
  }, [chatMode, screen]);

  const openRecentConversation = (conversation: RecentConversation) => {
    setChatHandoffContext(undefined);
    if (conversation.kind === "oracle") {
      setChatMode("oracle");
    } else if (conversation.kind === "persona" && conversation.personaId && conversation.sessionId) {
      setSelectedPersonaId(conversation.personaId);
      setActivePersonaSessionIds((current) => ({ ...current, [conversation.personaId!]: conversation.sessionId! }));
      setChatMode("room");
    } else if (conversation.kind === "council" && conversation.sessionId) {
      councilRoomProps.onResumeSession(conversation.sessionId);
      setChatMode("council");
    }
    navigate("chat");
    recordEvent("recent_conversation_opened", { kind: conversation.kind });
  };

  if (deletingLocalData !== "idle") {
    return (
      <ScreenShell>
        <Text style={{ color: colors.ivory, padding: 20 }}>
          {deletingLocalData === "pending"
            ? (language === "vi" ? "Đang xóa dữ liệu của tài khoản này trên máy…" : "Clearing this account's local data…")
            : (language === "vi" ? "Chưa xóa được dữ liệu trên máy. Vui lòng thử lại; dữ liệu cloud chưa thay đổi." : "Local deletion failed. Retry; cloud data is unchanged.")}
        </Text>
        {deletingLocalData === "failed" && <SecondaryButton label={language === "vi" ? "Thử xóa lại" : "Retry deletion"} onPress={clearAllLocalAccountData} />}
      </ScreenShell>
    );
  }

  if (hydrationFailed) {
    return (
      <ScreenShell>
        <Text style={{ color: colors.ivory, padding: 20 }}>
          {language === "vi" ? "Chưa đọc được dữ liệu trên máy. Dữ liệu cũ chưa bị ghi đè." : "Local data could not be read. Existing data has not been overwritten."}
        </Text>
        <SecondaryButton label={language === "vi" ? "Thử lại" : "Retry"} onPress={() => setLoadAttempt(value => value + 1)} />
        <SecondaryButton label={language === "vi" ? "Đăng xuất" : "Sign out"} onPress={signOutLocally} />
      </ScreenShell>
    );
  }

  if (!loaded || !fontsReady) {
    return (
      <ScreenShell>
        <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
        <RitualLoading label={language === "vi" ? "Đang chuẩn bị khoảnh khắc phản chiếu..." : "Preparing your reflection..."} />
      </ScreenShell>
    );
  }

  if (authState.status === "signed_out") {
    if (guestPreview) {
      const leavePreview = (view: AuthView) => { setGuestPreview(false); setAuthView(view); };
      return <GuestPreviewScreen language={language} onCreateAccount={() => leavePreview("sign-up")} onSignIn={() => leavePreview("sign-in")} onExit={() => leavePreview("welcome")} />;
    }
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
        <AuthFlow
          language={language}
          onLanguageChange={(nextLanguage) => setProfile((current) => ({ ...current, language: nextLanguage }))}
          onSignIn={signInLocally}
          onSignUp={signUpLocally}
          onResendConfirmation={resendSignupConfirmation}
          onForgotPassword={resetPasswordLocally}
          onViewChange={setAuthView}
          onPreview={guestEntryEnabled ? () => setGuestPreview(true) : undefined}
          view={authView}
        />
      </>
    );
  }

  if (!profile.onboarded) {
    const onboardingSign = getApproximateSunSign(birthDate);
    return <GoalsScreen language={language} choices={goals.map(goal => ({ id: goal.id, label: localizedText(goal, language) }))} selected={profile.goals} saving={creatingProfile} error={onboardingError} onToggle={toggleGoal} onContinue={continueFromGoals} onSkip={skipOnboardingProfile}
      birthDate={birthDate} onBirthDateChange={(value) => setBirthDate(value)}
      sign={onboardingSign ? { id: onboardingSign.toLowerCase(), label: localizeAstrologySign(onboardingSign.toLowerCase() as AstrologySignId, language) } : undefined} />;
  }

  const chatScreen = screen === "chat" ? (
    chatMode === "oracle" ? (
      <OracleRoom
        aiEnabled={Boolean(nilazaBackendBaseUrl && backendOptions.authToken)}
        error={oracleError}
        generating={oracleGenerating}
        input={oracleInput}
        language={language}
        memoryAllowed={oracleMemoryConsent.journalMemory}
        onAction={handleOracleAction}
        onChangeInput={setOracleInput}
        onNew={() => requestConfirmation({
          // Oracle mới asks first, like a new guide chat (analysis OR-03).
          title: language === "vi" ? "Bắt đầu lượt Oracle mới?" : "Start a new Oracle chat?",
          body: language === "vi" ? "Các gợi ý hiện tại sẽ được xóa khỏi màn hình này." : "The current suggestions will be cleared from this screen.",
          confirmLabel: language === "vi" ? "Bắt đầu mới" : "Start new",
          tone: "danger",
          onConfirm: () => confirmDestructiveAction(() => {
            setOracleTurns([]);
            setOracleInput("");
            setOracleError("");
            recordEvent("oracle_session_started");
          })
        })}
        onReport={reportLatestOracleReply}
        onSaveLast={saveLatestOracleInsight}
        onSend={sendOracleMessage}
        onToggleMemory={() => setOracleMemoryConsent((current) => ({ ...current, journalMemory: !current.journalMemory }))}
        turns={oracleTurns}
      />
    ) : (
      <ChatScreen
      c={c}
      chatError={chatError}
      chatGenerating={chatGenerating}
      chatInput={chatInput}
      councilRoomProps={isOwnerPreviewActive
        ? {
            ...councilRoomProps,
            onSend: () => showToast(language === "vi"
              ? "Bạn đang xem thử giao diện bậc tài khoản. Lượt gửi AI đang tạm dừng trong chế độ này."
              : "You are previewing an account tier. AI requests are paused in this view.")
          }
        : { ...councilRoomProps, onReportTurn: (turnId: string) => setFeedbackTarget({ feature: "ai_council", localAnswerId: turnId, sectionIds: [], language: language === "vi" ? "vi" : "en" }) }}
      favoritePersonaIds={favoritePersonaIds}
      handoffContext={chatHandoffContext}
      backendOptions={backendOptions}
      mode={chatMode}
      currentMessages={currentMessages}
      activePersonaSessionId={activePersonaSessionId}
      language={language}
      recentConversations={recentConversations}
      personaSessionSummaries={personaSessionSummaries}
      profile={profile}
      selectedPersona={selectedPersona}
      selectedPersonaId={selectedPersonaId}
      displayedTier={displayedTier}
      setMode={setChatMode}
      setChatInput={setChatInput}
      setSelectedPersonaId={setSelectedPersonaId}
      showCompactTitle={scrollBand === 2}
      onFeedback={showToast}
      onClearHandoff={() => setChatHandoffContext(undefined)}
      onNewChat={startFreshPersonaChat}
      onOpenRecentConversation={openRecentConversation}
      onResumePersonaSession={resumePersonaSession}
      onStartPersonaSession={startPersonaSession}
      onToggleFavoritePersona={toggleFavoritePersona}
      onReport={(summary, sourceId) => {
        recordSafetyEvent({
          feature: "chat",
          sourceId,
          reason: "user_report",
          summary: summarizeForSafety(`persona=${selectedPersonaId}; answerLength=${summary.length}`)
        }, false);
        // The report itself goes to the server through the shared feedback panel (analysis CH-02).
        if (sourceId) setFeedbackTarget({ feature: "persona_chat", localAnswerId: sourceId, sectionIds: [], language: language === "vi" ? "vi" : "en" });
      }}
      onRetry={chatErrorRetryable ? retryChat : undefined}
      onSave={saveJournal}
      onSend={(text?: string) => sendMessage(text)}
      onTrack={recordEvent}
      />
    )
  ) : null;

  const visibleSyncFailureArea: PersonalSyncArea | null =
    screen === "journal" && (syncFailures.journal || journalMutationSyncFailed)
      ? "journal"
      : screen === "chat" &&
          (chatMode === "list" || chatMode === "detail") &&
          syncFailures.chat
        ? "chat"
        : null;
  const showNavigation = screen !== "tarot" && !(screen === "chat" && (chatMode === "room" || chatMode === "council"));
  const showOracleLauncher = showNavigation && !hasDedicatedGenerationSurface && screen !== "home" && screen !== "explore" && !(screen === "journal" && journalComposing);
  const navigation = (
    <AdaptiveNavigation
      items={tabs.map(item => ({ id: item, icon: tabIcon(item), label: tabLabel(item, language) }))}
      selected={screen === "inbox" ? "home" : screen}
      mode={adaptiveLayout.navMode}
      chrome={navigationChrome}
      onSelect={item => {
        if (item === "chat") {
          setChatMode("list");
          setChatHandoffContext(undefined);
        }
        navigate(item);
      }}
    />
  );

  return (
    <AdaptiveScaffold layout={adaptiveLayout} navigation={navigation} showNavigation={showNavigation}>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
      {isOwnerPreviewActive ? (
        <View style={styles.ownerPreviewBanner} accessibilityLiveRegion="polite">
          <View style={styles.ownerPreviewBannerCopy}>
            <Text style={styles.ownerPreviewBannerTitle}>
              {language === "vi"
                ? `Đang xem thử ${displayedTier === "premium" ? "Premium" : "Free"}`
                : `Previewing ${displayedTier === "premium" ? "Premium" : "Free"}`}
            </Text>
            <Text style={styles.ownerPreviewBannerBody}>
              {language === "vi"
                ? "Chỉ đổi giao diện; không tạo quyền hay lượt mới. Yêu cầu AI đã gửi trước đó vẫn có thể hoàn tất."
                : "UI only; no access or usage is added. AI requests sent earlier may still finish."}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setOwnerTierPreview("account")}
            style={styles.ownerPreviewExit}
          >
            <Text style={styles.ownerPreviewExitText}>{language === "vi" ? "Thoát" : "Exit"}</Text>
          </Pressable>
        </View>
      ) : null}
      {(visibleSyncFailureArea || storageError) && (
        <View style={{ paddingHorizontal: adaptiveLayout.gutter, paddingVertical: 8 }}>
          <Text accessibilityRole="alert" style={{ color: colors.ivory }}>
            {storageError
              ? (language === "vi" ? "Chưa lưu được trên máy. Đừng đóng ứng dụng trước khi thử lại." : "Local save failed. Retry before closing the app.")
              : (language === "vi"
                ? `Chưa đồng bộ được ${visibleSyncFailureArea === "journal" ? "Nhật ký" : "lịch sử trò chuyện"}. Bạn đang xem bản lưu trên máy.`
                : `Unable to sync ${visibleSyncFailureArea === "journal" ? "Journal" : "conversation history"}. Showing your local copy.`)}
          </Text>
          <SecondaryButton label={storageError
            ? (language === "vi" ? "Thử lưu lại" : "Retry save")
            : (language === "vi" ? "Thử đồng bộ lại" : "Retry sync")} onPress={() => {
            if (storageError) void storage.retryFailed().then(saved => setStorageError(!saved));
            else setSyncAttempt(value => value + 1);
          }} />
        </View>
      )}
      {journalLocalWriteFailed ? <View style={{ paddingHorizontal: adaptiveLayout.gutter, paddingVertical: 8 }}>
        <Text accessibilityRole="alert" style={{ color: colors.ivory }}>{language === "vi"
          ? "Thay đổi Nhật ký chưa được lưu. Hãy giữ nội dung và bấm Lưu lại ở màn hình vừa sử dụng, hoặc thử xoá lại."
          : "Journal changes were not saved. Keep your draft and save again on the original screen, or retry the deletion."}</Text>
      </View> : null}
      {screen === "journal" && journalPendingCount > 0 ? (
        <View style={{ paddingHorizontal: adaptiveLayout.gutter, paddingVertical: 8 }}>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.ivory }}>
            {scope.accessToken
              ? language === "vi" ? `${journalPendingCount} thay đổi đã lưu trên máy, đang chờ đồng bộ.` : `${journalPendingCount} changes saved on this device, sync pending.`
              : language === "vi" ? "Nhật ký đang được lưu trên thiết bị này." : "Journal is saved on this device."}
          </Text>
        </View>
      ) : null}
      <View style={styles.appShell}>
        <FadeInView key={screen} style={[styles.surfaceShell, { maxWidth: screen === "profile" || screen === "journal" || (screen === "chat" && chatMode === "detail") ? adaptiveLayout.focusedContentMaxWidth : adaptiveLayout.contentMaxWidth }]}>
        {screen === "chat" && (chatMode === "oracle" || chatMode === "room" || chatMode === "council") ? (
          chatScreen
        ) : screen === "tarot" ? (
          <TarotFlow
            c={c}
            learnedCardIds={learnedCardIds}
            onCardLearned={markCardLearned}
            language={language}
            reading={reading}
            selectedDeck={selectedDeck}
            displayedTier={displayedTier}
            tarotCreditBalance={creditBalance}
            selectedDeckId={selectedDeckId}
            setSelectedDeckId={(id) => setSelectedDeckId(id)}
            setStage={goToTarotStage}
            stage={tarotStage}
            tarotError={tarotError}
            tarotGenerating={tarotGenerating}
            tarotQuestion={tarotQuestion}
            tarotSpread={tarotSpread}
            tarotTopic={tarotTopic}
            generatedArtifacts={generatedArtifacts}
            selectedTarotCardId={selectedTarotCardId}
            selectedTarotGuideId={selectedTarotGuideId}
            setSelectedTarotCardId={setSelectedTarotCardId}
            setSelectedTarotGuideId={setSelectedTarotGuideId}
            onBack={handleTarotBack}
            onStartOver={requestTarotStartOver}
            onAskFollowUp={startTarotFollowup}
            onChatWithCard={startTarotCardChat}
            onCreateShareArtifact={createShareArtifact}
            onOpenShare={openShareSheet}
            onDraw={drawCards}
            onRetryInterpretation={nilazaBackendBaseUrl && backendOptions.authToken ? () => {
              if (reading && tarotResultSource(reading.moderationStatus) === "reference") drawCards(reading.selected, reading);
            } : undefined}
            onQuestionChange={(text) => setTarotQuestion(text)}
            keepSelectedDeck={tarotKeepSelectedDeck}
            intentionReviewed={tarotIntentionReviewed}
            onKeepSelectedDeckChange={setTarotKeepSelectedDeck}
            onReportReading={() => {
              if (!reading) return;
              const locale = reading.language === "en" ? "en" : "vi";
              setFeedbackTarget({ feature: "tarot_reading", localAnswerId: reading.provenance?.clientRequestId ?? reading.id,
                provenance: reading.provenance, language: locale, sectionIds: ["summary", "reflection", ...reading.sections.map(section => section.key)],
                sectionLabels: { summary: locale === "vi" ? "Thông điệp tổng hợp" : "Overall message", reflection: locale === "vi" ? "Câu hỏi phản chiếu" : "Reflection question", ...Object.fromEntries(reading.sections.map(section => [section.key, section.title[locale] || section.title.en])) },
              });
            }}
            onSave={saveJournal}
            onWriteJournal={(prompt) => { setJournalPrompt(prompt); setJournalEntryToOpen(null); navigate("journal"); }}
            onSpreadChange={(spread) => setTarotSpread(spread)}
            onTopicChange={(topic) => setTarotTopic(topic)}
          />
        ) : screen === "astrology" ? (
          <AstrologyExperience key={scope.key} language={language} storage={storage} accountReady={loaded}
            onReportAnswer={setFeedbackTarget}
            onOpenShare={openShareSheet}
            ownerPremiumPreview={isOwnerPreviewActive && displayedTier === "premium"}
            canRequestAstrologyAi={Boolean(backendOptions.authToken) && displayedTier === "premium" && !isOwnerPreviewActive}
            aiSignInRequired={!backendOptions.authToken}
            onRequestSignIn={isSupabaseAuthConfigured ? () => { setAuthView("sign-in"); signOutLocally(); } : undefined}
            requestAstrologyAi={(input, correlation) => requestAstrologyAiInsight(input, backendOptions, correlation)}
            onDeleteAiReport={backendOptions.authToken ? (chartId) => deleteAstrologyAiReportForChart(backendOptions, chartId) : undefined}
            onDiscuss={(report) => {
              const guide = personas.find(persona => persona.slug === "the-astrologer") ?? selectedPersona;
              openChat("room", guide.id, buildSafeAstrologyContext(report, language));
            }}
            onSaveToJournal={(entry) => {
              if (!scope.active) return;
              void saveJournal({ ...entry, sourceType: "astrology", syncStatus: "local" });
            }}
            initialBirth={{date:birthDate,time:birthTime,place:birthPlace,unknown:birthTimeUnknown}}
            onBack={() => navigate("explore")} />
        ) : (
          <ScrollView
            testID="main-screen-scroll"
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={[styles.screen, { paddingHorizontal: adaptiveLayout.gutter }, showOracleLauncher && styles.screenWithOracleLauncher]}
            keyboardShouldPersistTaps="handled"
            onScroll={handleMainScroll}
            onMomentumScrollEnd={scheduleNavigationRestore}
            onScrollEndDrag={scheduleNavigationRestore}
            scrollEventThrottle={16}
          >
            {screen === "home" && (
              <HomeScreen
                c={c}
                dailyReminderOn={dailyReminder.enabled}
                onOpenReminder={() => setScreen("profile")}
                dailyInsight={effectiveDailyInsight}
                journalEntries={journalEntries}
                language={language}
                profile={profile}
                currentDateKey={currentDateKey}
                currentTime={currentTime}
                selectedDeck={selectedDeck}
                todayPulse={todayPulse}
                todayPulseRevealed={todayPulseRevealed}
                zodiacPulse={zodiacPulse}
                unreadNotificationCount={unreadNotificationCount}
                councilPersonas={councilRoomProps.personas}
                councilSession={latestCouncilSession}
                onAiCouncil={openAiCouncilRoom}
                onAsk={openOracleWithQuestion}
                onAskDeeperToday={() => startTarotCardChat(todayPulse.card, selectedDeck)}
                onGoalSuggestion={startTarotForTopic}
                onJournal={() => { setJournalEntryToOpen(null); navigate("journal"); }}
                onOpenRecent={(id) => navigate("journal", id)}
                onNotifications={() => navigate("inbox")}
                onMoodCheck={saveMoodCheck}
                onRevealTodayCard={revealTodayPulseCard}
                onRerollDaily={previewDailyReroll}
                onSaveTodayCard={saveTodayPulseCard}
                todayNote={todayNote}
                onTodayNoteChange={setTodayNote}
                onShareTodayCard={shareTodayPulseCard}
                onWritePrompt={(prompt) => { setJournalPrompt(prompt); setJournalEntryToOpen(null); navigate("journal"); }}
                onAstrology={() => startAstrology("hub")}
              />
            )}

            {screen === "explore" && (
              <ExploreHome
                language={language}
                deckCount={decks.length}
                onTarot={() => startTarot("topic")}
                onLibrary={() => startTarot("library")}
                onAstrology={() => startAstrology("hub")}
                onAllDecks={() => startTarot("deck")}
                decks={[
                  { id: "rose-mirror", mood: language === "vi" ? "Tình yêu" : "Love" },
                  { id: "moon-garden", mood: language === "vi" ? "Chữa lành" : "Healing" },
                  { id: "golden-thread", mood: language === "vi" ? "Quyết định" : "Decisions" }
                ].flatMap(({ id, mood }) => {
                  const deck = decksById[id];
                  return deck ? [{
                    mood,
                    deckName: localizedText(deck.name, language),
                    image: getDeckThumbnailImage(deck.id),
                    onPress: () => {
                      setSelectedDeckId(deck.id);
                      startTarot("deckDetail");
                    }
                  }] : [];
                })}
                guides={[
                  // The design suggests the inner-child guide when no goal points elsewhere.
                  ...[recommendedPersonasForProfile(profile)[0] ?? personasById["archetype-inner-child-healer"]].filter((persona): persona is Persona => Boolean(persona)).map((persona) => ({
                    key: persona.id,
                    title: personaShortName(persona, language),
                    detail: personaTagline(persona, language),
                    thumbnails: [getPersonaThumbnail(persona)],
                    onPress: () => openChat("detail", persona.id)
                  })),
                  {
                    key: "council",
                    title: language === "vi" ? "Hội đồng 3 góc nhìn" : "Three-view council",
                    detail: language === "vi" ? "Ba người dẫn cùng soi một quyết định" : "Three guides look at one decision",
                    thumbnails: councilRoomProps.personas.slice(0, 3).map((persona) => getPersonaThumbnail(persona)),
                    onPress: openAiCouncilRoom
                  }
                ]}
                onAllGuides={() => openChat("list")}
              />
            )}

            {screen === "inbox" && (
              <InboxScreen
                language={language}
                notifications={inAppNotifications}
                onBack={() => navigate("home")}
                onDismiss={dismissNotification}
                onRestore={restoreNotification}
                onMarkAllRead={markAllNotificationsRead}
                onMarkRead={markNotificationRead}
                onOpen={openNotification}
              />
            )}

            {screen === "chat" && chatScreen}

            {screen === "journal" && (
              <JournalScreen
                c={c}
                onComposingChange={setJournalComposing}
                composePrompt={journalPrompt}
                onComposeDone={() => setJournalPrompt(null)}
                entries={hiddenJournalId ? journalEntries.filter((entry) => entry.id !== hiddenJournalId) : journalEntries}
                initialSelectedEntryId={journalEntryToOpen}
                journalMemory={journalMemory}
                draftStore={journalDraftStore}
                language={language}
                onChat={() => openChat("oracle")}
                onDelete={requestJournalDelete}
                onTarot={() => startTarot("topic")}
                onOpenSource={reopenJournalSource}
                canOpenSource={(entry) => {
                  const type = entry.sourceSnapshot?.type;
                  return type === "tarot_reading" || (type === "chat_message" && messages.some(item => item.id === entry.sourceId))
                    || ((type === "oracle_turn" || type === "oracle_handoff") && oracleTurns.some(item => item.id === entry.sourceId));
                }}
                onCreateNote={(draft) => saveJournal({ ...draft, sourceType: "manual", sourceId: nowId(), sourceSnapshot: { type: "manual_note" } })}
                onUpdate={updateJournalEntry}
              />
            )}

            {screen === "profile" && !(showAdmin && isAdmin) && (
              <ProfileScreen
                c={c}
                signLabel={zodiacPulse.hasBirthDate ? zodiacPulse.sign : undefined}
                memberSince={authState.status === "signed_in" && authState.user.createdAt
                  ? new Date(authState.user.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : undefined}
                readingsCount={journalEntries.filter((entry) => entry.sourceType === "tarot").length}
                dailyReminder={dailyReminder}
                onDailyReminderChange={(next) => { void changeDailyReminder(next); }}
                onDeleteAccount={async () => {
                  const failure = await requestAccountDeletion(backendOptions);
                  if (failure) {
                    return language === "vi"
                      ? "Chưa xóa được tài khoản. Hãy thử lại sau hoặc liên hệ hỗ trợ."
                      : "Your account could not be deleted yet. Try again later or contact support.";
                  }
                  await clearAllLocalAccountData();
                  signOutLocally();
                  return null;
                }}
                birthDate={birthDate}
                birthPlace={birthPlace}
                birthTime={birthTime}
                birthTimeUnknown={birthTimeUnknown}
                chatCount={messages.length}
                chatTurnsToday={chatTurnsToday}
                creditBalance={creditBalance}
                dailyCreditLimit={dailyTarotCreditLimit}
                artifactCount={generatedArtifacts.filter((artifact) => artifact.visibility !== "deleted").length}
                journalCount={journalEntries.length}
                language={language}
                profile={profile}
                devicePushRegistration={devicePushRegistration}
                inAppNotifications={inAppNotifications}
                notificationPreferences={notificationPreferences}
                unreadNotificationCount={unreadNotificationCount}
                tarotReadingsToday={tarotReadingsToday}
                isAdmin={isAdmin}
                isOwner={isOwner}
                ownerTierPreview={ownerTierPreview}
                onOwnerTierPreviewChange={(next) => {
                  if (isOwner) setOwnerTierPreview(next);
                }}
                contentBundleVersion={contentBundleVersion}
                onlineSyncAvailable={Boolean(scope.userId && nilazaBackendBaseUrl)}
                setBirthDate={(text) => setBirthDate(text)}
                setBirthPlace={(text) => setBirthPlace(text)}
                setBirthTime={(value) => {
                  setBirthTime(value);
                  setBirthTimeUnknown(false);
                }}
                setProfile={setProfile}
                onAdmin={() => {
                  if (!scope.userId || !scope.active) return;
                  void getAdminAccess(backendOptions).then(access => {
                    if (!scope.active) return;
                    const owner = access.roles.includes("owner");
                    setIsAdmin(access.capabilities.includes("hub.read"));
                    setIsOwner(owner);
                    if (!owner) setOwnerTierPreview("account");
                    setShowAdmin(access.capabilities.includes("hub.read"));
                  }).catch(() => {
                    setIsAdmin(false);
                    setIsOwner(false);
                    setOwnerTierPreview("account");
                    setShowAdmin(false);
                    showToast(language === "vi" ? "Chưa kiểm tra được quyền quản trị" : "Could not verify admin access");
                  });
                }}
                onClearBirthProfile={() => requestConfirmation({
                  title: language === "vi" ? "Xóa thông tin ngày sinh?" : "Clear birth details?",
                  body: language === "vi" ? "Ngày, giờ và nơi sinh sẽ bị xóa khỏi thiết bị này. Bạn vẫn có thể nhập lại sau." : "Birth date, time, and place will be removed from this device. You can add them again later.",
                  confirmLabel: c.clearBirthProfile,
                  tone: "danger",
                  onConfirm: () => confirmDestructiveAction(clearBirthProfile)
                })}
                onClearChats={() => requestConfirmation({
                  title: language === "vi" ? "Xóa lịch sử chat?" : "Clear chat history?",
                  body: language === "vi" ? "Tin nhắn lưu trên thiết bị này sẽ bị xóa. Tin nhắn đã đồng bộ với tài khoản có thể được tải lại ở lần đồng bộ sau." : "Messages stored on this device will be removed. Messages already synced to your account may load again on the next sync.",
                  confirmLabel: language === "vi" ? "Xóa chat" : "Clear chats",
                  tone: "danger",
                  onConfirm: () => confirmDestructiveAction(clearChatHistory)
                })}
                onClearJournal={() => requestConfirmation({
                  title: language === "vi" ? "Xóa Nhật ký?" : "Clear Journal?",
                  body: language === "vi" ? "Các mục Nhật ký và ghi chú sẽ bị xóa trên thiết bị; yêu cầu xóa cũng được gửi lên tài khoản khi có kết nối. Thẻ chia sẻ trên thiết bị cũng bị xóa." : "Saved insights and notes will be removed on this device; their deletion will also be sent to the cloud when connected. Device share cards will be removed.",
                  confirmLabel: language === "vi" ? "Xóa Nhật ký" : "Clear Journal",
                  tone: "danger",
                  onConfirm: () => confirmDestructiveAction(clearJournalHistory)
                })}
                onDeleteAccountData={() => requestConfirmation({
                  title: language === "vi" ? "Xóa dữ liệu trên thiết bị này?" : "Delete data on this device?",
                  body: language === "vi" ? "Hồ sơ, trò chuyện, Nhật ký và thông tin ngày sinh lưu trên thiết bị này sẽ bị xóa. Tài khoản và dữ liệu đã đồng bộ không bị xóa bằng thao tác này." : "Profile, chats, Journal and birth details stored on this device will be removed. Your account and synced data are not deleted by this action.",
                  confirmLabel: c.deleteAccountData,
                  tone: "danger",
                  onConfirm: () => confirmDestructiveAction(clearAllLocalAccountData)
                })}
                onExportData={() => requestConfirmation({
                  title: language === "vi" ? "Xuất dữ liệu riêng tư?" : "Export private data?",
                  body: language === "vi" ? "File JSON gồm nội dung đã lưu của tài khoản này trên thiết bị, có thể chứa ghi chú, trò chuyện và ngày sinh. Bản này chưa bao gồm dữ liệu chỉ có trên cloud. Hãy chọn nơi lưu riêng tư." : "The JSON file contains this account's saved device data, which may include notes, chats and birth details. It excludes data only on the cloud. Choose a private place to save it.",
                  confirmLabel: language === "vi" ? "Tạo file dữ liệu" : "Create data file",
                  tone: "default",
                  onConfirm: () => { setConfirmationDialog(null); void exportLocalData(); }
                })}
                onDismissNotification={dismissNotification}
                onOpenInbox={() => navigate("inbox")}
                onOpenNotification={openNotification}
                onEnablePush={enablePushNotifications}
                onMarkBirthTimeUnknown={markBirthTimeUnknown}
                onMarkNotificationRead={markNotificationRead}
                onSignOut={signOutLocally}
                onToggleNotificationPreference={updateNotificationPreference}
              />
            )}

            {screen === "profile" && showAdmin && isAdmin && (
              <OwnerHub
                options={backendOptions}
                consoleUrl={nilazaAdminUrl}
                onBack={() => setShowAdmin(false)}
              />
            )}
          </ScrollView>
        )}
        </FadeInView>

        {hiddenJournalId ? (
          <View style={[styles.toast, styles.undoToast]} accessibilityLiveRegion="polite">
            <Text style={[styles.toastText, styles.flex]}>{language === "vi" ? "Đã xóa mục Nhật ký." : "Journal entry deleted."}</Text>
            <Pressable accessibilityRole="button" onPress={undoJournalDelete} hitSlop={8} style={styles.undoButton}>
              <Text style={styles.undoText}>{language === "vi" ? "Hoàn tác" : "Undo"}</Text>
            </Pressable>
          </View>
        ) : toast ? (
          <View style={[styles.toast, screen === "chat" && chatMode === "detail" && styles.toastAbovePersonaCta]}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        {activeGenerationActivity && showGenerationBubble ? (
          <View style={styles.generationActivityDock}>
            <GenerationActivityBubble
              activity={activeGenerationActivity}
              language={language}
              onOpen={() => openGenerationActivity(activeGenerationActivity)}
            />
          </View>
        ) : null}

        {feedbackTarget ? <FeedbackPanel key={scope.key} target={feedbackTarget} storage={storage} scope={scope}
          ready={loaded && Boolean(backendOptions.authToken && backendOptions.baseUrl)}
          send={payload => submitAiFeedback(payload, backendOptions)} onClose={() => setFeedbackTarget(null)}
          onExportServer={backendOptions.authToken ? async () => {
            const exported = await exportAiFeedback(backendOptions);
            if (!scope.active) return;
            await deliverExport(JSON.stringify(exported, null, 2), `nilaza-data-${new Date().toISOString().replace(/:/g, "-")}.json`, () => scope.active);
          } : undefined}
          onDeleteServer={backendOptions.authToken ? () => deleteAllAiFeedback(backendOptions) : undefined}
        /> : null}
        <ConfirmationDialog
          dialog={confirmationDialog}
          onCancel={() => setConfirmationDialog(null)}
          onConfirm={() => confirmationDialog?.onConfirm()}
        />
        {shareSheet ? (
          <ShareCardSheet
            visible
            language={language}
            model={shareSheet.model}
            url={shareSheet.url}
            primary={shareSheet.primary}
            onClose={() => setShareSheet(null)}
            onEvent={recordShareEvent}
          />
        ) : null}

        {screen === "chat" && chatMode === "detail" ? (
          <Pressable
            accessibilityRole="button"
            style={[
              styles.personaFloatingCta,
              !canViewContentTier(selectedPersona.accessTier, displayedTier) && styles.personaFloatingCtaLocked
            ]}
            onPress={() => {
              if (!canViewContentTier(selectedPersona.accessTier, displayedTier)) {
                showToast(c.upgradePreview);
                return;
              }
              setChatMode("room");
            }}
          >
            <Text style={styles.personaFloatingCtaText}>
              {!canViewContentTier(selectedPersona.accessTier, displayedTier)
                ? c.upgrade
                : language === "vi"
                  ? (isOwnerPreviewActive ? "Xem trước chat" : "Bắt đầu chat")
                  : (isOwnerPreviewActive ? "Preview chat" : "Start chat")}
            </Text>
            <Ionicons
              name={!canViewContentTier(selectedPersona.accessTier, displayedTier) ? "sparkles-outline" : "arrow-forward-outline"}
              size={18}
              color={colors.charcoal}
            />
          </Pressable>
        ) : null}

        {/* Home has its own Ask field, Explore has an Oracle card and the Journal composer has its own Save, so the floating launcher would only repeat or cover them. */}
        {showOracleLauncher ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === "vi" ? "Hỏi Nilaza Oracle" : "Ask Nilaza Oracle"}
            onPress={() => openChat("oracle")}
            style={styles.oracleLauncher}
          >
            <Ionicons name="sparkles-outline" size={18} color={colors.charcoal} />
            <Text style={styles.oracleLauncherText}>Oracle</Text>
          </Pressable>
        ) : null}

      </View>
    </AdaptiveScaffold>
  );
}

function ConfirmationDialog({
  dialog,
  onCancel,
  onConfirm
}: {
  dialog: ConfirmationDialogState;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={Boolean(dialog)} onRequestClose={onCancel}>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmIcon}>
            <Ionicons name={dialog?.tone === "danger" ? "warning-outline" : "sparkles-outline"} size={22} color={dialog?.tone === "danger" ? colors.rose : colors.gold} />
          </View>
          <Text style={styles.confirmTitle}>{dialog?.title}</Text>
          <Text style={styles.confirmBody}>{dialog?.body}</Text>
          <View style={styles.confirmActions}>
            <Pressable accessibilityRole="button" style={styles.confirmCancel} onPress={onCancel}>
              <Text style={styles.confirmCancelText}>{dialog?.cancelLabel}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={[styles.confirmPrimary, dialog?.tone === "danger" && styles.confirmDanger]} onPress={onConfirm}>
              <Text style={[styles.confirmPrimaryText, dialog?.tone === "danger" && styles.confirmDangerText]}>{dialog?.confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function tabIcon(tab: Tab): any {
  return {
    home: "sunny-outline",
    explore: "compass-outline",
    chat: "chatbubble-outline",
    journal: "book-outline",
    profile: "person-outline"
  }[tab];
}

function tabLabel(tab: Tab, language: Language): string {
  const vi = language === "vi";
  return {
    home: vi ? "Hôm nay" : "Today",
    explore: vi ? "Khám phá" : "Explore",
    chat: vi ? "Trò chuyện" : "Chat",
    journal: vi ? "Nhật ký" : "Journal",
    profile: vi ? "Tôi" : "Me"
  }[tab];
}

function homeGreetingLabel(date: Date, language: Language, nickname: string) {
  const hour = date.getHours();
  const label =
    hour < 5
      ? language === "vi" ? "Chào buổi khuya" : "Good night"
      : hour < 11
        ? language === "vi" ? "Chào buổi sáng" : "Good morning"
        : hour < 14
          ? language === "vi" ? "Chào buổi trưa" : "Good afternoon"
          : hour < 18
            ? language === "vi" ? "Chào buổi chiều" : "Good afternoon"
            : language === "vi" ? "Chào buổi tối" : "Good evening";
  return `${label}, ${nickname}`;
}

const todayCardSourceId = (dateKey: string) => `today-card:${dateKey}`;

function HomeScreen({
  c,
  currentDateKey,
  currentTime,
  dailyInsight,
  journalEntries,
  language,
  profile,
  selectedDeck,
  todayPulse,
  todayPulseRevealed,
  unreadNotificationCount,
  zodiacPulse,
  councilPersonas,
  councilSession,
  onAiCouncil,
  onAsk,
  onAskDeeperToday,
  onAstrology,
  onGoalSuggestion,
  onJournal,
  onOpenRecent,
  onNotifications,
  onMoodCheck,
  onRevealTodayCard,
  onRerollDaily,
  onSaveTodayCard,
  todayNote,
  onTodayNoteChange,
  onShareTodayCard,
  onWritePrompt,
  dailyReminderOn,
  onOpenReminder
}: {
  c: Copy;
  currentDateKey: string;
  currentTime: Date;
  dailyInsight: DailyInsight;
  journalEntries: JournalEntry[];
  language: Language;
  profile: Profile;
  selectedDeck: TarotDeck;
  todayPulse: ReturnType<typeof buildTodayPulse>;
  todayPulseRevealed: boolean;
  unreadNotificationCount: number;
  zodiacPulse: ReturnType<typeof buildDailyZodiacPulse>;
  councilPersonas: Persona[];
  councilSession?: AiCouncilSessionSummary;
  onAiCouncil: () => void;
  onAsk: (text: string) => void;
  onAskDeeperToday: () => void;
  onAstrology: () => void;
  onGoalSuggestion: (topic: TarotTopic) => void;
  onJournal: () => void;
  onOpenRecent: (id: string) => void;
  onNotifications: () => void;
  onMoodCheck: (moodId: string) => void;
  onRevealTodayCard: () => void;
  onRerollDaily: () => void;
  onSaveTodayCard: () => void;
  todayNote: string;
  onTodayNoteChange: (value: string) => void;
  onShareTodayCard: () => void;
  onWritePrompt: (prompt: string) => void;
  dailyReminderOn: boolean;
  onOpenReminder: () => void;
}) {
  const card = todayPulse.card;
  const savedTodayEntry = journalEntries.find((entry) => entry.sourceType === "daily" && entry.sourceId === todayCardSourceId(currentDateKey));
  const cardSaved = Boolean(savedTodayEntry);
  const todayMood = journalEntries.find((entry) => !entry.sourceId && entry.sourceSnapshot?.type === "today_pulse" && entry.sourceSnapshot?.dateKey === currentDateKey)?.mood;
  const todayQuestion = localizedText(card.reflectionQuestion, language, todayPulse.reflectionPrompt);
  // Writing means words of the person's own today: a manual entry or a note on a saved entry.
  const wroteToday = journalEntries.some((entry) => isDateKey(entry.createdAt, currentDateKey) && (entry.sourceType === "manual" || Boolean(entry.userNote?.trim())));
  const nextStepId = homeNextStep({ revealed: todayPulseRevealed, wroteToday, reminderOn: dailyReminderOn, reminderSupported: Platform.OS !== "web" });
  const nextStep = nextStepId === "write" || nextStepId === "reminder"
    ? { ...homeNextStepCopy(nextStepId, language), onPress: nextStepId === "write" ? () => onWritePrompt(todayQuestion) : onOpenReminder }
    : undefined;
  return <HomeExperience cardBack={getDeckBackImage(selectedDeck.id)} language={language} greeting={homeGreetingLabel(currentTime, language, profile.nickname)} now={currentTime}
    revealed={todayPulseRevealed} streak={visibleStreak(profile.currentStreak, profile.lastActivityDate, currentDateKey)} onReveal={onRevealTodayCard} onAsk={onAsk} onAstrology={onAstrology} onGoalSuggestion={onGoalSuggestion}
    primaryGoal={profile.goals[0]} zodiac={{ hasBirthDate: zodiacPulse.hasBirthDate, sign: zodiacPulse.sign ?? "", signId: zodiacPulse.signId, line: zodiacPulse.reflection }}
    onJournal={onJournal} onNotifications={onNotifications} unread={unreadNotificationCount}
    latest={homeLatestEntry(journalEntries, currentTime, language)} deckCover={getDeckThumbnailImage(selectedDeck.id)}
    onOpenRecent={onOpenRecent} onWritePrompt={onWritePrompt}
    continuation={councilSession ? <HomeCouncilCard language={language} personas={councilPersonas} session={councilSession} onPress={onAiCouncil} /> : undefined}
    preRevealHint={todayPulse.wisdomLine}
    nextStep={nextStep}
    reflection={<TodayCardReflection language={language} cardImage={getTarotCardImage(selectedDeck.id, card.id)} cardName={displayTarotCardName(card, language)}
      cardMeta={displayTarotCardMeta(card, language)} deckName={localizedText(selectedDeck.name, language)} keywords={localizedList(card.keywords, language)} meaning={displayTarotMeaning(card, language)}
      question={todayQuestion} microAction={todayPulse.microAction}
      guidance={dailyInsight.text} onAnotherGuidance={onRerollDaily} disclaimer={c.disclaimer}
      moods={moodOptions.map((mood) => ({ id: mood.id, label: localizedText(mood, language) }))} selectedMood={todayMood} onMood={onMoodCheck}
      note={todayNote} onNoteChange={onTodayNoteChange} savedNote={savedTodayEntry ? savedTodayEntry.userNote ?? "" : undefined} />}
    reflectionActions={<TodayCardActions language={language} saved={cardSaved} onSave={onSaveTodayCard} onAskDeeper={onAskDeeperToday} onShare={onShareTodayCard} />}
  />;
}

// The newest saved entry for "Đọc tiếp", with card thumbnails when it is a saved tarot reading.
function homeLatestEntry(entries: JournalEntry[], now: Date, language: Language): HomeLatest | undefined {
  const entry = entries[0];
  if (!entry) return undefined;
  const snapshot = entry.sourceSnapshot as { type?: unknown; deckId?: unknown; cards?: unknown } | undefined;
  const deckId = snapshot?.type === "tarot_reading" && typeof snapshot.deckId === "string" ? snapshot.deckId : undefined;
  const cardIds = deckId && Array.isArray(snapshot?.cards)
    ? snapshot.cards.map((card: { id?: unknown }) => card?.id).filter((id): id is string => typeof id === "string")
    : [];
  const kind = cardIds.length
    ? language === "vi" ? `Trải ${cardIds.length} lá` : `${cardIds.length}-card reading`
    : journalSourceLabel(entry.sourceType, language);
  const day = relativeDayLabel(entry.createdAt, now, language).toLowerCase();
  return {
    id: entry.id,
    title: entry.title,
    meta: [kind, day, language === "vi" ? "đã lưu" : "saved"].join(" · "),
    thumbs: deckId ? cardIds.slice(0, 3).map((id) => getTarotCardImage(deckId, id)) : []
  };
}

function HomeCouncilCard({
  language,
  personas,
  session,
  onPress
}: {
  language: Language;
  personas: Persona[];
  session?: AiCouncilSessionSummary;
  onPress: () => void;
}) {
  const hasSession = Boolean(session);
  const updatedAt = session ? formatLocalDate(session.updatedAt, language) : "";
  const title = hasSession
    ? language === "vi" ? "Tiếp tục AI Council" : "Continue AI Council"
    : language === "vi" ? "Mở AI Council" : "Open AI Council";
  const body = hasSession
    ? language === "vi"
      ? "Hội đồng gần nhất vẫn sẵn sàng giữ nhiều góc nhìn cho vấn đề của bạn."
      : "Your latest council is ready to hold multiple lenses for your question."
    : language === "vi"
      ? "Mời nhiều guide cùng soi một câu hỏi khi bạn cần quyết định, nhắn tin, hoặc gọi tên cảm xúc."
      : "Invite multiple guides into one question when you need help deciding, messaging, or naming a feeling.";
  const detail = session
    ? language === "vi"
      ? `${session.templateName} / ${session.guideCount} guide / ${session.turnCount} lượt / ${updatedAt}`
      : `${session.templateName} / ${session.guideCount} guides / ${session.turnCount} turns / ${updatedAt}`
    : language === "vi"
      ? "Ba guide, một câu hỏi, không hiện nội dung riêng tư trên Home."
      : "Three guides, one question, with private content kept off Home.";
  const cta = hasSession
    ? language === "vi" ? "Tiếp tục" : "Continue"
    : language === "vi" ? "Mở Council" : "Open Council";

  return (
    <Pressable accessibilityRole="button" style={styles.homeCouncilCard} onPress={onPress}>
      <View style={styles.homeCouncilHeader}>
        <View style={styles.homeCouncilIcon}>
          <Ionicons name="people-outline" size={20} color={colors.gold} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.sectionKicker}>AI Council</Text>
          <Text style={styles.homeCouncilTitle}>{title}</Text>
        </View>
        <View style={styles.councilAvatarStack}>
          {personas.slice(0, 3).map((persona) => (
            <Image key={persona.id} source={getPersonaThumbnail(persona)} style={styles.councilAvatar} resizeMode="cover" />
          ))}
        </View>
      </View>
      <Text style={styles.homeCouncilBody}>{body}</Text>
      <View style={styles.homeCouncilFooter}>
        <Text style={styles.homeCouncilDetail}>{detail}</Text>
        <View style={styles.homeCouncilCta}>
          <Text style={styles.homeCouncilCtaText}>{cta}</Text>
          <Ionicons name="arrow-forward-outline" size={14} color={colors.charcoal} />
        </View>
      </View>
    </Pressable>
  );
}

function getPersonaThumbnail(persona: Persona) {
  return getPersonaVisual(persona, "thumbnail");
}

function getPersonaCover(persona: Persona) {
  return getPersonaVisual(persona, "cover");
}

function personaMatchesChatCategory(persona: Persona, category: ChatCategory) {
  if (category === "all") return true;
  if (category === "sages") return persona.type === "historical_figure";
  if (category === "books") return persona.type === "book_inspired_guide";

  const searchable = [...persona.themes, ...persona.tone, persona.slug].join(" ").toLowerCase();
  if (category === "love") return /love|relationship|empathy|communication/.test(searchable);
  if (category === "career") return /career|strategy|decision|conflict|purpose|discipline/.test(searchable);
  if (category === "healing") return /healing|calm|self_care|inner_peace|letting_go|daily|supportive|gentle/.test(searchable);
  return false;
}

function personaRoleLabel(persona: Persona, language: Language) {
  if (persona.displayRole) return localizedText(persona.displayRole, language);
  if (persona.type === "book_inspired_guide") {
    return language === "vi" ? "Guide theo chủ đề sách" : "Book-inspired guide";
  }
  return localizedText(persona.sourceInspiration, language, persona.type);
}

function personaConversationLens(persona: Persona, language: Language) {
  if (persona.displayRole) return localizedText(persona.displayRole, language);
  const traits = personaTraitPreview(persona, language, 2);
  if (traits.length) return traits.join(language === "vi" ? " và " : " and ");
  return personaRoleLabel(persona, language);
}

function personaSearchText(persona: Persona, language: Language) {
  return [
    localizedText(persona.name, language),
    localizedText(persona.displayRole ?? persona.sourceInspiration, language, ""),
    localizedText(persona.shortDescription, language),
    ...persona.tone,
    ...persona.themes,
    ...localizedList(persona.suggestedPrompts, language)
  ]
    .join(" ")
    .toLowerCase();
}

function personaMatchesSearch(persona: Persona, language: Language, query: string) {
  const normalizedQuery = normalizeSearchString(query.trim());
  if (!normalizedQuery) return true;
  return normalizeSearchString(personaSearchText(persona, language)).includes(normalizedQuery);
}

function normalizeSearchString(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d");
}

function personaGoalScore(persona: Persona, profile: Profile) {
  const signals = new Set([...persona.themes, ...persona.tone, persona.slug]);
  const goalMap: Record<string, string[]> = {
    career: ["career", "strategy", "decision", "purpose", "discipline", "practical"],
    curious: ["spiritual", "wisdom", "flow", "poetic"],
    daily: ["daily", "calm", "grounded", "reflective", "practical"],
    decision: ["decision", "strategy", "clarity", "practical", "growth"],
    healing: ["healing", "calm", "self_care", "inner_peace", "gentle", "supportive"],
    love: ["relationships", "communication", "empathy", "love", "relational"],
    self: ["purpose", "habits", "ethics", "inner_peace", "journaling", "reflective"]
  };

  return profile.goals.reduce((score, goal) => score + (goalMap[goal] ?? []).filter((signal) => signals.has(signal)).length, 0);
}

function recommendedPersonasForProfile(profile: Profile) {
  return [...personas]
    .map((persona) => ({ persona, score: personaGoalScore(persona, profile) }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 3)
    .map((item) => item.persona);
}

function personaTraitLabel(value: string, language: Language) {
  const labels: Record<string, { vi: string; en: string }> = {
    anxiety: { vi: "lo âu", en: "anxiety" },
    calm: { vi: "bình tâm", en: "calm" },
    career: { vi: "sự nghiệp", en: "career" },
    communication: { vi: "giao tiếp", en: "communication" },
    conflict: { vi: "xung đột", en: "conflict" },
    control: { vi: "kiểm soát", en: "control" },
    concise: { vi: "ngắn gọn", en: "concise" },
    daily: { vi: "hằng ngày", en: "daily" },
    decision: { vi: "quyết định", en: "decision" },
    discipline: { vi: "kỷ luật", en: "discipline" },
    encouraging: { vi: "khích lệ", en: "encouraging" },
    direct: { vi: "thẳng", en: "direct" },
    empathy: { vi: "thấu cảm", en: "empathy" },
    ethics: { vi: "đạo đức", en: "ethics" },
    flow: { vi: "dòng chảy", en: "flow" },
    gentle: { vi: "dịu", en: "gentle" },
    grounded: { vi: "vững", en: "grounded" },
    habits: { vi: "thói quen", en: "habits" },
    inner_peace: { vi: "bình an", en: "inner peace" },
    journaling: { vi: "journal", en: "journaling" },
    letting_go: { vi: "buông bỏ", en: "letting go" },
    practical: { vi: "thực tế", en: "practical" },
    poetic: { vi: "thơ", en: "poetic" },
    purpose: { vi: "mục đích", en: "purpose" },
    quiet: { vi: "tĩnh", en: "quiet" },
    reflective: { vi: "chiêm nghiệm", en: "reflective" },
    relational: { vi: "quan hệ", en: "relational" },
    relationships: { vi: "quan hệ", en: "relationships" },
    resilience: { vi: "bền bỉ", en: "resilience" },
    self_care: { vi: "tự chăm sóc", en: "self care" },
    spiritual: { vi: "tâm linh", en: "spiritual" },
    strategic: { vi: "chiến lược", en: "strategic" },
    structured: { vi: "có cấu trúc", en: "structured" },
    supportive: { vi: "nâng đỡ", en: "supportive" },
    minimal: { vi: "tối giản", en: "minimal" },
    timing: { vi: "thời điểm", en: "timing" },
    warm: { vi: "ấm áp", en: "warm" },
    wise: { vi: "thông thái", en: "wise" }
  };
  return localizedText(labels[value], language, value.replace(/_/g, " "));
}

function personaTraitPreview(persona: Persona, language: Language, limit = 3) {
  return [...persona.tone, ...persona.themes]
    .slice(0, limit)
    .map((item) => personaTraitLabel(item, language));
}

function buildPersonaFallbackSections(persona: Persona, language: Language) {
  return personaTraitPreview(persona, language, 4).map((trait) => ({
    title: trait,
    body:
      language === "vi"
        ? `Một lăng kính ${trait.toLowerCase()} để bạn nhìn câu hỏi chậm hơn, rõ hơn và an toàn hơn.`
        : `A ${trait.toLowerCase()} lens for seeing your question more slowly, clearly, and safely.`
  }));
}

function CouncilHub({
  councilRoomProps,
  language,
  onOpenGuideList,
  onOpenRoom
}: {
  councilRoomProps: Omit<AiCouncilRoomProps, "onBack" | "onOpenGuideChat">;
  language: Language;
  onOpenGuideList: () => void;
  onOpenRoom: () => void;
}) {
  const sessions = councilRoomProps.sessionSummaries;
  const latestSession = sessions[0];
  const currentGuides = councilRoomProps.personas;

  return (
    <View>
      <TopBar title="AI Council" />
      <Header
        eyebrow={language === "vi" ? "Phản chiếu cùng nhiều góc nhìn" : "Group reflection"}
        title={language === "vi" ? "Chọn Council bạn muốn mở" : "Choose a Council to open"}
      />
      <Text style={styles.leadLeft}>
        {language === "vi"
          ? "Council phù hợp khi bạn cần nhiều góc nhìn cho cùng một câu hỏi. Bạn có thể tiếp tục group cũ hoặc bắt đầu một group mới theo tình huống."
          : "Council is best when one question needs several lenses. Continue a previous group or start a new one for the situation."}
      </Text>

      <View style={styles.councilHubHero}>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Text style={styles.kicker}>{language === "vi" ? "Council hiện tại" : "Current Council"}</Text>
            <Text style={styles.councilHubTitle}>{councilRoomProps.customCouncilName}</Text>
          </View>
          <View style={styles.councilAvatarStack}>
            {currentGuides.slice(0, 4).map((persona) => (
              <Image key={persona.id} source={getPersonaThumbnail(persona)} style={styles.councilAvatar} resizeMode="cover" />
            ))}
          </View>
        </View>
        <Text style={styles.councilHubBody}>
          {language === "vi"
            ? `${currentGuides.length} guide đang sẵn sàng. Bạn có thể chỉnh guide trong phòng Council trước khi gửi câu hỏi.`
            : `${currentGuides.length} guides are ready. You can adjust guides inside the council room before sending a question.`}
        </Text>
        <PrimaryButton
          label={latestSession ? (language === "vi" ? "Tiếp tục Council gần nhất" : "Continue latest Council") : (language === "vi" ? "Mở Council mới" : "Open new Council")}
          onPress={onOpenRoom}
        />
      </View>

      {sessions.length > 0 ? (
        <View>
          <Text style={styles.sectionKicker}>{language === "vi" ? "Council đã lưu" : "Saved Councils"}</Text>
          {sessions.map((session) => (
            <Pressable
              key={session.id}
              accessibilityRole="button"
              style={styles.councilHubSessionCard}
              onPress={() => {
                councilRoomProps.onResumeSession(session.id);
                onOpenRoom();
              }}
            >
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{session.title}</Text>
                <Text style={styles.cardDescription}>
                  {language === "vi"
                    ? `${session.templateName} / ${session.guideCount} guide / ${session.turnCount} lượt`
                    : `${session.templateName} / ${session.guideCount} guides / ${session.turnCount} turns`}
                </Text>
                <Text style={styles.sourcePath}>{new Date(session.updatedAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color={colors.gold} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionKicker}>{language === "vi" ? "Bắt đầu group mới" : "Start a new group"}</Text>
      {councilRoomProps.activeTemplates.map((template) => (
        <Pressable
          key={template.id}
          accessibilityRole="button"
          style={styles.councilHubTemplateCard}
          onPress={() => {
            councilRoomProps.onSelectTemplate(template);
            onOpenRoom();
          }}
        >
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{localizedText(template.name, language)}</Text>
            <Text style={styles.cardDescription}>{localizedText(template.useCase, language)}</Text>
            <View style={styles.traitRail}>
              <Text style={styles.traitPill}>{councilRoomProps.getModeLabel(template.meetingMode, language)}</Text>
              <Text style={styles.traitPill}>{councilRoomProps.getSynthesisLabel(template.synthesisMode, language)}</Text>
            </View>
          </View>
          <Ionicons name="people-outline" size={20} color={colors.gold} />
        </Pressable>
      ))}

      <FeatureWide
        icon="person-add-outline"
        label={language === "vi" ? "Muốn nói chuyện với một guide riêng?" : "Want one guide instead?"}
        detail={language === "vi" ? "Mở danh sách guide/vĩ nhân nếu bạn không cần nhiều góc nhìn." : "Open the guide library if you do not need multiple lenses."}
        onPress={onOpenGuideList}
        muted
      />
    </View>
  );
}

function ChatScreen({
  backendOptions,
  c,
  chatError,
  chatGenerating,
  chatInput,
  councilRoomProps,
  favoritePersonaIds,
  handoffContext,
  mode,
  currentMessages,
  activePersonaSessionId,
  language,
  recentConversations,
  personaSessionSummaries,
  profile,
  selectedPersona,
  selectedPersonaId,
  displayedTier,
  setMode,
  setChatInput,
  setSelectedPersonaId,
  showCompactTitle,
  onFeedback,
  onClearHandoff,
  onNewChat,
  onOpenRecentConversation,
  onResumePersonaSession,
  onStartPersonaSession,
  onToggleFavoritePersona,
  onReport,
  onRetry,
  onSave,
  onSend,
  onTrack
}: {
  backendOptions: BackendOptions;
  c: Copy;
  chatError: string;
  chatGenerating: boolean;
  chatInput: string;
  councilRoomProps: Omit<AiCouncilRoomProps, "onBack" | "onOpenGuideChat">;
  favoritePersonaIds: string[];
  handoffContext?: ChatHandoffContext;
  mode: ChatMode;
  currentMessages: ChatMessage[];
  activePersonaSessionId: string;
  language: Language;
  recentConversations: RecentConversation[];
  personaSessionSummaries: ChatSessionSummary[];
  profile: Profile;
  selectedPersona: Persona;
  selectedPersonaId: string;
  displayedTier: AccountTier;
  setMode: (mode: ChatMode) => void;
  setChatInput: (text: string) => void;
  setSelectedPersonaId: (id: string) => void;
  showCompactTitle: boolean;
  onFeedback: (text: string) => void;
  onClearHandoff: () => void;
  onNewChat: () => void;
  onOpenRecentConversation: (conversation: RecentConversation) => void;
  onResumePersonaSession: (sessionId: string) => void;
  onStartPersonaSession: (personaId?: string) => void;
  onToggleFavoritePersona: (personaId: string) => void;
  onReport: (summary: string, sourceId?: string) => void;
  onRetry?: () => void;
  onSave: (entry: Omit<JournalEntry, "id" | "createdAt">) => void;
  onSend: (preset?: string) => void;
  onTrack: (name: string, metadata?: Record<string, string | number | boolean>) => void;
}) {
  const [detailTab, setDetailTab] = useState<PersonaDetailTab>("reflections");
  const intro = language === "vi"
    ? "Cuộc trò chuyện này là mô phỏng AI lấy cảm hứng, không phải người thật hay đại diện chính thức."
    : "This is an inspired AI simulation, not the real person or an official representative.";
  const personaName = localizedText(selectedPersona.name, language);
  const personaPrompts = localizedList(selectedPersona.suggestedPrompts, language);
  const personaTransparency = localizedText(selectedPersona.transparencyNote, language, intro);
  const personaThumbnail = getPersonaThumbnail(selectedPersona);
  const personaCover = getPersonaCover(selectedPersona);
  const lastGuideMessage = [...currentMessages].reverse().find((message) => message.role === "guide");
  const saveLastInsight = () => {
    if (!lastGuideMessage) {
      onFeedback(language === "vi" ? "Chưa có câu trả lời để lưu" : "No guide answer to save yet");
      return;
    }
    onSave({
      sourceType: "chat",
      sourceId: lastGuideMessage.id,
      title: personaName,
      summary: lastGuideMessage.text,
      sourceSnapshot: {
        type: "chat_message",
        personaId: selectedPersona.id,
        personaName,
        transparency: personaTransparency,
        promptVersionId: lastGuideMessage.promptVersionId
      }
    });
  };
  const reportConversation = () => {
    onReport(lastGuideMessage?.text ?? personaName, lastGuideMessage?.id ?? selectedPersonaId);
  };

  if (mode === "list") {
    const latest = recentConversations[0];
    const latestPersona = latest?.personaId ? personasById[latest.personaId] : undefined;
    const openGuide = (personaId: string) => {
      onClearHandoff();
      setSelectedPersonaId(personaId);
      setMode("detail");
    };
    return (
      <ChatHub
        language={language}
        now={new Date()}
        recent={latest ? {
          title: latest.title,
          snippet: latest.latestText ?? latest.preview,
          updatedAt: latest.updatedAt,
          thumbnail: latestPersona ? getPersonaThumbnail(latestPersona) : undefined,
          icon: latest.kind === "oracle" ? "sparkles-outline" : latest.kind === "council" ? "people-outline" : "chatbubble-ellipses-outline"
        } : undefined}
        councilThumbnails={councilRoomProps.personas.map((persona) => getPersonaThumbnail(persona))}
        guides={personas.map((persona) => ({
          id: persona.id,
          name: personaShortName(persona, language),
          tagline: personaTagline(persona, language),
          thumbnail: getPersonaThumbnail(persona),
          comingSoon: !canViewContentTier(persona.accessTier, displayedTier)
        }))}
        matches={(id, category, query) => {
          const persona = personasById[id];
          return !!persona && personaMatchesChatCategory(persona, category) && personaMatchesSearch(persona, language, query);
        }}
        onOpenRecent={() => latest && onOpenRecentConversation(latest)}
        onOracle={() => setMode("oracle")}
        onCouncil={() => setMode("council")}
        onOpenGuide={openGuide}
      />
    );
  }

  if (mode === "councilHub") {
    return (
      <CouncilHub
        councilRoomProps={councilRoomProps}
        language={language}
        onOpenGuideList={() => setMode("list")}
        onOpenRoom={() => setMode("council")}
      />
    );
  }

  if (mode === "council") {
    return (
      <AiCouncilRoom
        {...councilRoomProps}
        onBack={() => setMode("list")}
        onOpenGuideChat={(turn) => {
          if (!turn.persona) return;
          onClearHandoff();
          setSelectedPersonaId(turn.persona.id);
          onStartPersonaSession(turn.persona.id);
          // Suggest a short follow-up instead of pasting the guide's own words into the person's box (analysis CH-08).
          setChatInput(language === "vi" ? "Mình muốn đi sâu hơn vào ý bạn vừa nói trong hội đồng." : "I'd like to go deeper into what you said in the council.");
          setMode("room");
        }}
      />
    );
  }

  if (mode === "detail") {
    const role = personaRoleLabel(selectedPersona, language);
    const detailTraits = personaTraitPreview(selectedPersona, language, 5);
    const personaLocked = !canViewContentTier(selectedPersona.accessTier, displayedTier);
    const personaFavorite = favoritePersonaIds.includes(selectedPersona.id);
    const personaSections = getContentSections("persona", selectedPersona.id);
    const reflectionSection = personaSections.find((section) => section.sectionKey === "reflections");
    const chronicleSection = personaSections.find((section) => section.sectionKey === "chronicle");
    const activePersonaSections =
      detailTab === "reflections"
        ? reflectionSection ? [reflectionSection] : []
        : chronicleSection ? [chronicleSection] : [];
    const fallbackPersonaSections = buildPersonaFallbackSections(selectedPersona, language);
    const editorialOverride = personaEditorialOverrides[selectedPersona.slug];
    const heroTitle = localizedText(editorialOverride?.heroTitle, language, personaName).replace(/\s+Guide$/i, "");
    const heroSubtitle = localizedText(editorialOverride?.heroSubtitle, language, role).toUpperCase();
    const domainLabels = localizedList(editorialOverride?.domainLabels, language);
    const domainKeys = Array.from(new Set([...selectedPersona.themes, ...selectedPersona.tone]));
    const domainItems = domainKeys.slice(0, 4).map((key, index) => ({
      key,
      label: domainLabels[index] ?? personaTraitLabel(key, language),
      visual: personaDomainVisuals[key] ?? { icon: "sparkles-outline" as const, color: colors.gold }
    }));
    const reflectionQuoteBlock = reflectionSection?.blocks.find((block) => block.kind === "quote");
    const reflectionInsightBlocks = reflectionSection?.blocks.filter((block) => block.kind === "insight") ?? [];
    const reflectionQuote = localizedText(
      editorialOverride?.reflectionQuote ?? (reflectionQuoteBlock?.quote as LocalizedText | undefined),
      language,
      localizedText(reflectionSection?.title, language, localizedText(selectedPersona.shortDescription, language))
    );
    const reflectionSummary = localizedText(
      editorialOverride?.reflectionSummary ?? (reflectionQuoteBlock?.body as LocalizedText | undefined),
      language,
      reflectionSection ? localizedText(reflectionSection.body, language) : personaTransparency
    );
    const overrideInsights = localizedList(editorialOverride?.recentInsights, language);
    const recentInsights = overrideInsights.length
      ? overrideInsights
      : reflectionInsightBlocks.length
        ? reflectionInsightBlocks.map((block) => localizedBlockValue(block, "body", language))
        : personaPrompts.slice(0, 2);
    const chronicleEyebrow = localizedText(
      editorialOverride?.chronicleEyebrow ?? chronicleSection?.title,
      language,
      language === "vi" ? "Người dẫn đường vượt thời gian" : "The Timeless Guide"
    );
    const chronicleHeading = localizedText(
      editorialOverride?.chronicleHeading ?? chronicleSection?.subtitle,
      language,
      localizedText(selectedPersona.sourceInspiration, language, role)
    );
    const chronicleLead = activePersonaSections[0]
      ? localizedText(activePersonaSections[0].body, language)
      : personaTransparency;
    const chronicleSupport = localizedText(selectedPersona.shortDescription, language);
    const chronicleHighlights = (activePersonaSections[0]?.blocks ?? [])
      .slice(0, 2)
      .map((block, index) => ({
        title: localizedText((block as { title?: LocalizedText }).title, language, detailTraits[index] ?? role),
        body: localizedText((block as { body?: LocalizedText }).body, language, chronicleSupport)
      }));
    const chronicleQuote = localizedText(
      editorialOverride?.chronicleQuote,
      language,
      chronicleSection ? localizedText(chronicleSection.body, language) : personaTransparency
    );
    return (
      <View style={styles.editorialPersonaScreen}>
        <View style={styles.editorialPersonaTopBar}>
          <Pressable accessibilityRole="button" style={styles.editorialRoundIcon} onPress={() => setMode("list")}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.gold} />
          </Pressable>
          <View style={[styles.editorialPersonaHeaderTitleWrap, showCompactTitle && styles.editorialPersonaHeaderTitleWrapVisible]}>
            <Text style={styles.editorialPersonaHeaderTitle} numberOfLines={1}>{heroTitle}</Text>
          </View>
          <View style={styles.editorialPersonaActionRow}>
            <Pressable
              accessibilityLabel={personaFavorite ? "Remove favorite guide" : "Save favorite guide"}
              accessibilityRole="button"
              accessibilityState={{ selected: personaFavorite }}
              style={[styles.editorialRoundIcon, personaFavorite && styles.editorialRoundIconActive]}
              onPress={() => onToggleFavoritePersona(selectedPersona.id)}
            >
              <Ionicons name={personaFavorite ? "bookmark" : "bookmark-outline"} size={18} color={colors.gold} />
            </Pressable>
          </View>
        </View>

        <View style={styles.editorialPersonaHero}>
          <View style={styles.editorialPersonaAura} />
          <Image source={personaCover} style={styles.editorialPersonaImage} resizeMode="cover" />
          <View style={styles.editorialPersonaHeroShade} />
          <View style={[styles.editorialPersonaTitleWrap, showCompactTitle && styles.editorialPersonaTitleWrapHidden]}>
            <Text style={styles.editorialPersonaTitle}>{heroTitle}</Text>
            <Text style={styles.editorialPersonaSubtitle}>{heroSubtitle}</Text>
          </View>
        </View>

        <View style={styles.editorialPersonaTabs}>
          <Pressable style={styles.editorialPersonaTab} onPress={() => setDetailTab("reflections")}>
            <Text style={[styles.editorialPersonaTabText, detailTab === "reflections" && styles.editorialPersonaTabTextActive]}>
              {language === "vi" ? "Suy niệm" : "Reflections"}
            </Text>
            <View style={[styles.editorialPersonaTabLine, detailTab === "reflections" && styles.editorialPersonaTabLineActive]} />
          </Pressable>
          <Pressable style={styles.editorialPersonaTab} onPress={() => setDetailTab("chronicle")}>
            <Text style={[styles.editorialPersonaTabText, detailTab === "chronicle" && styles.editorialPersonaTabTextActive]}>
              {language === "vi" ? "Biên niên" : "Chronicle"}
            </Text>
            <View style={[styles.editorialPersonaTabLine, detailTab === "chronicle" && styles.editorialPersonaTabLineActive]} />
          </Pressable>
        </View>

        {detailTab === "reflections" ? (
          <View style={styles.editorialPersonaSectionStack}>
            <View style={styles.editorialPersonaSection}>
              <Text style={styles.editorialPersonaSectionLabel}>{language === "vi" ? "Miền trí tuệ" : "Wisdom Domains"}</Text>
              <View style={styles.editorialPersonaDomainStack}>
                {domainItems.map((item) => (
                  <View key={item.key} style={styles.editorialPersonaDomainCard}>
                    <Ionicons name={item.visual.icon} size={20} color={item.visual.color} />
                    <Text style={styles.editorialPersonaDomainText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.editorialPersonaQuoteCard}>
              <Ionicons name="chatbox-ellipses-outline" size={42} color="rgba(201, 164, 92, 0.12)" style={styles.editorialPersonaQuoteMark} />
              <Text style={styles.editorialPersonaCardLabel}>{language === "vi" ? "Một lời từ người dẫn đường" : "A Word from the Guide"}</Text>
              <Text style={styles.editorialPersonaQuoteText}>“{reflectionQuote}”</Text>
              <Text style={styles.editorialPersonaQuoteBody}>{reflectionSummary}</Text>
            </View>

            <View style={styles.editorialPersonaSection}>
              <Text style={styles.editorialPersonaSectionLabel}>{language === "vi" ? "Dấu vết gần đây" : "Recent Insights"}</Text>
              <View style={styles.editorialPersonaInsightStack}>
                {recentInsights.map((item) => (
                  <View key={item} style={styles.editorialPersonaInsightCard}>
                    <Text style={styles.editorialPersonaInsightText}>“{item}”</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.editorialPersonaSectionStack}>
            <View style={styles.editorialPersonaChronicleIntro}>
              <Text style={styles.editorialPersonaChronicleEyebrow}>{chronicleEyebrow}</Text>
              <Text style={styles.editorialPersonaChronicleBody}>
                <Text style={styles.editorialPersonaDropcap}>{chronicleLead.slice(0, 1)}</Text>
                {chronicleLead.slice(1)}
              </Text>
            </View>

            <View style={styles.editorialPersonaDivider} />

            <View style={styles.editorialPersonaChronicleStory}>
              <Text style={styles.editorialPersonaChronicleHeading}>{chronicleHeading}</Text>
              <Text style={styles.editorialPersonaChronicleSupport}>{chronicleSupport}</Text>
            </View>

            <View style={styles.editorialPersonaLegacyCard}>
              <Text style={styles.editorialPersonaLegacyLabel}>{language === "vi" ? "Âm vang di sản" : "Historical Echoes"}</Text>
              {(chronicleHighlights.length > 0 ? chronicleHighlights : fallbackPersonaSections.slice(0, 2)).map((item) => (
                <View key={item.title} style={styles.editorialPersonaLegacyItem}>
                  <Text style={styles.editorialPersonaLegacyItemTitle}>{item.title}</Text>
                  <Text style={styles.editorialPersonaLegacyItemBody}>{item.body}</Text>
                </View>
              ))}
            </View>

            <View style={styles.editorialPersonaClosingQuote}>
              <Ionicons name="book-outline" size={28} color="rgba(201, 164, 92, 0.22)" />
              <Text style={styles.editorialPersonaClosingQuoteText}>“{chronicleQuote}”</Text>
            </View>
          </View>
        )}

        {personaLocked && (
          <View style={styles.lockedPanel}>
            <Text style={styles.lockedTitle}>{language === "vi" ? "Mở khóa guide này" : "Unlock this guide"}</Text>
            <Text style={styles.lockedBody}>{c.premiumPersonaPreview}</Text>
          </View>
        )}

        <Text style={styles.editorialPersonaTransparency}>{personaTransparency}</Text>
      </View>
    );
  }

  return (
    <PersonaChatRoom
      chatError={chatError}
      chatGenerating={chatGenerating}
      copy={{
        askSomething: c.askSomething,
        generatingAnswer: c.generatingAnswer,
        newChat: c.newChat,
        report: c.report,
        retry: c.retry,
        save: c.save
      }}
      handoffContext={handoffContext}
      input={chatInput}
      language={language}
      messages={currentMessages}
      activeSessionId={activePersonaSessionId}
      onBack={() => setMode("detail")}
      onChangeInput={setChatInput}
      onNewChat={onNewChat}
      onReport={reportConversation}
      onResumeSession={onResumePersonaSession}
      onRetry={onRetry}
      onSaveLastInsight={saveLastInsight}
      onSaveMessage={(message) => onSave({
        sourceType: "chat",
        sourceId: message.id,
        title: personaName,
        summary: message.text,
        sourceSnapshot: {
          type: "chat_message",
          personaId: selectedPersona.id,
          personaName,
          transparency: personaTransparency,
          promptVersionId: message.promptVersionId,
          handoffContext
        }
      })}
      onRateMessage={(message, rating) => {
        onTrack("persona_reply_feedback", {
          personaId: selectedPersona.id,
          messageId: message.id,
          rating,
          promptVersionId: message.promptVersionId ?? "unknown"
        });
        onFeedback(language === "vi" ? "Cảm ơn bạn đã phản hồi." : "Thanks for the feedback.");
      }}
      onSend={onSend}
      personaName={personaName}
      personaPrompts={personaPrompts}
      personaThumbnail={personaThumbnail}
      personaTransparency={personaTransparency}
      sessionSummaries={personaSessionSummaries}
    />
  );
}

export function TarotFlow({
  c,
  learnedCardIds,
  onCardLearned,
  language,
  reading,
  selectedDeck,
  displayedTier,
  tarotCreditBalance,
  selectedDeckId,
  setSelectedDeckId,
  setStage,
  stage,
  tarotError,
  tarotGenerating,
  tarotQuestion,
  keepSelectedDeck,
  intentionReviewed,
  onKeepSelectedDeckChange,
  tarotSpread,
  tarotTopic,
  generatedArtifacts,
  selectedTarotCardId,
  selectedTarotGuideId,
  setSelectedTarotCardId,
  setSelectedTarotGuideId,
  onBack,
  onStartOver,
  onAskFollowUp,
  onChatWithCard,
  onCreateShareArtifact,
  onOpenShare,
  onDraw,
  onRetryInterpretation,
  onQuestionChange,
  onReportReading,
  onSave,
  onSpreadChange,
  onTopicChange,
  onWriteJournal
}: {
  c: Copy;
  language: Language;
  reading: ReturnType<typeof drawReading> | null;
  selectedDeck: TarotDeck;
  displayedTier: AccountTier;
  tarotCreditBalance: number;
  selectedDeckId: string;
  setSelectedDeckId: (id: string) => void;
  setStage: (stage: TarotStage) => void;
  stage: TarotStage;
  tarotError: string;
  tarotGenerating: boolean;
  tarotQuestion: string;
  keepSelectedDeck: boolean;
  intentionReviewed: boolean;
  onKeepSelectedDeckChange: (keep: boolean) => void;
  tarotSpread: TarotSpread;
  tarotTopic: TarotTopic;
  generatedArtifacts: GeneratedArtifact[];
  selectedTarotCardId: string | null;
  selectedTarotGuideId: string;
  setSelectedTarotCardId: (id: string | null) => void;
  setSelectedTarotGuideId: (id: string) => void;
  onBack: () => void;
  learnedCardIds: string[];
  onCardLearned: (cardId: string) => void;
  onStartOver: () => void;
  onAskFollowUp: (personaId?: string) => void;
  onChatWithCard: (card: TarotCard | DrawnTarotCard, deck: TarotDeck, sourceReading?: ReturnType<typeof drawReading> | null) => void;
  onCreateShareArtifact: () => void;
  onOpenShare: (request: ShareRequest) => void;
  onDraw: (selectedCards?: DrawnTarotCard[]) => void;
  onRetryInterpretation?: () => void;
  onQuestionChange: (text: string) => void;
  onReportReading: (summary: string, sourceId?: string) => void;
  onSave: (entry: Omit<JournalEntry, "id" | "createdAt">) => void;
  onSpreadChange: (spread: TarotSpread) => void;
  onTopicChange: (topic: TarotTopic) => void;
  onWriteJournal?: (prompt: string) => void;
}) {
  const deckThemes = selectedDeck.theme
    .map((theme) => localizedText(tarotThemeLabels[theme], language, theme))
    .join(", ");
  const selectedDeckBackImage = getDeckBackImage(selectedDeck.id);
  const selectedDeckHeroImage = getDeckThumbnailImage(selectedDeck.id);
  const selectedDeckPreviewCards = [selectedDeckBackImage, ...deckPreviewCardIds.slice(0, 2).map((id) => getTarotCardImage(selectedDeck.id, id))];
  const [activeLearningLesson, setActiveLearningLesson] = useState(0);
  const selectedSpread = spreads.find((spread) => spread.id === tarotSpread) ?? spreads[1];
  const selectedSpreadLabel = localizedText(selectedSpread, language, selectedSpread.id);
  const deckSections = getContentSections("tarot_deck", selectedDeck.id);
  const deckStory = getTarotDeckStory(selectedDeck.id);
  const deckPromptExamples = localizedList(deckStory.prompts, language);
  const deckExperience = getDeckExperience(selectedDeck.id, language, canViewContentTier(selectedDeck.accessTier, displayedTier) ? "free" : selectedDeck.accessTier);
  const deckDetailTraits = [
    { label: c.deckBestFor, value: deckThemes, icon: "sparkles-outline" as const },
    { label: c.deckVisualMood, value: localizedText(selectedDeck.visualDirection, language), icon: "color-palette-outline" as const },
    { label: c.deckReadingStyle, value: localizedText(selectedDeck.readingStyle, language), icon: "chatbubble-ellipses-outline" as const }
  ];
  const activeMeaningFromReading = reading?.selected.find((card) => card.id === selectedTarotCardId) ?? null;
  const activeMeaningCard =
    activeMeaningFromReading ??
    cards.find((card) => card.id === selectedTarotCardId) ??
    reading?.selected[0] ??
    cards[0];
  const activeMeaningCardIndex = Math.max(0, cards.findIndex((card) => card.id === activeMeaningCard.id));
  const previousMeaningCard = cards[(activeMeaningCardIndex - 1 + cards.length) % cards.length];
  const nextMeaningCard = cards[(activeMeaningCardIndex + 1) % cards.length];
  const activeMeaningKeywords = localizedList(activeMeaningCard.keywords, language);
  const latestShareArtifact = reading
    ? generatedArtifacts.find(
        (artifact) =>
          artifact.sourceType === "tarot_reading" &&
          artifact.sourceId === reading.id &&
          artifact.artifactType === "share_card" &&
          artifact.visibility !== "deleted"
      )
    : undefined;
  const [premiumDeckNotice, setPremiumDeckNotice] = useState("");
  // Analysis TA-11: the preview shows exactly this text; the share sheet opens only from its Share button.
  const shareReadingText = (target: NonNullable<typeof reading>) => readingShareText({
    cards: target.selected.map((card) => ({ position: card.spread, name: displayTarotCardInline(card, language), reversed: card.reversed })),
    summary: target.summary,
    question: target.question,
    language
  });
  // The share sheet shows the image card and builds the tracked link; the preview text above stays the exact text fallback.
  const shareReadingNow = () => {
    if (!reading) return;
    onOpenShare({
      model: readingModel({
        language,
        cards: reading.selected.map((card) => ({
          position: card.spread,
          name: displayTarotCardInline(card, language),
          reversed: Boolean(card.reversed),
          image: getTarotCardImage(selectedDeck.id, card.id)
        })),
        summary: reading.summary,
        question: reading.question
      }),
      cardIds: reading.selected.map((card) => card.id)
    });
  };
  const tarotGuideOptions = getTarotGuideOptions(selectedDeck.id);
  const recommendedTarotGuide = getRecommendedTarotGuide(selectedDeck.id);
  const selectedTarotGuide =
    tarotGuideOptions.find((persona) => persona.id === selectedTarotGuideId) ??
    recommendedTarotGuide;
  const selectedTarotGuideReason = getTarotGuideReason(selectedDeck.id, selectedTarotGuide, language);
  const editorialDecks = decks;
  const isEditorialStage = stage === "learn" || stage === "topic" || stage === "spread" || stage === "deck" || stage === "deckDetail" || stage === "library" || stage === "draw" || stage === "result";
  const topicGridItems = topics.filter((topic) => topic.id !== "open");
  const editorialDeckTitle = language === "vi" ? "Chọn bộ bài theo tâm trạng của bạn" : "Choose your mood";
  const editorialDeckBody =
    language === "vi"
      ? "Chọn bộ bài đồng điệu nhất với hành trình hiện tại của bạn."
      : "Select the deck that resonates with your current journey.";
  const selectedTopicLabel = localizedText(topics.find((topic) => topic.id === tarotTopic), language, tarotTopic);
  const drawPrompt = tarotCreditBalance <= 0
    ? (language === "vi" ? "Hôm nay bạn đã dùng hết lượt Tarot" : "You have used today's Tarot readings")
    : language === "vi"
      ? `Chạm một lá trong quạt bài · hôm nay còn ${tarotCreditBalance} lượt`
      : `Tap a card in the fan · ${tarotCreditBalance} left today`;
  const ritualTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const reduceRitualMotion = useReducedMotion();
  const [ritualPhase, setRitualPhase] = useState<RitualDrawPhase>("grounding");
  const [ritualDrawnCount, setRitualDrawnCount] = useState(0);
  const [ritualSelectedCards, setRitualSelectedCards] = useState<DrawnTarotCard[]>([]);
  const [fullscreenTarotCard, setFullscreenTarotCard] = useState<FullscreenTarotCard | null>(null);
  const [selectedFanIndex, setSelectedFanIndex] = useState<number | null>(null);
  const [cardMeaningReturnStage, setCardMeaningReturnStage] = useState<TarotStage>("deckDetail");
  const tarotScrollRef = useRef<ScrollView | null>(null);
  const [showTarotBackToTop, setShowTarotBackToTop] = useState(false);
  const visibleRitualCards = ritualSelectedCards.slice(0, ritualDrawnCount);
  const latestRitualCard = visibleRitualCards[visibleRitualCards.length - 1];
  const drawActionBusy = stage === "draw" && ritualPhase !== "grounding" && !tarotGenerating;
  const ritualPhaseLabel = (() => {
    if (tarotGenerating || ritualPhase === "reveal") return c.generatingReading;
    if (ritualPhase === "pause_and_breathe") return language === "vi" ? "Dừng một nhịp và thở..." : "Pause and breathe...";
    if (ritualPhase.startsWith("draw_card")) return language === "vi" ? "Lá bài đang tìm vị trí..." : "A card is finding its place...";
    return latestRitualCard
      ? language === "vi" ? "Chạm lá bài để xem rõ hơn" : "Tap the card for a closer look"
      : drawPrompt;
  })();
  const primaryEditorialActionLabel =
    stage === "result"
      ? language === "vi"
        ? "Lưu trải bài"
        : "Save reading"
      : stage === "deck"
        ? language === "vi"
          ? `Tiếp tục với ${localizedText(selectedDeck.name, language)}`
          : `Continue with ${localizedText(selectedDeck.name, language)}`
        : c.continue;
  const deckSelectionActionLabel =
    stage === "deck"
      ? `${language === "vi" ? "Tiếp tục với" : "Continue with"} ${localizedText(selectedDeck.name, language)}`
      : primaryEditorialActionLabel;
  const topBarRight = stage === "result" ? "sparkles-outline" : "refresh-outline";
  const openFullscreenTarotCard = (card: TarotCard | DrawnTarotCard, meta?: string) => {
    const orientationMeta = "reversed" in card
      ? card.reversed
        ? language === "vi" ? "Lá ngược" : "Reversed"
        : language === "vi" ? "Lá xuôi" : "Upright"
      : language === "vi" ? "Thư viện lá bài" : "Card library";
    setFullscreenTarotCard({
      card,
      meta: meta ?? orientationMeta,
      source: getTarotCardImage(selectedDeck.id, card.id)
    });
  };
  const resolveCardMeaningReturnStage = (sourceStage: TarotStage = stage): TarotStage => {
    if (sourceStage === "draw" || sourceStage === "result" || sourceStage === "share" || sourceStage === "library") return sourceStage;
    return "deckDetail";
  };
  const openCardMeaning = (card: TarotCard | DrawnTarotCard, returnStage: TarotStage = resolveCardMeaningReturnStage()) => {
    setSelectedTarotCardId(card.id);
    setCardMeaningReturnStage(returnStage);
    onCardLearned(card.id);
    setStage("cardMeaning");
  };
  const openFullscreenCardMeaning = () => {
    if (!fullscreenTarotCard) return;
    openCardMeaning(fullscreenTarotCard.card, resolveCardMeaningReturnStage());
    setFullscreenTarotCard(null);
  };
  const fullscreenCardName = fullscreenTarotCard ? displayTarotCardName(fullscreenTarotCard.card, language) : "";
  const resolvedCardMeaningReturnStage = cardMeaningReturnStage === "cardMeaning" ? "deckDetail" : cardMeaningReturnStage;
  const cardMeaningBackLabel =
    resolvedCardMeaningReturnStage === "draw"
      ? language === "vi" ? "Trải bài" : "Reading"
      : resolvedCardMeaningReturnStage === "result"
        ? c.reading
        : resolvedCardMeaningReturnStage === "share"
          ? language === "vi" ? "Thẻ chia sẻ" : "Share card"
          : resolvedCardMeaningReturnStage === "library"
            ? language === "vi" ? "Thư viện" : "Library"
            : language === "vi" ? "Bộ bài" : "Deck";
  const showCardMeaningLibraryAction = resolvedCardMeaningReturnStage === "deckDetail" || resolvedCardMeaningReturnStage === "library";
  const cardMeaningLibraryLabel = language === "vi" ? "Thư viện 78 lá" : "78-card library";
  const handleTarotScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextVisible = event.nativeEvent.contentOffset.y > 520;
    setShowTarotBackToTop((current) => current === nextVisible ? current : nextVisible);
  };
  const scrollTarotToTop = () => {
    tarotScrollRef.current?.scrollTo({ y: 0, animated: true });
  };
  const clearRitualTimers = () => {
    ritualTimers.current.forEach((timer) => clearTimeout(timer));
    ritualTimers.current = [];
  };
  useEffect(() => {
    setShowTarotBackToTop(false);
    tarotScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [stage]);
  useEffect(() => {
    if (stage !== "draw") {
      clearRitualTimers();
      if (stage === "cardMeaning") return;
      setRitualPhase("grounding");
      setRitualDrawnCount(0);
      setRitualSelectedCards([]);
      setSelectedFanIndex(null);
    }
    return clearRitualTimers;
  }, [stage, cardMeaningReturnStage, selectedSpread.cards]);

  useEffect(() => {
    if (stage === "draw" && tarotError && !tarotGenerating) setRitualPhase("grounding");
  }, [stage, tarotError, tarotGenerating]);

  const animateRitualCard = (cardNumber: number) => {
    void playTarotRevealHaptic();
    setRitualPhase(cardNumber === 1 ? "draw_card_1" : cardNumber === 2 ? "draw_card_2" : "draw_card_3");
    setRitualDrawnCount(cardNumber);
    tarotScrollRef.current?.scrollTo({ y: 0, animated: !reduceRitualMotion });
  };

  const handleDraw = () => {
    if (tarotGenerating || ritualPhase !== "grounding") return;
    if (ritualDrawnCount === selectedSpread.cards && ritualSelectedCards.length === selectedSpread.cards) {
      setRitualPhase("reveal");
      onDraw(ritualSelectedCards);
      return;
    }
    // Check the allowance before the first card, not after the whole ritual.
    if (!canViewContentTier(selectedDeck.accessTier, displayedTier) || (ritualDrawnCount === 0 && tarotCreditBalance <= 0)) {
      onDraw();
      return;
    }
    clearRitualTimers();
    const nextCount = Math.min(ritualDrawnCount + 1, selectedSpread.cards);
    const nextSelectedCards = ritualSelectedCards.length === selectedSpread.cards
      ? ritualSelectedCards
      : selectTarotCards(tarotSpread, language);
    setRitualSelectedCards(nextSelectedCards);
    animateRitualCard(nextCount);

    if (nextCount >= selectedSpread.cards) {
      ritualTimers.current.push(setTimeout(() => {
        setRitualPhase("grounding");
      }, 800));
      return;
    }

    ritualTimers.current.push(setTimeout(() => {
      setRitualPhase("pause_and_breathe");
    }, 420));
    ritualTimers.current.push(setTimeout(() => {
      setRitualPhase("grounding");
    }, 1350));
  };

  // Reveals every card not yet drawn; the allowance is checked only before the first card.
  const handleQuickDraw = () => {
    if (tarotGenerating || ritualPhase !== "grounding" || ritualDrawnCount >= selectedSpread.cards) return;
    if (!canViewContentTier(selectedDeck.accessTier, displayedTier) || (ritualDrawnCount === 0 && tarotCreditBalance <= 0)) {
      onDraw();
      return;
    }
    clearRitualTimers();
    setSelectedFanIndex(null);
    setRitualPhase("pause_and_breathe");
    if (ritualSelectedCards.length !== selectedSpread.cards) setRitualSelectedCards(selectTarotCards(tarotSpread, language));
    for (let index = ritualDrawnCount; index < selectedSpread.cards; index += 1) {
      ritualTimers.current.push(setTimeout(() => {
        animateRitualCard(index + 1);
      }, 220 + (index - ritualDrawnCount) * 520));
    }
    ritualTimers.current.push(setTimeout(() => {
      setRitualPhase("grounding");
    }, 620 + (selectedSpread.cards - ritualDrawnCount) * 520));
  };
  // Tapping a fanned card raises it; tapping it again (or the main button) turns it over.
  const handleFanSelect = (index: number) => {
    if (selectedFanIndex === index) { setSelectedFanIndex(null); handleDraw(); return; }
    setSelectedFanIndex(index);
  };
  const saveTarotReading = () => {
    if (!reading) return;
    onSave({
      sourceType: "tarot",
      sourceId: reading.id,
      title: `${localizedText(reading.deck.name, language)} - ${localizedText(spreads.find((spread) => spread.id === reading.spread), language, reading.spread)}`,
      summary: reading.summary,
      sourceSnapshot: {
        type: "tarot_reading",
        readingId: reading.id,
        deckId: reading.deck.id,
        spread: reading.spread,
        topic: reading.topic,
        question: reading.question,
        language: reading.language ?? language,
        cards: reading.cards,
        sections: reading.sections,
        provenance: reading.provenance,
        contentVersion: reading.contentVersion,
        promptVersionId: reading.promptVersionId,
        synthesis: reading.synthesis,
        reflectionPrompt: reading.reflectionPrompt,
        moderationStatus: reading.moderationStatus
      }
    });
  };
  const hasFloatingTarotPrimary = stage === "topic" || stage === "spread" || stage === "deck" || stage === "draw";
  const drawStepActionLabel =
    !canViewContentTier(selectedDeck.accessTier, displayedTier)
      ? c.upgrade
      : tarotGenerating || ritualPhase === "reveal"
        ? c.generatingReading
        : drawActionBusy
          ? language === "vi" ? "Dừng một nhịp" : "Pause a breath"
          : ritualDrawnCount === 0
            ? language === "vi" ? "Rút lá đầu tiên" : "Draw first card"
            : ritualDrawnCount < selectedSpread.cards
              ? language === "vi" ? "Rút lá tiếp theo" : "Draw next card"
              : language === "vi" ? "Xem thông điệp" : "View message";
  const floatingTarotPrimaryLabel =
    stage === "topic" ? (language === "vi" ? "Bắt đầu rút bài" : "Start drawing") : stage === "spread" ? c.continue : stage === "deck"
      ? deckSelectionActionLabel
      : tarotGenerating
        ? c.generatingReading
        : !canViewContentTier(selectedDeck.accessTier, displayedTier)
          ? c.upgrade
          : selectedFanIndex !== null && ritualDrawnCount < selectedSpread.cards
            ? language === "vi" ? "Lật lá này" : "Turn this card"
            : drawStepActionLabel;
  // Design: arrow only on the steps that move forward; the draw button is text only.
  const floatingTarotPrimaryIcon =
    stage === "deck" || stage === "topic" || stage === "spread"
      ? "arrow-forward-outline"
      : !canViewContentTier(selectedDeck.accessTier, displayedTier)
        ? "lock-closed-outline"
        : null;
  const handleFloatingTarotPrimary = () => {
    if (stage === "topic") { setStage("draw"); return; }
    if (stage === "spread") { setStage(keepSelectedDeck ? "draw" : "deck"); return; }
    if (stage === "deck") {
      if (intentionReviewed) setStage("draw");
      else { onKeepSelectedDeckChange(true); setStage("topic"); }
      return;
    }
    setSelectedFanIndex(null);
    handleDraw();
  };
  const renderTarotLearningEntry = (compact = false) => (
    <Pressable accessibilityRole="button" onPress={() => setStage("learn")} style={[styles.tarotLearningPanel, compact && styles.tarotLearningPanelCompact]}>
      <View style={styles.tarotLearningHeader}>
        <View style={styles.tarotLearningIcon}>
          <Ionicons name="school-outline" size={20} color={colors.gold} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.tarotLearningKicker}>{language === "vi" ? "Thư viện học" : "Learning library"}</Text>
          <Text style={styles.tarotLearningTitle}>{language === "vi" ? "Nhập môn Tarot" : "Tarot foundations"}</Text>
        </View>
        <Ionicons name="arrow-forward-outline" size={18} color={colors.gold} />
      </View>
      <Text style={styles.tarotLearningIntro}>
        {language === "vi"
          ? "Một màn học riêng với nhiều cấp độ: cách đặt câu hỏi, đọc xuôi/ngược, hiểu bộ Ẩn, kết hợp lá và kiểm chứng cách AI diễn giải."
          : "A dedicated learning space for levels: asking better questions, upright/reversed cards, arcana, combining cards, and verifying AI interpretation."}
      </Text>
      <View style={styles.tarotLearningPillRow}>
        {tarotLearningModules.slice(0, 4).map((module) => (
          <Text key={localizedText(module.title, language)} style={styles.tarotLearningPill}>{localizedText(module.level, language)}</Text>
        ))}
      </View>
      <Text style={styles.tarotLearningNote}>
        {language === "vi" ? "Mở thư viện để học theo hành trình, không chỉ đọc tóm tắt." : "Open the library to learn by journey, not just a short summary."}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.tarotShell}>
      {stage !== "cardMeaning" ? (
        <View style={[styles.subTopBar, isEditorialStage && styles.editorialTopBar]}>
          <Pressable hitSlop={8} accessibilityLabel={c.back} accessibilityRole="button" onPress={onBack} style={styles.editorialTopIcon}>
            {isEditorialStage ? <Ionicons name="arrow-back-outline" size={24} color={colors.ivory} /> : <Text style={styles.backText} numberOfLines={1}>{"<"} {c.back}</Text>}
          </Pressable>
          {stage === "topic" || stage === "draw" ? (
            <Text style={styles.tarotStepKicker}>{language === "vi" ? "Trải bài" : "Reading"} · {language === "vi" ? "Bước" : "Step"} {stage === "topic" ? 1 : 2}/2</Text>
          ) : stage === "result" && reading ? (
            <Text style={styles.tarotStepKicker} numberOfLines={1}>{localizedText(topics.find((topic) => topic.id === reading.topic), language, selectedTopicLabel)} · {reading.selected.length} {language === "vi" ? "lá" : reading.selected.length === 1 ? "card" : "cards"} · {localizedText(reading.deck.name, language)}</Text>
          ) : isEditorialStage ? (
            <Brand variant="horizontal" width={104} />
          ) : (
            <Text style={styles.subTopTitle}>Tarot</Text>
          )}
          {stage === "topic" || stage === "draw" ? (
            <View style={styles.editorialTopIcon} />
          ) : (
            <Pressable hitSlop={8} accessibilityLabel={language === "vi" ? "Bắt đầu lại" : "Start over"} accessibilityRole="button" onPress={onStartOver} style={styles.editorialTopIcon}>
              {isEditorialStage ? <Ionicons name={topBarRight} size={18} color={colors.gold} /> : <Text style={styles.backText} numberOfLines={1}>{language === "vi" ? "Mới" : "New"}</Text>}
            </Pressable>
          )}
        </View>
      ) : stage === "cardMeaning" && activeMeaningCard ? (
        <View style={[styles.cardMeaningTopBar, styles.cardMeaningStickyTopBar]}>
          <Pressable accessibilityRole="button" style={styles.cardMeaningHeaderButton} onPress={() => setStage(resolvedCardMeaningReturnStage)}>
            <Ionicons name="chevron-back-outline" size={18} color={colors.ivory} />
            <Text style={styles.cardMeaningHeaderButtonText}>{cardMeaningBackLabel}</Text>
          </Pressable>
          <View style={styles.cardMeaningTopContext}>
            <Text style={styles.cardMeaningTopKicker}>{language === "vi" ? "Thư viện" : "Library"} · {activeMeaningCardIndex + 1}/{cards.length}</Text>
            <Text style={styles.cardMeaningTopTitle} numberOfLines={1}>
              {displayTarotCardName(activeMeaningCard, language)} · {localizedText(selectedDeck.name, language)}
            </Text>
          </View>
          {showCardMeaningLibraryAction ? (
            <Pressable hitSlop={8} accessibilityLabel={cardMeaningLibraryLabel} accessibilityRole="button" style={styles.cardMeaningLibraryButton} onPress={() => setStage("library")}>
              <Ionicons name="albums-outline" size={17} color={colors.gold} />
            </Pressable>
          ) : (
            <View style={styles.cardMeaningTopSpacer} />
          )}
        </View>
      ) : null}
      <ScrollView
        ref={tarotScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.tarotContent, (hasFloatingTarotPrimary || (stage === "result" && reading)) && styles.tarotContentDocked]}
        onScroll={handleTarotScroll}
        scrollEventThrottle={16}
      >
        {stage === "intro" && (
          <View>
            <Header eyebrow="Tarot" title={c.tarotIntroTitle} />
            <Text style={styles.leadLeft}>{c.tarotIntroText}</Text>
            <View style={styles.tarotLandingPanel}>
              <Image source={selectedDeckPreviewCards[0]} style={styles.tarotLandingImage} resizeMode="cover" />
              <View style={styles.tarotLandingCopy}>
                <Text style={styles.kicker}>{language === "vi" ? "Bộ bài gần nhất" : "Current deck"}</Text>
                <Text style={styles.resultCardTitle}>{localizedText(selectedDeck.name, language)}</Text>
                <Text style={styles.cardDescription}>{localizedText(selectedDeck.shortDescription, language)}</Text>
              </View>
            </View>
            <View style={styles.choiceStack}>
              <Pressable accessibilityRole="button" style={[styles.journeyOption, styles.journeyOptionFeatured]} onPress={() => setStage("learn")}>
                <Ionicons name="school-outline" size={22} color={colors.gold} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{language === "vi" ? "Học Tarot trước" : "Learn Tarot first"}</Text>
                  <Text style={styles.cardDescription}>{language === "vi" ? "Đi theo thư viện nhiều cấp độ để hiểu cách rút, đọc xuôi/ngược và kiểm chứng AI." : "Use the level-based library to understand drawing, reversals, and AI interpretation."}</Text>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.journeyOption} onPress={() => setStage("topic")}>
                <Ionicons name="sparkles-outline" size={22} color={colors.gold} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{language === "vi" ? "Bắt đầu trải bài" : "Start a reading"}</Text>
                  <Text style={styles.cardDescription}>{language === "vi" ? "Chọn chủ đề, kiểu trải bài, rồi mới chọn bộ bài phù hợp." : "Choose a topic, spread, then select the right deck."}</Text>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.journeyOption} onPress={() => setStage("deck")}>
                <Ionicons name="albums-outline" size={22} color={colors.gold} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{c.learnDeck}</Text>
                  <Text style={styles.cardDescription}>{language === "vi" ? "Xem vibe, phong cách đọc và bộ này hợp câu hỏi nào." : "See the vibe, reading style, and what this deck supports."}</Text>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.journeyOption} onPress={() => { onKeepSelectedDeckChange(true); onSpreadChange("daily-one"); setStage("topic"); }}>
                <Ionicons name="flash-outline" size={22} color={colors.gold} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{c.quickDraw}</Text>
                  <Text style={styles.cardDescription}>{language === "vi" ? "Giữ bộ bài hiện tại, đặt ý định hoặc bỏ qua rồi rút một lá." : "Keep the current deck, set or skip an intention, then draw one card."}</Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {stage === "learn" && (
          <View style={styles.tarotLearningScreen}>
            <View style={styles.tarotLearningHero}>
              <Text style={styles.tarotLearningHeroKicker}>{language === "vi" ? "Thư viện học Tarot" : "Tarot learning library"}</Text>
              <Text style={styles.tarotLearningHeroTitle}>{language === "vi" ? "Hiểu cách lá bài nói, rồi hãy để Nilaza đọc cùng bạn" : "Learn how cards speak, then let Nilaza read with you"}</Text>
              <Text style={styles.tarotLearningHeroBody}>
                {language === "vi"
                  ? "Không cần học thuộc 78 lá ngay. Hãy đi theo từng lớp: nền tảng, cách rút, nhóm lá, xuôi/ngược, kết hợp trải bài và cách kiểm chứng AI."
                  : "You do not need to memorize 78 cards at once. Move through layers: foundations, drawing, card families, reversals, spread synthesis, and AI trust."}
              </Text>
              <View style={styles.tarotLearningStatsRow}>
                <MiniStat label={language === "vi" ? "Cấp độ" : "Levels"} value="6" />
                <MiniStat label={language === "vi" ? "Lá bài" : "Cards"} value="78" />
                <MiniStat label={language === "vi" ? "Mục tiêu" : "Goal"} value={language === "vi" ? "Tin cậy" : "Trust"} />
              </View>
            </View>

            <View style={styles.tarotLearningPathRail}>
              {tarotLearningModules.map((module, index) => (
                <Pressable key={`${module.icon}-${index}`} accessibilityRole="button" accessibilityState={{ selected: index === activeLearningLesson }}
                  onPress={() => setActiveLearningLesson(index)} style={[styles.tarotLearningPathStep, { minHeight: layout.minimumTouchTarget }]}>
                  <Text style={styles.tarotLearningPathNumber}>{index + 1}</Text>
                  <Text style={styles.tarotLearningPathLabel}>{localizedText(module.level, language)}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.tarotLearningModuleStack}>
              {tarotLearningModules.map((module, index) => index === activeLearningLesson ? (
                <View key={localizedText(module.title, language)} style={styles.tarotLearningModuleCard}>
                  <View style={styles.tarotLearningModuleHeader}>
                    <View style={styles.tarotLearningModuleIcon}>
                      <Ionicons name={module.icon} size={20} color={colors.gold} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.tarotLearningModuleLevel}>{localizedText(module.level, language)} · {language === "vi" ? `Bài ${index + 1}` : `Lesson ${index + 1}`}</Text>
                      <Text style={styles.tarotLearningModuleTitle}>{localizedText(module.title, language)}</Text>
                    </View>
                  </View>
                  <Text style={styles.tarotLearningModuleSummary}>{localizedText(module.summary, language)}</Text>
                  <View style={styles.tarotLearningBulletList}>
                    {localizedList(module.bullets, language).map((bullet) => (
                      <View key={bullet} style={styles.tarotLearningBulletRow}>
                        <Ionicons name="checkmark-circle-outline" size={15} color={colors.gold} />
                        <Text style={styles.tarotLearningBulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.tarotLearningPracticeBox}>
                    <Text style={styles.tarotLearningPracticeLabel}>{language === "vi" ? "Thực hành nhỏ" : "Small practice"}</Text>
                    <Text style={styles.tarotLearningPracticeText}>{localizedText(module.practice, language)}</Text>
                  </View>
                </View>
              ) : null)}
            </View>

            <View style={styles.tarotLearningActionPanel}>
              <Text style={styles.tarotLearningActionTitle}>{language === "vi" ? "Sẵn sàng thực hành?" : "Ready to practice?"}</Text>
              <Text style={styles.tarotLearningActionBody}>
                {language === "vi"
                  ? "Bạn có thể đặt ý định để rút bài, hoặc quay về bộ bài để xem ý nghĩa từng lá trong thư viện 78 lá."
                  : "Set an intention to draw, or return to the deck and study individual meanings in the 78-card library."}
              </Text>
              <View style={styles.tarotLearningActionRow}>
                <Pressable accessibilityRole="button" style={styles.tarotLearningSecondaryAction} onPress={() => setStage("deckDetail")}>
                  <Text style={styles.tarotLearningSecondaryActionText}>{language === "vi" ? "Xem thư viện lá" : "Card library"}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" style={styles.tarotLearningPrimaryAction} onPress={() => {
                  onKeepSelectedDeckChange(true); onSpreadChange("daily-one"); onTopicChange("self");
                  onQuestionChange(language === "vi" ? tarotQuestionExamples.self.vi[0] : tarotQuestionExamples.self.en[0]); setStage("topic");
                }}>
                  <Text style={styles.tarotLearningPrimaryActionText}>{language === "vi" ? "Thực hành một lá" : "Practice with one card"}</Text>
                  <Ionicons name="arrow-forward-outline" size={17} color={colors.ink} />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {stage === "topic" && (
          <TarotAskStep
            language={language}
            question={tarotQuestion}
            onQuestionChange={onQuestionChange}
            topic={tarotTopic}
            topics={topicGridItems.map((topic) => ({ id: topic.id as AskTopic, label: localizedText(topic, language) }))}
            onTopicChange={onTopicChange}
            examples={localizedList(tarotQuestionExamples[tarotTopic], language)}
            spreads={spreads.map((spread) => ({
              id: spread.id,
              cards: spread.cards,
              title: spread.tile ? localizedText(spread.tile.title, language) : language === "vi" ? `${spread.cards} lá` : `${spread.cards} ${spread.cards === 1 ? "card" : "cards"}`,
              detail: spread.tile ? localizedText(spread.tile.detail, language) : spread.cards === 1 ? (language === "vi" ? "Nhanh, một lời nhắn" : "Quick, one message") : localizedList(spread.labels, language).join(" · ")
            }))}
            spreadId={tarotSpread}
            onSpreadChange={(spreadId) => onSpreadChange(spreadId as TarotSpread)}
            deck={{ name: localizedText(selectedDeck.name, language), detail: localizedText(selectedDeck.vibe, language), cover: getDeckThumbnailImage(selectedDeck.id), comingSoon: !canViewContentTier(selectedDeck.accessTier, displayedTier) }}
            onChangeDeck={() => { onKeepSelectedDeckChange(false); setStage("deck"); }}
          />
        )}

        {stage === "spread" && (
          <View>
            <Header eyebrow={language === "vi" ? "Trải bài Tarot" : "Tarot spread"} title={c.chooseSpread} />
            <Text style={styles.leadLeft}>
              {language === "vi"
                ? "Một lá hợp phản chiếu nhanh; ba lá dành cho câu hỏi cần nhiều góc nhìn."
                : "One card supports a quick reflection; three cards offer more perspectives on a question."}
            </Text>
            <View style={styles.choiceStack}>
              {spreads.map((spread) => (
                <SpreadOptionCard
                  key={spread.id}
                  active={tarotSpread === spread.id}
                  cards={spread.cards}
                  detail={localizedText(spread.detail, language)}
                  example={localizedText(spread.learn.example, language)}
                  bestFor={localizedText(spread.learn.bestFor, language)}
                  label={localizedText(spread, language)}
                  avoidWhen={localizedText(spread.learn.avoidWhen, language)}
                  positionLabels={localizedList(spread.labels, language)}
                  language={language}
                  onPress={() => onSpreadChange(spread.id)}
                />
              ))}
            </View>
            <Text style={styles.disclaimer}>{language === "vi" ? "Trải bài dùng để tự phản chiếu, không phải dự đoán chắc chắn." : "Readings are for reflection, not certain predictions."}</Text>
          </View>
        )}

        {stage === "deck" && (
          <View style={styles.editorialStage}>
            <View style={styles.editorialHeroLeft}>
              <Text style={styles.editorialDisplayLeft}>{editorialDeckTitle}</Text>
              <Text style={styles.editorialSupportLeft}>{editorialDeckBody}</Text>
            </View>
            {premiumDeckNotice ? <Text accessibilityLiveRegion="polite" style={styles.cardDescription}>{premiumDeckNotice}</Text> : null}
            <ResponsiveGrid minItemWidth={280} style={styles.editorialDeckStack}>
              {editorialDecks.map((deck) => {
                const selected = deck.id === selectedDeckId;
                const isFreeDeck = canViewContentTier(deck.accessTier, displayedTier);
                const deckName = localizedText(deck.name, language);
                // Analysis TA-14: the card selects, the Learn button is a separate 48px target.
                return (
                  <View key={deck.id} style={[styles.editorialDeckCard, selected && styles.editorialDeckCardSelected]}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected, checked: selected, disabled: !isFreeDeck }}
                    aria-checked={selected}
                    accessibilityLabel={`${deckName}. ${isFreeDeck ? (language === "vi" ? "Đã gồm" : "Included") : (language === "vi" ? "Sắp ra mắt" : "Coming soon")}`}
                    // Analysis TA-09 (Owner 2026-11-02): a Premium deck can be previewed (Learn) but not chosen
                    // on a Free account, so nobody walks four steps to a locked button.
                    onPress={() => {
                      if (isFreeDeck) { setSelectedDeckId(deck.id); setPremiumDeckNotice(""); }
                      else setPremiumDeckNotice(c.premiumDeckPreview);
                    }}
                  >
                    <View style={styles.editorialDeckArtFrame}>
                      <Image source={getDeckThumbnailImage(deck.id)} style={styles.editorialDeckImage} resizeMode="contain" />
                      <View pointerEvents="none" style={styles.editorialDeckShade} />
                      <View style={styles.editorialDeckBadgeRow}>
                        <Text style={[styles.editorialDeckBadge, !isFreeDeck && styles.editorialDeckBadgePremium]}>
                          {isFreeDeck ? (language === "vi" ? "Đã gồm" : "Included") : (language === "vi" ? "Sắp ra mắt" : "Coming soon")}
                        </Text>
                        <View style={[styles.editorialDeckCheck, selected && styles.editorialDeckCheckActive]}>
                          {selected ? <Ionicons name="checkmark" size={14} color={colors.ink} /> : null}
                        </View>
                      </View>
                    </View>
                    <View style={[styles.editorialDeckCopy, styles.editorialDeckCopyTop]}>
                      <Text style={styles.editorialDeckName}>{deckName}</Text>
                      <Text numberOfLines={2} style={styles.editorialDeckDescription}>{localizedText(deck.shortDescription, language)}</Text>
                    </View>
                  </Pressable>
                    <View style={[styles.editorialDeckCopy, styles.editorialDeckCopyBottom]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${language === "vi" ? "Tìm hiểu bộ bài" : "Learn about"} ${deckName}`}
                        style={styles.editorialDeckLearnButton}
                        onPress={() => {
                          setSelectedDeckId(deck.id);
                          setStage("deckDetail");
                        }}
                      >
                        <Text style={styles.editorialDeckLearnButtonText}>{language === "vi" ? "Tìm hiểu bộ này" : "Learn about this deck"}</Text>
                        <Ionicons name="book-outline" size={16} color={colors.gold} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ResponsiveGrid>
          </View>
        )}

        {stage === "library" && (
          <CardLibrary
            language={language}
            deckName={localizedText(selectedDeck.name, language)}
            cards={cards.map((card) => ({
              id: card.id,
              group: card.arcana === "major" ? "major" as const : (card.suit as "cups" | "wands" | "swords" | "pentacles"),
              name: displayTarotCardName(card, language),
              sub: [card.arcana === "major" ? (majorNumerals[card.number] ?? String(card.number)) : "", displayTarotCardSubtitle(card, language)].filter(Boolean).join(" · "),
              image: getTarotCardImage(selectedDeck.id, card.id),
              learned: learnedCardIds.includes(card.id)
            }))}
            onOpen={(id) => {
              const card = cards.find((item) => item.id === id);
              if (card) openCardMeaning(card, "library");
            }}
            onPreview={(id) => {
              const card = cards.find((item) => item.id === id);
              if (card) openFullscreenTarotCard(card);
            }}
          />
        )}

        {stage === "deckDetail" && (
          <View>
            <View style={styles.deckDetailHero}>
              <View style={styles.deckDetailHeroCopy}>
                <Text style={styles.deckDetailAccess}>{canViewContentTier(selectedDeck.accessTier, displayedTier) ? (language === "vi" ? "Đã gồm" : "Included") : (language === "vi" ? "Sắp ra mắt" : "Coming soon")}</Text>
                <Text style={styles.deckDetailTitle}>{localizedText(selectedDeck.name, language)}</Text>
                <Text style={styles.deckDetailSubtitle}>{localizedText(selectedDeck.shortDescription, language)}</Text>
              </View>
              <View style={styles.deckDetailArtFrame}>
                <Image source={selectedDeckHeroImage} style={styles.deckDetailHeroImage} resizeMode="contain" />
              </View>
            </View>
            <View style={styles.deckStoryPanel}>
              <View style={styles.deckStoryHeader}>
                <Ionicons name="book-outline" size={18} color={colors.gold} />
                <Text style={styles.deckStoryKicker}>{language === "vi" ? "Câu chuyện bộ bài" : "Deck story"}</Text>
              </View>
              <Text style={styles.deckStoryBodyHero}>{localizedText(deckStory.origin, language)}</Text>
            </View>
            <View style={styles.deckTraitGrid}>
              {deckDetailTraits.map((trait) => (
                <View key={trait.label} style={styles.deckTraitCard}>
                  <Ionicons name={trait.icon} size={18} color={colors.gold} />
                  <Text style={styles.deckTraitLabel}>{trait.label}</Text>
                  <Text style={styles.deckTraitValue}>{trait.value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.deckStoryPanel}>
              <Text style={styles.deckStoryTitle}>
                {language === "vi" ? `Vì sao chọn ${localizedText(selectedDeck.name, language)}?` : `Why choose ${localizedText(selectedDeck.name, language)}?`}
              </Text>
              <View style={styles.deckStoryGrid}>
                <InfoBlock label={language === "vi" ? "Hợp với" : "Best for"} value={localizedText(deckStory.ritual, language)} />
                <InfoBlock label={language === "vi" ? "Người dùng phù hợp" : "Best fit"} value={localizedText(deckStory.audience, language)} />
              </View>
              <Text style={styles.deckStoryKicker}>{language === "vi" ? "Câu hỏi nên thử" : "Questions to try"}</Text>
              <View style={styles.deckPromptRail}>
                {deckPromptExamples.map((prompt) => (
                  <Pressable key={prompt} accessibilityRole="button" onPress={() => { onQuestionChange(prompt); onTopicChange("open"); onKeepSelectedDeckChange(true); setStage("topic"); }}
                    style={{ minHeight: layout.minimumTouchTarget, justifyContent: "center" }}>
                    <Text style={styles.deckPromptChip}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.deckExperiencePanel}>
              <View style={styles.deckExperienceHeader}>
                <View style={styles.deckExperienceIcon}>
                  <Ionicons name={canViewContentTier(selectedDeck.accessTier, displayedTier) ? "sparkles-outline" : "diamond-outline"} size={18} color={colors.gold} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.deckStoryKicker}>{deckExperience.label}</Text>
                  <Text style={styles.deckExperienceTitle}>
                    {language === "vi" ? "Một reading sẽ cảm thấy khác như thế nào?" : "How this reading feels different"}
                  </Text>
                </View>
              </View>
              <Text style={styles.deckExperienceSample}>{deckExperience.sample}</Text>
              <View style={styles.deckExperienceUnlockGrid}>
                {deckExperience.unlocks.map((unlock) => (
                  <View key={unlock} style={styles.deckExperienceUnlock}>
                    <Ionicons name="checkmark-circle-outline" size={15} color={colors.gold} />
                    <Text style={styles.deckExperienceUnlockText}>{unlock}</Text>
                  </View>
                ))}
              </View>
            </View>
            {deckSections.length > 0 ? (
              <View>
                <SectionLabel>{c.deckComposition}</SectionLabel>
                {deckSections.map((section) => (
                  <ContentBlock
                    key={section.id}
                    title={localizedText(section.title, language, section.sectionKey)}
                    body={localizedText(section.body, language)}
                    meta={localizedText(section.subtitle, language)}
                  />
                ))}
              </View>
            ) : null}
            {renderTarotLearningEntry(true)}
            <Pressable accessibilityRole="button" onPress={() => setStage("library")} style={styles.deckLibraryLink}>
              <Ionicons name="albums-outline" size={20} color={colors.gold} />
              <View style={styles.flex}>
                <Text style={styles.deckLibraryLinkTitle}>{language === "vi" ? "Thư viện 78 lá" : "78-card library"}</Text>
                <Text style={styles.deckLibraryLinkMeta}>
                  {language === "vi" ? `Đã học ${learnedCardIds.length}/${cards.length} · chạm một lá để xem ý nghĩa` : `Learned ${learnedCardIds.length}/${cards.length} · tap a card for its meaning`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.moon} />
            </Pressable>
          </View>
        )}

        {stage === "cardMeaning" && activeMeaningCard && (
          <TarotCardGuide
            key={`${activeMeaningCard.id}-${activeMeaningFromReading ? (activeMeaningFromReading.reversed ? "r" : "u") : "lib"}`}
            language={language}
            name={displayTarotCardName(activeMeaningCard, language)}
            originalName={displayTarotCardSubtitle(activeMeaningCard, language)}
            arcanaLabel={tarotArcanaLabel(activeMeaningCard, language)}
            image={getTarotCardImage(selectedDeck.id, activeMeaningCard.id)}
            uprightMeaning={localizedText(activeMeaningCard.uprightMeaning, language)}
            reversedMeaning={localizedText(activeMeaningCard.reversedMeaning, language)}
            drawnReversed={activeMeaningFromReading?.reversed}
            drawnPosition={activeMeaningFromReading?.spread || undefined}
            guide={getTarotCardGuide(activeMeaningCard.id, language)}
            practice={localizedText(activeMeaningCard.reflectionQuestion, language)}
            onOpenImage={(reversed) => openFullscreenTarotCard({ ...activeMeaningCard, reversed, spread: activeMeaningFromReading?.spread ?? "" })}
            previous={{ name: displayTarotCardName(previousMeaningCard, language), onPress: () => setSelectedTarotCardId(previousMeaningCard.id) }}
            next={{ name: displayTarotCardName(nextMeaningCard, language), onPress: () => setSelectedTarotCardId(nextMeaningCard.id) }}
          >
            <View style={styles.cardMeaningStoryPanel}>
              <Text style={styles.cardMeaningSectionKicker}>{language === "vi" ? `Trong bộ ${localizedText(selectedDeck.name, language)}` : `In ${localizedText(selectedDeck.name, language)}`}</Text>
              <Text style={styles.cardMeaningBody}>{localizedText(selectedDeck.cardIntroductions?.[activeMeaningCard.id] ?? activeMeaningCard.intro, language)}</Text>
              {activeMeaningKeywords.length ? (
                <View style={styles.cardMeaningChipRow}>
                  {activeMeaningKeywords.slice(0, 3).map((keyword) => (
                    <Text key={keyword} style={styles.cardMeaningChip}>{keyword}</Text>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={styles.cardMeaningStoryPanel}>
              {getTarotLearningSections(activeMeaningCard.id, language).length ? (
                <ReadingDetails key={`${activeMeaningCard.id}-${language}`}
                  label={language === "vi" ? "Hiểu sâu và thực hành với lá này" : "Explore this card in depth"}
                  collapseLabel={language === "vi" ? "Thu gọn bài học" : "Collapse the lesson"}
                  sections={getTarotLearningSections(activeMeaningCard.id, language)} />
              ) : null}
              <Text style={styles.cardMeaningSectionKicker}>{language === "vi" ? "Hình mẫu" : "The archetype"}</Text>
              <Text style={styles.cardMeaningStoryTitle}>{language === "vi" ? "Nếu lá bài này là một người bạn" : "If this card were a guide"}</Text>
              <Text style={styles.cardMeaningBody}>{localizedText(activeMeaningCard.personalityPortrait, language, localizedText(activeMeaningCard.intro, language))}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              style={styles.cardMeaningChatPanel}
              onPress={() => onChatWithCard(activeMeaningCard, selectedDeck, reading)}
            >
              <View style={styles.cardMeaningChatIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.charcoal} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardMeaningChatTitle}>
                  {language === "vi" ? "Trò chuyện với lá này" : "Chat with this card"}
                </Text>
                <Text style={styles.cardMeaningChatBody}>
                  {language === "vi"
                    ? "Hỏi lá bài như một biểu tượng sống của bộ bài này. Nilaza giữ câu trả lời phản chiếu, không dự đoán chắc chắn."
                    : "Ask the card as a living symbol from this deck. Nilaza keeps the answer reflective, not predictive."}
                </Text>
              </View>
              <Ionicons name="arrow-forward-outline" size={18} color={colors.gold} />
            </Pressable>
          </TarotCardGuide>
        )}

        {stage === "draw" && (
          <TarotDrawStep
            language={language}
            question={tarotQuestion}
            slots={localizedList(selectedSpread.labels, language).map((label, index) => {
              const ritualCard = ritualSelectedCards[index];
              const visible = (ritualDrawnCount > index || tarotGenerating) && ritualCard;
              return { label, card: visible ? { name: displayTarotCardName(ritualCard, language), image: getTarotCardImage(selectedDeck.id, ritualCard.id), reversed: ritualCard.reversed } : undefined };
            })}
            backImage={selectedDeckBackImage}
            selectedFanIndex={selectedFanIndex}
            onSelectFan={handleFanSelect}
            onClearSelection={() => setSelectedFanIndex(null)}
            onOpenCard={(index) => { const card = ritualSelectedCards[index]; if (card) openFullscreenTarotCard(card, card.spread); }}
            busy={tarotGenerating || drawActionBusy}
            status={latestRitualCard && ritualPhase === "grounding" && !tarotGenerating ? `${latestRitualCard.spread} · ${displayTarotCardName(latestRitualCard, language)} · ${latestRitualCard.reversed ? (language === "vi" ? "Ngược" : "Reversed") : (language === "vi" ? "Xuôi" : "Upright")}` : ritualPhaseLabel}
            onDrawRest={selectedSpread.cards > 1 ? handleQuickDraw : undefined}
            reduceMotion={reduceRitualMotion}
          >
            {!canViewContentTier(selectedDeck.accessTier, displayedTier) ? (
              <View style={styles.errorPanel}>
                <Text style={styles.errorText}>{c.premiumDeckPreview}</Text>
              </View>
            ) : null}
            {tarotGenerating && <Text style={styles.disclaimer}>{c.generatingReading}</Text>}
            {tarotError && tarotError !== c.premiumDeckPreview ? (
              <View style={styles.errorPanel}>
                <Text style={styles.errorText}>{tarotError}</Text>
              </View>
            ) : null}
          </TarotDrawStep>
        )}

        {stage === "result" && reading && (
          <TarotResultView
            key={reading.id}
            language={language}
            question={reading.question ?? ""}
            cards={reading.selected.map((card, index) => {
              const aiBody = reading.sections
                .filter((section) => section.cardIds?.includes(card.id))
                .map((section) => localizedText(section.body, language))
                .filter(Boolean)
                .join("\n\n");
              return {
                id: card.id,
                position: card.spread,
                name: displayTarotCardName(card, language),
                originalName: displayTarotCardSubtitle(card, language),
                reversed: card.reversed,
                image: getTarotCardImage(selectedDeck.id, card.id),
                body: aiBody || tarotSnapshotMeaning(card, reading.cards[index], language),
                bodySource: aiBody ? "reading" as const : "library" as const,
                keywords: localizedList(card.keywords, language).slice(0, 3),
                onOpenImage: () => openFullscreenTarotCard(card, card.spread),
                onLearn: () => openCardMeaning(card, "result")
              };
            })}
            summary={reading.summary}
            sourceLabel={tarotResultSource(reading.moderationStatus) === "ai"
              ? (language === "vi" ? `Diễn giải AI theo ${reading.selected.length} lá và câu hỏi của bạn · không phải dự đoán chắc chắn` : `AI interpretation of your ${reading.selected.length} cards and question · not a certain prediction`)
              : tarotResultSource(reading.moderationStatus) === "blocked"
                ? (language === "vi" ? "Phản hồi an toàn" : "Safety response")
                : (language === "vi" ? "Ý nghĩa có sẵn · AI chưa hoàn tất" : "Reference meanings · AI not completed")}
            extraSections={reading.sections
              .filter((section) => !section.cardIds?.length)
              .map((section, index) => ({ id: `${section.key}-${index}`, title: localizedText(section.title, language), body: localizedText(section.body, language) }))
              .filter((section) => section.body)}
            reflection={reading.reflection}
            onWriteJournal={onWriteJournal}
          >
            {reading.language && reading.language !== language ? <Text style={styles.muted}>{language === "vi" ? "Đang giữ nguyên ngôn ngữ của bài đọc đã lưu." : "Showing the original language of this saved reading."}</Text> : null}
            {tarotResultSource(reading.moderationStatus) === "reference" && onRetryInterpretation ? (
              <Pressable accessibilityRole="button" disabled={tarotGenerating} accessibilityState={{ disabled: tarotGenerating }}
                onPress={onRetryInterpretation} style={[styles.editorialOutlineButton, tarotGenerating && styles.disabledAction]}>
                <Text style={styles.editorialOutlineButtonText}>{tarotGenerating ? c.generatingReading : language === "vi" ? "Thử diễn giải AI với các lá này" : "Retry AI with these cards"}</Text>
              </Pressable>
            ) : null}
            {tarotError ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{tarotError}</Text> : null}
          </TarotResultView>
        )}
        {stage === "result" && reading ? (
          <TarotGuideSelector
            deck={selectedDeck}
            language={language}
            options={tarotGuideOptions}
            recommendedGuide={recommendedTarotGuide}
            selectedGuide={selectedTarotGuide}
            selectedGuideReason={selectedTarotGuideReason}
            onSelect={(persona) => setSelectedTarotGuideId(persona.id)}
          />
        ) : null}

        {stage === "share" && reading && (
          <View>
            <Header eyebrow={language === "vi" ? "Chia sẻ" : "Share"} title={c.shareReading} />
            {latestShareArtifact ? (
              <View style={styles.sharePreviewCard}>
                <View style={styles.sharePreviewSpread}>
                  {reading.selected.map((card, index) => (
                    <Pressable
                      accessibilityLabel={`${displayTarotCardName(card, language)}. ${language === "vi" ? "Xem hình lá bài toàn màn hình" : "View full-screen card artwork"}`}
                      accessibilityRole="imagebutton"
                      key={`${card.id}-share`}
                      onPress={() => openFullscreenTarotCard(card, card.spread)}
                      style={[styles.sharePreviewCardSlot, index === 1 && styles.sharePreviewCardSlotCenter]}
                    >
                      <Image source={getTarotCardImage(selectedDeck.id, card.id)} style={[styles.sharePreviewImage, reversedCardArt(card)]} resizeMode="contain" />
                      <Text style={styles.sharePreviewCardName}>{displayTarotCardName(card, language)}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.kicker}>{language === "vi" ? "Nội dung sẽ được chia sẻ" : "What will be shared"}</Text>
                <Text style={styles.cardDescription}>{shareReadingText(reading)}</Text>
                <Text style={styles.disclaimer}>{c.sharePrivateNote}</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{language === "vi" ? "Chưa có thẻ chia sẻ" : "No share card yet"}</Text>
                <Text style={styles.muted}>{language === "vi" ? "Tạo bản xem trước để chọn nội dung trước khi chia sẻ." : "Create a preview to check what you share."}</Text>
              </View>
            )}
            {latestShareArtifact ? (
              <PrimaryButton label={language === "vi" ? "Chia sẻ" : "Share"} onPress={shareReadingNow} />
            ) : null}
            {latestShareArtifact ? (
              <SecondaryButton
                label={c.save}
                onPress={() => onSave({
                  sourceType: "share_card",
                  sourceId: latestShareArtifact.id,
                  title: c.shareReading,
                  summary: String(latestShareArtifact.payload.synthesis ?? reading.summary),
                  sourceSnapshot: {
                    type: "share_card",
                    artifactId: latestShareArtifact.id,
                    payload: latestShareArtifact.payload,
                    sourceReadingId: reading.id
                  }
                })}
              />
            ) : null}
            {latestShareArtifact ? null : <SecondaryButton label={c.shareReading} onPress={onCreateShareArtifact} />}
            <SecondaryButton label={c.reading} onPress={() => setStage("result")} />
          </View>
        )}
      </ScrollView>
      {showTarotBackToTop ? (
        <Pressable
          accessibilityLabel={language === "vi" ? "Quay lại đầu trang" : "Back to top"}
          accessibilityRole="button"
          onPress={scrollTarotToTop}
          style={[styles.tarotBackToTopButton, (hasFloatingTarotPrimary || stage === "deckDetail") && styles.tarotBackToTopButtonRaised]}
        >
          <Ionicons name="arrow-up-outline" size={18} color={colors.ink} />
        </Pressable>
      ) : null}
      {stage === "result" && reading ? (
        <TarotResultDock
          language={language}
          onSave={saveTarotReading}
          onAskFurther={() => onAskFollowUp(selectedTarotGuide.id)}
          onShare={onCreateShareArtifact}
          onReport={() => onReportReading(reading.summary, reading.id)}
        />
      ) : null}
      {hasFloatingTarotPrimary ? (
        <Pressable
          accessibilityRole="button"
          disabled={tarotGenerating || drawActionBusy}
          style={[styles.tarotFloatingPrimaryButton, (tarotGenerating || drawActionBusy) && styles.disabledAction]}
          onPress={handleFloatingTarotPrimary}
        >
          <Text style={styles.tarotFloatingPrimaryButtonText}>{floatingTarotPrimaryLabel}</Text>
          {floatingTarotPrimaryIcon ? <Ionicons name={floatingTarotPrimaryIcon} size={18} color={colors.ink} /> : null}
        </Pressable>
      ) : null}
      {stage === "deckDetail" ? (
        <View style={styles.deckDetailActionDock}>
          <Pressable accessibilityRole="button" style={styles.deckDetailDockSecondary} onPress={() => { onKeepSelectedDeckChange(false); setStage("deck"); }}>
            <Ionicons name="albums-outline" size={17} color={colors.ivory} />
            <Text style={styles.deckDetailDockSecondaryText}>{language === "vi" ? "Xem bộ khác" : "Other decks"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.deckDetailDockPrimary} onPress={() => { onKeepSelectedDeckChange(true); setStage("topic"); }}>
            <Text style={styles.deckDetailDockPrimaryText}>{language === "vi" ? "Đặt ý định" : "Set intention"}</Text>
            <Ionicons name="sparkles-outline" size={17} color={colors.ink} />
          </Pressable>
        </View>
      ) : null}
      <Modal
        animationType="fade"
        transparent
        visible={Boolean(fullscreenTarotCard)}
        onRequestClose={() => setFullscreenTarotCard(null)}
      >
        <View accessibilityViewIsModal style={styles.tarotFullscreenOverlay}>
          <SafeAreaView style={styles.tarotFullscreenSafe}>
            {fullscreenTarotCard ? (
              <>
                <View style={styles.tarotFullscreenTopBar}>
                  <View style={styles.flex}>
                    <Text style={styles.tarotFullscreenMeta}>
                      {localizedText(selectedDeck.name, language)} · {fullscreenTarotCard.meta}
                    </Text>
                    <Text style={styles.tarotFullscreenTitle}>{fullscreenCardName}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={language === "vi" ? "Đóng hình lá bài" : "Close card artwork"}
                    hitSlop={8}
                    accessibilityRole="button"
                    onPress={() => setFullscreenTarotCard(null)}
                    style={styles.tarotFullscreenClose}
                  >
                    <Ionicons name="close-outline" size={24} color={colors.ivory} />
                  </Pressable>
                </View>
                <View style={styles.tarotFullscreenImageStage}>
                  <Image source={fullscreenTarotCard.source} style={[styles.tarotFullscreenImage, reversedCardArt(fullscreenTarotCard.card as { reversed?: boolean })]} resizeMode="contain" />
                </View>
                <Pressable accessibilityRole="button" onPress={openFullscreenCardMeaning} style={styles.tarotFullscreenPrimary}>
                  <Text style={styles.tarotFullscreenPrimaryText}>{language === "vi" ? "Xem ý nghĩa lá bài" : "View card meaning"}</Text>
                  <Ionicons name="book-outline" size={17} color={colors.ink} />
                </Pressable>
              </>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

function journalSourceLabel(sourceType: JournalEntry["sourceType"], language: Language) {
  const labels: Record<JournalEntry["sourceType"], { vi: string; en: string }> = {
    astrology: { vi: "Chiêm tinh", en: "Astrology" },
    chat: { vi: "Trò chuyện", en: "Chat guide" },
    daily: { vi: "Hôm nay", en: "Daily insight" },
    tarot: { vi: "Trải bài", en: "Tarot" },
    share_card: { vi: "Chia sẻ", en: "Share card" },
    manual: { vi: "Ghi chú", en: "Note" }
  };
  return localizedText(labels[sourceType], language, sourceType);
}

function moodLabel(moodId: string | undefined, language: Language) {
  const mood = moodOptions.find((item) => item.id === moodId);
  return mood ? localizedText(mood, language) : moodId ?? "";
}

function JournalScreen({
  c,
  draftStore,
  entries,
  initialSelectedEntryId,
  journalMemory,
  language,
  onChat,
  onCreateNote,
  onDelete,
  onOpenSource,
  canOpenSource,
  onTarot,
  onUpdate,
  onComposingChange,
  composePrompt,
  onComposeDone
}: {
  c: Copy;
  draftStore: JournalDraftStore;
  entries: JournalEntry[];
  initialSelectedEntryId?: string | null;
  journalMemory: ReturnType<typeof buildJournalMemory>;
  language: Language;
  onChat: () => void;
  onCreateNote: (draft: Pick<JournalEntry, "title" | "summary" | "mood">) => Promise<boolean>;
  onDelete: (id: string) => void;
  onOpenSource?: (entry: JournalEntry) => void;
  canOpenSource?: (entry: JournalEntry) => boolean;
  onTarot: () => void;
  onUpdate: (id: string, patch: Partial<Pick<JournalEntry, "mood" | "userNote">>) => void;
  onComposingChange?: (composing: boolean) => void;
  composePrompt?: string | null;
  onComposeDone?: () => void;
}) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialSelectedEntryId ?? null);
  const [draftNote, setDraftNote] = useState(journalDraftNoteFor(entries.find(item => item.id === initialSelectedEntryId)));
  // Keep the Home prompt for this visit only; the parent clears it so a later visit opens the list.
  const [prompt, setPrompt] = useState(composePrompt ?? undefined);
  const [composing, setComposing] = useState(Boolean(prompt));
  useEffect(() => {
    if (prompt) onComposeDone?.();
  }, []);
  useEffect(() => {
    onComposingChange?.(composing);
    return () => onComposingChange?.(false);
  }, [composing, onComposingChange]);
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null;
  // A changed note is saved when the person leaves the entry by the arrow, Android Back or a tab change.
  const pendingNote = useSaveNoteOnLeave(
    selectedEntry && draftNote.trim() !== journalDraftNoteFor(selectedEntry).trim() ? { id: selectedEntry.id, note: draftNote.trim() } : null,
    (id, note) => onUpdate(id, { userNote: note })
  );
  if (composing) return <JournalComposer language={language} draftStore={draftStore} prompt={prompt} onSave={onCreateNote}
    onClose={() => setComposing(false)} />;

  if (selectedEntry) {
    const openSource = () => onOpenSource?.(selectedEntry);
    return (
      <View>
        <View style={styles.subTopBarInline}>
          <IconButton name="arrow-back-outline" onPress={() => {
            pendingNote.flush();
            setSelectedEntryId(null);
          }} />
          <Text style={styles.subTopTitle}>{language === "vi" ? "Nhật ký" : "Journal"}</Text>
          <IconButton
            name="trash-outline"
            onPress={() => {
              pendingNote.drop();
              onDelete(selectedEntry.id);
              setSelectedEntryId(null);
            }}
          />
        </View>
        <View style={styles.journalDetailHero}>
          <Text style={styles.resultBadge}>{journalSourceLabel(selectedEntry.sourceType, language)}</Text>
          <Text style={styles.personaDetailTitle}>{selectedEntry.title}</Text>
          <Text style={styles.disclaimer}>{formatLocalDateTime(selectedEntry.createdAt, language)}</Text>
          <Text style={styles.personaDetailBody}>{journalEntryBody(selectedEntry)}</Text>
          <StatusLine label={language === "vi" ? "Lưu trữ" : "Storage"}
            status={selectedEntry.syncStatus === "synced" ? (language === "vi" ? "Đã đồng bộ" : "Synced") : (language === "vi" ? "Đã lưu trên máy" : "Saved on device")}
            tone={selectedEntry.syncStatus === "synced" ? "good" : "neutral"} />
        </View>

        {selectedEntry.sourceSnapshot && selectedEntry.sourceType !== "manual" ? (
          <View style={styles.snapshotPanel}>
            <Text style={styles.kicker}>{language === "vi" ? "Nội dung gốc đã lưu" : "Saved source content"}</Text>
            <Text style={styles.cardDescription}>
              {journalSourceLabel(selectedEntry.sourceType, language)}
              {(selectedEntry.sourceSnapshot as any).deckId && findTarotDeckById(decksById, (selectedEntry.sourceSnapshot as any).deckId) ? ` / ${localizedText(findTarotDeckById(decksById, (selectedEntry.sourceSnapshot as any).deckId)!.name, language)}` : ""}
              {(selectedEntry.sourceSnapshot as any).personaName ? ` / ${(selectedEntry.sourceSnapshot as any).personaName}` : ""}
            </Text>
            {savedReadingCards(selectedEntry.sourceSnapshot, language).some((card) => cards.some((item) => item.id === card.id)) ? (
              <View style={styles.savedCardRow}>
                {savedReadingCards(selectedEntry.sourceSnapshot, language).flatMap((card) => {
                  const known = cards.find((item) => item.id === card.id);
                  return known ? [{ ...card, label: displayTarotCardInline(known, language) }] : [];
                }).map((card, index) => (
                  <Image
                    key={`${index}-${card.id}`}
                    accessibilityLabel={`${card.position ? `${card.position}: ` : ""}${card.label}, ${card.reversed ? (language === "vi" ? "Ngược" : "Reversed") : (language === "vi" ? "Xuôi" : "Upright")}`}
                    source={getTarotCardImage(String((selectedEntry.sourceSnapshot as any).deckId ?? ""), card.id)}
                    style={[styles.savedCardThumb, card.reversed && reversedCardArtStyle]}
                    resizeMode="cover"
                  />
                ))}
              </View>
            ) : null}
            {savedReadingLines(selectedEntry.sourceSnapshot, language).map((line, index) => (
              <Text key={`${index}-${line}`} style={styles.sourcePath}>{line}</Text>
            ))}
          </View>
        ) : null}

        {selectedEntry.sourceSnapshot?.type === "tarot_reading" ? <ReadingDetails key={selectedEntry.id}
          label={language === "vi" ? "Đọc diễn giải đã lưu" : "Read the saved interpretation"}
          collapseLabel={language === "vi" ? "Thu gọn diễn giải" : "Collapse interpretation"}
          sections={normalizeTarotSections(selectedEntry.sourceSnapshot.sections, language).map((section, index) => ({
            id: `${section.key}-${index}`, title: localizedText(section.title, language), body: localizedText(section.body, language),
          }))} /> : null}

        <Text style={styles.sectionKicker}>{language === "vi" ? "Cảm xúc của bạn" : "Your mood"}</Text>
        <View style={styles.wrap}>
          {moodOptions.map((mood) => (
            <Chip
              key={mood.id}
              active={selectedEntry.mood === mood.id}
              label={localizedText(mood, language)}
              onPress={() => onUpdate(selectedEntry.id, { mood: mood.id })}
            />
          ))}
        </View>

        <Text style={styles.sectionKicker}>{language === "vi" ? "Ghi chú riêng" : "Private note"}</Text>
        <TextInput
          value={draftNote}
          onChangeText={setDraftNote}
          placeholder={language === "vi" ? "Bạn muốn nhớ điều gì từ mục này?" : "What do you want to remember from this insight?"}
          placeholderTextColor={colors.moon}
          style={styles.noteInput}
          maxLength={10000}
          multiline
        />
        <PrimaryButton label={language === "vi" ? "Lưu ghi chú" : "Save note"} onPress={() => onUpdate(selectedEntry.id, { userNote: draftNote.trim() })} />
        {selectedEntry.sourceType !== "manual" && canOpenSource?.(selectedEntry) ? <SecondaryButton label={language === "vi" ? "Mở lại nguồn" : "Reopen source"} onPress={openSource} /> : null}
      </View>
    );
  }

  return (
    <JournalHome
      language={language}
      now={new Date()}
      entries={entries}
      moodLabel={(mood) => moodLabel(mood, language)}
      sourceLabel={(sourceType) => journalSourceLabel(sourceType, language)}
      bodyOf={journalEntryBody}
      onWrite={(text) => {
        setPrompt(text);
        setComposing(true);
      }}
      onOpenEntry={(entry) => {
        setSelectedEntryId(entry.id);
        setDraftNote(journalDraftNoteFor(entry));
      }}
      empty={(
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{c.emptyJournal}</Text>
          <Text style={styles.muted}>{language === "vi" ? "Rút bài, viết vài dòng hoặc lưu một câu trả lời từ người dẫn để tạo mục đầu tiên." : "Draw cards, write a few lines or save a guide's answer to create your first entry."}</Text>
          <View style={styles.quickGrid}>
            <ActionTile icon="albums-outline" label={c.drawTarot} detail={language === "vi" ? "Trải bài" : "Tarot"} onPress={() => onTarot()} />
            <ActionTile icon="chatbubble-outline" label={language === "vi" ? "Trò chuyện" : "Chat"} detail="Nilaza Oracle" onPress={onChat} />
          </View>
        </View>
      )}
    />
  );
}

function ProfileScreen({
  c,
  signLabel,
  memberSince,
  readingsCount,
  dailyReminder,
  onDailyReminderChange,
  onDeleteAccount,
  birthDate,
  birthPlace,
  birthTime,
  birthTimeUnknown,
  chatCount,
  chatTurnsToday,
  creditBalance,
  dailyCreditLimit,
  devicePushRegistration,
  artifactCount,
  inAppNotifications,
  journalCount,
  language,
  notificationPreferences,
  profile,
  unreadNotificationCount,
  tarotReadingsToday,
  isAdmin,
  isOwner,
  ownerTierPreview,
  onOwnerTierPreviewChange,
  contentBundleVersion,
  onlineSyncAvailable,
  setBirthDate,
  setBirthPlace,
  setBirthTime,
  setProfile,
  onAdmin,
  onClearBirthProfile,
  onClearChats,
  onClearJournal,
  onDeleteAccountData,
  onDismissNotification,
  onOpenInbox,
  onOpenNotification,
  onEnablePush,
  onExportData,
  onMarkBirthTimeUnknown,
  onMarkNotificationRead,
  onSignOut,
  onToggleNotificationPreference
}: {
  c: Copy;
  birthDate: string;
  birthPlace: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  chatCount: number;
  chatTurnsToday: number;
  creditBalance: number;
  dailyCreditLimit: number;
  devicePushRegistration: DevicePushRegistration | null;
  artifactCount: number;
  inAppNotifications: InAppNotification[];
  journalCount: number;
  language: Language;
  notificationPreferences: NotificationPreference[];
  profile: Profile;
  unreadNotificationCount: number;
  tarotReadingsToday: number;
  isAdmin: boolean;
  isOwner: boolean;
  ownerTierPreview: OwnerTierPreview;
  onOwnerTierPreviewChange: (preview: OwnerTierPreview) => void;
  contentBundleVersion: number | null;
  onlineSyncAvailable: boolean;
  setBirthDate: (text: string) => void;
  setBirthPlace: (text: string) => void;
  setBirthTime: (text: string) => void;
  setProfile: (updater: (current: Profile) => Profile) => void;
  onAdmin: () => void;
  onClearBirthProfile: () => void;
  onClearChats: () => void;
  onClearJournal: () => void;
  onDeleteAccountData: () => void;
  onDismissNotification: (id: string) => void;
  onOpenInbox: () => void;
  onOpenNotification: (notification: InAppNotification) => void;
  onEnablePush: () => void;
  onExportData: () => void;
  onMarkBirthTimeUnknown: () => void;
  onMarkNotificationRead: (id: string) => void;
  onSignOut: () => void;
  onToggleNotificationPreference: (channel: NotificationPreference["channel"], type: NotificationType, enabled: boolean) => void;
  signLabel?: string;
  memberSince?: string;
  readingsCount: number;
  dailyReminder: DailyReminder;
  onDailyReminderChange: (next: DailyReminder) => void;
  onDeleteAccount: () => Promise<string | null>;
}) {
  const currentTone = tones.find((tone) => tone.id === profile.tone);
  const annualPriceMath = getAnnualPriceHypothesisMath();
  const [profileSection, setProfileSection] = useState<"overview" | "identity" | "birth" | "preferences" | "privacy" | "notifications" | "premium" | "account" | "deleteAccount">("overview");
  const hasBirthProfile = Boolean(birthDate || birthTime || birthPlace || birthTimeUnknown);
  const birthTimeLabel = birthTimeUnknown || !birthTime ? c.unknownBirthTime : birthTime;
  const selectedGoals = goals.filter((goal) => profile.goals.includes(goal.id));
  const localDataCount = chatCount + journalCount + artifactCount + (hasBirthProfile ? 1 : 0);
  const profileLabels =
    language === "vi"
      ? {
          title: "Hồ sơ",
          tier: "Người khám phá",
          ritual: "Nhịp phản chiếu",
          streak: "Chuỗi ngày",
          goals: "Ý định",
          data: "Dữ liệu trên máy",
          profileReady: "Hồ sơ đã sẵn sàng",
          profileHint: "Tối ưu cách Nilaza xưng hô, gợi ý người dẫn đường, Tarot và Nhật ký.",
          displayName: "Tên hiển thị",
          displayNameHint: "Tên này hiện trong lời chào trên trang Hôm nay và được gửi cho người dẫn đường khi bạn trò chuyện, để họ gọi bạn bằng tên. Để trống nếu bạn không muốn.",
          savedLocal: "Tự lưu trên thiết bị và đồng bộ khi có kết nối.",
          birthSection: "Hồ sơ ngày sinh",
          birthBody: "Dùng cho chiêm tinh khi bạn chủ động mở tính năng đó. Có thể để trống hoặc xóa riêng bất cứ lúc nào.",
          notSet: "Chưa nhập",
          birthSet: "Đã có hồ sơ ngày sinh",
          preferences: "Cá nhân hóa",
          goalsHint: "Chọn các chủ đề bạn muốn Nilaza ưu tiên.",
          toneHint: "Chọn nhịp trả lời phù hợp với tâm trạng hiện tại.",
          subscription: premiumOnSale ? "Gói Premium & lượt dùng" : "Lượt dùng hôm nay",
          privacySection: "Riêng tư & dữ liệu",
          privacyBody: onlineSyncAvailable
            ? "Dữ liệu có bản lưu trên thiết bị. Hồ sơ và các lịch sử được hỗ trợ có thể đồng bộ với tài khoản; từng mục Nhật ký cho biết đã đồng bộ hay còn lưu trên máy. Bản đồ chiêm tinh được tính trên thiết bị; chỉ gửi dữ kiện và câu hỏi cho AI Chiêm tinh sau khi bạn đồng ý. Đăng xuất không xóa tài khoản trên máy chủ."
            : "Hiện chưa có kết nối đồng bộ tài khoản cho nội dung này. Dữ liệu được lưu trên thiết bị; hãy xuất bản sao trước khi đổi hoặc xóa ứng dụng. Khi dùng tài khoản online, dữ liệu được hỗ trợ có thể được đồng bộ. Astrology AI chỉ nhận dữ kiện và câu hỏi sau khi bạn đồng ý.",
          accountSection: "Tài khoản & vận hành",
          operatorTools: "Công cụ vận hành",
          operatorDetail: "Hướng dẫn, nội dung, tác vụ và an toàn",
          help: "Trợ giúp & hỗ trợ",
          helpDetail: "Hướng dẫn luôn được cập nhật trên website",
          signOut: "Đăng xuất",
          chatsToday: "Trò chuyện hôm nay",
          clearChats: "Xóa trò chuyện trên máy",
          clearJournal: "Xóa Nhật ký trên máy",
          signOutDetail: "Thoát phiên đăng nhập hiện tại",
          birthEmpty: "Trống",
          birthYes: "Có"
        }
      : {
          title: "Profile",
          tier: "Free Seeker",
          ritual: "Personal reflection",
          streak: "Streak",
          goals: "Intentions",
          data: "Local data",
          profileReady: "Profile is ready",
          profileHint: "Tune how Nilaza addresses you, suggests guides, tarot, and journal prompts.",
          displayName: "Display name",
          displayNameHint: "Shown in the greeting on Today and sent to your guide when you chat, so they can call you by name. Leave it empty if you prefer.",
          savedLocal: "Auto-saved on this device and synced when the backend is ready.",
          birthSection: "Birth profile",
          birthBody: "Used for astrology only when you choose to open that feature. You can leave it blank or clear it anytime.",
          notSet: "Not set",
          birthSet: "Birth profile set",
          preferences: "Personalization",
          goalsHint: "Choose what you want Nilaza to prioritize.",
          toneHint: "Choose the response style that fits your current mood.",
          subscription: premiumOnSale ? "Premium & credits" : "Today's usage",
          privacySection: "Privacy & data",
          privacyBody: onlineSyncAvailable
            ? "Data has an on-device copy. Supported profile and history data can sync with your account; each journal entry shows whether it is synced or saved locally. Charts are calculated on device; Astrology AI receives facts and your question only after consent. Signing out does not delete your server account."
            : "Account sync is not currently connected for this content. Data is stored on this device; export a copy before changing devices or removing the app. Supported data can sync when an online account is used. Astrology AI receives facts and your question only after consent.",
          accountSection: "Account & operations",
          operatorTools: "Operator tools",
          operatorDetail: "Prompts, content, jobs, and safety",
          help: "Help & support",
          helpDetail: "Always-current guidance on the website",
          signOut: "Sign out",
          chatsToday: "Chats today",
          clearChats: "Clear local chats",
          clearJournal: "Clear local journal",
          signOutDetail: "Leave the current local session",
          birthEmpty: "Empty",
          birthYes: "Set"
        };
  const profileSummary = hasBirthProfile
    ? `${birthDate || profileLabels.notSet} / ${birthTimeLabel}`
    : c.skipBirth;
  const toggleGoal = (goalId: string) => {
    setProfile((current) => {
      const exists = current.goals.includes(goalId);
      if (exists && current.goals.length <= 1) return current;
      return {
        ...current,
        goals: exists ? current.goals.filter((item) => item !== goalId) : [...current.goals, goalId]
      };
    });
  };
  const detailTitles = {
    identity: language === "vi" ? "Danh tính & ngôn ngữ" : "Identity & language",
    birth: profileLabels.birthSection,
    preferences: profileLabels.preferences,
    privacy: profileLabels.privacySection,
    notifications: language === "vi" ? "Thông báo" : "Notifications",
    premium: profileLabels.subscription,
    account: profileLabels.accountSection,
    deleteAccount: language === "vi" ? "Xóa tài khoản" : "Delete account"
  };

  return (
    <View style={styles.profileScreen}>
      {profileSection === "overview" ? (
        <ProfileHome
          language={language}
          name={profile.nickname}
          signLabel={signLabel}
          memberSince={memberSince}
          stats={{ streak: visibleStreak(profile.currentStreak, profile.lastActivityDate, todayKey()), journal: journalCount, readings: readingsCount }}
          goals={selectedGoals.map((goal) => localizedText(goal, language)).join(", ") || profileLabels.notSet}
          tone={currentTone ? localizedText(currentTone, language) : profile.tone}
          birth={birthDate || profileLabels.notSet}
          languageLabel={language === "vi" ? "Tiếng Việt" : "English"}
          reminder={dailyReminder}
          onReminderChange={onDailyReminderChange}
          onEdit={() => setProfileSection("identity")}
          onPreferences={() => setProfileSection("preferences")}
          onBirth={() => setProfileSection("birth")}
          onNotifications={() => setProfileSection("notifications")}
          onPrivacy={() => setProfileSection("privacy")}
          onUsage={() => setProfileSection("premium")}
          onAccount={() => setProfileSection("account")}
          onHelp={() => { void Linking.openURL(nilazaHelpUrlFor(language)).catch(() => undefined); }}
          onLegal={() => { void Linking.openURL(nilazaLegalUrlFor("terms", language)).catch(() => undefined); }}
          onSignOut={onSignOut}
          onAdmin={isAdmin ? onAdmin : undefined}
          onDeleteAccount={accountDeleteLive ? () => setProfileSection("deleteAccount") : undefined}
          version={appConfig.expo.version}
        />
      ) : (
        <SubflowTopBar title={detailTitles[profileSection]} onLeft={() => setProfileSection("overview")} />
      )}

      {profileSection === "deleteAccount" ? <DeleteAccountPanel language={language} onDelete={onDeleteAccount} /> : null}

      <View style={[styles.profileSection, profileSection !== "identity" && styles.hidden]}>
        <View style={styles.profileSectionHeader}>
          <View style={styles.profileHeaderCopy}>
            <Text style={styles.profileSectionEyebrow}>{profileLabels.ritual}</Text>
            <Text style={styles.profileSectionTitle}>{profileLabels.profileReady}</Text>
          </View>
          <StatusChip label={language.toUpperCase()} tone="neutral" />
        </View>
        <View style={styles.profileActionGrid}>
          <ProfileInfoTile icon="calendar-outline" title={profileLabels.birthSection} detail={profileSummary} />
          <ProfileInfoTile icon="sparkles-outline" title={c.tone} detail={currentTone ? localizedText(currentTone, language) : profile.tone} />
        </View>
        <TextInput
          value={profile.nickname}
          onChangeText={(nickname) => setProfile((current) => ({ ...current, nickname }))}
          placeholder={profileLabels.displayName}
          placeholderTextColor={colors.moon}
          style={styles.input}
        />
        <Text style={styles.profileSectionBody}>{profileLabels.displayNameHint} {profileLabels.savedLocal}</Text>
        <View style={styles.profileLanguagePanel}>
          <View style={styles.profileLanguageCopy}>
            <Text style={styles.profileActionTitle}>{c.language}</Text>
            <Text style={styles.profileActionDetail}>
              {language === "vi" ? "Đổi ngôn ngữ giao diện và nội dung chính." : "Switch the app interface and core content language."}
            </Text>
          </View>
          <LanguageSelector
            language={language}
            onChange={(nextLanguage) => setProfile((item) => ({ ...item, language: nextLanguage }))}
          />
        </View>
      </View>

      <View style={[styles.profileSection, profileSection !== "birth" && styles.hidden]}>
        <View style={styles.profileSectionHeader}>
          <View style={styles.profileHeaderCopy}>
            <Text style={styles.profileSectionEyebrow}>{profileLabels.birthSection}</Text>
            <Text style={styles.profileSectionTitle}>{hasBirthProfile ? profileLabels.birthSet : c.skipBirth}</Text>
          </View>
          <StatusChip label={hasBirthProfile ? profileLabels.birthYes : profileLabels.birthEmpty} tone={hasBirthProfile ? "good" : "warn"} />
        </View>
        <Text style={styles.profileSectionBody}>{profileLabels.birthBody}</Text>
        <CalendarDatePicker
          language={language}
          value={birthDate}
          onChange={setBirthDate}
          placeholder={language === "vi" ? "Chọn ngày sinh" : "Select birth date"}
        />
        <View style={styles.profileTwoColumn}>
          <TextInput value={birthTime} onChangeText={setBirthTime} placeholder={c.birthTime} placeholderTextColor={colors.moon} style={[styles.input, styles.profileHalfInput]} />
          <Pressable accessibilityRole="button" style={[styles.profileOptionButton, birthTimeUnknown && styles.profileOptionButtonActive]} onPress={onMarkBirthTimeUnknown}>
            <Ionicons name="time-outline" size={18} color={birthTimeUnknown ? colors.charcoal : colors.gold} />
            <Text style={[styles.profileOptionText, birthTimeUnknown && styles.profileOptionTextActive]}>{c.unknownBirthTime}</Text>
          </Pressable>
        </View>
        <TextInput value={birthPlace} onChangeText={setBirthPlace} placeholder={c.birthPlace} placeholderTextColor={colors.moon} style={styles.input} />
        <Text style={styles.disclaimer}>{c.birthPrivacyNote}</Text>
      </View>

      <View style={[styles.profileSection, profileSection !== "preferences" && styles.hidden]}>
        <View style={styles.profileSectionHeader}>
          <View style={styles.profileHeaderCopy}>
            <Text style={styles.profileSectionEyebrow}>{profileLabels.preferences}</Text>
            <Text style={styles.profileSectionTitle}>{profileLabels.goalsHint}</Text>
          </View>
        </View>
        <View style={styles.profileButtonWrap}>
          {goals.map((goal) => {
            const active = profile.goals.includes(goal.id);
            return (
              <Pressable key={goal.id} accessibilityRole="button" style={[styles.profileOptionButton, active && styles.profileOptionButtonActive]} onPress={() => toggleGoal(goal.id)}>
                <Text style={[styles.profileOptionText, active && styles.profileOptionTextActive]}>{localizedText(goal, language)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.profileSectionBody}>{profileLabels.toneHint}</Text>
        <View style={styles.profileButtonWrap}>
          {tones.map((tone) => {
            const active = profile.tone === tone.id;
            return (
              <Pressable
                key={tone.id}
                accessibilityRole="button"
                style={[styles.profileOptionButton, active && styles.profileOptionButtonActive]}
                onPress={() => setProfile((current) => ({ ...current, tone: tone.id }))}
              >
                <Text style={[styles.profileOptionText, active && styles.profileOptionTextActive]}>{localizedText(tone, language)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.privacyPanel, profileSection !== "privacy" && styles.hidden]}>
        <View style={styles.profileSectionHeader}>
          <View style={styles.profileHeaderCopy}>
            <Text style={styles.profileSectionEyebrow}>{profileLabels.privacySection}</Text>
            <Text style={styles.profileSectionTitle}>{c.privacy}</Text>
          </View>
          <StatusChip label={c.freePlan} tone="good" />
        </View>
        <Text style={styles.cardDescription}>{profileLabels.privacyBody}</Text>
        <StatusLine label={language === "vi" ? "Nội dung ứng dụng" : "App content"} status={contentBundleVersion ? (language === "vi" ? "Đã nhận bản cập nhật nội dung" : "Content update received") : (language === "vi" ? "Nội dung có sẵn trên thiết bị" : "Content included on device")} tone={contentBundleVersion ? "good" : "neutral"} />
        <View style={styles.privacyStatRow}>
          <MiniStat label={language === "vi" ? "Trò chuyện" : "Chats"} value={String(chatCount)} />
          <MiniStat label={language === "vi" ? "Nhật ký" : "Journal"} value={String(journalCount)} />
          <MiniStat label={language === "vi" ? "Thẻ đã tạo" : "Artifacts"} value={String(artifactCount)} />
          <MiniStat label={language === "vi" ? "Ngày sinh" : "Birth"} value={hasBirthProfile ? profileLabels.birthYes : profileLabels.birthEmpty} />
        </View>
        <View style={styles.privacyActions}>
          <Pressable accessibilityRole="button" style={styles.privacyAction} onPress={onExportData}>
            <Ionicons name="download-outline" size={18} color={colors.gold} />
            <Text style={styles.privacyActionText}>{c.exportData}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.privacyAction} onPress={onClearBirthProfile}>
            <Ionicons name="calendar-outline" size={18} color={colors.gold} />
            <Text style={styles.privacyActionText}>{c.clearBirthProfile}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.privacyAction} onPress={onClearChats}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.gold} />
            <Text style={styles.privacyActionText}>{profileLabels.clearChats}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.privacyAction} onPress={onClearJournal}>
            <Ionicons name="book-outline" size={18} color={colors.gold} />
            <Text style={styles.privacyActionText}>{profileLabels.clearJournal}</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" style={styles.dangerAction} onPress={onDeleteAccountData}>
          <Ionicons name="trash-outline" size={18} color={colors.rose} />
          <Text style={styles.dangerActionText}>{c.deleteAccountData}</Text>
        </Pressable>
        <Text style={styles.body}>{localizedText(safetyRules.globalDisclaimers, language)}</Text>
        <Text style={styles.disclaimer}>{localizedText(safetyRules.personaTransparency, language)}</Text>
      </View>

      <View style={[styles.notificationSettingsPanel, profileSection !== "notifications" && styles.hidden]}>
        <View style={styles.profileSectionHeader}>
          <View style={styles.profileHeaderCopy}>
            <Text style={styles.profileSectionEyebrow}>{language === "vi" ? "Thông báo" : "Notifications"}</Text>
            <Text style={styles.profileSectionTitle}>{language === "vi" ? "Nhắc nhở an toàn" : "Safe reminders"}</Text>
          </View>
          <StatusChip label={`${unreadNotificationCount} ${language === "vi" ? "chưa đọc" : "unread"}`} tone={unreadNotificationCount > 0 ? "warn" : "good"} />
        </View>
        <Text style={styles.cardDescription}>
          {language === "vi"
            ? "Hộp thư trong ứng dụng luôn bật. Thông báo đẩy là tùy chọn và không chứa nội dung riêng tư của trải bài, trò chuyện, Nhật ký hay hồ sơ ngày sinh."
            : "In-app inbox is always available. Push is opt-in and never includes private reading, chat, journal, or birth details."}
        </Text>
        <View style={styles.notificationStatusRow}>
          <StatusLine label={language === "vi" ? "Trạng thái thông báo đẩy" : "Push status"} status={pushPermissionLabel(devicePushRegistration?.permissionStatus, language)} tone={devicePushRegistration?.permissionStatus === "granted" ? "good" : "warn"} />
          <StatusLine label={language === "vi" ? "Thiết bị nhận thông báo" : "Notification device"} status={devicePushRegistration?.expoPushToken ? (language === "vi" ? "đã đăng ký" : "registered") : (language === "vi" ? "chưa đăng ký" : "not registered")} tone={devicePushRegistration?.expoPushToken ? "good" : "neutral"} />
        </View>
        <SecondaryButton label={language === "vi" ? "Mở hộp thư thông báo" : "Open notification inbox"} onPress={onOpenInbox} />
        <PrimaryButton label={language === "vi" ? "Bật nhắc nhở đẩy" : "Enable push reminders"} onPress={onEnablePush} />
        <Text style={styles.sectionKicker}>{language === "vi" ? "Loại thông báo đẩy" : "Push types"}</Text>
        {notificationTypes.filter((item) => item.channelDefault === "push").map((item) => {
          const enabled = isNotificationEnabled(notificationPreferences, "push", item.id);
          return (
            <Pressable
              key={`push-${item.id}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: enabled }}
              style={styles.notificationPreferenceRow}
              onPress={() => onToggleNotificationPreference("push", item.id, !enabled)}
            >
              <View style={styles.flex}>
                <Text style={styles.notificationPreferenceTitle}>{notificationPreferenceLabel(item.id, language)}</Text>
                <Text style={styles.notificationPreferenceBody}>{language === "vi" ? "Chỉ gửi nhắc nhở chung; chi tiết vẫn ở trong ứng dụng." : "Generic push only; details stay in app."}</Text>
              </View>
              <StatusChip label={enabled ? (language === "vi" ? "Bật" : "On") : (language === "vi" ? "Tắt" : "Off")} tone={enabled ? "good" : "neutral"} />
            </Pressable>
          );
        })}
        <Text style={styles.sectionKicker}>{language === "vi" ? "Hộp thư" : "Inbox"}</Text>
        {inAppNotifications.filter((notification) => notification.status !== "dismissed").length === 0 ? (
            <Text style={styles.emptyText}>{language === "vi" ? "Chưa có thông báo nào." : "No notifications yet."}</Text>
        ) : (
          inAppNotifications.filter((notification) => notification.status !== "dismissed").slice(0, 5).map((notification) => (
            <View key={notification.id} style={styles.notificationInboxRow}>
              <Pressable
                accessibilityLabel={language === "vi" ? `Mở: ${localizedText(notification.title, language)}` : `Open: ${localizedText(notification.title, language)}`}
                accessibilityRole="button"
                onPress={() => onOpenNotification(notification)}
                style={styles.notificationInboxOpen}
              >
                <Text style={styles.notificationPreferenceTitle}>{localizedText(notification.title, language)}</Text>
                <Text style={styles.notificationPreferenceBody}>{localizedText(notification.body, language)}</Text>
                <Text style={styles.sourcePath}>{formatLocalDateTime(notification.createdAt, language)}</Text>
              </Pressable>
              <View style={styles.notificationInboxActions}>
                <Pressable accessibilityLabel={language === "vi" ? "Mở nội dung" : "Open content"} accessibilityRole="button" style={styles.notificationIconAction} onPress={() => onOpenNotification(notification)}>
                  <Ionicons name="arrow-forward-outline" size={16} color={colors.gold} />
                </Pressable>
                {notification.status === "unread" ? (
                  <Pressable accessibilityRole="button" style={styles.notificationIconAction} onPress={() => onMarkNotificationRead(notification.id)}>
                    <Ionicons name="checkmark-outline" size={16} color={colors.gold} />
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" style={styles.notificationIconAction} onPress={() => onDismissNotification(notification.id)}>
                  <Ionicons name="close-outline" size={16} color={colors.rose} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={[styles.premiumPanel, profileSection !== "premium" && styles.hidden]}>
        <View style={styles.profileSectionHeader}>
          <View style={styles.profileHeaderCopy}>
            <Text style={styles.profileSectionEyebrow}>{profileLabels.subscription}</Text>
            {premiumOnSale ? <Text style={styles.premiumTitle}>+ {c.premium}</Text> : null}
          </View>
          {premiumOnSale ? <StatusChip label={c.premiumPreview} tone="warn" /> : null}
        </View>
        {premiumOnSale ? <Text style={styles.cardDescription}>{c.freeExperience}</Text> : null}
        <Text style={styles.disclaimer}>{c.freeCreditsReset}</Text>
        {isOwner ? (
          <View style={styles.ownerTierPreviewCard}>
            <Text style={styles.ownerTierPreviewTitle}>
              {language === "vi" ? "Xem thử giao diện theo bậc" : "Preview tier-specific UI"}
            </Text>
            <View style={styles.ownerTierPreviewOptions}>
              {([
                { id: "account", vi: "Quyền ứng dụng", en: "App access" },
                { id: "free", vi: "Xem Free", en: "View Free" },
                { id: "premium", vi: "Xem Premium", en: "View Premium" },
              ] as const).map((option) => {
                const selected = ownerTierPreview === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onOwnerTierPreviewChange(option.id)}
                    style={[styles.ownerTierPreviewOption, selected && styles.ownerTierPreviewOptionSelected]}
                  >
                    <Text style={[styles.ownerTierPreviewOptionText, selected && styles.ownerTierPreviewOptionTextSelected]}>
                      {language === "vi" ? option.vi : option.en}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.ownerTierPreviewBody}>
              {language === "vi"
                ? "Chỉ nội dung và trạng thái khóa thay đổi. Yêu cầu AI mới bị tạm dừng; yêu cầu đã gửi trước đó vẫn có thể hoàn tất theo quyền thật."
                : "Only visible content and locks change. New AI requests are paused; earlier requests may finish under the real account access."}
            </Text>
          </View>
        ) : null}
        <View style={styles.premiumMeter}>
          <View style={styles.premiumMetric}>
            <Text style={styles.miniStatValue}>{creditBalance}</Text>
            <Text style={styles.miniStatLabel}>{c.credits}</Text>
          </View>
          <View style={styles.premiumMetric}>
            <Text style={styles.miniStatValue}>{tarotReadingsToday}/{dailyCreditLimit}</Text>
            <Text style={styles.miniStatLabel}>{c.dailyCredits}</Text>
          </View>
          <View style={styles.premiumMetric}>
            <Text style={styles.miniStatValue}>{chatTurnsToday}</Text>
            <Text style={styles.miniStatLabel}>{profileLabels.chatsToday}</Text>
          </View>
        </View>
        {isOwner ? (
          <View style={styles.ownerPriceHypothesis}>
            <Text style={styles.ownerPriceEyebrow}>
              {language === "vi" ? "GIẢ THUYẾT GIÁ · CHƯA THU TIỀN" : "PRICE HYPOTHESIS · NO CHARGE"}
            </Text>
            <Text style={styles.ownerPriceLine}>
              {language === "vi"
                ? `${premiumPriceHypothesisVnd.monthly.toLocaleString("vi-VN")}₫ / tháng`
                : `VND ${premiumPriceHypothesisVnd.monthly.toLocaleString("en-US")} / month`}
            </Text>
            <Text style={styles.ownerPriceLine}>
              {language === "vi"
                ? `${premiumPriceHypothesisVnd.annual.toLocaleString("vi-VN")}₫ / năm`
                : `VND ${premiumPriceHypothesisVnd.annual.toLocaleString("en-US")} / year`}
            </Text>
            <Text style={styles.ownerPriceDetail}>
              {language === "vi"
                ? `Tương đương khoảng ${(Math.round(annualPriceMath.annualMonthlyEquivalent / 100) * 100).toLocaleString("vi-VN")}₫/tháng; thấp hơn ${annualPriceMath.savings.toLocaleString("vi-VN")}₫ (${Math.round(annualPriceMath.savingsPercent)}%) so với 12 tháng giá tháng.`
                : `About VND ${(Math.round(annualPriceMath.annualMonthlyEquivalent / 100) * 100).toLocaleString("en-US")}/month; VND ${annualPriceMath.savings.toLocaleString("en-US")} (${Math.round(annualPriceMath.savingsPercent)}%) less than twelve monthly payments.`}
            </Text>
            <Text style={styles.ownerPriceDetail}>
              {language === "vi"
                ? "Quyền lợi bên dưới là đề xuất nghiên cứu, chưa được cấu hình hoặc xác nhận."
                : "Benefits below are research proposals, not configured or confirmed."}
            </Text>
            {premiumBenefits.map((item) => (
              <View key={item.en} style={styles.premiumBenefitRow}>
                <Ionicons name="ellipse-outline" size={16} color={colors.gold} />
                <Text style={styles.premiumBenefit}>{localizedText(item, language)}</Text>
              </View>
            ))}
          </View>
        ) : !premiumOnSale ? null : (
          <View style={styles.premiumUnavailable}>
            <Text style={styles.premiumUnavailableTitle}>
              {language === "vi" ? "Premium chưa mở bán" : "Premium is not available yet"}
            </Text>
            <Text style={styles.premiumUnavailableBody}>
              {language === "vi"
                ? "Giá, quyền lợi và khôi phục giao dịch chưa được xác nhận. Hiện chưa có thanh toán."
                : "Pricing, benefits, and purchase restoration are not confirmed. Payments are not available."}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.profileSection, profileSection !== "account" && styles.hidden]}>
        <View style={styles.profileSectionHeader}>
          <View style={styles.profileHeaderCopy}>
            <Text style={styles.profileSectionEyebrow}>{profileLabels.accountSection}</Text>
            <Text style={styles.profileSectionTitle}>{profile.nickname}</Text>
          </View>
        </View>
        <View style={styles.profileActionGrid}>
          <ProfileActionButton icon="help-circle-outline" title={profileLabels.help} detail={profileLabels.helpDetail} onPress={() => { void Linking.openURL(nilazaHelpUrlFor(language)).catch(() => undefined); }} />
          {isAdmin ? <ProfileActionButton icon="construct-outline" title={language === "vi" ? "Trung tâm quản trị" : "Admin hub"} detail={language === "vi" ? "Nội dung, cấu hình và quyền truy cập" : "Content, configuration and access"} onPress={onAdmin} muted /> : null}
          <ProfileActionButton icon="log-out-outline" title={profileLabels.signOut} detail={profileLabels.signOutDetail} onPress={onSignOut} />
        </View>
      </View>
    </View>
  );
}

function TarotGuideSelector({
  deck,
  language,
  options,
  recommendedGuide,
  selectedGuide,
  selectedGuideReason,
  onSelect
}: {
  deck: TarotDeck;
  language: Language;
  options: Persona[];
  recommendedGuide: Persona;
  selectedGuide: Persona;
  selectedGuideReason: string;
  onSelect: (persona: Persona) => void;
}) {
  const deckName = localizedText(deck.name, language);
  const selectedGuideName = localizedText(selectedGuide.name, language);
  const selectedGuideRole = personaRoleLabel(selectedGuide, language);
  return (
    <View style={styles.tarotGuideSelectorPanel}>
      <View style={styles.tarotGuideSelectorHeader}>
        <View style={styles.tarotGuideIconBadge}>
          <Ionicons name="people-outline" size={18} color={colors.ink} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.tarotGuideKicker}>{language === "vi" ? "Người dẫn đọc trải bài" : "Reading guide"}</Text>
          <Text style={styles.tarotGuideTitle}>
            {language === "vi" ? `Giọng đọc hợp với ${deckName}` : `Voice matched to ${deckName}`}
          </Text>
        </View>
      </View>
      <View style={styles.tarotSelectedGuideRow}>
        <View style={[styles.tarotSelectedGuideAvatar, { borderColor: selectedGuide.portrait.colors[1] ?? colors.gold }]}>
          <Image source={getPersonaThumbnail(selectedGuide)} style={styles.tarotSelectedGuideImage} resizeMode="cover" />
        </View>
        <View style={styles.flex}>
          <View style={styles.tarotSelectedGuideNameRow}>
            <Text style={styles.tarotSelectedGuideName}>{selectedGuideName}</Text>
            {selectedGuide.id === recommendedGuide.id ? (
              <Text style={styles.tarotRecommendedBadge}>{language === "vi" ? "Đề xuất" : "Suggested"}</Text>
            ) : null}
          </View>
          <Text style={styles.tarotSelectedGuideRole}>{selectedGuideRole}</Text>
          <Text style={styles.tarotSelectedGuideReason}>{selectedGuideReason}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tarotGuideRail} contentContainerStyle={styles.tarotGuideRailContent}>
        {options.map((persona) => {
          const active = persona.id === selectedGuide.id;
          const name = localizedText(persona.name, language);
          return (
            <Pressable
              accessibilityRole="button"
              key={persona.id}
              onPress={() => onSelect(persona)}
              style={[styles.tarotGuideChoice, active && styles.tarotGuideChoiceActive]}
            >
              <Image source={getPersonaThumbnail(persona)} style={styles.tarotGuideChoiceImage} resizeMode="cover" />
              <Text style={[styles.tarotGuideChoiceName, active && styles.tarotGuideChoiceNameActive]} numberOfLines={1}>{name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.tarotGuideSafetyNote}>
        {language === "vi"
          ? "Bạn có thể đổi người dẫn để đổi góc nhìn; trải bài vẫn là tự phản chiếu, không phải kết luận cố định."
          : "Change the guide to change the lens; the reading stays reflective, not a fixed conclusion."}
      </Text>
    </View>
  );
}

function SpreadOptionCard({
  active,
  avoidWhen,
  bestFor,
  cards,
  detail,
  example,
  label,
  language,
  onPress,
  positionLabels
}: {
  active: boolean;
  avoidWhen: string;
  bestFor: string;
  cards: number;
  detail: string;
  example: string;
  label: string;
  language: Language;
  onPress: () => void;
  positionLabels: string[];
}) {
  return (
    <Pressable style={[styles.spreadOptionCard, active && styles.spreadOptionCardActive]} onPress={onPress}>
      <View style={styles.spreadMarkerRail}>
        {Array.from({ length: cards }, (_, index) => (
          <View key={`${label}-${index}`} style={[styles.spreadMarker, active && styles.spreadMarkerActive]}>
            {cards > 1 ? <Text style={styles.spreadMarkerText}>{positionLabels[index]?.slice(0, 1) ?? index + 1}</Text> : null}
          </View>
        ))}
      </View>
      <View style={styles.flex}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{label}</Text>
          {active ? <Ionicons name="checkmark-circle-outline" size={21} color={colors.gold} /> : null}
        </View>
        <Text style={styles.cardDescription}>{detail}</Text>
        {active ? null : <Text style={styles.spreadLearnHint}>{language === "vi" ? "Chạm để xem khi nào nên chọn kiểu này." : "Tap to see when this spread fits."}</Text>}
        {active ? (
          <View style={styles.spreadLearnPanel}>
            <MiniGuideRow
              icon="sparkles-outline"
              label={language === "vi" ? "Hợp khi" : "Best when"}
              value={bestFor}
            />
            <MiniGuideRow
              icon="alert-circle-outline"
              label={language === "vi" ? "Cân nhắc" : "Consider"}
              value={avoidWhen}
            />
            <MiniGuideRow
              icon="chatbubble-ellipses-outline"
              label={language === "vi" ? "Câu hỏi thử" : "Try asking"}
              value={example}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function MiniGuideRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.miniGuideRow}>
      <Ionicons name={icon} size={16} color={colors.gold} />
      <View style={styles.flex}>
        <Text style={styles.miniGuideLabel}>{label}</Text>
        <Text style={styles.miniGuideValue}>{value}</Text>
      </View>
    </View>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.kicker}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

function ProfileActionButton({
  detail,
  icon,
  muted,
  onPress,
  title
}: {
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  muted?: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable accessibilityRole="button" style={[styles.profileActionButton, muted && styles.operatorRow]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.gold} />
      <View style={styles.flex}>
        <Text style={styles.profileActionTitle}>{title}</Text>
        <Text style={styles.profileActionDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={20} style={styles.profileChevron} />
    </Pressable>
  );
}

function ProfileInfoTile({
  detail,
  icon,
  title
}: {
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.profileInfoTile}>
      <Ionicons name={icon} size={20} color={colors.gold} />
      <View style={styles.flex}>
        <Text style={styles.profileActionTitle}>{title}</Text>
        <Text style={styles.profileActionDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  undoToast: { flexDirection: "row", alignItems: "center", gap: 12 },
  undoButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: 6 },
  undoText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  deckLibraryLink: { minHeight: layout.minimumTouchTarget + 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, backgroundColor: "#1F1C1E", borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.35)", flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  deckLibraryLinkTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  deckLibraryLinkMeta: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, marginTop: 2 },
homeTitleCompact: {
    fontSize: 24,
    lineHeight: 30,
    marginTop: spacing.sm
  },
homeSubtitleCompact: {
    fontSize: 14,
    marginBottom: spacing.md,
    marginTop: spacing.xs
  },
streakRibbonCompact: {
    marginBottom: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
dailyPanelCompact: {
    padding: spacing.md
  },
dailyTextCompact: {
    fontSize: 19,
    lineHeight: 26,
    marginTop: spacing.md
  },
dailyPromptCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm
  },
zodiacProfilePrompt: {
    alignItems: "center",
    backgroundColor: "rgba(14, 90, 90, 0.16)",
    borderColor: "rgba(201, 164, 92, 0.28)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    minHeight: 76,
    padding: spacing.md
  },
  hidden: {
    display: "none"
  },
  appShell: {
    alignItems: "center",
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: "100%"
  },
  surfaceShell: {
    flex: 1,
    maxWidth: 520,
    minHeight: 0,
    width: "100%"
  },
  tarotFullscreenOverlay: {
    backgroundColor: "rgba(10, 9, 10, 0.94)",
    flex: 1
  },
  tarotFullscreenSafe: {
    flex: 1,
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg
  },
  tarotFullscreenTopBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  tarotFullscreenMeta: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  tarotFullscreenTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 36,
    marginTop: spacing.xs
  },
  tarotFullscreenClose: {
    alignItems: "center",
    backgroundColor: "rgba(247, 241, 230, 0.08)",
    borderColor: "rgba(247, 241, 230, 0.16)",
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  tarotFullscreenImageStage: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 0,
    width: "100%"
  },
  tarotFullscreenImage: {
    height: "100%",
    maxHeight: 660,
    width: "100%"
  },
  tarotFullscreenPrimary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.gold,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.lg
  },
  tarotFullscreenPrimaryText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  screen: {
    padding: 20,
    paddingBottom: 32
  },
  // Room for the floating Oracle launcher so it never covers the last row.
  screenWithOracleLauncher: {
    paddingBottom: 32 + layout.minimumTouchTarget + spacing.md
  },
  tarotShell: {
    flex: 1,
    backgroundColor: colors.charcoal
  },
  tarotContent: {
    padding: 20,
    paddingBottom: 32
  },
  tarotContentDocked: {
    paddingBottom: 128
  },
  tarotBackToTopButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderColor: "rgba(21, 20, 22, 0.32)",
    borderRadius: 8,
    borderWidth: 1,
    bottom: 24,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    width: 44,
    zIndex: 40
  },
  tarotBackToTopButtonRaised: {
    bottom: 96
  },
  subTopBar: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  subTopBarInline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  subTopTitle: {
    color: colors.ivory,
    fontSize: 18,
    fontWeight: "800"
  },
  backText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "800"
  },
  editorialTopBar: {
    borderBottomColor: "rgba(247, 241, 230, 0.08)",
    borderBottomWidth: 0,
    paddingHorizontal: 20
  },
  tarotStepKicker: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  editorialTopIcon: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  editorialStage: {
    paddingBottom: spacing.xl
  },
  editorialHeroLeft: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
    marginTop: spacing.lg
  },
  editorialDisplayLeft: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 40
  },
  editorialSupportLeft: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 320
  },
  editorialPersonaScreen: {
    gap: spacing.lg,
    paddingBottom: 144
  },
  editorialPersonaTopBar: {
    alignItems: "center",
    backgroundColor: colors.charcoal,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: spacing.sm,
    position: "sticky" as any,
    top: 0,
    zIndex: 20
  },
  editorialPersonaActionRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  editorialPersonaHeaderTitleWrap: {
    flex: 1,
    marginHorizontal: spacing.md,
    opacity: 0,
    overflow: "hidden",
    transform: [{ translateY: 4 }]
  },
  editorialPersonaHeaderTitleWrapVisible: {
    opacity: 1,
    transform: [{ translateY: 0 }]
  },
  editorialPersonaHeaderTitle: {
    color: colors.gold,
    fontFamily: typography.headlineFontFamily,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 22,
    textAlign: "center"
  },
  editorialRoundIcon: {
    alignItems: "center",
    backgroundColor: "#2A2525",
    borderColor: "rgba(247, 241, 230, 0.12)",
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  editorialRoundIconActive: {
    backgroundColor: "rgba(201, 164, 92, 0.14)",
    borderColor: "rgba(201, 164, 92, 0.54)"
  },
  editorialPersonaHero: {
    aspectRatio: 4 / 5,
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#2A2525",
    marginHorizontal: 0,
    overflow: "hidden",
    position: "relative"
  },
  editorialPersonaAura: {
    backgroundColor: "rgba(201, 164, 92, 0.16)",
    borderRadius: 999,
    height: "72%",
    left: "14%",
    opacity: 0.9,
    position: "absolute",
    top: "10%",
    width: "72%"
  },
  editorialPersonaImage: {
    height: "100%",
    width: "100%"
  },
  editorialPersonaHeroShade: {
    backgroundColor: "rgba(21, 20, 22, 0.18)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  editorialPersonaTitleWrap: {
    bottom: spacing.md,
    gap: 4,
    left: 24,
    position: "absolute",
    right: 24
  },
  editorialPersonaTitleWrapHidden: {
    opacity: 0
  },
  editorialPersonaTitle: {
    color: colors.gold,
    fontFamily: typography.headlineFontFamily,
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 36
  },
  editorialPersonaSubtitle: {
    color: "rgba(201, 164, 92, 0.64)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textTransform: "uppercase"
  },
  editorialPersonaTabs: {
    borderBottomColor: "rgba(247, 241, 230, 0.12)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.lg,
    paddingHorizontal: 4
  },
  editorialPersonaTab: {
    gap: spacing.sm,
    paddingTop: spacing.xs
  },
  editorialPersonaTabText: {
    color: colors.moon,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textTransform: "uppercase"
  },
  editorialPersonaTabTextActive: {
    color: colors.gold
  },
  editorialPersonaTabLine: {
    backgroundColor: "transparent",
    borderRadius: 999,
    height: 2,
    width: "100%"
  },
  editorialPersonaTabLineActive: {
    backgroundColor: colors.gold
  },
  editorialPersonaSectionStack: {
    gap: spacing.xl
  },
  editorialPersonaSection: {
    gap: spacing.md
  },
  editorialPersonaSectionLabel: {
    color: colors.moon,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textTransform: "uppercase"
  },
  editorialPersonaDomainStack: {
    gap: spacing.sm
  },
  editorialPersonaDomainCard: {
    alignItems: "center",
    backgroundColor: "#2A2525",
    borderColor: "rgba(247, 241, 230, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  editorialPersonaDomainText: {
    color: colors.ivory,
    flex: 1,
    fontSize: 17,
    lineHeight: 24
  },
  editorialPersonaQuoteCard: {
    backgroundColor: "#2A2525",
    borderColor: "rgba(247, 241, 230, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.lg,
    position: "relative"
  },
  editorialPersonaQuoteMark: {
    position: "absolute",
    right: spacing.md,
    top: spacing.md
  },
  editorialPersonaCardLabel: {
    color: "rgba(232, 193, 118, 0.84)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    marginBottom: spacing.md,
    textTransform: "uppercase"
  },
  editorialPersonaQuoteText: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 26,
    fontStyle: "italic",
    lineHeight: 34,
    marginBottom: spacing.md,
    paddingRight: spacing.xl
  },
  editorialPersonaQuoteBody: {
    color: colors.moon,
    fontSize: 15,
    lineHeight: 24
  },
  editorialPersonaInsightStack: {
    gap: spacing.sm
  },
  editorialPersonaInsightCard: {
    borderColor: "rgba(247, 241, 230, 0.08)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  editorialPersonaInsightText: {
    color: colors.ivory,
    fontSize: 16,
    lineHeight: 24
  },
  editorialPersonaChronicleIntro: {
    gap: spacing.md,
    paddingTop: spacing.xs
  },
  editorialPersonaChronicleEyebrow: {
    color: "rgba(201, 164, 92, 0.44)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textTransform: "uppercase"
  },
  editorialPersonaChronicleBody: {
    color: colors.ivory,
    fontSize: 18,
    lineHeight: 30
  },
  editorialPersonaDropcap: {
    color: colors.gold,
    fontFamily: typography.headlineFontFamily,
    fontSize: 54,
    lineHeight: 54
  },
  editorialPersonaDivider: {
    backgroundColor: "rgba(247, 241, 230, 0.12)",
    height: 1
  },
  editorialPersonaChronicleStory: {
    gap: spacing.md
  },
  editorialPersonaChronicleHeading: {
    color: "rgba(232, 193, 118, 0.9)",
    fontFamily: typography.headlineFontFamily,
    fontSize: 26,
    fontStyle: "italic",
    lineHeight: 32
  },
  editorialPersonaChronicleSupport: {
    color: colors.moon,
    fontSize: 15,
    lineHeight: 24
  },
  editorialPersonaLegacyCard: {
    backgroundColor: "rgba(42, 37, 37, 0.38)",
    borderColor: "rgba(201, 164, 92, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  editorialPersonaLegacyLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textTransform: "uppercase"
  },
  editorialPersonaLegacyItem: {
    borderLeftColor: "rgba(201, 164, 92, 0.20)",
    borderLeftWidth: 1,
    gap: spacing.xs,
    paddingLeft: spacing.md
  },
  editorialPersonaLegacyItemTitle: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    textTransform: "uppercase"
  },
  editorialPersonaLegacyItemBody: {
    color: colors.moon,
    fontSize: 14,
    lineHeight: 22
  },
  editorialPersonaClosingQuote: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg
  },
  editorialPersonaClosingQuoteText: {
    color: colors.moon,
    fontSize: 15,
    fontStyle: "italic",
    lineHeight: 24,
    textAlign: "center"
  },
  editorialPersonaTransparency: {
    color: colors.moon,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center"
  },
  personaFloatingCta: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.gold,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginLeft: "auto" as any,
    marginRight: "auto" as any,
    maxWidth: 480,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    width: "90%",
    zIndex: 35
  },
  personaFloatingCtaLocked: {
    opacity: 0.94
  },
  personaFloatingCtaText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    textTransform: "uppercase"
  },
  lockedPanel: {
    backgroundColor: "rgba(201, 164, 92, 0.10)",
    borderColor: "rgba(201, 164, 92, 0.24)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  lockedTitle: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20
  },
  lockedBody: {
    color: colors.ivory,
    fontSize: 14,
    lineHeight: 22
  },
  tarotFloatingPrimaryButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.ivory,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginLeft: "auto" as any,
    marginRight: "auto" as any,
    maxWidth: 480,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    width: "90%",
    zIndex: 35
  },
  tarotFloatingPrimaryButtonText: {
    color: colors.ink,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 15.5,
    lineHeight: 22,
    textAlign: "center"
  },
  deckDetailActionDock: {
    alignSelf: "center",
    backgroundColor: "rgba(21, 20, 22, 0.94)",
    borderColor: "rgba(247, 241, 230, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginLeft: "auto" as any,
    marginRight: "auto" as any,
    maxWidth: 480,
    padding: spacing.sm,
    marginVertical: spacing.sm,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    width: "94%",
    zIndex: 36
  },
  deckDetailDockSecondary: {
    alignItems: "center",
    borderColor: "rgba(247, 241, 230, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 0.88,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.sm
  },
  deckDetailDockSecondaryText: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "800"
  },
  deckDetailDockPrimary: {
    alignItems: "center",
    backgroundColor: colors.ivory,
    borderRadius: 8,
    flex: 1.12,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.sm
  },
  deckDetailDockPrimaryText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase"
  },
  editorialDeckStack: {
    gap: spacing.md
  },
  editorialDeckCard: {
    backgroundColor: "#231F20",
    borderColor: "rgba(247, 241, 230, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  oracleLauncher: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: 999,
    bottom: spacing.md,
    elevation: 6,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    zIndex: 34
  },
  oracleLauncherText: {
    color: colors.charcoal,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  editorialDeckCardSelected: {
    borderColor: "rgba(201, 164, 92, 0.75)"
  },
  editorialDeckArtFrame: {
    alignItems: "center",
    backgroundColor: "#191719",
    height: 184,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative"
  },
  editorialDeckImage: {
    height: "100%",
    width: "100%"
  },
  editorialDeckShade: {
    backgroundColor: "rgba(20, 17, 18, 0.16)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  editorialDeckBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
    top: spacing.md
  },
  editorialDeckBadge: {
    backgroundColor: "rgba(21, 20, 22, 0.82)",
    borderColor: "rgba(201, 164, 92, 0.45)",
    borderRadius: 6,
    borderWidth: 1,
    color: colors.ivory,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    textTransform: "uppercase"
  },
  editorialDeckBadgePremium: {
    color: colors.gold
  },
  editorialDeckCheck: {
    alignItems: "center",
    backgroundColor: "rgba(247, 241, 230, 0.85)",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    opacity: 0.92,
    width: 24
  },
  editorialDeckCheckActive: {
    backgroundColor: colors.ivory
  },
  editorialDeckCopy: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  editorialDeckName: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 18,
    fontWeight: "600"
  },
  editorialDeckDescription: {
    color: colors.ivory,
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.84
  },
  editorialDeckCopyTop: {
    paddingBottom: 0
  },
  editorialDeckCopyBottom: {
    paddingTop: spacing.xs
  },
  editorialDeckLearnButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: "rgba(201, 164, 92, 0.58)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  editorialDeckLearnButtonText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800"
  },
  lead: {
    color: colors.muted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center"
  },
  leadLeft: {
    color: colors.muted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 16,
    lineHeight: 24,
    marginTop: -spacing.sm,
    marginBottom: spacing.md
  },
  kicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  sectionKicker: {
    color: colors.moon,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    textTransform: "uppercase"
  },
  body: {
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 24,
    marginTop: spacing.sm
  },
  muted: {
    color: colors.muted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 19
  },
  disclaimer: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm
  },
  errorText: {
    color: colors.rose,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: spacing.md
  },
  errorPanel: {
    backgroundColor: "rgba(201, 130, 141, 0.12)",
    borderColor: "rgba(201, 130, 141, 0.38)",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md
  },
  disabledAction: {
    opacity: 0.55
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  flex: {
    flex: 1
  },
  input: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    fontSize: 16,
    marginTop: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  councilHubHero: {
    backgroundColor: colors.panel,
    borderColor: "rgba(201, 164, 92, 0.34)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg
  },
  councilHubTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 30
  },
  councilHubBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22
  },
  councilHubSessionCard: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  councilHubTemplateCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderColor: "rgba(201, 164, 92, 0.24)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  councilAvatarStack: {
    flexDirection: "row",
    marginLeft: spacing.md
  },
  councilAvatar: {
    backgroundColor: colors.panelSoft,
    borderColor: colors.gold,
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    marginLeft: -spacing.sm,
    width: 38
  },
  homeCouncilCard: {
    backgroundColor: colors.panel,
    borderColor: "rgba(201, 164, 92, 0.36)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.lg
  },
  homeCouncilHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  homeCouncilIcon: {
    alignItems: "center",
    backgroundColor: "rgba(201, 164, 92, 0.12)",
    borderColor: "rgba(201, 164, 92, 0.34)",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  homeCouncilTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 27
  },
  homeCouncilBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21
  },
  homeCouncilFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  homeCouncilDetail: {
    color: colors.moon,
    flex: 1,
    fontSize: 12,
    lineHeight: 17
  },
  homeCouncilCta: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.sm
  },
  homeCouncilCtaText: {
    color: colors.charcoal,
    fontSize: 12,
    fontWeight: "900"
  },
  quickGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg
  },
  cardTitle: {
    color: colors.ivory,
    flex: 1,
    fontSize: 17,
    fontWeight: "800"
  },
  cardDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  personaDetailTitle: {
    color: colors.ivory,
    fontSize: 31,
    fontWeight: "800",
    lineHeight: 38
  },
  personaDetailBody: {
    color: colors.ivory,
    fontSize: 20,
    lineHeight: 32,
    marginTop: spacing.xl
  },
  tarotLandingPanel: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: "rgba(201, 164, 92, 0.35)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md
  },
  tarotLandingImage: {
    backgroundColor: colors.charcoal,
    borderColor: colors.gold,
    borderRadius: 8,
    borderWidth: 1,
    height: 132,
    width: 78
  },
  tarotLandingCopy: {
    flex: 1
  },
  choiceStack: {
    gap: spacing.md,
    marginTop: spacing.lg
  },
  journeyOption: {
    alignItems: "flex-start",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  journeyOptionFeatured: {
    backgroundColor: "rgba(14, 90, 90, 0.22)",
    borderColor: "rgba(201, 164, 92, 0.44)"
  },
  tarotLearningPanel: {
    backgroundColor: "rgba(14, 90, 90, 0.20)",
    borderColor: "rgba(201, 164, 92, 0.36)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  tarotLearningPanelCompact: {
    marginBottom: spacing.lg
  },
  tarotLearningHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  tarotLearningIcon: {
    alignItems: "center",
    backgroundColor: "rgba(201, 164, 92, 0.14)",
    borderColor: "rgba(201, 164, 92, 0.42)",
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  tarotLearningKicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  tarotLearningTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 27,
    fontWeight: "600",
    lineHeight: 32,
    marginTop: 2
  },
  tarotLearningIntro: {
    color: colors.ivory,
    fontSize: 15,
    lineHeight: 23
  },
  tarotLearningNote: {
    color: colors.moon,
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18
  },
  tarotLearningPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  tarotLearningPill: {
    backgroundColor: "rgba(201, 164, 92, 0.12)",
    borderColor: "rgba(201, 164, 92, 0.34)",
    borderRadius: 8,
    borderWidth: 1,
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  tarotLearningScreen: {
    gap: spacing.lg,
    paddingBottom: spacing.xl
  },
  tarotLearningHero: {
    backgroundColor: "rgba(247, 241, 230, 0.06)",
    borderColor: "rgba(201, 164, 92, 0.34)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  tarotLearningHeroKicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase"
  },
  tarotLearningHeroTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 34,
    fontWeight: "600",
    lineHeight: 40
  },
  tarotLearningHeroBody: {
    color: colors.moon,
    fontSize: 16,
    lineHeight: 24
  },
  tarotLearningStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tarotLearningPathRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tarotLearningPathStep: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 96,
    flexGrow: 1,
    gap: 4,
    minHeight: 72,
    justifyContent: "center",
    padding: spacing.sm
  },
  tarotLearningPathNumber: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: "900"
  },
  tarotLearningPathLabel: {
    color: colors.ivory,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase"
  },
  tarotLearningModuleStack: {
    gap: spacing.md
  },
  tarotLearningModuleCard: {
    backgroundColor: "#211D1F",
    borderColor: "rgba(247, 241, 230, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  tarotLearningModuleHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  tarotLearningModuleIcon: {
    alignItems: "center",
    backgroundColor: "rgba(201, 164, 92, 0.12)",
    borderColor: "rgba(201, 164, 92, 0.36)",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  tarotLearningModuleLevel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  tarotLearningModuleTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 30,
    marginTop: 2
  },
  tarotLearningModuleSummary: {
    color: colors.ivory,
    fontSize: 15,
    lineHeight: 23
  },
  tarotLearningBulletList: {
    gap: spacing.sm
  },
  tarotLearningBulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  tarotLearningBulletText: {
    color: colors.onSurfaceVariant,
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  tarotLearningPracticeBox: {
    backgroundColor: "rgba(14, 90, 90, 0.20)",
    borderColor: "rgba(201, 164, 92, 0.28)",
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  tarotLearningPracticeLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  tarotLearningPracticeText: {
    color: colors.ivory,
    fontSize: 15,
    fontStyle: "italic",
    fontWeight: "700",
    lineHeight: 22,
    marginTop: spacing.xs
  },
  tarotLearningActionPanel: {
    backgroundColor: "rgba(201, 164, 92, 0.10)",
    borderColor: "rgba(201, 164, 92, 0.40)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  tarotLearningActionTitle: {
    color: colors.ivory,
    fontSize: 20,
    fontWeight: "900"
  },
  tarotLearningActionBody: {
    color: colors.moon,
    fontSize: 14,
    lineHeight: 21
  },
  tarotLearningActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tarotLearningSecondaryAction: {
    alignItems: "center",
    borderColor: "rgba(247, 241, 230, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    minWidth: 130,
    paddingHorizontal: spacing.md
  },
  tarotLearningSecondaryActionText: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  tarotLearningPrimaryAction: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48,
    justifyContent: "center",
    minWidth: 130,
    paddingHorizontal: spacing.md
  },
  tarotLearningPrimaryActionText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase"
  },
  spreadOptionCard: {
    alignItems: "flex-start",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  spreadOptionCardActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201, 164, 92, 0.08)"
  },
  spreadMarkerRail: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    minWidth: 62
  },
  spreadMarker: {
    alignItems: "center",
    borderColor: "rgba(168, 163, 160, 0.45)",
    borderRadius: 6,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 26
  },
  spreadMarkerActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201, 164, 92, 0.10)"
  },
  spreadMarkerText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900"
  },
  spreadLearnHint: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  spreadLearnPanel: {
    borderColor: "rgba(201, 164, 92, 0.26)",
    borderRadius: 8,
    borderTopWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md
  },
  miniGuideRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  miniGuideLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  miniGuideValue: {
    color: colors.ivory,
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.86
  },
  deckDetailHero: {
    backgroundColor: "#151416",
    borderColor: "rgba(201, 164, 92, 0.38)",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative"
  },
  deckDetailArtFrame: {
    aspectRatio: 3 / 2,
    alignSelf: "center",
    maxWidth: 680,
    width: "100%"
  },
  deckDetailHeroImage: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%"
  },
  deckDetailHeroCopy: {
    gap: spacing.md,
    justifyContent: "flex-end",
    padding: spacing.lg,
    paddingTop: spacing.md
  },
  deckDetailAccess: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(247, 241, 230, 0.88)",
    borderRadius: 8,
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: "uppercase"
  },
  deckDetailTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 40
  },
  deckDetailSubtitle: {
    color: colors.ivory,
    fontSize: 16,
    lineHeight: 24
  },
  deckStoryBodyHero: {
    color: colors.ivory,
    fontSize: 16,
    lineHeight: 25
  },
  deckTraitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  deckTraitCard: {
    backgroundColor: "#211D1F",
    borderColor: "rgba(247, 241, 230, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.xs,
    minWidth: "100%",
    padding: spacing.md
  },
  deckTraitLabel: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    lineHeight: 14,
    textTransform: "uppercase"
  },
  deckTraitValue: {
    color: colors.ivory,
    fontSize: 13,
    lineHeight: 18
  },
  deckStoryPanel: {
    backgroundColor: "rgba(247, 241, 230, 0.06)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  deckStoryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  deckStoryKicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  deckStoryTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 25,
    fontWeight: "600",
    lineHeight: 31
  },
  deckStoryBody: {
    color: colors.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 23
  },
  deckStoryGrid: {
    gap: spacing.md
  },
  deckPromptRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  deckPromptChip: {
    backgroundColor: "rgba(201, 164, 92, 0.10)",
    borderColor: "rgba(201, 164, 92, 0.32)",
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ivory,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  deckExperiencePanel: {
    backgroundColor: "rgba(14, 90, 90, 0.22)",
    borderColor: "rgba(201, 164, 92, 0.34)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  deckExperienceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  deckExperienceIcon: {
    alignItems: "center",
    backgroundColor: "rgba(201, 164, 92, 0.16)",
    borderColor: "rgba(201, 164, 92, 0.42)",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  deckExperienceTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 29
  },
  deckExperienceSample: {
    color: colors.ivory,
    fontSize: 16,
    fontStyle: "italic",
    fontWeight: "600",
    lineHeight: 25
  },
  deckExperienceUnlockGrid: {
    gap: spacing.sm
  },
  deckExperienceUnlock: {
    alignItems: "center",
    backgroundColor: "rgba(247, 241, 230, 0.06)",
    borderColor: "rgba(247, 241, 230, 0.10)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  deckExperienceUnlockText: {
    color: colors.onSurfaceVariant,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  cardMeaningTopBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  cardMeaningStickyTopBar: {
    backgroundColor: colors.charcoal,
    borderBottomColor: "rgba(247, 241, 230, 0.08)",
    borderBottomWidth: 1,
    marginBottom: 0,
    paddingHorizontal: 20,
    paddingVertical: spacing.sm
  },
  cardMeaningHeaderButton: {
    alignItems: "center",
    backgroundColor: "#211D1F",
    borderColor: "rgba(247, 241, 230, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.sm
  },
  cardMeaningHeaderButtonText: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "800"
  },
  cardMeaningTopContext: {
    alignItems: "center",
    flex: 1,
    minWidth: 0
  },
  cardMeaningTopKicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  cardMeaningTopTitle: {
    color: colors.moon,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center"
  },
  cardMeaningLibraryButton: {
    alignItems: "center",
    backgroundColor: "rgba(201, 164, 92, 0.14)",
    borderColor: "rgba(201, 164, 92, 0.42)",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  cardMeaningTopSpacer: {
    width: 42
  },
  cardMeaningChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  cardMeaningChip: {
    backgroundColor: "rgba(14, 90, 90, 0.26)",
    borderColor: "rgba(201, 164, 92, 0.24)",
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ivory,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  cardMeaningSectionKicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  cardMeaningBody: {
    color: colors.moon,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.sm
  },
  cardMeaningStoryPanel: {
    backgroundColor: "#211D1F",
    borderColor: "rgba(247, 241, 230, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  cardMeaningStoryTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 30,
    marginTop: spacing.xs
  },
  cardMeaningChatPanel: {
    alignItems: "center",
    backgroundColor: "rgba(14, 90, 90, 0.24)",
    borderColor: "rgba(201, 164, 92, 0.38)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  cardMeaningChatIcon: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  cardMeaningChatTitle: {
    color: colors.ivory,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20
  },
  cardMeaningChatBody: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs
  },
  infoBlock: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  resultBadge: {
    backgroundColor: "rgba(14, 90, 90, 0.30)",
    borderColor: "rgba(14, 90, 90, 0.60)",
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ivory,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    textTransform: "uppercase"
  },
  resultCardTitle: {
    color: colors.ivory,
    fontSize: 22,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  tarotGuideSelectorPanel: {
    backgroundColor: "#211D1F",
    borderColor: "rgba(201, 164, 92, 0.30)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg
  },
  tarotGuideSelectorHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  tarotGuideIconBadge: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  tarotGuideKicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  tarotGuideTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 21,
    fontWeight: "600",
    lineHeight: 26,
    marginTop: 2
  },
  tarotSelectedGuideRow: {
    alignItems: "center",
    backgroundColor: "rgba(247, 241, 230, 0.04)",
    borderColor: "rgba(247, 241, 230, 0.10)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  tarotSelectedGuideAvatar: {
    borderRadius: 8,
    borderWidth: 1,
    height: 64,
    overflow: "hidden",
    width: 64
  },
  tarotSelectedGuideImage: {
    height: "100%",
    width: "100%"
  },
  tarotSelectedGuideNameRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  tarotSelectedGuideName: {
    color: colors.ivory,
    fontSize: 16,
    fontWeight: "900"
  },
  tarotRecommendedBadge: {
    backgroundColor: "rgba(201, 164, 92, 0.16)",
    borderColor: "rgba(201, 164, 92, 0.38)",
    borderRadius: 8,
    borderWidth: 1,
    color: colors.gold,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textTransform: "uppercase"
  },
  tarotSelectedGuideRole: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3
  },
  tarotSelectedGuideReason: {
    color: colors.moon,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs
  },
  tarotGuideRail: {
    marginHorizontal: -spacing.xs
  },
  tarotGuideRailContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs
  },
  tarotGuideChoice: {
    alignItems: "center",
    backgroundColor: "rgba(247, 241, 230, 0.05)",
    borderColor: "rgba(247, 241, 230, 0.10)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    minWidth: 92,
    padding: spacing.sm
  },
  tarotGuideChoiceActive: {
    backgroundColor: "rgba(201, 164, 92, 0.12)",
    borderColor: "rgba(201, 164, 92, 0.58)"
  },
  tarotGuideChoiceImage: {
    borderRadius: 8,
    height: 46,
    width: 46
  },
  tarotGuideChoiceName: {
    color: colors.moon,
    fontSize: 11,
    fontWeight: "800",
    maxWidth: 76,
    textAlign: "center"
  },
  tarotGuideChoiceNameActive: {
    color: colors.ivory
  },
  tarotGuideSafetyNote: {
    color: colors.moon,
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18
  },
  editorialOutlineButton: {
    alignItems: "center",
    borderColor: "rgba(201, 164, 92, 0.88)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 52
  },
  editorialOutlineButtonText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "700"
  },
  sharePreviewCard: {
    alignItems: "center",
    backgroundColor: "#211E1A",
    borderColor: "rgba(201, 164, 92, 0.48)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  sharePreviewSpread: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    width: "100%"
  },
  sharePreviewCardSlot: {
    alignItems: "center",
    flex: 1
  },
  sharePreviewCardSlotCenter: {
    marginBottom: spacing.lg
  },
  sharePreviewImage: {
    height: 190,
    width: "100%"
  },
  sharePreviewCardName: {
    color: colors.ivory,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: spacing.xs,
    textAlign: "center"
  },
  empty: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  emptyTitle: {
    color: colors.ivory,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing.sm
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 20
  },
  journalDetailHero: {
    backgroundColor: colors.panel,
    borderColor: "rgba(201, 164, 92, 0.35)",
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.lg
  },
  savedCardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginVertical: spacing.sm
  },
  savedCardThumb: {
    borderRadius: 6,
    height: 93,
    width: 56
  },
  snapshotPanel: {
    backgroundColor: "rgba(14, 90, 90, 0.18)",
    borderColor: "rgba(14, 90, 90, 0.45)",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md
  },
  noteInput: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    fontSize: 16,
    minHeight: 132,
    padding: spacing.md,
    textAlignVertical: "top"
  },
  profileScreen: {
    gap: spacing.md
  },
  profileSection: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  profileSectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  profileHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  profileSectionEyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  profileSectionTitle: {
    color: colors.ivory,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginTop: spacing.xs
  },
  profileSectionBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  profileActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  profileLanguagePanel: {
    backgroundColor: "rgba(14, 90, 90, 0.18)",
    borderColor: "rgba(201, 164, 92, 0.22)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  profileLanguageCopy: {
    paddingHorizontal: 2
  },
  profileActionButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 146,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 76,
    padding: spacing.md
  },
  profileInfoTile: {
    alignItems: "center",
    backgroundColor: "rgba(247, 241, 230, 0.035)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 146,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 76,
    padding: spacing.md
  },
  profileActionTitle: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "900"
  },
  profileActionDetail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs
  },
  profileTwoColumn: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  profileHalfInput: {
    flex: 1,
    marginTop: 0
  },
  profileButtonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  profileOptionButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  profileOptionButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold
  },
  profileOptionText: {
    color: colors.ivory,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center"
  },
  profileOptionTextActive: {
    color: colors.charcoal
  },
  premiumPanel: {
    backgroundColor: "#342B24",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.lg
  },
  premiumTitle: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  premiumBenefit: {
    color: colors.ivory,
    fontSize: 16,
    lineHeight: 24
  },
  premiumBenefitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  ownerPreviewBanner: {
    alignItems: "center",
    backgroundColor: colors.teal,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  ownerPreviewBannerCopy: {
    flex: 1,
    minWidth: 0
  },
  ownerPreviewBannerTitle: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "900"
  },
  ownerPreviewBannerBody: {
    color: colors.ivory,
    fontSize: 12,
    lineHeight: 16
  },
  ownerPreviewExit: {
    alignItems: "center",
    borderColor: "rgba(247, 241, 230, 0.7)",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 56,
    paddingHorizontal: spacing.sm
  },
  ownerPreviewExitText: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "800"
  },
  ownerTierPreviewCard: {
    backgroundColor: "rgba(14, 90, 90, 0.18)",
    borderColor: "rgba(201, 164, 92, 0.42)",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md
  },
  ownerTierPreviewTitle: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "800"
  },
  ownerTierPreviewOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  ownerTierPreviewOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 86,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs
  },
  ownerTierPreviewOptionSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold
  },
  ownerTierPreviewOptionText: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  },
  ownerTierPreviewOptionTextSelected: {
    color: colors.charcoal
  },
  ownerTierPreviewBody: {
    color: colors.ivory,
    fontSize: 13,
    lineHeight: 19
  },
  ownerPriceHypothesis: {
    borderColor: "rgba(201, 164, 92, 0.45)",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md
  },
  ownerPriceEyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    lineHeight: 16
  },
  ownerPriceLine: {
    color: colors.ivory,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
    marginTop: spacing.xs
  },
  ownerPriceDetail: {
    color: colors.ivory,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm
  },
  premiumUnavailable: {
    backgroundColor: "rgba(21, 20, 22, 0.45)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.md
  },
  premiumUnavailableTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: "800"
  },
  premiumUnavailableBody: {
    color: colors.ivory,
    fontSize: 14,
    lineHeight: 20
  },
  premiumMeter: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md
  },
  premiumMetric: {
    flex: 1
  },
  profileChevron: {
    color: colors.ivory,
    fontSize: 20
  },
  privacyPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.lg
  },
  privacyStatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md
  },
  privacyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  privacyAction: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 146,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 52,
    padding: spacing.md
  },
  privacyActionText: {
    color: colors.ivory,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800"
  },
  notificationSettingsPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.lg
  },
  notificationStatusRow: {
    gap: spacing.sm,
    marginVertical: spacing.md
  },
  notificationPreferenceRow: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md
  },
  notificationPreferenceTitle: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "800"
  },
  notificationPreferenceBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3
  },
  notificationInboxRow: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md
  },
  notificationInboxOpen: {
    flex: 1,
    minWidth: 0
  },
  notificationInboxActions: {
    flexDirection: "row",
    gap: spacing.xs
  },
  notificationIconAction: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  dangerAction: {
    alignItems: "center",
    borderColor: "rgba(201, 130, 141, 0.45)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md
  },
  dangerActionText: {
    color: colors.rose,
    fontSize: 14,
    fontWeight: "900"
  },
  operatorRow: {
    opacity: 0.78
  },
  miniStatValue: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: "800"
  },
  miniStatLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: spacing.xs
  },
  sourcePath: {
    color: colors.moon,
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.xs
  },
  toast: {
    alignSelf: "center",
    backgroundColor: colors.ivory,
    borderRadius: 8,
    bottom: 86,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute"
  },
  toastAbovePersonaCta: {
    bottom: 154,
    marginHorizontal: spacing.lg,
    maxWidth: 480
  },
  generationActivityDock: {
    alignItems: "center",
    backgroundColor: colors.charcoal,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%"
  },
  toastText: {
    color: colors.charcoal,
    fontWeight: "800"
  },
  confirmOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(21, 20, 22, 0.72)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  confirmCard: {
    backgroundColor: colors.panel,
    borderColor: "rgba(201, 164, 92, 0.32)",
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 420,
    padding: spacing.lg,
    width: "100%"
  },
  confirmIcon: {
    alignItems: "center",
    backgroundColor: "rgba(201, 164, 92, 0.10)",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 44
  },
  confirmTitle: {
    color: colors.ivory,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28
  },
  confirmBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  confirmCancel: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  confirmCancelText: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center"
  },
  confirmPrimary: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: 8,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  confirmDanger: {
    backgroundColor: "rgba(201, 130, 141, 0.18)",
    borderColor: "rgba(201, 130, 141, 0.52)",
    borderWidth: 1
  },
  confirmPrimaryText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center"
  },
  confirmDangerText: {
    color: colors.rose
  },
  traitRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  traitPill: {
    backgroundColor: "rgba(247, 241, 230, 0.08)",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.moon,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4
  }
});
