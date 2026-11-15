import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, layout, radius, spacing, typography } from "../../theme";
import { ReadingDetails } from "../../a2ui/ReadingDetails";
import { premiumOnSale as policyPremiumOnSale } from "../owner/accountTierPolicy";
import { CrisisSupportCard } from "../safety/CrisisSupportCard";
import type { AnswerProvenance } from "../../../../../packages/ai-contracts/answer-provenance";

export type AstrologyAiGuideStatus =
  | "locked"
  | "ready"
  | "loading"
  | "error"
  | "success";

export type AstrologyAiGuideEvidence = {
  id: string;
  selectionId?: string;
  label: string;
  glyph?: string;
  detail?: string;
  highlighted?: boolean;
};

export type AstrologyAiGuideAnswer = {
  language?: "vi" | "en";
  provenance?: AnswerProvenance;
  eyebrow?: string;
  title: string;
  paragraphs: string[];
  evidenceIds?: string[];
  suggestedFollowUps?: string[];
  sections?: Array<{ id: string; title: string; body: string; question?: string; evidenceFactIds: string[]; caveatIds: string[]; caveatNotes?: string[] }>;
};

export type AstrologyAiGuidePanelProps = {
  language: "vi" | "en";
  status: AstrologyAiGuideStatus;
  question: string;
  onQuestionChange: (question: string) => void;
  onSubmitQuestion: (question: string) => void;
  onRequestUnlock?: (pendingQuestion?: string) => void;
  onContinueFree?: () => void;
  onRetry?: () => void;
  onSaveAnswer?: () => void;
  onReportAnswer?: () => void;
  answerSaved?: boolean;
  answerSaving?: boolean;
  onCollapse?: () => void;
  onExamplePromptPress?: (prompt: string) => void;
  onEvidencePress?: (evidence: AstrologyAiGuideEvidence) => void;
  evidence?: AstrologyAiGuideEvidence[];
  answer?: AstrologyAiGuideAnswer;
  examplePrompts?: string[];
  errorMessage?: string;
  loadingMessage?: string;
  trustLine?: string;
  unlockLabel?: string;
  premiumNote?: string;
  /** Premium wording is shown only while Premium is on sale (UX review K4/U1, 2026-11-15). */
  premiumOnSale?: boolean;
  /** The request was stopped for crisis support: show the canonical 115 card and no retry (UX review K5/U2). */
  crisis?: boolean;
  disabled?: boolean;
  showHandle?: boolean;
  testID?: string;
};

const defaultEvidence: Record<"vi" | "en", AstrologyAiGuideEvidence[]> = {
  vi: [
    { id: "sun", glyph: "☉", label: "Mặt Trời" },
    { id: "moon", glyph: "☽", label: "Mặt Trăng" },
    { id: "ascendant", glyph: "ASC", label: "Cung mọc" },
    { id: "aspects", glyph: "△", label: "Góc hợp" },
  ],
  en: [
    { id: "sun", glyph: "☉", label: "Sun" },
    { id: "moon", glyph: "☽", label: "Moon" },
    { id: "ascendant", glyph: "ASC", label: "Rising" },
    { id: "aspects", glyph: "△", label: "Aspects" },
  ],
};

const defaultPrompts: Record<"vi" | "en", string[]> = {
  vi: [
    "Vì sao tôi thường tự gây áp lực?",
    "Điều gì đang mâu thuẫn trong tôi?",
  ],
  en: [
    "Why do I put so much pressure on myself?",
    "What feels conflicted within me?",
  ],
};

export function AstrologyAiGuidePanel({
  language,
  status,
  question,
  onQuestionChange,
  onSubmitQuestion,
  onRequestUnlock,
  onContinueFree,
  onRetry,
  onSaveAnswer,
  onReportAnswer,
  answerSaved = false,
  answerSaving = false,
  onCollapse,
  onExamplePromptPress,
  onEvidencePress,
  evidence = defaultEvidence[language],
  answer,
  examplePrompts = defaultPrompts[language],
  errorMessage,
  loadingMessage,
  trustLine,
  unlockLabel,
  premiumNote,
  premiumOnSale = policyPremiumOnSale,
  crisis = false,
  disabled = false,
  showHandle = true,
  testID,
}: AstrologyAiGuidePanelProps) {
  const vi = language === "vi";
  const trimmedQuestion = question.trim();
  const isBusy = status === "loading";
  const canSubmit =
    trimmedQuestion.length > 0 &&
    !disabled &&
    !isBusy &&
    (status === "locked" ? Boolean(onRequestUnlock) : status !== "error");
  const visibleEvidence =
    status === "success" && answer?.evidenceIds?.length
      ? evidence.filter((item) => answer.evidenceIds?.includes(item.id))
      : evidence;
  const suggestedFollowUps = answer?.suggestedFollowUps
    ?.filter((prompt) => prompt.trim())
    .slice(0, 3);
  const promptChoices =
    suggestedFollowUps && suggestedFollowUps.length > 0
      ? suggestedFollowUps
      : examplePrompts;
  const missingSuccessAnswer = status === "success" && !answer;

  const copy = vi
    ? {
        kicker: premiumOnSale ? "NGƯỜI DẪN ĐƯỜNG AI · PREMIUM" : "NGƯỜI DẪN ĐƯỜNG AI",
        lockedTitle: "Nối các điểm trong bản đồ của bạn",
        readyTitle: "Bạn muốn hiểu điều gì về mình?",
        intro:
          "Người dẫn đường sẽ nối dữ kiện trên bản đồ với câu hỏi của bạn trong một lượt riêng.",
        readyIntro:
          "Chỉ gửi dữ kiện chiêm tinh đã tính và câu hỏi hiện tại sau khi bạn đồng ý. Không gửi ngày giờ nơi sinh, Nhật ký hay lịch sử trò chuyện.",
        trust: "Dựa trên dữ kiện đã tính · AI không tự tính lại bản đồ",
        placeholder: "Bạn muốn hiểu điều gì về mình?",
        send: "Gửi câu hỏi cho Người dẫn đường AI",
        unlock: "Mở khóa Người dẫn đường AI",
        premiumNote: premiumOnSale
          ? "Premium · Một câu hỏi mỗi lượt, dựa trên dữ kiện liên quan trong bản đồ"
          : "Một câu hỏi mỗi lượt, dựa trên dữ kiện liên quan trong bản đồ",
        continueFree: "Tiếp tục đọc bản đồ miễn phí",
        loading: "Đang nối các dữ kiện trong bản đồ của bạn…",
        errorTitle: "Người dẫn đường chưa thể trả lời",
        error:
          "Phân tích chưa hoàn tất. Câu hỏi của bạn vẫn được giữ để thử lại.",
        retry: "Thử phân tích lại",
        answerEvidence: "Dữ kiện được dùng trong cách đọc này",
        examples: "Câu hỏi gợi ý",
        promptAction: "Dùng câu hỏi gợi ý",
        disclaimer:
          "Nội dung mang tính biểu tượng để giải trí và tự phản chiếu; bạn luôn là người quyết định điều gì phù hợp với mình.",
        collapse: "Thu gọn Người dẫn đường AI",
      }
    : {
        kicker: premiumOnSale ? "AI GUIDE · PREMIUM" : "AI GUIDE",
        lockedTitle: "Connect the points in your chart",
        readyTitle: "What would you like to understand about yourself?",
        intro:
          "The guide connects calculated chart facts to your question in a single turn.",
        readyIntro:
          "Only calculated chart facts and your current question are sent after you consent. Birth details, Journal, and chat history are excluded.",
        trust: "Grounded in calculated facts · AI does not recalculate your chart",
        placeholder: "What would you like to understand about yourself?",
        send: "Send question to the AI guide",
        unlock: "Unlock the AI guide",
        premiumNote: premiumOnSale
          ? "Premium · One question per turn, based on relevant facts from your chart"
          : "One question per turn, based on relevant facts from your chart",
        continueFree: "Continue reading the chart for free",
        loading: "Connecting the facts in your chart…",
        errorTitle: "Your guide could not answer yet",
        error:
          "The analysis did not finish. Your question is still here so you can retry.",
        retry: "Try the analysis again",
        answerEvidence: "Chart facts used in this reading",
        examples: "Suggested questions",
        promptAction: "Use suggested question",
        disclaimer:
          "Symbolic content for entertainment and self-reflection; you decide what feels relevant to your experience.",
        collapse: "Collapse AI guide",
      };

  const submit = () => {
    if (!canSubmit) return;
    if (status === "locked") {
      onRequestUnlock?.(trimmedQuestion);
      return;
    }
    onSubmitQuestion(trimmedQuestion);
  };

  const selectPrompt = (prompt: string) => {
    onQuestionChange(prompt);
    onExamplePromptPress?.(prompt);
  };

  return (
    <View testID={testID} style={styles.panel}>
      <View style={[styles.ornament, { pointerEvents: "none" }]}>
        <View style={styles.ornamentLine} />
        <View style={styles.ornamentSun}>
          <Text style={styles.ornamentSunGlyph}>☉</Text>
        </View>
        <View style={styles.ornamentDiamond} />
      </View>

      {showHandle ? (
        onCollapse ? (
          <Pressable
            accessibilityLabel={copy.collapse}
            accessibilityRole="button"
            hitSlop={12}
            onPress={onCollapse}
            style={styles.handleButton}
          >
            <View style={styles.handle} />
          </Pressable>
        ) : (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.handleButton}>
            <View style={styles.handle} />
          </View>
        )
      ) : null}

      <View style={styles.content}>
        <Text style={styles.kicker}>{copy.kicker}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {status === "locked" ? copy.lockedTitle : copy.readyTitle}
        </Text>
        <Text style={styles.intro}>
          {status === "locked" ? copy.intro : copy.readyIntro}
        </Text>

        <EvidenceRow
          evidence={visibleEvidence}
          onEvidencePress={onEvidencePress}
        />

        <View style={styles.trustRow}>
          <View style={styles.trustIcon}>
            <Ionicons name="checkmark" size={16} color={colors.ivory} />
          </View>
          <Text style={styles.trustText}>{trustLine ?? copy.trust}</Text>
        </View>

        {status === "loading" ? (
          <View
            accessibilityLabel={loadingMessage ?? copy.loading}
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.stateCard}
          >
            <ActivityIndicator color={colors.teal} size="small" />
            <Text style={styles.stateTitle}>{loadingMessage ?? copy.loading}</Text>
            <View style={styles.connectionLine}>
              <View style={styles.connectionDot} />
              <View style={styles.connectionRule} />
              <View style={styles.connectionDot} />
              <View style={styles.connectionRule} />
              <View style={styles.connectionDot} />
            </View>
          </View>
        ) : null}

        {status === "error" && crisis ? <CrisisSupportCard language={language} /> : null}

        {status === "error" && !crisis ? (
          <View accessibilityLiveRegion="assertive" style={styles.errorCard}>
            <Ionicons name="sparkles-outline" size={22} color={colors.teal} />
            <View style={styles.stateCopy}>
              <Text style={styles.stateTitle}>{copy.errorTitle}</Text>
              <Text style={styles.stateBody}>{errorMessage ?? copy.error}</Text>
            </View>
            {onRetry ? (
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={onRetry}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                  disabled && styles.disabled,
                ]}
              >
                <Text style={styles.retryText}>{copy.retry}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {status === "success" ? (
          answer ? (
            <View accessibilityLiveRegion="polite" style={styles.answerBlock}>
            {answer.eyebrow ? (
              <Text style={styles.answerEyebrow}>{answer.eyebrow}</Text>
            ) : null}
            <Text accessibilityRole="header" style={styles.answerTitle}>
              {answer.title}
            </Text>
            {answer.language && answer.language !== language ? <Text style={styles.stateBody}>{vi
              ? "Bài đã lưu giữ nguyên ngôn ngữ khi tạo; đổi ngôn ngữ giao diện không dịch lại câu trả lời."
              : "This answer keeps its original language; changing the interface language does not translate it."}</Text> : null}
            {answer.paragraphs.map((paragraph, index) => (
              <Text key={`${index}-${paragraph.slice(0, 20)}`} style={styles.answerBody}>
                {paragraph}
              </Text>
            ))}
            <ReadingDetails key={answer.title + answer.paragraphs.join("")} tone="light"
              label={vi ? "Đọc đầy đủ các phần" : "Read all sections"}
              collapseLabel={vi ? "Thu gọn nội dung" : "Collapse details"}
              onEvidencePress={onEvidencePress ? id => {
                const item = evidence.find(entry => entry.id === id);
                if (item) onEvidencePress(item);
              } : undefined}
              sections={(answer.sections ?? []).map((section, index) => ({
                id: `${section.id}-${index}`, title: section.title, body: section.body, question: section.question,
                evidence: section.evidenceFactIds.flatMap(id => {
                  const item = evidence.find(entry => entry.id === id);
                  return item ? [{ id, label: `${vi ? "Dựa trên" : "Based on"}: ${item.label}${item.detail ? ` · ${item.detail}` : ""}` }] : [];
                }),
                notes: section.caveatNotes?.length ? section.caveatNotes : section.caveatIds.length ? [vi
                  ? "Phần này có giới hạn dữ kiện. Hãy đối chiếu các lưu ý của bản đồ; diễn giải là một lăng kính phản chiếu."
                  : "This section has data caveats. Check the chart's notes; the interpretation is a reflective lens."] : [],
              }))} />
            {visibleEvidence.length > 0 ? (
              <Text style={styles.evidenceCaption}>{copy.answerEvidence}</Text>
            ) : null}
            {onSaveAnswer ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: answerSaved || answerSaving }}
              disabled={answerSaved || answerSaving} onPress={onSaveAnswer}
              style={[styles.retryButton, { minHeight: 48, justifyContent: "center" }, (answerSaved || answerSaving) && styles.disabled]}>
              <Text style={styles.retryText}>{answerSaved ? (vi ? "Đã lưu câu trả lời" : "Answer saved")
                : answerSaving ? (vi ? "Đang lưu câu trả lời…" : "Saving answer…")
                  : (vi ? "Lưu đầy đủ câu trả lời" : "Save full answer")}</Text>
            </Pressable> : null}
            {onReportAnswer ? <Pressable accessibilityRole="button" onPress={onReportAnswer}
              style={[styles.retryButton, { minHeight: 48, justifyContent: "center" }]}>
              <Text style={styles.retryText}>{vi ? "Góp ý về câu trả lời này" : "Give feedback on this answer"}</Text>
            </Pressable> : null}
            </View>
          ) : (
            <View accessibilityLiveRegion="assertive" style={styles.errorCard}>
              <Ionicons name="sparkles-outline" size={22} color={colors.teal} />
              <View style={styles.stateCopy}>
                <Text style={styles.stateTitle}>{copy.errorTitle}</Text>
                <Text style={styles.stateBody}>
                  {vi
                    ? "Phản hồi chưa có đủ dữ kiện nguồn để hiển thị an toàn. Hãy thử lại."
                    : "The response did not include enough source evidence to display safely. Please try again."}
                </Text>
              </View>
            </View>
          )
        ) : null}

        {status !== "loading" && status !== "error" && !missingSuccessAnswer ? (
          <>
            <View style={styles.composer}>
              <TextInput
                accessibilityLabel={copy.placeholder}
                autoCorrect
                editable={!disabled}
                maxLength={500}
                multiline
                onChangeText={onQuestionChange}
                onSubmitEditing={submit}
                numberOfLines={2}
                placeholder={copy.placeholder}
                placeholderTextColor="#77706A"
                returnKeyType="send"
                style={styles.input}
                textAlignVertical="top"
                value={question}
              />
              <Pressable
                accessibilityLabel={copy.send}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit }}
                disabled={!canSubmit}
                hitSlop={4}
                onPress={submit}
                style={({ pressed }) => [
                  styles.sendButton,
                  !canSubmit && styles.sendButtonDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="arrow-forward" size={24} color={colors.teal} />
              </Pressable>
            </View>

            {promptChoices.length > 0 ? (
              <View accessibilityLabel={copy.examples} style={styles.promptList}>
                {promptChoices.map((prompt) => (
                  <Pressable
                    key={prompt}
                    accessibilityHint={copy.promptAction}
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={() => selectPrompt(prompt)}
                    style={({ pressed }) => [
                      styles.promptButton,
                      pressed && styles.pressed,
                      disabled && styles.disabled,
                    ]}
                  >
                    <Text style={styles.promptText}>{prompt}</Text>
                    <Ionicons name="arrow-forward" size={19} color={colors.teal} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {status === "locked" ? (
          <View style={styles.unlockBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: disabled || !onRequestUnlock }}
              disabled={disabled || !onRequestUnlock}
              onPress={() => onRequestUnlock?.(trimmedQuestion || undefined)}
              style={({ pressed }) => [
                styles.unlockButton,
                pressed && styles.unlockButtonPressed,
                (disabled || !onRequestUnlock) && styles.disabled,
              ]}
            >
              <Ionicons name="sparkles" size={18} color={colors.ivory} />
              <Text style={styles.unlockText}>{unlockLabel ?? copy.unlock}</Text>
            </Pressable>
            <Text style={styles.premiumNote}>{premiumNote ?? copy.premiumNote}</Text>
            {onContinueFree ? (
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={onContinueFree}
                style={({ pressed }) => [
                  styles.continueButton,
                  pressed && styles.pressed,
                  disabled && styles.disabled,
                ]}
              >
                <Text style={styles.continueText}>{copy.continueFree}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.disclaimer}>{copy.disclaimer}</Text>
      </View>
    </View>
  );
}

function EvidenceRow({
  evidence,
  onEvidencePress,
}: {
  evidence: AstrologyAiGuideEvidence[];
  onEvidencePress?: (evidence: AstrologyAiGuideEvidence) => void;
}) {
  if (evidence.length === 0) return null;
  return (
    <View style={styles.evidenceRow}>
      {evidence.map((item) => {
        const token = (
          <>
            <View
              style={[
                styles.evidenceGlyph,
                item.highlighted && styles.evidenceGlyphHighlighted,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.evidenceGlyphText,
                  item.glyph === "ASC" && styles.evidenceGlyphTextSmall,
                ]}
              >
                {item.glyph ?? "✦"}
              </Text>
            </View>
            <View style={styles.evidenceCopy}>
              <Text style={styles.evidenceLabel}>{item.label}</Text>
              {item.detail ? (
                <Text numberOfLines={1} style={styles.evidenceDetail}>
                  {item.detail}
                </Text>
              ) : null}
            </View>
          </>
        );
        return onEvidencePress ? (
          <Pressable
            key={item.id}
            accessibilityLabel={
              item.detail ? `${item.label}, ${item.detail}` : item.label
            }
            accessibilityRole="button"
            onPress={() => onEvidencePress(item)}
            style={({ pressed }) => [
              styles.evidenceToken,
              item.highlighted && styles.evidenceTokenHighlighted,
              pressed && styles.pressed,
            ]}
          >
            {token}
          </Pressable>
        ) : (
          <View
            accessible
            accessibilityLabel={
              item.detail ? `${item.label}, ${item.detail}` : item.label
            }
            key={item.id}
            style={[
              styles.evidenceToken,
              item.highlighted && styles.evidenceTokenHighlighted,
            ]}
          >
            {token}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.ivory,
    borderColor: "rgba(201, 164, 92, 0.42)",
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingBottom: spacing.lg,
    position: "relative",
  },
  handleButton: {
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
    minHeight: layout.minimumTouchTarget,
  },
  handle: {
    backgroundColor: "rgba(42, 37, 37, 0.25)",
    borderRadius: 3,
    height: 5,
    width: 52,
  },
  content: {
    gap: 11,
    paddingBottom: spacing.sm,
    paddingHorizontal: 20,
    paddingLeft: 48,
  },
  ornament: {
    alignItems: "center",
    bottom: 0,
    left: 13,
    position: "absolute",
    top: 28,
    width: 28,
  },
  ornamentLine: {
    backgroundColor: "rgba(201, 164, 92, 0.56)",
    bottom: 18,
    position: "absolute",
    top: 0,
    width: StyleSheet.hairlineWidth,
  },
  ornamentSun: {
    alignItems: "center",
    backgroundColor: colors.ivory,
    borderColor: "rgba(201, 164, 92, 0.72)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    top: 96,
    width: 40,
  },
  ornamentSunGlyph: {
    color: colors.gold,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 26,
  },
  ornamentDiamond: {
    backgroundColor: colors.gold,
    height: 10,
    position: "absolute",
    top: 164,
    transform: [{ rotate: "45deg" }],
    width: 10,
  },
  kicker: {
    color: "#8A6A36",
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 12,
    letterSpacing: 2.2,
    lineHeight: 18,
  },
  title: {
    color: colors.charcoal,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 33,
    lineHeight: 37,
    maxWidth: 560,
  },
  intro: {
    color: colors.ink,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 640,
  },
  evidenceRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "space-between",
  },
  evidenceToken: {
    alignItems: "center",
    flex: 1,
    minWidth: 72,
    flexDirection: "column",
    gap: 4,
    minHeight: layout.minimumTouchTarget,
  },
  evidenceTokenHighlighted: {
    backgroundColor: "rgba(14, 90, 90, 0.07)",
    borderRadius: radius.control,
    paddingHorizontal: 6,
  },
  evidenceGlyph: {
    alignItems: "center",
    borderColor: "rgba(201, 164, 92, 0.72)",
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  evidenceGlyphHighlighted: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  evidenceGlyphText: {
    color: colors.gold,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 22,
  },
  evidenceGlyphTextSmall: {
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 10,
  },
  evidenceCopy: {
    flexShrink: 1,
  },
  evidenceLabel: {
    color: colors.ink,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 12,
    textAlign: "center",
  },
  evidenceDetail: {
    color: "#756E68",
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    maxWidth: 130,
  },
  trustRow: {
    alignItems: "center",
    borderBottomColor: "rgba(42, 37, 37, 0.13)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  trustIcon: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  trustText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  composer: {
    alignItems: "center",
    borderColor: colors.ink,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: spacing.sm,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.bodyFontFamily,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    alignItems: "center",
    height: layout.minimumTouchTarget,
    justifyContent: "center",
    width: layout.minimumTouchTarget,
  },
  sendButtonDisabled: {
    opacity: 0.32,
  },
  promptList: {
    gap: 2,
  },
  promptButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: layout.minimumTouchTarget,
    paddingVertical: spacing.xs,
  },
  promptText: {
    color: colors.teal,
    flex: 1,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  unlockBlock: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  unlockButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.teal,
    borderRadius: radius.control,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  unlockButtonPressed: {
    backgroundColor: "#0A4949",
  },
  unlockText: {
    color: colors.ivory,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 17,
    textAlign: "center",
  },
  premiumNote: {
    color: colors.ink,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  continueButton: {
    justifyContent: "center",
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: spacing.md,
  },
  continueText: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 15,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: "rgba(14, 90, 90, 0.07)",
    borderColor: "rgba(14, 90, 90, 0.22)",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  connectionLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    width: "80%",
  },
  connectionDot: {
    backgroundColor: colors.gold,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  connectionRule: {
    backgroundColor: "rgba(201, 164, 92, 0.62)",
    height: 1,
    width: "34%",
  },
  errorCard: {
    alignItems: "flex-start",
    backgroundColor: "rgba(201, 130, 141, 0.1)",
    borderColor: "rgba(201, 130, 141, 0.36)",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md,
  },
  stateCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 180,
  },
  stateTitle: {
    color: colors.ink,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  stateBody: {
    color: "#5F5853",
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  retryButton: {
    borderColor: colors.teal,
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: spacing.md,
  },
  retryText: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 14,
  },
  answerBlock: {
    borderLeftColor: colors.gold,
    borderLeftWidth: 2,
    gap: spacing.sm,
    paddingLeft: spacing.md,
  },
  answerEyebrow: {
    color: "#8A6A36",
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  answerTitle: {
    color: colors.charcoal,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 28,
    lineHeight: 34,
  },
  answerBody: {
    color: colors.ink,
    fontFamily: typography.bodyFontFamily,
    fontSize: 16,
    lineHeight: 25,
  },
  evidenceCaption: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 13,
    paddingTop: spacing.xs,
  },
  disclaimer: {
    color: "#756E68",
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 18,
    paddingTop: spacing.sm,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.45,
  },
});
