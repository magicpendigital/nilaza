import Ionicons from "@expo/vector-icons/Ionicons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import chaptersData from "../../../../../packages/content/data/astrology-mythology-chapters.json";
import depthData from "../../../../../packages/content/data/astrology-mythology-depth.json";
import { colors, layout, radius, spacing, typography } from "../../theme";
import { getFeatureVisual } from "../../visualAssets";
import {
  AstrologyAiGuidePanel,
  type AstrologyAiGuideAnswer,
  type AstrologyAiGuideEvidence,
  type AstrologyAiGuideStatus,
} from "./AstrologyAiGuidePanel";
import {
  findAstrologyChartSelection,
  findAstrologyChartSelectionByFactId,
  getAstrologySelectionKindLabel,
  getAstrologySelectionLabel,
  type AstrologyChartSelection,
  type AstrologyChartSelectionModel,
} from "./chartSelection";
import {
  localizeAstrologyBody,
  localizeAstrologyLabel,
  localizeAstrologySign,
  type AstrologyChartPresentation,
  type AstrologyLanguage,
  type AstrologySignId,
} from "./contracts";
import { aspectName, bodyMeaning, houseMeaning } from "./AstrologyGlossary";
import Svg, { Line as SvgLine } from "react-native-svg";
import { getAstrologyAspectLineStyle } from "./chartVisuals";
import { ZodiacWheel } from "./ZodiacWheel";
import { AstrologySignGuide } from "./AstrologySignGuide";
import { buildAstrologyGuidePrompts, buildAstrologyPlacementReflection } from "./interpretation";

type StoryTab = "story" | "guide" | "data";
type SheetLevel = "peek" | "focus" | "full";

type HousePosition = { house: number; longitude: number; sign: string };

export type AstrologyChartStoryProps = {
  language: AstrologyLanguage;
  chart: AstrologyChartPresentation;
  houses: HousePosition[];
  selectionModel: AstrologyChartSelectionModel;
  initialTab?: StoryTab;
  onBack: () => void;
  saved?: boolean;
  saving?: boolean;
  onSaveChart?: () => void;
  onOpenDetails?: () => void;
  onReflection?: (title: string, prompt: string) => void;
  aiStatus?: AstrologyAiGuideStatus;
  aiAnswer?: AstrologyAiGuideAnswer;
  aiErrorMessage?: string;
  onSubmitAiQuestion?: (question: string, preferredFactIds?: readonly string[]) => void;
  onRetryAiQuestion?: () => void;
  aiAnswerSaved?: boolean;
  onSaveAiAnswer?: () => void;
  onReportAiAnswer?: () => void;
  ownerPremiumPreview?: boolean;
  onRequestAiUnlock?: (pendingQuestion?: string, preferredFactIds?: readonly string[]) => void;
};

const supportedLanguage = (language: AstrologyLanguage): "vi" | "en" =>
  language === "vi" ? "vi" : "en";

const local = (
  value: { vi?: string; en?: string },
  language: AstrologyLanguage,
) => (language === "vi" ? value.vi : value.en) ?? value.en ?? value.vi ?? "";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const glyphByBody: Record<string, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
  ascendant: "ASC",
  midheaven: "MC",
};

function signForSelection(
  selection: AstrologyChartSelection,
  model: AstrologyChartSelectionModel,
): AstrologySignId {
  if (selection.kind === "body" || selection.kind === "sign")
    return selection.sign;
  if (selection.kind === "house") return selection.sign;
  return (
    model.bodies.find((body) => body.bodyId === selection.bodyA)?.sign ??
    model.signs[0].sign
  );
}

function chapterNumber(selection: AstrologyChartSelection) {
  if (selection.kind === "body") {
    if (selection.bodyId === "sun") return 1;
    if (selection.bodyId === "moon") return 2;
    if (selection.bodyId === "ascendant") return 3;
  }
  return 4;
}

function StoryTabButton({
  label,
  active,
  onPress,
  badge,
  compact = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        compact && styles.tabCompact,
        active && styles.tabActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.tabText,
          compact && styles.tabTextCompact,
          active && styles.tabTextActive,
        ]}
      >
        {label}
      </Text>
      {badge ? <Ionicons name="sparkles" size={12} color={colors.teal} /> : null}
    </Pressable>
  );
}

function SheetAction({
  label,
  onPress,
  primary = false,
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetAction,
        primary && styles.sheetActionPrimary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={primary ? colors.ivory : colors.teal}
        />
      ) : null}
      <Text
        style={[
          styles.sheetActionText,
          primary && styles.sheetActionTextPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AstrologyChartStory({
  language,
  chart,
  houses,
  selectionModel,
  onBack,
  saved = false,
  saving = false,
  onSaveChart,
  onOpenDetails,
  onReflection,
  aiStatus = "locked",
  aiAnswer,
  aiErrorMessage,
  onSubmitAiQuestion,
  onRetryAiQuestion,
  aiAnswerSaved,
  onSaveAiAnswer,
  onReportAiAnswer,
  ownerPremiumPreview = false,
  onRequestAiUnlock,
  initialTab = "story",
}: AstrologyChartStoryProps) {
  const vi = language === "vi";
  const panelLanguage = supportedLanguage(language);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const immersiveTopInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const [surfaceHeight, setSurfaceHeight] = useState<number | null>(null);
  const availableHeight = surfaceHeight ?? height;
  const compact = availableHeight < 720;
  const veryCompact = availableHeight < 620;
  const narrow = width < 360;
  const initialSelectionId =
    selectionModel.bodies.find((item) => item.bodyId === "sun")?.id ??
    selectionModel.bodies[0]?.id ??
    selectionModel.signs[0]?.id;
  const [selectionId, setSelectionId] = useState<string | undefined>(
    initialSelectionId,
  );
  const [tab, setTab] = useState<StoryTab>(initialTab);
  const [level, setLevel] = useState<SheetLevel>("peek");
  const [immersive, setImmersive] = useState(false);
  const [question, setQuestion] = useState("");
  const [aiPreviewNotice, setAiPreviewNotice] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const sheetScrollRef = useRef<ScrollView>(null);
  const accuracyReviewPending =
    chart.status !== "ready" ||
    chart.uncertainties.some((item) => item.severity !== "info");

  const selected =
    findAstrologyChartSelection(selectionModel, selectionId) ??
    selectionModel.bodies[0] ??
    selectionModel.signs[0];
  const selectedSign = signForSelection(selected, selectionModel);
  const selectedIndex = Math.max(
    0,
    selectionModel.signs.findIndex((item) => item.sign === selectedSign),
  );
  const chapter = chaptersData.chapters.find((item) => item.id === selectedSign)!;
  const depth = depthData.chapters.find((item) => item.id === selectedSign)!;
  const chapterStep = chapterNumber(selected);
  const chapterTheme =
    chapterStep < 4
      ? vi
        ? "Cốt lõi"
        : "Core"
      : vi
        ? "Mối liên hệ"
        : "Connections";

  const sheetHeights = useMemo(() => {
    const peek = Math.min(veryCompact ? 166 : 190, availableHeight * 0.29);
    const focus = veryCompact
      ? Math.min(304, availableHeight - 198)
      : Math.min(
          Math.max(compact ? 360 : 440, availableHeight * 0.58),
          availableHeight - 126,
        );
    return {
      peek,
      focus,
      full: Math.max(
        focus,
        availableHeight - Math.max(insets.top + 18, 28),
      ),
    };
  }, [availableHeight, compact, insets.top, veryCompact]);
  const sheetHeight = useRef(new Animated.Value(sheetHeights.peek)).current;
  const levelRef = useRef<SheetLevel>(level);
  const heightsRef = useRef(sheetHeights);
  const dragStart = useRef(sheetHeights.peek);
  heightsRef.current = sheetHeights;
  levelRef.current = level;

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReducedMotion(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    sheetHeight.setValue(sheetHeights[levelRef.current]);
  }, [sheetHeight, sheetHeights]);

  useEffect(() => {
    if (findAstrologyChartSelection(selectionModel, selectionId)) return;
    setSelectionId(initialSelectionId);
  }, [initialSelectionId, selectionId, selectionModel]);

  const snapTo = useCallback(
    (next: SheetLevel) => {
      levelRef.current = next;
      setLevel(next);
      sheetHeight.stopAnimation();
      if (reducedMotion) {
        sheetHeight.setValue(sheetHeights[next]);
      } else {
        Animated.spring(sheetHeight, {
          toValue: sheetHeights[next],
          damping: 27,
          stiffness: 250,
          mass: 0.9,
          useNativeDriver: false,
        }).start();
      }
    },
    [reducedMotion, sheetHeight, sheetHeights],
  );
  const snapRef = useRef(snapTo);
  snapRef.current = snapTo;

  const handleBack = useCallback(() => {
    if (immersive) setImmersive(false);
    else if (levelRef.current === "full") snapTo("focus");
    else if (levelRef.current === "focus") snapTo("peek");
    else onBack();
  }, [immersive, onBack, snapTo]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [handleBack]);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dy) > 7,
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        Math.abs(gesture.dy) > 7,
      onPanResponderGrant: () => {
        dragStart.current = heightsRef.current[levelRef.current];
      },
      onPanResponderMove: (_event, gesture) => {
        const values = heightsRef.current;
        sheetHeight.setValue(
          clamp(dragStart.current - gesture.dy, values.peek, values.full),
        );
      },
      onPanResponderRelease: (_event, gesture) => {
        const values = heightsRef.current;
        if (Math.abs(gesture.dy) < 7) {
          snapRef.current(
            levelRef.current === "peek"
              ? "focus"
              : levelRef.current === "focus"
                ? "full"
                : "focus",
          );
          return;
        }
        if (gesture.vy < -0.6) {
          snapRef.current(levelRef.current === "peek" ? "focus" : "full");
          return;
        }
        if (gesture.vy > 0.6) {
          snapRef.current(levelRef.current === "full" ? "focus" : "peek");
          return;
        }
        const released = clamp(
          dragStart.current - gesture.dy,
          values.peek,
          values.full,
        );
        const nearest = (Object.keys(values) as SheetLevel[]).reduce(
          (best, candidate) =>
            Math.abs(values[candidate] - released) <
            Math.abs(values[best] - released)
              ? candidate
              : best,
          "focus",
        );
        snapRef.current(nearest);
      },
      onPanResponderTerminate: () => snapRef.current(levelRef.current),
    }),
  ).current;

  const select = useCallback(
    (nextId: string | null | undefined, expand = true) => {
      if (!nextId) return;
      const next = findAstrologyChartSelection(selectionModel, nextId);
      if (!next) return;
      setSelectionId(next.id);
      if (expand && levelRef.current === "peek") snapRef.current("focus");
      const label = getAstrologySelectionLabel(next, panelLanguage);
      AccessibilityInfo.announceForAccessibility(
        vi ? `${label}. Câu chuyện đã cập nhật.` : `${label}. Story updated.`,
      );
    },
    [panelLanguage, selectionModel, vi],
  );

  const selectedBody =
    selected.kind === "body"
      ? chart.facts.find((fact) => fact.id === selected.bodyId)
      : undefined;
  const selectedHouse =
    selected.kind === "house"
      ? houses.find((house) => house.house === selected.house)
      : undefined;
  const selectedAspect =
    selected.kind === "aspect"
      ? chart.aspects.find(
          (aspect) =>
            aspect.type === selected.aspectType &&
            ((aspect.bodyA === selected.bodyA &&
              aspect.bodyB === selected.bodyB) ||
              (aspect.bodyA === selected.bodyB &&
                aspect.bodyB === selected.bodyA)),
        )
      : undefined;
  const factsInSelectedSign = chart.facts.filter(
    (fact) => fact.sign === selectedSign,
  );
  const housesInSelectedSign = houses.filter(
    (house) => house.sign === selectedSign,
  );

  const selectionLabel = getAstrologySelectionLabel(selected, panelLanguage);
  const guidePlacementLabel =
    selected.kind === "body"
      ? localizeAstrologyBody(selected.bodyId, panelLanguage)
      : selected.kind === "house"
        ? vi
          ? `Nhà ${selected.house}`
          : `House ${selected.house}`
        : undefined;
  const selectionKind = getAstrologySelectionKindLabel(
    selected.kind,
    panelLanguage,
  );
  const storyTitle =
    selected.kind === "body"
      ? `${selectionLabel} ${vi ? "trong" : "in"} ${localizeAstrologySign(
          selected.sign,
          panelLanguage,
        )}`
      : selected.kind === "sign"
        ? local(chapter.title, language)
        : selectionLabel;
  const storyLead =
    selected.kind === "body"
      ? buildAstrologyPlacementReflection(selected, selectionModel, panelLanguage)
      : selected.kind === "house"
        ? buildAstrologyPlacementReflection(selected, selectionModel, panelLanguage)
      : selected.kind === "aspect"
          ? vi
            ? `Góc ${aspectName(selected.aspectType, language)} nối ${localizeAstrologyBody(selected.bodyA, language)} và ${localizeAstrologyBody(selected.bodyB, language)}. Đây là một điểm để quan sát hai nhu cầu vận hành cùng lúc, không phải phán quyết về tính cách.`
            : `The ${aspectName(selected.aspectType, language)} connects ${localizeAstrologyBody(selected.bodyA, language)} and ${localizeAstrologyBody(selected.bodyB, language)}. Treat it as a place to notice two needs at once, not a verdict on personality.`
          : selected.kind === "sign"
            ? factsInSelectedSign.length
              ? vi
                ? `Trong bản đồ của bạn, ${factsInSelectedSign
                    .map((fact) => localizeAstrologyLabel(fact.label, language))
                    .join(", ")} nằm trong ${localizeAstrologySign(selectedSign, language)}. Hãy chạm từng điểm trên vòng để đi từ biểu tượng chung đến dữ kiện cụ thể.`
                : `In your chart, ${factsInSelectedSign
                    .map((fact) => localizeAstrologyLabel(fact.label, language))
                    .join(", ")} fall in ${localizeAstrologySign(selectedSign, language)}. Touch each point on the wheel to move from the shared symbol to a specific fact.`
              : housesInSelectedSign.length
                ? vi
                  ? `${localizeAstrologySign(selectedSign, language)} mở đầu ${housesInSelectedSign.map((house) => `Nhà ${house.house}`).join(", ")} trong bản đồ này. Câu chuyện bên dưới là một lăng kính biểu tượng để bạn đọc dữ kiện ấy.`
                  : `${localizeAstrologySign(selectedSign, language)} opens ${housesInSelectedSign.map((house) => `House ${house.house}`).join(", ")} in this chart. The story below is a symbolic lens for reading that fact.`
                : vi
                  ? "Không có thiên thể hoặc đỉnh nhà chính trong cung này. Bạn vẫn có thể khám phá câu chuyện như một phần của thư viện biểu tượng."
                  : "No major body or house cusp falls in this sign. You can still explore its story as part of the symbol library."
            : local(chapter.myth, language);

  const factBadgeLabel =
    selected.kind !== "sign"
      ? vi
        ? "Dữ kiện đã tính"
        : "Calculated fact"
      : factsInSelectedSign.length
        ? vi
          ? `${factsInSelectedSign.length} vị trí đã tính`
          : `${factsInSelectedSign.length} calculated placement${factsInSelectedSign.length > 1 ? "s" : ""}`
        : housesInSelectedSign.length
          ? vi
            ? "Có đỉnh nhà tại cung này"
            : "A house cusp begins here"
          : vi
            ? "Thư viện biểu tượng"
            : "Symbol library";

  const aiEvidence = useMemo<AstrologyAiGuideEvidence[]>(() => {
    const usedIds = new Set([...(aiAnswer?.evidenceIds ?? []), ...(aiAnswer?.sections ?? []).flatMap(item => item.evidenceFactIds)]);
    const bodyEvidence = selectionModel.bodies
      .filter((item) => ["sun", "moon", "ascendant"].includes(item.bodyId) || item.id === selected.id || usedIds.has(item.evidenceRefs[0]?.factId))
      .map((item) => {
        return {
          id: item.evidenceRefs[0]?.factId ?? item.id,
          selectionId: item.id,
          glyph: glyphByBody[item.bodyId],
          label: localizeAstrologyBody(item.bodyId, panelLanguage),
          detail: localizeAstrologySign(item.sign, panelLanguage),
          highlighted: selected.id === item.id,
        };
      });
    const extraEvidence = [...selectionModel.aspects, ...selectionModel.houses]
      .filter(item => item.id === selected.id || usedIds.has(item.evidenceRefs[0]?.factId))
      .map(item => ({ id: item.evidenceRefs[0]?.factId ?? item.id, selectionId: item.id,
        glyph: item.kind === "aspect" ? "△" : "⌂", label: getAstrologySelectionLabel(item, panelLanguage),
        highlighted: selected.id === item.id }));
    return [...bodyEvidence, ...extraEvidence];
  }, [panelLanguage, selected.id, selectionModel, aiAnswer]);

  const guidePrompts = useMemo(() => buildAstrologyGuidePrompts(selected, panelLanguage), [selected, panelLanguage]);

  const activateTab = (next: StoryTab) => {
    sheetScrollRef.current?.scrollTo({ y: 0, animated: false });
    setTab(next);
    if (next !== "guide") setAiPreviewNotice(false);
    if (levelRef.current === "peek") snapTo("focus");
  };

  const requestUnlock = (pendingQuestion?: string) => {
    if (onRequestAiUnlock) {
      onRequestAiUnlock(pendingQuestion, selected.evidenceRefs.map(item => item.factId));
      return;
    }
    setAiPreviewNotice(true);
    snapTo("full");
  };

  const progressWidth = `${((selectedIndex + 1) / 12) * 100}%` as `${number}%`;
  const chartStageTop = veryCompact ? 72 : compact ? 92 : 108;
  const chartStageHeight = Math.max(
    0,
    availableHeight - sheetHeights[level] - chartStageTop - 8,
  );
  const chartMaxSize = Math.max(
    1,
    Math.min(
      width - (narrow ? 20 : 24),
      chartStageHeight - 16,
      420,
    ),
  );

  return (
    <View
      onLayout={(event) => {
        const nextHeight = event.nativeEvent.layout.height;
        setSurfaceHeight((current) =>
          current !== null && Math.abs(current - nextHeight) < 1
            ? current
            : nextHeight,
        );
      }}
      style={styles.root}
      testID="astrology-chart-story"
    >
      <Image
        accessible={false}
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={getFeatureVisual("astrology-chart-story-stage")}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.stageScrim, { pointerEvents: "none" }]} />

      <View
        accessibilityElementsHidden={level === "full"}
        importantForAccessibility={level === "full" ? "no-hide-descendants" : "auto"}
        style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <Pressable
          accessibilityLabel={vi ? "Thu gọn hoặc trở lại" : "Collapse or go back"}
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleBack}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={28} color={colors.ivory} />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>{vi ? "BẢN ĐỒ CỦA BẠN" : "YOUR CHART"}</Text>
          <Text style={styles.headerSubtitle}>
            {vi
              ? `Cung ${selectedIndex + 1} trong 12 · ${chapterTheme}`
              : `Sign ${selectedIndex + 1} of 12 · ${chapterTheme}`}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>
        <Pressable
          accessibilityLabel={vi ? "Mở bản đồ toàn màn hình" : "Open full-screen chart"}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setImmersive(true)}
          style={({ pressed }) => [styles.headerExpandButton, pressed && styles.pressed]}
        >
          <Ionicons name="expand-outline" size={22} color={colors.ivory} />
          <Text style={styles.headerExpandLabel}>{vi ? "Mở lớn" : "Expand"}</Text>
        </Pressable>
      </View>

      <View
        accessibilityElementsHidden={level === "full"}
        importantForAccessibility={level === "full" ? "no-hide-descendants" : "auto"}
        collapsable={false}
        style={[
          styles.chartStage,
          { height: chartStageHeight, top: chartStageTop },
        ]}
        testID="astrology-chart-stage"
      >
        <View style={[styles.chartCanvas, { height: chartMaxSize, width: chartMaxSize }]}>
          <ZodiacWheel
            chart={chart}
            houses={houses}
            language={language}
            maxSize={chartMaxSize}
            mode="canvas"
            onSelect={() => {}}
            onSelectionChange={select}
            selected={selectedIndex}
            selectionId={selected.id}
          />
        </View>
      </View>

      <Animated.View
        accessibilityViewIsModal={level === "full"}
        style={[styles.sheet, { height: sheetHeight }]}
      >
        <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={getFeatureVisual("astrology-chart-story-parchment")}
            style={[StyleSheet.absoluteFill, styles.sheetTexture]}
          />
        </View>
        <View
          accessible
          accessibilityLabel={
            level === "full"
              ? vi
                ? "Thu gọn về bản đồ"
                : "Collapse toward the chart"
              : level === "focus"
                ? vi
                  ? "Mở nội dung toàn màn hình"
                  : "Open content full screen"
                : vi
                  ? "Mở nội dung"
                  : "Open content"
          }
          accessibilityRole="button"
          accessibilityState={{ expanded: level === "full" }}
          onAccessibilityTap={() =>
            snapTo(
              level === "peek" ? "focus" : level === "focus" ? "full" : "focus",
            )
          }
          style={styles.sheetHandleZone}
          {...sheetPanResponder.panHandlers}
        >
          <View style={styles.handle} />
          <Ionicons
            name={level === "full" ? "chevron-down" : "chevron-up"}
            size={18}
            color={colors.ink}
          />
        </View>

        {level === "peek" ? (
          <View style={styles.peekContent}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.peekPlacements}
            >
              {selectionModel.bodies
                .filter((item) => ["sun", "moon", "ascendant"].includes(item.bodyId))
                .map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: item.id === selected.id }}
                    key={item.id}
                    onPress={() => select(item.id, false)}
                    style={[
                      styles.peekPlacement,
                      item.id === selected.id && styles.peekPlacementActive,
                    ]}
                  >
                    <Text style={styles.peekPlacementText}>
                      {glyphByBody[item.bodyId]} {localizeAstrologyBody(item.bodyId, language)}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={vi ? `Mở câu chuyện: ${storyTitle}` : `Open story: ${storyTitle}`}
              onPress={() => snapTo("focus")}
              style={({ pressed }) => [styles.peekStory, pressed && styles.pressed]}
            >
              <View style={styles.peekStoryCopy}>
                <Text numberOfLines={1} style={styles.peekStoryTitle}>{storyTitle}</Text>
                <Text numberOfLines={1} style={styles.peekStoryHint}>
                  {selected.personalized
                    ? vi ? "Dữ kiện trong bản đồ của bạn" : "A fact from your chart"
                    : vi ? "Mở phần diễn giải" : "Open the interpretation"}
                </Text>
              </View>
              <Text style={styles.peekStoryAction}>{vi ? "MỞ  ›" : "OPEN  ›"}</Text>
            </Pressable>
          </View>
        ) : (
          <>
        <View accessibilityRole="tablist" style={styles.tabs}>
          <StoryTabButton
            active={tab === "story"}
            compact={narrow}
            label={vi ? "Câu chuyện" : "Story"}
            onPress={() => activateTab("story")}
          />
          <StoryTabButton
            active={tab === "guide"}
            compact={narrow}
            label={vi ? "Người dẫn đường" : "AI Guide"}
            onPress={() => activateTab("guide")}
          />
          <StoryTabButton
            active={tab === "data"}
            compact={narrow}
            label={vi ? "Dữ liệu" : "Data"}
            onPress={() => activateTab("data")}
          />
        </View>

        <ScrollView
          bounces={level === "full"}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          ref={sheetScrollRef}
          showsVerticalScrollIndicator={level === "full"}
          testID={`astrology-chart-${tab}-content`}
        >
          {tab === "story" ? (
            <View style={styles.storySection}>
              <Text style={styles.eyebrow}>
                {selected.personalized
                  ? vi
                    ? "ĐANG ĐỌC TỪ BẢN ĐỒ CỦA BẠN"
                    : "READING FROM YOUR CHART"
                  : vi
                    ? "MỘT BIỂU TƯỢNG ĐỂ KHÁM PHÁ"
                    : "A SYMBOL TO EXPLORE"}
              </Text>
              <Text accessibilityRole="header" style={styles.storyTitle}>
                {storyTitle}
              </Text>
              <View style={styles.factBadgeRow}>
                <View style={styles.factBadge}>
                  <Ionicons
                    name={selected.personalized ? "checkmark-circle" : "book-outline"}
                    size={16}
                    color={colors.teal}
                  />
                  <Text style={styles.factBadgeText}>
                    {factBadgeLabel}
                  </Text>
                </View>
                {selectedBody ? (
                  <Text style={styles.factMeta}>
                    {selectedBody.degree.toFixed(2)}°
                    {selectedBody.retrograde ? " ℞" : ""}
                  </Text>
                ) : null}
                {selectedAspect?.orb !== null && selectedAspect?.orb !== undefined ? (
                  <Text style={styles.factMeta}>
                    {vi ? "Độ lệch" : "Orb"} {selectedAspect.orb.toFixed(2)}°
                  </Text>
                ) : null}
              </View>
              <Text style={styles.storyBody}>{storyLead}</Text>

              <View style={styles.storySelectionCard}>
                <View style={styles.storySelectionHeader}>
                  <View style={styles.storySelectionCopy}>
                    <Text style={styles.storySelectionTitle}>
                      {vi ? "Chọn một điểm để tiếp tục" : "Choose a point to continue"}
                    </Text>
                    <Text style={styles.storySelectionHint}>
                      {vi
                        ? "Mặt Trời, Mặt Trăng và cung mọc mở ra các câu chuyện khác nhau."
                        : "Sun, Moon and Rising open different stories."}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => activateTab("data")}
                    style={({ pressed }) => [styles.storyDataLink, pressed && styles.pressed]}
                  >
                    <Text style={styles.storyDataLinkText}>
                      {vi ? "12 nhà + dữ liệu" : "12 houses + data"}
                    </Text>
                    <Ionicons name="chevron-forward" size={15} color={colors.teal} />
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storySelectionRail}
                >
                  {selectionModel.bodies
                    .filter((item) => ["sun", "moon", "ascendant"].includes(item.bodyId))
                    .map((item) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: item.id === selected.id }}
                        key={item.id}
                        onPress={() => select(item.id, false)}
                        style={({ pressed }) => [
                          styles.storySelectionPill,
                          item.id === selected.id && styles.storySelectionPillActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.storySelectionPillText,
                            item.id === selected.id && styles.storySelectionPillTextActive,
                          ]}
                        >
                          {glyphByBody[item.bodyId]} {localizeAstrologyBody(item.bodyId, language)}
                        </Text>
                      </Pressable>
                    ))}
                </ScrollView>
                {selectionModel.houses.length ? (
                  <View style={styles.storyHousesBlock}>
                    <Text style={styles.storyHousesLabel}>
                      {vi ? "12 nhà trong bản đồ" : "12 houses in your chart"}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.storySelectionRail}
                    >
                      {selectionModel.houses.map((item) => (
                        <Pressable
                          accessibilityLabel={getAstrologySelectionLabel(item, panelLanguage)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: item.id === selected.id }}
                          key={item.id}
                          onPress={() => select(item.id, false)}
                          style={({ pressed }) => [
                            styles.storySelectionPill,
                            item.id === selected.id && styles.storySelectionPillActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.storySelectionPillText,
                              item.id === selected.id && styles.storySelectionPillTextActive,
                            ]}
                          >
                            {getAstrologySelectionLabel(item, panelLanguage)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>

              {selected.kind !== "aspect" ? (
                <AstrologySignGuide
                  language={language}
                  mode="chart"
                  placementLabel={guidePlacementLabel}
                  signId={selectedSign}
                />
              ) : null}

              <View style={styles.storyDivider} />
              <Text style={styles.sectionKicker}>
                {vi ? "SỢI CHỈ THẦN THOẠI" : "THE MYTHIC THREAD"}
              </Text>
              <Text style={styles.storyBody}>{local(chapter.myth, language)}</Text>

              <Text style={styles.sectionKicker}>
                {vi ? "GÓC ĐỌC CỦA NILAZA" : "NILAZA'S LENS"}
              </Text>
              <Text style={styles.storyBody}>{local(depth.lens, language)}</Text>

              <View style={styles.reflectionCard}>
                <Ionicons name="sparkles-outline" size={20} color={colors.gold} />
                <Text style={styles.reflectionQuestion}>
                  {local(chapter.question, language)}
                </Text>
                {onReflection ? (
                  <SheetAction
                    icon="create-outline"
                    label={vi ? "Viết điều tôi nhận ra" : "Write what I notice"}
                    onPress={() =>
                      onReflection(
                        local(chapter.title, language),
                        local(chapter.question, language),
                      )
                    }
                  />
                ) : null}
              </View>

              <Text style={styles.sectionKicker}>
                {vi ? "MỘT THỬ NGHIỆM NHỎ" : "A SMALL PRACTICE"}
              </Text>
              <Text style={styles.storyBody}>{local(depth.practice, language)}</Text>
              <Text style={styles.sourceNote}>
                {vi
                  ? `Nguồn cổ: Hyginus, Astronomica ${depth.section}. Nilaza kể lại và bình luận bằng lời riêng; không phải bản dịch nguyên văn.`
                  : `Ancient source: Hyginus, Astronomica ${depth.section}. Retold and interpreted in Nilaza's own words; not a literal translation.`}
              </Text>
            </View>
          ) : null}

          {tab === "guide" ? (
            <View>
              {aiPreviewNotice || ownerPremiumPreview ? (
                <View accessibilityLiveRegion="polite" style={styles.previewNotice}>
                  <Ionicons name="construct-outline" size={20} color={colors.teal} />
                  <Text style={styles.previewNoticeText}>
                    {ownerPremiumPreview
                      ? vi
                        ? "Bản xem thử Owner: bạn có thể kiểm tra giao diện Premium, nhưng câu hỏi chưa được gửi tới AI; không có giao dịch hay lượt dùng nào phát sinh."
                        : "Owner preview: you can inspect the Premium UI, but questions are not sent to AI and no payment or usage is recorded."
                      : vi
                        ? "Đây là bản xem trước tính năng. Không có thanh toán hay trừ lượt; câu hỏi chưa được gửi tới AI. Quyền sẽ được kiểm tra ở máy chủ trước khi AI hoạt động."
                        : "This feature is in preview. No payment or usage is recorded; questions are not sent to AI. The server will verify access before AI is enabled."}
                  </Text>
                </View>
              ) : null}
              <AstrologyAiGuidePanel
                evidence={aiEvidence}
                answer={aiAnswer}
                errorMessage={aiErrorMessage}
                language={panelLanguage}
                onCollapse={() => snapTo("peek")}
                onContinueFree={() => {
                  activateTab("story");
                  setAiPreviewNotice(false);
                  snapTo("focus");
                }}
                onEvidencePress={(evidence) =>
                  select(
                    evidence.selectionId ??
                      findAstrologyChartSelectionByFactId(
                        selectionModel,
                        evidence.id,
                      )?.id,
                  )
                }
                onQuestionChange={setQuestion}
                onRetry={onRetryAiQuestion}
                answerSaved={aiAnswerSaved}
                answerSaving={saving}
                onSaveAnswer={onSaveAiAnswer}
                onReportAnswer={onReportAiAnswer}
                onRequestUnlock={requestUnlock}
                onSubmitQuestion={onSubmitAiQuestion ? question => onSubmitAiQuestion(question, selected.evidenceRefs.map(item => item.factId)) : requestUnlock}
                examplePrompts={guidePrompts}
                premiumNote={
                  onRequestAiUnlock
                    ? undefined
                    : vi
                      ? "Premium đang được hoàn thiện · chưa có giao dịch"
                      : "Premium is in development · no transaction occurs"
                }
                question={question}
                showHandle={false}
                status={aiStatus}
                testID="astrology-ai-guide"
                trustLine={
                  accuracyReviewPending
                    ? vi
                      ? "Dữ kiện đã tính · AI không tự tạo · chưa chứng nhận độc lập"
                      : "Calculated facts · AI does not invent · independent review pending"
                    : undefined
                }
                unlockLabel={
                  onRequestAiUnlock
                    ? undefined
                    : vi
                      ? "Xem trạng thái phát triển AI"
                      : "View AI development status"
                }
              />
            </View>
          ) : null}

          {tab === "data" ? (
            <View style={styles.storySection}>
              <Text style={styles.eyebrow}>
                {selected.personalized
                  ? vi ? "DỮ LIỆU TRONG BẢN ĐỒ NÀY" : "DATA IN THIS CHART"
                  : vi ? "THƯ VIỆN BIỂU TƯỢNG · KHÔNG PHẢI VỊ TRÍ CÁ NHÂN" : "SYMBOL LIBRARY · NOT A PERSONAL PLACEMENT"}
              </Text>
              <Text style={styles.dataScope}>
                {selected.personalized
                  ? vi
                    ? "Các vị trí, nhà và góc hợp bên dưới được tính từ thông tin sinh của bản đồ đang mở."
                    : "Placements, houses and aspects below were calculated for the birth details of the chart currently open."
                  : vi
                    ? "Cung hoàng đạo là chủ đề đang khám phá; nội dung này không khẳng định một vị trí trong bản đồ của bạn."
                    : "This zodiac sign is a topic you are exploring; it does not claim a placement in your personal chart."}
              </Text>
              <Text accessibilityRole="header" style={styles.storyTitle}>
                {selectionLabel}
              </Text>
              <Text style={styles.storyBody}>
                {selectedBody
                  ? `${localizeAstrologyLabel(selectedBody.label, language)} · ${localizeAstrologySign(selectedBody.sign, language)} · ${selectedBody.degree.toFixed(2)}°${selectedBody.retrograde ? " ℞" : ""}`
                  : selectedHouse
                    ? `${vi ? "Nhà" : "House"} ${selectedHouse.house} · ${localizeAstrologySign(selectedSign, language)} · ${selectedHouse.longitude.toFixed(2)}°`
                    : selectedAspect
                      ? `${localizeAstrologyBody(selectedAspect.bodyA, language)} · ${aspectName(selectedAspect.type, language)} · ${localizeAstrologyBody(selectedAspect.bodyB, language)} · ${vi ? "độ lệch" : "orb"} ${selectedAspect.orb?.toFixed(2) ?? "—"}°`
                      : vi
                        ? "Cung đang chọn thuộc thư viện biểu tượng. Chỉ các điểm được tính mới được gắn nhãn dữ kiện cá nhân."
                        : "The selected sign belongs to the symbol library. Only calculated points are marked as personal facts."}
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.factRail}
              >
                {selectionModel.bodies.map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: item.id === selected.id }}
                    key={item.id}
                    onPress={() => select(item.id)}
                    style={[
                      styles.factPill,
                      item.id === selected.id && styles.factPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.factPillText,
                        item.id === selected.id && styles.factPillTextActive,
                      ]}
                    >
                      {glyphByBody[item.bodyId]} {localizeAstrologyBody(item.bodyId, language)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {selectionModel.houses.length ? (
                <>
                  <Text style={styles.sectionKicker}>
                    {vi ? "NHÀ TRONG BẢN ĐỒ" : "CHART HOUSES"}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.factRail}
                  >
                    {selectionModel.houses.map((item) => (
                      <Pressable
                        accessibilityLabel={getAstrologySelectionLabel(item, panelLanguage)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: item.id === selected.id }}
                        key={item.id}
                        onPress={() => select(item.id)}
                        style={[
                          styles.factPill,
                          item.id === selected.id && styles.factPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.factPillText,
                            item.id === selected.id && styles.factPillTextActive,
                          ]}
                        >
                          {getAstrologySelectionLabel(item, panelLanguage)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              {selectionModel.aspects.length ? (
                <>
                  <Text style={styles.sectionKicker}>
                    {vi ? "GÓC HỢP ĐÃ TÍNH" : "CALCULATED ASPECTS"}
                  </Text>
                  <View
                    accessibilityLabel={
                      vi
                        ? "Chú giải đường nối: màu và kiểu nét phân biệt từng loại góc hợp. Đường sáng được chọn hoặc nối trực tiếp với điểm đang chọn; đường mờ là các góc hợp khác."
                        : "Aspect legend: color and line pattern distinguish each aspect. Bright lines are selected or directly connected to the selected point; dim lines are other aspects."
                    }
                    style={styles.aspectLegend}
                  >
                    <Text style={styles.aspectLegendNote}>
                      {vi
                        ? "Màu và kiểu nét phân biệt loại góc hợp. Đường sáng đang chọn hoặc nối trực tiếp với điểm đang chọn."
                        : "Color and line pattern distinguish aspect types. Bright lines are selected or directly connected to the selected point."}
                    </Text>
                    <View style={styles.aspectLegendItems}>
                      {[
                        "conjunction",
                        "sextile",
                        "square",
                        "trine",
                        "opposition",
                      ].map((type) => {
                        const lineStyle = getAstrologyAspectLineStyle(type);
                        return (
                          <View key={type} style={styles.aspectLegendItem}>
                            <Svg width={32} height={12} accessible={false}>
                              <SvgLine
                                x1="1"
                                y1="6"
                                x2="31"
                                y2="6"
                                stroke={lineStyle.color}
                                strokeDasharray={lineStyle.dashArray}
                                strokeLinecap="round"
                                strokeWidth="2"
                              />
                            </Svg>
                            <Text style={styles.aspectLegendLabel}>
                              {aspectName(type, language)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.factRail}
                  >
                    {selectionModel.aspects.map((item) => (
                      <Pressable
                        accessibilityLabel={getAstrologySelectionLabel(item, panelLanguage)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: item.id === selected.id }}
                        key={item.id}
                        onPress={() => select(item.id)}
                        style={[
                          styles.factPill,
                          item.id === selected.id && styles.factPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.factPillText,
                            item.id === selected.id && styles.factPillTextActive,
                          ]}
                        >
                          {getAstrologySelectionLabel(item, panelLanguage)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <View style={styles.methodCard}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.teal} />
                <View style={styles.methodCopy}>
                  <Text style={styles.methodTitle}>
                    {vi ? "Trạng thái kiểm chứng" : "Verification status"}
                  </Text>
                  <Text style={styles.methodBody}>
                    {vi
                      ? "Bộ tính local đã qua kiểm tra tham chiếu có phạm vi; bản đồ cụ thể này chưa được một bên độc lập chứng nhận. Tranh và câu chuyện hỗ trợ khám phá; AI diễn giải các vị trí đã tính chứ không tính lại bản đồ."
                      : "The local calculator passed a bounded reference suite; this individual chart is not independently certified. Artwork and stories support exploration; AI interprets calculated placements without recalculating the chart."}
                  </Text>
                </View>
              </View>

              <View style={styles.methodCard}>
                <Ionicons name="lock-closed-outline" size={22} color={colors.teal} />
                <View style={styles.methodCopy}>
                  <Text style={styles.methodTitle}>
                    {vi ? "Ranh giới riêng tư của AI" : "AI privacy boundary"}
                  </Text>
                <Text style={styles.methodBody}>
                    {vi
                      ? "Mỗi lượt AI Chiêm tinh cần bạn đồng ý riêng. Ứng dụng gửi một tập hợp giới hạn các dữ kiện chiêm tinh liên quan do Nilaza chọn cùng câu hỏi hiện tại tới nhà cung cấp AI. Ngày, giờ, nơi sinh, tọa độ, múi giờ, Nhật ký và lịch sử trò chuyện không được gửi tới mô hình; câu hỏi không được lưu trong report hoặc usage log."
                      : "Astrology AI requires separate consent for each turn. The app sends a limited set of relevant chart facts selected by Nilaza with your current question to the AI provider. Birth date, time, place, coordinates, timezone, Journal, and chat history are excluded from the model request; the question is not stored in the report or usage log."}
                </Text>
                </View>
              </View>

              {onSaveChart ? (
                <SheetAction
                  disabled={saved || saving}
                  icon={
                    saved
                      ? "checkmark-circle"
                      : saving
                        ? "sync-outline"
                        : "bookmark-outline"
                  }
                  label={
                    saved
                      ? vi
                        ? "Bản đồ đã được lưu"
                        : "Chart saved"
                      : saving
                        ? vi
                          ? "Đang lưu bản đồ…"
                          : "Saving chart…"
                        : vi
                          ? "Lưu bản đồ trên thiết bị"
                          : "Save chart on device"
                  }
                  onPress={onSaveChart}
                  primary={!saved && !saving}
                />
              ) : null}
              {onOpenDetails ? (
                <SheetAction
                  icon="information-circle-outline"
                  label={vi ? "Xem cách tính và độ tin cậy" : "View calculation and accuracy"}
                  onPress={onOpenDetails}
                />
              ) : null}
              <Text style={styles.sourceNote}>
                {vi
                  ? "Chiêm tinh trong Nilaza phục vụ giải trí và tự phản chiếu; không phải dự đoán hay căn cứ cho quyết định y tế, pháp lý hoặc tài chính."
                  : "Astrology in Nilaza is for entertainment and self-reflection, not prediction or a basis for medical, legal, or financial decisions."}
              </Text>
            </View>
          ) : null}
        </ScrollView>
          </>
        )}
      </Animated.View>
      <Modal
        animationType={reducedMotion ? "none" : "fade"}
        onRequestClose={() => setImmersive(false)}
        statusBarTranslucent
        transparent={false}
        visible={immersive}
      >
        <View
          style={[
            styles.immersiveRoot,
            { paddingTop: immersiveTopInset, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.immersiveHeader}>
            <Pressable
              accessibilityLabel={vi ? "Đóng bản đồ toàn màn hình" : "Close full-screen chart"}
              accessibilityRole="button"
              onPress={() => setImmersive(false)}
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={28} color={colors.ivory} />
            </Pressable>
            <View style={styles.immersiveTitleBlock}>
              <Text numberOfLines={1} style={styles.immersiveTitle}>{storyTitle}</Text>
              <Text numberOfLines={1} style={styles.immersiveSubtitle}>
                {selected.personalized
                  ? vi ? "Bản đồ cá nhân · chạm để chọn" : "Personal chart · tap to explore"
                  : vi ? "Thư viện biểu tượng" : "Symbol library"}
              </Text>
            </View>
            <View style={styles.headerButton} />
          </View>
          <ZodiacWheel
            chart={chart}
            houses={houses}
            language={language}
            mode="immersive"
            onSelect={() => {}}
            onSelectionChange={(next) => select(next, false)}
            selected={selectedIndex}
            selectionId={selected.id}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.charcoal,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  stageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 15, 16, 0.28)",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 12,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 4,
  },
  headerButton: {
    alignItems: "center",
    height: layout.minimumTouchTarget,
    justifyContent: "center",
    width: layout.minimumTouchTarget,
  },
  headerExpandButton: {
    alignItems: "center",
    backgroundColor: "rgba(14, 90, 90, 0.72)",
    borderColor: "rgba(201, 164, 92, 0.72)",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    height: layout.minimumTouchTarget,
    justifyContent: "center",
    minWidth: 80,
    paddingHorizontal: 8,
  },
  headerExpandLabel: {
    color: colors.ivory,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 11,
  },
  headerTitleBlock: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    paddingTop: 1,
  },
  headerTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 19,
    letterSpacing: 1.4,
    lineHeight: 26,
    textAlign: "center",
  },
  headerSubtitle: {
    color: "rgba(247, 241, 230, 0.82)",
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  progressTrack: {
    backgroundColor: "rgba(247, 241, 230, 0.22)",
    borderRadius: 3,
    height: 4,
    marginTop: 5,
    overflow: "hidden",
    width: 154,
  },
  progressFill: {
    backgroundColor: colors.gold,
    borderRadius: 3,
    height: 4,
  },
  chartStage: {
    alignItems: "center",
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  chartCanvas: { flexShrink: 0 },
  sheet: {
    backgroundColor: colors.ivory,
    borderColor: "rgba(201, 164, 92, 0.55)",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    elevation: 18,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    zIndex: 5,
  },
  sheetTexture: { opacity: 0.42 },
  sheetHandleZone: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  peekContent: {
    flex: 1,
    gap: 4,
    paddingBottom: 8,
    paddingHorizontal: spacing.screen,
  },
  peekPlacements: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  peekPlacement: {
    alignItems: "center",
    backgroundColor: "rgba(14, 90, 90, 0.08)",
    borderColor: "rgba(14, 90, 90, 0.18)",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12,
  },
  peekPlacementActive: {
    backgroundColor: "rgba(14, 90, 90, 0.16)",
    borderColor: colors.teal,
  },
  peekPlacementText: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 12,
  },
  peekStory: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 0,
  },
  peekStoryCopy: { flex: 1, gap: 2 },
  peekStoryTitle: {
    color: colors.charcoal,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 17,
  },
  peekStoryHint: {
    color: "#746A61",
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
  },
  peekStoryAction: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  handle: {
    backgroundColor: "rgba(42, 37, 37, 0.25)",
    borderRadius: 4,
    height: 5,
    width: 52,
  },
  tabs: {
    borderBottomColor: "rgba(42, 37, 37, 0.14)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginHorizontal: 14,
    minHeight: 48,
  },
  tab: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: 2,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 4,
  },
  tabCompact: { paddingHorizontal: 0 },
  tabActive: { borderBottomColor: colors.teal },
  tabText: {
    color: "#514B47",
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 15,
  },
  tabTextCompact: { fontSize: 13 },
  tabTextActive: {
    color: colors.teal,
    fontFamily: typography.headlineFontFamily,
  },
  dataScope: {
    backgroundColor: "rgba(14, 90, 90, 0.08)",
    borderLeftColor: colors.teal,
    borderLeftWidth: 3,
    color: colors.ink,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  immersiveRoot: {
    backgroundColor: "#0B1718",
    flex: 1,
  },
  immersiveHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 12,
  },
  immersiveTitleBlock: { alignItems: "center", flex: 1, gap: 2 },
  immersiveTitle: {
    color: colors.ivory,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 20,
    textAlign: "center",
  },
  immersiveSubtitle: {
    color: "rgba(247, 241, 230, 0.74)",
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
  },
  sheetContent: { paddingBottom: 54 },
  storySection: {
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    color: "#8A6A36",
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 11,
    letterSpacing: 1.9,
    lineHeight: 17,
  },
  storyTitle: {
    color: colors.charcoal,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 38,
    lineHeight: 43,
  },
  storyBody: {
    color: colors.ink,
    fontFamily: typography.bodyFontFamily,
    fontSize: 16,
    lineHeight: 26,
  },
  storySelectionCard: {
    backgroundColor: "rgba(14, 90, 90, 0.06)",
    borderColor: "rgba(14, 90, 90, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  storySelectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  storySelectionCopy: { flex: 1, gap: 3 },
  storySelectionTitle: {
    color: colors.ink,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 14,
  },
  storySelectionHint: {
    color: "#625B55",
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  storyDataLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 1,
    minHeight: 32,
    paddingLeft: 6,
  },
  storyDataLinkText: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 12,
  },
  storySelectionRail: { gap: 8 },
  storyHousesBlock: { gap: 6 },
  storyHousesLabel: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 12,
  },
  storySelectionPill: {
    backgroundColor: colors.ivory,
    borderColor: "rgba(14, 90, 90, 0.24)",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  storySelectionPillActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  storySelectionPillText: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 12,
  },
  storySelectionPillTextActive: { color: colors.ivory },
  factBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  factBadge: {
    alignItems: "center",
    backgroundColor: "rgba(14, 90, 90, 0.08)",
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  factBadgeText: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 13,
  },
  factMeta: {
    color: "#746A61",
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
  },
  storyDivider: {
    backgroundColor: "rgba(42, 37, 37, 0.14)",
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  sectionKicker: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 11,
    letterSpacing: 1.6,
    lineHeight: 17,
    marginTop: 6,
  },
  aspectLegend: {
    backgroundColor: "rgba(14, 90, 90, 0.06)",
    borderColor: "rgba(14, 90, 90, 0.16)",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  aspectLegendNote: {
    color: colors.ink,
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  aspectLegendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    rowGap: 8,
  },
  aspectLegendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    minHeight: 24,
  },
  aspectLegendLabel: {
    color: colors.ink,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 12,
  },
  reflectionCard: {
    backgroundColor: "rgba(14, 90, 90, 0.07)",
    borderColor: "rgba(14, 90, 90, 0.2)",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  reflectionQuestion: {
    color: colors.charcoal,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 24,
    lineHeight: 30,
  },
  sourceNote: {
    color: "#746E69",
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 19,
  },
  previewNotice: {
    alignItems: "flex-start",
    backgroundColor: "rgba(14, 90, 90, 0.08)",
    borderBottomColor: "rgba(14, 90, 90, 0.18)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
  },
  previewNoticeText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  factRail: { gap: 8, paddingVertical: 4 },
  factPill: {
    alignItems: "center",
    borderColor: "rgba(42, 37, 37, 0.22)",
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: layout.minimumTouchTarget,
    paddingHorizontal: 14,
  },
  factPillActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  factPillText: {
    color: colors.ink,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 13,
  },
  factPillTextActive: { color: colors.ivory },
  methodCard: {
    alignItems: "flex-start",
    backgroundColor: "rgba(247, 241, 230, 0.62)",
    borderColor: "rgba(201, 164, 92, 0.38)",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  methodCopy: { flex: 1, gap: 5 },
  methodTitle: {
    color: colors.charcoal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 15,
  },
  methodBody: {
    color: colors.ink,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  sheetAction: {
    alignItems: "center",
    borderColor: colors.teal,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16,
  },
  sheetActionPrimary: { backgroundColor: colors.teal },
  sheetActionText: {
    color: colors.teal,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 15,
    textAlign: "center",
  },
  sheetActionTextPrimary: { color: colors.ivory },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.48 },
});
