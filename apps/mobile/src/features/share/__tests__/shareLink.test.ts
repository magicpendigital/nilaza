import { buildShareUrl, newShareId, shareLinkMessage, SHARE_ORIGIN } from "../shareLink";

const parse = (url: string) => new URL(url);

it("builds a card link with only public card ids, the surface and a random id", () => {
  const url = buildShareUrl({ language: "vi", surface: "tarot_reading", id: "abc12345", cardIds: ["major-00-fool", "major-17-the-star"] });
  const parsed = parse(url);
  expect(`${parsed.origin}${parsed.pathname}`).toBe(`${SHARE_ORIGIN}/vi/share`);
  expect(parsed.searchParams.get("c")).toBe("major-00-fool,major-17-the-star");
  expect(parsed.searchParams.get("utm_source")).toBe("share");
  expect(parsed.searchParams.get("utm_medium")).toBe("card");
  expect(parsed.searchParams.get("utm_campaign")).toBe("tarot_reading");
  expect(parsed.searchParams.get("utm_content")).toBe("abc12345");
});

it("drops malformed card ids and keeps at most four", () => {
  const url = buildShareUrl({ language: "en", surface: "tarot_reading", id: "abc12345", cardIds: ["ok-one", "BAD ID", "<script>", "ok-two", "ok-three", "ok-four", "ok-five"] });
  expect(parse(url).searchParams.get("c")).toBe("ok-one,ok-two,ok-three,ok-four");
});

it("omits the card parameter when no valid card remains", () => {
  const url = buildShareUrl({ language: "en", surface: "today_card", id: "abc12345", cardIds: ["../etc"] });
  expect(parse(url).searchParams.has("c")).toBe(false);
});

it("builds an invite link that carries one valid Sun sign and the invite medium", () => {
  const parsed = parse(buildShareUrl({ language: "vi", surface: "astro_invite", id: "abc12345", sunSign: "leo" }));
  expect(parsed.pathname).toBe("/vi/compare");
  expect(parsed.searchParams.get("s")).toBe("leo");
  expect(parsed.searchParams.get("utm_medium")).toBe("invite");
  expect(parsed.searchParams.get("utm_campaign")).toBe("astro_invite");
});

it("never puts a made-up sign or any other detail into an astrology link", () => {
  const url = buildShareUrl({ language: "en", surface: "astro_big3", id: "abc12345", sunSign: "dragon" as never, cardIds: ["major-00-fool"] });
  const parsed = parse(url);
  expect(parsed.searchParams.has("s")).toBe(false);
  expect(parsed.searchParams.has("c")).toBe(false);
  expect([...parsed.searchParams.keys()].sort()).toEqual(["utm_campaign", "utm_content", "utm_medium", "utm_source"]);
});

it("replaces an unsafe share id with a random one", () => {
  const url = buildShareUrl({ language: "en", surface: "today_card", id: "user@example.com" });
  expect(parse(url).searchParams.get("utm_content")).toMatch(/^[a-z0-9]{8}$/);
  expect(url).not.toContain("example.com");
});

it("creates 8-character ids that depend only on the random source", () => {
  expect(newShareId(() => 0)).toBe("aaaaaaaa");
  expect(newShareId(() => 0.999999)).toBe("99999999");
  expect(newShareId()).toMatch(/^[a-z0-9]{8}$/);
});

const surfaces = ["today_card", "tarot_reading", "astro_big3", "astro_invite"] as const;
const link = "https://x.test/a";

it("writes a first-person message with the link on its own line for every surface and language", () => {
  for (const surface of surfaces) {
    for (const language of ["vi", "en"] as const) {
      const text = shareLinkMessage(language, surface, link, { cardNames: ["The Star"], signName: "Leo" });
      const lines = text.split("\n");
      expect(lines[lines.length - 1]).toBe(link);
      expect(lines.slice(0, -1).join(" ").length).toBeGreaterThan(30);
    }
  }
});

it("has no system-style disclaimer and ends the lead with an open question or invitation", () => {
  for (const surface of surfaces) {
    for (const language of ["vi", "en"] as const) {
      const text = shareLinkMessage(language, surface, link, { cardNames: ["The Star", "The Sun"], signName: "Leo" });
      expect(text).not.toMatch(/phản chiếu|dự đoán|self-reflection|prediction/i);
      expect(text.split("\n")[0]).toMatch(/[?.]$/);
    }
  }
  expect(shareLinkMessage("vi", "today_card", link, { cardNames: ["Ngôi Sao"] })).toMatch(/Bạn rút thử xem lá của bạn là gì\?/);
});

it("uses the public card name for the card of the day and falls back without one", () => {
  expect(shareLinkMessage("vi", "today_card", link, { cardNames: ["Ngôi Sao"] })).toContain("lá Ngôi Sao");
  expect(shareLinkMessage("en", "today_card", link, { cardNames: ["The Star"] })).toContain("The Star");
  const plain = shareLinkMessage("vi", "today_card", link);
  expect(plain).toContain(link);
  expect(plain).not.toContain("undefined");
});

it("lists up to four card names for a reading and clips long names", () => {
  const vi = shareLinkMessage("vi", "tarot_reading", link, { cardNames: ["Quá Khứ", "Hiện Tại", "Tương Lai", "Lời Khuyên", "Lá Thứ Năm"] });
  expect(vi).toContain("Quá Khứ, Hiện Tại, Tương Lai và Lời Khuyên");
  expect(vi).not.toContain("Lá Thứ Năm");
  expect(shareLinkMessage("en", "tarot_reading", link, { cardNames: ["A", "B"] })).toContain("A and B");
  const long = shareLinkMessage("en", "today_card", link, { cardNames: ["x".repeat(200)] });
  expect(long).toContain("x".repeat(40));
  expect(long).not.toContain("x".repeat(41));
});

it("mentions the Sun sign only when one is given and never invents other details", () => {
  expect(shareLinkMessage("vi", "astro_invite", link, { signName: "Sư Tử" })).toContain("Mặt Trời của mình ở Sư Tử");
  expect(shareLinkMessage("vi", "astro_invite", link)).not.toContain("Mặt Trời");
  expect(shareLinkMessage("en", "astro_big3", link, { signName: "Leo" })).toContain("My Sun is in Leo");
  expect(shareLinkMessage("en", "astro_big3", link)).not.toContain("undefined");
});

it("carries nothing but the lead and the link, so no question, note or birth detail can be added", () => {
  const text = shareLinkMessage("vi", "tarot_reading", link, { cardNames: ["Ngôi Sao"], question: "Tôi có nên nghỉ việc không?", notes: "bí mật", birthDate: "1990-01-01" } as never);
  expect(text.split("\n")).toHaveLength(2);
  expect(text).not.toMatch(/nghỉ việc|bí mật|1990/);
});

test("a number-map link carries no number, name or date, and no server share event exists for it", () => {
  const url = buildShareUrl({ language: "vi", surface: "numerology_map", id: "abc12345" });
  const parsed = parse(url);
  expect(parsed.pathname).toBe("/vi/share");
  expect([...parsed.searchParams.keys()].sort()).toEqual(["utm_campaign", "utm_content", "utm_medium", "utm_source"]);
  expect(parsed.searchParams.get("utm_campaign")).toBe("numerology_map");
  const message = shareLinkMessage("vi", "numerology_map", url);
  expect(message).toContain("bản đồ số");
  expect(message).not.toMatch(/\d{1,2}\/\d/);
});
