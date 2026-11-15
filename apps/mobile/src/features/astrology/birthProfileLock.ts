// Birth-profile lock (Nil P1-B, 15/11/2026).
//
// The user's own birth details may be corrected a few times soon after the first chart, then they are
// locked so Astrology readings stay consistent. This lock lives only on this device: reinstalling the app
// or clearing Astrology data on the device gets around it. What protects the AI is the server: each
// reading is locked to a hash of the chart facts (input_hash) and topic, so the same chart and topic
// always return the same stored reading without another model call.
//
// Only salted SHA-256 hashes of the birth details are kept in revisions, never the details themselves.
// Clearing birth data rotates the salt, so earlier hashes can no longer be matched to any birth date.
import type { BirthInput } from "../../../../../packages/astrology-core/calculator.mjs";

/** How many corrections of the user's own birth details are allowed. Admin may control this later. */
export const BIRTH_PROFILE_EDIT_LIMIT = 2;
/** Corrections are allowed only within this many days of the first chart. Admin may control this later. */
export const BIRTH_PROFILE_EDIT_WINDOW_DAYS = 7;
/** Upper bound on stored revisions so the local record stays small. */
export const BIRTH_PROFILE_REVISION_CAP = 50;

export const BIRTH_PROFILE_LOCKED_MESSAGE = {
  vi: "Hồ sơ sinh đã được khoá để kết quả luôn nhất quán. Nếu bạn nhập nhầm, hãy liên hệ hỗ trợ",
  en: "Your birth details are locked so your readings stay consistent. If something was entered by mistake, please contact support",
} as const;

export type BirthProfileRevisionKind =
  /** A correction of date, time or place. Counts toward the limit. */
  | "edit"
  /** First exact birth time added to the same date and place. Free, once. */
  | "add_time"
  /** Birth details entered again after the user cleared them. Free. */
  | "reentry";

export type BirthProfileRevision = {
  at: string;
  kind: BirthProfileRevisionKind;
  beforeHash: string | null;
  afterHash: string;
};

export type BirthProfileLock = {
  schemaVersion: "nilaza.astrology.birth-profile-lock.v1";
  createdAt: string;
  salt: string;
  /** Salted hash of the full birth details now in use; null before the first chart or after clearing. */
  currentHash: string | null;
  /** Salted hash of date and place only, used to recognise "added a birth time". */
  currentBaseHash: string | null;
  currentPrecision: BirthInput["precision"] | null;
  /** Append-only. */
  revisions: BirthProfileRevision[];
};

export type BirthProfileDecision =
  | { allowed: true; lock: BirthProfileLock; persist: boolean; revision?: BirthProfileRevision }
  | { allowed: false; lock: BirthProfileLock; reason: "locked" };

const HEX64 = /^[0-9a-f]{64}$/;
const SALT = /^[0-9a-f]{32}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function birthProfileLockedMessage(language: string) {
  return language === "vi" ? BIRTH_PROFILE_LOCKED_MESSAGE.vi : BIRTH_PROFILE_LOCKED_MESSAGE.en;
}

export function newBirthProfileSalt(random: () => number = secureRandomByte): string {
  return Array.from({ length: 16 }, () => (random() & 0xff).toString(16).padStart(2, "0")).join("");
}

function secureRandomByte() {
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoApi?.getRandomValues) return cryptoApi.getRandomValues(new Uint8Array(1))[0];
  return Math.floor(Math.random() * 256);
}

/** Birth facts that change the chart. The revision counter and display labels are left out. */
export function birthProfileFacts(input: BirthInput) {
  const timed = input.precision !== "unknown";
  return {
    base: ["nilaza.birth-profile.base.v1", input.date, input.place.id, input.place.latitude, input.place.longitude, input.place.timezone].join("|"),
    full: [
      "nilaza.birth-profile.full.v1", input.date, input.place.id, input.place.latitude, input.place.longitude, input.place.timezone,
      input.precision, timed ? input.time ?? "" : "", input.precision === "approximate" ? input.uncertaintyMinutes ?? "" : "",
      input.occurrence ?? "",
    ].join("|"),
  };
}

export function hashBirthProfile(salt: string, input: BirthInput) {
  const facts = birthProfileFacts(input);
  return { full: sha256Hex(`${salt}|${facts.full}`), base: sha256Hex(`${salt}|${facts.base}`) };
}

export function createBirthProfileLock(now: Date, salt = newBirthProfileSalt()): BirthProfileLock {
  return {
    schemaVersion: "nilaza.astrology.birth-profile-lock.v1",
    createdAt: now.toISOString(),
    salt,
    currentHash: null,
    currentBaseHash: null,
    currentPrecision: null,
    revisions: [],
  };
}

/**
 * Decide whether the user's own chart may be created from `input`.
 * `existing` is the newest chart already saved before this lock existed (older app versions), so a
 * different input still counts as a correction.
 */
export function evaluateBirthProfileChange(
  lock: BirthProfileLock | undefined,
  input: BirthInput,
  now: Date,
  options: { existing?: BirthInput; salt?: string } = {},
): BirthProfileDecision {
  let current = lock;
  let persist = false;
  if (!current) {
    current = createBirthProfileLock(now, options.salt);
    persist = true;
    if (options.existing) {
      const seed = hashBirthProfile(current.salt, options.existing);
      current = { ...current, currentHash: seed.full, currentBaseHash: seed.base, currentPrecision: options.existing.precision };
    }
  }
  const next = hashBirthProfile(current.salt, input);
  const at = now.toISOString();
  if (current.currentHash === null) {
    // First chart, or details entered again after the user cleared them.
    const revision: BirthProfileRevision | undefined = current.revisions.length || !persist
      ? { at, kind: "reentry", beforeHash: null, afterHash: next.full }
      : undefined;
    return { allowed: true, persist: true, revision, lock: withCurrent(current, next, input, revision) };
  }
  if (current.currentHash === next.full) return { allowed: true, persist, lock: current };
  const addsTime = current.currentBaseHash === next.base && current.currentPrecision !== "exact" && input.precision === "exact"
    && !current.revisions.some(item => item.kind === "add_time");
  if (addsTime) {
    const revision: BirthProfileRevision = { at, kind: "add_time", beforeHash: current.currentHash, afterHash: next.full };
    return { allowed: true, persist: true, revision, lock: withCurrent(current, next, input, revision) };
  }
  if (!birthProfileEditAvailable(current, now)) return { allowed: false, reason: "locked", lock: current };
  const revision: BirthProfileRevision = { at, kind: "edit", beforeHash: current.currentHash, afterHash: next.full };
  return { allowed: true, persist: true, revision, lock: withCurrent(current, next, input, revision) };
}

export function birthProfileEditsUsed(lock: BirthProfileLock) {
  return lock.revisions.filter(item => item.kind === "edit").length;
}

export function birthProfileEditAvailable(lock: BirthProfileLock, now: Date) {
  const elapsed = now.getTime() - Date.parse(lock.createdAt);
  return birthProfileEditsUsed(lock) < BIRTH_PROFILE_EDIT_LIMIT
    && elapsed < BIRTH_PROFILE_EDIT_WINDOW_DAYS * DAY_MS
    && lock.revisions.length < BIRTH_PROFILE_REVISION_CAP;
}

/** Clearing birth data forgets the current details and rotates the salt; the revision history stays. */
export function clearBirthProfileLock(lock: BirthProfileLock | undefined, salt = newBirthProfileSalt()): BirthProfileLock | undefined {
  if (!lock) return undefined;
  return { ...lock, salt, currentHash: null, currentBaseHash: null, currentPrecision: null, revisions: [...lock.revisions] };
}

function withCurrent(lock: BirthProfileLock, next: { full: string; base: string }, input: BirthInput, revision?: BirthProfileRevision): BirthProfileLock {
  return {
    ...lock,
    currentHash: next.full,
    currentBaseHash: next.base,
    currentPrecision: input.precision,
    revisions: revision ? [...lock.revisions, revision] : [...lock.revisions],
  };
}

export function validBirthProfileLock(value: unknown): value is BirthProfileLock {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const lock = value as BirthProfileLock;
  const keys = ["schemaVersion", "createdAt", "salt", "currentHash", "currentBaseHash", "currentPrecision", "revisions"];
  if (Object.keys(value).some(key => !keys.includes(key))) return false;
  if (lock.schemaVersion !== "nilaza.astrology.birth-profile-lock.v1" || !Number.isFinite(Date.parse(lock.createdAt))
    || typeof lock.salt !== "string" || !SALT.test(lock.salt)) return false;
  const nullableHash = (item: unknown) => item === null || (typeof item === "string" && HEX64.test(item));
  if (!nullableHash(lock.currentHash) || !nullableHash(lock.currentBaseHash)) return false;
  if ((lock.currentHash === null) !== (lock.currentBaseHash === null)) return false;
  if (!(lock.currentPrecision === null || ["exact", "approximate", "unknown"].includes(lock.currentPrecision))) return false;
  if ((lock.currentHash === null) !== (lock.currentPrecision === null)) return false;
  if (!Array.isArray(lock.revisions) || lock.revisions.length > BIRTH_PROFILE_REVISION_CAP) return false;
  let previous = -Infinity;
  for (const item of lock.revisions) {
    if (!item || typeof item !== "object" || Object.keys(item).some(key => !["at", "kind", "beforeHash", "afterHash"].includes(key))) return false;
    const at = Date.parse(item.at);
    if (!Number.isFinite(at) || at < previous || !["edit", "add_time", "reentry"].includes(item.kind)
      || !nullableHash(item.beforeHash) || typeof item.afterHash !== "string" || !HEX64.test(item.afterHash)) return false;
    previous = at;
  }
  return true;
}

// Small dependency-free SHA-256 (FIPS 180-4) over UTF-8 text. Used only for local birth-profile hashes.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function utf8(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) { code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00); i++; }
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return bytes;
}

export function sha256Hex(text: string): string {
  const bytes = utf8(text);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000), low = bitLength >>> 0;
  bytes.push((high >>> 24) & 255, (high >>> 16) & 255, (high >>> 8) & 255, high & 255, (low >>> 24) & 255, (low >>> 16) & 255, (low >>> 8) & 255, low & 255);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  return Array.from(h, value => value.toString(16).padStart(8, "0")).join("");
}
