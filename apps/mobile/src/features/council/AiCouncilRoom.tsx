import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

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
  sessionSummaries,
  setupExpanded,
  template,
  thread
}: AiCouncilRoomProps) {
  const selectedPersonaIds = new Set(personas.map((persona) => persona.id));
  const councilTitle = customCouncilName.trim() || localizedText(template.name, language);
  const councilHistory = sessionSummaries.map((session) => ({
    id: session.id,
    meta: `${session.templateName} / ${session.guideCount} ${language === "vi" ? "người dẫn đường" : "guides"} / ${session.turnCount} ${language === "vi" ? "lượt" : "turns"}`,
    title: session.title
  }));
  const councilNotice = language === "vi"
    ? "AI Council mô phỏng nhiều guide cùng suy nghĩ với bạn. Các phản hồi chỉ dùng cho tự-reflection."
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
        emptyHistoryLabel={language === "vi" ? "Chưa có hội đồng nào trước đó." : "No previous council yet."}
        historyLabel={language === "vi" ? "Lịch sử" : "History"}
        historyTitle={language === "vi" ? "Tiếp tục hội đồng" : "Continue a council"}
        menuActions={[
          {
            icon: "person-add-outline",
            id: "add-guide",
            label: language === "vi" ? "Tùy chỉnh AI Council" : "Customize Council",
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
        subtitle={`${personas.length} ${language === "vi" ? "người dẫn đường trong hội đồng" : "guides in council"}`}
        title={councilTitle}
      />

      <ChatContextNotice
        brief={councilNotice}
        detail={language === "vi"
          ? "Mỗi guide là một AI persona được thiết kế theo một lăng kính riêng, không phải người thật hay đại diện chính thức cho bất kỳ nhân vật, tác giả hoặc tổ chức nào."
          : "Each guide is a designed AI persona with a distinct lens, not a real person or an official representative of any figure, author, or organization."}
        detailLabel={language === "vi" ? "Chi tiết" : "Details"}
      />

      {thread.length === 0 ? (
      <View style={styles.councilTemplatePanel}>
        <View style={styles.councilTemplateHeader}>
          <Text style={styles.sectionKicker}>{language === "vi" ? "Kiểu hội đồng" : "Council format"}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroller}>
          <View style={styles.templateRail}>
            {activeTemplates.map((item) => {
              const active = item.id === template.id;
              return (
                <Pressable
                  key={`top-template-${item.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelectTemplate(item)}
                  style={[styles.gatherTemplateChip, active && styles.gatherTemplateChipActive]}
                >
                  <Text numberOfLines={1} style={[styles.gatherTemplateText, active && styles.gatherTemplateTextActive]}>{localizedText(item.name, language)}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
      ) : null}

      <ChatParticipantStrip
        addLabel={language === "vi" ? "Tùy chỉnh" : "Customize"}
        density="compact"
        onAdd={onAddGuide}
        participants={participants}
        selectedIds={participants.map((participant) => participant.id)}
      />

      {setupExpanded ? (
        <View style={styles.gatherPanel}>
          <View style={styles.gatherHeader}>
            <View style={styles.flex}>
              <Text style={styles.kicker}>{language === "vi" ? "AI Council tùy chỉnh" : "Custom Council"}</Text>
              <Text style={styles.gatherTitle}>{language === "vi" ? "Tạo hội đồng của riêng bạn" : "Shape your own council"}</Text>
              <Text style={styles.gatherSubtitle}>
                {language === "vi"
                  ? "Đổi tên, chọn tone và giữ 2-4 guide. Nilaza không cho prompt tự do để trải nghiệm vẫn an toàn."
                  : "Rename it, choose a tone, and keep 2-4 guides. Nilaza keeps prompts structured for safety."}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onToggleSetup} style={styles.gatherCloseButton}>
              <Ionicons name="close-outline" size={18} color={colors.ivory} />
            </Pressable>
          </View>

          <View style={styles.customPanel}>
            <Text style={styles.customLabel}>{language === "vi" ? "Tên AI Council" : "Council name"}</Text>
            <TextInput
              accessibilityLabel={language === "vi" ? "Tên AI Council tùy chỉnh" : "Custom Council name"}
              onChangeText={onCustomCouncilNameChange}
              placeholder={language === "vi" ? "VD: Hội đồng quyết định sáng suốt" : "e.g. Wise Decision Council"}
              placeholderTextColor={colors.moon}
              style={styles.customInput}
              value={customCouncilName}
            />
            <Text style={styles.customLabel}>{language === "vi" ? "Tone phản hồi" : "Response tone"}</Text>
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
              <Text style={styles.customSavedText}>{language === "vi" ? "Đã lưu AI Council tùy chỉnh." : "Custom Council saved."}</Text>
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
              {language === "vi" ? " / 4 người dẫn đường đã chọn" : " / 4 guides selected"}
            </Text>
            <View style={styles.gatherFooterActions}>
              <Pressable accessibilityRole="button" onPress={onSaveCustomCouncil} style={styles.gatherSaveButton}>
                <Text style={styles.gatherSaveText}>{language === "vi" ? "Lưu AI Council" : "Save Council"}</Text>
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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {thread.length === 0 ? (
          <View style={styles.roomPanel}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.kicker}>Cosmic Symposium</Text>
                <Text style={styles.roomTitle}>{councilTitle}</Text>
              </View>
              <View style={styles.avatarStack}>
                {personas.map((persona) => (
                  <Image key={`room-${persona.id}`} resizeMode="cover" source={getPersonaThumbnail(persona)} style={styles.avatar} />
                ))}
              </View>
            </View>
            <Text style={styles.inviteText}>
              {language === "vi"
                ? "Đưa một tình huống thật vào phòng. Các guide phản hồi theo từng lăng kính, rồi bạn tiếp tục đào sâu như trong một buổi họp tư vấn."
                : "Bring one real situation into the room. Guides respond through distinct lenses, then you can keep going like an advisory session."}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Ionicons name="people-outline" size={14} color={colors.gold} />
                <Text style={styles.metaText}>{personas.length} {language === "vi" ? "người dẫn đường" : "guides"}</Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="git-branch-outline" size={14} color={colors.gold} />
                <Text style={styles.metaText}>{getModeLabel(template.meetingMode, language)}</Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="sparkles-outline" size={14} color={colors.gold} />
                <Text style={styles.metaText}>{getSynthesisLabel(template.synthesisMode, language)}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {false && setupExpanded ? (
          <View style={styles.setupSection}>
            <Text style={styles.sectionKicker}>{language === "vi" ? "Chọn kiểu buổi họp" : "Choose the council format"}</Text>
            <View style={styles.templateGrid}>
              {activeTemplates.map((item) => {
                const active = item.id === template.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => onSelectTemplate(item)}
                    style={[styles.templateTile, active && styles.templateTileActive]}
                  >
                    <Text style={styles.templateName}>{localizedText(item.name, language)}</Text>
                    <Text style={styles.templateMeta}>{getModeLabel(item.meetingMode, language)} / {item.maxGuides} guides</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.agendaPanel}>
              <Text style={styles.agendaTitle}>{language === "vi" ? "Nhịp buổi họp" : "Meeting rhythm"}</Text>
              {(councilFlow.length > 0 ? councilFlow : [localizedText(template.useCase, language)]).slice(0, 3).map((step, index) => (
                <View key={`${template.id}-flow-${index}`} style={styles.agendaItem}>
                  <View style={styles.agendaNumber}>
                    <Text style={styles.agendaNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.agendaText}>{step}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionKicker}>{language === "vi" ? "Người dẫn đường trong phòng" : "Guides in the room"}</Text>
            <View style={styles.guideList}>
              {guideDetails.map(({ persona, role, purpose }) => (
                <View key={persona.id} style={styles.guideCard}>
                  <Image resizeMode="cover" source={getPersonaThumbnail(persona)} style={styles.guideImage} />
                  <View style={styles.guideCopy}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.guideName}>{localizedText(persona.name, language)}</Text>
                      <Text style={styles.guideRole}>{role}</Text>
                    </View>
                    <Text numberOfLines={2} style={styles.guidePurpose}>{purpose}</Text>
                  </View>
                  {guestPersonaIds.includes(persona.id) ? (
                    <Pressable accessibilityRole="button" onPress={() => onToggleGuest(persona)} style={styles.guideRemove}>
                      <Ionicons name="close-outline" size={16} color={colors.gold} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.invitePanel}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.agendaTitle}>{language === "vi" ? "Mời thêm góc nhìn" : "Invite another lens"}</Text>
                  <Text style={styles.guidePurpose}>
                    {language === "vi"
                      ? "Thêm một guide nếu tình huống cần tiếng nói khác. Giữ tối đa 4 guide để cuộc họp còn rõ."
                      : "Add a guide when the situation needs another voice. Keep it to 4 guides so the room stays clear."}
                  </Text>
                </View>
                <Text style={styles.guideRole}>{personas.length}/4</Text>
              </View>
              <Text style={styles.freeformHint}>
                {language === "vi"
                  ? "Không thấy đúng chủ đề? Cứ viết thẳng điều bạn đang cần bàn. Template chỉ định nhịp cuộc họp, không giới hạn nội dung."
                  : "Do not see your topic? Write exactly what you need to discuss. The template shapes the meeting rhythm; it does not limit your topic."}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptScroll}>
                <View style={styles.chipRail}>
                  {inviteCandidates.map((persona) => (
                    <Pressable
                      key={`invite-${persona.id}`}
                      accessibilityRole="button"
                      onPress={() => onToggleGuest(persona)}
                      style={styles.inviteGuideChip}
                    >
                      <Image resizeMode="cover" source={getPersonaThumbnail(persona)} style={styles.inviteGuideImage} />
                      <Text style={styles.promptText}>{localizedText(persona.name, language)}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        ) : null}

        {thread.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{language === "vi" ? "Phòng họp đang chờ bạn" : "The room is waiting"}</Text>
            <Text style={styles.muted}>
              {language === "vi"
                ? "Bắt đầu bằng một tình huống thật, rồi hỏi tiếp nếu bạn muốn các guide trao đổi sâu hơn."
                : "Start with a real situation, then keep asking if you want the guides to go deeper."}
            </Text>
          </View>
        ) : (
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
                action={turn.persona ? (
                  <Pressable accessibilityRole="button" onPress={() => onOpenGuideChat(turn)} style={styles.bubbleAction}>
                    <Ionicons name="chatbubble-outline" size={17} color={colors.gold} />
                  </Pressable>
                ) : null}
                author={localizedText(turn.persona?.name, language, "Guide")}
                avatar={turn.persona ? getPersonaThumbnail(turn.persona) : undefined}
                meta={interactionMeta}
                tone="guide"
              >
                {turn.text}
              </ChatMessageBubble>
            })())}
            {synthesis ? (
              <View style={styles.synthesisPanel}>
                <Text style={styles.synthesisTitle}>{language === "vi" ? "Tổng hợp có cấu trúc" : "Structured synthesis"}</Text>
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

        {generating ? (
          <ChatMessageBubble tone="system">
            <ChatThinkingIndicator label={language === "vi"
              ? "Hội đồng đang lắng nghe. Các guide đang chuẩn bị góc nhìn tiếp theo..."
              : "The council is listening. Guides are preparing the next perspectives..."} />
          </ChatMessageBubble>
        ) : null}
      </ScrollView>

      <View style={styles.composerPanel}>
        <Text style={styles.kicker}>{councilTitle}</Text>
        <QuickReplyRail prompts={quickReplies} onSelect={onSelectQuickReply} />
        <Text style={styles.freeformHint}>
          {language === "vi"
            ? "Không thấy đúng chủ đề? Cứ viết thẳng điều bạn đang cần bàn."
            : "Do not see your topic? Write exactly what you need to discuss."}
        </Text>
        <ChatComposer
          disabled={generating}
          onChangeText={onQuestionChange}
          onSend={onSend}
          placeholder={language === "vi" ? "Nhắn vào phòng hội đồng..." : "Message the council room..."}
          sendIcon={generating ? "hourglass-outline" : "send-outline"}
          value={question}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    position: "relative"
  },
  councilTemplatePanel: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.sm
  },
  councilTemplateHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  topAddButton: {
    alignItems: "center",
    borderColor: "rgba(201, 164, 92, 0.32)",
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm
  },
  topAddText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900"
  },
  compactHeader: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: 0,
    padding: spacing.sm
  },
  compactTitle: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "900"
  },
  compactMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2
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
  roomPanel: {
    backgroundColor: colors.panel,
    borderColor: "rgba(201, 164, 92, 0.32)",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.sm
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
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
  roomTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 27,
    marginTop: spacing.xs
  },
  avatarStack: {
    flexDirection: "row",
    marginLeft: spacing.sm
  },
  avatar: {
    borderColor: colors.surface,
    borderRadius: radius.control,
    borderWidth: 2,
    height: 28,
    marginLeft: -7,
    width: 28
  },
  inviteText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm
  },
  metaPill: {
    alignItems: "center",
    borderColor: "rgba(201, 164, 92, 0.28)",
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  metaText: {
    color: colors.ivory,
    fontSize: 11,
    fontWeight: "800"
  },
  setupSection: {
    gap: spacing.sm
  },
  sectionKicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  templateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  templateTile: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 74,
    padding: spacing.sm,
    width: "48%"
  },
  templateTileActive: {
    backgroundColor: "rgba(201, 164, 92, 0.12)",
    borderColor: colors.gold
  },
  templateName: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "900"
  },
  templateUseCase: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs
  },
  templateMeta: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  agendaPanel: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.sm
  },
  agendaTitle: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "900"
  },
  agendaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  agendaNumber: {
    alignItems: "center",
    backgroundColor: "rgba(201, 164, 92, 0.16)",
    borderRadius: radius.control,
    height: 22,
    justifyContent: "center",
    width: 22
  },
  agendaNumberText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900"
  },
  agendaText: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    lineHeight: 17
  },
  guideList: {
    gap: spacing.sm
  },
  guideCard: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm
  },
  guideImage: {
    borderRadius: radius.control,
    height: 32,
    width: 32
  },
  guideCopy: {
    flex: 1
  },
  guideName: {
    color: colors.ivory,
    flex: 1,
    fontSize: 14,
    fontWeight: "900"
  },
  guideRole: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "800"
  },
  guidePurpose: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3
  },
  guideRemove: {
    alignItems: "center",
    borderColor: "rgba(201, 164, 92, 0.34)",
    borderRadius: radius.control,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  invitePanel: {
    backgroundColor: "rgba(14, 90, 90, 0.14)",
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.sm
  },
  freeformHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: spacing.xs
  },
  promptScroll: {
    marginTop: spacing.sm
  },
  chipRail: {
    flexDirection: "row",
    gap: spacing.sm
  },
  inviteGuideChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderColor: "rgba(201, 164, 92, 0.28)",
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  inviteGuideImage: {
    borderRadius: radius.control,
    height: 24,
    width: 24
  },
  promptText: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  empty: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md
  },
  emptyTitle: {
    color: colors.ivory,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center"
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
    textAlign: "center"
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
