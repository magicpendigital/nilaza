import Ionicons from "@expo/vector-icons/Ionicons";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BackHandler, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../../theme";
import type { Language } from "../../types";
import { CardLibrary, type LibraryCard } from "../tarot/CardLibrary";
import { drawRandomCards, type RandomSource } from "../tarot/randomDraw";

// Xem thử không cần tài khoản (analysis N-01, Owner decision 2026-10-31): static content only, the
// 78-card library with meanings and the 12 sign guides. Nothing here calls AI or stores data.
// Tarot v2 pack 0 (Owner 2026-11-16, Q2): a guest can also draw a card here and see its picture, name and orientation,
// but not the meaning of the reading; the meaning asks for an account. The draw is local, sends nothing and is not saved.
type Tab = "cards" | "draw" | "signs";

export function GuestPreview({ language, deckName, cards, renderCard, signs, renderSign, onCreateAccount, onSignIn, onExit, random }: {
  language: Language;
  deckName: string;
  cards: LibraryCard[];
  renderCard: (cardId: string, open: (cardId: string) => void) => ReactNode;
  signs: { id: string; name: string }[];
  renderSign: (signId: string) => ReactNode;
  onCreateAccount: () => void;
  onSignIn: () => void;
  onExit: () => void;
  /** Test seam for the guest draw. */
  random?: RandomSource;
}) {
  const vi = language === "vi";
  const [tab, setTab] = useState<Tab>("cards");
  const [cardId, setCardId] = useState<string | null>(null);
  const [signId, setSignId] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<{ card: LibraryCard; reversed: boolean } | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const detailOpen = Boolean(tab === "cards" ? cardId : signId);
  const back = () => {
    if (detailOpen) {
      setCardId(null);
      setSignId(null);
      return;
    }
    onExit();
  };
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { backRef.current(); return true; });
    return () => subscription.remove();
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo?.({ y: 0, animated: false }); }, [tab, cardId, signId]);
  const openCard = (id: string) => setCardId(id);
  const drawOne = () => {
    const pick = drawRandomCards(1, cards.length, { random })[0];
    if (pick) setDrawn({ card: cards[pick.index], reversed: pick.reversed });
  };

  return (
    <View style={s.root}>
      <View style={s.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Quay lại" : "Back"} onPress={back} style={s.iconButton}>
          <Ionicons name="arrow-back-outline" size={20} color={colors.ivory} />
        </Pressable>
        <Text style={s.topTitle}>{vi ? "Xem thử Nilaza" : "Explore Nilaza"}</Text>
        <View style={s.iconButton} />
      </View>
      {!detailOpen ? (
        <View accessibilityRole="tablist" style={s.tabs}>
          {([["cards", vi ? "78 lá bài" : "78 cards"], ["draw", vi ? "Rút bài" : "Draw"], ["signs", vi ? "12 cung" : "12 signs"]] as const).map(([id, label]) => (
            <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} onPress={() => setTab(id)} style={[s.tab, tab === id && s.tabActive]}>
              <Text style={[s.tabText, tab === id && s.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <ScrollView ref={scrollRef} contentContainerStyle={s.content}>
        {tab === "draw" ? (
          <View style={s.drawBox}>
            <Text accessibilityRole="header" style={s.detailTitle}>{vi ? "Rút một lá cho bạn" : "Draw a card for you"}</Text>
            <Text style={s.drawLead}>{vi
              ? "Hít một hơi, nghĩ về điều bạn đang bận lòng, rồi rút. Xem lá bài là miễn phí; ý nghĩa của bài đọc dành cho tài khoản Nilaza."
              : "Take a breath, think of what is on your mind, then draw. Seeing the card is free; the meaning of the reading is for Nilaza accounts."}</Text>
            {drawn ? (
              <View style={s.drawResult}>
                <Image source={drawn.card.image} resizeMode="contain" style={[s.drawImage, drawn.reversed && s.drawImageReversed]}
                  accessibilityLabel={`${drawn.card.name}. ${drawn.reversed ? (vi ? "Lá ngược" : "Reversed") : (vi ? "Lá xuôi" : "Upright")}`} />
                <Text style={s.drawName}>{drawn.card.name}</Text>
                <Text style={s.drawSub}>{[drawn.card.sub, drawn.reversed ? (vi ? "Ngược" : "Reversed") : (vi ? "Xuôi" : "Upright")].filter(Boolean).join(" · ")}</Text>
                <View style={s.lockPanel}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.gold} accessible={false} />
                  <Text style={s.lockTitle}>{vi ? "Ý nghĩa của bài đọc dành cho tài khoản" : "The meaning of the reading is for accounts"}</Text>
                  <Text style={s.lockBody}>{vi
                    ? "Đăng nhập để xem lá này nói gì về câu hỏi của bạn, lưu vào Nhật ký và hỏi sâu hơn."
                    : "Sign in to see what this card says about your question, keep it in your Journal and go deeper."}</Text>
                  <View style={s.dockRow}>
                    <Pressable accessibilityRole="button" onPress={onSignIn} style={[s.dockButton, s.dockSecondary]}>
                      <Text style={s.dockSecondaryText}>{vi ? "Đăng nhập để xem ý nghĩa" : "Sign in to see the meaning"}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={onCreateAccount} style={[s.dockButton, s.dockPrimary]}>
                      <Text style={s.dockPrimaryText}>{vi ? "Tạo tài khoản" : "Create account"}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
            <Pressable accessibilityRole="button" onPress={drawOne} style={[s.drawButton, drawn && s.drawButtonQuiet]}>
              <Text style={[s.drawButtonText, drawn && s.drawButtonTextQuiet]}>{drawn ? (vi ? "Rút lại" : "Draw again") : (vi ? "Rút một lá" : "Draw a card")}</Text>
            </Pressable>
          </View>
        ) : tab === "cards"
          ? cardId ? renderCard(cardId, openCard) : <CardLibrary language={language} deckName={deckName} cards={cards} onOpen={openCard} onPreview={openCard} />
          : signId ? (
            <View>
              <Text accessibilityRole="header" style={s.detailTitle}>{signs.find((sign) => sign.id === signId)?.name}</Text>
              {renderSign(signId)}
            </View>
          ) : (
            <View style={s.signGrid}>
              {signs.map((sign) => (
                <Pressable key={sign.id} accessibilityRole="button" onPress={() => setSignId(sign.id)} style={s.signChip}>
                  <Text style={s.signText}>{sign.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
      </ScrollView>
      <View style={s.dock}>
        <Text style={s.dockText}>
          {vi ? "Tạo tài khoản để rút bài, trò chuyện với người dẫn đường và lưu Nhật ký." : "Create an account to draw cards, talk with guides and keep a Journal."}
        </Text>
        <View style={s.dockRow}>
          <Pressable accessibilityRole="button" onPress={onSignIn} style={[s.dockButton, s.dockSecondary]}>
            <Text style={s.dockSecondaryText}>{vi ? "Đăng nhập" : "Sign in"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCreateAccount} style={[s.dockButton, s.dockPrimary]}>
            <Text style={s.dockPrimaryText}>{vi ? "Tạo tài khoản" : "Create account"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.charcoal },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  topTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16 },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tab: { minHeight: 40, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.2)", alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.ivory, borderColor: colors.ivory },
  tabText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14 },
  tabTextActive: { color: colors.charcoal },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  detailTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 32, lineHeight: 38, marginBottom: 12 },
  drawBox: { gap: 12, paddingTop: 4 },
  drawLead: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 23 },
  drawResult: { alignItems: "center", gap: 8, paddingTop: 8 },
  drawImage: { width: 190, height: 327 },
  drawImageReversed: { transform: [{ rotate: "180deg" }] },
  drawName: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 28, lineHeight: 32, textAlign: "center" },
  drawSub: { color: "#B8B0A4", fontFamily: typography.bodyFontFamily, fontSize: 13.5, textAlign: "center" },
  lockPanel: { alignSelf: "stretch", gap: 8, padding: 16, marginTop: 8, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.45)", backgroundColor: "#1F1C1E" },
  lockTitle: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15.5 },
  lockBody: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 21 },
  drawButton: { minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center", marginTop: 8 },
  drawButtonQuiet: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.25)" },
  drawButtonText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15.5 },
  drawButtonTextQuiet: { color: colors.ivory },
  signGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 8 },
  signChip: { minHeight: 48, minWidth: "30%", flexGrow: 1, paddingHorizontal: 14, borderRadius: radius.card, borderWidth: 1, borderColor: "rgba(201, 164, 92, 0.4)", alignItems: "center", justifyContent: "center", backgroundColor: "#1F1C1E" },
  signText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  dock: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: "rgba(247, 241, 230, 0.12)", backgroundColor: "#1A1719" },
  dockText: { color: "#E9E2D6", fontFamily: typography.bodyFontFamily, fontSize: 13.5, lineHeight: 19 },
  dockRow: { flexDirection: "row", gap: 10 },
  dockButton: { flex: 1, minHeight: 48, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  dockPrimary: { backgroundColor: colors.ivory },
  dockPrimaryText: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 },
  dockSecondary: { borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.25)" },
  dockSecondaryText: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 14.5 }
});
