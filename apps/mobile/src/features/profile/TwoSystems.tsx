import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import type { SavedChartsState } from "./useSavedCharts";
import { certainSigns } from "./whoAmIModel";
import { twoSystemsUi, twoSystemsView, type TwoSystemsAxis, type TwoSystemsFix } from "./twoSystemsModel";

// "Hai hệ cùng nhìn bạn" (lô H1). Opened from the Premium row of "Tôi là ai"; Back returns there.
// Template-only: every sentence comes from two-systems-blocks.json, computed on the device, nothing saved or sent.
// The Premium lock is UI-only (the text ships in the app), as accepted in the plan.
export type TwoSystemsProps = {
  language: Language;
  /** Signed out: the screen only invites to sign in. */
  signedIn: boolean;
  /** Same tier the rest of the app shows (account-tier-policy, owner preview included). */
  premium: boolean;
  savedCharts: SavedChartsState;
  /** YYYY-MM-DD from the profile, or empty. */
  birthDate: string;
  /** Reads the birth name saved for the Number Map on this device. Missing → treated as no name. */
  loadSavedName?: () => Promise<string>;
  onEditBirth: () => void;
  onMakeChart: () => void;
  onOpenNumerology?: () => void;
  /** The paywall path the app already uses; without it the Premium label is not a button. */
  onOpenPremium?: () => void;
  onSignIn?: () => void;
  /** Opens the Journal pre-filled with the block's question. */
  onWriteJournal?: (prompt: string) => void;
};

function SmallButton({ label, accessibilityLabel, onPress, testID }: { label: string; accessibilityLabel?: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} style={s.small}>
      <Text style={s.smallText}>{label}</Text>
    </Pressable>
  );
}

export function TwoSystems(props: TwoSystemsProps) {
  const { language, signedIn } = props;
  const vi = language === "vi";
  const [savedName, setSavedName] = useState<string | null>(props.loadSavedName ? null : "");
  // Read once per opening; the loader is often a new function on every parent render.
  const loader = useRef(props.loadSavedName);
  loader.current = props.loadSavedName;

  useEffect(() => {
    const load = loader.current;
    if (!signedIn || !load) return;
    let live = true;
    load().then((name) => { if (live) setSavedName(name); }).catch(() => { if (live) setSavedName(""); });
    return () => { live = false; };
  }, [signedIn]);

  const header = (
    <View style={s.intro}>
      <Text style={s.title} accessibilityRole="header">{twoSystemsUi("title", language)}</Text>
      <Text style={s.body}>{twoSystemsUi("intro", language)}</Text>
    </View>
  );

  if (!signedIn) {
    return (
      <View testID="two-systems-screen" style={s.root}>
        {header}
        <View testID="two-systems-guest" style={[s.card, s.pad]}>
          <Text style={s.body}>{twoSystemsUi("guestInvite", language)}</Text>
          {props.onSignIn ? <SmallButton label={vi ? "Đăng nhập" : "Sign in"} onPress={props.onSignIn} /> : null}
        </View>
      </View>
    );
  }

  if (props.savedCharts.status === "loading") {
    return (
      <View testID="two-systems-screen" style={s.root}>
        {header}
        <Text style={s.detail}>{vi ? "Đang đọc dữ liệu trên máy…" : "Reading data on this device…"}</Text>
      </View>
    );
  }

  const chart = props.savedCharts.status === "ready" ? props.savedCharts.charts[0] : undefined;
  const view = twoSystemsView({ language, signs: certainSigns(chart?.chart), hasChart: Boolean(chart), birthDate: props.birthDate, savedName });
  const fixes: Record<TwoSystemsFix, { label: string; onPress?: () => void }> = {
    editBirth: { label: vi ? "Sửa ngày, giờ, nơi sinh" : "Edit birth details", onPress: props.onEditBirth },
    makeChart: { label: vi ? "Lập lá số" : "Make my chart", onPress: props.onMakeChart },
    openNumerology: { label: vi ? "Mở Bản đồ số" : "Open the Number Map", onPress: props.onOpenNumerology }
  };

  return (
    <View testID="two-systems-screen" style={s.root}>
      {header}
      {view.draft ? (
        <Text testID="two-systems-draft-note" style={s.draft}>
          {vi ? "Bản thử: nội dung đang chờ duyệt." : "Test version: this text is waiting for review."}
        </Text>
      ) : null}
      {[view.sun, view.moon].map((axis) => (
        <Axis key={axis.kind} axis={axis} language={language} premium={props.premium} fix={axis.status === "missing" ? fixes[axis.fix] : undefined}
          onOpenPremium={props.onOpenPremium} onWriteJournal={props.onWriteJournal} />
      ))}
      <Text style={s.note}>{twoSystemsUi("sourceNote", language)}</Text>
    </View>
  );
}

function Axis({ axis, language, premium, fix, onOpenPremium, onWriteJournal }: {
  axis: TwoSystemsAxis;
  language: Language;
  premium: boolean;
  fix?: { label: string; onPress?: () => void };
  onOpenPremium?: () => void;
  onWriteJournal?: (prompt: string) => void;
}) {
  const vi = language === "vi";
  return (
    <View testID={`two-systems-${axis.kind}`} style={s.section}>
      <Text style={s.kicker} accessibilityRole="header">{axis.title}</Text>
      <View style={[s.card, s.pad]}>
        {axis.status === "loading" ? (
          <Text style={s.detail}>{vi ? "Đang đọc dữ liệu trên máy…" : "Reading data on this device…"}</Text>
        ) : axis.status === "missing" ? (
          <View testID={`two-systems-${axis.kind}-${axis.reason}`} style={s.invite}>
            <Text style={s.body}>{axis.text}</Text>
            {fix?.onPress ? <SmallButton label={fix.label} onPress={fix.onPress} /> : null}
          </View>
        ) : (
          <>
            <View style={s.chips}>
              {axis.chips.map((chip) => (
                <View key={chip.key} style={s.chip} accessible accessibilityLabel={chip.accessibilityLabel}>
                  <Ionicons name={chip.key === "sign" ? (axis.kind === "sun" ? "sunny-outline" : "moon-outline") : "keypad-outline"} size={14} color={colors.gold} />
                  <Text style={s.chipText}>{chip.label}</Text>
                </View>
              ))}
            </View>
            <Text style={s.detail}>{axis.frame}</Text>
            {axis.master ? (
              <View testID={`two-systems-${axis.kind}-master`} style={s.masterBox}>
                <Text style={s.detail}>{axis.master.note}</Text>
                <Text style={s.detail}>{axis.master.nuance}</Text>
              </View>
            ) : null}
            {axis.block ? (
              <>
                <Part label={twoSystemsUi("meetLabel", language)} text={axis.block.meet} />
                {premium ? (
                  <>
                    <Part label={twoSystemsUi("differLabel", language)} text={axis.block.differ} />
                    <Part label={twoSystemsUi("questionLabel", language)} text={axis.block.question} />
                    {onWriteJournal ? (
                      <SmallButton testID={`two-systems-${axis.kind}-journal`} label={twoSystemsUi("writeJournal", language)}
                        accessibilityLabel={`${twoSystemsUi("writeJournal", language)}: ${axis.block.question}`}
                        onPress={() => onWriteJournal(axis.block!.question)} />
                    ) : null}
                  </>
                ) : (
                  <Locked language={language} onOpenPremium={onOpenPremium} testID={`two-systems-${axis.kind}-locked`} />
                )}
              </>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

function Part({ label, text }: { label: string; text: string }) {
  return (
    <View style={s.part}>
      <Text style={s.partLabel}>{label}</Text>
      <Text style={s.body}>{text}</Text>
    </View>
  );
}

/** Free: the labels of the two Premium parts, dimmed, with a Premium tag. No text, no countdown. */
function Locked({ language, onOpenPremium, testID }: { language: Language; onOpenPremium?: () => void; testID: string }) {
  const tag = twoSystemsUi("premiumLocked", language);
  const differ = twoSystemsUi("differLabel", language);
  const question = twoSystemsUi("questionLabel", language);
  const content = (
    <>
      <View style={s.dimmed}>
        <Text style={s.partLabel}>{differ}</Text>
        <Text style={s.partLabel}>{question}</Text>
      </View>
      <View style={s.lockTag}>
        <Ionicons name="lock-closed-outline" size={13} color={colors.gold} />
        <Text style={s.lockText}>{tag}</Text>
      </View>
    </>
  );
  const label = `${tag}: ${differ}, ${question}`;
  return onOpenPremium ? (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onOpenPremium} style={s.locked}>{content}</Pressable>
  ) : (
    <View testID={testID} accessible accessibilityLabel={label} style={s.locked}>{content}</View>
  );
}

// Brand styles follow WhoAmI.tsx. No fixed heights, so the text can grow at large font sizes.
const s = StyleSheet.create({
  root: { gap: 16, paddingTop: 8 },
  intro: { gap: 6 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 24 },
  body: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 21 },
  detail: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  note: { color: "#8F877C", fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 17 },
  draft: { color: "#E3B583", fontFamily: typography.bodyFontFamily, fontSize: 12, lineHeight: 17 },
  section: { gap: 8 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  card: { borderRadius: radius.card, backgroundColor: "#1F1C1E", overflow: "hidden" },
  pad: { padding: 14, gap: 10 },
  invite: { gap: 10, alignItems: "flex-start" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)" },
  chipText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13, flexShrink: 1 },
  masterBox: { gap: 4, padding: 10, borderRadius: radius.card, backgroundColor: "rgba(247, 241, 230, 0.04)" },
  part: { gap: 4 },
  partLabel: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12.5 },
  locked: { minHeight: layout.minimumTouchTarget, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 10, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.25)" },
  dimmed: { opacity: 0.45, gap: 4, flexShrink: 1 },
  lockTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "rgba(201, 164, 92, 0.16)" },
  lockText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12 },
  small: { minHeight: layout.minimumTouchTarget, minWidth: layout.minimumTouchTarget, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.18)", alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  smallText: { color: "#E9E2D6", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13.5 }
});
