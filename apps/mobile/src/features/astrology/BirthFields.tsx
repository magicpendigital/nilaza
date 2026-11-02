import { useState } from "react";
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

// 12-hour parts → "HH:mm" (24-hour) as the chart calculator expects.
export function composeBirthTime(hour: string, minute: string, afternoon: boolean) {
  if (!hour) return "";
  const h = Number(hour) % 12 + (afternoon ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${(minute || "0").padStart(2, "0")}`;
}

export function splitBirthTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: "", minute: "", afternoon: false };
  const h = Number(match[1]);
  return { hour: String(h % 12 === 0 ? 12 : h % 12), minute: match[2], afternoon: h >= 12 };
}

// Analysis AS-04 (Owner 2026-11-02): the device's own date and time picker fills the boxes on
// Android and iOS; typing still works, and the web keeps the boxes only.
const nativePicker = Platform.OS === "android" || Platform.OS === "ios";

function PickerButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.pickerButton}>
      <Ionicons name="calendar-outline" size={18} color={colors.gold} />
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
      {Platform.OS === "ios" ? <PickerButton label={doneLabel} onPress={onClose} /> : null}
    </View>
  );
}

function Box({ label, value, onChange, max, width }: { label: string; value: string; onChange: (value: string) => void; max: number; width: number }) {
  return (
    <View style={{ width }}>
      <Text style={s.boxLabel}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={(text) => onChange(digits(text, max))} keyboardType="number-pad" maxLength={max}
        placeholderTextColor="#6E675F" style={s.box} />
    </View>
  );
}

export function BirthDateFields({ language, value, onChange }: { language: Language; value: string; onChange: (value: string) => void }) {
  const vi = language === "vi";
  const [initialYear = "", initialMonth = "", initialDay = ""] = value.split("-");
  const [day, setDay] = useState(initialDay);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [picking, setPicking] = useState(false);
  const update = (d: string, m: string, y: string) => { setDay(d); setMonth(m); setYear(y); onChange(composeBirthDate(d, m, y)); };
  const current = composeBirthDate(day, month, year);
  return (
    <View>
      <Text style={s.label}>{vi ? "Ngày sinh" : "Birth date"}</Text>
      <View style={s.row}>
        <Box label={vi ? "Ngày" : "Day"} value={day} max={2} width={72} onChange={(d) => update(d, month, year)} />
        <Box label={vi ? "Tháng" : "Month"} value={month} max={2} width={72} onChange={(m) => update(day, m, year)} />
        <Box label={vi ? "Năm" : "Year"} value={year} max={4} width={104} onChange={(y) => update(day, month, y)} />
      </View>
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
  const pickTime = (date: Date) => {
    const h = date.getHours();
    update(String(h % 12 === 0 ? 12 : h % 12), String(date.getMinutes()).padStart(2, "0"), h >= 12);
  };
  return (
    <View>
    <View style={s.row}>
      <Box label={vi ? "Giờ" : "Hour"} value={hour} max={2} width={72} onChange={(h) => update(h, minute, afternoon)} />
      <Text style={s.colon}>:</Text>
      <Box label={vi ? "Phút" : "Minute"} value={minute} max={2} width={72} onChange={(m) => update(hour, m, afternoon)} />
      <View style={s.ampm} accessibilityRole="radiogroup">
        {[false, true].map((pm) => (
          <Pressable key={String(pm)} accessibilityRole="radio" accessibilityState={{ selected: afternoon === pm }} onPress={() => update(hour, minute, pm)}
            style={[s.ampmOption, afternoon === pm && s.ampmSelected]}>
            <Text style={[s.ampmText, afternoon === pm && s.ampmTextSelected]}>{pm ? (vi ? "Chiều" : "PM") : vi ? "Sáng" : "AM"}</Text>
          </Pressable>
        ))}
      </View>
    </View>
      {nativePicker ? <PickerButton label={vi ? "Chọn giờ trên đồng hồ" : "Pick on a clock"} onPress={() => setPicking(true)} /> : null}
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
  colon: { color: colors.ivory, fontSize: 20, paddingBottom: 12 },
  pickerButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, minHeight: layout.minimumTouchTarget, marginTop: 10, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.45)" },
  pickerText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  ampm: { flexDirection: "row", padding: 4, borderRadius: radius.pill, backgroundColor: "#1F1C1E", marginLeft: 4 },
  ampmOption: { minHeight: 44, minWidth: 64, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  ampmSelected: { backgroundColor: colors.ivory },
  ampmText: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 14 },
  ampmTextSelected: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily }
});
