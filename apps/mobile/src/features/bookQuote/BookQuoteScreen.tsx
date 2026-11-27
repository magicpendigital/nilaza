import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, layout, radius, typography } from "../../theme";
import type { Language } from "../../types";
import {
  SHOW_DRAFT_BOOK_QUOTES, availableBookQuoteBooks, bookQuoteAuthor, bookQuoteTabLabel, bookQuoteText, bookQuoteTitle, pickBookQuote,
  type BookQuoteBookId, type BookQuoteOfDay
} from "./content";
import {
  isBookQuoteSaved, loadSavedBookQuotes, saveSavedBookQuotes, toggleSavedBookQuote,
  type BookQuoteStorage, type SavedBookQuote
} from "./savedQuotes";

// "Một câu cho hôm nay": one quote per book per day, picked on the device from the local date.
// Layout follows the approved proposal (27/11/2026): book tabs, date, ref, serif quote, attribution,
// "Lời bình", "Câu hỏi cho bạn", three actions, the other books today, saved quotes, footnote.

const card = "#1F1C1E";
const soft = "#B8B0A4";
const body = "#E9E2D6";

type Props = {
  language: Language;
  /** Local calendar date, YYYY-MM-DD. */
  dateKey: string;
  initialBook?: BookQuoteBookId;
  /** Account storage. A guest passes nothing and saved quotes stay in memory for this session. */
  storage?: BookQuoteStorage;
  /** Short persona name for the "Hỏi tiếp …" button. */
  personaName: (personaId: string) => string;
  onAskPersona: (quote: BookQuoteOfDay) => void;
  onWriteJournal: (quote: BookQuoteOfDay) => void;
  onEvent?: (name: string, metadata?: Record<string, string | number | boolean>) => void;
  onBack: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Draft gate override; defaults to SHOW_DRAFT_BOOK_QUOTES (tests pass true to use the sample files). */
  showDrafts?: boolean;
};

export function BookQuoteScreen({ language, dateKey, initialBook, storage, personaName, onAskPersona, onWriteJournal, onEvent, onBack, contentContainerStyle, showDrafts = SHOW_DRAFT_BOOK_QUOTES }: Props) {
  const vi = language === "vi";
  const books = useMemo(() => availableBookQuoteBooks(showDrafts), [showDrafts]);
  const [book, setBook] = useState<BookQuoteBookId | undefined>(() => (initialBook && books.includes(initialBook) ? initialBook : books[0]));
  const [saved, setSaved] = useState<SavedBookQuote[]>([]);
  const savedTouched = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const quote = book ? pickBookQuote(book, dateKey, showDrafts) : null;

  useEffect(() => {
    if (book) onEvent?.("book_quote_opened", { book });
    // Only the first book counts as an open; tab changes are not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!storage) return;
    let live = true;
    void loadSavedBookQuotes(storage).then((items) => {
      if (live && !savedTouched.current) setSaved(items);
    });
    return () => { live = false; };
  }, [storage]);

  const persist = (next: SavedBookQuote[]) => {
    savedTouched.current = true;
    setSaved(next);
    if (storage) void saveSavedBookQuotes(storage, next).catch(() => undefined);
  };

  const toggleSave = () => {
    if (!quote) return;
    const entry: SavedBookQuote = {
      id: quote.item.id,
      book: quote.book,
      dateKey: quote.dateKey,
      savedAt: new Date().toISOString(),
      ref: bookQuoteText(quote.item, "ref", language),
      quote: bookQuoteText(quote.item, "quote", language)
    };
    const wasSaved = isBookQuoteSaved(saved, entry.id);
    persist(toggleSavedBookQuote(saved, entry));
    onEvent?.("book_quote_saved", { book: quote.book, saved: !wasSaved });
  };

  const switchBook = (next: BookQuoteBookId) => {
    setBook(next);
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  };

  const dateLabel = formatDateKey(dateKey, language);

  if (!quote) {
    return (
      <ScrollView testID="book-quote-screen" style={s.flex} contentContainerStyle={[s.screen, contentContainerStyle]}>
        <Header language={language} onBack={onBack} />
        <Text accessibilityRole="header" style={s.title}>{vi ? "Một câu cho hôm nay" : "A line for today"}</Text>
        <Text testID="book-quote-empty" style={s.empty}>{vi ? "Nội dung đang được hoàn thiện." : "This content is being finished."}</Text>
      </ScrollView>
    );
  }

  const isSaved = isBookQuoteSaved(saved, quote.item.id);
  const guide = personaName(quote.file.personaId);
  const title = bookQuoteTitle(quote.book, language);
  const author = bookQuoteAuthor(quote.book, language);
  const attribution = author === title ? title : `${author} · ${title}`;
  const otherBooks = books.filter((other) => other !== quote.book);

  return (
    <ScrollView ref={scrollRef} testID="book-quote-screen" style={s.flex} contentContainerStyle={[s.screen, contentContainerStyle]}>
      <Header language={language} onBack={onBack} />
      <Text accessibilityRole="header" style={s.title}>{vi ? "Một câu cho hôm nay" : "A line for today"}</Text>

      <View accessibilityRole="tablist" style={s.tabs}>
        {books.map((id) => {
          const selected = id === quote.book;
          return (
            <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={bookQuoteTitle(id, language)}
              onPress={() => switchBook(id)} style={[s.tab, selected && s.tabActive]}>
              <Text style={[s.tabText, selected && s.tabTextActive]}>{bookQuoteTabLabel(id, language)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={s.date}>{dateLabel}</Text>
      <Text style={s.ref}>{bookQuoteText(quote.item, "ref", language)}</Text>
      <Text testID="book-quote-text" style={s.quote}>{`“${bookQuoteText(quote.item, "quote", language)}”`}</Text>
      <Text style={s.attribution}>{`— ${attribution}`}</Text>
      <Text style={s.translator}>{vi ? quote.file.source.vietnamese : `English after ${quote.file.source.englishBase}`}</Text>

      <View style={s.section}>
        <Text accessibilityRole="header" style={s.kicker}>{vi ? "LỜI BÌNH" : "COMMENTARY"}</Text>
        <Text style={s.body}>{bookQuoteText(quote.item, "gloss", language)}</Text>
      </View>
      <View style={s.section}>
        <Text accessibilityRole="header" style={s.kicker}>{vi ? "CÂU HỎI CHO BẠN" : "A QUESTION FOR YOU"}</Text>
        <Text style={s.question}>{bookQuoteText(quote.item, "question", language)}</Text>
      </View>

      <View style={s.actions}>
        <Pressable accessibilityRole="button" onPress={() => onAskPersona(quote)} style={s.primary}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.charcoal} accessible={false} />
          <Text style={s.primaryText}>{vi ? `Hỏi tiếp ${guide}` : `Ask ${guide} more`}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onWriteJournal(quote)} style={s.secondary}>
          <Ionicons name="create-outline" size={18} color={colors.ivory} accessible={false} />
          <Text style={s.secondaryText}>{vi ? "Viết vào nhật ký" : "Write in journal"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: isSaved }}
          accessibilityLabel={isSaved ? (vi ? "Đã lưu. Bỏ lưu câu này" : "Saved. Remove this quote") : (vi ? "Lưu câu này" : "Save this quote")}
          onPress={toggleSave} style={s.secondary}>
          <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={18} color={colors.gold} accessible={false} />
          <Text style={s.secondaryText}>{isSaved ? (vi ? "Đã lưu" : "Saved") : (vi ? "Lưu câu này" : "Save this quote")}</Text>
        </Pressable>
      </View>

      {otherBooks.length ? (
        <View style={s.section}>
          <Text accessibilityRole="header" style={s.kicker}>{vi ? "CÁC SÁCH KHÁC HÔM NAY" : "OTHER BOOKS TODAY"}</Text>
          {otherBooks.map((id) => {
            const other = pickBookQuote(id, dateKey, showDrafts);
            if (!other) return null;
            const otherTitle = bookQuoteTitle(id, language);
            const otherQuote = bookQuoteText(other.item, "quote", language);
            return (
              <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${otherTitle}. ${otherQuote}`}
                onPress={() => switchBook(id)} style={s.otherCard}>
                <View style={s.flex}>
                  <Text style={s.otherTitle}>{otherTitle}</Text>
                  <Text style={s.otherQuote} numberOfLines={2}>{otherQuote}</Text>
                </View>
                <Text style={s.link}>{vi ? "Đọc →" : "Read →"}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {saved.length ? (
        <View style={s.section}>
          <Text accessibilityRole="header" style={s.kicker}>{vi ? "CÂU BẠN ĐÃ LƯU" : "YOUR SAVED QUOTES"}</Text>
          {saved.map((item) => (
            <View key={item.id} style={s.savedRow}>
              <View style={s.flex}>
                <Text style={s.savedMeta}>{`${bookQuoteTitle(item.book, language)} · ${item.ref}`}</Text>
                <Text style={s.savedQuote}>{item.quote}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={vi ? `Bỏ lưu: ${item.ref}` : `Remove: ${item.ref}`}
                onPress={() => persist(saved.filter((entry) => entry.id !== item.id))} style={s.iconButton}>
                <Ionicons name="close" size={18} color={colors.moon} />
              </Pressable>
            </View>
          ))}
          {!storage ? <Text style={s.note}>{vi ? "Bạn đang dùng thử: câu đã lưu chỉ giữ đến khi đóng ứng dụng." : "Guest mode: saved quotes are kept until you close the app."}</Text> : null}
        </View>
      ) : null}

      <Text style={s.footnote}>{vi ? "Mỗi sách một câu mỗi ngày; mở lại trong ngày vẫn là câu này." : "One line per book each day; reopen it today and it stays the same."}</Text>
    </ScrollView>
  );
}

function Header({ language, onBack }: { language: Language; onBack: () => void }) {
  const vi = language === "vi";
  return (
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={vi ? "Quay lại" : "Back"} onPress={onBack} hitSlop={8} style={s.iconButton}>
        <Ionicons name="chevron-back" size={22} color={colors.ivory} />
      </Pressable>
      <Text style={s.headerKicker}>{vi ? "SOI CHIẾU" : "REFLECT"}</Text>
      <View style={s.iconButton} />
    </View>
  );
}

function formatDateKey(dateKey: string, language: Language): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  try {
    return date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" });
  } catch {
    return dateKey;
  }
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  screen: { width: "100%", maxWidth: 760, alignSelf: "center", paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  iconButton: { minWidth: layout.minimumTouchTarget, minHeight: layout.minimumTouchTarget, alignItems: "center", justifyContent: "center" },
  headerKicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, letterSpacing: 1.5 },
  title: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 32, lineHeight: 38, marginTop: 4 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  tab: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.16)" },
  tabActive: { backgroundColor: colors.ivory, borderColor: colors.ivory },
  tabText: { color: body, fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 18 },
  tabTextActive: { color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily },
  date: { color: soft, fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19, marginTop: 24 },
  ref: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, lineHeight: 18, letterSpacing: 1, marginTop: 6, textTransform: "uppercase" },
  quote: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 26, lineHeight: 36, marginTop: 12 },
  attribution: { color: body, fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 20, marginTop: 14 },
  translator: { color: soft, fontFamily: typography.bodyItalicFontFamily, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  section: { marginTop: 28, gap: 10 },
  kicker: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 11, lineHeight: 16, letterSpacing: 1.5 },
  body: { color: body, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24 },
  question: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 21, lineHeight: 28 },
  actions: { marginTop: 28, gap: 10 },
  primary: { minHeight: 52, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.ivory, paddingHorizontal: 18, paddingVertical: 12 },
  primaryText: { flexShrink: 1, color: colors.charcoal, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15, lineHeight: 20, textAlign: "center" },
  secondary: { minHeight: 52, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: 18, paddingVertical: 12 },
  secondaryText: { flexShrink: 1, color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 20, textAlign: "center" },
  otherCard: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: layout.minimumTouchTarget, padding: 14, borderRadius: radius.card, backgroundColor: card, borderWidth: 1, borderColor: "rgba(247, 241, 230, 0.08)" },
  otherTitle: { color: colors.ivory, fontFamily: typography.headlineRegularFontFamily, fontSize: 18, lineHeight: 22 },
  otherQuote: { color: soft, fontFamily: typography.bodyFontFamily, fontSize: 13, lineHeight: 19, marginTop: 4 },
  link: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 13, lineHeight: 19 },
  // Saved quotes are information, not a target: a plain row with a divider, only the remove icon is tappable.
  savedRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  savedMeta: { color: soft, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 12, lineHeight: 17 },
  savedQuote: { color: body, fontFamily: typography.headlineRegularFontFamily, fontSize: 16, lineHeight: 22, marginTop: 4 },
  note: { color: soft, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18 },
  footnote: { color: soft, fontFamily: typography.bodyFontFamily, fontSize: 12.5, lineHeight: 18, marginTop: 32, textAlign: "center" },
  empty: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 22, marginTop: 24 }
});
