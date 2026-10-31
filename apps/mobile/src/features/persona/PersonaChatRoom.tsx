import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { ImageSourcePropType, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ChatComposer, ChatContextNotice, ChatMessageBubble, ChatRoomHeader, ChatSessionSummary, ChatSurface, ChatThinkingIndicator, QuickReplyRail } from "../../a2ui";
import { colors, radius, spacing, typography } from "../../theme";
import { ChatHandoffContext, Language } from "../../types";

export type PersonaChatMessage = {
  id: string;
  role: "user" | "guide";
  text: string;
  promptVersionId?: string;
  uiMetadata?: Record<string, string | number | boolean>;
};

export type PersonaChatCopy = {
  askSomething: string;
  generatingAnswer: string;
  newChat: string;
  report: string;
  retry: string;
  save: string;
};

export type PersonaChatRoomProps = {
  chatError: string;
  chatGenerating: boolean;
  copy: PersonaChatCopy;
  handoffContext?: ChatHandoffContext;
  input: string;
  language: Language;
  messages: PersonaChatMessage[];
  activeSessionId: string;
  onBack: () => void;
  onChangeInput: (text: string) => void;
  onNewChat: () => void;
  onReport: () => void;
  onResumeSession: (sessionId: string) => void;
  onRetry: () => void;
  onSaveLastInsight: () => void;
  onSaveMessage: (message: PersonaChatMessage) => void;
  onRateMessage?: (message: PersonaChatMessage, rating: "useful" | "not_useful") => void;
  onSend: (preset?: string) => void;
  personaName: string;
  personaPrompts: string[];
  personaThumbnail: ImageSourcePropType;
  personaTransparency: string;
  sessionSummaries: ChatSessionSummary[];
};

export function PersonaChatRoom({
  chatError,
  chatGenerating,
  copy,
  handoffContext,
  input,
  language,
  messages,
  activeSessionId,
  onBack,
  onChangeInput,
  onNewChat,
  onReport,
  onResumeSession,
  onRetry,
  onRateMessage,
  onSaveMessage,
  onSend,
  personaName,
  personaPrompts,
  personaThumbnail,
  personaTransparency,
  sessionSummaries
}: PersonaChatRoomProps) {
  // Keep the newest message in view as replies arrive.
  const scrollRef = useRef<ScrollView | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [messages.length, chatGenerating]);
  const quickReplies = personaPrompts.slice(0, 3).map((prompt, index) => ({
    id: `${index}-${prompt}`,
    label: prompt
  }));
  const titlePrefix = language === "vi" ? "Người dẫn đường AI lấy cảm hứng từ" : "AI guide inspired by";
  const transparencyBrief = language === "vi"
    ? `${titlePrefix} ${personaName}. Không phải người thật hay đại diện chính thức.`
    : `${titlePrefix} ${personaName}. Not the real person or an official representative.`;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.shell}>
      <ChatSurface
        scrollRef={scrollRef}
        header={
          <ChatRoomHeader
            activeSessionId={activeSessionId}
            avatar={personaThumbnail}
            emptyHistoryLabel={language === "vi" ? "Chưa có cuộc trò chuyện cũ với người dẫn đường này." : "No previous chat with this guide yet."}
            historyLabel={language === "vi" ? "Lịch sử" : "History"}
            historyTitle={language === "vi" ? "Tiếp tục cuộc trò chuyện" : "Continue a chat"}
            menuActions={[
              {
                cancelLabel: language === "vi" ? "Tiếp tục trò chuyện" : "Keep chatting",
                confirmBody: language === "vi"
                  ? "Cuộc trò chuyện hiện tại vẫn được lưu trong lịch sử."
                  : "Your current conversation will stay in history.",
                confirmLabel: copy.newChat,
                confirmTitle: language === "vi" ? "Bắt đầu hội thoại mới?" : "Start a new chat?",
                icon: "add-circle-outline",
                id: "new-chat",
                label: copy.newChat,
                onPress: onNewChat
              },
              {
                icon: "flag-outline",
                id: "report",
                label: copy.report,
                onPress: onReport
              }
            ]}
            onBack={onBack}
            onResumeSession={onResumeSession}
            sessions={sessionSummaries}
            subtitle={`${titlePrefix} ${personaName}`}
            title={personaName}
          />
        }
        composer={
          <View style={styles.composerWrap}>
            {messages.length > 0 ? <QuickReplyRail prompts={quickReplies} onSelect={(prompt) => onSend(prompt.label)} /> : null}
            <ChatComposer
              disabled={chatGenerating}
              onChangeText={onChangeInput}
              onSend={() => onSend()}
              placeholder={copy.askSomething}
              value={input}
            />
          </View>
        }
        style={styles.surface}
      >
        <ChatContextNotice
          brief={transparencyBrief}
          detail={personaTransparency}
          detailLabel={language === "vi" ? "Chi tiết" : "Details"}
        />

        {handoffContext ? (
          <View style={styles.handoffPanel}>
            <Ionicons
              name={handoffContext.sourceType === "tarot_reading" || handoffContext.sourceType === "tarot_card" ? "sparkles-outline" : handoffContext.sourceType === "oracle_reflection" ? "diamond-outline" : "planet-outline"}
              size={18}
              color={colors.gold}
            />
            <View style={styles.flex}>
              <Text style={styles.handoffTitle}>
                {{
                  tarot_reading: language === "vi" ? "Đang tiếp nối trải bài" : "Continuing your tarot reading",
                  tarot_card: language === "vi" ? "Đang tiếp nối từ một lá bài" : "Continuing from a tarot card",
                  astrology_report: language === "vi" ? "Đang tiếp nối bản xem trước chiêm tinh" : "Continuing your astrology preview",
                  daily_zodiac_pulse: language === "vi" ? "Đang tiếp nối lời nhắn theo cung hôm nay" : "Continuing today's sign message",
                  oracle_reflection: language === "vi" ? "Đang tiếp nối từ Oracle" : "Continuing from Oracle"
                }[handoffContext.sourceType]}
              </Text>
              <Text style={styles.handoffBody}>{handoffContext.safeSummary}</Text>
            </View>
          </View>
        ) : null}

        {messages.length === 0 ? (
          <View style={styles.emptyThread}>
            <ChatMessageBubble author={personaName} avatar={personaThumbnail}>
              {language === "vi"
                ? "Mình đang ở đây. Hãy chọn một gợi ý hoặc viết điều bạn muốn nhìn rõ hơn."
                : "I am here. Choose a prompt or write what you want to see more clearly."}
            </ChatMessageBubble>
            <QuickReplyRail prompts={quickReplies} onSelect={(prompt) => onSend(prompt.label)} />
          </View>
        ) : null}

        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            action={
              message.role === "guide" ? (
                <View style={styles.bubbleActions}>
                  <Pressable accessibilityLabel={language === "vi" ? "Phản hồi hữu ích" : "Mark as useful"} accessibilityRole="button" onPress={() => onRateMessage?.(message, "useful")} style={styles.bubbleAction}>
                    <Ionicons name="thumbs-up-outline" size={14} color={colors.gold} />
                  </Pressable>
                  <Pressable accessibilityLabel={language === "vi" ? "Phản hồi chưa hữu ích" : "Mark as not useful"} accessibilityRole="button" onPress={() => onRateMessage?.(message, "not_useful")} style={styles.bubbleAction}>
                    <Ionicons name="thumbs-down-outline" size={14} color={colors.gold} />
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => onSaveMessage(message)} style={styles.bubbleAction}>
                    <Ionicons name="bookmark-outline" size={14} color={colors.gold} />
                    <Text style={styles.bubbleActionText}>{copy.save}</Text>
                  </Pressable>
                </View>
              ) : undefined
            }
            author={message.role === "guide" ? personaName : language === "vi" ? "Bạn" : "You"}
            avatar={message.role === "guide" ? personaThumbnail : undefined}
            meta={message.role === "guide" && message.uiMetadata?.fallback
              ? language === "vi" ? "Câu trả lời dự phòng — AI chưa kết nối được." : "Fallback reply — AI is not connected."
              : undefined}
            tone={message.role === "user" ? "user" : "guide"}
          >
            {message.text}
          </ChatMessageBubble>
        ))}

        {chatGenerating ? (
          <ChatMessageBubble author={personaName} avatar={personaThumbnail}>
            <ChatThinkingIndicator label={copy.generatingAnswer} />
          </ChatMessageBubble>
        ) : null}

        {chatError ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{chatError}</Text>
            <Pressable accessibilityRole="button" style={styles.retryButton} onPress={onRetry}>
              <Ionicons name="refresh-outline" size={16} color={colors.gold} />
              <Text style={styles.retryText}>{copy.retry}</Text>
            </Pressable>
          </View>
        ) : null}
      </ChatSurface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubbleAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  bubbleActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  bubbleActionText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 12
  },
  composerWrap: {
    backgroundColor: colors.surface,
    borderTopColor: "rgba(247, 241, 230, 0.08)",
    borderTopWidth: 1,
    paddingTop: spacing.xs
  },
  emptyThread: {
    gap: spacing.sm
  },
  errorPanel: {
    backgroundColor: "rgba(201, 130, 141, 0.14)",
    borderColor: "rgba(201, 130, 141, 0.3)",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  errorText: {
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    lineHeight: 20
  },
  flex: {
    flex: 1
  },
  handoffBody: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    lineHeight: 19
  },
  handoffPanel: {
    alignItems: "flex-start",
    backgroundColor: "rgba(14, 90, 90, 0.28)",
    borderColor: "rgba(201, 164, 92, 0.22)",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  handoffTitle: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    marginBottom: 3
  },
  retryButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  retryText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily
  },
  shell: {
    backgroundColor: colors.surface,
    flex: 1
  },
  surface: {
    flex: 1
  }
});
