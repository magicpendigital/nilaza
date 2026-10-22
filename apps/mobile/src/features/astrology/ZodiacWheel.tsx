import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Modal,
} from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import chaptersData from "../../../../../packages/content/data/astrology-mythology-chapters.json";
import fixtureData from "../../../../../packages/content/data/astrology-chart-fixtures.json";
import { colors, typography } from "../../theme";
import { getFeatureVisual } from "../../visualAssets";
import {
  AstrologyLanguage,
  AstrologyChartPresentation,
  toAstrologyChartPresentation,
} from "./contracts";
import {
  stableAstrologyAspectFactId,
  type AstrologyAspectType,
  type AstrologyBodyId,
} from "./chartSelection";
import {
  getAstrologyAspectEmphasis,
  getAstrologyAspectLineMetrics,
  getAstrologyAspectLineStyle,
  resolveFocusedBodies,
} from "./chartVisuals";

import { layoutWheelLabels } from "./wheelLayout";
import { zodiacGlyphPaths } from "./zodiacGlyphs";

import {
  AstrologyGlossary,
  aspectName,
  bodyMeaning,
  houseMeaning,
} from "./AstrologyGlossary";
const chapters = chaptersData.chapters;
const point = (degree: number, radius: number) => ({
  x: 200 + radius * Math.cos(((degree - 90) * Math.PI) / 180),
  y: 200 + radius * Math.sin(((degree - 90) * Math.PI) / 180),
});
const svgPress = (
  handler: () => void,
): { onClick?: () => void; onPress?: () => void } =>
  Platform.OS === "web" ? { onClick: handler } : { onPress: handler };
const bodyGlyphs: Record<string, string> = {
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
  ascendant: "AC",
  midheaven: "MC",
};
const local = (
  value: { vi?: string; en?: string },
  language: AstrologyLanguage,
) => (language === "vi" ? value.vi : value.en) ?? value.en ?? "";

export function MythologyEntry({
  language,
  onOpen,
  compact = false,
}: {
  language: AstrologyLanguage;
  onOpen: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={
        language === "vi"
          ? "Khám phá thế giới thần thoại"
          : "Explore the mythology world"
      }
      style={[s.entry, compact && s.entryCompact]}
    >
      <Image
        source={getFeatureVisual("astrology-sanctuary")}
        style={[s.entryArt, compact && s.entryArtCompact]}
        resizeMode="contain"
        accessibilityLabel={
          language === "vi"
            ? "Toàn cảnh cổng đá và biển dưới trăng"
            : "Full view of a stone portal and moonlit sea"
        }
      />
      <View style={[s.entryCaption, compact && s.entryCaptionCompact]}>
        <Text style={[s.kicker, compact && s.entryKickerCompact]}>
          {language === "vi"
            ? "THƯ VIỆN BIỂU TƯỢNG · 12 CUNG"
            : "SYMBOL LIBRARY · 12 SIGNS"}
        </Text>
        <Text style={[s.entryTitle, compact && s.entryTitleCompact]}>
          {language === "vi" ? "Thế giới thần thoại" : "A world of myth"}
        </Text>
        <Text style={[s.entryLink, compact && s.entryLinkCompact]}>
          {language === "vi"
            ? "Bước qua cánh cửa  ↗"
            : "Step through the doorway  ↗"}
        </Text>
      </View>
    </Pressable>
  );
}

/** Symbol atlas by default. Planets are supplied only by a caller with an explicitly labelled chart. */
export function ZodiacWheel({
  language,
  selected,
  onSelect,
  chart,
  houses = [],
  children,
  contentScrollRef,
  mode = "explorer",
  selectionId,
  onSelectionChange,
  maxSize,
}: {
  language: AstrologyLanguage;
  selected: number;
  onSelect: (index: number) => void;
  chart?: AstrologyChartPresentation;
  houses?: { house: number; longitude: number; sign: string }[];
  children?: React.ReactNode;
  contentScrollRef?: React.RefObject<ScrollView | null>;
  mode?: "explorer" | "canvas" | "immersive";
  selectionId?: string | null;
  onSelectionChange?: (selectionId: string | null) => void;
  maxSize?: number;
}) {
  const windowSize = useWindowDimensions();
  const canvasMode = mode === "canvas" || mode === "immersive";
  const wheelSize = Math.min(
    windowSize.width - (mode === "immersive" ? 12 : 32),
    windowSize.height *
      (mode === "immersive" ? 0.62 : mode === "canvas" ? 0.43 : 0.35),
    mode === "immersive" ? 620 : mode === "canvas" ? 420 : 380,
    maxSize ?? Number.POSITIVE_INFINITY,
  );
  const [category, setCategory] = useState<"bodies" | "aspects" | "houses">(
    "bodies",
  );
  const [help, setHelp] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [internalFocus, setInternalFocus] = useState<string | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(360);
  const [measuredHeight, setMeasuredHeight] = useState(360);
  const drag = useRef({ x: 0, y: 0 });
  const pinch = useRef({ distance: 0, zoom: 1 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;
  const widthRef = useRef(measuredWidth);
  widthRef.current = measuredWidth;
  const heightRef = useRef(measuredHeight);
  heightRef.current = measuredHeight;
  const wheelSizeRef = useRef(wheelSize);
  wheelSizeRef.current = wheelSize;
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (event, g) =>
        event.nativeEvent.touches.length > 1 ||
        (zoomRef.current > 1 && (Math.abs(g.dx) > 7 || Math.abs(g.dy) > 7)),
      onPanResponderGrant: (event) => {
        drag.current = panRef.current;
        const [a, b] = event.nativeEvent.touches;
        pinch.current = {
          distance:
            a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0,
          zoom: zoomRef.current,
        };
      },
      onPanResponderMove: (event, g) => {
        const [a, b] = event.nativeEvent.touches;
        if (a && b) {
          const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          if (!pinch.current.distance)
            pinch.current = { distance, zoom: zoomRef.current };
          setZoom(
            Math.max(
              1,
              Math.min(
                2.5,
                (pinch.current.zoom * distance) / pinch.current.distance,
              ),
            ),
          );
          setPan({ x: 0, y: 0 });
          return;
        }
        if (canvasMode) {
          const renderedSize = wheelSizeRef.current * zoomRef.current;
          const boundX = Math.max(0, (renderedSize - widthRef.current) / 2);
          const boundY = Math.max(0, (renderedSize - heightRef.current) / 2);
          setPan({
            x: Math.max(-boundX, Math.min(boundX, drag.current.x + g.dx)),
            y: Math.max(-boundY, Math.min(boundY, drag.current.y + g.dy)),
          });
          return;
        }
        const bound = 200 * (zoomRef.current - 1);
        const ratio = 400 / Math.max(1, widthRef.current);
        setPan({
          x: Math.max(-bound, Math.min(bound, drag.current.x + g.dx * ratio)),
          y: Math.max(-bound, Math.min(bound, drag.current.y + g.dy * ratio)),
        });
      },
    }),
  ).current;
  const vi = language === "vi";
  const focus = selectionId === undefined ? internalFocus : selectionId;
  const setFocus = (next: string | null) => {
    if (selectionId === undefined) setInternalFocus(next);
    onSelectionChange?.(next);
  };
  const labelAngles = layoutWheelLabels(chart?.facts ?? []);
  const selectedFact = chart?.facts.find(
    (f) => f.id === focus || `body:${f.id}` === focus,
  );
  const aspectSelectionId = (aspect: NonNullable<typeof chart>["aspects"][number]) =>
    stableAstrologyAspectFactId(
      aspect.bodyA as AstrologyBodyId,
      aspect.type as AstrologyAspectType,
      aspect.bodyB as AstrologyBodyId,
    );
  const selectedAspect = chart?.aspects.find(
    (a) => a.id === focus || aspectSelectionId(a) === focus,
  );
  const focusedBodies = resolveFocusedBodies(
    focus,
    chart?.facts ?? [],
    selectedAspect,
  );
  const changeZoom = (value: number) => {
    setZoom(Math.max(1, Math.min(2.5, value)));
    setPan({ x: 0, y: 0 });
  };
  const renderedSize = wheelSize * (canvasMode ? zoom : 1);
  const svgLeft = (measuredWidth - renderedSize) / 2 + (canvasMode ? pan.x : 0);
  const svgTop = (measuredHeight - renderedSize) / 2 + (canvasMode ? pan.y : 0);
  const canvasStyle = canvasMode
    ? {
        width: "100%" as const,
        height: "100%" as const,
        alignSelf: "stretch" as const,
        overflow: "hidden" as const,
        borderRadius: 0,
      }
    : {
        width: wheelSize,
        height: wheelSize,
        alignSelf: "center" as const,
        flexShrink: 0,
      };
  return (
    <View style={canvasMode ? s.canvasRoot : { flex: 1, minHeight: 0 }}>
      <View
        onLayout={(e) => {
          setMeasuredWidth(e.nativeEvent.layout.width);
          setMeasuredHeight(e.nativeEvent.layout.height);
        }}
        style={canvasMode ? s.canvasViewport : [s.wheelClip, canvasStyle]}
        {...responder.panHandlers}
      >
        <Svg
          width={canvasMode ? renderedSize : "100%"}
          height={canvasMode ? renderedSize : "100%"}
          style={
            canvasMode
              ? {
                  position: "absolute",
                  left: svgLeft,
                  top: svgTop,
                }
              : undefined
          }
          viewBox="0 0 400 400"
          accessibilityLabel={
            vi
              ? "Vòng 12 cung; chạm trực tiếp một biểu tượng để chọn"
              : "Twelve-sign wheel; touch a symbol to select"
          }
        >
          <G
            transform={
              canvasMode
                ? undefined
                : `translate(${200 + pan.x} ${200 + pan.y}) scale(${zoom}) translate(-200 -200)`
            }
          >
            <Circle
              cx="200"
              cy="200"
              r="192"
              stroke={colors.gold}
              strokeOpacity="0.45"
              fill="#102222"
              strokeWidth="0.6"
            />
            <Circle
              cx="200"
              cy="200"
              r="182"
              stroke={colors.gold}
              strokeOpacity="0.35"
              fill="none"
              strokeWidth="0.6"
            />
            <Circle
              cx="200"
              cy="200"
              r="139"
              stroke={colors.gold}
              strokeOpacity="0.55"
              fill="#101B1C"
              strokeWidth="0.7"
            />
            <Circle
              cx="200"
              cy="200"
              r="102"
              stroke={colors.gold}
              strokeOpacity="0.15"
              fill="none"
              strokeWidth="0.6"
            />
            {Array.from({ length: 72 }, (_, i) => {
              const a = point(i * 5, i % 6 === 0 ? 183 : 187),
                b = point(i * 5, 191);
              return (
                <Line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={colors.gold}
                  strokeOpacity="0.5"
                  strokeWidth="0.7"
                />
              );
            })}
            {chapters.map((chapter, i) => {
              const a = point(i * 30, 139),
                b = point(i * 30, 182),
                end = point((i + 1) * 30, 182),
                innerEnd = point((i + 1) * 30, 139),
                glyph = point(i * 30 + 15, 160);
              return (
                <G
                  key={chapter.id}
                  testID={`zodiac-segment-${chapter.id}`}
                  {...svgPress(() => {
                    setFocus(`sign:${chapter.id}`);
                    onSelect(i);
                  })}
                >
                  <Path
                    d={`M ${a.x} ${a.y} L ${b.x} ${b.y} A 182 182 0 0 1 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A 139 139 0 0 0 ${a.x} ${a.y}`}
                    fill={selected === i ? "#39534C" : "transparent"}
                  />
                  <Line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={colors.gold}
                    strokeOpacity="0.45"
                    strokeWidth="0.6"
                  />
                  <Path
                    d={zodiacGlyphPaths[i]}
                    transform={`translate(${glyph.x - 10} ${glyph.y - 10}) scale(0.84)`}
                    fill="none"
                    stroke={selected === i ? colors.ivory : colors.gold}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </G>
              );
            })}
            {houses.map((h) => {
              const a = point(h.longitude, 58),
                b = point(h.longitude, 99),
                label = point(h.longitude + 15, 78);
              return (
                <G
                  key={`house-${h.house}`}
                  {...svgPress(() => {
                    setFocus(`house:${h.house}`);
                    setCategory("houses");
                  })}
                >
                  <Line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={colors.gold}
                    strokeOpacity="0.3"
                  />
                  <Circle
                    cx={label.x}
                    cy={label.y}
                    r="12"
                    fill={
                      focus === `house:${h.house}` ? colors.teal : "#102222"
                    }
                  />
                  <SvgText
                    x={label.x}
                    y={label.y + 4}
                    fontSize="10"
                    fill={colors.ivory}
                    textAnchor="middle"
                  >
                    {h.house}
                  </SvgText>
                </G>
              );
            })}
            {chart?.aspects.map((aspect) => {
              const a = chart.facts.find((f) => f.id === aspect.bodyA),
                b = chart.facts.find((f) => f.id === aspect.bodyB);
              if (!a || !b) return null;
              const p = point(a.longitude, 126),
                q = point(b.longitude, 126);
              const aspectId = aspectSelectionId(aspect);
              const emphasis = getAstrologyAspectEmphasis(
                aspect,
                focus,
                selectedFact?.id,
                focus === aspect.id || focus === aspectId,
              );
              const lineMetrics = getAstrologyAspectLineMetrics(emphasis);
              const lineStyle = getAstrologyAspectLineStyle(aspect.type);
              return (
                <G
                  key={aspect.id}
                  {...svgPress(() => {
                    setFocus(aspectSelectionId(aspect));
                    setCategory("aspects");
                  })}
                >
                  <Line
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    stroke="transparent"
                    strokeWidth="16"
                  />
                  <Line
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    stroke={lineStyle.color}
                    strokeDasharray={lineStyle.dashArray}
                    strokeLinecap="round"
                    strokeWidth={lineMetrics.width}
                    strokeOpacity={lineMetrics.opacity}
                  />
                </G>
              );
            })}
            {chart?.facts.map((fact, i) => {
              const p = point(fact.longitude, 126);
              const focused = focusedBodies.includes(fact.id);
              const label = point(
                labelAngles.get(fact.id) ?? fact.longitude,
                106,
              );
              return (
                <G
                  key={fact.id}
                  {...svgPress(() => {
                    setFocus(`body:${fact.id}`);
                    setCategory("bodies");
                    onSelect(Math.floor(fact.longitude / 30));
                  })}
                >
                  <Line
                    x1={p.x}
                    y1={p.y}
                    x2={label.x}
                    y2={label.y}
                    stroke={colors.gold}
                    strokeOpacity={focused ? 0.9 : focus ? 0.18 : 0.4}
                    strokeWidth={focused ? 1.35 : 0.7}
                  />
                  {focused ? (
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r="7"
                      fill="none"
                      stroke={colors.gold}
                      strokeOpacity="0.9"
                      strokeWidth="1.4"
                    />
                  ) : null}
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={focused ? 4 : 3}
                    fill={focused ? colors.ivory : colors.gold}
                  />
                  <Circle
                    cx={label.x}
                    cy={label.y}
                    r={focused ? 15 : 12}
                    fill={
                      focused ? colors.teal : "#102222"
                    }
                    stroke={focused ? colors.gold : "#3C473F"}
                    strokeOpacity={focused ? 1 : 0.52}
                    strokeWidth={focused ? 1.6 : 0.7}
                  />
                  <SvgText
                    x={label.x}
                    y={label.y + 4}
                    fill={colors.ivory}
                    fontSize="13"
                    textAnchor="middle"
                  >
                    {bodyGlyphs[fact.id] ?? fact.id.slice(0, 2)}
                  </SvgText>
                </G>
              );
            })}
            {!chart && (
              <>
                <Circle
                  cx="200"
                  cy="200"
                  r="55"
                  stroke={colors.gold}
                  strokeOpacity="0.5"
                  strokeWidth="0.7"
                  fill="none"
                />
                <Path
                  d={zodiacGlyphPaths[selected]}
                  transform="translate(174 174) scale(2.2)"
                  fill="none"
                  stroke={colors.gold}
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
          </G>
        </Svg>
        {chapters.map((chapter, i) => {
          const p = point(i * 30 + 15, 160);
          const x = canvasMode
            ? svgLeft + (p.x * renderedSize) / 400
            : (((p.x - 200) * zoom + 200 + pan.x) * wheelSize) / 400;
          const y = canvasMode
            ? svgTop + (p.y * renderedSize) / 400
            : (((p.y - 200) * zoom + 200 + pan.y) * wheelSize) / 400;
          return (
            <Pressable
              key={chapter.id}
              testID={"sign-hit-" + chapter.id}
              accessibilityRole="button"
              accessibilityLabel={
                (vi ? "Chọn cung " : "Select sign ") +
                local(chapter.name, language)
              }
              onPress={() => {
                setFocus(`sign:${chapter.id}`);
                onSelect(i);
              }}
              style={{
                position: "absolute",
                left: x - 24,
                top: y - 24,
                width: 48,
                height: 48,
                borderRadius: 24,
              }}
            />
          );
        })}
      </View>
      {mode === "immersive" ? (
        <View pointerEvents="box-none" style={s.immersiveControls}>
          <Pressable
            accessibilityLabel={vi ? "Thu nhỏ bản đồ" : "Zoom out chart"}
            accessibilityRole="button"
            onPress={() => changeZoom(zoom - 0.25)}
            style={s.immersiveControl}
          >
            <Text style={s.immersiveControlText}>−</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={vi ? "Đặt lại bản đồ" : "Reset chart view"}
            accessibilityRole="button"
            onPress={() => changeZoom(1)}
            style={s.immersiveControl}
          >
            <Text style={s.immersiveControlText}>
              {Math.round(zoom * 100)}%
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={vi ? "Phóng to bản đồ" : "Zoom in chart"}
            accessibilityRole="button"
            onPress={() => changeZoom(zoom + 0.25)}
            style={s.immersiveControl}
          >
            <Text style={s.immersiveControlText}>+</Text>
          </Pressable>
        </View>
      ) : null}
      {canvasMode ? null : (
      <ScrollView
        ref={contentScrollRef}
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={s.controls}>
          <Control
            label="−"
            hint={vi ? "Thu nhỏ" : "Zoom out"}
            onPress={() => changeZoom(zoom - 0.5)}
          />
          <Text style={s.small}>{Math.round(zoom * 100)}%</Text>
          <Control
            label="+"
            hint={vi ? "Phóng to" : "Zoom in"}
            onPress={() => changeZoom(zoom + 0.5)}
          />
          <Control
            label={vi ? "Đặt lại" : "Reset"}
            onPress={() => {
              changeZoom(1);
              setFocus(null);
            }}
          />
        </View>

        {chart && (
          <View style={s.factList}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {(["bodies", "aspects", "houses"] as const).map((tab) => (
                <Control
                  key={tab}
                  active={category === tab}
                  label={
                    tab === "bodies"
                      ? vi
                        ? "Thiên thể"
                        : "Bodies"
                      : tab === "aspects"
                        ? vi
                          ? "Góc hợp"
                          : "Aspects"
                        : vi
                          ? "Nhà"
                          : "Houses"
                  }
                  onPress={() => {
                    setCategory(tab);
                    setFocus(null);
                  }}
                />
              ))}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
              style={{ flexGrow: 0 }}
            >
              {category === "bodies" &&
                chart.facts.map((f) => (
                  <Control
                    key={f.id}
                    active={focus === f.id || focus === `body:${f.id}`}
                    label={local(f.label, language)}
                    onPress={() => {
                      setFocus(f.id);
                      onSelect(Math.floor(f.longitude / 30));
                    }}
                  />
                ))}
              {category === "aspects" &&
                chart.aspects.map((a) => (
                  <Control
                    key={a.id}
                    active={focus === a.id || focus === aspectSelectionId(a)}
                    label={
                      (bodyGlyphs[a.bodyA] ?? a.bodyA) +
                      " · " +
                      (bodyGlyphs[a.bodyB] ?? a.bodyB) +
                      " · " +
                      aspectName(a.type, language)
                    }
                    onPress={() => setFocus(aspectSelectionId(a))}
                  />
                ))}
              {category === "houses" &&
                houses.map((h) => (
                  <Control
                    key={h.house}
                    active={focus === "house:" + h.house}
                    label={(vi ? "Nhà " : "House ") + h.house}
                    onPress={() => {
                      setFocus("house:" + h.house);
                      onSelect(Math.floor(h.longitude / 30));
                    }}
                  />
                ))}
            </ScrollView>
            <Text accessibilityLiveRegion="polite" style={s.body}>
              {selectedFact
                ? local(selectedFact.label, language) +
                  " · " +
                  local(
                    chapters[Math.floor(selectedFact.longitude / 30)].name,
                    language,
                  ) +
                  " · " +
                  selectedFact.degree.toFixed(2) +
                  "°" +
                  (selectedFact.retrograde ? " ℞" : "")
                : selectedAspect
                  ? (bodyGlyphs[selectedAspect.bodyA] ?? selectedAspect.bodyA) +
                    " ↔ " +
                    (bodyGlyphs[selectedAspect.bodyB] ?? selectedAspect.bodyB) +
                    " · " +
                    aspectName(selectedAspect.type, language) +
                    " · " +
                    (vi ? "Độ lệch " : "Orb ") +
                    selectedAspect.orb?.toFixed(2) +
                    "°"
                  : focus?.startsWith("house:")
                    ? houseMeaning(Number(focus.split(":")[1]), language)
                    : vi
                      ? "Chạm vòng hoặc vuốt hàng lựa chọn để khám phá."
                      : "Touch the wheel or swipe the choices to explore."}
            </Text>
            {category === "houses" && !houses.length && (
              <Text style={s.small}>
                {vi
                  ? "Không có nhà khi giờ sinh chưa xác định."
                  : "Houses are unavailable without a confirmed birth time."}
              </Text>
            )}
          </View>
        )}
        <Control
          label={vi ? "Cách đọc & chi tiết" : "Reading guide & details"}
          onPress={() => setHelp(true)}
        />
        {children}
      </ScrollView>
      )}
      <Modal
        visible={help}
        animationType="none"
        onRequestClose={() => setHelp(false)}
      >
        <View
          style={{ flex: 1, paddingTop: 24, backgroundColor: colors.charcoal }}
        >
          <Control
            label={vi ? "Đóng hướng dẫn" : "Close guide"}
            onPress={() => setHelp(false)}
          />
          <AstrologyGlossary
            language={language}
            id={selectedFact?.id ?? selectedAspect?.type}
          />
        </View>
      </Modal>
    </View>
  );
}

export function Control({
  label,
  hint,
  onPress,
  active = false,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ?? label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[s.control, active && s.active]}
    >
      <Text style={s.controlText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  world: { flex: 1, minHeight: 0, backgroundColor: colors.charcoal },
  worldContent: { paddingBottom: 48 },
  entry: { marginBottom: 28, borderRadius: 8, overflow: "hidden" },
  entryCompact: {
    alignItems: "center",
    backgroundColor: "rgba(16,22,23,0.86)",
    borderColor: "rgba(201,164,92,0.32)",
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 8,
    minHeight: 150,
  },
  entryArt: {
    width: "100%",
    aspectRatio: 2 / 3,
    height: "auto",
    justifyContent: "flex-end",
    backgroundColor: colors.teal,
  },
  entryArtCompact: {
    aspectRatio: undefined,
    backgroundColor: "transparent",
    height: 150,
    width: 100,
  },
  entryCaption: { padding: 22, backgroundColor: "rgba(16,22,23,0.70)" },
  entryCaptionCompact: {
    backgroundColor: "transparent",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  entryKickerCompact: { fontSize: 9, letterSpacing: 1.1 },
  entryTitle: {
    fontFamily: typography.headlineRegularFontFamily,
    color: colors.ivory,
    fontSize: 34,
    lineHeight: 42,
  },
  entryTitleCompact: { fontSize: 23, lineHeight: 29 },
  entryLink: {
    fontFamily: typography.bodyFontFamily,
    color: colors.ivory,
    marginTop: 8,
    fontSize: 15,
  },
  entryLinkCompact: { fontSize: 13, marginTop: 5 },
  hero: {
    height: 680,
    flexShrink: 0,
    justifyContent: "space-between",
    backgroundColor: colors.teal,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    gap: 8,
    flexWrap: "wrap",
  },
  heroBottom: {
    padding: 26,
    paddingTop: 20,
    backgroundColor: "rgba(10,19,20,0.72)",
  },
  title: {
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 58,
    lineHeight: 62,
    color: colors.ivory,
    marginVertical: 12,
  },
  heroLead: {
    fontFamily: typography.bodyFontFamily,
    color: colors.ivory,
    fontSize: 16,
    lineHeight: 25,
  },
  section: {
    padding: 22,
    gap: 16,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  kicker: {
    fontFamily: typography.bodyMediumFontFamily,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.6,
    lineHeight: 18,
  },
  heading: {
    fontFamily: typography.headlineRegularFontFamily,
    color: colors.ivory,
    fontSize: 32,
    lineHeight: 38,
  },
  body: {
    fontFamily: typography.bodyFontFamily,
    color: "#DCD8D0",
    fontSize: 16,
    lineHeight: 26,
  },
  small: {
    fontFamily: typography.bodyFontFamily,
    color: colors.moon,
    fontSize: 12,
    lineHeight: 19,
  },
  canvasHint: {
    alignSelf: "center",
    color: "rgba(247, 241, 230, 0.8)",
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 340,
    paddingHorizontal: 20,
    paddingTop: 8,
    textAlign: "center",
  },
  wheelClip: {
    width: "100%",
    aspectRatio: 1,
    overflow: "hidden",
    borderRadius: 8,
  },
  canvasRoot: { flex: 1, minHeight: 0, width: "100%" },
  canvasViewport: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    overflow: "hidden",
  },
  immersiveControls: {
    alignSelf: "center",
    bottom: 20,
    flexDirection: "row",
    gap: 10,
    position: "absolute",
    zIndex: 5,
  },
  immersiveControl: {
    alignItems: "center",
    backgroundColor: "rgba(21, 20, 22, 0.88)",
    borderColor: "rgba(201, 164, 92, 0.6)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    minWidth: 48,
    paddingHorizontal: 12,
  },
  immersiveControlText: {
    color: colors.ivory,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 16,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
    marginVertical: 10,
  },
  control: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201,164,92,0.27)",
    borderRadius: 8,
    backgroundColor: "#172323",
  },
  controlText: {
    fontFamily: typography.bodyFontFamily,
    color: colors.ivory,
    fontSize: 13,
    lineHeight: 20,
  },
  active: { borderColor: colors.gold, backgroundColor: "#35534D" },
  signs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chapter: {
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 18,
  },
  chapterTitle: {
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 38,
    lineHeight: 44,
    color: colors.ivory,
  },
  myth: {
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 23,
    lineHeight: 31,
    color: colors.gold,
  },
  question: {
    borderLeftWidth: 1,
    borderLeftColor: colors.gold,
    paddingLeft: 20,
    paddingVertical: 12,
    gap: 14,
  },
  questionText: {
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 27,
    lineHeight: 35,
    color: colors.ivory,
  },
  note: {
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 20,
    color: colors.moon,
  },
  factList: { gap: 12, marginVertical: 16 },
});
