import { signs } from "../../../../../../packages/astrology-core/calculator.mjs";
import { nextMoonEvent } from "../../home/moonPhase";
import { fixedZone } from "../localDay";
import { bigThreeOf, moonHouseToday, moonSignAt } from "../sky";
import { big3Story, moonTodayFor, topicReading } from "../skyContent";

const chart = (birthTimeKnown: boolean) => ({
  placements: birthTimeKnown ? [{ body: "sun", sign: "pisces" }, { body: "moon", sign: "cancer" }, { body: "venus", sign: "aries" }, { body: "mars", sign: "taurus" }, { body: "saturn", sign: "leo" }] : [],
  angles: birthTimeKnown ? [{ body: "ascendant", sign: "cancer" }, { body: "midheaven", sign: "aries" }] : [],
  // Unknown time: the calculator samples the day instead; the Moon may change signs.
  sampledRanges: birthTimeKnown ? [] : [{ body: "sun", possibleSigns: ["pisces"] }, { body: "moon", possibleSigns: ["cancer", "leo"] }, { body: "venus", possibleSigns: ["aries"] }, { body: "mars", possibleSigns: ["taurus"] }, { body: "saturn", possibleSigns: ["leo"] }],
  // Whole Sign houses starting from the Cancer ascendant.
  houses: birthTimeKnown ? Array.from({ length: 12 }, (_, index) => ({ house: index + 1, sign: signs[(3 + index) % 12] })) : [],
  time: { birthTimeKnown, precision: birthTimeKnown ? "exact" : "unknown" }
}) as any;

test("Big 3 comes from the chart, Rising only with a birth time", () => {
  expect(bigThreeOf(chart(true))).toEqual({ sun: ["pisces"], moon: ["cancer"], rising: "cancer", timeKnown: true });
  expect(bigThreeOf(chart(false))).toEqual({ sun: ["pisces"], moon: ["cancer", "leo"], timeKnown: false });
});

test("today's Moon lands in the Whole Sign house of its sign", () => {
  const now = new Date("2026-10-31T12:00:00Z");
  expect(moonSignAt(now)).toBe("cancer");
  expect(moonHouseToday(chart(true), now)).toEqual({ house: 1, sign: "cancer" });
  expect(moonHouseToday(chart(false), now)).toBeNull();
});

test("next full or new moon is counted in whole days", () => {
  // Counted in local calendar days: 18 Jan to the full moon on 25 Jan 2024 is 7.
  expect(nextMoonEvent(new Date("2024-01-18T03:53:00Z"), fixedZone(0))).toMatchObject({ kind: "full", days: 7 });
  expect(nextMoonEvent(new Date("2024-02-02T23:18:00Z"), fixedZone(0))).toMatchObject({ kind: "new", days: 7 });
  // On the full moon itself the next event is today.
  expect(nextMoonEvent(new Date("2024-01-25T17:54:00Z"), fixedZone(0))).toMatchObject({ kind: "full", days: 0 });
});

test("Big 3 story joins the approved fragments and invites a birth time when it is missing", () => {
  const exact = big3Story(bigThreeOf(chart(true))!, "vi");
  expect(exact.headline).toBe("Người mơ mộng biết cách che chở");
  expect(exact.lines).toEqual(["Bạn cảm nhận sâu và cần một chốn an toàn trước khi mở lòng.", "Người khác thường thấy ở bạn sự dịu dàng, ân cần và dễ gần."]);
  expect(exact.needsBirthTime).toBe(false);
  const unknown = big3Story(bigThreeOf(chart(false))!, "vi");
  // The Moon has two possible signs, so the headline keeps only the Sun opening and no Rising line is shown.
  expect(unknown.headline).toBe("Người mơ mộng");
  expect(unknown.lines.some((line) => line.startsWith("Người khác thường thấy"))).toBe(false);
  expect(unknown.lines.at(-1)).toContain("giờ sinh chính xác");
  expect(unknown.needsBirthTime).toBe(true);
});

test("Moon-in-house text uses the renamed house 6", () => {
  expect(moonTodayFor(6, "vi").title).toBe("Mặt Trăng đi qua nhà nhịp sống hằng ngày của bạn");
  expect(moonTodayFor(1, "vi").labels).toEqual({ do: "Nghiêng về", avoid: "Nhẹ tay với" });
});

test("topic tabs read two placements and fall back to the invite without a birth time", () => {
  const career = topicReading(chart(true), "career", "vi");
  expect(career.points.map((point) => [point.name, point.sign])).toEqual([["Thiên đỉnh", "aries"], ["Sao Thổ", "leo"]]);
  expect(career.points[0].title).toBe("Bạn muốn mở đường và dẫn đầu");
  expect(career.missingTime).toBe(false);
  expect(career.reminder).toBe("Đây là gợi ý để tự soi chiếu, không phải dự đoán.");
  expect(topicReading(chart(true), "self", "vi").birthTimeNote).toBe("Nếu bạn chưa chắc giờ sinh, phần này có thể khác.");
  const unknownCareer = topicReading(chart(false), "career", "vi");
  expect(unknownCareer.points.map((point) => point.sign)).toEqual([undefined, "leo"]);
  expect(unknownCareer.missingTime).toBe(true);
  // Without a birth time neither the Moon (two signs) nor Rising can be read.
  const unknownSelf = topicReading(chart(false), "self", "vi");
  expect(unknownSelf.points.every((point) => !point.sign)).toBe(true);
  expect(unknownSelf.birthTimeNote).toBeUndefined();
  expect(topicReading(chart(false), "love", "vi").missingTime).toBe(false);
});
