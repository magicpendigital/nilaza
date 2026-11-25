import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../../theme";
import type { Language } from "../../types";
import { challenges, currentPinnacleIndex, localToday, personalCycles, pinnacles, type CalendarDay, type NumerologyMap } from "./calc";
import {
  challengeFrame,
  challengeLine,
  personalDayLine,
  personalMonthLine,
  personalYearBlock,
  personalYearFrame,
  pinnacleFrame,
  pinnacleNumberLine,
  pinnacleStageLine
} from "./content";

// Lô 5, lớp 3 "Nhịp thời gian": personal year / month / day, the four pinnacle stages and the four challenges.
// Everything is worked out on the device from the birth date and today's local date; nothing is stored or sent.

const teal = "#9FD3CF";
const rose = "#E7B7BE";
const muted = "#8F877C";
const body = "#E9E2D6";
const card = "#1F1C1E";

type Props = { map: NumerologyMap; language: Language; /** For tests; defaults to the device's local date. */ today?: CalendarDay };

export function NumerologyTime({ map, language, today = localToday() }: Props) {
  const vi = language === "vi";
  const cycles = personalCycles(map.birth, today);
  const year = personalYearBlock(cycles.year, language);
  const stages = pinnacles(map.birth);
  const current = currentPinnacleIndex(map.birth, today);
  const tests = challenges(map.birth);
  const ages = (from: number, to: number | null) =>
    to === null ? (vi ? `khoảng tuổi ${from} trở đi` : `about age ${from} onward`) : vi ? `khoảng tuổi ${from}–${to}` : `about ages ${from}–${to}`;

  return (
    <View testID="numerology-time" style={s.stack}>
      <View style={s.section}>
        <Text style={s.kicker}>{vi ? "NHỊP THỜI GIAN" : "TIMING"}</Text>
        <Text accessibilityRole="header" style={s.h2}>{vi ? "Nhịp thời gian" : "Your timing"}</Text>
      </View>

      <View testID="personal-year" style={s.panel}>
        <Text style={s.panelKicker}>{`${vi ? "Năm cá nhân" : "Personal year"} ${cycles.year} · ${today.year}`}</Text>
        <Text style={s.title}>{year.title}</Text>
        <Text style={s.panelBody}>{year.leans}</Text>
        <Text style={s.question}>{year.question}</Text>
        <Text style={s.hint}>{personalYearFrame(language)}</Text>
      </View>

      <View testID="personal-month" style={s.panel}>
        <Text style={s.panelKicker}>{`${vi ? "Tháng cá nhân" : "Personal month"} ${cycles.month}`}</Text>
        <Text style={s.panelBody}>{personalMonthLine(cycles.month, language)}</Text>
        <Text testID="personal-day" style={s.hint}>{`${vi ? "Ngày cá nhân" : "Personal day"} ${cycles.day}: ${personalDayLine(cycles.day, language)}`}</Text>
      </View>

      <View style={s.section}>
        <Text accessibilityRole="header" style={s.h3}>{vi ? "Bốn giai đoạn đỉnh cao" : "Four pinnacle stages"}</Text>
        <Text style={s.hint}>{pinnacleFrame(language)}</Text>
      </View>
      {stages.map((stage, index) => {
        const isCurrent = index === current;
        const head = `${vi ? "Giai đoạn" : "Stage"} ${stage.stage} · ${ages(stage.fromAge, stage.toAge)} · ${vi ? "số" : "number"} ${stage.number.label}`;
        return (
          <View
            key={stage.stage}
            testID={`pinnacle-${stage.stage}`}
            accessible
            accessibilityLabel={`${head}${isCurrent ? (vi ? ", giai đoạn hiện tại" : ", current stage") : ""}. ${pinnacleStageLine(stage.stage, language)} ${pinnacleNumberLine(stage.number, language)}`}
            style={[s.stage, isCurrent && s.stageNow]}
          >
            {isCurrent ? <Text testID="pinnacle-current" style={s.nowBadge}>{vi ? "Giai đoạn hiện tại" : "Current stage"}</Text> : null}
            <Text style={s.panelKicker}>{head}</Text>
            <Text style={s.hint}>{pinnacleStageLine(stage.stage, language)}</Text>
            <Text style={s.panelBody}>{pinnacleNumberLine(stage.number, language)}</Text>
          </View>
        );
      })}

      <View style={s.section}>
        <Text accessibilityRole="header" style={s.h3}>{vi ? "Bốn thử thách" : "Four challenges"}</Text>
        <Text style={s.hint}>{challengeFrame(language)}</Text>
      </View>
      {tests.map((value, index) => (
        <View key={index} testID={`challenge-${index + 1}`} style={s.panel}>
          <Text style={s.panelKicker}>{`${vi ? "Thử thách" : "Challenge"} ${index + 1} · ${vi ? "số" : "number"} ${value}`}</Text>
          <Text style={s.panelBody}>{challengeLine(value, language)}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: 12 },
  section: { marginTop: 12, gap: 8 },
  kicker: { color: teal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5 },
  h2: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 26, lineHeight: 31 },
  h3: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 20, lineHeight: 25 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 27 },
  hint: { color: muted, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 19 },
  panel: { padding: 16, borderRadius: 16, backgroundColor: card, gap: 8 },
  panelKicker: { color: rose, fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 17 },
  panelBody: { color: body, fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 22 },
  question: { color: colors.gold, fontFamily: typography.bodyItalicFontFamily, fontSize: 14.5, lineHeight: 21 },
  stage: { padding: 16, borderRadius: 16, backgroundColor: card, gap: 6, borderWidth: 1, borderColor: "transparent" },
  stageNow: { borderColor: colors.gold },
  nowBadge: { alignSelf: "flex-start", color: colors.charcoal, backgroundColor: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11.5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: "hidden" }
});
