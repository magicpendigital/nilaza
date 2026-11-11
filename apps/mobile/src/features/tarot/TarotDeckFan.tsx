import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, ImageSourcePropType, LayoutChangeEvent, PanResponder, Platform, Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../theme";
import type { Language } from "../../types";

// A fanned deck the person can spin left and right. Every card is the same back image; the
// illusion of a full 78-card deck is the point. A card is identified by its position in the
// deck (0..deckSize-1), not by where it currently sits in the fan.

export const FAN_CARD_W = 68;
export const FAN_CARD_H = 118;
export const FAN_HEIGHT = 230;
const FAN_TOP = 50;
const FAN_ORIGIN_Y = FAN_CARD_H * 3.2; // transformOrigin is 50% 320% of the card
const FAN_STEP_DEG = 9;
const FAN_HALF_WINDOW = 4.6; // cards further from the centre than this are not drawn
const FAN_FADE_FROM = 3.6;
const RAISE = 30;
const PX_PER_CARD = 30;

export type FanPose = { x: number; y: number; rotate: number };

export type TarotDeckFanHandle = {
  /** Centre of a card, relative to the fan container; null when the card is no longer in the deck. */
  getPose: (index: number, raised?: boolean) => FanPose | null;
  /** The card currently in the middle of the fan. */
  getCenterIndex: () => number | null;
  rotateBy: (steps: number) => void;
  /** Spin the deck so this card ends up in the middle. */
  focus: (index: number) => void;
  /** A random card that is still in the deck. */
  randomIndex: () => number | null;
};

export type TarotDeckFanProps = {
  language: Language;
  backImage: ImageSourcePropType;
  deckSize?: number;
  /** Cards already drawn; they leave the fan. */
  hidden?: number[];
  selectedIndex: number | null;
  disabled?: boolean;
  reduceMotion?: boolean;
  initialOffset?: number;
  onSelect: (index: number) => void;
  /** Called when the person starts spinning the deck by hand; a raised card goes back in. */
  onSpin?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function fanPoseFor(width: number, position: number, raised: boolean): FanPose {
  const degrees = position * FAN_STEP_DEG;
  const radians = (degrees * Math.PI) / 180;
  const radius = FAN_ORIGIN_Y - FAN_CARD_H / 2 + (raised ? RAISE : 0);
  return {
    x: width / 2 + radius * Math.sin(radians),
    y: FAN_TOP + FAN_ORIGIN_Y - radius * Math.cos(radians),
    rotate: degrees
  };
}

function wrapPosition(value: number, count: number) {
  const half = count / 2;
  return ((((value + half) % count) + count) % count) - half;
}

export const TarotDeckFan = forwardRef<TarotDeckFanHandle, TarotDeckFanProps>(function TarotDeckFan(
  { language, backImage, deckSize = 78, hidden, selectedIndex, disabled = false, reduceMotion = false, initialOffset, onSelect, onSpin, onLayout },
  ref
) {
  const vi = language === "vi";
  const remaining = useMemo(() => {
    const gone = new Set(hidden ?? []);
    return Array.from({ length: deckSize }, (_, index) => index).filter((index) => !gone.has(index));
  }, [deckSize, hidden]);
  const count = remaining.length;

  const [width, setWidth] = useState(342);
  const [offset, setOffset] = useState(() => initialOffset ?? Math.floor(Math.random() * Math.max(count, 1)));
  const offsetRef = useRef(offset);
  const motion = useRef(new Animated.Value(offset)).current;
  const startRef = useRef(offset);
  const live = useRef<{ count: number; disabled: boolean; reduceMotion: boolean; selectedIndex: number | null; remaining: number[]; width: number; onSpin?: () => void }>({ count, disabled, reduceMotion, selectedIndex, remaining, width, onSpin });
  live.current = { count, disabled, reduceMotion, selectedIndex, remaining, width, onSpin };

  const apply = useCallback((value: number) => {
    offsetRef.current = value;
    setOffset(value);
  }, []);

  useEffect(() => {
    const id = motion.addListener(({ value }) => apply(value));
    return () => motion.removeListener(id);
  }, [apply, motion]);

  const settleTo = useCallback((target: number, duration = 420) => {
    motion.stopAnimation();
    if (live.current.reduceMotion) { motion.setValue(target); return; }
    motion.setValue(offsetRef.current);
    Animated.timing(motion, { toValue: target, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [motion]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      !live.current.disabled && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
    onPanResponderGrant: () => {
      motion.stopAnimation();
      startRef.current = offsetRef.current;
      live.current.onSpin?.();
    },
    onPanResponderMove: (_, gesture) => {
      const next = startRef.current - gesture.dx / PX_PER_CARD;
      motion.setValue(next);
    },
    onPanResponderRelease: (_, gesture) => {
      const projected = startRef.current - gesture.dx / PX_PER_CARD - (gesture.vx * 220) / PX_PER_CARD;
      settleTo(Math.round(projected));
    },
    onPanResponderTerminationRequest: () => false
  }), [motion, settleTo]);

  useImperativeHandle(ref, () => ({
    getPose: (index, raised) => {
      const { remaining: list, width: w, selectedIndex: selected } = live.current;
      const rank = list.indexOf(index);
      if (rank < 0 || !list.length) return null;
      return fanPoseFor(w, wrapPosition(rank - offsetRef.current, list.length), raised ?? selected === index);
    },
    getCenterIndex: () => {
      const { remaining: list } = live.current;
      if (!list.length) return null;
      const rank = ((Math.round(offsetRef.current) % list.length) + list.length) % list.length;
      return list[rank];
    },
    rotateBy: (steps) => { live.current.onSpin?.(); settleTo(Math.round(offsetRef.current) + steps, 320); },
    focus: (index) => {
      const { remaining: list } = live.current;
      const rank = list.indexOf(index);
      if (rank < 0) return;
      const delta = wrapPosition(rank - offsetRef.current, list.length);
      settleTo(offsetRef.current + delta, Math.min(950, 380 + Math.abs(delta) * 18));
    },
    randomIndex: () => {
      const { remaining: list } = live.current;
      return list.length ? list[Math.floor(Math.random() * list.length)] : null;
    }
  }), [settleTo]);

  const cards = useMemo(() => {
    const result: Array<{ index: number; rank: number; position: number }> = [];
    remaining.forEach((index, rank) => {
      const position = wrapPosition(rank - offset, count);
      if (Math.abs(position) <= FAN_HALF_WINDOW) result.push({ index, rank, position });
    });
    return result;
  }, [remaining, offset, count]);

  return (
    <View
      style={s.fan}
      {...panResponder.panHandlers}
      onLayout={(event) => { setWidth(event.nativeEvent.layout.width); onLayout?.(event); }}
      accessibilityLabel={vi ? "Bộ bài, vuốt ngang để xoay, chạm để chọn một lá" : "Deck, swipe sideways to spin, tap to choose a card"}
    >
      {cards.map(({ index, position }) => {
        const selected = selectedIndex === index;
        const distance = Math.abs(position);
        const opacity = distance <= FAN_FADE_FROM ? 1 : Math.max(0, 1 - (distance - FAN_FADE_FROM) / (FAN_HALF_WINDOW - FAN_FADE_FROM));
        return (
          // The wrapper only ever changes its transform; the border and glow are separate layers so
          // selecting another card never changes the layout of a card that stays in the fan.
          <View
            key={index}
            collapsable={false}
            pointerEvents="box-none"
            style={[
              s.card,
              { opacity, zIndex: selected ? 500 : 100 + Math.round(position * 10) },
              { transform: [{ rotate: `${position * FAN_STEP_DEG}deg` }, { translateY: selected ? -RAISE : 0 }] }
            ]}
          >
            <View pointerEvents="none" style={[s.glow, selected && s.glowOn]} />
            <Pressable
              disabled={disabled || opacity < 0.5}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={vi ? `Lá thứ ${index + 1} trong bộ bài` : `Card ${index + 1} in the deck`}
              onPress={() => onSelect(index)}
              style={s.hit}
            >
              <Image source={backImage} style={s.image} resizeMode="cover" />
              <View pointerEvents="none" style={[s.ring, selected && s.ringOn]} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
});

const nativeShadow = Platform.OS === "android" ? { elevation: 0 } : { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } };

const s = StyleSheet.create({
  fan: { height: FAN_HEIGHT },
  card: { position: "absolute", top: FAN_TOP, left: "50%", marginLeft: -FAN_CARD_W / 2, width: FAN_CARD_W, height: FAN_CARD_H, borderRadius: 6, backgroundColor: "#1C1A1D", transformOrigin: "50% 320%", ...nativeShadow },
  hit: { width: FAN_CARD_W, height: FAN_CARD_H, borderRadius: 6 },
  image: { width: FAN_CARD_W, height: FAN_CARD_H, borderRadius: 6 },
  ring: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 6, borderWidth: 2, borderColor: "transparent" },
  ringOn: { borderColor: colors.gold },
  glow: { position: "absolute", top: -6, left: -6, right: -6, bottom: -6, borderRadius: 12, backgroundColor: "rgba(201, 164, 92, 0.28)", opacity: 0 },
  glowOn: { opacity: 1 }
});
