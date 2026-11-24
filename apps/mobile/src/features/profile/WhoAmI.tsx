import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { JournalEntry, Language } from "../../types";
import type { SavedChart } from "../astrology/persistence";
import type { SavedChartsState } from "./useSavedCharts";
import { certainSigns, displayBirthDate, identityChips, oneSentence, recordedSummary, type IdentityChip } from "./whoAmIModel";

// "Tôi là ai" (Lô 4). Opened from the name card on the Tôi tab. Reads only what is already saved;
// the one-line summary is joined from Owner-approved templates, never written by AI.
export type WhoAmIProps = {
  language: Language;
  name: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  savedCharts: SavedChartsState;
  journalEntries: Array<Pick<JournalEntry, "createdAt" | "sourceType">>;
  /** True when profile and birth details also sync with a signed-in account. */
  syncsWithAccount: boolean;
  /** Life-path label such as "11/2", filled by Lô 3 (Bản đồ số). Hidden while undefined. */
  lifePath?: string;
  now?: Date;
  onOpenChart: (chart: SavedChart) => void;
  onDeleteChart: (chart: SavedChart) => void;
  onMakeChart: () => void;
  onWriteJournal: () => void;
  onEditBirth: () => void;
  onEditName: () => void;
  onExport: () => void;
  onClearBirth: () => void;
};

const chipIcons: Record<IdentityChip["key"], keyof typeof Ionicons.glyphMap> = {
  sun: "sunny-outline",
  moon: "moon-outline",
  rising: "arrow-up-outline",
  lifePath: "keypad-outline"
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.kicker} accessibilityRole="header">{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

function Row({ icon, title, detail, onPress, danger, right }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail?: string; onPress?: () => void; danger?: boolean; right?: ReactNode }) {
  const body = (
    <>
      <Ionicons name={icon} size={19} color={danger ? "#E7B7BE" : colors.gold} />
      <View style={s.flex}>
        <Text style={[s.rowTitle, danger && s.danger]}>{title}</Text>
        {detail ? <Text style={s.detail}>{detail}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color="#8F877C" /> : null)}
    </>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={s.row}>{body}</Pressable> : <View style={s.row}>{body}</View>;
}

function SmallButton({ label, accessibilityLabel, onPress, danger }: { label: string; accessibilityLabel?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} style={[s.small, danger && s.smallDanger]}>
      <Text style={[s.smallText, danger && s.danger]}>{label}</Text>
    </Pressable>
  );
}

export function WhoAmI(props: WhoAmIProps) {
  const { language } = props;
  const vi = language === "vi";
  const now = props.now ?? new Date();
  const ownChart = props.savedCharts.charts[0];
  const signs = certainSigns(ownChart?.chart);
  const chips = identityChips(signs, language, props.lifePath);
  const summary = oneSentence(signs, language);
  const recorded = recordedSummary(props.journalEntries, now);
  const name = props.name.trim() || (vi ? "Bạn" : "You");
  const hasBirth = Boolean(props.birthDate || props.birthTime || props.birthPlace || props.birthTimeUnknown);
  const birthParts = [
    props.birthDate ? displayBirthDate(props.birthDate) : undefined,
    props.birthTime && !props.birthTimeUnknown ? props.birthTime : undefined,
    props.birthPlace.trim() || undefined
  ].filter(Boolean);

  return (
    <View style={s.root}>
      <View style={s.identity}>
        <View style={s.identityTop}>
          <View style={s.avatar}><Text style={s.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>
          <View style={s.flex}>
            <Text style={s.name} accessibilityRole="header">{name}</Text>
            <Text style={s.detail}>
              {birthParts.length
                ? `${vi ? "Sinh" : "Born"} ${birthParts.join(" · ")}`
                : vi ? "Chưa có ngày sinh" : "No birth date yet"}
            </Text>
          </View>
        </View>
        {chips.length ? (
          <View style={s.chips}>
            {chips.map((chip) => (
              <View key={chip.key} style={s.chip} accessible accessibilityLabel={chip.accessibilityLabel}>
                <Ionicons name={chipIcons[chip.key]} size={14} color={colors.gold} />
                <Text style={s.chipText}>{chip.label}</Text>
              </View>
            ))}
          </View>
        ) : props.savedCharts.status === "ready" ? (
          <View style={s.invite}>
            <Text style={s.detail}>
              {vi ? "Lưu lá số của bạn để thấy cung Mặt Trời, Mặt Trăng và Cung Mọc ở đây." : "Save your chart to see your Sun, Moon and Rising signs here."}
            </Text>
            <SmallButton label={vi ? "Lập lá số" : "Make my chart"} onPress={props.onMakeChart} />
          </View>
        ) : null}
        {ownChart && !signs.rising ? (
          <Text style={s.note}>{vi ? "Cung Mọc cần giờ sinh chính xác." : "Your Rising sign needs an exact birth time."}</Text>
        ) : null}
      </View>

      {summary ? (
        <Section title={vi ? "Bạn trong một câu" : "You in one line"}>
          <View style={s.pad}>
            <Text style={s.sentence}>{summary.sentence}</Text>
            <Text style={s.note}>{vi ? "Ghép từ các mẫu viết sẵn đã duyệt, không do AI viết. Lấy từ:" : "Joined from approved written templates, not written by AI. Taken from:"}</Text>
            {summary.sources.map((source) => <Text key={source} style={s.detail}>{`• ${source}`}</Text>)}
          </View>
        </Section>
      ) : null}

      <Section title={vi ? "Nilaza đã ghi lại" : "What Nilaza has recorded"}>
        {recorded.ready ? (
          <View style={s.stats}>
            {[
              { value: recorded.journal, label: vi ? "mục Nhật ký" : "journal entries" },
              { value: recorded.readings, label: vi ? "lần trải bài đã lưu" : "saved readings" },
              { value: recorded.weeks, label: vi ? "tuần liên tục có viết" : "weeks in a row" }
            ].map((item) => (
              <View key={item.label} style={s.stat} accessible accessibilityLabel={`${item.value} ${item.label}`}>
                <Text style={s.statValue}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.pad}>
            <Text style={s.detail}>
              {vi
                ? `Viết thêm vài mục Nhật ký (còn ${recorded.remaining} mục) để Nilaza bắt đầu ghi lại hành trình của bạn bằng những con số.`
                : `Write a few more journal entries (${recorded.remaining} to go) and Nilaza will start recording your journey in numbers.`}
            </Text>
            <SmallButton label={vi ? "Viết vào Nhật ký" : "Write in Journal"} onPress={props.onWriteJournal} />
          </View>
        )}
      </Section>

      <Section title={vi ? "Báo cáo đã lưu" : "Saved reports"}>
        {props.savedCharts.status === "loading" ? (
          <Text style={[s.detail, s.pad]}>{vi ? "Đang đọc dữ liệu trên máy…" : "Reading data on this device…"}</Text>
        ) : props.savedCharts.status !== "ready" ? (
          <Text style={[s.detail, s.pad]}>
            {vi ? "Chưa đọc được lá số đã lưu. Dữ liệu không bị thay đổi; hãy mở lại màn hình." : "Saved charts could not be read. Nothing was changed; reopen this screen."}
          </Text>
        ) : props.savedCharts.charts.length === 0 ? (
          <Text style={[s.detail, s.pad]}>{vi ? "Chưa có báo cáo nào được lưu trên máy." : "No reports saved on this device yet."}</Text>
        ) : (
          props.savedCharts.charts.map((chart) => {
            const title = `${vi ? "Lá số" : "Chart"} · ${displayBirthDate(chart.input.date)}`;
            const saved = new Date(chart.createdAt).toLocaleDateString(vi ? "vi-VN" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
            return (
              <View key={chart.id} style={s.row}>
                <Ionicons name="planet-outline" size={19} color={colors.gold} />
                <View style={s.flex}>
                  <Text style={s.rowTitle}>{title}</Text>
                  <Text style={s.detail}>{[chart.placeName, `${vi ? "lưu" : "saved"} ${saved}`].filter(Boolean).join(" · ")}</Text>
                </View>
                <SmallButton label={vi ? "Xem" : "View"} accessibilityLabel={`${vi ? "Xem" : "View"} ${title}`} onPress={() => props.onOpenChart(chart)} />
                <SmallButton label={vi ? "Xóa" : "Delete"} accessibilityLabel={`${vi ? "Xóa" : "Delete"} ${title}`} onPress={() => props.onDeleteChart(chart)} danger />
              </View>
            );
          })
        )}
      </Section>

      <Section title={vi ? "Dữ liệu của tôi" : "My data"}>
        <Text style={[s.detail, s.pad]}>
          {props.syncsWithAccount
            ? vi
              ? "Lá số đã lưu chỉ nằm trên máy này. Tên hiển thị và thông tin ngày sinh có bản trên máy và được đồng bộ với tài khoản khi bạn đăng nhập. AI Chiêm tinh chỉ nhận dữ kiện lá số đã tính và câu hỏi của bạn, sau khi bạn đồng ý."
              : "Saved charts stay on this device. Your display name and birth details are kept on this device and sync with your account while you are signed in. Astrology AI receives only the calculated chart facts and your question, after you agree."
            : vi
              ? "Tên hiển thị, thông tin ngày sinh và lá số đã lưu nằm trên máy này. AI Chiêm tinh chỉ nhận dữ kiện lá số đã tính và câu hỏi của bạn, sau khi bạn đồng ý."
              : "Your display name, birth details and saved charts are on this device. Astrology AI receives only the calculated chart facts and your question, after you agree."}
        </Text>
        <Row icon="calendar-outline" title={vi ? "Sửa ngày, giờ, nơi sinh" : "Edit birth date, time and place"} onPress={props.onEditBirth} />
        <Row icon="person-outline" title={vi ? "Sửa tên hiển thị" : "Edit display name"} onPress={props.onEditName} />
        <Row icon="download-outline" title={vi ? "Xuất dữ liệu" : "Export data"} onPress={props.onExport} />
        {hasBirth ? <Row icon="trash-outline" title={vi ? "Xóa thông tin ngày sinh" : "Delete birth details"} onPress={props.onClearBirth} danger /> : null}
      </Section>

      <Section title="Premium">
        <Row icon="git-compare-outline" title={vi ? "Hai hệ cùng nhìn bạn" : "Two systems, one you"}
          detail={vi ? "Chiêm tinh và Bản đồ số đặt cạnh nhau." : "Astrology and numerology side by side."}
          right={<View style={s.soon}><Text style={s.soonText}>{vi ? "Sắp có" : "Coming soon"}</Text></View>} />
      </Section>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 16, paddingTop: 8 },
  flex: { flex: 1, minWidth: 0 },
  identity: { padding: 16, borderRadius: radius.card, backgroundColor: "#1F1C1E", gap: 12 },
  identityTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(201, 164, 92, 0.18)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.gold, fontFamily: typography.headlineRegularFontFamily, fontSize: 26 },
  name: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 24 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)" },
  chipText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13 },
  invite: { gap: 10, alignItems: "flex-start" },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 17 },
  section: { gap: 8 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  card: { borderRadius: radius.card, backgroundColor: "#1F1C1E", overflow: "hidden" },
  pad: { padding: 14, gap: 8 },
  sentence: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 20, lineHeight: 27 },
  stats: { flexDirection: "row", gap: 8, padding: 10 },
  stat: { flex: 1, minWidth: 0, padding: 10, borderRadius: radius.card, backgroundColor: "rgba(247, 241, 230, 0.04)", gap: 2 },
  statValue: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 26 },
  statLabel: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12 },
  row: { minHeight: layout.minimumTouchTarget + 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(247, 241, 230, 0.08)" },
  rowTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  detail: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  danger: { color: "#E7B7BE" },
  small: { minHeight: layout.minimumTouchTarget, minWidth: layout.minimumTouchTarget, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.18)", alignItems: "center", justifyContent: "center" },
  smallDanger: { borderColor: "rgba(231, 183, 190, 0.4)" },
  smallText: { color: "#E9E2D6", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  soon: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "rgba(201, 164, 92, 0.16)" },
  soonText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12 }
});
