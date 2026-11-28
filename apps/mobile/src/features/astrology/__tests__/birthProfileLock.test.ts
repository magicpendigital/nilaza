import { calculateChart } from "../../../../../../packages/astrology-core/calculator.mjs";
import {
  BIRTH_PROFILE_EDIT_LIMIT,
  BIRTH_PROFILE_EDIT_WINDOW_DAYS,
  BIRTH_PROFILE_LOCKED_MESSAGE,
  birthProfileLockedMessage,
  clearBirthProfileLock,
  evaluateBirthProfileChange,
  sha256Hex,
  validBirthProfileLock,
  type BirthProfileLock,
} from "../birthProfileLock";
import { astrologyStorageKey, clearAstrologyBirthData, freshAstrologyData, validAstrologyData } from "../persistence";
import { astrologyReplayNotice } from "../astrologyAiInsight";

test("replay notice says the earlier reading is kept and no turn was used", () => {
  expect(astrologyReplayNotice("vi")).toBe("Nilaza giữ nguyên diễn giải trước cho chủ đề này để kết quả luôn nhất quán — không tốn thêm lượt.");
  expect(astrologyReplayNotice("en")).toContain("No extra turn");
});

const salt = "00112233445566778899aabbccddeeff";
const base = {
  revision: 1,
  date: "2000-01-01",
  time: "12:00",
  precision: "exact" as const,
  place: { id: "fixture", source: "test", confirmed: true as const, latitude: 21, longitude: 105, timezone: "Asia/Ho_Chi_Minh" },
};
const at = (day: number) => new Date(Date.UTC(2026, 10, 15 + day, 3));

function allowed(lock: BirthProfileLock | undefined, input: typeof base | Record<string, unknown>, day: number, existing?: typeof base) {
  const decision = evaluateBirthProfileChange(lock, input as typeof base, at(day), { salt, existing });
  if (!decision.allowed) throw new Error("expected allowed");
  return decision;
}

test("sha256 matches known vectors (ASCII and UTF-8)", () => {
  expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))
    .toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  expect(sha256Hex("Hồ sơ")).toBe(require("crypto").createHash("sha256").update("Hồ sơ", "utf8").digest("hex"));
  expect(sha256Hex("x".repeat(1000))).toBe(require("crypto").createHash("sha256").update("x".repeat(1000)).digest("hex"));
});

test("first chart starts the lock without a revision; the same details again change nothing", () => {
  const first = allowed(undefined, base, 0);
  expect(first.persist).toBe(true);
  expect(first.lock.revisions).toHaveLength(0);
  expect(first.lock.currentHash).toMatch(/^[0-9a-f]{64}$/);
  expect(validBirthProfileLock(first.lock)).toBe(true);
  // Only hashes are stored, never the birth details themselves.
  expect(JSON.stringify(first.lock)).not.toContain("2000-01-01");
  expect(JSON.stringify(first.lock)).not.toContain("fixture");
  const again = allowed(first.lock, { ...base, revision: 9 }, 1);
  expect(again.persist).toBe(false);
  expect(again.lock).toBe(first.lock);
});

test(`allows ${BIRTH_PROFILE_EDIT_LIMIT} corrections in ${BIRTH_PROFILE_EDIT_WINDOW_DAYS} days, each with a hashed revision, then locks`, () => {
  let lock = allowed(undefined, base, 0).lock;
  const one = allowed(lock, { ...base, date: "2000-01-02" }, 1);
  expect(one.revision).toMatchObject({ kind: "edit", beforeHash: lock.currentHash, afterHash: one.lock.currentHash });
  lock = one.lock;
  lock = allowed(lock, { ...base, time: "13:00" }, 2).lock;
  expect(lock.revisions.map(item => item.kind)).toEqual(["edit", "edit"]);
  const third = evaluateBirthProfileChange(lock, { ...base, time: "14:00" }, at(3), { salt });
  expect(third).toMatchObject({ allowed: false, reason: "locked" });
  expect(third.lock).toBe(lock);
  // Going back to the details in use is not an edit.
  expect(allowed(lock, { ...base, time: "13:00" }, 30).persist).toBe(false);
});

test("after the window closes, a correction is refused even with edits left", () => {
  const lock = allowed(undefined, base, 0).lock;
  expect(allowed(lock, { ...base, date: "2000-01-03" }, BIRTH_PROFILE_EDIT_WINDOW_DAYS - 1).revision?.kind).toBe("edit");
  expect(evaluateBirthProfileChange(lock, { ...base, date: "2000-01-03" }, at(BIRTH_PROFILE_EDIT_WINDOW_DAYS), { salt }).allowed).toBe(false);
});

test("adding an exact birth time to the same date and place is free once", () => {
  const unknown = { ...base, precision: "unknown" as const, time: undefined };
  let lock = allowed(undefined, unknown, 0).lock;
  const added = allowed(lock, base, 20);
  expect(added.revision?.kind).toBe("add_time");
  lock = added.lock;
  expect(evaluateBirthProfileChange(lock, { ...base, time: "18:00" }, at(21), { salt }).allowed).toBe(false);
  // A different place is a correction, not "adding a time".
  const other = allowed(undefined, unknown, 0).lock;
  expect(evaluateBirthProfileChange(other, { ...base, place: { ...base.place, id: "other", latitude: 10 } }, at(20), { salt }).allowed).toBe(false);
});

test("charts saved before the lock existed seed it, so a different input counts as a correction", () => {
  const seeded = allowed(undefined, { ...base, date: "1999-12-31" }, 0, base);
  expect(seeded.revision?.kind).toBe("edit");
  expect(seeded.lock.revisions).toHaveLength(1);
  const same = allowed(undefined, base, 0, base);
  expect(same.persist).toBe(true);
  expect(same.lock.revisions).toHaveLength(0);
});

test("clearing birth data rotates the salt and forgets the details but keeps the history", () => {
  let lock = allowed(undefined, base, 0).lock;
  lock = allowed(lock, { ...base, date: "2000-01-02" }, 1).lock;
  lock = allowed(lock, { ...base, date: "2000-01-03" }, 1).lock;
  const cleared = clearBirthProfileLock(lock, "ffeeddccbbaa99887766554433221100")!;
  expect(cleared.salt).not.toBe(lock.salt);
  expect(cleared.currentHash).toBeNull();
  expect(cleared.revisions).toEqual(lock.revisions);
  expect(validBirthProfileLock(cleared)).toBe(true);
  const reentry = evaluateBirthProfileChange(cleared, base, at(40));
  expect(reentry.allowed && reentry.revision?.kind).toBe("reentry");
  // Edits used before clearing still count afterwards.
  expect(evaluateBirthProfileChange(reentry.lock, { ...base, date: "2000-02-02" }, at(2)).allowed).toBe(false);
  expect(clearBirthProfileLock(undefined)).toBeUndefined();
});

test("lock records are validated strictly and travel with Astrology data", () => {
  const lock = allowed(allowed(undefined, base, 0).lock, { ...base, date: "2000-01-02" }, 1).lock;
  expect(validBirthProfileLock({ ...lock, extra: 1 })).toBe(false);
  expect(validBirthProfileLock({ ...lock, salt: "short" })).toBe(false);
  expect(validBirthProfileLock({ ...lock, currentHash: "2000-01-01" })).toBe(false);
  expect(validBirthProfileLock({ ...lock, revisions: [{ ...lock.revisions[0], birthDate: "2000-01-01" }] })).toBe(false);
  expect(validBirthProfileLock({ ...lock, revisions: [{ ...lock.revisions[0], at: "2026-01-01T00:00:00Z" }, { ...lock.revisions[0], at: "2025-01-01T00:00:00Z" }] })).toBe(false);
  const data = { ...freshAstrologyData(), nextRevision: 2, reports: [{ id: "r1", createdAt: "2026-11-15T00:00:00Z", placeName: "Fixture", input: base, chart: calculateChart(base) }] };
  expect(validAstrologyData({ ...data, birthProfileLock: lock })).toBe(true);
  expect(validAstrologyData({ ...data, birthProfileLock: { ...lock, schemaVersion: "v0" } })).toBe(false);
});

test("clearAstrologyBirthData keeps the lock history with a new salt", async () => {
  const lock = allowed(allowed(undefined, base, 0).lock, { ...base, date: "2000-01-02" }, 1).lock;
  const store = new Map<string, unknown>([[astrologyStorageKey, { ...freshAstrologyData(), nextRevision: 2, birthProfileLock: lock }]]);
  const storage = {
    loadJson: async <T,>(key: string, fallback: T) => (store.has(key) ? store.get(key) : fallback) as T,
    saveJsonOrThrow: async <T,>(key: string, value: T) => { store.set(key, JSON.parse(JSON.stringify(value))); },
  };
  await clearAstrologyBirthData(storage);
  const saved = store.get(astrologyStorageKey) as ReturnType<typeof freshAstrologyData> & { birthProfileLock: BirthProfileLock };
  expect(validAstrologyData(saved)).toBe(true);
  expect(saved.birthProfileLock.currentHash).toBeNull();
  expect(saved.birthProfileLock.salt).not.toBe(lock.salt);
  expect(saved.birthProfileLock.revisions).toEqual(lock.revisions);
  store.set(astrologyStorageKey, { ...freshAstrologyData() });
  await clearAstrologyBirthData(storage);
  expect(store.get(astrologyStorageKey)).not.toHaveProperty("birthProfileLock");
});

test("the locked message is gentle and points to support", () => {
  expect(birthProfileLockedMessage("vi")).toBe("Hồ sơ sinh đã được khoá để kết quả luôn nhất quán. Nếu bạn nhập nhầm, hãy liên hệ hỗ trợ");
  expect(birthProfileLockedMessage("en")).toBe(BIRTH_PROFILE_LOCKED_MESSAGE.en);
});
