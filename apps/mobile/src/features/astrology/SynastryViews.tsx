import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { personNameMaxLength, type SavedPerson } from "./persistence";
import { relationshipLabel, relationshipTypes, synastryConsent, type RelationshipType, type SynastryText } from "./synastry";

function Button({ label, onPress, primary, disabled }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={[s.button, primary ? s.primary : s.secondary, disabled && s.disabled]}>
      <Text style={[s.buttonText, primary && s.primaryText]}>{label}</Text>
    </Pressable>
  );
}

// People are listed by relationship type (in the approved order), then by name.
export function PeopleList({ language, people, hasOwnChart, onAdd, onOpen, onCreateOwn, disabled }: {
  language: Language;
  people: SavedPerson[];
  hasOwnChart: boolean;
  onAdd: () => void;
  onOpen: (person: SavedPerson) => void;
  onCreateOwn: () => void;
  disabled?: boolean;
}) {
  const vi = language === "vi";
  const sorted = [...people].sort((a, b) => relationshipTypes.indexOf(a.relationship) - relationshipTypes.indexOf(b.relationship) || a.name.localeCompare(b.name));
  return (
    <View style={s.root}>
      <Text style={s.kicker}>{vi ? "So lá số" : "Compare charts"}</Text>
      <Text style={s.title} accessibilityRole="header">{vi ? "So với một người" : "Compare with someone"}</Text>
      {!hasOwnChart ? (
        <>
          <Text style={s.body}>{vi ? "Lưu lá số của bạn trước, rồi Nilaza sẽ đặt nó cạnh lá số của người ấy." : "Save your own chart first, then Nilaza can set it beside theirs."}</Text>
          <Button primary label={vi ? "Tạo lá số của bạn" : "Create your chart"} onPress={onCreateOwn} disabled={disabled} />
        </>
      ) : (
        <>
          {sorted.length ? sorted.map((person) => (
            <Pressable key={person.id} accessibilityRole="button" onPress={() => onOpen(person)} style={s.personRow}>
              <Ionicons name="person-circle-outline" size={26} color={colors.gold} />
              <View style={s.flex}>
                <Text style={s.personName}>{person.name}</Text>
                <Text style={s.meta}>{relationshipLabel(person.relationship, language)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B8B0A4" />
            </Pressable>
          )) : (
            <Text style={s.body}>{vi ? "Chưa có ai. Thêm một người để xem nhịp của hai bạn gặp nhau ra sao." : "No one yet. Add someone to see how your rhythms meet."}</Text>
          )}
          <Button primary label={vi ? "Thêm người" : "Add someone"} onPress={onAdd} disabled={disabled || people.length >= 20} />
        </>
      )}
    </View>
  );
}

export function PersonFields({ language, name, onName, relationship, onRelationship }: {
  language: Language;
  name: string;
  onName: (value: string) => void;
  relationship: RelationshipType;
  onRelationship: (value: RelationshipType) => void;
}) {
  const vi = language === "vi";
  return (
    <View style={s.fields}>
      <Text style={s.label}>{vi ? "Tên hoặc biệt danh" : "Name or nickname"}</Text>
      <TextInput accessibilityLabel={vi ? "Tên hoặc biệt danh" : "Name or nickname"} value={name} onChangeText={onName} maxLength={personNameMaxLength}
        placeholder={vi ? "Ví dụ: Minh" : "For example: Sam"} placeholderTextColor="#8F877C" style={s.input} />
      <Text style={s.label}>{vi ? "Quan hệ" : "Relationship"}</Text>
      <View style={s.chips} accessibilityRole="radiogroup">
        {relationshipTypes.map((type) => {
          const selected = type === relationship;
          return (
            <Pressable key={type} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onRelationship(type)} style={[s.chip, selected && s.chipSelected]}>
              <Text style={[s.chipText, selected && s.chipTextSelected]}>{relationshipLabel(type, language)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ConsentCard({ language, onConfirm, onCancel, busy }: { language: Language; onConfirm: () => void; onCancel: () => void; busy?: boolean }) {
  const consent = synastryConsent(language);
  return (
    <View style={s.consent}>
      <Ionicons name="lock-closed-outline" size={22} color={colors.gold} />
      <Text style={s.cardTitle} accessibilityRole="header">{consent.title}</Text>
      <Text style={s.body}>{consent.body}</Text>
      <Button primary label={consent.confirm} onPress={onConfirm} disabled={busy} />
      <Button label={language === "vi" ? "Không lưu" : "Don't save"} onPress={onCancel} disabled={busy} />
    </View>
  );
}

export function CompareView({ language, person, text, confirmDelete, onDelete, onCancelDelete, busy }: {
  language: Language;
  person: SavedPerson;
  text: SynastryText;
  confirmDelete: boolean;
  onDelete: () => void;
  onCancelDelete: () => void;
  busy?: boolean;
}) {
  const vi = language === "vi";
  return (
    <View style={s.root}>
      <Text style={s.kicker}>{relationshipLabel(person.relationship, language)}</Text>
      <Text style={s.title} accessibilityRole="header">{vi ? `Bạn và ${person.name}` : `You and ${person.name}`}</Text>
      <Text style={s.body}>{text.intro}</Text>

      <Text style={s.section}>{text.labels.elements}</Text>
      {text.elements.map((row) => (
        <View key={row.key} style={s.card}>
          <Text style={s.cardKicker}>{row.label}</Text>
          <Text style={s.cardTitle}>{row.title}</Text>
          <Text style={s.body}>{row.body}</Text>
          {row.note ? <Text style={s.note}>{row.note}</Text> : null}
        </View>
      ))}

      <Text style={s.section}>{text.labels.aspects}</Text>
      {text.aspects.length ? text.aspects.map((item) => (
        <View key={item.key} style={s.card}>
          <Text style={s.cardKicker}>{item.label}</Text>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.body}>{item.body}</Text>
          <View style={s.try}>
            <Text style={s.tryLabel}>{text.labels.tryTogether}</Text>
            <Text style={s.body}>{item.tryTogether}</Text>
          </View>
        </View>
      )) : <Text style={s.body}>{text.labels.noAspects}</Text>}

      <Text style={s.note}>{text.footer}</Text>
      {confirmDelete ? (
        <View style={s.consent}>
          <Text style={s.body}>{vi ? `Xóa lá số của ${person.name} khỏi thiết bị này?` : `Delete ${person.name}'s chart from this device?`}</Text>
          <Button primary label={vi ? "Xác nhận xóa" : "Confirm delete"} onPress={onDelete} disabled={busy} />
          <Button label={vi ? "Hủy" : "Cancel"} onPress={onCancelDelete} disabled={busy} />
        </View>
      ) : (
        <Button label={vi ? `Xóa lá số của ${person.name}` : `Delete ${person.name}'s chart`} onPress={onDelete} disabled={busy} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 14 },
  flex: { flex: 1, minWidth: 0 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 32, lineHeight: 36, marginTop: -6 },
  section: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 27, marginTop: 6 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22 },
  meta: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, marginTop: 2 },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  label: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  fields: { gap: 8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.45)", borderRadius: radius.pill, paddingHorizontal: 18, backgroundColor: "#1F1C1E", color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: layout.minimumTouchTarget, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.18)", alignItems: "center", justifyContent: "center" },
  chipSelected: { backgroundColor: colors.ivory, borderColor: colors.ivory },
  chipText: { color: "#E9E2D6", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  chipTextSelected: { color: colors.charcoal },
  personRow: { minHeight: layout.minimumTouchTarget + 16, paddingHorizontal: 14, borderRadius: radius.card, backgroundColor: "#1F1C1E", flexDirection: "row", alignItems: "center", gap: 12 },
  personName: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  card: { padding: 16, borderRadius: radius.card, backgroundColor: "#1F1C1E", gap: 8 },
  cardKicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, lineHeight: 17 },
  cardTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 21, lineHeight: 26 },
  try: { borderTopWidth: 1, borderTopColor: "rgba(247, 241, 230, 0.1)", paddingTop: 8, gap: 4 },
  tryLabel: { color: "#9FD3CF", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  consent: { padding: 18, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)", backgroundColor: "#1F1C1E", gap: 12 },
  button: { minHeight: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primary: { backgroundColor: colors.ivory },
  secondary: { borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.22)" },
  buttonText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  primaryText: { color: colors.charcoal },
  disabled: { opacity: 0.5 }
});
