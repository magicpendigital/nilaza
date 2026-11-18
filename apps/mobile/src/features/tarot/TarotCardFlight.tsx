import { useEffect, useRef } from "react";
import { Animated, Easing, Image, ImageSourcePropType, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../../theme";
import { CARD_ASPECT, FLIGHT_STAGES } from "./ritualLayout";

// One drawn card: it leaves the deck and comes to the centre face down, waits there while the person
// holds the question in mind, turns over slowly at a large size so it can be read, then flies to its
// position. The card is drawn at its largest size and scaled down, so the artwork stays sharp while it
// is shown full size. Stage lengths are in ritualLayout.ts; t runs 0..5 across the five stages.

export type FlightPoint = { x: number; y: number };

export type CardFlight = {
  from: FlightPoint & { rotate: number };
  to: FlightPoint & { width: number };
  back: ImageSourcePropType;
  face: ImageSourcePropType;
  reversed: boolean;
  fromWidth: number;
  /** Shown while the card waits face down: the position, a breathing cue and the person's own question. */
  intro: { position: string; hint: string; question?: string };
  caption: { position: string; name: string; orientation: string };
};

export type TarotCardFlightProps = {
  flight: CardFlight;
  /** Size of the area the flight happens in. */
  area: { width: number; height: number };
  skipLabel: string;
  onDone: () => void;
};

const ASPECT = CARD_ASPECT;
const useNative = Platform.OS !== "web";

export function TarotCardFlight({ flight, area, skipLabel, onDone }: TarotCardFlightProps) {
  const t = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    t.stopAnimation();
    onDone();
  };

  const bigWidth = Math.min(220, Math.max(160, area.width * 0.6));
  const bigHeight = bigWidth * ASPECT;
  const centre = { x: area.width / 2, y: 16 + bigHeight / 2 };

  useEffect(() => {
    const easings = [Easing.out(Easing.cubic), Easing.linear, Easing.inOut(Easing.cubic), Easing.linear, Easing.inOut(Easing.cubic)];
    const run = Animated.sequence(
      FLIGHT_STAGES.map((stage, index) => Animated.timing(t, { toValue: index + 1, duration: stage.ms, easing: easings[index], useNativeDriver: useNative }))
    );
    run.start(({ finished }) => { if (finished) finish(); });
    return () => run.stop();
    // The flight is created once per card; finish() is guarded by doneRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const range = [0, 1, 4, 5];
  const translateX = t.interpolate({ inputRange: range, outputRange: [flight.from.x - centre.x, 0, 0, flight.to.x - centre.x] });
  const translateY = t.interpolate({ inputRange: range, outputRange: [flight.from.y - centre.y, 0, 0, flight.to.y - centre.y] });
  // The card swells very slightly while it waits face down, like a breath.
  const scale = t.interpolate({ inputRange: [0, 1, 1.5, 2, 4, 5], outputRange: [flight.fromWidth / bigWidth, 1, 1.03, 1, 1, flight.to.width / bigWidth] });
  const rotate = t.interpolate({ inputRange: range, outputRange: [`${flight.from.rotate}deg`, "0deg", "0deg", "0deg"] });
  const flipX = t.interpolate({ inputRange: [0, 2, 2.5, 3, 5], outputRange: [1, 1, 0.01, 1, 1] });
  const backOpacity = t.interpolate({ inputRange: [0, 2.49, 2.5, 5], outputRange: [1, 1, 0, 0] });
  const faceOpacity = t.interpolate({ inputRange: [0, 2.49, 2.5, 5], outputRange: [0, 0, 1, 1] });
  const scrim = t.interpolate({ inputRange: [0, 0.7, 4.1, 5], outputRange: [0, 1, 1, 0] });
  const intro = t.interpolate({ inputRange: [0.9, 1.35, 1.8, 2.15], outputRange: [0, 1, 1, 0] });
  const caption = t.interpolate({ inputRange: [2.6, 3.2, 4.1, 4.5], outputRange: [0, 1, 1, 0] });

  return (
    <View style={[s.layer, { width: area.width, height: area.height }]} pointerEvents="auto">
      <Pressable accessibilityRole="button" accessibilityLabel={skipLabel} onPress={finish} style={s.scrimHit}>
        <Animated.View style={[s.scrim, { opacity: scrim }]} />
      </Pressable>
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[s.card, { width: bigWidth, height: bigHeight, left: centre.x - bigWidth / 2, top: centre.y - bigHeight / 2, transform: [{ translateX }, { translateY }, { scale }, { rotate }, { scaleX: flipX }] }]}
      >
        <Animated.View style={[s.face, { opacity: backOpacity }]}>
          <Image source={flight.back} style={s.image} resizeMode="cover" />
        </Animated.View>
        <Animated.View style={[s.face, { opacity: faceOpacity }]}>
          <Image source={flight.face} style={[s.image, flight.reversed && s.reversed]} resizeMode="cover" />
        </Animated.View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[s.caption, { top: centre.y + bigHeight / 2 + 14, opacity: intro }]}>
        <Text style={s.captionPosition}>{flight.intro.position}</Text>
        <Text style={s.introHint}>{flight.intro.hint}</Text>
        {flight.intro.question ? <Text style={s.introQuestion} numberOfLines={2}>{flight.intro.question}</Text> : null}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[s.caption, { top: centre.y + bigHeight / 2 + 14, opacity: caption }]}>
        <Text style={s.captionPosition}>{flight.caption.position}</Text>
        <Text style={s.captionName}>{flight.caption.name}</Text>
        <Text style={s.captionOrientation}>{flight.caption.orientation}</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0, zIndex: 50 },
  scrimHit: { position: "absolute", top: -200, left: -24, right: -24, bottom: -400 },
  scrim: { flex: 1, backgroundColor: "rgba(21, 20, 22, 0.86)" },
  card: { position: "absolute", borderRadius: 10, backgroundColor: "#1C1A1D" },
  face: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  image: { width: "100%", height: "100%", borderRadius: 10 },
  reversed: { transform: [{ rotate: "180deg" }] },
  caption: { position: "absolute", left: 0, right: 0, alignItems: "center", gap: 4 },
  captionPosition: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  captionName: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 26, lineHeight: 30, textAlign: "center" },
  captionOrientation: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13 },
  introHint: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 21, lineHeight: 27, textAlign: "center", paddingHorizontal: 24 },
  introQuestion: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19, fontStyle: "italic", textAlign: "center", paddingHorizontal: 32 }
});
