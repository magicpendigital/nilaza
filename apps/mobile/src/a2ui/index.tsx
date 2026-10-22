import Ionicons from "@expo/vector-icons/Ionicons";
import { ReactNode, useEffect, useRef, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, Animated, Easing } from "react-native";

import { languageOptions } from "../i18n";
import { colors, layout, radius, spacing, typography } from "../theme";
import { Language } from "../types";

import { Brand } from "./Brand";
import { useMotionPreference } from "./useMotionPreference";
export * from "./Brand";
export * from "./chat";
export * from "./generationActivity";
export * from "./layout";
export * from "./ReadingDetails";

type IconName = any;
type StatusTone = "good" | "warn" | "bad" | "neutral";

function iconAccessibilityLabel(name: IconName) {
  return String(name).replace(/-outline$/, "").replace(/-/g, " ");
}

export function TopBar({
  title,
  leftIcon,
  rightIcon,
  leftLabel,
  rightLabel,
  onLeft,
  onRight
}: {
  title: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  leftLabel?: string;
  rightLabel?: string;
  onLeft?: () => void;
  onRight?: () => void;
}) {
  const leftAction = leftIcon && onLeft ? (
    <Pressable hitSlop={8} accessibilityLabel={leftLabel ?? iconAccessibilityLabel(leftIcon)} accessibilityRole="button" onPress={onLeft} style={styles.topIconButton}>
      <Ionicons name={leftIcon} size={24} style={styles.topIcon} />
    </Pressable>
  ) : (
    <View style={styles.topIconButton} />
  );
  const rightAction = rightIcon && onRight ? (
    <Pressable hitSlop={8} accessibilityLabel={rightLabel ?? iconAccessibilityLabel(rightIcon)} accessibilityRole="button" onPress={onRight} style={styles.topIconButton}>
      <Ionicons name={rightIcon} size={24} style={styles.topIcon} />
    </Pressable>
  ) : (
    <View style={styles.topIconButton} />
  );

  return (
    <View style={styles.topBar}>
      {leftAction}
      <View style={styles.topTitleGroup}>
        {title.toLowerCase() === "nilaza" ? <Brand variant="horizontal" width={180} /> : <Text style={styles.topTitle}>{title}</Text>}
      </View>
      {rightAction}
    </View>
  );
}

export function ScreenShell({ children }: { children: ReactNode }) {
  return <View style={styles.screenShell}>{children}</View>;
}

export function FadeInView({ children, style }: { children: ReactNode; style?: any }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const reduceMotion = useMotionPreference();

  useEffect(() => {
    if (reduceMotion) { fadeAnim.setValue(1); return; }
    fadeAnim.setValue(0);
    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fadeAnim, reduceMotion]);

  return (
    <Animated.View style={[style, { opacity: fadeAnim, flex: 1 }]}>
      {children}
    </Animated.View>
  );
}

export function GlassTopBar({ title, leftIcon, rightIcon, onLeft, onRight }: { title: string; leftIcon: IconName; rightIcon: IconName; onLeft?: () => void; onRight?: () => void }) {
  return (
    <View style={styles.glassTopBar}>
      <Pressable hitSlop={8} accessibilityLabel={iconAccessibilityLabel(leftIcon)} accessibilityRole="button" onPress={onLeft} style={styles.glassIconButton}>
        <Ionicons name={leftIcon} size={22} color={colors.ivory} />
      </Pressable>
      <Text style={styles.glassTitle}>{title}</Text>
      <Pressable hitSlop={8} accessibilityLabel={iconAccessibilityLabel(rightIcon)} accessibilityRole="button" onPress={onRight} style={styles.glassIconButton}>
        <Ionicons name={rightIcon} size={22} color={colors.ivory} />
      </Pressable>
    </View>
  );
}

export function IconButton({ accessibilityLabel, name, onPress }: { accessibilityLabel?: string; name: IconName; onPress: () => void }) {
  return (
    <Pressable hitSlop={8} accessibilityLabel={accessibilityLabel ?? iconAccessibilityLabel(name)} accessibilityRole="button" style={styles.iconButton} onPress={onPress}>
      <Ionicons name={name} size={24} color={colors.ivory} />
    </Pressable>
  );
}

export function IconText({ label, name, onPress }: { label: string; name: IconName; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={styles.iconText} onPress={onPress}>
      <Ionicons name={name} size={18} color={colors.moon} />
      <Text style={styles.iconAction}>{label}</Text>
    </Pressable>
  );
}

export function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.kicker}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

export function EditorialHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <View style={styles.editorialHeader}>
      <Text style={styles.kicker}>{eyebrow}</Text>
      <Text style={styles.editorialTitle}>{title}</Text>
      {body ? <Text style={styles.editorialBody}>{body}</Text> : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function OnboardingProgress({ step, total = 5 }: { step: number; total?: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: total }, (_, item) => <View key={item} style={[styles.progressDot, item <= step && styles.progressDotActive]} />)}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={[styles.primaryButton, disabled && styles.disabled]} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function RitualButton({ label, icon = "sparkles-outline", onPress, disabled = false }: { label: string; icon?: IconName; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={[styles.ritualButton, disabled && styles.disabled]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.charcoal} />
      <Text style={styles.ritualButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={[styles.secondaryButton, disabled && styles.disabled]} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.activeChip]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.activeChipText]}>{label}</Text>
    </Pressable>
  );
}

export function LanguageSelector({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  const [open, setOpen] = useState(false);
  const currentLanguage = languageOptions.find((item) => item.code === language) ?? languageOptions[0];
  const comingSoon = language === "vi" ? "Sắp ra mắt" : "Soon";

  return (
    <View style={styles.languageMenu}>
      <Pressable
        accessibilityLabel={language === "vi" ? `Ngôn ngữ: ${currentLanguage.viLabel}` : `Language: ${currentLanguage.label}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.languageTrigger}
      >
        <LanguageFlag code={currentLanguage.code} />
        <View style={styles.languageTriggerLabel}>
          <Text style={styles.languageTriggerText}>{currentLanguage.nativeLabel}</Text>
          <Text style={styles.languageTriggerMeta}>{language === "vi" ? currentLanguage.viLabel : currentLanguage.label}</Text>
        </View>
        <Ionicons name={open ? "chevron-up-outline" : "chevron-down-outline"} size={18} color={colors.moon} />
      </Pressable>

      {open ? (
        <View accessibilityLabel={language === "vi" ? "Lựa chọn ngôn ngữ" : "Language options"} style={styles.languageDropdown}>
          {languageOptions.map((item) => {
            const selected = language === item.code;
            return (
              <Pressable
                key={item.code}
                accessibilityRole="button"
                accessibilityState={{ disabled: !item.enabled, selected }}
                disabled={!item.enabled}
                onPress={() => {
                  onChange(item.code);
                  setOpen(false);
                }}
                style={[styles.languageDropdownItem, selected && styles.languageDropdownItemActive, !item.enabled && styles.disabledLanguageDropdownItem]}
              >
                <LanguageFlag code={item.code} disabled={!item.enabled} />
                <View style={styles.languageTriggerLabel}>
                  <Text style={[styles.languageNativeText, !item.enabled && styles.disabledLanguageText]}>{item.nativeLabel}</Text>
                  <Text style={[styles.languageEnglishText, !item.enabled && styles.disabledLanguageText]}>{language === "vi" ? item.viLabel : item.label}</Text>
                </View>
                {item.enabled ? (
                  selected ? <Ionicons name="checkmark" size={18} color={colors.gold} /> : null
                ) : (
                  <Text style={styles.languageSoon}>{comingSoon}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function SubflowTopBar({
  title,
  subtitle,
  leftIcon = "arrow-back-outline",
  rightIcon,
  leftLabel,
  rightLabel,
  onLeft,
  onRight
}: {
  title: string;
  subtitle?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  leftLabel?: string;
  rightLabel?: string;
  onLeft: () => void;
  onRight?: () => void;
}) {
  return (
    <View style={styles.subflowTopBar}>
      <Pressable hitSlop={8} accessibilityLabel={leftLabel} accessibilityRole="button" onPress={onLeft} style={styles.subflowButton}>
        <Ionicons name={leftIcon} size={22} color={colors.ivory} />
      </Pressable>
      <View style={styles.subflowCenter}>
        <Text style={styles.subflowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.subflowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable hitSlop={8} accessibilityLabel={rightLabel} accessibilityRole="button" accessibilityState={{ disabled: !rightIcon || !onRight }} disabled={!rightIcon || !onRight} onPress={onRight} style={[styles.subflowButton, !rightIcon && styles.invisible]}>
        {rightIcon ? <Ionicons name={rightIcon} size={21} color={colors.gold} /> : null}
      </Pressable>
    </View>
  );
}

function LanguageFlag({ code, disabled = false }: { code: Language; disabled?: boolean }) {
  if (code === "en") {
    return (
      <View style={[styles.languageFlag, disabled && styles.languageFlagDisabled]}>
        <Ionicons name="globe-outline" size={17} color={colors.gold} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.languageFlag,
        code === "vi" && styles.languageFlagVi,
        code === "zh-Hans" && styles.languageFlagZh,
        code === "ja" && styles.languageFlagJa,
        code === "ko" && styles.languageFlagKo,
        disabled && styles.languageFlagDisabled
      ]}
    >
      {code === "vi" ? <Ionicons name="star" size={12} color="#F8D34A" /> : null}
      {code === "zh-Hans" ? <Ionicons name="star" size={10} color="#F8D34A" /> : null}
      {code === "ja" ? <View style={styles.languageFlagDot} /> : null}
      {code === "ko" ? <View style={styles.languageFlagHalfDot} /> : null}
    </View>
  );
}

export function ChoiceTile({ active, detail, label, onPress }: { active: boolean; detail: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.choiceTile, active && styles.choiceTileActive]} onPress={onPress}>
      <Text style={styles.choiceTitle}>{label}</Text>
      <Text style={styles.tileDetail}>{detail}</Text>
    </Pressable>
  );
}

export function ActionTile({ detail, icon, label, onPress }: { detail: string; icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={styles.actionTile} onPress={onPress}>
      <Ionicons name={icon} size={24} style={styles.actionIcon} />
      <Text style={styles.tileTitle}>{label}</Text>
      <Text style={styles.tileDetail}>{detail}</Text>
    </Pressable>
  );
}

export function FeatureWide({ detail, icon, label, muted, onPress }: { detail: string; icon: IconName; label: string; muted?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={[styles.featureWide, muted && styles.featureWideMuted]} onPress={onPress}>
      <Ionicons name={icon} size={24} style={styles.featureIcon} />
      <View style={styles.flex}>
        <Text style={styles.featureSmallTitle}>{label}</Text>
        <Text style={styles.featureDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

export function FeatureTile({
  detail,
  disabled,
  icon,
  label,
  onPress,
  tone = "teal"
}: {
  detail: string;
  disabled?: boolean;
  icon: IconName;
  label: string;
  onPress?: () => void;
  tone?: "teal" | "rose" | "neutral";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={onPress}
      style={[
        styles.featureTile,
        tone === "teal" && styles.featureTileTeal,
        tone === "rose" && styles.featureTileRose,
        tone === "neutral" && styles.featureTileNeutral,
        disabled && styles.disabled
      ]}
    >
      <Ionicons name={icon} size={24} style={styles.featureIcon} />
      <View>
        <Text style={styles.featureSmallTitle}>{label}</Text>
        <Text style={styles.featureDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftCalendarMonth(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function calendarMonthLabel(date: Date, language: Language) {
  return date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { month: "long", year: "numeric" });
}

export function CalendarDatePicker({
  collapsible = false,
  language,
  onChange,
  placeholder,
  value
}: {
  collapsible?: boolean;
  language: Language;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const selectedDate = parseDateInput(value);
  const [open, setOpen] = useState(() => !collapsible || !value);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const initialDate = selectedDate ?? new Date(2000, 0, 1);
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });

  useEffect(() => {
    if (selectedDate) {
      setCalendarCursor(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [value]);

  const calendarCells = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = Array.from({ length: firstDay }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarCursor]);
  const weekdayLabels = language === "vi" ? ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <View style={styles.datePickerPanel}>
      <Pressable accessibilityRole="button" style={styles.selectedDateField} onPress={() => collapsible && setOpen((current) => !current)}>
        <Ionicons name="calendar-outline" size={18} color={colors.gold} />
        <Text style={styles.selectedDateText}>{value || placeholder}</Text>
        {collapsible ? <Ionicons name={open ? "chevron-up-outline" : "chevron-down-outline"} size={18} color={colors.moon} /> : null}
      </Pressable>
      {open ? (
        <>
          <View style={styles.calendarHeader}>
            <View style={styles.calendarNavCluster}>
              <Pressable accessibilityRole="button" accessibilityLabel={language === "vi" ? "Năm trước" : "Previous year"} style={styles.calendarNavButton} onPress={() => setCalendarCursor(shiftCalendarMonth(calendarCursor, -12))}>
                <Ionicons name="play-skip-back-outline" size={16} color={colors.gold} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={language === "vi" ? "Tháng trước" : "Previous month"} style={styles.calendarNavButton} onPress={() => setCalendarCursor(shiftCalendarMonth(calendarCursor, -1))}>
                <Ionicons name="chevron-back-outline" size={18} color={colors.gold} />
              </Pressable>
            </View>
            <Text style={styles.calendarMonthLabel}>{calendarMonthLabel(calendarCursor, language)}</Text>
            <View style={styles.calendarNavCluster}>
              <Pressable accessibilityRole="button" accessibilityLabel={language === "vi" ? "Tháng sau" : "Next month"} style={styles.calendarNavButton} onPress={() => setCalendarCursor(shiftCalendarMonth(calendarCursor, 1))}>
                <Ionicons name="chevron-forward-outline" size={18} color={colors.gold} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={language === "vi" ? "Năm sau" : "Next year"} style={styles.calendarNavButton} onPress={() => setCalendarCursor(shiftCalendarMonth(calendarCursor, 12))}>
                <Ionicons name="play-skip-forward-outline" size={16} color={colors.gold} />
              </Pressable>
            </View>
          </View>
          <View style={styles.calendarGrid}>
            {weekdayLabels.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.calendarWeekday}>{label}</Text>
            ))}
            {calendarCells.map((date, index) => {
              const dateValue = date ? formatDateInput(date) : "";
              const selected = Boolean(date && value === dateValue);
              return (
                <Pressable
                  key={`${dateValue || "empty"}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={date ? dateValue : undefined}
                  accessibilityState={{ selected, disabled: !date }}
                  accessible={Boolean(date)}
                  disabled={!date}
                  onPress={() => {
                    if (!date) return;
                    onChange(dateValue);
                    if (collapsible) setOpen(false);
                  }}
                  style={[styles.calendarDay, !date && styles.calendarDayEmpty, selected && styles.calendarDaySelected]}
                >
                  <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>{date ? date.getDate() : ""}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <Text style={[styles.statusChip, tone === "good" && styles.statusGood, tone === "warn" && styles.statusWarn, tone === "bad" && styles.statusBad]}>
      {label}
    </Text>
  );
}

export function StatusLine({ label, status, tone }: { label: string; status: string; tone: StatusTone }) {
  return (
    <View style={styles.statusLine}>
      <Text style={styles.statusLineLabel}>{label}</Text>
      <StatusChip label={status} tone={tone} />
    </View>
  );
}

export function ContentBlock({ title, body, meta }: { title: string; body: string; meta?: string }) {
  return (
    <View style={styles.contentBlock}>
      {meta ? <Text style={styles.kicker}>{meta}</Text> : null}
      <Text style={styles.contentBlockTitle}>{title}</Text>
      <Text style={styles.contentBlockBody}>{body}</Text>
    </View>
  );
}

export function RitualLoading({ label }: { label: string }) {
  return <View style={styles.ritualLoading} accessibilityLiveRegion="polite">
    <Brand variant="horizontal" width={164} decorative />
    <Text style={styles.ritualLoadingLabel}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  screenShell: {
    backgroundColor: colors.surface,
    flex: 1
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    // Match the compact 16px content gutter so the header never creates a
    // 4px horizontal overflow when the browser scrollbar reduces clientWidth.
    marginHorizontal: -16,
    marginTop: -20,
    marginBottom: spacing.lg,
    minWidth: 0,
    paddingHorizontal: 20
  },
  topTitle: {
    color: colors.ivory,
    flex: 1,
    flexShrink: 1,
    fontSize: 28,
    fontWeight: "700",
    maxWidth: "100%",
    minWidth: 0,
    textAlign: "center"
  },
  topTitleGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minWidth: 0
  },
  topBrandEmblem: {
    height: 28,
    width: 28
  },
  topIconButton: {
    alignItems: "center",
    height: layout.minimumTouchTarget,
    justifyContent: "center",
    width: layout.minimumTouchTarget
  },
  glassTopBar: {
    alignItems: "center",
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    minHeight: 52,
    paddingHorizontal: spacing.sm
  },
  glassIconButton: {
    alignItems: "center",
    height: layout.minimumTouchTarget,
    justifyContent: "center",
    width: layout.minimumTouchTarget
  },
  glassTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 24,
    fontWeight: "700"
  },
  topIcon: {
    color: colors.gold,
    minWidth: 32,
    textAlign: "center"
  },
  subflowTopBar: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 64,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md
  },
  subflowButton: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    height: layout.minimumTouchTarget,
    justifyContent: "center",
    width: layout.minimumTouchTarget
  },
  subflowCenter: {
    alignItems: "center",
    flex: 1
  },
  subflowTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 1.2
  },
  subflowSubtitle: {
    color: colors.gold,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 10,
    letterSpacing: 1.4,
    marginTop: -2,
    textTransform: "uppercase"
  },
  invisible: {
    opacity: 0
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  iconText: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: spacing.xs
  },
  iconAction: {
    color: colors.moon,
    fontSize: 13,
    fontWeight: "800"
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
    minWidth: 0,
    paddingTop: spacing.lg,
    width: "100%"
  },
  kicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textAlign: "center",
    textTransform: "uppercase"
  },
  title: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 40,
    fontWeight: "600",
    lineHeight: 48,
    marginTop: spacing.sm,
    maxWidth: "100%",
    minWidth: 0,
    textAlign: "center"
  },
  editorialHeader: {
    marginBottom: spacing.lg,
    minWidth: 0,
    width: "100%"
  },
  editorialTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 42,
    marginTop: spacing.xs,
    maxWidth: "100%",
    minWidth: 0
  },
  editorialBody: {
    color: colors.muted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm
  },
  sectionLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: "uppercase"
  },
  progressRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.sm
  },
  progressDot: {
    backgroundColor: colors.panelSoft,
    borderRadius: radius.control,
    height: 6,
    width: 28
  },
  progressDotActive: {
    backgroundColor: colors.gold
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.ivory,
    borderRadius: radius.control,
    marginTop: spacing.lg,
    minHeight: 64,
    justifyContent: "center",
    padding: spacing.md
  },
  primaryButtonText: {
    color: colors.charcoal,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  ritualButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.control,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 48,
    padding: spacing.md
  },
  ritualButtonText: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.52
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.gold,
    borderRadius: radius.control,
    borderWidth: 1,
    marginTop: spacing.md,
    minHeight: 48,
    padding: spacing.md
  },
  secondaryButtonText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "800"
  },
  chip: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  activeChip: {
    backgroundColor: "rgba(201, 164, 92, 0.18)",
    borderColor: colors.gold
  },
  chipText: {
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    fontWeight: "700"
  },
  activeChipText: {
    color: colors.gold
  },
  languageMenu: {
    marginTop: spacing.sm,
    position: "relative",
    zIndex: 10
  },
  languageTrigger: {
    alignItems: "center",
    backgroundColor: "rgba(247, 241, 230, 0.05)",
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  languageTriggerLabel: {
    flex: 1
  },
  languageTriggerText: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 14
  },
  languageTriggerMeta: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 11,
    marginTop: 2
  },
  languageDropdown: {
    backgroundColor: "#211D1F",
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: "hidden"
  },
  languageDropdownItem: {
    alignItems: "center",
    borderBottomColor: "rgba(247, 241, 230, 0.08)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  languageDropdownItemActive: {
    backgroundColor: "rgba(201, 164, 92, 0.10)"
  },
  disabledLanguageDropdownItem: {
    opacity: 0.48
  },
  disabledLanguageText: {
    color: colors.moon
  },
  languageSoon: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 11,
    marginTop: 2
  },
  languageNativeText: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 14
  },
  languageEnglishText: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 11,
    marginTop: 2
  },
  languageFlag: {
    alignItems: "center",
    backgroundColor: "rgba(21, 20, 22, 0.84)",
    borderColor: "rgba(247, 241, 230, 0.22)",
    borderRadius: 5,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    overflow: "hidden",
    width: 34
  },
  languageFlagVi: {
    backgroundColor: "#C9282D"
  },
  languageFlagZh: {
    alignItems: "flex-start",
    backgroundColor: "#D62828",
    paddingLeft: 6
  },
  languageFlagJa: {
    backgroundColor: "#F7F1E6"
  },
  languageFlagKo: {
    backgroundColor: "#F7F1E6"
  },
  languageFlagDot: {
    backgroundColor: "#C9282D",
    borderRadius: 999,
    height: 13,
    width: 13
  },
  languageFlagHalfDot: {
    backgroundColor: "#C9282D",
    borderColor: "#0E5A5A",
    borderRadius: 999,
    borderTopWidth: 7,
    height: 15,
    width: 15
  },
  languageFlagDisabled: {
    opacity: 0.7
  },
  actionTile: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minWidth: 92,
    padding: spacing.sm
  },
  actionIcon: {
    color: colors.ivory,
    marginBottom: spacing.sm
  },
  tileTitle: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  tileDetail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs
  },
  choiceTile: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 92,
    padding: spacing.md,
    width: "47%"
  },
  choiceTileActive: {
    borderColor: colors.gold
  },
  choiceTitle: {
    color: colors.ivory,
    fontSize: 17,
    fontWeight: "800"
  },
  featureWide: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg
  },
  featureWideMuted: {
    backgroundColor: "rgba(201, 130, 141, 0.11)"
  },
  featureTile: {
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    justifyContent: "space-between",
    minHeight: 162,
    padding: spacing.md
  },
  featureTileTeal: {
    backgroundColor: "rgba(14, 90, 90, 0.18)"
  },
  featureTileRose: {
    backgroundColor: "rgba(201, 130, 141, 0.15)"
  },
  featureTileNeutral: {
    backgroundColor: colors.panel
  },
  featureIcon: {
    color: colors.gold
  },
  featureSmallTitle: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "800"
  },
  featureDetail: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs
  },
  flex: {
    flex: 1
  },
  datePickerPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md
  },
  selectedDateField: {
    alignItems: "center",
    backgroundColor: "rgba(247, 241, 230, 0.04)",
    borderColor: "rgba(201, 164, 92, 0.28)",
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  selectedDateText: {
    color: colors.ivory,
    flex: 1,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 15
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md
  },
  calendarNavCluster: {
    flexDirection: "row",
    gap: spacing.xs
  },
  calendarNavButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    height: layout.minimumTouchTarget,
    justifyContent: "center",
    width: layout.minimumTouchTarget
  },
  calendarMonthLabel: {
    color: colors.ivory,
    flex: 1,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 14,
    textAlign: "center",
    textTransform: "capitalize"
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
    marginTop: spacing.md
  },
  calendarWeekday: {
    color: colors.moon,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 11,
    textAlign: "center",
    width: "14.285714%"
  },
  calendarDay: {
    alignItems: "center",
    minHeight: layout.minimumTouchTarget,
    borderColor: "transparent",
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: "center",
    width: "14.285714%"
  },
  calendarDayEmpty: {
    opacity: 0
  },
  calendarDaySelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold
  },
  calendarDayText: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 14
  },
  calendarDayTextSelected: {
    color: colors.charcoal
  },
  miniStat: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    minHeight: 76,
    minWidth: "46%",
    padding: spacing.sm,
    justifyContent: "center"
  },
  miniStatValue: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: "800"
  },
  miniStatLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: spacing.xs
  },
  statusChip: {
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.moon,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: "uppercase"
  },
  statusGood: {
    borderColor: colors.teal,
    color: colors.ivory
  },
  statusWarn: {
    borderColor: colors.gold,
    color: colors.gold
  },
  statusBad: {
    borderColor: colors.rose,
    color: colors.rose
  },
  statusLine: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm
  },
  statusLineLabel: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "800"
  },
  contentBlock: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md
  },
  contentBlockTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineFontFamily,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28
  },
  contentBlockBody: {
    color: colors.muted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  ritualLoading: {
    alignItems: "center",
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl
  },
  ritualLoadingTitle: {
    color: "#E8C176",
    fontFamily: typography.headlineFontFamily,
    fontSize: 40,
    fontWeight: "600",
    letterSpacing: 8,
    marginTop: spacing.md,
    textAlign: "center"
  },
  ritualEmblemContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 140,
    height: 140,
    marginTop: spacing.md,
    marginBottom: spacing.xs
  },
  ritualGlowAura: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(201, 164, 92, 0.2)"
  },
  ritualInfinity: {
    color: colors.gold,
    fontSize: 44,
    fontWeight: "600",
    marginTop: spacing.lg
  },
  ritualInfinityImage: {
    width: 104,
    height: 104
  },
  ritualLoadingLabel: {
    color: colors.moon,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 2,
    marginTop: spacing.md,
    textTransform: "uppercase",
    textAlign: "center"
  },
  ritualLine: {
    backgroundColor: "rgba(201, 164, 92, 0.18)",
    height: 1,
    marginTop: spacing.xl,
    width: 180,
    overflow: "hidden"
  },
  ritualLineFill: {
    backgroundColor: colors.gold,
    height: 1,
    width: "46%"
  }
});
