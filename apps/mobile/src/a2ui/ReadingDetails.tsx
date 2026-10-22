import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, layout, radius, spacing, typography } from "../theme";

export type ReadingDetailSection = {
  id: string;
  title: string;
  body: string;
  question?: string;
  evidence?: Array<{ id: string; label: string }>;
  notes?: string[];
};

/** Presentation only: the feature supplies validated prose and evidence labels. */
export function ReadingDetails({ sections, label, collapseLabel, tone = "dark", onEvidencePress }: {
  sections: ReadingDetailSection[];
  label: string;
  collapseLabel: string;
  tone?: "dark" | "light";
  onEvidencePress?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!sections.length) return null;
  const ink = tone === "light" ? colors.ink : colors.ivory;
  const accent = tone === "light" ? colors.teal : colors.gold;
  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
        onPress={() => setExpanded(value => !value)}
        style={[styles.toggle, { borderColor: accent }]}>
        <Text style={[styles.toggleText, { color: accent }]}>{expanded ? collapseLabel : label}</Text>
        <Text style={{ color: accent }} accessible={false}>{expanded ? "−" : "+"}</Text>
      </Pressable>
      {expanded ? sections.map(section => (
        <View key={section.id} style={styles.section}>
          <Text accessibilityRole="header" style={[styles.title, { color: ink }]}>{section.title}</Text>
          <Text style={[styles.body, { color: ink }]}>{section.body}</Text>
          {section.question ? <Text style={[styles.body, { color: accent }]}>{section.question}</Text> : null}
          {section.evidence?.map(item => onEvidencePress ? (
            <Pressable key={item.id} accessibilityRole="button" onPress={() => onEvidencePress(item.id)} style={styles.evidence}>
              <Text style={[styles.note, { color: accent }]}>{item.label}</Text>
            </Pressable>
          ) : <Text key={item.id} style={[styles.note, { color: accent }]}>{item.label}</Text>)}
          {section.notes?.map((note, index) => <Text key={index} style={[styles.note, { color: ink }]}>{note}</Text>)}
        </View>
      )) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  toggle: { minHeight: layout.minimumTouchTarget, borderWidth: 1, borderRadius: radius.control,
    padding: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  toggleText: { flex: 1, fontFamily: typography.bodyMediumFontFamily, fontSize: 16, lineHeight: 24 },
  section: { gap: spacing.sm, paddingVertical: spacing.sm },
  title: { fontFamily: typography.headlineRegularFontFamily, fontSize: 25, lineHeight: 32 },
  body: { fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 25 },
  note: { fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 20 },
  evidence: { minHeight: layout.minimumTouchTarget, justifyContent: "center", paddingVertical: spacing.xs },
});
