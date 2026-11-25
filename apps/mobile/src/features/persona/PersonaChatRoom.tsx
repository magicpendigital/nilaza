import Ionicons from "@expo/vector-icons/Ionicons";
import { Fragment, useEffect, useRef, useState } from "react";
import { ImageSourcePropType, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { ChatComposer, ChatContextNotice, ChatMessageBubble, ChatRoomHeader, ChatSessionSummary, ChatSurface, ChatThinkingIndicator, QuickReplyRail } from "../../a2ui";
import { colors, layout, radius, spacing, typography } from "../../theme";
import { CrisisSupportCard } from "../safety/CrisisSupportCard";
import { ChatHandoffContext, Language } from "../../types";
import { DEEP_KNOWLEDGE_TIER, deepenPrompt, type PersonaStreamingReply } from "./personaStream";

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
  onRetry?: () => void;
  onSaveLastInsight: () => void;
  onSaveMessage: (message: PersonaChatMessage) => void;
  onRateMessage?: (message: PersonaChatMessage, rating: "useful" | "not_useful") => void;
  onSend: (preset?: string) => void;
  /** Per-persona first bubble; the generic line is used when missing. */
  openingLine?: string;
  /** What the guide is inspired by, e.g. "sách Kinh Dịch"; defaults to the guide's name. */
  personaInspiration?: string;
  personaName: string;
  personaPrompts: string[];
  personaThumbnail: ImageSourcePropType;
  personaTransparency: string;
  sessionSummaries: ChatSessionSummary[];
  /** The reply growing as it streams, or the partial text kept after an interrupted stream (not saved). */
  streamingReply?: PersonaStreamingReply | null;
};

/** Seconds of silence before the thinking bubble starts counting (reasoning models can be quiet for long). */
const THINKING_COUNTER_AFTER_S = 10;
/** Seconds after which the thinking bubble also says a deep answer can take a few minutes. */
const THINKING_PATIENCE_NOTE_AFTER_S = 30;
/** Distance from the bottom (px) that still counts as "reading the newest text". */
const NEAR_BOTTOM_PX = 96;

function isNearBottom(event: NativeSyntheticEvent<NativeScrollEvent>) {
  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
  return contentOffset.y + layoutMeasurement.height >= contentSize.height - NEAR_BOTTOM_PX;
}

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
  openingLine,
  personaInspiration,
  personaName,
  personaPrompts,
  personaThumbnail,
  personaTransparency,
  sessionSummaries,
  streamingReply
}: PersonaChatRoomProps) {
  const streamedText = streamingReply?.text ?? "";
  const streaming = streamingReply?.status === "streaming" && streamedText.length > 0;
  const thinking = chatGenerating && !streaming;
  // Follow new text only while the reader is at the bottom. Once they drag up to read a long answer
  // from its start, stay put and offer a "newest" chip instead of pulling them down on every line.
  const scrollRef = useRef<ScrollView | null>(null);
  const followRef = useRef(true);
  const draggingRef = useRef(false);
  const flingRef = useRef(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const setFollowing = (following: boolean) => {
    followRef.current = following;
    if (following) setShowJumpToLatest(false);
  };
  const jumpToLatest = () => {
    setFollowing(true);
    scrollRef.current?.scrollToEnd({ animated: true });
  };
  const lastMessageForScroll = messages[messages.length - 1];
  useEffect(() => {
    // Sending (a new user message) always brings the reader back to the conversation's end.
    if (lastMessageForScroll?.role === "user") setFollowing(true);
    if (!followRef.current) return undefined;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [lastMessageForScroll?.id, chatGenerating, streamingReply?.status]);
  const onContentSizeChange = () => {
    if (followRef.current) scrollRef.current?.scrollToEnd({ animated: !streaming });
    else if (chatGenerating || streamingReply) setShowJumpToLatest(true);
  };
  // Elapsed seconds while nothing has arrived yet; shown only after THINKING_COUNTER_AFTER_S.
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  useEffect(() => {
    setThinkingSeconds(0);
    if (!thinking) return undefined;
    const startedAt = Date.now();
    const timer = setInterval(() => setThinkingSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [thinking]);
  // Only a guide reply that arrives while the room is open is announced (polite), never each streamed piece.
  const initialMessageIds = useRef<Set<string> | null>(null);
  if (!initialMessageIds.current) initialMessageIds.current = new Set(messages.map((message) => message.id));
  const lastMessage = messages[messages.length - 1];
  const announcedMessageId = lastMessage?.role === "guide" && !initialMessageIds.current.has(lastMessage.id) ? lastMessage.id : undefined;
  const canDeepen = Boolean(lastMessage?.role === "guide"
    && lastMessage.uiMetadata?.modelTier === DEEP_KNOWLEDGE_TIER
    && !lastMessage.uiMetadata?.fallback
    && !lastMessage.uiMetadata?.safety
    && !chatGenerating
    && !streamingReply);
  const deepenLabel = language === "vi" ? "Đào sâu" : "Go deeper";
  const quickReplies = personaPrompts.slice(0, 3).map((prompt, index) => ({
    id: `${index}-${prompt}`,
    label: prompt
  }));
  const titlePrefix = language === "vi" ? "Người dẫn đường AI lấy cảm hứng từ" : "AI guide inspired by";
  const inspiration = personaInspiration || personaName;
  const transparencyBrief = language === "vi"
    ? `${titlePrefix} ${inspiration}. Không phải ${personaInspiration ? "tác giả, cuốn sách" : "người thật"} hay đại diện chính thức.`
    : `${titlePrefix} ${inspiration}. Not ${personaInspiration ? "the author, the book" : "the real person"} or an official representative.`;
  const thinkingMeta = thinkingSeconds >= THINKING_COUNTER_AFTER_S
    ? language === "vi"
      ? `Đang suy nghĩ kỹ · ${thinkingSeconds} giây${thinkingSeconds >= THINKING_PATIENCE_NOTE_AFTER_S ? ". Câu trả lời sâu có thể cần vài phút; bạn cứ giữ màn hình này mở." : ""}`
      : `Thinking it through · ${thinkingSeconds} s${thinkingSeconds >= THINKING_PATIENCE_NOTE_AFTER_S ? ". A deep answer can take a few minutes; keep this screen open." : ""}`
    : undefined;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.shell}>
      <ChatSurface
        scrollRef={scrollRef}
        onContentSizeChange={onContentSizeChange}
        onMomentumScrollEnd={(event) => {
          // Only a fling the reader started counts; programmatic scrolls never change following.
          if (!flingRef.current) return;
          flingRef.current = false;
          setFollowing(isNearBottom(event));
        }}
        onScroll={(event) => {
          if (draggingRef.current) setFollowing(isNearBottom(event));
        }}
        onScrollBeginDrag={() => {
          draggingRef.current = true;
          flingRef.current = false;
        }}
        onScrollEndDrag={(event) => {
          draggingRef.current = false;
          flingRef.current = true;
          setFollowing(isNearBottom(event));
        }}
        header={
          <ChatRoomHeader
            activeSessionId={activeSessionId}
            avatar={personaThumbnail}
            backLabel={language === "vi" ? "Quay lại" : "Back"}
            menuLabel={language === "vi" ? "Thêm tùy chọn" : "More options"}
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
            subtitle={`${titlePrefix} ${inspiration}`}
            title={personaName}
          />
        }
        composer={
          <View style={styles.composerWrap}>
            {showJumpToLatest ? (
              <Pressable
                accessibilityLabel={language === "vi" ? "Xem phần mới nhất của cuộc trò chuyện" : "Show the newest part of the chat"}
                accessibilityRole="button"
                hitSlop={6}
                onPress={jumpToLatest}
                style={styles.jumpChip}
              >
                <Ionicons name="arrow-down-outline" size={16} color={colors.gold} />
                <Text style={styles.jumpText}>{language === "vi" ? "Xem phần mới nhất" : "Show newest"}</Text>
              </Pressable>
            ) : null}
            {messages.length > 0 ? <QuickReplyRail prompts={quickReplies} onSelect={(prompt) => onSend(prompt.label)} /> : null}
            <ChatComposer
              sendLabel={language === "vi" ? "Gửi" : "Send"}
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
              {openingLine || (language === "vi"
                ? "Mình đang ở đây. Hãy chọn một gợi ý hoặc viết điều bạn muốn nhìn rõ hơn."
                : "I am here. Choose a prompt or write what you want to see more clearly.")}
            </ChatMessageBubble>
            <QuickReplyRail prompts={quickReplies} onSelect={(prompt) => onSend(prompt.label)} />
          </View>
        ) : null}

        {messages.map((message) => (
          <Fragment key={message.id}>
          <View accessibilityLiveRegion={message.id === announcedMessageId ? "polite" : undefined}>
          <ChatMessageBubble
            action={
              message.role === "guide" ? (
                <View style={styles.bubbleActions}>
                  <Pressable accessibilityLabel={language === "vi" ? "Phản hồi hữu ích" : "Mark as useful"} accessibilityRole="button" onPress={() => onRateMessage?.(message, "useful")} style={styles.bubbleAction}>
                    <Ionicons name="thumbs-up-outline" size={18} color={colors.gold} />
                  </Pressable>
                  <Pressable accessibilityLabel={language === "vi" ? "Phản hồi chưa hữu ích" : "Mark as not useful"} accessibilityRole="button" onPress={() => onRateMessage?.(message, "not_useful")} style={styles.bubbleAction}>
                    <Ionicons name="thumbs-down-outline" size={18} color={colors.gold} />
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => onSaveMessage(message)} style={styles.bubbleAction}>
                    <Ionicons name="bookmark-outline" size={18} color={colors.gold} />
                    <Text style={styles.bubbleActionText}>{copy.save}</Text>
                  </Pressable>
                  <Pressable accessibilityLabel={copy.report} accessibilityRole="button" onPress={onReport} style={styles.bubbleAction}>
                    <Ionicons name="flag-outline" size={18} color={colors.gold} />
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
          </View>
          {message.role === "guide" && message.uiMetadata?.safety === "crisis" ? <CrisisSupportCard language={language} /> : null}
          </Fragment>
        ))}

        {canDeepen ? (
          <View style={styles.deepenRow}>
            <Pressable
              accessibilityHint={language === "vi" ? "Hỏi người dẫn đường mở rộng câu trả lời vừa rồi" : "Asks the guide to expand the last answer"}
              accessibilityLabel={deepenLabel}
              accessibilityRole="button"
              onPress={() => onSend(deepenPrompt(language))}
              style={styles.deepenChip}
            >
              <Ionicons name="layers-outline" size={16} color={colors.gold} />
              <Text style={styles.deepenText}>{deepenLabel}</Text>
            </Pressable>
          </View>
        ) : null}

        {streamedText ? (
          <ChatMessageBubble
            author={personaName}
            avatar={personaThumbnail}
            meta={streamingReply?.status === "interrupted"
              ? language === "vi" ? "Câu trả lời bị gián đoạn, chưa được lưu." : "Reply interrupted and not saved."
              : undefined}
          >
            {streamedText}
          </ChatMessageBubble>
        ) : null}

        {thinking ? (
          // The seconds sit in the bubble's meta line, outside the indicator's polite live region.
          <ChatMessageBubble author={personaName} avatar={personaThumbnail} meta={thinkingMeta}>
            <ChatThinkingIndicator label={copy.generatingAnswer} />
          </ChatMessageBubble>
        ) : null}

        {chatError ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{chatError}</Text>
            {onRetry ? (
              <Pressable accessibilityRole="button" style={styles.retryButton} onPress={onRetry}>
                <Ionicons name="refresh-outline" size={16} color={colors.gold} />
                <Text style={styles.retryText}>{copy.retry}</Text>
              </Pressable>
            ) : null}
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
    gap: 4,
    justifyContent: "center",
    minHeight: layout.minimumTouchTarget,
    minWidth: layout.minimumTouchTarget
  },
  bubbleActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
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
  deepenChip: {
    alignItems: "center",
    borderColor: "rgba(201, 164, 92, 0.45)",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: spacing.md
  },
  deepenRow: {
    alignItems: "flex-start",
    // Line the chip up with the guide bubble: 34 px avatar + the bubble row gap.
    paddingLeft: 34 + spacing.sm
  },
  deepenText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily
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
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 8
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
  },
  jumpChip: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.panel,
    borderColor: "rgba(201, 164, 92, 0.45)",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md
  },
  jumpText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  }
});
