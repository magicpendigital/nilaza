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

it("drops malformed card ids and keeps at most three", () => {
  const url = buildShareUrl({ language: "en", surface: "tarot_reading", id: "abc12345", cardIds: ["ok-one", "BAD ID", "<script>", "ok-two", "ok-three", "ok-four"] });
  expect(parse(url).searchParams.get("c")).toBe("ok-one,ok-two,ok-three");
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

it("writes a short message with the link and the reflection note, per language", () => {
  const vi = shareLinkMessage("vi", "astro_invite", "https://x.test/a");
  const en = shareLinkMessage("en", "today_card", "https://x.test/b");
  expect(vi).toContain("https://x.test/a");
  expect(vi).toContain("Để tự phản chiếu");
  expect(en).toContain("https://x.test/b");
  expect(en).toContain("For self-reflection");
});
