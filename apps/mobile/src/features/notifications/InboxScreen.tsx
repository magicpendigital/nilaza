import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TopBar } from "../../a2ui";
import { localizedText } from "../../i18n";
import { colors, radius, spacing, typography } from "../../theme";
import type { InAppNotification, Language } from "../../types";

type InboxFilter = "all" | "unread";

export function InboxScreen({ language, notifications, onDismiss, onMarkAllRead, onMarkRead, onOpen }: {
  language: Language;
  notifications: InAppNotification[];
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onOpen: (notification: InAppNotification) => void;
}) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const activeNotifications = useMemo(
    () => notifications.filter((notification) => notification.status !== "dismissed" && (filter === "all" || notification.status === "unread")),
    [filter, notifications]
  );
  const unreadCount = notifications.filter((notification) => notification.status === "unread").length;
  const labels = language === "vi"
    ? { title: "Thông báo", intro: "Nhắc nhở và cập nhật của Nilaza. Nội dung riêng tư luôn ở trong ứng dụng.", all: "Tất cả", unread: "Chưa đọc", markAll: "Đánh dấu đã đọc", emptyTitle: "Hộp thư đang yên", emptyBody: "Khi có một lời nhắc phù hợp, bạn sẽ thấy ở đây.", dismiss: "Bỏ thông báo", open: "Mở nội dung" }
    : { title: "Notifications", intro: "Nilaza reminders and updates. Private details always stay inside the app.", all: "All", unread: "Unread", markAll: "Mark all read", emptyTitle: "Your inbox is quiet", emptyBody: "A relevant reminder will appear here when it is ready.", dismiss: "Dismiss notification", open: "Open content" };

  return (
    <View style={styles.root}>
      <TopBar title={labels.title} />
      <View style={styles.heading}>
        <View style={styles.headingIcon}><Ionicons name="notifications-outline" size={21} color={colors.gold} /></View>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={styles.title}>{labels.title}</Text>
          <Text style={styles.intro}>{labels.intro}</Text>
        </View>
      </View>
      <View style={styles.controls}>
        <View style={styles.filters}>
          {(["all", "unread"] as InboxFilter[]).map((item) => {
            const selected = filter === item;
            const label = item === "all" ? labels.all : `${labels.unread}${unreadCount ? ` (${unreadCount})` : ""}`;
            return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setFilter(item)} style={[styles.filter, selected && styles.filterActive]}><Text style={[styles.filterText, selected && styles.filterTextActive]}>{label}</Text></Pressable>;
          })}
        </View>
        {unreadCount > 0 ? <Pressable accessibilityRole="button" onPress={onMarkAllRead} style={styles.markAll}><Ionicons name="checkmark-done-outline" size={16} color={colors.gold} /><Text style={styles.markAllText}>{labels.markAll}</Text></Pressable> : null}
      </View>
      {activeNotifications.length ? activeNotifications.map((notification) => {
        const unread = notification.status === "unread";
        return (
          <View key={notification.id} style={[styles.card, unread && styles.cardUnread]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${labels.open}: ${localizedText(notification.title, language)}`} onPress={() => onOpen(notification)} style={styles.content}>
              <View style={styles.cardHeader}>
                <Text numberOfLines={2} style={styles.cardTitle}>{localizedText(notification.title, language)}</Text>
                {unread ? <View accessibilityLabel={labels.unread} style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.body}>{localizedText(notification.body, language)}</Text>
              <Text style={styles.date}>{new Date(notification.createdAt).toLocaleString(language)}</Text>
            </Pressable>
            <View style={styles.actions}>
              {unread ? <Pressable accessibilityRole="button" accessibilityLabel={labels.markAll} onPress={() => onMarkRead(notification.id)} style={styles.iconAction}><Ionicons name="checkmark-outline" size={17} color={colors.gold} /></Pressable> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={labels.dismiss} onPress={() => onDismiss(notification.id)} style={styles.iconAction}><Ionicons name="close-outline" size={18} color={colors.rose} /></Pressable>
            </View>
          </View>
        );
      }) : (
        <View style={styles.empty}>
          <Ionicons name="moon-outline" size={28} color={colors.gold} />
          <Text style={styles.emptyTitle}>{labels.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{labels.emptyBody}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1, minWidth: 0 },
  heading: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  headingIcon: { alignItems: "center", backgroundColor: "rgba(201, 164, 92, 0.12)", borderRadius: radius.control, height: 44, justifyContent: "center", width: 44 },
  title: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 32, lineHeight: 38, paddingBottom: 3 },
  intro: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 21 },
  controls: { gap: spacing.sm },
  filters: { flexDirection: "row", gap: spacing.xs },
  filter: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 36, paddingHorizontal: spacing.md, justifyContent: "center" },
  filterActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { color: colors.moon, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13 },
  filterTextActive: { color: colors.charcoal },
  markAll: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: spacing.xs, minHeight: 40 },
  markAllText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card, borderWidth: 1, flexDirection: "row", gap: spacing.xs, padding: spacing.md },
  cardUnread: { borderColor: "rgba(201, 164, 92, 0.58)" },
  content: { flex: 1, minWidth: 0 },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  cardTitle: { color: colors.ivory, flex: 1, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16, lineHeight: 22 },
  unreadDot: { backgroundColor: colors.gold, borderRadius: 5, height: 9, marginTop: 6, width: 9 },
  body: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 21, marginTop: spacing.xs },
  date: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 12, marginTop: spacing.sm },
  actions: { alignItems: "center", gap: spacing.xs },
  iconAction: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card, borderWidth: 1, gap: spacing.sm, padding: spacing.xl, textAlign: "center" },
  emptyTitle: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 24 },
  emptyBody: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 21, textAlign: "center" }
});
