import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { dailyReminderTimes, reminderTimeLabel, type DailyReminder } from "./dailyReminder";

// Tôi tab (Profile design, Owner decisions 2026-10-31). Rows open the existing detail sections.
export type ProfileHomeProps = {
  language: Language;
  name: string;
  signLabel?: string;
  memberSince?: string;
  stats: { streak: number; journal: number; readings: number };
  goals: string;
  tone: string;
  birth: string;
  languageLabel: string;
  reminder: DailyReminder;
  onReminderChange: (next: DailyReminder) => void;
  onEdit: () => void;
  onPreferences: () => void;
  onBirth: () => void;
  onNotifications: () => void;
  onPrivacy: () => void;
  onUsage: () => void;
  onAccount: () => void;
  onHelp: () => void;
  onLegal: () => void;
  onSignOut: () => void;
  /** Shown only once account deletion is available on the server. */
  onDeleteAccount?: () => void;
  onAdmin?: () => void;
  version: string;
};

function Row({ icon, title, detail, onPress, right, danger }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail?: string; onPress?: () => void; right?: ReactNode; danger?: boolean }) {
  const body = (
    <>
      <Ionicons name={icon} size={19} color={danger ? "#E7B7BE" : colors.gold} />
      <View style={s.flex}>
        <Text style={[s.rowTitle, danger && s.danger]}>{title}</Text>
        {detail ? <Text numberOfLines={2} style={s.rowDetail}>{detail}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color="#8F877C" /> : null)}
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.row}>{body}</Pressable>
  ) : (
    <View style={s.row}>{body}</View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.kicker}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

export function ProfileHome(props: ProfileHomeProps) {
  const { language, reminder } = props;
  const vi = language === "vi";
  const [timesOpen, setTimesOpen] = useState(false);
  const subtitle = [props.signLabel, props.memberSince ? (vi ? `bạn đồng hành từ ${props.memberSince}` : `with Nilaza since ${props.memberSince}`) : undefined].filter(Boolean).join(" · ");
  const stats = [
    { value: props.stats.streak, label: vi ? "ngày liên tiếp" : "day streak" },
    { value: props.stats.journal, label: vi ? "mục Nhật ký" : "journal entries" },
    { value: props.stats.readings, label: vi ? "lần trải bài" : "readings" }
  ];
  return (
    <View style={s.root}>
      <Text style={s.title} accessibilityRole="header">{vi ? "Tôi" : "Me"}</Text>
      <View style={s.identity}>
        <View style={s.avatar}><Text style={s.avatarText}>{props.name.slice(0, 1).toUpperCase()}</Text></View>
        <View style={s.flex}>
          <Text style={s.name}>{props.name}</Text>
          {subtitle ? <Text style={s.rowDetail}>{subtitle}</Text> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Sửa tên và ngôn ngữ" : "Edit name and language"} onPress={props.onEdit} style={s.edit}>
          <Text style={s.editText}>{vi ? "Sửa" : "Edit"}</Text>
        </Pressable>
      </View>
      {stats.every((item) => item.value === 0) ? (
        <View style={s.firstSteps}>
          <Text style={s.firstStepsTitle}>{vi ? "Hành trình của bạn bắt đầu từ đây" : "Your journey starts here"}</Text>
          <Text style={s.rowDetail}>
            {vi
              ? "Lật lá hôm nay ở tab Hôm nay hoặc viết một dòng vào Nhật ký. Chuỗi ngày, số mục Nhật ký và lần trải bài sẽ hiện ở đây."
              : "Turn today's card on the Today tab or write a line in your Journal. Your streak, journal entries and readings will show here."}
          </Text>
        </View>
      ) : (
      <View style={s.stats}>
        {stats.map((item) => (
          <View key={item.label} style={s.stat} accessible accessibilityLabel={`${item.value} ${item.label}`}>
            <Text style={s.statValue}>{item.value}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
      )}

      <Section title={vi ? "Cá nhân hóa" : "Personalisation"}>
        <Row icon="sparkles-outline" title={vi ? "Mục tiêu" : "Goals"} detail={props.goals} onPress={props.onPreferences} />
        <Row icon="chatbubble-ellipses-outline" title={vi ? "Giọng trò chuyện" : "Conversation tone"} detail={props.tone} onPress={props.onPreferences} />
        <Row icon="planet-outline" title={vi ? "Ngày sinh & lá số" : "Birth date & chart"} detail={props.birth} onPress={props.onBirth} />
        <Row icon="language-outline" title={vi ? "Ngôn ngữ" : "Language"} detail={props.languageLabel} onPress={props.onEdit} />
      </Section>

      <Section title={vi ? "Thông báo" : "Notifications"}>
        <Row icon="sunny-outline" title={vi ? "Nhắc lá bài hôm nay" : "Today's card reminder"}
          detail={vi ? `Mỗi ngày lúc ${reminderTimeLabel(reminder)}` : `Every day at ${reminderTimeLabel(reminder)}`}
          onPress={() => setTimesOpen((open) => !open)}
          right={<Switch accessibilityLabel={vi ? "Nhắc lá bài hôm nay" : "Today's card reminder"} value={reminder.enabled}
            onValueChange={(enabled) => props.onReminderChange({ ...reminder, enabled })} trackColor={{ true: colors.gold, false: "#3A3533" }} thumbColor={colors.ivory} />} />
        {timesOpen ? (
          <View style={s.times} accessibilityRole="radiogroup">
            {dailyReminderTimes.map((time) => {
              const active = time.hour === reminder.hour && time.minute === reminder.minute;
              return (
                <Pressable key={reminderTimeLabel(time)} accessibilityRole="radio" accessibilityState={{ checked: active }}
                  onPress={() => props.onReminderChange({ ...reminder, ...time, enabled: true })} style={[s.time, active && s.timeActive]}>
                  <Text style={[s.timeText, active && s.timeTextActive]}>{reminderTimeLabel(time)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <Row icon="notifications-outline" title={vi ? "Thông báo khác" : "Other notifications"} onPress={props.onNotifications} />
      </Section>

      <Section title={vi ? "Riêng tư & dữ liệu" : "Privacy & data"}>
        <Row icon="shield-checkmark-outline" title={vi ? "Xuất hoặc xóa dữ liệu trên máy" : "Export or delete data on this device"} onPress={props.onPrivacy} />
      </Section>

      <Section title={vi ? "Tài khoản" : "Account"}>
        <Row icon="pulse-outline" title={vi ? "Lượt dùng hôm nay" : "Today's usage"} onPress={props.onUsage} />
        <Row icon="help-circle-outline" title={vi ? "Trợ giúp" : "Help"} onPress={props.onHelp} />
        <Row icon="document-text-outline" title={vi ? "Điều khoản & Quyền riêng tư" : "Terms & Privacy"} onPress={props.onLegal} />
        {props.onAdmin ? <Row icon="construct-outline" title={vi ? "Trung tâm quản trị" : "Admin centre"} onPress={props.onAdmin} /> : null}
        <Row icon="settings-outline" title={vi ? "Cài đặt khác" : "More settings"} onPress={props.onAccount} />
        <Row icon="log-out-outline" title={vi ? "Đăng xuất" : "Sign out"} onPress={props.onSignOut} />
        {props.onDeleteAccount ? <Row icon="trash-outline" title={vi ? "Xóa tài khoản" : "Delete account"} onPress={props.onDeleteAccount} danger /> : null}
      </Section>

      <Text style={s.footer}>{`Nilaza ${props.version} · ${vi ? "Nội dung để giải trí và tự phản chiếu" : "For entertainment and self-reflection"}`}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 16, paddingTop: 8 },
  flex: { flex: 1, minWidth: 0 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 36, lineHeight: 40 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(201, 164, 92, 0.18)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.gold, fontFamily: typography.headlineRegularFontFamily, fontSize: 26 },
  name: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 24 },
  edit: { minHeight: 40, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.18)", justifyContent: "center" },
  editText: { color: "#E9E2D6", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  stats: { flexDirection: "row", gap: 8 },
  firstSteps: { padding: 14, borderRadius: radius.card, backgroundColor: "#1F1C1E", gap: 4 },
  firstStepsTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 18 },
  stat: { flex: 1, minWidth: 0, padding: 12, borderRadius: radius.card, backgroundColor: "#1F1C1E", gap: 2 },
  statValue: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 26 },
  statLabel: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12 },
  section: { gap: 8 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  card: { borderRadius: radius.card, backgroundColor: "#1F1C1E", overflow: "hidden" },
  row: { minHeight: layout.minimumTouchTarget + 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(247, 241, 230, 0.08)" },
  rowTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  rowDetail: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  danger: { color: "#E7B7BE" },
  times: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  time: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", justifyContent: "center" },
  timeActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  timeText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13.5 },
  timeTextActive: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily },
  footer: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12, textAlign: "center", marginTop: 4 }
});
