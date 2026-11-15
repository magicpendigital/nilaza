import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import chaptersData from "../../../../../packages/content/data/astrology-mythology-chapters.json";
import depthData from "../../../../../packages/content/data/astrology-mythology-depth.json";
import fixtureData from "../../../../../packages/content/data/astrology-chart-fixtures.json";
import { colors, typography } from "../../theme";
import { FeatureVisualId, getFeatureVisual } from "../../visualAssets";
import {
  AstrologyChartPresentation,
  AstrologyLanguage,
  toAstrologyChartPresentation,
  type AstrologySignId,
} from "./contracts";
import { Control, ZodiacWheel } from "./ZodiacWheel";
import { AstrologyChartStory } from "./AstrologyChartStory";
import type { AstrologyAiGuideAnswer, AstrologyAiGuideStatus } from "./AstrologyAiGuidePanel";
import { AstrologySignGuide } from "./AstrologySignGuide";
import type { AstrologyChartSelectionModel } from "./chartSelection";
export { ZodiacWheel, MythologyEntry } from "./ZodiacWheel";

export type LibraryState = {
  bookmarks: string[];
  completed: string[];
  lastChapter: string | null;
};
const empty: LibraryState = { bookmarks: [], completed: [], lastChapter: null };
const local = (v: { vi: string; en: string }, l: string) =>
  l === "vi" ? v.vi : v.en;
export function MythologyWorld({
  language,
  ownerPremiumPreview = false,
  onBack,
  chart,
  houses = [],
  library = empty,
  onLibraryChange,
  onReflection,
  selectionModel,
  saved,
  chartSaving,
  onSaveChart,
  onOpenDetails,
  onRequestAiUnlock,
  aiStatus,
  aiAnswer,
  aiErrorMessage,
  onSubmitAiQuestion,
  onRetryAiQuestion,
  aiAnswerSaved,
  onSaveAiAnswer,
  onReportAiAnswer,
  initialTab,
  aiUnlockLabel,
  aiCrisis,
}: {
  language: AstrologyLanguage;
  ownerPremiumPreview?: boolean;
  onBack: () => void;
  chart?: AstrologyChartPresentation;
  houses?: { house: number; longitude: number; sign: string }[];
  library?: LibraryState;
  onLibraryChange?: (state: LibraryState) => void | Promise<void>;
  onReflection?: (title: string, prompt: string) => void;
  selectionModel?: AstrologyChartSelectionModel;
  saved?: boolean;
  chartSaving?: boolean;
  onSaveChart?: () => void;
  onOpenDetails?: () => void;
  onRequestAiUnlock?: (pendingQuestion?: string, preferredFactIds?: readonly string[]) => void;
  aiStatus?: AstrologyAiGuideStatus;
  aiAnswer?: AstrologyAiGuideAnswer;
  aiErrorMessage?: string;
  onSubmitAiQuestion?: (question: string, preferredFactIds?: readonly string[]) => void;
  onRetryAiQuestion?: () => void;
  aiAnswerSaved?: boolean;
  onSaveAiAnswer?: () => void;
  onReportAiAnswer?: () => void;
  initialTab?: "story" | "guide";
  aiUnlockLabel?: string;
  aiCrisis?: boolean;
}) {
  const vi = language === "vi";
  const [selected, setSelected] = useState(
    Math.max(
      0,
      chaptersData.chapters.findIndex(
        (c) =>
          c.id ===
          (chart?.facts.find((f) => f.id === "sun")?.sign ??
            library.lastChapter),
      ),
    ),
  );
  const [reader, setReader] = useState(false),
    [demo, setDemo] = useState(false),
    [error, setError] = useState("");
  const [reduced, setReduced] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const signRow = useRef<ScrollView>(null);
  const explorerScroll = useRef<ScrollView>(null);
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    // Chart Story owns the full -> focus -> peek -> exit sequence. Keeping
    // this parent handler active can consume Android Back before the sheet.
    if (chart && selectionModel) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (reader) setReader(false);
      else onBack();
      return true;
    });
    return () => sub.remove();
  }, [chart, onBack, reader, selectionModel]);
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [localLibrary, setLocalLibrary] = useState(library);
  useEffect(() => setLocalLibrary(library), [library]);
  const update = async (next: LibraryState) => {
    if (saving.current) return;
    saving.current = true;
    setSavingLibrary(true);
    try {
      await onLibraryChange?.(next);
      if (mounted.current) {
        setLocalLibrary(next);
        setError("");
      }
    } catch {
      if (mounted.current)
        setError(
          vi
            ? "Chưa lưu được tiến độ đọc. Hãy thử lại."
            : "Reading progress was not saved. Please retry.",
        );
    } finally {
      saving.current = false;
      if (mounted.current) setSavingLibrary(false);
    }
  };
  const chapter = chaptersData.chapters[selected],
    depth = depthData.chapters[selected];
  const sample = demo
    ? toAstrologyChartPresentation(fixtureData.fixtures[0].chart)
    : undefined;
  const shown = chart ?? sample;
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (live) setReduced(v);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      live = false;
      listener.remove();
    };
  }, []);
  useEffect(() => {
    opacity.stopAnimation();
    opacity.setValue(reduced ? 1 : 0.45);
    if (!reduced)
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }).start();
    return () => opacity.stopAnimation();
  }, [selected, reader, reduced, opacity]);
  const select = (index: number) => {
    setSelected(index);
    setError("");
    signRow.current?.scrollTo({
      x: Math.max(0, index * 108 - 100),
      animated: !reduced,
    });
  };
  const startReading = () => {
    update({ ...localLibrary, lastChapter: chapter.id });
    setReader(true);
  };
  const toggleBookmark = () =>
    update({
      ...localLibrary,
      bookmarks: localLibrary.bookmarks.includes(chapter.id)
        ? localLibrary.bookmarks.filter((x) => x !== chapter.id)
        : [...localLibrary.bookmarks, chapter.id],
    });
  if (chart && selectionModel) {
    return (
      <AstrologyChartStory
        chart={chart}
        houses={houses}
        language={language}
        ownerPremiumPreview={ownerPremiumPreview}
        onBack={onBack}
        onOpenDetails={onOpenDetails}
        onReflection={onReflection}
        onRequestAiUnlock={onRequestAiUnlock}
        aiStatus={aiStatus}
        aiAnswer={aiAnswer}
        aiErrorMessage={aiErrorMessage}
        onSubmitAiQuestion={onSubmitAiQuestion}
        onRetryAiQuestion={onRetryAiQuestion}
        aiAnswerSaved={aiAnswerSaved}
        onSaveAiAnswer={onSaveAiAnswer}
        onReportAiAnswer={onReportAiAnswer}
        initialTab={initialTab}
        aiUnlockLabel={aiUnlockLabel}
        aiCrisis={aiCrisis}
        onSaveChart={onSaveChart}
        saved={saved}
        saving={chartSaving}
        selectionModel={selectionModel}
      />
    );
  }
  return (
    <View style={s.root}>
      <View style={s.top}>
        <Control
          label={
            reader
              ? vi
                ? "← Vòng sao"
                : "← Wheel"
              : vi
                ? "← Astrology"
                : "← Astrology"
          }
          onPress={() => (reader ? setReader(false) : onBack())}
        />
        <Text style={s.kicker}>NILAZA · ATLAS</Text>
      </View>
      {savingLibrary && (
        <Text accessibilityLiveRegion="polite" style={s.note}>
          {vi ? "Đang lưu tiến độ…" : "Saving reading progress…"}
        </Text>
      )}
      {reader ? (
        <ScrollView
          key={chapter.id + language}
          contentContainerStyle={s.reader}
        >
          <Animated.View style={{ opacity, gap: 20 }}>
            <Text style={s.kicker}>
              {local(chapter.name, language).toUpperCase()} ·{" "}
              {vi ? "ĐỌC SÂU" : "DEEP READING"}
            </Text>
            <Text accessibilityRole="header" style={s.title}>
              {local(chapter.title, language)}
            </Text>
            <Image
              source={getFeatureVisual(
                `astrology-${chapter.id}-v2` as FeatureVisualId,
              )}
              resizeMode="contain"
              style={s.art}
              accessibilityLabel={
                local(chapter.name, language) +
                (vi ? " — tranh biểu tượng" : " — symbolic artwork")
              }
              onError={() =>
                setError(
                  vi
                    ? "Ảnh chưa tải được; bạn vẫn có thể đọc đầy đủ."
                    : "Artwork unavailable; the full reading remains accessible.",
                )
              }
            />
            <Text style={s.note}>
              {vi
                ? "Minh họa nghệ thuật hiện đại, lấy cảm hứng từ thần thoại."
                : "Contemporary art inspired by mythology."}
            </Text>
            {!!error && (
              <Text accessibilityRole="alert" style={s.body}>
                {error}
              </Text>
            )}
            <AstrologySignGuide
              language={language}
              mode="detail"
              onReflection={onReflection}
              signId={chapter.id as AstrologySignId}
            />
            <Control
              label={
                localLibrary.bookmarks.includes(chapter.id)
                  ? vi
                    ? "Đã đánh dấu · bỏ đánh dấu"
                    : "Bookmarked · remove"
                  : vi
                    ? "Đánh dấu để đọc lại"
                    : "Bookmark for later"
              }
              active={localLibrary.bookmarks.includes(chapter.id)}
              onPress={toggleBookmark}
            />
            {(["story", "variants", "lens", "practice"] as const).map(
              (key, i) => (
                <View key={key} style={{ gap: 12 }}>
                  <Text style={s.kicker}>
                    {
                      [
                        vi ? "01 / CÂU CHUYỆN" : "01 / THE STORY",
                        vi
                          ? "02 / DỊ BẢN & ĐIỀU CẦN PHÂN BIỆT"
                          : "02 / VARIANTS & DISTINCTIONS",
                        vi ? "03 / GÓC ĐỌC CỦA NILAZA" : "03 / NILAZA'S LENS",
                        vi ? "04 / THỬ TRONG ĐỜI SỐNG" : "04 / TRY IT IN LIFE",
                      ][i]
                    }
                  </Text>
                  <Text selectable style={s.body}>
                    {local(depth[key], language)}
                  </Text>
                </View>
              ),
            )}
            {chart && (
              <View style={s.card}>
                <Text style={s.kicker}>
                  {vi ? "TRÊN BẢN ĐỒ CỦA BẠN" : "IN YOUR CHART"}
                </Text>
                <Text style={s.body}>
                  {chart.facts
                    .filter((f) => f.sign === chapter.id)
                    .map(
                      (f) =>
                        local(
                          { vi: f.label.vi ?? f.id, en: f.label.en ?? f.id },
                          language,
                        ) +
                        " " +
                        f.degree.toFixed(2) +
                        "°",
                    )
                    .join(" · ") ||
                    (vi
                      ? "Không có thiên thể hoặc góc chính trong cung này. Bạn vẫn có thể đọc và suy ngẫm; không cần có vị trí để một câu chuyện hữu ích."
                      : "No body or major angle falls in this sign. You can still explore the story; a placement is not required for reflection.")}
                </Text>
              </View>
            )}
            <Text style={s.question}>{local(chapter.question, language)}</Text>
            {!!onReflection && (
              <Control
                label={vi ? "Viết suy ngẫm của tôi" : "Write my reflection"}
                onPress={() =>
                  onReflection(
                    local(chapter.title, language),
                    local(chapter.question, language),
                  )
                }
              />
            )}
            <Text style={s.note}>
              {vi
                ? "Nguồn cổ: Hyginus, Astronomica "
                : "Ancient source: Hyginus, Astronomica "}
              {depth.section}
              {vi
                ? ". Kể lại và bình luận bằng lời của Nilaza; không phải bản dịch nguyên văn."
                : ". Original retelling and commentary by Nilaza, not a literal translation."}
            </Text>
            <Control
              label={vi ? "Mở văn bản nguồn ↗" : "Open source text ↗"}
              onPress={() => {
                void Linking.openURL(
                  chaptersData.sources.find((x) => x.id === "hyginus")!.url,
                ).catch(() =>
                  setError(
                    vi
                      ? "Không mở được nguồn; thử lại khi có mạng."
                      : "Could not open source; try again when connected.",
                  ),
                );
              }}
            />
            <Text style={s.note}>{local(chaptersData.boundary, language)}</Text>
            <Control
              label={
                localLibrary.completed.includes(chapter.id)
                  ? vi
                    ? "Đã đọc chương này"
                    : "Chapter completed"
                  : vi
                    ? "Đánh dấu đã đọc"
                    : "Mark chapter complete"
              }
              active={localLibrary.completed.includes(chapter.id)}
              onPress={() =>
                update({
                  ...localLibrary,
                  completed: [
                    ...new Set([...localLibrary.completed, chapter.id]),
                  ],
                })
              }
            />
            <View style={s.top}>
              <Control
                label={vi ? "← Chương trước" : "← Previous"}
                onPress={() => select((selected + 11) % 12)}
              />
              <Control
                label={vi ? "Chương tiếp →" : "Next →"}
                onPress={() => select((selected + 1) % 12)}
              />
            </View>
          </Animated.View>
        </ScrollView>
      ) : (
        <View style={s.explorer}>
          <Text style={s.kicker}>
            {chart
              ? vi
                ? "BẢN ĐỒ CÁ NHÂN"
                : "PERSONAL CHART"
              : demo
                ? vi
                  ? "BẢN ĐỒ MINH HỌA · DỮ LIỆU TỔNG HỢP"
                  : "EXAMPLE CHART · SYNTHETIC DATA"
                : vi
                  ? "THƯ VIỆN · CHẠM TRỰC TIẾP MỘT CUNG"
                  : "LIBRARY · TOUCH A SIGN"}
          </Text>
          <ZodiacWheel
            contentScrollRef={explorerScroll}
            language={language}
            selected={selected}
            onSelect={select}
            chart={shown}
            houses={
              demo
                ? fixtureData.fixtures[0].chart.houses.map((h) => ({
                    house: h.number,
                    longitude: h.cuspLongitude,
                    sign: h.sign,
                  }))
                : houses
            }
          >
            <ScrollView
              ref={signRow}
              horizontal
              showsHorizontalScrollIndicator
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
            >
              {chaptersData.chapters.map((c, i) => (
                <Control
                  key={c.id}
                  label={local(c.name, language)}
                  active={i === selected}
                  onPress={() => select(i)}
                />
              ))}
            </ScrollView>
            <Animated.View style={[s.card, { opacity }]}>
              <Text
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
                style={s.heading}
              >
                {local(chapter.title, language)}
              </Text>
              <Text style={s.body}>{local(chapter.myth, language)}</Text>
              <AstrologySignGuide
                language={language}
                mode="preview"
                signId={chapter.id as AstrologySignId}
              />
              <Control
                label={
                  vi
                    ? "Mở câu chuyện & đọc sâu →"
                    : "Open story & explore deeper →"
                }
                onPress={startReading}
              />
            </Animated.View>
            <Text style={s.note}>
              {localLibrary.completed.length}/12{" "}
              {vi ? "chương đã đọc" : "chapters completed"} ·{" "}
              {localLibrary.bookmarks.length} {vi ? "đánh dấu" : "bookmarks"}
            </Text>
            {localLibrary.bookmarks.length > 0 && (
              <ScrollView
                horizontal
                contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
              >
                {localLibrary.bookmarks.map((id) => {
                  const i = chaptersData.chapters.findIndex((c) => c.id === id);
                  return i < 0 ? null : (
                    <Control
                      key={id}
                      label={
                        "☆ " + local(chaptersData.chapters[i].name, language)
                      }
                      onPress={() => {
                        select(i);
                        setReader(true);
                      }}
                    />
                  );
                })}
              </ScrollView>
            )}
            {__DEV__ && !chart && (
              <Control
                label={
                  demo
                    ? vi
                      ? "Về vòng biểu tượng"
                      : "Back to symbol wheel"
                    : vi
                      ? "Xem bản đồ minh họa"
                      : "View example chart"
                }
                onPress={() => {
                  setDemo(!demo);
                  explorerScroll.current?.scrollTo({ y: 0, animated: false });
                }}
              />
            )}
          </ZodiacWheel>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: colors.charcoal },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexWrap: "wrap",
  },
  explorer: { flex: 1, minHeight: 0, paddingHorizontal: 16, gap: 4 },
  reader: {
    padding: 24,
    paddingBottom: 48,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  kicker: {
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 11,
    lineHeight: 18,
    letterSpacing: 1.2,
    color: colors.gold,
  },
  title: {
    fontFamily: typography.headlineRegularFontFamily,
    color: colors.ivory,
    fontSize: 38,
    lineHeight: 44,
  },
  heading: {
    fontFamily: typography.headlineRegularFontFamily,
    color: colors.ivory,
    fontSize: 28,
    lineHeight: 34,
  },
  body: {
    fontFamily: typography.bodyFontFamily,
    color: colors.ivory,
    fontSize: 16,
    lineHeight: 27,
  },
  note: {
    fontFamily: typography.bodyFontFamily,
    color: colors.moon,
    fontSize: 13,
    lineHeight: 21,
    marginVertical: 10,
  },
  art: {
    width: "100%",
    height: "auto",
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: "#102222",
  },
  card: { padding: 16, gap: 12, borderRadius: 8, backgroundColor: "#1B2928" },
  question: {
    fontFamily: typography.headlineRegularFontFamily,
    color: colors.ivory,
    fontSize: 27,
    lineHeight: 35,
  },
});
