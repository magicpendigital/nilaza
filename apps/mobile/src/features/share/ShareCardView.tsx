import React, { forwardRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import type { ShareCardModel } from "./shareCardContent";

// The card keeps a 4:5 ratio. Every size is scaled from a 360-wide design so the preview and the captured image match.
export const SHARE_CARD_RATIO = 1.25;
export const SHARE_IMAGE_WIDTH = 1080;
export const SHARE_IMAGE_HEIGHT = 1350;

type Props = { model: ShareCardModel; width: number };

export const ShareCardView = forwardRef<View, Props>(function ShareCardView({ model, width }, ref) {
  const u = (value: number) => (value * width) / 360;
  const count = model.images.length;
  // Sized so the image, title and up to three message lines always fit between the wordmark and the footer.
  const imageWidth = count <= 1 ? u(112) : u(88);
  const imageHeight = imageWidth * 1.72;
  return (
    <View
      ref={ref}
      collapsable={false}
      accessibilityLabel={[model.eyebrow, model.title, model.message].filter(Boolean).join(". ")}
      style={[styles.card, { width, height: width * SHARE_CARD_RATIO, padding: u(24), borderRadius: u(14) }]}
    >
      <Text style={[styles.wordmark, { fontSize: u(15), letterSpacing: u(5) }]}>NILAZA</Text>
      <View style={styles.middle}>
        <Text style={[styles.eyebrow, { fontSize: u(11), letterSpacing: u(2) }]}>{model.eyebrow.toUpperCase()}</Text>
        {count ? (
          <View style={[styles.imageRow, { gap: u(10), marginVertical: u(14) }]}>
            {model.images.map((image, index) => (
              <Image
                key={index}
                source={image.source}
                resizeMode="contain"
                style={[{ width: imageWidth, height: imageHeight, borderRadius: u(6) }, image.reversed ? styles.reversed : null]}
              />
            ))}
          </View>
        ) : null}
        <Text style={[styles.title, { fontSize: u(count ? 26 : 28), lineHeight: u(count ? 31 : 34) }]}>{model.title}</Text>
        {model.rows.length ? (
          <View style={{ marginTop: u(16), gap: u(10), alignSelf: "stretch" }}>
            {model.rows.map((row) => (
              <View key={row.label} style={[styles.row, { paddingVertical: u(8) }]}>
                <Text style={[styles.glyph, { fontSize: u(22), width: u(34) }]}>{row.glyph}</Text>
                <Text style={[styles.rowLabel, { fontSize: u(12) }]}>{row.label}</Text>
                <Text style={[styles.rowValue, { fontSize: u(20) }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {model.lines.length ? (
          <View style={{ marginTop: u(10), gap: u(3) }}>
            {model.lines.map((line) => (
              <Text key={line} style={[styles.line, { fontSize: u(11.5) }]}>{line}</Text>
            ))}
          </View>
        ) : null}
        {model.message ? <Text style={[styles.message, { fontSize: u(13.5), lineHeight: u(20), marginTop: u(14) }]}>{model.message}</Text> : null}
      </View>
      <View style={styles.footer}>
        <Text style={[styles.note, { fontSize: u(10.5) }]}>{model.note}</Text>
        <Text style={[styles.address, { fontSize: u(11.5), marginTop: u(4) }]}>{model.footer}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: colors.charcoal, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.45)", overflow: "hidden" },
  wordmark: { color: colors.gold, fontFamily: "EBGaramond_400Regular", textAlign: "center" },
  middle: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  eyebrow: { color: colors.moon, fontFamily: "HankenGrotesk_500Medium", textAlign: "center" },
  imageRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  reversed: { transform: [{ rotate: "180deg" }] },
  title: { color: colors.ivory, fontFamily: "EBGaramond_500Medium", textAlign: "center", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(247, 241, 230, 0.18)" },
  glyph: { color: colors.gold, textAlign: "center" },
  rowLabel: { color: colors.moon, fontFamily: "HankenGrotesk_400Regular", flex: 1 },
  rowValue: { color: colors.ivory, fontFamily: "EBGaramond_500Medium" },
  line: { color: colors.moon, fontFamily: "HankenGrotesk_400Regular", textAlign: "center" },
  message: { color: colors.muted, fontFamily: "HankenGrotesk_400Regular", textAlign: "center" },
  footer: { alignItems: "center" },
  note: { color: colors.moon, fontFamily: "HankenGrotesk_400Regular", textAlign: "center" },
  address: { color: colors.gold, fontFamily: "HankenGrotesk_500Medium", textAlign: "center" }
});
