import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import personaShortNamesData from "../../../../../packages/content/data/persona-short-names.json";

import {
  ChatComposer,
  ChatContextNotice,
  ChatMessageBubble,
  ChatParticipant,
  ChatParticipantStrip,
  ChatRoomHeader,
  ChatThinkingIndicator,
  QuickReplyRail
} from "../../a2ui";
import { localizedText } from "../../i18n";
import { colors, radius, spacing, typography } from "../../theme";
import { CrisisSupportCard } from "../safety/CrisisSupportCard";
import { AiCouncilTemplate, Language, Persona } from "../../types";

export type AiCouncilTurn = {
  id: string;
  role: "user" | "guide";
  text: string;
  persona?: Persona;
  lens?: string;
  kind?: "opening" | "perspective" | "response" | "synthesis";
  replyToPersonaId?: string;
  sequence?: number;
  promptVersionId?: string;
  /** Canned turn shown when the model is unavailable; labelled in the room. */
  fallback?: boolean;
};

export type AiCouncilGuideDetail = {
  persona: Persona;
  role: string;
  purpose: string;
};

export type AiCouncilQuickReply = {
  id: string;
  label: string;
};

export type AiCouncilSynthesis = {
  consensus: string;
  tensions: string[];
  assumptions: string[];
  nextStep: string;
  reflectionQuestion: string;
};

export type AiCouncilSessionSummary = {
  id: string;
  guideCount: number;
  templateName: string;
  title: string;
  turnCount: number;
  updatedAt: string;
};

export type AiCouncilRoomProps = {
  activeTemplates: AiCouncilTemplate[];
  activeSessionId: string;
  councilFlow: string[];
  customCouncilName: string;
  customCouncilSavedAt?: string;
  customCouncilTone: string;
  customToneOptions: Array<{ id: string; label: string }>;
  generating: boolean;
  synthesis: AiCouncilSynthesis | null;
  getModeLabel: (value: string, language: Language) => string;
  getPersonaThumbnail: (persona: Persona) => ImageSourcePropType;
  getSynthesisLabel: (value: string, language: Language) => string;
  guestPersonaIds: string[];
  guideDetails: AiCouncilGuideDetail[];
  inviteCandidates: Persona[];
  language: Language;
  onAddGuide: () => void;
  onBack: () => void;
  onCustomCouncilNameChange: (value: string) => void;
  onCustomCouncilToneChange: (value: string) => void;
  onOpenGuideChat: (turn: AiCouncilTurn) => void;
  onQuestionChange: (value: string) => void;
  onResumeSession: (sessionId: string) => void;
  onSaveCustomCouncil: () => void;
  onSaveTranscript: () => void;
  onSelectQuickReply: (reply: AiCouncilQuickReply) => void;
  onSelectTemplate: (template: AiCouncilTemplate) => void;
  onSend: () => void;
  onStartNewSession: () => void;
  onToggleGuest: (persona: Persona) => void;
  onToggleSetup: () => void;
  participants: ChatParticipant[];
  personas: Persona[];
  question: string;
  quickReplies: AiCouncilQuickReply[];
  sessionSummaries: AiCouncilSessionSummary[];
  setupExpanded: boolean;
  template: AiCouncilTemplate;
  thread: AiCouncilTurn[];
  /** Shared safety reply for the last message, shown instead of council turns. */
  safetyNotice?: { text: string; crisis: boolean } | null;
  /** Opens the shared feedback panel for one guide turn (analysis CH-02). */
  onReportTurn?: (turnId: string) => void;
};

export function AiCouncilRoom({
  activeTemplates,
  activeSessionId,
  councilFlow,
  customCouncilName,
  customCouncilSavedAt,
  customCouncilTone,
  customToneOptions,
  generating,
  synthesis,
  getModeLabel,
  getPersonaThumbnail,
  getSynthesisLabel,
  guestPersonaIds,
  guideDetails,
  inviteCandidates,
  language,
  onAddGuide,
  onBack,
  onCustomCouncilNameChange,
  onCustomCouncilToneChange,
  onOpenGuideChat,
  onQuestionChange,
  onResumeSession,
  onSaveCustomCouncil,
  onSaveTranscript,
  onSelectQuickReply,
  onSelectTemplate,
  onSend,
  onStartNewSession,
  onToggleGuest,
  onToggleSetup,
  participants,
  personas,
  question,
  quickReplies,
  safetyNotice,
  onReportTurn,
  sessionSummaries,
  setupExpanded,
  template,
  thread
}: AiCouncilRoomProps) {
  const vi = language === "vi";
  // Keep the newest turn in view as the council answers, like persona chat.
  const scrollRef = useRef<ScrollView | null>(null);
  useEffect(() => {
    if (thread.length === 0 && !generating && !safetyNotice) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [thread.length, generating, safetyNotice]);
  const selectedPersonaIds = new Set(personas.map((persona) => persona.id));
  const councilTitle = customCouncilName.trim() || (vi ? "Hội đồng 3 góc nhìn" : "Three-view council");
  const guideCountWord = vi ? ["Hai", "Ba", "Bốn"][personas.length - 2] ?? String(personas.length) : String(personas.length);
  const councilHistory = sessionSummaries.map((session) => ({
    id: session.id,
    meta: `${session.templateName} / ${session.guideCount} ${language === "vi" ? "người dẫn đường" : "guides"} / ${session.turnCount} ${language === "vi" ? "lượt" : "turns"}`,
    title: session.title
  }));
  const councilNotice = language === "vi"
    ? "Hội đồng là AI mô phỏng nhiều người dẫn cùng suy nghĩ với bạn, để tự phản chiếu."
    : "AI Council simulates several guides thinking with you. Responses are for self-reflection.";
  const gatherGuideOptions = [
    ...guideDetails.map(({ persona, role, purpose }) => ({
      disabled: personas.length <= 2,
      persona,
      purpose,
      role,
      selected: true
    })),
    ...inviteCandidates.map((persona) => ({
      disabled: false,
      persona,
      purpose: localizedText(persona.shortDescription, language),
      role: localizedText(persona.displayRole ?? persona.sourceInspiration, language, persona.type),
      selected: selectedPersonaIds.has(persona.id)
    }))
  ].slice(0, 8);

  return (
    <View style={styles.screen}>
      <ChatRoomHeader
        activeSessionId={activeSessionId}
        backLabel={vi ? "Quay lại" : "Back"}
        menuLabel={vi ? "Thêm tùy chọn" : "More options"}
        emptyHistoryLabel={language === "vi" ? "Chưa có hội đồng nào trước đó." : "No previous council yet."}
        historyLabel={language === "vi" ? "Lịch sử" : "History"}
        historyTitle={language === "vi" ? "Tiếp tục hội đồng" : "Continue a council"}
        menuActions={[
          {
            icon: "person-add-outline",
            id: "add-guide",
            label: language === "vi" ? "Tự chọn người dẫn" : "Choose guides yourself",
            onPress: onAddGuide
          },
          {
            cancelLabel: language === "vi" ? "Tiếp tục hội đồng" : "Keep council",
            confirmBody: language === "vi"
              ? "Biên bản hiện tại vẫn được lưu trong lịch sử."
              : "Your current transcript will stay in history.",
            confirmLabel: language === "vi" ? "Hội đồng mới" : "New council",
            confirmTitle: language === "vi" ? "Bắt đầu hội đồng mới?" : "Start a new council?",
            icon: "add-circle-outline",
            id: "new-council",
            label: language === "vi" ? "Hội đồng mới" : "New council",
            onPress: onStartNewSession
          },
          {
            disabled: thread.length === 0,
            icon: "bookmark-outline",
            id: "save-transcript",
            label: language === "vi" ? "Lưu biên bản" : "Save transcript",
            onPress: onSaveTranscript
          }
        ]}
        onBack={onBack}
        onResumeSession={onResumeSession}
        sessions={councilHistory}
        subtitle={councilTopicLabel(template, language)}
        title={councilTitle}
      />

      {thread.length > 0 ? (
        <>
          <ChatContextNotice
            brief={councilNotice}
            detail={language === "vi"
              ? "Mỗi người dẫn là AI được thiết kế theo một góc nhìn riêng, không phải người thật hay đại diện chính thức cho bất kỳ nhân vật, tác giả hoặc tổ chức nào."
              : "Each guide is a designed AI persona with a distinct lens, not a real person or an official representative of any figure, author, or organization."}
            detailLabel={language === "vi" ? "Chi tiết" : "Details"}
          />
          <ChatParticipantStrip
            addLabel={language === "vi" ? "Tự chọn" : "Choose"}
            density="compact"
            onAdd={onAddGuide}
            participants={participants}
            selectedIds={participants.map((participant) => participant.id)}
          />
        </>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroller} accessibilityRole="radiogroup">
          <View style={styles.templateRail}>
            {activeTemplates.map((item) => {
              const active = item.id === template.id;
              return (
                <Pressable
                  key={`top-template-${item.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => onSelectTemplate(item)}
                  style={[styles.topicChip, active && styles.topicChipActive]}
                >
                  <Text numberOfLines={1} style={[styles.topicChipText, active && styles.topicChipTextActive]}>{councilTopicLabel(item, language)}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {setupExpanded ? (
        <View style={styles.gatherPanel}>
          <View style={styles.gatherHeader}>
            <View style={styles.flex}>
              <Text style={styles.kicker}>{language === "vi" ? "Tự chọn người dẫn" : "Custom Council"}</Text>
              <Text style={styles.gatherTitle}>{language === "vi" ? "Tạo hội đồng của riêng bạn" : "Shape your own council"}</Text>
              <Text style={styles.gatherSubtitle}>
                {language === "vi"
                  ? "Đặt tên, chọn giọng trả lời và giữ 2–4 người dẫn."
                  : "Rename it, choose a tone, and keep 2-4 guides. Nilaza keeps prompts structured for safety."}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onToggleSetup} style={styles.gatherCloseButton}>
              <Ionicons name="close-outline" size={18} color={colors.ivory} />
            </Pressable>
          </View>

          <View style={styles.customPanel}>
            <Text style={styles.customLabel}>{language === "vi" ? "Tên hội đồng" : "Council name"}</Text>
            <TextInput
              accessibilityLabel={language === "vi" ? "Tên hội đồng của bạn" : "Custom Council name"}
              onChangeText={onCustomCouncilNameChange}
              placeholder={language === "vi" ? "VD: Hội đồng quyết định sáng suốt" : "e.g. Wise Decision Council"}
              placeholderTextColor={colors.moon}
              style={styles.customInput}
              value={customCouncilName}
            />
            <Text style={styles.customLabel}>{language === "vi" ? "Giọng trả lời" : "Response tone"}</Text>
            <View style={styles.toneRail}>
              {customToneOptions.map((tone) => {
                const active = tone.id === customCouncilTone;
                return (
                  <Pressable
                    key={tone.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => onCustomCouncilToneChange(tone.id)}
                    style={[styles.toneChip, active && styles.toneChipActive]}
                  >
                    <Text style={[styles.toneChipText, active && styles.toneChipTextActive]}>{tone.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {customCouncilSavedAt ? (
              <Text style={styles.customSavedText}>{language === "vi" ? "Đã lưu hội đồng của bạn." : "Custom Council saved."}</Text>
            ) : null}
          </View>

          {thread.length === 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroller}>
            <View style={styles.templateRail}>
              {activeTemplates.map((item) => {
                const active = item.id === template.id;
                return (
                  <Pressable
                    key={`gather-template-${item.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => onSelectTemplate(item)}
                    style={[styles.gatherTemplateChip, active && styles.gatherTemplateChipActive]}
                  >
                    <Text style={[styles.gatherTemplateText, active && styles.gatherTemplateTextActive]}>{localizedText(item.name, language)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          ) : null}

          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.gatherList}>
            {gatherGuideOptions.map(({ disabled, persona, purpose, role, selected }) => (
              <Pressable
                key={`gather-${persona.id}`}
                accessibilityRole="button"
                accessibilityState={{ disabled, selected }}
                disabled={disabled}
                onPress={() => onToggleGuest(persona)}
                style={[styles.gatherGuideCard, selected && styles.gatherGuideCardSelected, disabled && styles.gatherGuideCardLocked]}
              >
                <Image resizeMode="cover" source={getPersonaThumbnail(persona)} style={styles.gatherGuideImage} />
                <View style={styles.gatherGuideCopy}>
                  <Text numberOfLines={1} style={styles.gatherGuideName}>{localizedText(persona.name, language)}</Text>
                  <Text numberOfLines={2} style={styles.gatherGuidePurpose}>{purpose}</Text>
                  <View style={styles.gatherGuideTag}>
                    <Text numberOfLines={1} style={styles.gatherGuideTagText}>{role}</Text>
                  </View>
                </View>
                <View style={[styles.gatherCheck, selected && styles.gatherCheckSelected]}>
                  {selected ? <Ionicons name="checkmark-outline" size={15} color={colors.charcoal} /> : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.gatherFooter}>
            <Text style={styles.gatherCount}>
              <Text style={styles.gatherCountStrong}>{personas.length}</Text>
              {language === "vi" ? " / 4 người dẫn đã chọn" : " / 4 guides selected"}
            </Text>
            <View style={styles.gatherFooterActions}>
              <Pressable accessibilityRole="button" onPress={onSaveCustomCouncil} style={styles.gatherSaveButton}>
                <Text style={styles.gatherSaveText}>{language === "vi" ? "Lưu hội đồng" : "Save Council"}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onToggleSetup} style={styles.gatherDoneButton}>
                <Text style={styles.gatherDoneText}>{language === "vi" ? "Xong" : "Done"}</Text>
                <Ionicons name="sparkles-outline" size={16} color={colors.charcoal} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {thread.length === 0 ? (
          <View style={styles.startPanel}>
            <View style={styles.trio}>
              {guideDetails.map(({ persona, role }) => (
                <View key={`start-${persona.id}`} style={styles.trioGuide}>
                  <Image resizeMode="cover" source={getPersonaThumbnail(persona)} style={styles.trioAvatar} />
                  <Text numberOfLines={2} style={styles.trioName}>{guideShortName(persona, language)}</Text>
                  <Text numberOfLines={2} style={styles.trioRole}>{role}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.startHeadline}>
              {vi
                ? `Kể một tình huống thật. ${guideCountWord} người dẫn trả lời từ ${guideCountWord.toLowerCase()} góc, rồi bạn hỏi tiếp.`
                : `Tell a real situation. ${personas.length} guides answer from ${personas.length} angles, then you can keep asking.`}
            </Text>
            <View style={styles.starters}>
              {quickReplies.slice(0, 3).map((reply) => (
                <Pressable key={reply.id} accessibilityRole="button" onPress={() => onSelectQuickReply(reply)} style={styles.starter}>
                  <Text style={styles.starterText}>{reply.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {thread.length === 0 ? null : (
          <View style={styles.transcript}>
            <Text style={styles.sectionKicker}>{language === "vi" ? "Biên bản hội đồng" : "Council transcript"}</Text>
            {thread.map((turn) => turn.role === "user" ? (
              <ChatMessageBubble key={turn.id} author={language === "vi" ? "Bạn" : "You"} tone="user">
                {turn.text}
              </ChatMessageBubble>
            ) : (() => {
              const replyTo = turn.replyToPersonaId ? personas.find((persona) => persona.id === turn.replyToPersonaId) : undefined;
              const interactionMeta = replyTo
                ? (language === "vi" ? `Phản hồi góc nhìn của ${localizedText(replyTo.name, language)}` : `Responding to ${localizedText(replyTo.name, language)}`)
                : turn.kind === "opening"
                  ? (language === "vi" ? "Mở vòng thảo luận" : "Opening the round")
                  : turn.lens;
              return <ChatMessageBubble
                key={turn.id}
                action={turn.persona || onReportTurn ? (
                  <View style={styles.turnActions}>
                    {turn.persona ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Trò chuyện riêng với người dẫn này" : "Chat with this guide"} onPress={() => onOpenGuideChat(turn)} style={styles.bubbleAction}>
                        <Ionicons name="chatbubble-outline" size={17} color={colors.gold} />
                      </Pressable>
                    ) : null}
                    {onReportTurn ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Báo cáo câu trả lời này" : "Report this answer"} onPress={() => onReportTurn(turn.id)} style={styles.bubbleAction}>
                        <Ionicons name="flag-outline" size={17} color={colors.gold} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                author={localizedText(turn.persona?.name, language, "Guide")}
                avatar={turn.persona ? getPersonaThumbnail(turn.persona) : undefined}
                meta={turn.fallback ? (vi ? "Câu trả lời dự phòng — AI chưa kết nối được." : "Fallback reply — AI is not connected.") : interactionMeta}
                tone="guide"
              >
                {turn.text}
              </ChatMessageBubble>
            })())}
            {synthesis ? (
              <View style={styles.synthesisPanel}>
                <Text style={styles.synthesisTitle}>{language === "vi" ? "Tổng hợp" : "Structured synthesis"}</Text>
                <Text style={styles.synthesisLabel}>{language === "vi" ? "Điểm chung" : "Consensus"}</Text>
                <Text style={styles.synthesisBody}>{synthesis.consensus}</Text>
                {synthesis.tensions.length > 0 ? (
                  <>
                    <Text style={styles.synthesisLabel}>{language === "vi" ? "Điểm còn căng" : "Tensions"}</Text>
                    {synthesis.tensions.map((item, index) => <Text key={`tension-${index}`} style={styles.synthesisBullet}>• {item}</Text>)}
                  </>
                ) : null}
                {synthesis.assumptions.length > 0 ? (
                  <>
                    <Text style={styles.synthesisLabel}>{language === "vi" ? "Giả định cần kiểm tra" : "Assumptions to check"}</Text>
                    {synthesis.assumptions.map((item, index) => <Text key={`assumption-${index}`} style={styles.synthesisBullet}>• {item}</Text>)}
                  </>
                ) : null}
                <Text style={styles.synthesisLabel}>{language === "vi" ? "Bước nhỏ tiếp theo" : "Next small step"}</Text>
                <Text style={styles.synthesisBody}>{synthesis.nextStep}</Text>
                <Text style={styles.synthesisLabel}>{language === "vi" ? "Câu hỏi mở" : "Open question"}</Text>
                <Text style={styles.synthesisBody}>{synthesis.reflectionQuestion}</Text>
              </View>
            ) : null}
            <Pressable accessibilityRole="button" onPress={onSaveTranscript} style={styles.transcriptSaveAction}>
              <Ionicons name="bookmark-outline" size={16} color={colors.gold} />
              <Text style={styles.transcriptSaveText}>{language === "vi" ? "Lưu biên bản" : "Save transcript"}</Text>
            </Pressable>
          </View>
        )}

        {safetyNotice ? (
          <View>
            <ChatMessageBubble tone="system">{safetyNotice.text}</ChatMessageBubble>
            {safetyNotice.crisis ? <CrisisSupportCard language={language} /> : null}
          </View>
        ) : null}

        {generating ? (
          <ChatMessageBubble tone="system">
            <ChatThinkingIndicator label={language === "vi"
              ? "Hội đồng đang lắng nghe. Các người dẫn đang chuẩn bị góc nhìn tiếp theo…"
              : "The council is listening. Guides are preparing the next perspectives..."} />
          </ChatMessageBubble>
        ) : null}
      </ScrollView>

      <View style={styles.composerPanel}>
        {thread.length > 0 ? <QuickReplyRail prompts={quickReplies} onSelect={onSelectQuickReply} /> : null}
        <ChatComposer
          sendLabel={language === "vi" ? "Gửi" : "Send"}
          disabled={generating}
          onChangeText={onQuestionChange}
          onSend={onSend}
          placeholder={vi ? (thread.length ? "Hỏi tiếp hội đồng…" : "Viết tình huống của bạn…") : thread.length ? "Ask the council more…" : "Write your situation…"}
          sendIcon={generating ? "hourglass-outline" : "send-outline"}
          value={question}
        />
        {/* ai-council enforces one council per local day (deployed to staging 2026-10-31). */}
        <Text style={styles.footerNote}>{vi ? "AI mô phỏng nhiều góc nhìn để tự phản chiếu · 1 lượt hội đồng mỗi ngày" : "AI simulates several perspectives for self-reflection · 1 council a day"}</Text>
      </View>
    </View>
  );
}

// Short topic labels for the four council templates (Council design).
export function councilTopicLabel(template: AiCouncilTemplate, language: Language) {
  const labels: Record<string, { vi: string; en: string }> = {
    love_confusion: { vi: "Tình cảm", en: "Love" },
    career_fog: { vi: "Công việc", en: "Work" },
    overthinking: { vi: "Nghĩ quá nhiều", en: "Overthinking" },
    big_decision: { vi: "Quyết định lớn", en: "Big decision" }
  };
  return labels[template.id]?.[language === "vi" ? "vi" : "en"] ?? localizedText(template.name, language);
}

const shortNames = personaShortNamesData.personas as Record<string, { short: { vi: string; en: string } }>;
const guideShortName = (persona: Persona, language: Language) =>
  shortNames[persona.id] ? (language === "vi" ? shortNames[persona.id].short.vi : shortNames[persona.id].short.en) : localizedText(persona.name, language);

const styles = StyleSheet.create({
  topicChip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", alignItems: "center", justifyContent: "center" },
  topicChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  topicChipText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  topicChipTextActive: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily },
  startPanel: { gap: 22, paddingTop: 20 },
  trio: { flexDirection: "row", gap: 10 },
  trioGuide: { flex: 1, minWidth: 0, alignItems: "center", gap: 6 },
  trioAvatar: { width: 72, height: 72, borderRadius: 36 },
  trioName: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5, textAlign: "center" },
  trioRole: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12, textAlign: "center" },
  startHeadline: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 29, textAlign: "center", paddingHorizontal: 12 },
  starters: { gap: 8 },
  starter: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", backgroundColor: "#1F1C1E", justifyContent: "center" },
  starterText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 20 },
  footerNote: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 11.5, textAlign: "center" },
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    position: "relative"
  },
  synthesisPanel: {
    backgroundColor: "rgba(14, 90, 90, 0.2)",
    borderColor: "rgba(201, 164, 92, 0.3)",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.md
  },
  synthesisTitle: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 15,
    marginBottom: spacing.xs
  },
  synthesisLabel: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 12,
    marginTop: spacing.xs
  },
  synthesisBody: {
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    lineHeight: 20
  },
  synthesisBullet: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    lineHeight: 19
  },
  gatherPanel: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    bottom: 0,
    elevation: 8,
    flex: 1,
    gap: spacing.sm,
    left: 0,
    maxHeight: "100%",
    padding: spacing.md,
    paddingTop: spacing.lg,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20
  },
  gatherHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  gatherTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 23,
    fontWeight: "700",
    lineHeight: 28,
    marginTop: 2
  },
  gatherSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs
  },
  gatherCloseButton: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  customPanel: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  customLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  customInput: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  toneRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  toneChip: {
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  toneChipActive: {
    backgroundColor: "rgba(201, 164, 92, 0.14)",
    borderColor: colors.gold
  },
  toneChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  toneChipTextActive: {
    color: colors.ivory
  },
  customSavedText: {
    color: colors.moon,
    fontSize: 12,
    lineHeight: 17
  },
  templateScroller: {
    flexGrow: 0,
    flexShrink: 0
  },
  templateRail: {
    flexDirection: "row",
    gap: spacing.xs
  },
  gatherTemplateChip: {
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  gatherTemplateChipActive: {
    backgroundColor: "rgba(201, 164, 92, 0.16)",
    borderColor: colors.gold
  },
  gatherTemplateText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  gatherTemplateTextActive: {
    color: colors.ivory
  },
  gatherList: {
    flex: 1,
    minHeight: 0
  },
  gatherGuideCard: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 96,
    overflow: "hidden",
    padding: spacing.sm
  },
  gatherGuideCardSelected: {
    backgroundColor: "rgba(201, 164, 92, 0.10)",
    borderColor: colors.gold
  },
  gatherGuideCardLocked: {
    opacity: 0.78
  },
  gatherGuideImage: {
    borderRadius: radius.control,
    height: 68,
    width: 68
  },
  gatherGuideCopy: {
    flex: 1,
    minWidth: 0
  },
  gatherGuideName: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 22,
    fontWeight: "700"
  },
  gatherGuidePurpose: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2
  },
  gatherGuideTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    marginTop: spacing.xs,
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  gatherGuideTagText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  gatherCheck: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  gatherCheckSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold
  },
  gatherFooter: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.sm
  },
  gatherFooterActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  gatherSaveButton: {
    alignItems: "center",
    borderColor: "rgba(201, 164, 92, 0.38)",
    borderRadius: radius.control,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  gatherSaveText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900"
  },
  gatherCount: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  gatherCountStrong: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: "900"
  },
  gatherDoneButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.control,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md
  },
  gatherDoneText: {
    color: colors.charcoal,
    fontSize: 13,
    fontWeight: "900"
  },
  scroll: {
    flex: 1,
    minHeight: 0
  },
  content: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingBottom: spacing.sm
  },
  flex: {
    flex: 1
  },
  kicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  sectionKicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  transcript: {
    gap: spacing.md
  },
  transcriptSaveAction: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: "rgba(201, 164, 92, 0.28)",
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  transcriptSaveText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800"
  },
  turnActions: {
    flexDirection: "row",
    gap: 8
  },
  bubbleAction: {
    alignItems: "center",
    borderColor: "rgba(201, 164, 92, 0.28)",
    borderRadius: radius.control,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  composerPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.xs
  }
});
