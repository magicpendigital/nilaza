import {
  dailyCardIndex,
  formatTarotUnlockTime,
  mapServerCards,
  parseTarotClarifier,
  parseTarotGuestDraw,
  parseTarotServerDraw,
  tarotLimitMessage,
  tarotLockedNote,
  utc7DateKey
} from "../serverDraw";

// P1-A (nil-p1-tarot-lock-2026-11-15): one event, one answer.
describe("serverDraw", () => {
  const draw = {
    drawId: "11111111-2222-4333-8444-555555555555", status: "queued", replayed: false, spread: "past-present-future", topic: "love",
    lockDate: "2026-11-16", nextDrawAt: "2026-11-16T17:00:00.000Z",
    cards: [
      { id: "major-00-the-fool", positionKey: "past", reversed: false },
      { id: "major-01-the-magician", positionKey: "present", reversed: true },
      { id: "major-02-the-high-priestess", positionKey: "potential", reversed: false }
    ]
  };

  it("uses the Vietnam day: 23:30 UTC is already the next day in Vietnam", () => {
    expect(utc7DateKey(new Date("2026-11-15T16:59:59.000Z"))).toBe("2026-11-15");
    expect(utc7DateKey(new Date("2026-11-15T17:00:00.000Z"))).toBe("2026-11-16");
    expect(utc7DateKey(new Date("2026-11-15T23:30:00.000Z"))).toBe("2026-11-16");
  });

  it("keeps the Home card for the whole day and account, whatever the profile says", () => {
    const first = dailyCardIndex("user-a", "2026-11-16", 78);
    expect(dailyCardIndex("user-a", "2026-11-16", 78)).toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(78);
    const days = new Set(Array.from({ length: 10 }, (_, day) => dailyCardIndex("user-a", `2026-11-${String(day + 10).padStart(2, "0")}`, 78)));
    expect(days.size).toBeGreaterThan(1);
    expect(dailyCardIndex(null, "2026-11-16", 78)).toBe(dailyCardIndex(undefined, "2026-11-16", 78));
    expect(dailyCardIndex("user-a", "2026-11-16", 0)).toBe(0);
  });

  it("accepts the server draw and refuses anything unexpected", () => {
    expect(parseTarotServerDraw(draw)).toMatchObject({ drawId: draw.drawId, status: "queued", lockDate: "2026-11-16", cards: draw.cards });
    expect(parseTarotServerDraw({ ...draw, cards: [draw.cards[0], draw.cards[0]] })).toBeNull();
    expect(parseTarotServerDraw({ ...draw, cards: [] })).toBeNull();
    expect(parseTarotServerDraw({ ...draw, status: "maybe" })).toBeNull();
    expect(parseTarotServerDraw({ ...draw, cards: [{ id: "major-00-the-fool", positionKey: "past", reversed: "yes" }] })).toBeNull();
    expect(parseTarotServerDraw({ ...draw, clarifier: { cardId: "x" } })).toBeNull();
    expect(parseTarotServerDraw(null)).toBeNull();
  });

  it("reads a clarifier with its library text", () => {
    const clarifier = { cardId: "major-03-the-empress", reversed: true, name: { vi: "Hoàng Hậu", en: "The Empress" }, meaning: { en: "Meaning" },
      reflectionQuestion: { vi: "Hỏi?", en: "Ask?" }, drawnAt: "2026-11-16T03:00:00.000Z" };
    expect(parseTarotClarifier(clarifier)).toEqual(clarifier);
    expect(parseTarotClarifier({ ...clarifier, reversed: "no" })).toBeNull();
    expect(parseTarotClarifier({ ...clarifier, meaning: "plain" })).toBeNull();
  });

  it("maps server cards to app cards in the server order with the spread labels", () => {
    const catalog = [
      { id: "major-02-the-high-priestess", name: "Priestess" },
      { id: "major-00-the-fool", name: "Fool" },
      { id: "major-01-the-magician", name: "Magician" }
    ];
    const mapped = mapServerCards(draw.cards, catalog, ["Quá khứ", "Hiện tại", "Tiềm năng"]);
    expect(mapped?.map(card => [card.id, card.reversed, card.spread])).toEqual([
      ["major-00-the-fool", false, "Quá khứ"],
      ["major-01-the-magician", true, "Hiện tại"],
      ["major-02-the-high-priestess", false, "Tiềm năng"]
    ]);
    expect(mapServerCards([{ id: "invented", positionKey: "past", reversed: false }], catalog, [])).toBeNull();
  });

  it("says the AI allowance, not the draw, is used up, and keeps the cards and the reference reading (Tarot v2 pack 0)", () => {
    const vi = tarotLimitMessage("vi", "delivered", "2026-11-16T17:00:00.000Z");
    expect(vi).toContain("lượt phân tích bằng AI");
    expect(vi).toContain("bài đọc có sẵn vẫn ở đây");
    expect(vi).toContain("0:00 ngày 17/11");
    expect(vi).not.toContain("mở đủ trải bài");
    expect(tarotLimitMessage("vi", "draw_cap")).toContain("mở đủ trải bài");
    expect(tarotLimitMessage("en", "delivered")).toContain("AI analysis");
  });

  it("speaks gently about the lock and the opening time in Vietnam time", () => {
    expect(formatTarotUnlockTime("2026-11-16T17:00:00.000Z", "vi")).toBe("0:00 ngày 17/11 (giờ Việt Nam)");
    expect(formatTarotUnlockTime(undefined, "vi")).toBe("đầu ngày mai (giờ Việt Nam)");
    const note = tarotLockedNote("vi", "2026-11-16T17:00:00.000Z");
    expect(note).toContain("Lá bài này vẫn còn điều muốn nói");
    expect(note).toContain("0:00 ngày 17/11");
    for (const text of [note, tarotLimitMessage("vi", "draw_cap"), tarotLimitMessage("vi", "deleted"), tarotLimitMessage("vi", "attempts"), tarotLimitMessage("vi", "delivered"), tarotLimitMessage("en", "delivered"), tarotLockedNote("en")]) {
      expect(text).not.toMatch(/streak|chuỗi|mất|lose|lost/i);
    }
  });

  it("pack 1: reads whether the account kept the cards the guest saw, false unless the server says true", () => {
    expect(parseTarotServerDraw(draw)?.guestAdopted).toBe(false);
    expect(parseTarotServerDraw({ ...draw, guestAdopted: true })?.guestAdopted).toBe(true);
    expect(parseTarotServerDraw({ ...draw, guestAdopted: "yes" })?.guestAdopted).toBe(false);
  });

  it("pack 1: validates a guest draw (cards only, no draw id) and refuses anything else", () => {
    const guest = { status: "guest_draw", spread: "daily-one", topic: "open", lockDate: "2026-11-16", nextDrawAt: "2026-11-16T17:00:00.000Z",
      cards: [{ id: "major-00-the-fool", positionKey: "daily", reversed: true }] };
    expect(parseTarotGuestDraw(guest)).toEqual({ spread: "daily-one", topic: "open", lockDate: "2026-11-16", nextDrawAt: "2026-11-16T17:00:00.000Z", cards: guest.cards });
    expect(parseTarotGuestDraw({ ...guest, nextDrawAt: "soon" })).not.toHaveProperty("nextDrawAt");
    for (const bad of [null, [], { ...guest, status: "queued" }, { ...guest, lockDate: "16/11" }, { ...guest, cards: [] },
      { ...guest, cards: [{ id: "a", positionKey: "p", reversed: "no" }] },
      { ...guest, cards: [{ id: "a", positionKey: "p", reversed: false }, { id: "a", positionKey: "q", reversed: true }] }]) {
      expect(parseTarotGuestDraw(bad)).toBeNull();
    }
  });
});
