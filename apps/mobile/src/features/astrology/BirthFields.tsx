import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
  const update = (d: string, m: string, y: string) => { setDay(d); setMonth(m); setYear(y); onChange(composeBirthDate(d, m, y)); };
  return (
    <View>
      <Text style={s.label}>{vi ? "Ngày sinh" : "Birth date"}</Text>
      <View style={s.row}>
        <Box label={vi ? "Ngày" : "Day"} value={day} max={2} width={72} onChange={(d) => update(d, month, year)} />
        <Box label={vi ? "Tháng" : "Month"} value={month} max={2} width={72} onChange={(m) => update(day, m, year)} />
        <Box label={vi ? "Năm" : "Year"} value={year} max={4} width={104} onChange={(y) => update(day, month, y)} />
      </View>
    </View>
  );
}

export function BirthTimeFields({ language, value, onChange }: { language: Language; value: string; onChange: (value: string) => void }) {
  const vi = language === "vi";
  const initial = splitBirthTime(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [afternoon, setAfternoon] = useState(initial.afternoon);
  const update = (h: string, m: string, pm: boolean) => { setHour(h); setMinute(m); setAfternoon(pm); onChange(composeBirthTime(h, m, pm)); };
  return (
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
  );
}

const s = StyleSheet.create({
  label: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 10, flexWrap: "wrap" },
  boxLabel: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12, marginBottom: 4 },
  box: { minHeight: layout.minimumTouchTarget + 4, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.45)", backgroundColor: "#1F1C1E", color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 18, textAlign: "center" },
  colon: { color: colors.ivory, fontSize: 20, paddingBottom: 12 },
  ampm: { flexDirection: "row", padding: 4, borderRadius: radius.pill, backgroundColor: "#1F1C1E", marginLeft: 4 },
  ampmOption: { minHeight: 44, minWidth: 64, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  ampmSelected: { backgroundColor: colors.ivory },
  ampmText: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 14 },
  ampmTextSelected: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily }
});
