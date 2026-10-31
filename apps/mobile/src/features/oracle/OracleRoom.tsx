import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ChatComposer, ChatMessageBubble, ChatSurface, ChatThinkingIndicator, IconButton, QuickReplyRail } from "../../a2ui";
import { localizedText } from "../../i18n";
import { colors, radius, spacing, typography } from "../../theme";
import { Language, OracleActionCard, OracleTurn } from "../../types";
import { useAdaptiveLayout } from "../../responsive";

const oracleAvatar = require("../../../assets/runtime/brand/open-reflection-v1/logo/symbol-ivory.png");

type OracleRoomProps = {
  error: string;
  generating: boolean;
  input: string;
  language: Language;
  memoryAllowed: boolean;
  onAction: (action: OracleActionCard) => void;
  onChangeInput: (text: string) => void;
  onNew: () => void;
  onReport: () => void;
  onSaveLast: () => void;
  onSend: (preset?: string) => void;
  onToggleMemory: () => void;
  turns: OracleTurn[];
};

export function OracleRoom({
  error,
  generating,
  input,
  language,
  memoryAllowed,
  onAction,
  onChangeInput,
  onNew,
  onReport,
  onSaveLast,
  onSend,
  onToggleMemory,
  turns
}: OracleRoomProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const scrollRef = useRef<ScrollView>(null);
  const starterPrompts = [
    {
      id: "love",
      label: language === "vi" ? "Mình đang rối chuyện tình cảm." : "I feel confused about love."
    },
    {
      id: "decision",
      label: language === "vi" ? "Mình cần quyết định một việc lớn." : "I need to make a big decision."
    },
    {
      id: "tarot",
      label: language === "vi" ? "Hãy giúp mình mở một trải bài." : "Help me open a tarot reading."
    }
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.shell}>
      <ChatSurface
        scrollRef={scrollRef}
        contentContainerStyle={turns.length === 0 ? styles.emptyMessages : undefined}
        header={
          <View style={styles.header}>
            <View style={styles.oracleMark}>
              <Ionicons name="sparkles-outline" size={18} color={colors.gold} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Nilaza Oracle</Text>
              <Text style={styles.subtitle}>
                {language === "vi" ? "Lắng nghe, rồi mở đúng thực hành phản chiếu" : "Listens, then opens the right reflection path"}
              </Text>
            </View>
            <IconButton accessibilityLabel={language === "vi" ? "Lưu câu trả lời gần nhất" : "Save latest response"} name="bookmark-outline" onPress={onSaveLast} />
            <IconButton accessibilityLabel={language === "vi" ? "Báo cáo câu trả lời" : "Report response"} name="flag-outline" onPress={onReport} />
          </View>
        }
        composer={
          <View style={styles.composerWrap}>
            {turns.length === 0 ? <QuickReplyRail prompts={starterPrompts} onSelect={(prompt) => onSend(prompt.label)} wrap={adaptiveLayout.layoutMode !== "compact" && !adaptiveLayout.isCompactHeight} /> : null}
            <ChatComposer
              sendLabel={language === "vi" ? "Gửi" : "Send"}
              accessibilityLabel={language === "vi" ? "Tin nhắn gửi Nilaza Oracle" : "Message to Nilaza Oracle"}
              disabled={generating}
              onChangeText={onChangeInput}
              onSend={() => onSend()}
              placeholder={language === "vi" ? "Nói với Nilaza Oracle..." : "Ask Nilaza Oracle..."}
              sendIcon="sparkles-outline"
              value={input}
            />
          </View>
        }
        style={styles.surface}
      >
        {/* Oracle is an on-device direction chooser (Owner decision 2026-10-31): nothing is read or sent. */}
        <View style={styles.privacyPanel}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.gold} />
          <Text style={styles.privacyText}>
            {language === "vi"
              ? "Oracle đọc câu bạn kể ngay trên máy rồi gợi ý nên đi tiếp đâu. Không có AI trả lời và không gửi đi đâu."
              : "Oracle reads what you share on your device and suggests where to go next. No AI answers and nothing is sent."}
          </Text>
        </View>

        {turns.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{language === "vi" ? "Bạn đang mang theo điều gì?" : "What are you carrying?"}</Text>
            <Text style={styles.emptyBody}>
              {language === "vi"
                ? "Kể một chuyện ngắn. Oracle gợi ý nên trải bài, hỏi một người dẫn, mở Hội đồng 3 góc nhìn hay viết vài dòng vào Nhật ký."
                : "Share a short situation. Oracle suggests a spread, a guide, the three-view council or a few lines in your Journal."}
            </Text>
          </View>
        ) : null}

        {turns.map((turn, index) => (
          <View key={turn.id} style={styles.turnBlock}
            onLayout={index === turns.length - 1 ? (event) => scrollRef.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - spacing.sm), animated: false }) : undefined}
          >
            <ChatMessageBubble
              author={turn.role === "oracle" ? "Nilaza Oracle" : language === "vi" ? "Bạn" : "You"}
              avatar={turn.role === "oracle" ? oracleAvatar : undefined}
              meta={turn.role === "oracle" && turn.moderationStatus === "fallback"
                ? language === "vi" ? "Gợi ý của Nilaza trên máy, không phải AI trả lời." : "Suggestion from Nilaza on your device, not an AI answer."
                : undefined}
              tone={turn.role === "user" ? "user" : "guide"}
            >
              {turn.text}
            </ChatMessageBubble>
            {turn.role === "oracle" && turn.actionCards?.length ? (
              <OracleActionRail actions={turn.actionCards} language={language} onAction={onAction} />
            ) : null}
          </View>
        ))}

        {generating ? (
          <ChatMessageBubble author="Nilaza Oracle" avatar={oracleAvatar}>
            <ChatThinkingIndicator label={language === "vi" ? "Oracle đang lắng nghe và chọn thực hành phản chiếu phù hợp..." : "Oracle is listening and choosing the right reflection path..."} />
          </ChatMessageBubble>
        ) : null}

        {error ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {turns.length > 0 ? (
          <View style={styles.footerActions}>
            <Pressable accessibilityRole="button" style={styles.footerButton} onPress={onNew}>
              <Ionicons name="add-circle-outline" size={16} color={colors.gold} />
              <Text style={styles.footerButtonText}>{language === "vi" ? "Oracle mới" : "New Oracle chat"}</Text>
            </Pressable>
          </View>
        ) : null}
      </ChatSurface>
    </KeyboardAvoidingView>
  );
}

function OracleActionRail({
  actions,
  language,
  onAction
}: {
  actions: OracleActionCard[];
  language: Language;
  onAction: (action: OracleActionCard) => void;
}) {
  return (
    <View style={styles.actionRail}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          accessibilityState={{ disabled: !action.enabled }}
          disabled={!action.enabled}
          onPress={() => onAction(action)}
          style={[styles.actionCard, !action.enabled && styles.actionCardDisabled]}
        >
          <Ionicons name={action.icon as any} size={18} color={colors.gold} />
          <Text numberOfLines={1} style={styles.actionTitle}>{localizedText(action.label, language)}</Text>
          <Text numberOfLines={2} style={styles.actionDetail}>{localizedText(action.detail, language)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: colors.panel,
    borderColor: "rgba(201, 164, 92, 0.28)",
    borderRadius: radius.card,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 104,
    padding: spacing.sm,
    minWidth: 148
  },
  actionCardDisabled: {
    opacity: 0.5
  },
  actionDetail: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 16
  },
  actionRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  actionTitle: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  composerWrap: {
    backgroundColor: colors.surface,
    paddingTop: spacing.xs
  },
  emptyMessages: {
    justifyContent: "flex-end"
  },
  emptyBody: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  emptyState: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.lg
  },
  emptyTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 24
  },
  errorPanel: {
    backgroundColor: "rgba(201, 130, 141, 0.12)",
    borderColor: "rgba(201, 130, 141, 0.34)",
    borderRadius: radius.card,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    padding: spacing.md
  },
  errorText: {
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 18
  },
  footerActions: {
    alignItems: "center",
    paddingBottom: spacing.lg
  },
  footerButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  footerButtonText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  headerCopy: {
    flex: 1,
    minWidth: 0
  },
  oracleMark: {
    alignItems: "center",
    backgroundColor: "rgba(201, 164, 92, 0.14)",
    borderColor: "rgba(201, 164, 92, 0.34)",
    borderRadius: radius.control,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  privacyPanel: {
    alignItems: "center",
    backgroundColor: "rgba(14, 90, 90, 0.16)",
    borderColor: "rgba(14, 90, 90, 0.38)",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.sm
  },
  privacyText: {
    color: colors.ivory,
    flex: 1,
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 17
  },
  shell: {
    alignItems: "center",
    backgroundColor: colors.surface,
    flex: 1
  },
  subtitle: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    marginTop: 2
  },
  surface: {
    flex: 1,
    maxWidth: 760,
    width: "100%"
  },
  title: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 16
  },
  turnBlock: {
    gap: spacing.xs
  }
});
