import React, { forwardRef, type ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Brand } from "../../a2ui/Brand";
import { colors, typography } from "../../theme";
import type { ShareFormat } from "./shareEvents";
import type { ShareCardModel, ShareSkin } from "./shareCardContent";
import { ShareQr } from "./ShareQr";

// Every size is scaled from a 360-wide design so the preview and the captured image match.
// Post 4:5 (Facebook feed, Zalo, Messenger) and Story 9:16 (Facebook/Instagram Story, TikTok, Zalo).
export const SHARE_DESIGN_WIDTH = 360;
export const SHARE_FORMAT_SIZE: Record<ShareFormat, { width: number; height: number; ratio: number }> = {
  post: { width: 1080, height: 1350, ratio: 1350 / 1080 },
  story: { width: 1080, height: 1920, ratio: 1920 / 1080 }
};

/** Design units kept clear at the top and bottom of a Story, where the app bars and reply box sit (estimate, not measured on a phone). */
const STORY_SAFE = { top: 64, bottom: 88 };
// A full share address is about 45 x 45 modules (level M); 72/80 units give about 4.4/4.9 px per module in the 1080-wide image.
const QR_SIZE: Record<ShareFormat, number> = { post: 72, story: 80 };

type Palette = { background: string; border: string; text: string; soft: string; accent: string; rule: string; logo: "ivory" | "charcoal" };
const palettes: Record<ShareSkin, Palette> = {
  classic: { background: colors.charcoal, border: "rgba(201, 164, 92, 0.45)", text: colors.ivory, soft: colors.moon, accent: colors.gold, rule: "rgba(247, 241, 230, 0.16)", logo: "ivory" },
  tarot: { background: colors.charcoal, border: colors.gold, text: colors.ivory, soft: colors.moon, accent: colors.gold, rule: "rgba(201, 164, 92, 0.35)", logo: "ivory" },
  // Brand gold on teal is only 3.4:1, so small text uses a light gold (5:1); the big number keeps brand gold (large text).
  numbers: { background: colors.teal, border: "rgba(201, 164, 92, 0.5)", text: colors.ivory, soft: "#D7E3DF", accent: "#F0DFB8", rule: "rgba(247, 241, 230, 0.22)", logo: "ivory" },
  quote: { background: colors.ivory, border: "rgba(14, 90, 90, 0.22)", text: colors.charcoal, soft: "#4A4648", accent: colors.teal, rule: "rgba(21, 20, 22, 0.12)", logo: "charcoal" }
};

/**
 * Largest quote size whose estimated height fits the room left in the card. The estimate is deliberately generous
 * (0.5 em per character), so a long Suy tưởng line shrinks instead of being cut off by the frame.
 */
export function fitQuoteSize(text: string, roomHeight: number, lineWidth: number): { fontSize: number; lineHeight: number } {
  const sizes = [26, 24, 22, 20, 18, 17, 16, 15, 14];
  for (const fontSize of sizes) {
    const lineHeight = Math.round(fontSize * 1.38);
    const perLine = Math.max(8, Math.floor(lineWidth / (fontSize * 0.5)));
    const lines = Math.ceil(text.length / perLine) + 1;
    if (lines * lineHeight <= roomHeight) return { fontSize, lineHeight };
  }
  return { fontSize: 13, lineHeight: 18 };
}

type Props = { model: ShareCardModel; width: number; format?: ShareFormat; /** Address the QR opens; no QR is drawn without it. */ qrUrl?: string };

export const ShareCardView = forwardRef<View, Props>(function ShareCardView({ model, width, format = "post", qrUrl }, ref) {
  const u = (value: number) => (value * width) / SHARE_DESIGN_WIDTH;
  const story = format === "story";
  const height = width * SHARE_FORMAT_SIZE[format].ratio;
  const palette = palettes[model.skin] ?? palettes.classic;
  const padTop = story ? STORY_SAFE.top : 22;
  const padBottom = story ? STORY_SAFE.bottom : 20;
  // Design-unit height left for the skin body after the padding, header (logo + eyebrow) and frame footer.
  const bodyRoom = height / (width / SHARE_DESIGN_WIDTH) - padTop - padBottom - 56 - (QR_SIZE[format] + 18);
  const label = [model.eyebrow, model.quote?.text, model.title, model.subtitle, model.message, model.invite, model.footer].filter(Boolean).join(". ");

  let body: ReactNode;
  if (model.skin === "quote" && model.quote) body = <QuoteBody model={model} u={u} palette={palette} room={bodyRoom} story={story} />;
  else if (model.skin === "numbers" && model.numbers) body = <NumbersBody model={model} u={u} palette={palette} story={story} />;
  else if (model.skin === "tarot") body = <TarotBody model={model} u={u} palette={palette} story={story} room={bodyRoom} />;
  else body = <ClassicBody model={model} u={u} story={story} />;

  return (
    <View
      ref={ref}
      collapsable={false}
      testID={`share-card-${model.skin}-${format}`}
      accessibilityLabel={label}
      style={[
        styles.card,
        {
          width,
          height,
          backgroundColor: palette.background,
          borderColor: model.skin === "quote" ? palette.background : palette.border,
          paddingTop: u(padTop),
          paddingBottom: u(padBottom),
          paddingHorizontal: u(24),
          borderRadius: u(8)
        }
      ]}
    >
      {model.skin === "quote" || model.skin === "tarot" ? (
        <View pointerEvents="none" style={[styles.inset, { top: u(10), left: u(10), right: u(10), bottom: u(10), borderRadius: u(6), borderColor: palette.border, borderWidth: model.skin === "tarot" ? u(1.2) : 1 }]} />
      ) : null}
      <View style={[styles.header, { gap: u(6) }]}>
        <Brand variant="horizontal" tone={palette.logo} width={u(story ? 92 : 78)} decorative />
        <Text style={[styles.eyebrow, { color: palette.accent, fontSize: u(10.5), letterSpacing: u(2) }]}>{model.eyebrow.toUpperCase()}</Text>
      </View>
      <View style={styles.middle}>{body}</View>
      <View style={[styles.frame, { gap: u(12), paddingTop: u(12), borderTopColor: palette.rule }]}>
        {qrUrl ? <ShareQr url={qrUrl} size={u(QR_SIZE[format])} /> : null}
        <View style={styles.frameText}>
          <Text style={[styles.invite, { color: palette.text, fontSize: u(story ? 14 : 13), lineHeight: u(story ? 19 : 17.5) }]}>{model.invite}</Text>
          <Text style={[styles.address, { color: palette.accent, fontSize: u(10.5), marginTop: u(3) }]}>{model.footer}</Text>
          <Text style={[styles.note, { color: palette.soft, fontSize: u(9.5), marginTop: u(1) }]}>{model.note}</Text>
        </View>
      </View>
    </View>
  );
});

type BodyProps = { model: ShareCardModel; u: (value: number) => number; palette: Palette; story: boolean };

function QuoteBody({ model, u, palette, room, story }: BodyProps & { room: number }) {
  const quote = model.quote!;
  // Room for the quote: minus the mark, source line, question box (label + up to three lines) and gaps.
  const questionLines = Math.min(4, Math.ceil(quote.question.length / 44));
  const quoteRoom = room - 34 - 22 - (30 + questionLines * 18) - 30;
  const fit = fitQuoteSize(quote.text, quoteRoom, 312);
  return (
    <View style={{ alignSelf: "stretch", gap: u(story ? 16 : 10) }}>
      <Text style={[styles.mark, { color: colors.gold, fontSize: u(story ? 84 : 64), lineHeight: u(story ? 64 : 48), height: u(story ? 40 : 30) }]}>“</Text>
      <Text testID="share-card-quote" style={[styles.quote, { color: palette.text, fontSize: u(fit.fontSize), lineHeight: u(fit.lineHeight) }]}>{quote.text}</Text>
      <View style={[styles.sourceRow, { gap: u(8) }]}>
        <View style={{ width: u(26), height: 1, backgroundColor: palette.accent }} />
        <Text style={[styles.source, { color: palette.accent, fontSize: u(12) }]}>{quote.source}</Text>
      </View>
      {quote.question ? (
        <View style={[styles.box, { backgroundColor: "rgba(14, 90, 90, 0.07)", borderRadius: u(8), padding: u(12), marginTop: u(story ? 8 : 2) }]}>
          <Text style={[styles.boxLabel, { color: palette.accent, fontSize: u(9.5), letterSpacing: u(1.4) }]}>{quote.questionLabel.toUpperCase()}</Text>
          <Text style={[styles.boxText, { color: palette.text, fontSize: u(12.5), lineHeight: u(18), marginTop: u(4) }]}>{quote.question}</Text>
        </View>
      ) : null}
    </View>
  );
}

function NumbersBody({ model, u, palette, story }: BodyProps) {
  const numbers = model.numbers!;
  const cell = u(story ? 24 : 20);
  return (
    <View style={{ alignSelf: "stretch", gap: u(story ? 18 : 12) }}>
      <View style={[styles.numbersTop, { gap: u(14) }]}>
        <View style={styles.flex}>
          <Text style={[styles.kind, { color: palette.soft, fontSize: u(11), letterSpacing: u(1.2) }]}>{numbers.kindLabel.toUpperCase()}</Text>
          <Text testID="share-card-number" style={[styles.bigNumber, { color: colors.gold, fontSize: u(story ? 72 : 58), lineHeight: u(story ? 78 : 62) }]}>{numbers.value}</Text>
          <Text style={[styles.numbersTitle, { color: palette.text, fontSize: u(story ? 24 : 21), lineHeight: u(story ? 29 : 25) }]}>{model.title}</Text>
        </View>
        {/* Decorative 1-9 grid: only the root digit is lit. It never shows the birth date. */}
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: cell * 3 + u(8), flexDirection: "row", flexWrap: "wrap", gap: u(4) }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
            const lit = digit === numbers.root;
            return (
              <View key={digit} testID={lit ? "share-card-grid-lit" : undefined} style={[styles.gridCell, { width: cell, height: cell, borderRadius: u(4), backgroundColor: lit ? colors.gold : "rgba(247, 241, 230, 0.08)", borderColor: lit ? colors.gold : "rgba(247, 241, 230, 0.2)" }]}>
                <Text style={{ color: lit ? colors.charcoal : palette.soft, fontSize: u(story ? 11.5 : 10), fontFamily: typography.bodySemiBoldFontFamily }}>{digit}</Text>
              </View>
            );
          })}
        </View>
      </View>
      {numbers.notes.map((note) => (
        <View key={note.label} style={[styles.box, { backgroundColor: "rgba(247, 241, 230, 0.08)", borderRadius: u(8), padding: u(11) }]}>
          <Text style={[styles.boxLabel, { color: palette.accent, fontSize: u(9.5), letterSpacing: u(1.4) }]}>{note.label.toUpperCase()}</Text>
          <Text style={[styles.boxText, { color: palette.text, fontSize: u(story ? 13.5 : 12.5), lineHeight: u(story ? 19 : 17.5), marginTop: u(3) }]}>{note.text}</Text>
        </View>
      ))}
      <View style={[styles.chips, { gap: u(8) }]}>
        {numbers.chips.map((chip) => (
          <View key={chip} style={[styles.chip, { borderColor: "rgba(247, 241, 230, 0.35)", borderRadius: u(8), paddingHorizontal: u(10), paddingVertical: u(4) }]}>
            <Text style={{ color: palette.text, fontSize: u(11), fontFamily: typography.bodyMediumFontFamily }}>{chip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TarotBody({ model, u, palette, story, room }: BodyProps & { room: number }) {
  const image = model.images[0];
  // The card art takes what the text leaves: title, small line, keyword pills and two message lines.
  const textRoom = 34 + (model.subtitle ? 18 : 0) + (model.keywords?.length ? 34 : 0) + (model.message ? 44 : 0) + 24;
  const imageHeight = u(Math.max(120, Math.min(story ? 300 : 190, room - textRoom)));
  return (
    <View style={{ alignItems: "center", alignSelf: "stretch" }}>
      {image ? (
        <Image source={image.source} resizeMode="contain" style={[{ width: imageHeight / 1.72, height: imageHeight, borderRadius: u(6), marginBottom: u(10) }, image.reversed ? styles.reversed : null]} />
      ) : null}
      <Text style={[styles.title, { color: palette.text, fontSize: u(story ? 28 : 24), lineHeight: u(story ? 33 : 28) }]}>{model.title}</Text>
      {model.subtitle ? <Text style={[styles.subtitle, { color: palette.soft, fontSize: u(12.5), marginTop: u(2) }]}>{model.subtitle}</Text> : null}
      {model.keywords?.length ? (
        <View style={[styles.chips, { gap: u(6), marginTop: u(10), justifyContent: "center" }]}>
          {model.keywords.map((word) => (
            <View key={word} style={[styles.chip, { borderColor: "rgba(201, 164, 92, 0.6)", borderRadius: u(8), paddingHorizontal: u(9), paddingVertical: u(3) }]}>
              <Text style={{ color: palette.accent, fontSize: u(10.5), fontFamily: typography.bodyMediumFontFamily }}>{word}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {model.message ? <Text numberOfLines={story ? 4 : 2} style={[styles.meaning, { color: colors.muted, fontSize: u(12.5), lineHeight: u(18), marginTop: u(10) }]}>{model.message}</Text> : null}
    </View>
  );
}

/** The dark layout every feature used before v2 (Tarot spreads, Big 3, sky). Bodies get their own skins in S2. */
function ClassicBody({ model, u, story }: { model: ShareCardModel; u: (value: number) => number; story: boolean }) {
  const count = model.images.length;
  // One card large, two or three medium, four (the largest spread) smaller so all of them fit the 312-wide row.
  const imageWidth = (count <= 1 ? u(100) : count <= 3 ? u(80) : u(60)) * (story ? 1.25 : 1);
  const imageHeight = imageWidth * 1.72;
  const compact = count >= 4;
  return (
    <View style={{ alignItems: "center", alignSelf: "stretch" }}>
      {count ? (
        <View style={[styles.imageRow, { gap: u(compact ? 8 : 10), marginBottom: u(compact ? 8 : 12) }]}>
          {model.images.map((image, index) => (
            <Image key={index} source={image.source} resizeMode="contain" style={[{ width: imageWidth, height: imageHeight, borderRadius: u(6) }, image.reversed ? styles.reversed : null]} />
          ))}
        </View>
      ) : null}
      <Text style={[styles.title, { color: colors.ivory, fontSize: u(count ? 24 : 26), lineHeight: u(count ? 29 : 32) }]}>{model.title}</Text>
      {model.rows.length ? (
        <View style={{ marginTop: u(14), gap: u(8), alignSelf: "stretch" }}>
          {model.rows.map((row) => (
            <View key={row.label} style={[styles.row, { paddingVertical: u(7) }]}>
              <Text style={[styles.glyph, { fontSize: u(20), width: u(32) }]}>{row.glyph}</Text>
              <Text style={[styles.rowLabel, { fontSize: u(12) }]}>{row.label}</Text>
              <Text style={[styles.rowValue, { fontSize: u(19) }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {model.lines.length ? (
        <View style={{ marginTop: u(compact ? 6 : 8), gap: u(compact ? 2 : 3) }}>
          {model.lines.map((line) => (
            <Text key={line} style={[styles.line, { fontSize: u(11) }]}>{line}</Text>
          ))}
        </View>
      ) : null}
      {model.message ? <Text numberOfLines={story ? 5 : 3} style={[styles.message, { fontSize: u(13), lineHeight: u(19), marginTop: u(12) }]}>{model.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: "hidden" },
  inset: { position: "absolute" },
  flex: { flex: 1, minWidth: 0 },
  header: { alignItems: "center" },
  eyebrow: { fontFamily: typography.bodySemiBoldFontFamily, textAlign: "center" },
  middle: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  frame: { flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth },
  frameText: { flex: 1, minWidth: 0 },
  invite: { fontFamily: typography.bodySemiBoldFontFamily },
  address: { fontFamily: typography.bodyMediumFontFamily },
  note: { fontFamily: typography.bodyFontFamily },
  mark: { fontFamily: typography.headlineRegularFontFamily },
  quote: { fontFamily: typography.headlineRegularFontFamily },
  sourceRow: { flexDirection: "row", alignItems: "center" },
  source: { fontFamily: typography.bodyMediumFontFamily, flexShrink: 1 },
  box: {},
  boxLabel: { fontFamily: typography.bodySemiBoldFontFamily },
  boxText: { fontFamily: typography.bodyFontFamily },
  numbersTop: { flexDirection: "row", alignItems: "center" },
  kind: { fontFamily: typography.bodySemiBoldFontFamily },
  bigNumber: { fontFamily: typography.headlineFontFamily },
  numbersTitle: { fontFamily: typography.headlineFontFamily },
  gridCell: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  chip: { borderWidth: 1 },
  subtitle: { fontFamily: typography.bodyFontFamily, textAlign: "center" },
  meaning: { fontFamily: typography.bodyItalicFontFamily, textAlign: "center" },
  imageRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  reversed: { transform: [{ rotate: "180deg" }] },
  title: { fontFamily: typography.headlineFontFamily, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(247, 241, 230, 0.18)" },
  glyph: { color: colors.gold, textAlign: "center" },
  rowLabel: { color: colors.moon, fontFamily: typography.bodyFontFamily, flex: 1 },
  rowValue: { color: colors.ivory, fontFamily: typography.headlineFontFamily },
  line: { color: colors.moon, fontFamily: typography.bodyFontFamily, textAlign: "center" },
  message: { color: colors.muted, fontFamily: typography.bodyFontFamily, textAlign: "center" }
});
