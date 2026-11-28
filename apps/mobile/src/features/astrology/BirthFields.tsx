import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

// "15", "3", "2000" → "2000-03-15"; empty until all three parts are present.
export function composeBirthDate(day: string, month: string, year: string) {
  return day && month && year.length === 4 ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : "";
}

// Lô 1 (Bản đồ số, 24/11/2026): calendar validity for the shared birth-date boxes. Cases from
// docs/proposals/ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23.vi.md: reject 29/02/1900, 29/02/2001,
// 31/04/2000 and day 0; accept 29/02/2000 and 29/02/2004.
export const minBirthYear = 1900;

export function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Without a full year February allows 29, so 29/02 waits for the year before it is judged.
export function daysInMonth(month: number, year?: number) {
  if (month === 2) return year === undefined || isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export type BirthDateIssue =
  | { field: "day"; kind: "range" }
  | { field: "month"; kind: "range" }
  | { field: "year"; kind: "range"; max: number }
  | { field: "day"; kind: "monthLength"; month: number; year?: number; days: number }
  | { field: "year"; kind: "future" };

// Checks whatever boxes are filled so the message shows while typing, not only at the end.
// A single "0" in the day or month box is still being typed (01-09), so it waits for the next digit.
export function birthDateIssue(day: string, month: string, year: string, today = new Date()): BirthDateIssue | null {
  const d = day ? Number(day) : undefined;
  const m = month ? Number(month) : undefined;
  const y = year.length === 4 ? Number(year) : undefined;
  const thisYear = today.getFullYear();
  if (d !== undefined && (d > 31 || (d === 0 && day.length === 2))) return { field: "day", kind: "range" };
  if (m !== undefined && (m > 12 || (m === 0 && month.length === 2))) return { field: "month", kind: "range" };
  if (y !== undefined && (y < minBirthYear || y > thisYear)) return { field: "year", kind: "range", max: thisYear };
  if (d !== undefined && d >= 1 && m !== undefined && m >= 1) {
    const days = daysInMonth(m, y);
    if (d > days) return { field: "day", kind: "monthLength", month: m, year: y, days };
  }
  if (d && m && y) {
    const todayKey = thisYear * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    if (y * 10000 + m * 100 + d > todayKey) return { field: "year", kind: "future" };
  }
  return null;
}

export function birthDateIssueText(issue: BirthDateIssue, vi: boolean) {
  switch (issue.kind) {
    case "range":
      if (issue.field === "day") return vi ? "Ngày chỉ từ 1 đến 31." : "Day must be from 1 to 31.";
      if (issue.field === "month") return vi ? "Tháng chỉ từ 1 đến 12." : "Month must be from 1 to 12.";
      return vi ? `Năm sinh từ ${minBirthYear} đến ${issue.max}.` : `Birth year must be from ${minBirthYear} to ${issue.max}.`;
    case "monthLength":
      if (issue.year !== undefined) {
        return vi
          ? `Tháng ${issue.month} năm ${issue.year} chỉ có ${issue.days} ngày. Kiểm tra lại ngày sinh nhé.`
          : `Month ${issue.month} of ${issue.year} has only ${issue.days} days. Please check the birth date.`;
      }
      return vi
        ? `Tháng ${issue.month} chỉ có ${issue.days} ngày. Kiểm tra lại ngày sinh nhé.`
        : `Month ${issue.month} has only ${issue.days} days. Please check the birth date.`;
    case "future":
      return vi ? "Ngày sinh chưa thể ở tương lai. Kiểm tra lại năm nhé." : "A birth date cannot be in the future. Please check the year.";
  }
}

// What the parent receives: a real past date as YYYY-MM-DD, otherwise "" so nothing invalid is saved.
export function validBirthDate(day: string, month: string, year: string, today = new Date()) {
  return birthDateIssue(day, month, year, today) ? "" : composeBirthDate(day, month, year);
}

// Hour box → "HH:mm" (24-hour) as the chart calculator expects (UX review K6/U3, 2026-11-15).
// 0 and 13-23 are already 24-hour and win over the Sáng/Chiều toggle; 1-12 follow the toggle
// (12 Sáng = 00, 12 Chiều = 12). Hour above 23 or minute above 59 gives "" so the form cannot submit.
export function birthTimeIssue(hour: string, minute: string): "hour" | "minute" | null {
  if (hour && Number(hour) > 23) return "hour";
  if (minute && Number(minute) > 59) return "minute";
  return null;
}

export function composeBirthTime(hour: string, minute: string, afternoon: boolean) {
  if (!hour || birthTimeIssue(hour, minute)) return "";
  const n = Number(hour);
  const h = n === 0 || n > 12 ? n : n % 12 + (afternoon ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${(minute || "0").padStart(2, "0")}`;
}

export function splitBirthTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: "", minute: "", afternoon: false };
  const h = Number(match[1]);
  return { hour: String(h === 0 ? 0 : h % 12 === 0 ? 12 : h % 12), minute: match[2], afternoon: h >= 12 };
}

// Typing 0 or 13-23 moves the toggle to match; tapping the toggle on a 24-hour value turns it
// back into the 12-hour hour it means (15 → Sáng gives 3, 0 → Chiều gives 12).
export function followBirthHour(hour: string, afternoon: boolean) {
  const n = Number(hour);
  if (!hour || n > 23) return afternoon;
  if (n === 0) return false;
  if (n > 12) return true;
  return afternoon;
}

export function toggleBirthHour(hour: string, afternoon: boolean) {
  const n = Number(hour);
  if (!hour || n > 23) return hour;
  if (!afternoon && n > 12) return String(n - 12);
  if (afternoon && n === 0) return "12";
  return hour;
}

// Analysis AS-04 (Owner 2026-11-02): the device's own date and time picker fills the boxes on
// Android and iOS; typing still works, and the web keeps the boxes only.
const nativePicker = Platform.OS === "android" || Platform.OS === "ios";

function PickerButton({ label, onPress, icon = "calendar-outline" }: { label: string; onPress: () => void; icon?: "calendar-outline" | "time-outline" | "checkmark" }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.pickerButton}>
      <Ionicons name={icon} size={18} color={colors.gold} />
      <Text style={s.pickerText}>{label}</Text>
    </Pressable>
  );
}

function DevicePicker({ mode, value, onPick, onClose, doneLabel }: { mode: "date" | "time"; value: Date; onPick: (date: Date) => void; onClose: () => void; doneLabel: string }) {
  const onChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") onClose();
    if (event.type === "set" && date) onPick(date);
  };
  return (
    <View>
      <DateTimePicker value={value} mode={mode} is24Hour display={Platform.OS === "ios" ? "spinner" : "default"}
        maximumDate={mode === "date" ? new Date() : undefined} onChange={onChange} />
      {Platform.OS === "ios" ? <PickerButton label={doneLabel} onPress={onClose} icon="checkmark" /> : null}
    </View>
  );
}

function Box({ label, value, onChange, max, width, invalid }: { label: string; value: string; onChange: (value: string) => void; max: number; width: number; invalid?: boolean }) {
  return (
    <View style={{ width }}>
      <Text style={s.boxLabel}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={(text) => onChange(digits(text, max))} keyboardType="number-pad" maxLength={max}
        placeholderTextColor="#6E675F" style={[s.box, invalid && s.boxInvalid]} />
    </View>
  );
}

// One birth-date input for onboarding, the chart and Profile (Lô 1): three boxes, a message under the
// boxes when the date cannot exist, and the device calendar on Android and iOS.
// `label={false}` when the screen already shows its own label.
export function BirthDateFields({ language, value, onChange, label }: { language: Language; value: string; onChange: (value: string) => void; label?: string | false }) {
  const vi = language === "vi";
  const [initialYear = "", initialMonth = "", initialDay = ""] = value.split("-");
  const [day, setDay] = useState(initialDay);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [picking, setPicking] = useState(false);
  const update = (d: string, m: string, y: string) => { setDay(d); setMonth(m); setYear(y); onChange(validBirthDate(d, m, y)); };
  const current = validBirthDate(day, month, year);
  // A saved date that arrives after the screen opened (Profile reads it from storage) fills the boxes.
  useEffect(() => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match && value !== current) { setYear(match[1]); setMonth(match[2]); setDay(match[3]); }
    // Only an outside change of `value` should refill the boxes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const issue = birthDateIssue(day, month, year);
  return (
    <View>
      {label === false ? null : <Text style={s.label}>{label ?? (vi ? "Ngày sinh (dương lịch)" : "Birth date (Gregorian)")}</Text>}
      <View style={s.row}>
        <Box label={vi ? "Ngày" : "Day"} value={day} max={2} width={72} invalid={issue?.field === "day" || issue?.kind === "future"} onChange={(d) => update(d, month, year)} />
        <Box label={vi ? "Tháng" : "Month"} value={month} max={2} width={72} invalid={issue?.field === "month" || issue?.kind === "monthLength" || issue?.kind === "future"} onChange={(m) => update(day, m, year)} />
        <Box label={vi ? "Năm" : "Year"} value={year} max={4} width={104} invalid={issue?.field === "year" || (issue?.kind === "monthLength" && issue.year !== undefined)} onChange={(y) => update(day, month, y)} />
      </View>
      {issue ? <Text accessibilityRole="alert" style={s.issue}>{birthDateIssueText(issue, vi)}</Text> : null}
      {nativePicker ? <PickerButton label={vi ? "Chọn trên lịch" : "Pick on a calendar"} onPress={() => setPicking(true)} /> : null}
      {nativePicker && picking ? (
        <DevicePicker mode="date" value={current ? new Date(`${current}T12:00:00`) : new Date(2000, 0, 1, 12)} doneLabel={vi ? "Xong" : "Done"}
          onClose={() => setPicking(false)} onPick={(date) => update(String(date.getDate()), String(date.getMonth() + 1), String(date.getFullYear()))} />
      ) : null}
    </View>
  );
}

export function BirthTimeFields({ language, value, onChange }: { language: Language; value: string; onChange: (value: string) => void }) {
  const vi = language === "vi";
  const initial = splitBirthTime(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [afternoon, setAfternoon] = useState(initial.afternoon);
  const [picking, setPicking] = useState(false);
  const update = (h: string, m: string, pm: boolean) => { setHour(h); setMinute(m); setAfternoon(pm); onChange(composeBirthTime(h, m, pm)); };
  const current = composeBirthTime(hour, minute, afternoon);
  const issue = birthTimeIssue(hour, minute);
  const pickTime = (date: Date) => {
    const picked = splitBirthTime(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`);
    update(picked.hour, picked.minute, picked.afternoon);
  };
  return (
    <View>
    <View style={s.row}>
      <Box label={vi ? "Giờ" : "Hour"} value={hour} max={2} width={72} onChange={(h) => update(h, minute, followBirthHour(h, afternoon))} />
      <Text style={s.colon}>:</Text>
      <Box label={vi ? "Phút" : "Minute"} value={minute} max={2} width={72} onChange={(m) => update(hour, m, afternoon)} />
      <View style={s.ampm} accessibilityRole="radiogroup">
        {[false, true].map((pm) => (
          <Pressable key={String(pm)} accessibilityRole="radio" accessibilityState={{ selected: afternoon === pm }} onPress={() => update(toggleBirthHour(hour, pm), minute, pm)}
            style={[s.ampmOption, afternoon === pm && s.ampmSelected]}>
            <Text style={[s.ampmText, afternoon === pm && s.ampmTextSelected]}>{pm ? (vi ? "Chiều" : "PM") : vi ? "Sáng" : "AM"}</Text>
          </Pressable>
        ))}
      </View>
    </View>
      {issue ? (
        <Text accessibilityRole="alert" style={s.issue}>
          {issue === "hour" ? (vi ? "Giờ chỉ từ 0 đến 23." : "Hour must be from 0 to 23.") : vi ? "Phút chỉ từ 0 đến 59." : "Minute must be from 0 to 59."}
        </Text>
      ) : null}
      {nativePicker ? <PickerButton label={vi ? "Chọn giờ trên đồng hồ" : "Pick on a clock"} icon="time-outline" onPress={() => setPicking(true)} /> : null}
      {nativePicker && picking ? (
        <DevicePicker mode="time" value={current ? new Date(`2000-01-01T${current}:00`) : new Date(2000, 0, 1, 8, 0)} doneLabel={vi ? "Xong" : "Done"}
          onClose={() => setPicking(false)} onPick={pickTime} />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 10, flexWrap: "wrap" },
  boxLabel: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12, marginBottom: 4 },
  box: { minHeight: layout.minimumTouchTarget + 4, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.45)", backgroundColor: "#1F1C1E", color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 18, textAlign: "center" },
  boxInvalid: { borderColor: "#E3B583", borderWidth: 1.5 },
  colon: { color: colors.ivory, fontSize: 20, paddingBottom: 12 },
  issue: { color: "#E7B7BE", fontFamily: typography.bodyFontFamily, fontSize: 13, marginTop: 8 },
  pickerButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, minHeight: layout.minimumTouchTarget, marginTop: 10, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.45)" },
  pickerText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  ampm: { flexDirection: "row", padding: 4, borderRadius: radius.pill, backgroundColor: "#1F1C1E", marginLeft: 4 },
  ampmOption: { minHeight: 44, minWidth: 64, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  ampmSelected: { backgroundColor: colors.ivory },
  ampmText: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 14 },
  ampmTextSelected: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily }
});
