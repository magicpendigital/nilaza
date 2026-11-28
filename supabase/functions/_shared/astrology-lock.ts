// Nil P1-B (15/11/2026): server-side identity of an Astrology AI reading.
// The lock key is computed here from the validated invocation only; any hash a client sends is never read.
// key = sha256("nilaza.astrology.lock.v1|<chart identity hash>|<topic>|<language>|<calculationVersion>|<promptVersion>")
// * chart identity hash: the calculated placements and chart versions, not the request id, saved-chart id, report
//   revision or which aspects/houses the app selected, so the same birth chart always maps to the same hash.
// * topic: one value from a fixed catalog (overview mode, the app's theme, or a keyword match on the question).
//   A reworded question on the same topic replays the stored reading; a new topic is a new reading.
// * language is part of the key because the stored reading is written in one language.
// The route version is stored on the row but is not part of the key: changing the model alone does not regenerate.

export const ASTROLOGY_TOPICS = [
  "overview", "identity", "relationships", "work", "family", "money", "wellbeing", "study", "decision", "patterns", "general"
] as const;
export type AstrologyTopic = typeof ASTROLOGY_TOPICS[number];

export const ASTROLOGY_CHART_IDENTITY_VERSION = "nilaza.astrology.chart-identity.v1";
export const ASTROLOGY_LOCK_VERSION = "nilaza.astrology.lock.v1";

// Order matters: the first topic with a match wins. Phrases are matched on lower-case text without accents
// ("đ" → "d"), as whole words, so "tinh yeu" matches "tình yêu" but "yeu" alone matches nothing.
const TOPIC_PHRASES: Array<[AstrologyTopic, string[]]> = [
  ["relationships", [
    "tinh yeu", "nguoi yeu", "yeu duong", "hon nhan", "vo chong", "chong toi", "vo toi", "ban trai", "ban gai",
    "moi quan he", "chia tay", "hen ho", "tinh cam", "ket hon", "nguoi ay", "doi lua",
    "love", "relationship", "relationships", "partner", "dating", "marriage", "breakup", "boyfriend", "girlfriend",
    "husband", "wife", "romance", "romantic"
  ]],
  ["family", [
    "gia dinh", "bo me", "cha me", "me toi", "bo toi", "con cai", "con toi", "anh chi em", "anh trai", "chi gai",
    "em trai", "em gai", "ong ba", "nha chong", "nha vo",
    "family", "parent", "parents", "mother", "father", "mom", "dad", "children", "sibling", "siblings"
  ]],
  ["work", [
    "cong viec", "su nghiep", "nghe nghiep", "dong nghiep", "cong ty", "kinh doanh", "viec lam", "thang tien",
    "nghi viec", "chuyen viec", "doi viec", "khoi nghiep", "cap tren",
    "job", "career", "work", "boss", "coworker", "colleague", "business", "promotion", "profession"
  ]],
  ["money", [
    "tien bac", "tai chinh", "thu nhap", "kiem tien", "tiet kiem", "no nan", "chi tieu", "tien luong", "dong tien",
    "money", "finance", "finances", "income", "savings", "debt", "salary", "wealth"
  ]],
  ["study", [
    "hoc tap", "viec hoc", "thi cu", "ky thi", "truong hoc", "dai hoc", "hoc hanh", "on thi", "bai thi", "du hoc",
    "study", "studies", "studying", "exam", "exams", "school", "university", "college", "learning"
  ]],
  ["wellbeing", [
    "suc khoe", "cang thang", "met moi", "lo au", "lo lang", "binh an", "nghi ngoi", "giac ngu", "ap luc", "kiet suc",
    "stress", "stressed", "anxiety", "anxious", "tired", "rest", "sleep", "wellbeing", "health", "burnout", "calm"
  ]],
  ["decision", [
    "quyet dinh", "lua chon", "co nen", "nen hay khong", "phan van", "nen chon",
    "decide", "deciding", "decision", "choice", "choose", "should i"
  ]],
  ["patterns", [
    "lap lai", "thoi quen", "khuon mau", "vong lap", "mo thuc",
    "pattern", "patterns", "habit", "habits", "repeat", "repeating", "cycle", "cycles"
  ]],
  ["identity", [
    "ban than", "tinh cach", "con nguoi toi", "diem manh", "diem yeu", "ban chat", "toi la ai", "gia tri song",
    "personality", "identity", "myself", "who am i", "strengths", "weaknesses"
  ]]
];

const THEME_TOPICS = new Set<string>(["identity", "relationships", "work", "decision", "patterns"]);

export function foldAstrologyText(value: string) {
  return ` ${value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/** Fixed-catalog topic of the current focus. Never returns free text. */
export function astrologyTopic(userFocus: { mode?: unknown; theme?: unknown; sanitizedQuestion?: unknown }): AstrologyTopic {
  if (userFocus.mode === "overview") return "overview";
  if (typeof userFocus.theme === "string" && THEME_TOPICS.has(userFocus.theme)) return userFocus.theme as AstrologyTopic;
  const question = typeof userFocus.sanitizedQuestion === "string" ? foldAstrologyText(userFocus.sanitizedQuestion) : "";
  for (const [topic, phrases] of TOPIC_PHRASES) {
    if (phrases.some((phrase) => question.includes(` ${phrase} `))) return topic;
  }
  return "general";
}

type IdentityInput = {
  chart: { contractId: string; contractVersion: string; calculationVersion: string; calculationStatus: string };
  facts: { placements: Array<Record<string, any>> };
};

/** Canonical chart identity: versions plus every calculated placement, sorted by fact id. */
export function astrologyChartIdentity(invocation: IdentityInput) {
  const placements = [...(invocation.facts?.placements ?? [])]
    .map((fact) => [
      String(fact.factId), String(fact.body), String(fact.sign),
      typeof fact.degree === "number" ? fact.degree : null,
      typeof fact.house === "number" ? fact.house : null,
      fact.retrograde === true,
      typeof fact.confidence?.basis === "string" ? fact.confidence.basis : null
    ])
    .sort((left, right) => (left[0] as string) < (right[0] as string) ? -1 : (left[0] as string) > (right[0] as string) ? 1 : 0);
  return {
    v: ASTROLOGY_CHART_IDENTITY_VERSION,
    contractId: invocation.chart.contractId,
    contractVersion: invocation.chart.contractVersion,
    calculationVersion: invocation.chart.calculationVersion,
    calculationStatus: invocation.chart.calculationStatus,
    placements
  };
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function astrologyInputHash(invocation: IdentityInput) {
  return await sha256Hex(JSON.stringify(astrologyChartIdentity(invocation)));
}

export async function astrologyLockKey(input: {
  inputHash: string; topic: AstrologyTopic; language: string; calculationVersion: string; promptVersion: string;
}) {
  return await sha256Hex([ASTROLOGY_LOCK_VERSION, input.inputHash, input.topic, input.language, input.calculationVersion, input.promptVersion].join("|"));
}
