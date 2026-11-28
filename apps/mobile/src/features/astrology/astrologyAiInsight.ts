import type { CandidateChart } from "../../../../../packages/astrology-core/calculator.mjs";
import { buildAstrologyChartSelectionModel, stableAstrologyAspectFactId } from "./chartSelection";
import type { SavedChart } from "./persistence";
import type { AnswerProvenance } from "../../../../../packages/ai-contracts/answer-provenance";

export const astrologyAiConsentVersion = "astrology_ai_fact_sharing_v1" as const;
export const astrologyAiResponseSchema = "astrology_ai_insight_v1" as const;

export type AstrologyAiInvocation = {
  schemaVersion: "nilaza.astrology.ai-insight.invoke.v1";
  requestId: string;
  clientChartId: string;
  language: "vi" | "en";
  chart: {
    contractId: "nilaza.astrology.canonical-chart";
    contractVersion: "0.2.0";
    calculationVersion: "nilaza-a3-utc-tt-2";
    reportRevision: number;
    calculationStatus: "candidate";
  };
  selectedFactIds: string[];
  facts: { placements: any[]; aspects: any[]; houses: any[] };
  caveats: Array<{ id: string; code: string; severity: "blocking" | "warning" | "info"; appliesToFactIds: string[] }>;
  userFocus: {
    mode: "question";
    theme: "open_reflection";
    sanitizedQuestion: string;
    consentScope: "current_focus_only";
    contextDisclosure: "chart_facts_and_current_focus_only";
  };
  consent: { accepted: true; version: typeof astrologyAiConsentVersion };
  qaTraceConsent?: { accepted: true; version: "astrology_ai_qa_trace_v1" };
};

export type AstrologyAiInsightResponse = {
  schemaVersion: "nilaza.astrology.ai-insight.response.v1";
  requestId: string;
  reportId: string;
  language: "vi" | "en";
  headline: string;
  synthesis: string;
  evidenceFactIds: string[];
  patterns: Array<{ id: string; title: string; interpretation: string; evidenceFactIds: string[]; caveatIds: string[] }>;
  tensions: Array<{ id: string; title: string; interpretation: string; evidenceFactIds: string[]; caveatIds: string[] }>;
  focusSections: Array<{ id: string; theme: string; title: string; insight: string; evidenceFactIds: string[]; caveatIds: string[]; reflectionQuestion: string }>;
  reflectionQuestions: string[];
  suggestedFollowUps: Array<{ id: string; label: string; theme: string; interactionMode: "ask_ai_guide"; requiresPremium: true }>;
  metadata: {
    contractId: string;
    contractVersion: string;
    responseSchema: string;
    promptVersionId: string;
    promptVersion: string;
    chartContractVersion: string;
    calculationVersion: string;
    reportRevision: number;
    interpretationMode: string;
    moderationStatus: "passed" | "redacted";
    providerMode: "mock" | "staging" | "live";
    disclaimerKey: string;
    generatedAt: string;
  };
};

/** Shown when the server returns the reading it already stored for this chart and topic (Nil P1-B). */
export function astrologyReplayNotice(language: string) {
  return language === "vi"
    ? "Nilaza giữ nguyên diễn giải trước cho chủ đề này để kết quả luôn nhất quán — không tốn thêm lượt."
    : "Nilaza keeps the earlier reading for this topic so your results stay consistent. No extra turn was used.";
}

/** Transport metadata stays outside the canonical AI report. */
export type AstrologyAiInsightResult = {
  report: AstrologyAiInsightResponse;
  provenance?: AnswerProvenance;
  /** Nil P1-B: true when the server returned the reading it already stored for this chart and topic (no turn used). */
  replayed?: boolean;
  /** The facts the returned reading was checked against (the stored ones on a replay). Save the reading with these. */
  context?: Pick<AstrologyAiInvocation, "chart" | "selectedFactIds" | "facts" | "caveats">;
};
export type AstrologyAnswerReportTarget = {
  feature: "astrology_insight";
  localAnswerId: string;
  provenance?: AnswerProvenance;
  sectionIds: string[];
  sectionLabels?: Record<string, string>;
  language: "vi" | "en";
};

export function astrologyAnswerSectionIds(response: AstrologyAiInsightResponse) {
  return ["summary", ...response.patterns.map(item => `patterns:${item.id}`),
    ...response.tensions.map(item => `tensions:${item.id}`), ...response.focusSections.map(item => `focusSections:${item.id}`),
    ...response.reflectionQuestions.map((_, index) => `reflection:${index}`)];
}
export function astrologyAnswerSectionLabels(response: AstrologyAiInsightResponse): Record<string, string> {
  return Object.fromEntries([["summary", response.headline],
    ...response.patterns.map(item => [`patterns:${item.id}`, item.title]),
    ...response.tensions.map(item => [`tensions:${item.id}`, item.title]),
    ...response.focusSections.map(item => [`focusSections:${item.id}`, item.title]),
    ...response.reflectionQuestions.map((_, index) => [`reflection:${index}`, response.language === "vi" ? `Câu hỏi phản chiếu ${index + 1}` : `Reflection question ${index + 1}`])]);
}

type Confidence = {
  level: "stable" | "estimated" | "uncertain" | "unavailable";
  basis: "deterministic_exact_input" | "deterministic_approximate_input" | "sampled_unknown_time" | "derived_from_chart" | "missing_required_input";
  caveatIds: string[];
};

function makeOpaqueId(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${prefix}_${randomId ?? `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`}`;
}

function factConfidence(caveatIds: string[], basis: Confidence["basis"] = "derived_from_chart"): Confidence {
  return { level: "estimated", basis, caveatIds };
}

function caveatList(chart: CandidateChart, factIds: string[]) {
  const uncertainties = Array.isArray(chart.uncertainties) ? chart.uncertainties : [];
  const source = uncertainties.length
    ? uncertainties
    : [{ code: "independent_accuracy_not_verified", severity: "warning" as const }];
  const unique = new Map(source.map((item) => [item.code, item]));
  const caveats = [...unique.values()].slice(0, 20).map((item) => ({
    id: `caveat.${item.code}`,
    code: item.code,
    severity: item.severity,
    appliesToFactIds: factIds,
  }));
  return caveats;
}

/** Project the candidate chart through an explicit allowlist; never serialize SavedChart or CandidateChart. */
export function buildAstrologyAiInvocation(input: {
  savedChart: SavedChart;
  language: string;
  question: string;
  preferredFactIds?: readonly string[];
  qaTraceConsentAccepted?: boolean;
}): AstrologyAiInvocation {
  const chart = input.savedChart.chart;
  if (chart.contractId !== "nilaza.astrology.canonical-chart" || chart.contractVersion !== "0.2.0") {
    throw new Error("unsupported_chart_contract");
  }
  if (chart.provenance.calculationVersion !== "nilaza-a3-utc-tt-2" || chart.calculationStatus !== "candidate") {
    throw new Error("unsupported_calculation_version");
  }
  const selection = buildAstrologyChartSelectionModel(chart);
  const preferred = new Set((input.preferredFactIds ?? []).filter(id =>
    selection.selections.some(item => item.evidenceRefs.some(ref => ref.factId === id))));
  const eligibleBodies = new Set(selection.bodies.map((body) => body.bodyId));
  const placementsSource = [...chart.placements, ...chart.angles]
    .filter((item) => eligibleBodies.has(item.body as never))
    .sort((first, second) => first.body.localeCompare(second.body));
  if (!placementsSource.length) throw new Error("chart_facts_unavailable");

  const placements = placementsSource.map((item) => ({
    factId: `placement.${item.body}`,
    body: item.body,
    sign: item.sign,
    degree: item.degree,
    house: selection.anglesAndHousesAvailable && chart.placements.some(placement => placement.body === item.body)
      ? selection.houses.find(house => house.sign === item.sign)?.house ?? null : null,
    retrograde: item.retrograde ?? null,
    confidence: factConfidence(["caveat.independent_accuracy_not_verified"], chart.time.precision === "exact"
      ? "deterministic_exact_input"
      : "deterministic_approximate_input"),
  }));

  const eligibleAspects = chart.aspects
    .filter((item) => eligibleBodies.has(item.bodyA as never) && eligibleBodies.has(item.bodyB as never))
    .sort((first, second) => Number(preferred.has(stableAstrologyAspectFactId(second.bodyA as never, second.type as never, second.bodyB as never)))
      - Number(preferred.has(stableAstrologyAspectFactId(first.bodyA as never, first.type as never, first.bodyB as never)))
      || first.orb - second.orb || first.bodyA.localeCompare(second.bodyA));
  const includePrimaryHouses = selection.anglesAndHousesAvailable;
  const selectedHouses = includePrimaryHouses
    ? selection.houses.filter((item) => preferred.has(`house.${item.house}`) || [1, 4, 7, 10].includes(item.house))
    : [];
  const aspectLimit = Math.max(0, Math.min(18, 30 - placements.length - selectedHouses.length));
  const aspects = eligibleAspects.slice(0, aspectLimit).map((item) => ({
    factId: stableAstrologyAspectFactId(item.bodyA as never, item.type as never, item.bodyB as never),
    bodyA: item.bodyA,
    bodyB: item.bodyB,
    aspectType: item.type,
    orb: item.orb,
    confidence: factConfidence(["caveat.independent_accuracy_not_verified"]),
  }));
  const houses = selectedHouses.map((item) => ({
    factId: `house.${item.house}`,
    house: item.house,
    sign: item.sign,
    confidence: factConfidence(["caveat.independent_accuracy_not_verified"]),
  }));
  const selectedFactIds = [...placements, ...aspects, ...houses].map((item) => item.factId);
  if (!selectedFactIds.length || selectedFactIds.length > 30) throw new Error("chart_facts_unavailable");

  const baseCaveats = caveatList(chart, selectedFactIds);
  const caveatIds = baseCaveats.map((item) => item.id);
  for (const fact of [...placements, ...aspects, ...houses]) {
    fact.confidence.caveatIds = caveatIds;
  }
  const question = input.question.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!question) throw new Error("question_required");

  const invocation: AstrologyAiInvocation = {
    schemaVersion: "nilaza.astrology.ai-insight.invoke.v1",
    requestId: makeOpaqueId("req_astrology"),
    clientChartId: input.savedChart.id,
    language: input.language === "vi" ? "vi" : "en",
    chart: {
      contractId: chart.contractId,
      contractVersion: chart.contractVersion,
      calculationVersion: chart.provenance.calculationVersion,
      reportRevision: chart.time.revision,
      calculationStatus: "candidate",
    },
    selectedFactIds,
    facts: { placements, aspects, houses },
    caveats: baseCaveats,
    userFocus: {
      mode: "question",
      theme: "open_reflection",
      sanitizedQuestion: question,
      consentScope: "current_focus_only",
      contextDisclosure: "chart_facts_and_current_focus_only",
    },
    consent: { accepted: true, version: astrologyAiConsentVersion },
  };
  if (input.qaTraceConsentAccepted === true) {
    invocation.qaTraceConsent = { accepted: true, version: "astrology_ai_qa_trace_v1" };
  }
  return invocation;
}

export function toAstrologyAiGuideAnswer(response: AstrologyAiInsightResponse, caveats: AstrologyAiInvocation["caveats"] = [], provenance?: AnswerProvenance) {
  const vi = response.language === "vi";
  const caveatCopy: Record<string, [string, string]> = {
    independent_accuracy_not_verified: ["Kiểm tra độ chính xác chỉ bao phủ một tập mẫu, không chứng nhận mọi đầu vào.", "Accuracy checks cover samples, not certification for every input."],
    birth_time_uncertain: ["Giờ sinh chưa chắc chắn; một số vị trí có thể thay đổi.", "Birth time is uncertain; some positions may change."],
    sampled_range_not_certified: ["Phạm vi giờ sinh đã được lấy mẫu, chưa chứng nhận cho toàn khoảng.", "The birth-time range was sampled, not certified across the entire interval."],
    angles_undefined_at_pole: ["Không xác định được các góc tại cực; không dùng nhà hoặc Cung mọc để kết luận.", "Angles are undefined at the pole; do not draw conclusions from houses or Rising."],
    high_latitude_review_required: ["Vĩ độ cao cần đối chiếu riêng các góc và hệ nhà.", "High-latitude angles and houses need a separate cross-check."],
  };
  const noteFor = (id: string) => {
    const code = caveats.find(item => item.id === id)?.code;
    return (code ? caveatCopy[code]?.[vi ? 0 : 1] : undefined) ?? (vi
      ? "Dữ kiện có giới hạn; đối chiếu lưu ý và phương pháp của bản đồ trước khi áp dụng."
      : "The evidence has limitations; check the chart's notes and method before applying this lens.");
  };
  const sections = [
    ...response.patterns.map(item => ({ ...item, id: `patterns:${item.id}`, body: item.interpretation })),
    ...response.tensions.map(item => ({ ...item, id: `tensions:${item.id}`, body: item.interpretation })),
    ...response.focusSections.map(item => ({ ...item, id: `focusSections:${item.id}`, body: item.insight, question: item.reflectionQuestion })),
    ...response.reflectionQuestions.map((question, index) => ({
      id: `reflection:${index}`, title: vi ? `Câu hỏi phản chiếu ${index + 1}` : `Reflection question ${index + 1}`,
      body: question, evidenceFactIds: [], caveatIds: [],
    })),
  ];
  return {
    language: response.language,
    provenance,
    eyebrow: response.metadata.providerMode === "mock" ? (vi ? "NỘI DUNG MINH HỌA · CHƯA GỌI AI" : "ILLUSTRATION · NO AI CALL")
      : response.metadata.providerMode === "staging" ? "STAGING AI · PREMIUM" : "AI · PREMIUM",
    title: response.headline,
    paragraphs: [response.synthesis].filter(Boolean),
    sections: sections.map(section => ({ ...section, caveatNotes: section.caveatIds.map(noteFor) })),
    evidenceIds: response.evidenceFactIds,
    suggestedFollowUps: (response.suggestedFollowUps ?? [])
      .map((item) => item.label)
      .filter(Boolean),
  };
}
