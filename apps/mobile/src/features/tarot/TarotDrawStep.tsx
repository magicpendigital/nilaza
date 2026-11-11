import { useEffect, useRef, useState, type ReactNode } from "react";
import { Image, ImageSourcePropType, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { FAN_CARD_W, TarotDeckFan, type TarotDeckFanHandle } from "./TarotDeckFan";
import { TarotCardFlight, type CardFlight } from "./TarotCardFlight";

export type DrawSlot = { label: string; card?: { name: string; image: ImageSourcePropType; reversed: boolean } };

export type TarotDrawStepProps = {
  language: Language;
  question: string;
  slots: DrawSlot[];
  backImage: ImageSourcePropType;
  /** Position of the raised card in the deck (0..deckSize-1), or null when none is raised. */
  selectedFanIndex: number | null;
  onSelectFan: (index: number) => void;
  /** Spinning the deck puts a raised card back; the owner clears its selection. */
  onClearSelection?: () => void;
  onOpenCard: (index: number) => void;
  busy: boolean;
  status?: string;
  onDrawRest?: () => void;
  /** Reduced-motion preference: no spin momentum and no card flight. */
  reduceMotion?: boolean;
  /** Set false to show drawn cards without the flight (tests, quick paths). */
  animate?: boolean;
  deckSize?: number;
  /** Which card starts in the middle of the fan; random when omitted. */
  fanStart?: number;
  children?: ReactNode;
};

type Rect = { x: number; y: number; width: number; height: number };
const CARD_ASPECT = 148 / 86;

export function TarotDrawStep({ language, question, slots, backImage, selectedFanIndex, onSelectFan, onClearSelection, onOpenCard, busy, status, onDrawRest, reduceMotion = false, animate = true, deckSize = 78, fanStart, children }: TarotDrawStepProps) {
  const vi = language === "vi";
  const filled = slots.filter((slot) => slot.card).length;
  // A drawn card shows in its slot only once its flight has landed.
  const [landed, setLanded] = useState(filled);
  const [flight, setFlight] = useState<CardFlight | null>(null);
  const [taken, setTaken] = useState<number[]>([]);
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const fanRef = useRef<TarotDeckFanHandle | null>(null);
  const rowRect = useRef<Rect | null>(null);
  const fanRect = useRef<Rect | null>(null);
  const cellRects = useRef<Array<Rect | undefined>>([]);
  const lastSelected = useRef<number | null>(null);
  const skipFlights = useRef(false);

  if (selectedFanIndex !== null) lastSelected.current = selectedFanIndex;

  const shown: DrawSlot[] = slots.map((slot, index) => (index < landed ? slot : { label: slot.label }));
  const nextIndex = shown.findIndex((slot) => !slot.card);
  const done = nextIndex === -1;
  const nextLabel = done ? "" : shown[nextIndex].label;
  const remaining = shown.filter((slot) => !slot.card).length;
  const busyNow = busy || flight !== null;

  useEffect(() => {
    if (filled < landed) { setLanded(filled); return; }
    if (filled === landed || flight) return;
    const slot = slots[landed];
    const cell = cellRects.current[landed];
    const row = rowRect.current;
    const fan = fanRect.current;
    const index = lastSelected.current ?? fanRef.current?.getCenterIndex() ?? null;
    const pose = index === null ? null : fanRef.current?.getPose(index, lastSelected.current !== null) ?? null;
    const drawn = slot?.card;
    if (!(animate && !reduceMotion && !skipFlights.current && drawn && cell && row && fan && area && pose && index !== null)) {
      lastSelected.current = null;
      setLanded(filled);
      if (filled >= slots.length) skipFlights.current = false;
      return;
    }
    lastSelected.current = null;
    setTaken((current) => [...current, index]);
    setFlight({
      from: { x: fan.x + pose.x, y: fan.y + pose.y, rotate: pose.rotate },
      fromWidth: FAN_CARD_W,
      to: { x: row.x + cell.x + cell.width / 2, y: row.y + cell.y + (cell.width * CARD_ASPECT) / 2, width: cell.width },
      back: backImage,
      face: drawn.image,
      reversed: drawn.reversed,
      caption: { position: slot.label, name: drawn.name, orientation: drawn.reversed ? (vi ? "Ngược" : "Reversed") : (vi ? "Xuôi" : "Upright") }
    });
  }, [filled, landed, flight, slots, animate, reduceMotion, area, backImage, vi]);

  const land = () => {
    setFlight(null);
    setLanded((current) => Math.min(current + 1, slots.length));
  };

  const pickRandom = () => {
    const index = fanRef.current?.randomIndex();
    if (index == null) return;
    fanRef.current?.focus(index);
    // Tapping the raised card again turns it over, so only raise it when it is not raised yet.
    if (selectedFanIndex !== index) onSelectFan(index);
  };

  const revealRest = () => {
    skipFlights.current = true;
    onDrawRest?.();
  };

  const onRootLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((current) => (current && current.width === width && current.height === height ? current : { width, height }));
  };

  return (
    <View style={s.root} testID="draw-root" onLayout={onRootLayout}>
      {question.trim() ? (
        <View style={s.question}>
          <Ionicons name="sparkles-outline" size={18} color="#E7B7BE" style={s.questionIcon} />
          <Text style={s.questionText}>{question.trim()}</Text>
        </View>
      ) : null}

      <View style={s.slots} testID="draw-slots" onLayout={(event) => { rowRect.current = event.nativeEvent.layout; }}>
        {shown.map((slot, index) => {
          const isNext = index === nextIndex;
          const card = slot.card;
          return (
            <View key={`${slot.label}-${index}`} testID={`draw-slot-${index}`} style={s.slot} onLayout={(event) => { cellRects.current[index] = event.nativeEvent.layout; }}>
              {card ? (
                <Pressable accessibilityRole="imagebutton" accessibilityLabel={`${slot.label}: ${card.name}. ${vi ? "Xem hình lá bài toàn màn hình" : "View full-screen card artwork"}`}
                  onPress={() => onOpenCard(index)} style={s.slotCard}>
                  <Image source={card.image} style={[s.slotImage, card.reversed && s.reversed]} resizeMode="cover" />
                </Pressable>
              ) : (
                <View style={[s.slotEmpty, isNext && s.slotNext]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Text style={[s.slotNumber, isNext && s.slotNumberNext]}>{index + 1}</Text>
                </View>
              )}
              <Text style={[s.slotLabel, isNext && s.slotLabelNext, card && s.slotLabelDone]} numberOfLines={2}>{slot.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={s.prompt} accessibilityLiveRegion="polite">
        {done
          ? vi ? "Các lá đã sẵn sàng. Xem thông điệp khi bạn muốn." : "Your cards are ready. Read the message when you like."
          : <>{vi ? "Hít một hơi chậm. Chọn lá cho vị trí " : "Take a slow breath. Choose a card for "}<Text style={s.promptEm}>{nextLabel}</Text>.</>}
      </Text>
      {status ? <Text style={s.status}>{status}</Text> : null}

      {!done ? (
        <>
          <View testID="draw-fan" style={s.fanWrap} onLayout={(event) => { fanRect.current = event.nativeEvent.layout; }}>
            <TarotDeckFan
              ref={fanRef}
              language={language}
              backImage={backImage}
              deckSize={deckSize}
              hidden={taken}
              selectedIndex={selectedFanIndex}
              disabled={busyNow}
              reduceMotion={reduceMotion}
              initialOffset={fanStart}
              onSelect={onSelectFan}
              onSpin={onClearSelection}
            />
          </View>
          <View style={s.spinRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Xoay bộ bài sang trái" : "Spin the deck left"} onPress={() => fanRef.current?.rotateBy(-3)} style={s.spinButton}>
              <Ionicons name="chevron-back-outline" size={20} color="#B8B0A4" />
            </Pressable>
            <Text style={s.spinHint}>{vi ? "Vuốt ngang để xoay bộ bài" : "Swipe sideways to spin the deck"}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Xoay bộ bài sang phải" : "Spin the deck right"} onPress={() => fanRef.current?.rotateBy(3)} style={s.spinButton}>
              <Ionicons name="chevron-forward-outline" size={20} color="#B8B0A4" />
            </Pressable>
          </View>
        </>
      ) : null}

      {children}

      {!done ? (
        <View style={s.links}>
          <Pressable accessibilityRole="button" disabled={busyNow} onPress={pickRandom} style={s.link}>
            <Text style={s.linkMuted}>{vi ? "Rút ngẫu nhiên" : "Random pick"}</Text>
          </Pressable>
          {onDrawRest && remaining > 1 ? (
            <Pressable accessibilityRole="button" disabled={busyNow} onPress={revealRest} style={s.link}>
              <Text style={s.linkText}>{vi ? `Lật cả ${remaining} lá ngay` : `Reveal all ${remaining} now`}</Text>
            </Pressable>
          ) : <View />}
        </View>
      ) : null}

      {flight && area ? <TarotCardFlight flight={flight} area={area} skipLabel={vi ? "Bỏ qua hiệu ứng" : "Skip animation"} onDone={land} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { paddingTop: 8 },
  question: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 14, borderRadius: 14, backgroundColor: "#1F1C1E" },
  questionIcon: { marginTop: 2 },
  questionText: { flex: 1, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20 },
  slots: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 18 },
  slot: { flex: 1, maxWidth: 96, alignItems: "center", gap: 8 },
  slotCard: { width: "100%", aspectRatio: 86 / 148, borderRadius: radius.card, overflow: "hidden" },
  slotImage: { width: "100%", height: "100%" },
  reversed: { transform: [{ rotate: "180deg" }] },
  slotEmpty: { width: "100%", aspectRatio: 86 / 148, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)", alignItems: "center", justifyContent: "center" },
  slotNext: { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.gold, backgroundColor: "rgba(201, 164, 92, 0.08)", shadowColor: colors.gold, shadowOpacity: 0.3, shadowRadius: 14 },
  slotNumber: { color: "#6E675F", fontFamily: typography.headlineRegularFontFamily, fontSize: 30 },
  slotNumberNext: { color: colors.gold },
  slotLabel: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, textAlign: "center" },
  slotLabelNext: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily },
  slotLabelDone: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily },
  prompt: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 22, lineHeight: 29, textAlign: "center", marginTop: 24, marginHorizontal: 12 },
  promptEm: { color: colors.gold, fontStyle: "italic" },
  status: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13, textAlign: "center", marginTop: 8 },
  fanWrap: { marginTop: 18 },
  spinRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  spinButton: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, alignItems: "center", justifyContent: "center" },
  spinHint: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12.5 },
  links: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  link: { minHeight: layout.minimumTouchTarget, justifyContent: "center", paddingHorizontal: 8 },
  linkText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 },
  linkMuted: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5 }
});
