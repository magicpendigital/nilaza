import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { BirthDateFields } from "../astrology/BirthFields";
import { numerologyModel, type ShareRequest } from "../share/shareCardContent";
import { buildNumerologyMap, gridLayout, localToday, reduceNumber, type ArrowId, type NumerologyMap, type NumerologyNumber } from "./calc";
import { arrowLabel, arrowNotes, arrowText, chartCopy, digitReading, fill, kindFrame, kindTitle, numberBlock, numerologyContentReviewed, numerologyExtraReviewed, type NumerologyKind } from "./content";
import { cleanName, loadSavedName, nameMaxLength, saveName, type NumerologyStorage } from "./store";
import { NumerologyCompat, PrivateMessageSoon } from "./NumerologyCompat";
import { NumerologyTime } from "./NumerologyTime";
import { buildPrivateMessagePayload, type PrivateMessagePayload, type ReportPayload } from "./aiPayload";
import type { NumerologyMessageOutcome, NumerologyReportOutcome } from "../../backendClient";
import { NumerologyReport } from "./NumerologyReport";
import type { ReportStorage } from "./reportStore";

// Layout follows the Design canvas screens "Bản đồ số, nhập thông tin" (NumInput) and "Bản đồ số" (NumMap),
// sections "Bạn" and "Biểu đồ ngày sinh"; Lô 5 adds "Nhịp thời gian", "Hợp số" and the "Lời nhắn riêng · Sắp có" card.
// The section bar (Bạn · Biểu đồ · Nhịp · Hợp số) and "Viết vào Nhật ký" follow the canvas NumMap (28/11).
// The AI report and "Hỏi Nilaza" belong to later batches.

const teal = "#9FD3CF";
const amber = "#E3B583";
const rose = "#E7B7BE";
const muted = "#8F877C";
const soft = "#B8B0A4";
const body = "#E9E2D6";
const card = "#1F1C1E";

type Props = {
  language: Language;
  /** Account storage for the name. A guest passes nothing and the name stays in memory. */
  storage?: NumerologyStorage;
  /** YYYY-MM-DD from the profile, or empty. */
  initialBirthDate: string;
  onBirthDateChange?: (value: string) => void;
  onOpenShare?: (request: ShareRequest) => void;
  onEvent?: (name: string, metadata?: Record<string, string | number | boolean>) => void;
  /** Signed-in accounts only: sends the private-message payload (numbers and block ids, never the name or birth date). */
  onRequestPrivateMessage?: (payload: PrivateMessagePayload) => Promise<NumerologyMessageOutcome>;
  /** 2026-11-28: signed-in accounts only: sends the report payload (numbers, digits present, arrows and block ids). */
  onRequestReport?: (payload: ReportPayload) => Promise<NumerologyReportOutcome>;
  /** Opens the Journal pre-filled with an approved question; the name, date and numbers are not passed. */
  onWriteJournal?: (prompt: string) => void;
  onBack: () => void;
};

type ResultSection = "you" | "chart" | "time" | "compat";

// Characters that are neither letters nor spaces: digits and symbols are skipped by the calculation, so say so.
const oddNameChars = /[0-9_@#$%^&*()+=<>/\\|~`!?;:,"[\]{}]/;

export function NumerologyScreen({ language, storage, initialBirthDate, onBirthDateChange, onOpenShare, onEvent, onRequestPrivateMessage, onRequestReport, onWriteJournal, onBack }: Props) {
  const vi = language === "vi";
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [name, setName] = useState("");
  const [map, setMap] = useState<NumerologyMap | null>(null);
  const [shownName, setShownName] = useState("");
  const nameTouched = useRef(false);

  useEffect(() => {
    onEvent?.("numerology_opened");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!storage) return;
    let live = true;
    void loadSavedName(storage).then((saved) => {
      // Never overwrite what the person already typed while the saved name was loading.
      if (live && saved && !nameTouched.current) setName(saved);
    });
    return () => { live = false; };
  }, [storage]);

  const changeBirth = (value: string) => {
    setBirthDate(value);
    if (value) onBirthDateChange?.(value);
  };

  // `withName` false is the "see the numbers from the birth date first" path: the typed name is neither used nor saved.
  const compute = (withName: boolean) => {
    const used = withName ? name : "";
    const next = buildNumerologyMap(birthDate, used);
    if (!next) return;
    setMap(next);
    setShownName(next.name ? cleanName(used).trim() : "");
    if (withName && storage) void saveName(storage, name);
    onEvent?.("numerology_computed", { hasName: Boolean(next.name) });
  };

  const share = map && onOpenShare ? () => onOpenShare(shareRequest(map, language)) : undefined;

  return (
    <ScrollView testID="numerology-screen" contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Quay lại" : "Back"} onPress={map ? () => setMap(null) : onBack} hitSlop={8} style={s.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.ivory} />
        </Pressable>
        <Text style={s.headerKicker}>{vi ? "BẢN ĐỒ SỐ" : "NUMBER MAP"}</Text>
        {share ? (
          <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Chia sẻ thẻ số chủ đạo" : "Share life path card"} onPress={share} hitSlop={8} style={s.iconButton}>
            <Ionicons name="share-outline" size={22} color={colors.ivory} />
          </Pressable>
        ) : (
          <View style={s.iconButton} />
        )}
      </View>
      {!(numerologyContentReviewed && numerologyExtraReviewed) ? (
        <Text testID="numerology-draft-note" style={s.draft}>
          {vi ? "Bản thử: phần diễn giải đang chờ người duyệt chuyên môn. Hãy đọc như một gợi ý để tự soi." : "Test version: the readings are waiting for an expert reviewer. Read them as prompts for reflection."}
        </Text>
      ) : null}
      {map ? (
        <Result map={map} name={shownName} language={language} onShare={share} onAddName={() => setMap(null)}
          // No metadata: the other person's date, name and numbers never reach an event.
          onCompared={() => onEvent?.("numerology_compat_compared")} onRequestPrivateMessage={onRequestPrivateMessage}
          reportStorage={storage as ReportStorage | undefined} onRequestReport={onRequestReport}
          onWriteJournal={onWriteJournal ? (prompt) => { onEvent?.("numerology_journal_opened"); onWriteJournal(prompt); } : undefined} />
      ) : (
        <Input
          language={language}
          birthDate={birthDate}
          birthPrefilled={Boolean(initialBirthDate)}
          name={name}
          onBirthDate={changeBirth}
          onName={(value) => { nameTouched.current = true; setName(cleanName(value)); }}
          onCompute={compute}
        />
      )}
    </ScrollView>
  );
}

function shareRequest(map: NumerologyMap, language: Language): ShareRequest {
  const block = numberBlock(map.lifePath, language);
  return {
    model: numerologyModel({
      language,
      lifePath: map.lifePath.label,
      birthday: map.birthday.label,
      expression: map.name?.expression.label,
      lifePathTitle: block.title,
      lifePathRoot: map.lifePath.root,
      light: block.light,
      question: block.question
    }),
    primary: "image"
  };
}

function Input({ language, birthDate, birthPrefilled, name, onBirthDate, onName, onCompute }: {
  language: Language; birthDate: string; birthPrefilled: boolean; name: string;
  onBirthDate: (value: string) => void; onName: (value: string) => void; onCompute: (withName: boolean) => void;
}) {
  const vi = language === "vi";
  const [how, setHow] = useState(false);
  const ready = Boolean(buildNumerologyMap(birthDate));
  return (
    <View style={s.stack}>
      <View style={s.stackSm}>
        <Text accessibilityRole="header" style={s.h1}>{vi ? "Bản đồ số của bạn" : "Your number map"}</Text>
        <Text style={s.lead}>
          {vi ? "Chỉ cần ngày sinh là có kết quả. Thêm họ tên khai sinh để có thêm các số từ tên." : "A birth date is enough. Add your birth name to get the numbers from your name too."}
        </Text>
      </View>
      <View>
        <BirthDateFields language={language} value={birthDate} onChange={onBirthDate} label={vi ? "Ngày sinh (dương lịch)" : "Birth date (Gregorian)"} />
        {birthPrefilled ? <Text style={[s.hint, s.gapTop]}>{vi ? "Đã có từ hồ sơ của bạn nên không phải nhập lại." : "Already in your profile, so there is nothing to retype."}</Text> : null}
      </View>
      <View>
        <View style={s.labelRow}>
          <Text style={s.label}>{vi ? "Họ tên khai sinh" : "Birth name"}</Text>
          <Text style={s.optional}>{vi ? "Không bắt buộc" : "Optional"}</Text>
        </View>
        <TextInput
          accessibilityLabel={vi ? "Họ tên khai sinh" : "Birth name"}
          value={name}
          onChangeText={onName}
          maxLength={nameMaxLength}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder={vi ? "Ví dụ: Nguyễn Khánh Linh" : "For example: Nguyen Khanh Linh"}
          placeholderTextColor="#6E675F"
          style={s.input}
        />
        {oddNameChars.test(name) ? (
          <Text accessibilityRole="alert" style={[s.hint, s.warn, s.gapTop]}>
            {vi ? "Tên có ký tự lạ (số, ký hiệu). Các ký tự đó được bỏ qua khi tính." : "The name has odd characters (digits, symbols). They are skipped in the calculation."}
          </Text>
        ) : null}
        <Text style={[s.hint, s.gapTop]}>
          {vi
            ? "Dùng tên trên giấy khai sinh. Tên thường gọi sẽ cho kết quả khác. Dấu tiếng Việt (ă â ê ô ơ ư đ) được xử lý tự động."
            : "Use the name on your birth certificate. A nickname gives different numbers. Vietnamese accents are handled automatically."}
        </Text>
      </View>
      <View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={() => onCompute(true)} style={[s.primary, !ready && s.disabled]}>
          <Text style={s.primaryText}>{vi ? "Xem bản đồ số của mình" : "See my number map"}</Text>
        </Pressable>
        {!ready ? <Text style={[s.hint, s.gapTop, s.center]}>{vi ? "Nhập ngày sinh hợp lệ để xem bản đồ." : "Enter a valid birth date to see the map."}</Text> : null}
        <View style={s.links}>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={() => onCompute(false)} style={[s.link, !ready && s.disabled]}>
            <Text style={s.linkText}>{vi ? "Chưa muốn nhập tên? Xem các số từ ngày sinh trước" : "Not ready to add a name? See the birth-date numbers first"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: how }} onPress={() => setHow((value) => !value)} style={s.link}>
            <Text style={[s.linkText, s.linkSoft]}>{vi ? "Nilaza tính thế nào?" : "How does Nilaza work this out?"}</Text>
          </Pressable>
        </View>
        {how ? (
          <Text testID="numerology-how" style={[s.hint, s.explain]}>
            {vi
              ? "Cách đọc kiểu Pythagoras: chữ cái có giá trị từ 1 đến 9 (A=1 … I=9, J=1 … R=9, S=1 … Z=8). Các số được cộng rồi rút về một chữ số, trừ 11 và 22 được giữ lại. Chữ Y là nguyên âm khi từ không có A, E, I, O, U."
              : "A Pythagorean-style reading: letters carry values from 1 to 9 (A=1 … I=9, J=1 … R=9, S=1 … Z=8). Numbers are added and reduced to one digit, except 11 and 22 which are kept. Y is a vowel only in a word with no A, E, I, O or U."}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const sumOfDigits = (n: number) => String(n).split("").reduce((sum, d) => sum + Number(d), 0);

// "15 → 1 + 5 = 6"; a single digit or a kept master number stands alone.
function partLine(label: string, n: number, vi: boolean) {
  const value = reduceNumber(n);
  if (n === value) return `${label} ${String(n).padStart(2, "0")} → ${value}${n > 9 ? (vi ? ", giữ lại" : ", kept") : ""}`;
  return `${label} ${n} → ${String(n).split("").join(" + ")} = ${sumOfDigits(n)}${sumOfDigits(n) === value ? "" : ` → ${value}`}`;
}

function howLines(map: NumerologyMap, vi: boolean) {
  const { day, month, year } = map.birth;
  const parts = [reduceNumber(day), reduceNumber(month), reduceNumber(year)];
  const total = parts[0] + parts[1] + parts[2];
  const lp = map.lifePath;
  const lines = [partLine(vi ? "Ngày" : "Day", day, vi), partLine(vi ? "Tháng" : "Month", month, vi), partLine(vi ? "Năm" : "Year", year, vi)];
  if (lp.master) {
    lines.push(vi ? `${parts.join(" + ")} = ${total}, giữ lại vì là số bậc thầy` : `${parts.join(" + ")} = ${total}, kept as a master number`);
    lines.push(vi ? `${String(lp.value).split("").join(" + ")} = ${lp.root}, số gốc đi kèm, ghi là ${lp.label}` : `${String(lp.value).split("").join(" + ")} = ${lp.root}, the root number, written ${lp.label}`);
  } else {
    lines.push(`${parts.join(" + ")} = ${total}${total === lp.value ? "" : ` → ${lp.value}`}`);
  }
  return lines;
}

function SectionBar({ value, onChange, language }: { value: ResultSection; onChange: (next: ResultSection) => void; language: Language }) {
  const vi = language === "vi";
  const items: { id: ResultSection; label: string }[] = [
    { id: "you", label: vi ? "Bạn" : "You" },
    { id: "chart", label: vi ? "Biểu đồ" : "Chart" },
    { id: "time", label: vi ? "Nhịp" : "Timing" },
    { id: "compat", label: vi ? "Hợp số" : "Match" }
  ];
  return (
    <View testID="numerology-sections" accessibilityRole="tablist" style={s.segments}>
      {items.map((item) => {
        const on = item.id === value;
        return (
          <Pressable key={item.id} testID={`numerology-section-${item.id}`} accessibilityRole="tab" accessibilityState={{ selected: on }}
            onPress={() => onChange(item.id)} style={[s.segment, on && s.segmentOn]}>
            <Text numberOfLines={1} style={[s.segmentText, on && s.segmentTextOn]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Result({ map, name, language, onShare, onAddName, onCompared, onRequestPrivateMessage, reportStorage, onRequestReport, onWriteJournal }: { map: NumerologyMap; name: string; language: Language; onShare?: () => void; onAddName: () => void; onCompared?: () => void;
  onRequestPrivateMessage?: Props["onRequestPrivateMessage"]; reportStorage?: ReportStorage; onRequestReport?: Props["onRequestReport"]; onWriteJournal?: (prompt: string) => void }) {
  const vi = language === "vi";
  const [section, setSection] = useState<ResultSection>("you");
  const [picked, setPicked] = useState<NumerologyKind | null>(null);
  const present = Object.keys(map.grid.counts).map(Number).sort((a, b) => a - b);
  // Open on the most repeated digit (the lowest one on a tie), so a "×3" cell is read first.
  const [digit, setDigit] = useState<number | null>(present.reduce<number | null>((best, d) => (best === null || map.grid.counts[d] > map.grid.counts[best] ? d : best), null));
  const notes = arrowNotes(language);
  const lifeBlock = numberBlock(map.lifePath, language);
  const { day, month, year } = map.birth;
  const dateText = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  const [headline, root] = map.lifePath.label.split("/");
  const tiles: { kind: NumerologyKind; number: NumerologyNumber; from: string }[] = [
    { kind: "birthday", number: map.birthday, from: vi ? "Từ ngày sinh" : "From birth date" },
    ...(map.name
      ? ([
          { kind: "soulUrge", number: map.name.soulUrge, from: vi ? "Từ tên khai sinh" : "From birth name" },
          { kind: "expression", number: map.name.expression, from: vi ? "Từ tên khai sinh" : "From birth name" },
          { kind: "personality", number: map.name.personality, from: vi ? "Từ tên khai sinh" : "From birth name" }
        ] as const)
      : [])
  ];
  const pickedTile = tiles.find((tile) => tile.kind === picked);
  const hasEmptyCells = present.length < 9;
  return (
    <View style={s.stack}>
      <View style={s.stackSm}>
        <Text style={s.kicker}>{name ? `${name.toUpperCase()} · ${dateText}` : dateText}</Text>
        <SectionBar value={section} onChange={setSection} language={language} />
      </View>

      {section === "you" ? (<>
      <View style={s.stackSm}>
        <View testID="number-lifePath" style={s.hero}>
          <View style={s.heroHead}>
            <Text accessibilityLabel={`${kindTitle("lifePath", language)} ${map.lifePath.label}`} style={s.heroNumber}>
              {headline}
              {root ? <Text style={s.heroRoot}>{`/${root}`}</Text> : null}
            </Text>
            <View style={s.flex}>
              <Text style={s.heroLabel}>{kindTitle("lifePath", language)}</Text>
              <Text style={s.heroTitle}>{lifeBlock.title}</Text>
            </View>
          </View>
          <Text style={s.heroBody}>{lifeBlock.leans}</Text>
          {lifeBlock.masterNote ? <Text style={[s.hint, s.gapTop]}>{lifeBlock.masterNote}</Text> : null}
        </View>
      </View>

      <HowTo title={vi ? "Cách tính" : "How it is worked out"} open={vi ? "Mở ra để xem từng bước" : "Open to see each step"} lines={howLines(map, vi)} />

      <View style={s.tileGrid}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.kind}
            testID={`number-${tile.kind}`}
            accessibilityRole="button"
            accessibilityLabel={`${kindTitle(tile.kind, language)} ${tile.number.label}`}
            accessibilityState={{ selected: picked === tile.kind }}
            onPress={() => setPicked(picked === tile.kind ? null : tile.kind)}
            style={[s.tile, picked === tile.kind && s.tileOn]}
          >
            <Text style={s.tileFrom}>{tile.from}</Text>
            <Text style={s.tileKind}>{kindTitle(tile.kind, language)}</Text>
            <Text style={s.tileNumber}>{tile.number.label}</Text>
          </Pressable>
        ))}
        {!map.name ? (
          <Pressable accessibilityRole="button" onPress={onAddName} style={[s.tile, s.addName]}>
            <Text style={s.addNameText}>{vi ? "Thêm họ tên để xem thêm 3 số: biểu đạt, linh hồn, nhân cách" : "Add a name to see 3 more numbers: expression, soul urge, personality"}</Text>
          </Pressable>
        ) : null}
      </View>
      {pickedTile ? <NumberReading kind={pickedTile.kind} number={pickedTile.number} language={language} /> : <Text style={s.hint}>{vi ? "Chạm một số để đọc." : "Tap a number to read it."}</Text>}

      <View style={s.twoCol}>
        <View style={[s.pro, s.flex]}>
          <Text style={[s.proTitle, { color: teal }]}>{vi ? "ĐIỂM MẠNH" : "STRENGTHS"}</Text>
          <Text style={s.proText}>{lifeBlock.light}</Text>
        </View>
        <View style={[s.pro, s.proWatch, s.flex]}>
          <Text style={[s.proTitle, { color: amber }]}>{vi ? "ĐIỀU ĐỂ Ý" : "WORTH WATCHING"}</Text>
          <Text style={s.proText}>{lifeBlock.trap}</Text>
        </View>
      </View>
      <PrivateMessageSoon language={language} onRequestMessage={onRequestPrivateMessage
        ? () => onRequestPrivateMessage(buildPrivateMessagePayload(map, localToday(), language)) : undefined} />
      <NumerologyReport map={map} language={language} storage={reportStorage} onRequestReport={onRequestReport} />
      </>) : null}

      {section === "chart" ? (<>

      <View style={s.section}>
        <Text style={s.kicker}>{vi ? "BIỂU ĐỒ NGÀY SINH" : "BIRTH-DATE CHART"}</Text>
        <Text accessibilityRole="header" style={s.h2}>{vi ? "Những con số có mặt trong ngày sinh của bạn" : "The numbers present in your birth date"}</Text>
      </View>
      <ChartSummary counts={map.grid.counts} language={language} />
      <Grid counts={map.grid.counts} language={language} selected={digit} onSelect={setDigit} />
      <Text style={[s.hint, s.center]}>{vi ? "Chạm một ô để đọc. Số 0 trong ngày sinh không có ô riêng." : "Tap a cell to read it. A 0 in the birth date has no cell of its own."}</Text>
      {digit ? <DigitReading digit={digit} count={map.grid.counts[digit] ?? 0} language={language} /> : null}
      {hasEmptyCells ? <Text style={s.hint}>{chartCopy("emptyHint", language)}</Text> : null}
      {map.grid.full.map((id) => <ArrowCard key={id} id={id} language={language} />)}
      {map.grid.empty.length ? <Text testID="arrows-empty-note" style={s.hint}>{`${notes.empty} ${vi ? "Ở bạn, các đường trống là" : "For you, the empty lines are"} ${map.grid.empty.join(", ")}.`}</Text> : null}
      <Text style={s.hint}>{notes.label}</Text>
      </>) : null}

      {section === "time" ? <NumerologyTime map={map} language={language} /> : null}
      {section === "compat" ? <NumerologyCompat map={map} language={language} onCompared={onCompared} /> : null}

      <View style={s.section}>
        {onShare ? (
          <Pressable accessibilityRole="button" onPress={onShare} style={s.primary}>
            <Text style={s.primaryText}>{vi ? "Chia sẻ thẻ" : "Share card"}</Text>
          </Pressable>
        ) : null}
        <Text style={[s.hint, s.gapTop]}>{`${vi ? "Câu hỏi để viết: " : "A question to write on: "}${lifeBlock.question}`}</Text>
        {onWriteJournal ? (
          <Pressable testID="numerology-write-journal" accessibilityRole="button" onPress={() => onWriteJournal(lifeBlock.question)} style={[s.secondary, s.gapTop]}>
            <Ionicons name="create-outline" size={18} color={colors.gold} />
            <Text style={s.secondaryText}>{vi ? "Viết vào Nhật ký" : "Write in Journal"}</Text>
          </Pressable>
        ) : null}
        <Text style={[s.footer, s.gapTop]}>
          {vi
            ? "Thần số học là một khung truyền thống để tự phản chiếu, không phải khoa học và không dự đoán tương lai."
            : "Numerology is a traditional frame for self-reflection, not science and not a forecast."}
        </Text>
      </View>
    </View>
  );
}

function HowTo({ title, open, lines }: { title: string; open: string; lines: string[] }) {
  const [shown, setShown] = useState(false);
  return (
    <View style={s.how}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: shown }} onPress={() => setShown((value) => !value)} style={s.howHead}>
        <Text style={s.howTitle}>{title}</Text>
        <Text style={s.optional}>{shown ? "" : open}</Text>
      </Pressable>
      {shown ? <View testID="numerology-how-steps" style={s.howBody}>{lines.map((line) => <Text key={line} style={s.howLine}>{line}</Text>)}</View> : null}
    </View>
  );
}

function NumberReading({ kind, number, language }: { kind: NumerologyKind; number: NumerologyNumber; language: Language }) {
  const vi = language === "vi";
  const block = numberBlock(number, language);
  return (
    <View testID={`reading-${kind}`} style={s.panel}>
      <Text style={s.panelKicker}>{`${kindTitle(kind, language)} · ${number.label}`}</Text>
      <Text style={s.readingTitle}>{block.title}</Text>
      <Text style={s.hint}>{kindFrame(kind, language)}</Text>
      <Text style={s.panelBody}>{block.leans}</Text>
      {block.masterNote ? <Text style={s.hint}>{block.masterNote}</Text> : null}
      <Text style={s.panelBody}><Text style={s.bold}>{vi ? "Mặt sáng: " : "Light side: "}</Text>{block.light}</Text>
      <Text style={s.panelBody}><Text style={s.bold}>{vi ? "Dễ vấp: " : "Where you may stumble: "}</Text>{block.trap}</Text>
      <Text style={s.question}>{block.question}</Text>
    </View>
  );
}

function ArrowCard({ id, language }: { id: ArrowId; language: Language }) {
  const vi = language === "vi";
  return (
    <View testID={`arrow-${id}`} style={s.arrow}>
      <Text style={s.arrowKicker}>{`${vi ? "Mũi tên" : "Arrow"} ${id} · ${vi ? "đủ cả ba ô" : "all three cells"}`}</Text>
      <Text style={s.panelBody}>{`${arrowLabel(id, language)}: ${arrowText(id, language)}`}</Text>
    </View>
  );
}

function DigitReading({ digit, count, language }: { digit: number; count: number; language: Language }) {
  const vi = language === "vi";
  const reading = digitReading(digit, count, language);
  const state = count === 0 ? (vi ? "trống" : "empty") : count === 1 ? (vi ? "có mặt" : "present") : `${vi ? "có mặt" : "present"} ${fill(chartCopy("times", language), { count })}`;
  return (
    <View testID="digit-reading" style={s.panel}>
      <Text style={s.panelKicker}>{`${vi ? "Ô số" : "Cell"} ${digit} · ${state}`}</Text>
      <Text style={s.readingTitle}>{reading.title}</Text>
      <Text style={s.panelBody}>{reading.body}</Text>
      {reading.many ? <Text testID="digit-reading-many" style={[s.panelBody, s.manyNote]}>{reading.many}</Text> : null}
    </View>
  );
}

function ChartSummary({ counts, language }: { counts: Record<number, number>; language: Language }) {
  const vi = language === "vi";
  const present = gridLayout.flat().filter((d) => (counts[d] ?? 0) > 0);
  const max = Math.max(0, ...present.map((d) => counts[d]));
  const strongest = present.filter((d) => counts[d] === max).sort((a, b) => a - b);
  const rows = gridLayout.map((row) => ({ row, total: row.reduce((sum, d) => sum + (counts[d] ?? 0), 0) }));
  const top = Math.max(...rows.map((r) => r.total));
  const topRows = rows.filter((r) => r.total === top);
  const lines = [fill(chartCopy("presentCount", language), { n: present.length })];
  if (max > 1) lines.push(fill(chartCopy("strongest", language), { digit: strongest.join(vi ? " và " : " and "), count: max }));
  else if (present.length) lines.push(chartCopy("noRepeat", language));
  if (top > 0 && topRows.length === 1) {
    const id = [...topRows[0].row].sort((a, b) => a - b).join("-") as ArrowId;
    lines.push(fill(chartCopy("row", language), { label: arrowLabel(id, language), digits: topRows[0].row.join(" · ") }));
  }
  return (
    <View testID="chart-summary" style={s.summary}>
      {lines.map((line) => <Text key={line} style={s.summaryLine}>{line}</Text>)}
      {max > 1 ? <Text style={s.hint}>{chartCopy("repeatHint", language)}</Text> : null}
    </View>
  );
}

// Top row 3-6-9, middle 2-5-8, bottom 1-4-7. A digit that is absent is dashed and dim. A repeated digit is written
// once with a "×3" marker: writing it three times ("999") read as a different number on the Owner's phone test.
function Grid({ counts, language, selected, onSelect }: { counts: Record<number, number>; language: Language; selected: number | null; onSelect: (digit: number) => void }) {
  const vi = language === "vi";
  const label = gridLayout.flat().map((digit) => (counts[digit] ? `${digit} ×${counts[digit]}` : `${digit} ${vi ? "trống" : "empty"}`)).join(", ");
  return (
    <View accessibilityLabel={`${vi ? "Biểu đồ ngày sinh" : "Birth-date chart"}: ${label}`} testID="numerology-grid" style={s.grid}>
      {gridLayout.map((row) => (
        <View key={row.join("")} style={s.gridRow}>
          {row.map((digit) => {
            const count = counts[digit] ?? 0;
            return (
              <Pressable
                key={digit}
                accessibilityRole="button"
                accessibilityLabel={`${vi ? "Ô số" : "Cell"} ${digit}, ${count ? (vi ? "có mặt" : "present") : vi ? "trống" : "empty"}${count > 1 ? (vi ? `, ${count} lần` : `, ${count} times`) : ""}`}
                accessibilityState={{ selected: selected === digit }}
                onPress={() => onSelect(digit)}
                style={[s.cell, count > 0 ? s.cellOn : s.cellOff, selected === digit && s.cellPicked]}
              >
                <Text style={[s.cellDigit, count === 0 && s.cellDim]}>{digit}</Text>
                {count > 1 ? <Text testID={`cell-count-${digit}`} style={s.cellCount}>{`×${count}`}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { paddingTop: 4, paddingBottom: 48, gap: 16 },
  stack: { gap: 16 },
  stackSm: { gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: "center" },
  gapTop: { marginTop: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerKicker: { color: teal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5 },
  draft: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18, padding: 10, borderRadius: radius.card, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(247, 241, 230, 0.2)" },
  h1: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 32, lineHeight: 36 },
  h2: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 26, lineHeight: 31 },
  lead: { color: soft, fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 22 },
  labelRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 },
  label: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  optional: { color: muted, fontFamily: typography.bodyFontFamily, fontSize: 12 },
  input: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", paddingHorizontal: 16, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 17, backgroundColor: card },
  hint: { color: muted, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 19 },
  warn: { color: amber },
  primary: { minHeight: 54, borderRadius: 27, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16 },
  disabled: { opacity: 0.45 },
  links: { marginTop: 6, alignItems: "center" },
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  secondary: { minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.5)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  secondaryText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  segments: { flexDirection: "row", padding: 4, gap: 4, borderRadius: radius.pill, backgroundColor: card, marginTop: 8 },
  segment: { flex: 1, minWidth: 0, minHeight: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  segmentOn: { backgroundColor: "rgba(201, 164, 92, 0.2)" },
  segmentText: { color: soft, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  segmentTextOn: { color: colors.ivory },
  linkText: { color: colors.gold, fontFamily: typography.bodyFontFamily, fontSize: 14, textAlign: "center" },
  linkSoft: { color: soft },
  explain: { marginTop: 4, padding: 12, borderRadius: 12, backgroundColor: card },
  kicker: { color: teal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5 },
  section: { marginTop: 12, gap: 8 },
  hero: { padding: 20, borderRadius: 24, backgroundColor: card, gap: 14 },
  heroHead: { flexDirection: "row", alignItems: "flex-end", gap: 16 },
  heroNumber: { color: colors.gold, fontFamily: typography.headlineRegularFontFamily, fontSize: 96, lineHeight: 96 },
  heroRoot: { color: soft, fontFamily: typography.headlineRegularFontFamily, fontSize: 40 },
  heroLabel: { color: soft, fontFamily: typography.bodyFontFamily, fontSize: 12 },
  heroTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 26, marginTop: 2 },
  heroBody: { color: body, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 24 },
  how: { borderRadius: 16, backgroundColor: card, paddingHorizontal: 16 },
  howHead: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  howTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  howBody: { paddingBottom: 14, gap: 2 },
  howLine: { color: body, fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 23 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexBasis: "47%", flexGrow: 1, padding: 14, borderRadius: 14, backgroundColor: card, borderWidth: 1, borderColor: "transparent" },
  tileOn: { borderColor: colors.gold },
  tileFrom: { color: muted, fontFamily: typography.bodyFontFamily, fontSize: 11.5 },
  tileKind: { color: soft, fontFamily: typography.bodyFontFamily, fontSize: 13, marginTop: 4 },
  tileNumber: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 36, lineHeight: 42, marginTop: 2 },
  addName: { backgroundColor: "transparent", borderStyle: "dashed", borderColor: "rgba(201, 164, 92, 0.5)", justifyContent: "center", minHeight: 44 },
  addNameText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5, lineHeight: 19 },
  twoCol: { flexDirection: "row", gap: 10 },
  pro: { padding: 14, borderRadius: 14, backgroundColor: "rgba(127, 181, 167, 0.12)", gap: 6 },
  proWatch: { backgroundColor: "rgba(217, 160, 102, 0.12)" },
  proTitle: { fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, letterSpacing: 0.6 },
  proText: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 20 },
  panel: { padding: 16, borderRadius: 16, backgroundColor: card, gap: 8 },
  panelKicker: { color: rose, fontFamily: typography.bodyFontFamily, fontSize: 12 },
  panelBody: { color: body, fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 22 },
  readingTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 27 },
  bold: { fontFamily: typography.bodySemiBoldFontFamily },
  question: { color: colors.gold, fontFamily: typography.bodyItalicFontFamily, fontSize: 14.5, lineHeight: 21 },
  arrow: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)", gap: 6 },
  arrowKicker: { color: colors.gold, fontFamily: typography.bodyFontFamily, fontSize: 12 },
  grid: { alignSelf: "center", gap: 8 },
  gridRow: { flexDirection: "row", gap: 8 },
  cell: { width: 82, height: 78, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cellOn: { backgroundColor: "rgba(201, 164, 92, 0.14)", borderColor: colors.gold },
  cellOff: { borderStyle: "dashed", borderColor: "rgba(247, 241, 230, 0.22)" },
  cellPicked: { borderWidth: 2 },
  cellDigit: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 30 },
  cellDim: { color: muted },
  cellCount: { position: "absolute", top: 6, right: 8, color: colors.charcoal, backgroundColor: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11.5, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, overflow: "hidden" },
  manyNote: { paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.gold },
  summary: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(159, 211, 207, 0.25)", gap: 6 },
  summaryLine: { color: body, fontFamily: typography.bodyFontFamily, fontSize: 14.5, lineHeight: 22 },
  footer: { color: muted, fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 19, textAlign: "center" }
});
