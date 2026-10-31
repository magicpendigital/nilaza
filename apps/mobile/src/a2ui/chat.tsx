import Ionicons from "@expo/vector-icons/Ionicons";
import { ReactNode, RefObject, useEffect, useRef, useState } from "react";
import {
  Image,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  StyleProp
} from "react-native";
import type { ImageSourcePropType, TextStyle } from "react-native";

import { colors, layout, radius, spacing, typography } from "../theme";
import { useMotionPreference } from "./useMotionPreference";

type IconName = any;

export type ChatParticipant = {
  id: string;
  name: string;
  avatar?: ImageSourcePropType;
  role?: string;
};

export type ChatBubbleTone = "user" | "guide" | "system";

export type ChatSessionSummary = {
  id: string;
  title: string;
  meta?: string;
};

export type ChatHeaderMenuAction = {
  id: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  confirmTitle?: string;
  confirmBody?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
};

export function ChatSurface({
  children,
  composer,
  contentContainerStyle,
  header,
  scrollRef,
  style
}: {
  children: ReactNode;
  composer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  header?: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  style?: ViewStyle;
}) {
  return (
    <View style={[chatStyles.surface, style]}>
      {header}
      <ScrollView
        testID="chat-message-scroll"
        style={{ flex: 1, minHeight: 0 }}
        ref={scrollRef}
        contentContainerStyle={[chatStyles.messages, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {composer}
    </View>
  );
}

export function ChatParticipantStrip({
  participants,
  addLabel,
  density = "regular",
  onAdd,
  selectedIds = [],
  onParticipantPress
}: {
  participants: ChatParticipant[];
  addLabel?: string;
  density?: "regular" | "compact";
  onAdd?: () => void;
  selectedIds?: string[];
  onParticipantPress?: (participant: ChatParticipant) => void;
}) {
  const compact = density === "compact";

  return (
    <ScrollView
      horizontal
      contentContainerStyle={[chatStyles.participantStrip, compact && chatStyles.participantStripCompact]}
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={[chatStyles.participantScroller, compact && chatStyles.participantScrollerCompact]}
    >
      {participants.map((participant) => {
        const selected = selectedIds.includes(participant.id);
        return (
          <Pressable
            key={participant.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onParticipantPress?.(participant)}
            style={[chatStyles.participantPill, compact && chatStyles.participantPillCompact, selected && chatStyles.participantPillSelected]}
          >
            <Avatar participant={participant} size={compact ? 26 : 34} />
            <View style={chatStyles.participantCopy}>
              <Text numberOfLines={1} style={chatStyles.participantName}>
                {participant.name}
              </Text>
              {participant.role ? (
                <Text numberOfLines={1} style={chatStyles.participantRole}>
                  {participant.role}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
      {onAdd ? (
        <Pressable accessibilityRole="button" onPress={onAdd} style={[chatStyles.addParticipantButton, compact && chatStyles.addParticipantButtonCompact]}>
          <Ionicons name="person-add-outline" size={compact ? 16 : 18} color={colors.gold} />
          {addLabel ? <Text style={chatStyles.addParticipantLabel}>{addLabel}</Text> : null}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

export function ChatRoomHeader({
  activeSessionId,
  avatar,
  backLabel = "Quay lại",
  menuLabel = "Thêm tùy chọn",
  emptyHistoryLabel,
  historyLabel,
  historyTitle,
  menuActions = [],
  onBack,
  onResumeSession,
  sessions = [],
  subtitle,
  title
}: {
  activeSessionId?: string;
  avatar?: ImageSourcePropType;
  /** Screen reader labels in the app language (analysis CH-10). */
  backLabel?: string;
  menuLabel?: string;
  emptyHistoryLabel?: string;
  historyLabel: string;
  historyTitle: string;
  menuActions?: ChatHeaderMenuAction[];
  onBack: () => void;
  onResumeSession?: (sessionId: string) => void;
  sessions?: ChatSessionSummary[];
  subtitle?: string;
  title: string;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ChatHeaderMenuAction | null>(null);

  const runAction = (action: ChatHeaderMenuAction) => {
    setMenuOpen(false);
    if (action.confirmTitle || action.confirmBody) {
      setConfirmAction(action);
      return;
    }
    action.onPress();
  };

  return (
    <View style={chatStyles.roomHeaderBlock}>
      <View style={chatStyles.roomHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel={backLabel} hitSlop={6} onPress={onBack} style={chatStyles.roomHeaderButton}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.ivory} />
        </Pressable>

        {avatar ? (
          <Image resizeMode="cover" source={avatar} style={chatStyles.roomHeaderAvatar} />
        ) : (
          <View style={chatStyles.roomHeaderAvatarFallback}>
            <Ionicons name="sparkles-outline" size={16} color={colors.gold} />
          </View>
        )}

        <View style={chatStyles.roomHeaderCopy}>
          <Text numberOfLines={1} style={chatStyles.roomHeaderTitle}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={chatStyles.roomHeaderSubtitle}>{subtitle}</Text> : null}
        </View>

        <Pressable
          accessibilityLabel={historyLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: historyOpen }}
          onPress={() => {
            setHistoryOpen((value) => !value);
            setMenuOpen(false);
          }}
          style={chatStyles.roomHeaderButton}
        >
          <Ionicons name="time-outline" size={20} color={colors.gold} />
        </Pressable>

        <Pressable
          accessibilityLabel={menuLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: menuOpen }}
          onPress={() => {
            setMenuOpen((value) => !value);
            setHistoryOpen(false);
          }}
          style={chatStyles.roomHeaderButton}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.ivory} />
        </Pressable>
      </View>

      {historyOpen ? (
        <View style={chatStyles.headerPanel}>
          <Text style={chatStyles.headerPanelTitle}>{historyTitle}</Text>
          {sessions.length > 0 ? (
            sessions.slice(0, 8).map((session) => {
              const active = session.id === activeSessionId;
              return (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onResumeSession?.(session.id);
                    setHistoryOpen(false);
                  }}
                  style={[chatStyles.sessionRow, active && chatStyles.sessionRowActive]}
                >
                  <View style={chatStyles.sessionCopy}>
                    <Text numberOfLines={1} style={chatStyles.sessionTitle}>{session.title}</Text>
                    {session.meta ? <Text numberOfLines={1} style={chatStyles.sessionMeta}>{session.meta}</Text> : null}
                  </View>
                  <Ionicons name={active ? "checkmark-circle-outline" : "chevron-forward-outline"} size={18} color={active ? colors.gold : colors.moon} />
                </Pressable>
              );
            })
          ) : (
            <Text style={chatStyles.sessionEmpty}>{emptyHistoryLabel}</Text>
          )}
        </View>
      ) : null}

      {menuOpen ? (
        <View style={chatStyles.headerPanel}>
          {menuActions.map((action) => (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              accessibilityState={{ disabled: action.disabled }}
              disabled={action.disabled}
              onPress={() => runAction(action)}
              style={[chatStyles.menuAction, action.disabled && chatStyles.disabled]}
            >
              <Ionicons name={action.icon} size={18} color={colors.gold} />
              <Text style={chatStyles.menuActionText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {confirmAction ? (
        <Modal animationType="fade" transparent visible onRequestClose={() => setConfirmAction(null)}>
          <Pressable style={chatStyles.sheetBackdrop} onPress={() => setConfirmAction(null)}>
            <Pressable style={chatStyles.confirmSheet}>
              <Text style={chatStyles.confirmTitle}>{confirmAction.confirmTitle}</Text>
              {confirmAction.confirmBody ? <Text style={chatStyles.confirmBody}>{confirmAction.confirmBody}</Text> : null}
              <View style={chatStyles.confirmActions}>
                <Pressable accessibilityRole="button" onPress={() => setConfirmAction(null)} style={chatStyles.confirmSecondary}>
                  <Text style={chatStyles.confirmSecondaryText}>{confirmAction.cancelLabel ?? "Cancel"}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const action = confirmAction;
                    setConfirmAction(null);
                    action.onPress();
                  }}
                  style={chatStyles.confirmPrimary}
                >
                  <Text style={chatStyles.confirmPrimaryText}>{confirmAction.confirmLabel ?? confirmAction.label}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

export function ChatContextNotice({
  brief,
  detail,
  detailLabel
}: {
  brief: string;
  detail?: string;
  detailLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={chatStyles.contextNotice}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => detail && setExpanded((value) => !value)}
        style={chatStyles.contextNoticeTrigger}
      >
        <Ionicons name="information-circle-outline" size={15} color={colors.gold} />
        <Text numberOfLines={expanded ? undefined : 2} style={chatStyles.contextNoticeText}>{brief}</Text>
        {detail ? <Text style={chatStyles.contextNoticeLink}>{detailLabel ?? "Info"}</Text> : null}
      </Pressable>
      {expanded && detail ? <Text style={chatStyles.contextNoticeDetail}>{detail}</Text> : null}
    </View>
  );
}

export function ChatMessageBubble({
  action,
  author,
  avatar,
  children,
  meta,
  tone = "guide"
}: {
  action?: ReactNode;
  author?: string;
  avatar?: ImageSourcePropType;
  children: ReactNode;
  meta?: string;
  tone?: ChatBubbleTone;
}) {
  const isUser = tone === "user";
  const isSystem = tone === "system";

  if (isSystem) {
    return (
      <View style={chatStyles.systemMessage}>
        <Text style={chatStyles.systemMessageText}>{children}</Text>
      </View>
    );
  }

  return (
    <View style={[chatStyles.messageRow, isUser && chatStyles.userMessageRow]}>
      {!isUser ? <BubbleAvatar avatar={avatar} author={author} /> : null}
      <View style={[chatStyles.bubble, isUser ? chatStyles.userBubble : chatStyles.guideBubble]}>
        {author ? (
          <Text numberOfLines={1} style={[chatStyles.bubbleAuthor, isUser && chatStyles.userBubbleAuthor]}>
            {author}
          </Text>
        ) : null}
        {typeof children === "string" ? (
          <MarkdownMessageText
            text={children}
            style={[chatStyles.bubbleBody, isUser && chatStyles.userBubbleBody]}
          />
        ) : <Text style={[chatStyles.bubbleBody, isUser && chatStyles.userBubbleBody]}>{children}</Text>}
        {meta || action ? (
          <View style={chatStyles.bubbleFooter}>
            {meta ? <Text style={[chatStyles.bubbleMeta, isUser && chatStyles.userBubbleMeta]}>{meta}</Text> : null}
            {action}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Small, dependency-free Markdown subset for model responses. It deliberately
 * supports only safe presentation marks (bold, italic, inline code) and
 * leaves links inert; chat text must never become executable UI.
 */
function MarkdownMessageText({ text, style }: { text: string; style: StyleProp<TextStyle> }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <Text key={index} style={chatStyles.markdownBold}>{part.slice(2, -2)}</Text>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <Text key={index} style={chatStyles.markdownCode}>{part.slice(1, -1)}</Text>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <Text key={index} style={chatStyles.markdownItalic}>{part.slice(1, -1)}</Text>;
        }
        return part;
      })}
    </Text>
  );
}

export function ChatComposer({
  accessibilityLabel,
  sendLabel = "Gửi",
  disabled,
  onChangeText,
  onSend,
  placeholder,
  sendIcon = "send-outline",
  value
}: {
  accessibilityLabel?: string;
  /** Screen reader label of the send button, in the app language. */
  sendLabel?: string;
  disabled?: boolean;
  onChangeText: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  sendIcon?: IconName;
  value: string;
}) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={chatStyles.composerDock}>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? placeholder}
        multiline
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.moon}
        style={chatStyles.composerInput}
        value={value}
      />
      <Pressable
        accessibilityLabel={sendLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={onSend}
        style={[chatStyles.sendButton, !canSend && chatStyles.disabled]}
      >
        <Ionicons name={sendIcon} size={18} color={colors.charcoal} />
      </Pressable>
    </View>
  );
}

/** A truthful, low-motion status marker. It never suggests fake percentage progress. */
export function ChatThinkingIndicator({ label }: { label: string }) {
  const reduceMotion = useMotionPreference();
  // React Native's Animated implementation is not present in a few lightweight
  // renderers (including our component-test renderer). Keep the status readable
  // there instead of letting a decorative animation break the conversation.
  const animationRuntime = (Animated ?? {}) as typeof Animated & { Value?: new (value: number) => any; View?: typeof View };
  const canAnimate = typeof animationRuntime.Value === "function" && Boolean(animationRuntime.View);
  const opacityRef = useRef<any>(null);
  if (!opacityRef.current && canAnimate) opacityRef.current = new animationRuntime.Value!(1);
  const opacity = opacityRef.current;
  useEffect(() => {
    if (!canAnimate || !opacity) return undefined;
    if (reduceMotion) { opacity.setValue?.(1); return undefined; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true })
    ]));
    animation.start();
    return () => animation.stop();
  }, [canAnimate, opacity, reduceMotion]);
  const AnimatedDot = canAnimate ? animationRuntime.View! : View;
  return (
    <View accessibilityLiveRegion="polite" style={chatStyles.thinkingRow}>
      <AnimatedDot style={[chatStyles.thinkingDot, canAnimate && opacity ? { opacity } : null]} />
      <AnimatedDot style={[chatStyles.thinkingDot, canAnimate && opacity ? { opacity: opacity.interpolate({ inputRange: [0.35, 1], outputRange: [0.55, 0.8] }) } : null]} />
      <AnimatedDot style={[chatStyles.thinkingDot, canAnimate && opacity ? { opacity: opacity.interpolate({ inputRange: [0.35, 1], outputRange: [0.8, 0.55] }) } : null]} />
      <Text style={chatStyles.thinkingLabel}>{label}</Text>
    </View>
  );
}

export function QuickReplyRail({
  prompts,
  onSelect,
  wrap = false
}: {
  prompts: Array<{ id: string; label: string }>;
  onSelect: (prompt: { id: string; label: string }) => void;
  wrap?: boolean;
}) {
  if (prompts.length === 0) return null;

  const replies = prompts.map((prompt) => (
    <Pressable key={prompt.id} accessibilityRole="button" onPress={() => onSelect(prompt)} style={chatStyles.quickReply}>
      <Text style={chatStyles.quickReplyText}>{prompt.label}</Text>
    </Pressable>
  ));

  if (wrap) return <View style={chatStyles.quickReplyWrap}>{replies}</View>;

  return (
    <ScrollView
      horizontal
      contentContainerStyle={chatStyles.quickReplyRail}
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {replies}
    </ScrollView>
  );
}

export function ChatSessionControls({
  activeSessionId,
  emptyLabel,
  historyLabel,
  historyTitle,
  newLabel,
  onNew,
  onResume,
  sessions
}: {
  activeSessionId?: string;
  emptyLabel?: string;
  historyLabel: string;
  historyTitle: string;
  newLabel: string;
  onNew: () => void;
  onResume: (sessionId: string) => void;
  sessions: ChatSessionSummary[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={chatStyles.sessionBlock}>
      <View style={chatStyles.sessionActionRow}>
        <Pressable accessibilityRole="button" onPress={onNew} style={chatStyles.sessionActionButton}>
          <Ionicons name="add-circle-outline" size={16} color={colors.gold} />
          <Text style={chatStyles.sessionActionText}>{newLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={chatStyles.sessionActionButton}
        >
          <Ionicons name="time-outline" size={16} color={colors.gold} />
          <Text style={chatStyles.sessionActionText}>{historyLabel}</Text>
        </Pressable>
      </View>

      {expanded ? (
        <View style={chatStyles.sessionHistoryPanel}>
          <Text style={chatStyles.sessionHistoryTitle}>{historyTitle}</Text>
          {sessions.length > 0 ? (
            sessions.slice(0, 8).map((session) => {
              const active = session.id === activeSessionId;
              return (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onResume(session.id);
                    setExpanded(false);
                  }}
                  style={[chatStyles.sessionRow, active && chatStyles.sessionRowActive]}
                >
                  <View style={chatStyles.sessionCopy}>
                    <Text numberOfLines={1} style={chatStyles.sessionTitle}>{session.title}</Text>
                    {session.meta ? <Text numberOfLines={1} style={chatStyles.sessionMeta}>{session.meta}</Text> : null}
                  </View>
                  <Ionicons name={active ? "checkmark-circle-outline" : "chevron-forward-outline"} size={18} color={active ? colors.gold : colors.moon} />
                </Pressable>
              );
            })
          ) : (
            <Text style={chatStyles.sessionEmpty}>{emptyLabel}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Avatar({ participant, size }: { participant: ChatParticipant; size: number }) {
  if (participant.avatar) {
    return <Image source={participant.avatar} style={[chatStyles.avatar, { height: size, width: size }]} />;
  }

  return (
    <View style={[chatStyles.avatarFallback, { height: size, width: size }]}>
      <Text style={chatStyles.avatarFallbackText}>{participant.name.slice(0, 1)}</Text>
    </View>
  );
}

function BubbleAvatar({ avatar, author }: { avatar?: ImageSourcePropType; author?: string }) {
  if (avatar) {
    return <Image source={avatar} style={chatStyles.bubbleAvatar} />;
  }

  return (
    <View style={chatStyles.bubbleAvatarFallback}>
      <Text style={chatStyles.avatarFallbackText}>{author?.slice(0, 1) ?? "N"}</Text>
    </View>
  );
}

const chatStyles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    flex: 1,
    minHeight: 0
  },
  thinkingRow: { alignItems: "center", flexDirection: "row", gap: 5, paddingVertical: 2 },
  thinkingDot: { backgroundColor: colors.gold, borderRadius: 4, height: 5, width: 5 },
  thinkingLabel: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 12, marginLeft: spacing.xs },
  roomHeaderBlock: {
    backgroundColor: colors.surface,
    borderBottomColor: "rgba(247, 241, 230, 0.08)",
    borderBottomWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    paddingTop: spacing.sm
  },
  roomHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  roomHeaderButton: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    height: layout.minimumTouchTarget,
    justifyContent: "center",
    width: layout.minimumTouchTarget
  },
  roomHeaderAvatar: {
    borderColor: "rgba(201, 164, 92, 0.26)",
    borderRadius: radius.control,
    borderWidth: 1,
    height: 34,
    width: 34
  },
  roomHeaderAvatarFallback: {
    alignItems: "center",
    backgroundColor: "rgba(201, 164, 92, 0.14)",
    borderColor: "rgba(201, 164, 92, 0.28)",
    borderRadius: radius.control,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  roomHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  roomHeaderTitle: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 16
  },
  roomHeaderSubtitle: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    marginTop: 1
  },
  headerPanel: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  headerPanelTitle: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 12,
    textTransform: "uppercase"
  },
  menuAction: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  menuActionText: {
    color: colors.ivory,
    flex: 1,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  sheetBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.54)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md
  },
  confirmSheet: {
    backgroundColor: "#211D1F",
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  confirmTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 22,
    fontWeight: "700"
  },
  confirmBody: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 20
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.xs
  },
  confirmPrimary: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.control,
    minHeight: layout.minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  confirmPrimaryText: {
    color: colors.charcoal,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  confirmSecondary: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    minHeight: layout.minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  confirmSecondaryText: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  contextNotice: {
    gap: spacing.xs
  },
  contextNoticeTrigger: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: "94%",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2
  },
  contextNoticeText: {
    color: colors.moon,
    flexShrink: 1,
    fontFamily: typography.bodyFontFamily,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center"
  },
  contextNoticeLink: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 11
  },
  contextNoticeDetail: {
    alignSelf: "center",
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: "92%",
    textAlign: "center"
  },
  messages: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.lg
  },
  participantStrip: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  participantStripCompact: {
    paddingVertical: spacing.xs
  },
  participantScroller: {
    flexGrow: 0,
    flexShrink: 0,
    height: 68,
    maxHeight: 68
  },
  participantScrollerCompact: {
    height: 50,
    maxHeight: 50
  },
  participantPill: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    width: 150
  },
  participantPillCompact: {
    gap: spacing.xs,
    height: 42,
    width: 132
  },
  participantPillSelected: {
    backgroundColor: "rgba(201, 164, 92, 0.12)",
    borderColor: colors.gold
  },
  participantCopy: {
    flex: 1
  },
  participantName: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  participantRole: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 11,
    marginTop: 2
  },
  addParticipantButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 52,
    paddingHorizontal: spacing.md
  },
  addParticipantButtonCompact: {
    height: 42,
    paddingHorizontal: spacing.sm
  },
  addParticipantLabel: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  avatar: {
    borderRadius: radius.control
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: "center"
  },
  avatarFallbackText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  messageRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%"
  },
  markdownBold: {
    fontFamily: typography.bodySemiBoldFontFamily,
    fontWeight: "700"
  },
  markdownCode: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily
  },
  markdownItalic: {
    fontStyle: "italic"
  },
  userMessageRow: {
    justifyContent: "flex-end"
  },
  bubble: {
    borderRadius: radius.card,
    borderWidth: 1,
    maxWidth: "84%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  guideBubble: {
    backgroundColor: colors.panel,
    borderColor: colors.border
  },
  userBubble: {
    backgroundColor: colors.ivory,
    borderColor: colors.ivory
  },
  bubbleAvatar: {
    borderRadius: radius.control,
    height: 34,
    width: 34
  },
  bubbleAvatarFallback: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  bubbleAuthor: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 12,
    marginBottom: 4
  },
  userBubbleAuthor: {
    color: colors.teal
  },
  bubbleBody: {
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 22
  },
  userBubbleBody: {
    color: colors.charcoal
  },
  bubbleFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.sm
  },
  bubbleMeta: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 11
  },
  userBubbleMeta: {
    color: colors.ink
  },
  systemMessage: {
    alignSelf: "center",
    backgroundColor: "rgba(201, 164, 92, 0.10)",
    borderColor: "rgba(201, 164, 92, 0.24)",
    borderRadius: radius.control,
    borderWidth: 1,
    maxWidth: "92%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  systemMessageText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center"
  },
  composerDock: {
    alignItems: "flex-end",
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.sm
  },
  composerInput: {
    color: colors.ivory,
    flex: 1,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 21,
    maxHeight: 112,
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.control,
    height: layout.minimumTouchTarget,
    justifyContent: "center",
    width: layout.minimumTouchTarget
  },
  disabled: {
    opacity: 0.45
  },
  quickReplyRail: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  quickReplyWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  quickReply: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  quickReplyText: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  },
  sessionActionButton: {
    alignItems: "center",
    borderColor: "rgba(201, 164, 92, 0.32)",
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: spacing.sm
  },
  sessionActionRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  sessionActionText: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 12
  },
  sessionBlock: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  sessionCopy: {
    flex: 1,
    minWidth: 0
  },
  sessionEmpty: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 18
  },
  sessionHistoryPanel: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  sessionHistoryTitle: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 12,
    textTransform: "uppercase"
  },
  sessionMeta: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2
  },
  sessionRow: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  sessionRowActive: {
    backgroundColor: "rgba(201, 164, 92, 0.10)",
    borderColor: colors.gold
  },
  sessionTitle: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 13
  }
});
