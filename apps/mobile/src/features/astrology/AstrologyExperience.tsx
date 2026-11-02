import { AstrologyHub } from "./AstrologyHub";
import { AiDeepRead } from "./AiDeepRead";
import { premiumOnSale } from "../owner/accountTierPolicy";
import { BirthDateFields, BirthTimeFields } from "./BirthFields";
import { Big3Summary, BigThreeCards, ChartRowLink, SkyTabs, TopicPanel, chartHeaderLine } from "./ChartOverviewParts";
import { bigThreeOf, moonHouseToday } from "./sky";
import { ConsentCard, CompareView, PeopleList, PersonFields } from "./SynastryViews";
import { compareCharts, synastryText, type RelationshipType } from "./synastry";
import { big3Story, moonTodayFor, skyTopicIds, topicLabel, topicReading, type SkyTopicId } from "./skyContent";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BirthInput,
  CandidateChart,
  calculateChart,
} from "../../../../../packages/astrology-core/calculator.mjs";
import { resolveBirthInput } from "../../../../../packages/astrology-core/time.mjs";
import { validateChart } from "../../../../../packages/astrology-core/validate.mjs";
import placeData from "../../../../../packages/astrology-core/places.json";
import chapterData from "../../../../../packages/content/data/astrology-mythology-chapters.json";
import { colors, typography } from "../../theme";
import {
  AstrologyLanguage,
  localizeAstrologySign,
  localizeAstrologyBody,
  toAstrologyChartPresentation,
  AstrologyRawChart,
} from "./contracts";
import { MythologyWorld } from "./MythologyWorld";
import { Control } from "./ZodiacWheel";
import { bodyMeaning } from "./AstrologyGlossary";
import { buildSafeAstrologyContext } from "./handoff";
import { buildAstrologyChartSelectionModel } from "./chartSelection";
import {
  buildAstrologyAiInvocation,
  toAstrologyAiGuideAnswer,
  astrologyAnswerSectionIds,
  astrologyAnswerSectionLabels,
  type AstrologyAiInsightResult,
  type AstrologyAnswerReportTarget,
  type AstrologyAiInvocation,
} from "./astrologyAiInsight";
import { createAnswerAttempt, parseAnswerProvenance, type AnswerCorrelation } from "../../../../../packages/ai-contracts/answer-provenance";
import { validAstrologyAiResponse } from "./astrologyAiValidation";
import type { AstrologyAiGuideAnswer, AstrologyAiGuideStatus } from "./AstrologyAiGuidePanel";
import { astrologyQaTraceCaptureEnabled } from "../../runtimeConfig";
import {
  AstrologyData,
  AstrologyPersistence,
  SavedChart,
  type SavedPerson,
  SavedAstrologyAiInsight,
  astrologyStorageKey,
  freshAstrologyData,
  localCalendarLabel,
  validAstrologyData,
  validSavedAstrologyAiInsight,
  validDisplayZone,
} from "./persistence";

type Place = (typeof placeData.places)[number];
type Stage = "home" | "form" | "confirm" | "report" | "world" | "chart" | "people" | "consent" | "compare";
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
const placeSearch = placeData.places.map((p) => ({
  p,
  key: fold(`${p.name} ${p.ascii} ${p.country} ${p.region}`),
}));
const signGlyphs: Record<string, string> = {
  aries: "♈",
  taurus: "♉",
  gemini: "♊",
  cancer: "♋",
  leo: "♌",
  virgo: "♍",
  libra: "♎",
  scorpio: "♏",
  sagittarius: "♐",
  capricorn: "♑",
  aquarius: "♒",
  pisces: "♓",
};
const errors: Record<string, [string, string]> = {
  invalid_date: [
    "Ngày sinh không hợp lệ. Dùng YYYY-MM-DD.",
    "Invalid date. Use YYYY-MM-DD.",
  ],
  invalid_time: [
    "Giờ sinh không hợp lệ. Dùng HH:mm, hệ 24 giờ.",
    "Invalid time. Use 24-hour HH:mm.",
  ],
  nonexistent_local_time: [
    "Giờ này không tồn tại tại nơi sinh do đổi giờ mùa hè. Hãy kiểm tra lại giấy tờ hoặc chọn không rõ giờ.",
    "This local time did not exist because of a daylight-saving change. Check the record or choose unknown time.",
  ],
  nonexistent_local_date: [
    "Ngày này bị bỏ qua trong lịch địa phương. Hãy kiểm tra ngày trên giấy tờ.",
    "This date was skipped in the local calendar. Please check the record.",
  ],
  ambiguous_local_time: [
    "Giờ này xuất hiện hai lần khi đổi giờ mùa hè. Chọn lần theo giấy tờ; nếu không biết, hãy chọn không rõ giờ.",
    "This time occurred twice during a daylight-saving change. Choose the documented occurrence, or select unknown time.",
  ],
  date_out_of_supported_range: [
    "Hỗ trợ ngày sinh từ 1900 đến hiện tại.",
    "Birth dates from 1900 through today are supported.",
  ],
  uncertainty_minutes_required: [
    "Độ lệch cần là số nguyên từ 1 đến 180 phút.",
    "Uncertainty must be an integer from 1 to 180 minutes.",
  ],
};
const label = (p: Place) => `${p.name} · ${p.country} · ${p.region}`;
export function AstrologyExperience({
  language,
  storage,
  onBack,
  ownerPremiumPreview = false,
  initialBirth,
  accountReady = true,
  onDiscuss,
  onSaveToJournal,
  canRequestAstrologyAi = false,
  requestAstrologyAi,
  onDeleteAiReport,
  onReportAnswer,
}: {
  language: AstrologyLanguage;
  storage: AstrologyPersistence;
  onBack: () => void;
  accountReady?: boolean;
  ownerPremiumPreview?: boolean;
  initialBirth?: {
    date: string;
    time: string;
    place: string;
    unknown: boolean;
  };
  onDiscuss?: (report: SavedChart) => void;
  onSaveToJournal?: (entry: {
    sourceId: string;
    title: string;
    summary: string;
  }) => void;
  canRequestAstrologyAi?: boolean;
  requestAstrologyAi?: (input: AstrologyAiInvocation, correlation: AnswerCorrelation) => Promise<AstrologyAiInsightResult>;
  onDeleteAiReport?: (clientChartId: string) => Promise<void>;
  onReportAnswer?: (target: AstrologyAnswerReportTarget) => void;
}) {
  const vi = language === "vi";
  const [stage, setStage] = useState<Stage>("home");
  const [data, setData] = useState<AstrologyData>(freshAstrologyData),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const live = useRef(true),
    writing = useRef(false),
    workingData = useRef(data);
  const generation = useRef(0);
  const aiGeneration = useRef(0);
  const aiRequestInFlight = useRef(false);
  const accountGeneration = useRef(0);
  const aiInteractionId = useRef<string | undefined>(undefined);
  const pageScroll = useRef<ScrollView>(null);
  const [date, setDate] = useState(initialBirth?.date ?? ""),
    [time, setTime] = useState(initialBirth?.time ?? "");
  const [query, setQuery] = useState(initialBirth?.place ?? ""),
    [place, setPlace] = useState<Place | null>(null);
  const [precision, setPrecision] = useState<BirthInput["precision"]>(
    initialBirth?.unknown ? "unknown" : "exact",
  );
  const [minutes, setMinutes] = useState("30"),
    [confirmed, setConfirmed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showTimeZone, setShowTimeZone] = useState(false);
  const [showReflections, setShowReflections] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [occurrence, setOccurrence] = useState<
    "earlier" | "later" | undefined
  >();
  const [ambiguous, setAmbiguous] = useState<{ utc: string; offset: string }[]>(
    [],
  );
  const [pending, setPending] = useState<{
    input: BirthInput;
    resolved: CandidateChart["time"];
    placeName: string;
  } | null>(null);
  const [report, setReport] = useState<SavedChart | null>(null);
  const [chartTab, setChartTab] = useState<"overview" | SkyTopicId>("overview");
  // So với một người: the birth form also adds another person, saved only after the consent card.
  const [formFor, setFormFor] = useState<"self" | "person">("self");
  const [personName, setPersonName] = useState("");
  const [personRelation, setPersonRelation] = useState<RelationshipType>("friend");
  const [personDraft, setPersonDraft] = useState<SavedPerson | null>(null);
  const [comparePersonId, setComparePersonId] = useState<string | null>(null);
  const [confirmDeletePerson, setConfirmDeletePerson] = useState(false);
  useEffect(() => setChartTab("overview"), [report?.id]);
  const [aiStatus, setAiStatus] = useState<AstrologyAiGuideStatus>("ready");
  const [aiAnswer, setAiAnswer] = useState<AstrologyAiGuideAnswer | undefined>();
  const [aiSnapshot, setAiSnapshot] = useState<SavedAstrologyAiInsight | undefined>();
  const [aiErrorMessage, setAiErrorMessage] = useState("");
  const [showAiConsent, setShowAiConsent] = useState(false);
  const [qaTraceConsentAccepted, setQaTraceConsentAccepted] = useState(false);
  const [pendingAiQuestion, setPendingAiQuestion] = useState("");
  const [pendingAiFactIds, setPendingAiFactIds] = useState<readonly string[]>([]);
  const [deletingAiReport, setDeletingAiReport] = useState(false);
  const [zoneDraft, setZoneDraft] = useState("device");
  const [now, setNow] = useState(new Date());
  const [deleteId, setDeleteId] = useState<string | null>(null),
    [exportText, setExportText] = useState<string | null>(null);
  const [reflection, setReflection] = useState<{
      title: string;
      prompt: string;
    } | null>(null),
    [note, setNote] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (error) pageScroll.current?.scrollTo({ y: 0, animated: false });
  }, [error]);
  useEffect(() => {
    live.current = true;
    const account = ++accountGeneration.current;
    aiGeneration.current++;
    aiRequestInFlight.current = false;
    writing.current = false;
    setLoaded(false);
    setBusy(false);
    workingData.current = freshAstrologyData();
    setData(workingData.current);
    setError("");
    setNotice("");
    setExportText(null);
    setDeleteId(null);
    setDeletingAiReport(false);
    setReport(null);
    setAiSnapshot(undefined);
    setAiAnswer(undefined);
    setAiStatus("ready");
    setShowAiConsent(false);
    setStage("home");
    if (!accountReady) return () => { live.current = false; accountGeneration.current++; };
    storage
      .loadJson<unknown>(astrologyStorageKey, freshAstrologyData())
      .then((value) => {
        if (!live.current || account !== accountGeneration.current) return;
        if (!validAstrologyData(value)) {
          setError(
            vi
              ? "Dữ liệu chiêm tinh đã lưu không hợp lệ. Chưa ghi đè; bạn có thể xuất bản sao để kiểm tra."
              : "Stored Astrology data is invalid. It has not been overwritten; export a copy to inspect.",
          );
          return;
        }
        workingData.current = value;
        setData(value);
        setZoneDraft(value.displayZone);
        setLoaded(true);
      })
      .catch(() => {
        if (live.current && account === accountGeneration.current)
          setError(
            vi
              ? "Không đọc được dữ liệu; hãy mở lại màn hình."
              : "Could not read saved data; reopen this screen.",
          );
      });
    return () => {
      live.current = false;
      accountGeneration.current++;
      aiGeneration.current++;
    };
  }, [storage, accountReady]);
  const save = async (next: AstrologyData) => {
    if (!loaded || writing.current || !live.current) throw new Error("storage_busy");
    const account = accountGeneration.current;
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      if (!validAstrologyData(next)) throw new Error("invalid_data");
      await storage.saveJsonOrThrow(astrologyStorageKey, next);
      if (live.current && account === accountGeneration.current) {
        workingData.current = next;
        setData(next);
      }
    } finally {
      if (account === accountGeneration.current) writing.current = false;
      if (live.current && account === accountGeneration.current) setBusy(false);
    }
  };
  const savePerson = async () => {
    if (!personDraft || writing.current) return;
    const saved = workingData.current.people ?? [];
    if (saved.length >= 20) {
      setError(vi ? "Đã có 20 người. Xóa bớt một người trước khi lưu thêm." : "20 people are saved. Delete one before saving another.");
      return;
    }
    const account = accountGeneration.current;
    try {
      await save({
        ...workingData.current,
        nextRevision: Math.max(workingData.current.nextRevision, personDraft.input.revision + 1),
        people: [personDraft, ...saved],
      });
      if (!live.current || account !== accountGeneration.current) return;
      setComparePersonId(personDraft.id);
      setPersonDraft(null);
      setConfirmDeletePerson(false);
      setStage("compare");
    } catch {
      if (live.current && account === accountGeneration.current) failSave();
    }
  };
  const deletePerson = async (id: string) => {
    if (writing.current) return;
    const account = accountGeneration.current;
    try {
      await save({ ...workingData.current, people: (workingData.current.people ?? []).filter((item) => item.id !== id) });
      if (!live.current || account !== accountGeneration.current) return;
      setComparePersonId(null);
      setConfirmDeletePerson(false);
      setNotice(vi ? "Đã xóa lá số khỏi thiết bị." : "Chart deleted from this device.");
      setStage("people");
    } catch {
      if (live.current && account === accountGeneration.current) failSave();
    }
  };
  const failSave = () =>
    setError(
      vi
        ? "Chưa lưu được trên thiết bị. Nội dung vẫn còn trên màn hình; hãy thử lại."
        : "Could not save on this device. Your content is still on screen; please retry.",
    );
  const matches = useMemo(() => {
    const q = fold(query.trim());
    return q.length < 2
      ? []
      : placeSearch
          .filter((x) => q.split(/\s+/).every((t) => x.key.includes(t)))
          .sort((a, b) => {
            const rank = (p: Place) => {
              const name = fold(p.name),
                ascii = fold(p.ascii);
              return name === q || ascii === q
                ? 0
                : name.startsWith(q) || ascii.startsWith(q)
                  ? 1
                  : name.includes(q) || ascii.includes(q)
                    ? 2
                    : 3;
            };
            return rank(a.p) - rank(b.p);
          })
          .slice(0, 15)
          .map((x) => x.p);
  }, [query]);
  const resetOccurrence = () => {
    setOccurrence(undefined);
    setAmbiguous([]);
    setError("");
  };
  const newForm = () => {
    setFormFor("self");
    setNotice("");
    setReport(null);
    setPending(null);
    setConfirmed(false);
    setShowDetails(false);
    resetOccurrence();
    setStage("form");
  };
  const newPersonForm = () => {
    setFormFor("person");
    setPersonName("");
    setPersonRelation("friend");
    setPersonDraft(null);
    setNotice("");
    setDate("");
    setTime("");
    setPrecision("exact");
    setMinutes("30");
    setPlace(null);
    setQuery("");
    setConfirmed(false);
    setPending(null);
    resetOccurrence();
    setStage("form");
  };
  // Reopen the form from a chart; askTime switches to an exact time for the birth-time invites.
  const editBirthDetails = (r: SavedChart, askTime = false) => {
    setFormFor("self");
    setNotice("");
    setDate(r.input.date);
    setTime(r.input.time ?? "");
    setPrecision(askTime ? "exact" : r.input.precision);
    setMinutes(String(r.input.uncertaintyMinutes ?? 30));
    const p = placeData.places.find((item) => item.id === r.input.place.id) ?? null;
    setPlace(p);
    setQuery(p ? label(p) : "");
    setConfirmed(false);
    resetOccurrence();
    setStage("form");
  };
  const reviewInput = () => {
    setError("");
    setNotice("");
    if (formFor === "person" && !personName.trim()) {
      setError(vi ? "Nhập tên hoặc biệt danh của người ấy." : "Enter their name or nickname.");
      return;
    }
    if (!place || !confirmed) {
      setError(
        vi
          ? "Chọn và xác nhận đúng nơi sinh trước khi tiếp tục."
          : "Select and confirm your birth place first.",
      );
      return;
    }
    try {
      const input: BirthInput = {
        revision: workingData.current.nextRevision,
        date: date.trim(),
        precision,
        ...(precision !== "unknown"
          ? { time: time.trim(), ...(occurrence ? { occurrence } : {}) }
          : {}),
        ...(precision === "approximate"
          ? { uncertaintyMinutes: Number(minutes) }
          : {}),
        place: {
          id: place.id,
          source: placeData.version,
          confirmed: true,
          latitude: place.latitude,
          longitude: place.longitude,
          timezone: place.timezone,
        },
      };
      const resolved = resolveBirthInput(input);
      const latest = resolved.range?.endExclusive ?? resolved.utc!;
      // Future records are not birth profiles. Unknown today remains allowed.
      const todayParts = new Intl.DateTimeFormat("en", {
        timeZone: place.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const birthToday = ["year", "month", "day"]
        .map((t) => todayParts.find((p) => p.type === t)!.value)
        .join("-");
      if (
        input.date > birthToday ||
        (precision === "exact" && Date.parse(latest) > Date.now())
      )
        throw new Error("date_out_of_supported_range");
      setPending({ input, resolved, placeName: label(place) });
      setStage("confirm");
    } catch (e) {
      const err = e as {
        code?: string;
        message?: string;
        details?: { candidates?: { utc: string; offset: string }[] };
      };
      const key = err.code ?? err.message ?? "";
      setError(
        errors[key]?.[vi ? 0 : 1] ??
          (vi
            ? "Không xác nhận được dữ liệu; kiểm tra ngày, giờ và nơi sinh."
            : "Could not confirm the input; check date, time and place."),
      );
      setAmbiguous(err.details?.candidates ?? []);
    }
  };
  const compute = async () => {
    if (!pending || busy) return;
    const operation = ++generation.current;
    setBusy(true);
    setError("");
    // Let the loading state paint before bounded local work. No network or AI provider call.
    await new Promise((resolve) => setTimeout(resolve, 20));
    try {
      if (operation !== generation.current || !live.current) return;
      const chart = calculateChart(pending.input);
      if (validateChart(chart).length)
        throw new Error("calculation_contract_failed");
      if (!live.current || operation !== generation.current) return;
      if (formFor === "person") {
        setPersonDraft({
          id: `person-${pending.input.revision}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          name: personName.trim(),
          relationship: personRelation,
          input: pending.input,
          placeName: pending.placeName,
          chart,
        });
        setStage("consent");
        return;
      }
      const nextReport: SavedChart = {
        id: `chart-${pending.input.revision}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        input: pending.input,
        placeName: pending.placeName,
        chart,
      };
      setReport(nextReport);
      setStage("report");
    } catch {
      if (live.current)
        setError(
          vi
            ? "Không tạo được bản đồ hợp lệ. Hãy kiểm tra dữ liệu rồi thử lại."
            : "Could not create a valid chart. Check the input and try again.",
        );
    } finally {
      if (live.current) setBusy(false);
    }
  };
  const reportBig3 = report ? bigThreeOf(report.chart) : null;
  const presentation = report
    ? toAstrologyChartPresentation(report.chart as unknown as AstrologyRawChart)
    : undefined;
  const selectionModel = useMemo(
    () => (report ? buildAstrologyChartSelectionModel(report.chart) : undefined),
    [report],
  );
  useEffect(() => {
    aiGeneration.current++;
    aiRequestInFlight.current = false;
    aiInteractionId.current = undefined;
    const saved = report?.aiInsight;
    setAiSnapshot(saved);
    setAiStatus(saved ? "success" : "ready");
    setAiAnswer(saved ? toAstrologyAiGuideAnswer(saved.response, saved.context.caveats, saved.provenance) : undefined);
    setAiErrorMessage("");
    setPendingAiQuestion("");
    setShowAiConsent(false);
  }, [report?.id]);
  const beginAiQuestion = (question: string, preferredFactIds: readonly string[] = [], retry = false) => {
    if (ownerPremiumPreview) return;
    if (!retry) aiInteractionId.current = undefined;
    if (!canRequestAstrologyAi || !requestAstrologyAi) {
      // Keep the guide in its locked state until entitlement is available.
      // A free or signed-out user should see the access boundary before any
      // consent dialog or backend error appears.
      setPendingAiQuestion(question.trim());
      setAiErrorMessage("");
      setShowAiConsent(false);
      setAiStatus("locked");
      return;
    }
    setPendingAiQuestion(question.trim());
    setPendingAiFactIds([...preferredFactIds]);
    setQaTraceConsentAccepted(false);
    setAiErrorMessage("");
    setShowAiConsent(true);
  };
  const runAiQuestion = async () => {
    // State updates do not apply until the next render; keep consent double taps
    // from charging two provider requests in the same event turn.
    if (aiRequestInFlight.current) return;
    const activeReport = report;
    const question = pendingAiQuestion.trim();
    if (!activeReport || !question || !requestAstrologyAi || !canRequestAstrologyAi || ownerPremiumPreview) {
      setShowAiConsent(false);
      setAiStatus("error");
      setAiErrorMessage(vi
        ? "Chưa thể gửi yêu cầu này. Hãy đăng nhập và thử lại."
        : "This request could not be sent. Sign in and try again.");
      return;
    }
    aiRequestInFlight.current = true;
    const operation = ++aiGeneration.current;
    const account = accountGeneration.current;
    const includeQaTraceCapture = astrologyQaTraceCaptureEnabled && qaTraceConsentAccepted;
    setQaTraceConsentAccepted(false);
    setShowAiConsent(false);
    setAiStatus("loading");
    setAiErrorMessage("");
    try {
      const invocation = buildAstrologyAiInvocation({
        savedChart: activeReport,
        language,
        question,
        preferredFactIds: pendingAiFactIds,
        qaTraceConsentAccepted: includeQaTraceCapture,
      });
      const correlation = createAnswerAttempt("astrology_insight", invocation.language, aiInteractionId.current, invocation.requestId);
      aiInteractionId.current = correlation.interactionId;
      const result = await requestAstrologyAi(invocation, correlation);
      if (!live.current || operation !== aiGeneration.current || account !== accountGeneration.current) return;
      const context = { chart: invocation.chart, selectedFactIds: invocation.selectedFactIds, facts: invocation.facts, caveats: invocation.caveats };
      if (!validAstrologyAiResponse(result.report, context, { requestId: invocation.requestId, language: invocation.language })) throw new Error("invalid_server_response");
      const provenance = result.provenance === undefined ? undefined
        : parseAnswerProvenance(result.provenance, { feature: "astrology_insight", locale: invocation.language, correlation });
      if (result.provenance !== undefined && !provenance) throw new Error("invalid_answer_provenance");
      const snapshot: SavedAstrologyAiInsight = {
        schemaVersion: "nilaza.astrology.saved-ai-insight.v1", response: result.report, context,
        ...(provenance ? { provenance } : {}), savedAt: new Date().toISOString(),
      };
      if (!validSavedAstrologyAiInsight(snapshot, activeReport.chart)) throw new Error("invalid_answer_snapshot");
      setAiSnapshot(snapshot);
      setAiAnswer(toAstrologyAiGuideAnswer(result.report, invocation.caveats, provenance));
      setAiStatus("success");
    } catch (requestError) {
      if (!live.current || operation !== aiGeneration.current || account !== accountGeneration.current) return;
      const code = (requestError as { code?: string })?.code;
      const localized: Record<string, [string, string]> = {
        authentication_required: ["Hãy đăng nhập để dùng Người dẫn đường AI.", "Sign in to use the AI guide."],
        premium_required: ["Người dẫn đường AI chưa mở cho tài khoản này. Nilaza sẽ báo bạn khi tính năng sẵn sàng.", "The AI guide is not open for this account yet. Nilaza will let you know when it is ready."],
        daily_limit_reached: ["Bạn đã dùng hết lượt AI Chiêm tinh hôm nay. Hãy thử lại vào ngày mai.", "You have reached today's Astrology AI limit. Please try again tomorrow."],
        feature_paused: ["Đọc sâu với AI đang tạm nghỉ một chút. Lượt của bạn vẫn còn, hãy thử lại sau.", "Deep read with AI is resting for a while. Your turn is kept; please try again later."],
        route_not_ready: ["Người dẫn đường đang được bảo trì. Câu hỏi của bạn vẫn còn để thử lại sau.", "The guide is under maintenance. Your question is kept so you can try again later."],
        prompt_not_ready: ["Người dẫn đường đang được bảo trì. Câu hỏi của bạn vẫn còn để thử lại sau.", "The guide is under maintenance. Your question is kept so you can try again later."],
        chart_facts_unavailable: ["AI cần giờ sinh chính xác để dùng các dữ kiện của bản đồ này.", "The AI guide needs an exact birth time to use this chart's facts."],
        crisis_support: ["Bạn xứng đáng được hỗ trợ ngay lúc này. Hãy liên hệ dịch vụ khẩn cấp tại địa phương hoặc một người bạn tin cậy ngay.", "You deserve immediate support. Contact local emergency services or someone you trust now."],
        professional_advice_blocked: ["AI Chiêm tinh không thể thay thế tư vấn y tế, pháp lý hoặc tài chính. Hãy trao đổi với chuyên gia phù hợp.", "Astrology AI cannot replace medical, legal, or financial guidance. Please speak with a qualified professional."],
      };
      const pair = localized[code ?? ""];
      setAiErrorMessage(pair ? pair[vi ? 0 : 1] : (vi
        ? "Người dẫn đường chưa thể hoàn tất. Câu hỏi vẫn còn để bạn thử lại."
        : "The guide could not complete the request. Your question is still here to retry."));
      setAiStatus("error");
    } finally {
      if (operation === aiGeneration.current && account === accountGeneration.current) aiRequestInFlight.current = false;
    }
  };
  const panelAiStatus: AstrologyAiGuideStatus = ownerPremiumPreview
    ? "locked"
    : aiStatus === "success" && aiAnswer ? "success" : canRequestAstrologyAi
      ? aiStatus
      : aiStatus === "error" ? "error" : "locked";
  const openSavedChart = (r: SavedChart) => {
    aiGeneration.current++;
    aiRequestInFlight.current = false;
    aiInteractionId.current = undefined;
    setReport(r);
    setAiSnapshot(r.aiInsight);
    setAiAnswer(r.aiInsight ? toAstrologyAiGuideAnswer(r.aiInsight.response, r.aiInsight.context.caveats, r.aiInsight.provenance) : undefined);
    setAiStatus(r.aiInsight ? "success" : "ready");
    setAiErrorMessage("");
    setPendingAiQuestion("");
    setShowAiConsent(false);
    setStage("report");
    setNotice("");
  };
  // The newest saved chart stands for the user's own sky on the hub.
  const myChartReport = data.reports[0];
  const myChartBig3 = myChartReport ? bigThreeOf(myChartReport.chart) : null;
  const myChart = myChartReport && myChartBig3 ? { report: myChartReport, big3: myChartBig3 } : null;
  // Today's Moon needs the houses, so only an exact birth time shows the block.
  const myMoonHouse = myChart?.big3.timeKnown ? moonHouseToday(myChart.report.chart, now) : null;
  const people = data.people ?? [];
  const comparePerson = people.find((item) => item.id === comparePersonId) ?? null;
  const comparison = comparePerson && myChartReport
    ? synastryText(compareCharts(myChartReport.chart, comparePerson.chart, comparePerson.relationship), comparePerson.name, language)
    : null;
  const saveReport = async (includeAnswer = false) => {
    if (!report || writing.current) return;
    const existing = workingData.current.reports.find(r => r.id === report.id);
    if (existing && (!includeAnswer || !aiSnapshot || existing.aiInsight?.response.requestId === aiSnapshot.response.requestId)) {
      setNotice(
        vi ? "Bản đồ này đã được lưu." : "This chart is already saved.",
      );
      return;
    }
    if (!existing && data.reports.length >= 20) {
      setError(
        vi
          ? "Đã có 20 bản đồ. Xuất hoặc xóa một bản cũ trước khi lưu thêm."
          : "20 charts are saved. Export or delete an older chart before saving another.",
      );
      return;
    }
    const account = accountGeneration.current;
    const target: SavedChart = includeAnswer && aiSnapshot
      ? { ...report, aiInsight: { ...aiSnapshot, savedAt: new Date().toISOString() } } : report;
    try {
      await save({
        ...workingData.current,
        nextRevision: Math.max(
          workingData.current.nextRevision,
          report.input.revision + 1,
        ),
        reports: existing ? workingData.current.reports.map(item => item.id === target.id ? target : item) : [target, ...workingData.current.reports],
      });
      if (!live.current || account !== accountGeneration.current) return;
      setNotice(
        vi
          ? includeAnswer ? "Đã lưu đầy đủ câu trả lời và dữ kiện trên thiết bị cho tài khoản này." : "Đã lưu trên thiết bị cho tài khoản này."
          : includeAnswer ? "The full answer and evidence are saved on this device for this account." : "Saved on this device for this account.",
      );
    } catch {
      if (live.current && account === accountGeneration.current) failSave();
    }
  };
  const changeZone = async () => {
    if (!validDisplayZone(zoneDraft)) {
      setError(
        vi
          ? "Múi giờ chưa hợp lệ. Ví dụ: Asia/Ho_Chi_Minh, Europe/Paris, America/New_York."
          : "Invalid time zone. Examples: Asia/Ho_Chi_Minh, Europe/Paris, America/New_York.",
      );
      return;
    }
    try {
      await save({ ...workingData.current, displayZone: zoneDraft });
      setError("");
      setNotice(
        vi ? "Đã cập nhật múi giờ hiển thị." : "Display time zone updated.",
      );
    } catch {
      failSave();
    }
  };
  const back = () => {
    generation.current++;
    setError("");
    setNotice("");
    if (stage === "home") onBack();
    else if (stage === "chart") setStage(report ? "report" : "home");
    else if (stage === "confirm") setStage("form");
    else if (stage === "compare" || stage === "consent" || (stage === "form" && formFor === "person")) {
      setPersonDraft(null);
      setConfirmDeletePerson(false);
      setStage("people");
    } else setStage("home");
  };
  useEffect(() => {
    if (stage === "world" || stage === "chart") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [stage, onBack]);
  const message = (
    <>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.note}>
          {notice}
        </Text>
      )}
    </>
  );
  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {stage === "world" || stage === "chart" ? (
        <View style={s.root}>
          {message}
          <MythologyWorld
            language={language}
            ownerPremiumPreview={ownerPremiumPreview}
            onBack={back}
            chart={stage === "chart" ? presentation : undefined}
            houses={stage === "chart" ? report?.chart.houses : []}
            selectionModel={stage === "chart" ? selectionModel : undefined}
            aiStatus={panelAiStatus}
            aiAnswer={aiAnswer}
            aiErrorMessage={aiErrorMessage}
            aiAnswerSaved={Boolean(report && aiSnapshot && data.reports.find(item => item.id === report.id)?.aiInsight?.response.requestId === aiSnapshot.response.requestId)}
            onSaveAiAnswer={aiSnapshot ? () => void saveReport(true) : undefined}
            onReportAiAnswer={aiSnapshot && onReportAnswer ? () => onReportAnswer({
              feature: "astrology_insight", localAnswerId: aiSnapshot.response.requestId, provenance: aiSnapshot.provenance,
              sectionIds: astrologyAnswerSectionIds(aiSnapshot.response), language: aiSnapshot.response.language,
              sectionLabels: astrologyAnswerSectionLabels(aiSnapshot.response),
            }) : undefined}
            onRequestAiUnlock={(question, factIds) => beginAiQuestion(question ?? "", factIds)}
            onSubmitAiQuestion={beginAiQuestion}
            onRetryAiQuestion={() => beginAiQuestion(pendingAiQuestion, pendingAiFactIds, true)}
            saved={Boolean(
              report && data.reports.some((item) => item.id === report.id),
            )}
            chartSaving={busy}
            onSaveChart={report ? () => void saveReport() : undefined}
            library={data.library}
            onLibraryChange={(next) =>
              save({ ...workingData.current, library: next })
            }
            onReflection={(title, prompt) => {
              setReflection({ title, prompt });
              setNote("");
            }}
          />
        </View>
      ) : (
        <>
          <View style={s.top}>
            <Control label={vi ? "← Trở lại" : "← Back"} onPress={back} />
            <Text style={s.kicker}>NILAZA · ASTROLOGY</Text>
          </View>
          <ScrollView
            ref={pageScroll}
            key={stage}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.page}
          >
            {message}
            {busy && (
              <ActivityIndicator
                accessibilityLabel={vi ? "Đang xử lý" : "Working"}
                color={colors.gold}
              />
            )}
            {!loaded && !error && (
              <Text style={s.note}>
                {vi ? "Đang mở dữ liệu trên thiết bị…" : "Opening device data…"}
              </Text>
            )}
            {stage === "home" && (
              <>
                <AstrologyHub
                  language={language}
                  now={now}
                  dateLabel={`${vi ? "Hôm nay" : "Today"} · ${localCalendarLabel(now, data.displayZone, language)}`}
                  myChart={myChart ? { big3: myChart.big3, story: big3Story(myChart.big3, language), onOpen: () => openSavedChart(myChart.report), onAddBirthTime: () => editBirthDetails(myChart.report, true) } : undefined}
                  onCreateChart={newForm}
                  today={myMoonHouse ? moonTodayFor(myMoonHouse.house, language) : null}
                  mythology={{ completed: data.library.completed.length, total: 12, onOpen: () => setStage("world") }}
                  compare={{ count: people.length, onOpen: () => setStage("people") }}
                  saved={{ count: data.reports.length, open: showSaved, onToggle: () => setShowSaved((open) => !open) }}
                  disabled={!loaded || busy}
                />
                {data.reports.length ? (
                  <Control label={vi ? "Tạo lá số mới" : "Create another chart"} onPress={newForm} />
                ) : null}
                {showSaved ? (
                  <View style={s.homeSection}>
                    {!data.reports.length ? (
                      <Text style={s.note}>
                        {vi
                          ? "Chưa có bản đồ. Bạn vẫn có thể khám phá đủ 12 chương mà không nhập ngày sinh."
                          : "No saved chart. All twelve chapters are available without a birth date."}
                      </Text>
                    ) : null}
                    {data.reports.map((r) => (
                      <View style={s.card} key={r.id}>
                        <Text style={s.body}>
                          {r.input.date} · {r.placeName}
                        </Text>
                        <Text style={s.note}>
                          {vi ? "Bản " : "Revision "}
                          {r.input.revision} ·{" "}
                          {r.input.precision === "exact"
                            ? vi ? "Biết giờ" : "Known time"
                            : r.input.precision === "approximate"
                              ? vi ? "Ước chừng" : "Approximate"
                              : vi ? "Không rõ giờ" : "Unknown time"}{" "}
                          ·{" "}
                          {localCalendarLabel(
                            new Date(r.createdAt),
                            data.displayZone,
                            language,
                          )}
                        </Text>
                        <Control
                          label={(vi ? "Mở bản đồ " : "Open chart ") + r.input.revision}
                          onPress={() => openSavedChart(r)}
                        />
                        <Control
                          label={(vi ? "Xóa bản đồ " : "Delete chart ") + r.input.revision}
                          onPress={() => setDeleteId(r.id)}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}
                <Control
                  active={showDetails}
                  label={
                    showDetails
                      ? vi
                        ? "Ẩn cách Nilaza tạo bản đồ"
                        : "Hide how Nilaza creates a chart"
                      : vi
                        ? "Cách Nilaza tạo bản đồ & bảo vệ dữ liệu"
                        : "How Nilaza calculates and protects your data"
                  }
                  onPress={() => setShowDetails((open) => !open)}
                />
                {showDetails ? (
                  <View style={s.disclosure}>
                    <Text style={s.note}>
                      {vi
                        ? "Vị trí được tính trên thiết bị; không cần nhà cung cấp trả phí. Ngày, giờ và nơi sinh không được gửi cho AI Astrology. Nội dung chiêm tinh là biểu tượng để giải trí và tự suy ngẫm."
                        : "Placements are calculated on your device without a paid vendor. Birth date, time and place are not sent to Astrology AI. Astrology is symbolic content for entertainment and reflection."}
                    </Text>
                  </View>
                ) : null}
                <Control
                  active={showTimeZone}
                  label={vi ? "Múi giờ hiển thị" : "Display time zone"}
                  onPress={() => setShowTimeZone((open) => !open)}
                />
                {showTimeZone ? (
                  <View style={s.homeSection}>
                    <Text style={s.note}>
                      {vi
                        ? "Chỉ đổi giờ hiển thị hôm nay và thời điểm lưu. Múi giờ sinh được xác định riêng theo nơi và ngày sinh."
                        : "Changes today's display and saved timestamps only. Birth time zone is resolved separately using the birth place and date."}
                    </Text>
                    <Field
                      label={vi ? "Múi giờ (IANA hoặc thiết bị)" : "Time zone (IANA or device)"}
                      value={zoneDraft}
                      onChange={setZoneDraft}
                    />
                    <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                      {["device", "Asia/Ho_Chi_Minh", "Europe/Paris", "America/New_York", "America/Los_Angeles"].map((z) => (
                        <Control key={z} label={z} active={zoneDraft === z} onPress={() => setZoneDraft(z)} />
                      ))}
                    </ScrollView>
                    <Action
                      label={vi ? "Lưu múi giờ" : "Save time zone"}
                      onPress={() => void changeZone()}
                      disabled={!loaded || busy}
                    />
                  </View>
                ) : null}
                <Control
                  active={showReflections}
                  label={`${vi ? "Suy ngẫm đã lưu" : "Saved reflections"} · ${data.notes.length}`}
                  onPress={() => setShowReflections((open) => !open)}
                />
                {showReflections ? (
                  <View style={s.homeSection}>
                    {!data.notes.length ? (
                      <Text style={s.note}>
                        {vi
                          ? "Mở một chương và chọn viết suy ngẫm để bắt đầu."
                          : "Open a chapter and choose to write a reflection."}
                      </Text>
                    ) : null}
                    {data.notes.map((n) => (
                      <View key={n.id} style={s.card}>
                        <Text style={s.heading}>{n.title}</Text>
                        <Text style={s.note}>{n.prompt}</Text>
                        <Text selectable style={s.body}>{n.text}</Text>
                        <Control label={vi ? "Xóa suy ngẫm" : "Delete reflection"} onPress={() => setDeleteId(n.id)} />
                      </View>
                    ))}
                  </View>
                ) : null}
                <Control
                  active={showExport}
                  label={vi ? "Sao lưu & riêng tư" : "Backup & privacy"}
                  onPress={() => setShowExport((open) => !open)}
                />
                {showExport ? (
                  <View style={s.homeSection}>
                    <Text style={s.note}>
                      {vi
                        ? "Dữ liệu lưu trên thiết bị này, chưa đồng bộ cloud. Hãy xuất bản sao trước khi đổi máy hoặc xóa dữ liệu ứng dụng."
                        : "Data is saved on this device and is not synced to the cloud. Export a copy before changing devices or clearing app data."}
                    </Text>
                    <Control
                      label={vi ? "Xuất dữ liệu chiêm tinh" : "Export Astrology data"}
                      onPress={() => {
                        const account = accountGeneration.current;
                        void storage
                          .loadJson<unknown>(astrologyStorageKey, freshAstrologyData())
                          .then((v) => { if (live.current && account === accountGeneration.current) setExportText(JSON.stringify(v, null, 2)); })
                          .catch(() => { if (live.current && account === accountGeneration.current) failSave(); });
                      }}
                    />
                  </View>
                ) : null}
              </>
            )}
            {stage === "people" && (
              <PeopleList
                language={language}
                people={people}
                hasOwnChart={!!myChartReport}
                onAdd={newPersonForm}
                onOpen={(person) => {
                  setComparePersonId(person.id);
                  setConfirmDeletePerson(false);
                  setStage("compare");
                }}
                onCreateOwn={newForm}
                disabled={!loaded || busy}
              />
            )}
            {stage === "consent" && personDraft && (
              <ConsentCard
                language={language}
                busy={busy}
                onConfirm={() => void savePerson()}
                onCancel={() => {
                  setPersonDraft(null);
                  setStage("people");
                }}
              />
            )}
            {stage === "compare" && comparePerson && comparison && (
              <CompareView
                language={language}
                person={comparePerson}
                text={comparison}
                confirmDelete={confirmDeletePerson}
                busy={busy}
                onDelete={() => (confirmDeletePerson ? void deletePerson(comparePerson.id) : setConfirmDeletePerson(true))}
                onCancelDelete={() => setConfirmDeletePerson(false)}
              />
            )}
            {stage === "form" && (
              <>
                <Text style={s.kicker}>{formFor === "person" ? (vi ? "SO LÁ SỐ" : "COMPARE CHARTS") : vi ? "TẠO LÁ SỐ" : "CREATE A CHART"}</Text>
                <Text style={s.title}>
                  {formFor === "person"
                    ? vi ? "Lá số của người ấy" : "Their chart"
                    : vi ? "Bầu trời lúc bạn chào đời" : "The sky when you were born"}
                </Text>
                <Text style={s.body}>
                  {vi
                    ? "Ba thông tin là đủ. Giờ sinh không chắc cũng không sao."
                    : "Three details are enough. It's fine if you're unsure of the time."}
                </Text>
                {formFor === "person" ? (
                  <PersonFields
                    language={language}
                    name={personName}
                    onName={setPersonName}
                    relationship={personRelation}
                    onRelationship={setPersonRelation}
                  />
                ) : null}
                <BirthDateFields
                  language={language}
                  value={date}
                  onChange={(v) => {
                    setDate(v);
                    resetOccurrence();
                  }}
                />
                <Text style={s.fieldLabel}>{vi ? "Giờ sinh" : "Birth time"}</Text>
                <View style={s.row}>
                  {(["exact", "approximate", "unknown"] as const).map(
                    (p, i) => (
                      <Control
                        key={p}
                        label={
                          vi
                            ? ["Biết chính xác", "Khoảng", "Không rõ"][i]
                            : ["Exact", "Roughly", "Unknown"][i]
                        }
                        active={precision === p}
                        onPress={() => {
                          setPrecision(p);
                          resetOccurrence();
                        }}
                      />
                    ),
                  )}
                </View>
                {precision !== "unknown" && (
                  <BirthTimeFields
                    language={language}
                    value={time}
                    onChange={(v) => {
                      setTime(v);
                      resetOccurrence();
                    }}
                  />
                )}
                <Text style={s.note}>
                  {vi
                    ? "Không nhớ? Hỏi bố mẹ hoặc xem giấy khai sinh. Chọn “Không rõ” vẫn có Mặt Trời, Mặt Trăng và các hành tinh."
                    : "Not sure? Ask family or check your birth certificate. Choosing “Unknown” still gives you the Sun, Moon and planets."}
                </Text>
                {precision === "approximate" && (
                  <>
                    <Field
                      label={
                        vi
                          ? "Sai số ước tính ± phút"
                          : "Estimated difference ± minutes"
                      }
                      value={minutes}
                      onChange={setMinutes}
                      placeholder="30"
                    />
                    <Text style={s.note}>
                      {vi
                        ? "Ví dụ: 30 phút nghĩa là giờ sinh có thể sớm hoặc muộn hơn giờ đã nhập tối đa 30 phút."
                        : "For example, 30 minutes means the recorded time may be up to 30 minutes earlier or later."}
                    </Text>
                  </>
                )}
                {precision !== "exact" && (
                  <View style={s.disclosure}>
                  <Text style={s.note}>
                    {vi
                      ? "Bạn vẫn có thể xem các vị trí có khả năng. Không hiển thị Cung mọc, Thiên đỉnh, nhà hay góc hợp chính xác khi chưa rõ giờ."
                      : "You can still explore possible placements. Rising sign, Midheaven, houses and exact aspects are unavailable without a confirmed time."}
                  </Text>
                  </View>
                )}
                <Field
                  label={vi ? "Nơi sinh" : "Birth place"}
                  value={query}
                  onChange={(v) => {
                    setQuery(v);
                    setPlace(null);
                    setConfirmed(false);
                    resetOccurrence();
                  }}
                  placeholder={
                    vi ? "Hanoi, Paris, New York…" : "Hanoi, Paris, New York…"
                  }
                />
                {!place &&
                  matches.map((p) => (
                    <Control
                      key={p.id}
                      label={label(p)}
                      onPress={() => {
                        setPlace(p);
                        setQuery(label(p));
                        setConfirmed(false);
                        resetOccurrence();
                      }}
                    />
                  ))}
                {!place && query.trim().length >= 2 && !matches.length && (
                  <Text style={s.note}>
                    {vi
                      ? "Không tìm thấy. Thử tên quốc tế không dấu hoặc thành phố lớn gần đó; không chọn nơi xa chỉ để tiếp tục vì Cung mọc phụ thuộc tọa độ."
                      : "No match. Try an international spelling or a nearby city; do not choose a distant place merely to continue because the Ascendant depends on coordinates."}
                  </Text>
                )}
                {place && (
                  <View style={s.card}>
                    <Text style={s.heading}>{label(place)}</Text>
                    <Text style={s.body}>
                      {place.latitude.toFixed(4)}°, {place.longitude.toFixed(4)}
                      ° · {place.timezone}
                    </Text>
                    <Control
                      label={
                        confirmed
                          ? vi
                            ? "Đã xác nhận nơi sinh"
                            : "Birth place confirmed"
                          : vi
                            ? "Đây đúng là nơi sinh của tôi"
                            : "This is my birth place"
                      }
                      active={confirmed}
                      onPress={() => setConfirmed(!confirmed)}
                    />
                  </View>
                )}
                {ambiguous.length > 0 && (
                  <View style={s.card}>
                    {ambiguous.map((a, i) => (
                      <Control
                        key={a.utc}
                        active={occurrence === (i ? "later" : "earlier")}
                        label={`${vi ? (i ? "Lần thứ hai" : "Lần thứ nhất") : i ? "Second occurrence" : "First occurrence"} · UTC${a.offset}`}
                        onPress={() => setOccurrence(i ? "later" : "earlier")}
                      />
                    ))}
                  </View>
                )}
                <Text style={s.note}>
                  {vi
                    ? "Chọn đúng thành phố vì nơi sinh xác định múi giờ được dùng để tính."
                    : "Choose the correct city because it determines the time zone used in the calculation."}
                </Text>
                <Control
                  active={showDetails}
                  label={
                    showDetails
                      ? vi
                        ? "Ẩn cách tính & độ chính xác"
                        : "Hide calculation details"
                      : vi
                        ? "Nilaza tính lá số thế nào?"
                        : "How does Nilaza calculate a chart?"
                  }
                  onPress={() => setShowDetails((open) => !open)}
                />
                {showDetails ? (
                  <View style={s.disclosure}>
                    <Text style={s.note}>
                      {vi
                        ? "Địa điểm dùng dữ liệu GeoNames (CC BY 4.0); tọa độ là tâm khu dân cư. Múi giờ lịch sử dùng quy tắc IANA trên thiết bị. Sinh gần ranh giới múi giờ hoặc trước năm 1970 có thể cần đối chiếu hồ sơ."
                        : "Places use GeoNames (CC BY 4.0), with coordinates at the settlement center. Historical time uses IANA rules on this device. Births near time-zone boundaries or before 1970 may need record verification."}
                    </Text>
                    <Text style={s.note}>
                      {vi
                        ? "Kết quả là phép tính trên thiết bị, không phải xác nhận chuyên môn cho mọi đầu vào."
                        : "Results are calculated on this device and are not expert certification for every input."}
                    </Text>
                  </View>
                ) : null}
                <Text style={s.note}>
                  {formFor === "person"
                    ? vi
                      ? "Tính ngay trên máy, không trừ lượt. Nilaza hỏi bạn trước khi lưu, và không gửi lá số của người ấy cho AI."
                      : "Calculated on this device, no allowance used. Nilaza asks before saving and never sends their chart to AI."
                    : vi
                      ? "Tính ngay trên máy, không trừ lượt. Lưu lại hay không là do bạn chọn sau khi xem."
                      : "Calculated on this device, no allowance used. You choose whether to save it after you see it."}
                </Text>
                <Action
                  label={formFor === "person" ? (vi ? "Tiếp tục" : "Continue") : vi ? "Xem bầu trời của mình" : "See my sky"}
                  onPress={reviewInput}
                  disabled={busy || !loaded}
                />
              </>
            )}
            {stage === "confirm" && pending && (
              <>
                <Text style={s.title}>
                  {vi ? "Xác nhận trước khi tạo" : "Confirm before calculating"}
                </Text>
                <Text style={s.body}>
                  {pending.input.date} ·{" "}
                  {precision === "unknown"
                    ? vi
                      ? "Không rõ giờ"
                      : "Unknown time"
                    : pending.input.time}{" "}
                  · {pending.placeName}
                </Text>
                <Text style={s.body}>
                  {pending.input.place.timezone}
                  {pending.resolved.offsetSeconds !== null
                    ? ` · ${vi ? "lệch giờ quốc tế" : "UTC offset"} ${pending.resolved.offsetSeconds / 3600 >= 0 ? "+" : ""}${pending.resolved.offsetSeconds / 3600}h`
                    : ""}
                </Text>
                <Text style={s.note}>
                  {pending.resolved.range
                    ? `${vi ? "Khoảng UTC" : "UTC interval"}: ${pending.resolved.range.start} → ${pending.resolved.range.endExclusive}`
                    : `UTC: ${pending.resolved.utc}`}
                </Text>
                <Text style={s.body}>
                  {vi
                    ? "Hoàng đạo nhiệt đới · hệ nhà Whole Sign. Tính ngay trên máy, không trừ lượt. Bạn chọn lưu hay không sau khi xem kết quả."
                    : "Tropical zodiac · Whole Sign houses. Calculated on device without credits. You can choose to save after viewing the result."}
                </Text>
                <Action
                  label={vi ? "Tạo bản đồ" : "Calculate chart"}
                  onPress={() => {
                    void compute();
                  }}
                  disabled={busy}
                />
                <Control
                  label={vi ? "Sửa thông tin" : "Edit details"}
                  onPress={() => {
                    generation.current++;
                    setStage("form");
                  }}
                />
              </>
            )}
            {stage === "report" && report && presentation && (
              <>
                <Text style={s.kicker}>
                  {chartHeaderLine(report.input, report.placeName, language).toUpperCase()}
                </Text>
                <Text style={s.title}>
                  {vi ? "Lá số của bạn" : "Your chart"}
                </Text>
                <Text style={s.note}>
                  {report.input.place.timezone}
                  {report.input.precision === "approximate"
                    ? ` · ± ${report.input.uncertaintyMinutes} ${vi ? "phút · giờ ước chừng" : "minutes · approximate time"}`
                    : ""}
                </Text>
                {reportBig3 ? <BigThreeCards big3={reportBig3} language={language} /> : null}
                {reportBig3 ? <Big3Summary story={big3Story(reportBig3, language)} /> : null}
                <SkyTabs
                  tabs={[{ id: "overview" as const, label: vi ? "Tổng quan" : "Overview" }, ...skyTopicIds.map((id) => ({ id, label: topicLabel(id, language) }))]}
                  active={chartTab}
                  onChange={setChartTab}
                />
                {chartTab !== "overview" ? (
                  <TopicPanel
                    reading={topicReading(report.chart, chartTab, language)}
                    language={language}
                    onAddBirthTime={() => editBirthDetails(report, true)}
                  />
                ) : report.chart.time.precision === "exact" ? (
                  <>
                    <ChartRowLink
                      icon="planet-outline"
                      title={vi ? "Bánh xe lá số & dữ liệu" : "Chart wheel & data"}
                      detail={vi ? "Độ, nhà, góc hợp, cách tính" : "Degrees, houses, aspects, method"}
                      onPress={() => setStage("chart")}
                    />
                    <AiDeepRead
                      language={language}
                      available={canRequestAstrologyAi && !ownerPremiumPreview}
                      premiumOnSale={premiumOnSale}
                      status={panelAiStatus}
                      answer={aiAnswer}
                      error={aiErrorMessage}
                      onWrite={() => beginAiQuestion(vi
                        ? "Hãy đọc sâu lá số của mình: điều gì nổi bật nhất, các phần nối với nhau thế nào, và mình có thể tự hỏi gì?"
                        : "Give me a deep read of my chart: what stands out, how the parts connect, and what could I ask myself?")}
                      onOpenFull={() => setStage("chart")}
                    />
                    {presentation.facts
                      .filter((f) =>
                        ["sun", "moon", "ascendant"].includes(f.id),
                      )
                      .map((f) => (
                        <View key={f.id} style={s.card}>
                          <Text style={s.heading}>
                            {vi ? f.label.vi : f.label.en} ·{" "}
                            {localizeAstrologySign(f.sign, language)}{" "}
                            {f.degree.toFixed(2)}°
                          </Text>
                          <Text style={s.body}>
                            {bodyMeaning(f.id, language)}
                          </Text>
                          <Text style={s.kicker}>
                            {vi
                              ? "LĂNG KÍNH TỪ CÂU CHUYỆN"
                              : "A LENS FROM THE STORY"}
                          </Text>
                          <Text style={s.body}>
                            {
                              chapterData.chapters.find((c) => c.id === f.sign)!
                                .reflection[vi ? "vi" : "en"]
                            }
                          </Text>
                          <Text style={s.heading}>
                            {
                              chapterData.chapters.find((c) => c.id === f.sign)!
                                .question[vi ? "vi" : "en"]
                            }
                          </Text>
                        </View>
                      ))}
                    <Text style={s.body}>
                      {vi
                        ? "Bắt đầu bằng một tình huống bạn đang trải qua: điều bạn muốn chủ động làm, điều giúp bạn thấy dễ chịu, và cách bạn bước vào hoàn cảnh đó có đang cùng hướng không? Chạm từng vị trí trên vòng để xem dữ kiện và câu hỏi liên quan."
                        : "Start with a current situation: are your intended action, your need for comfort, and the way you approach it pointing in the same direction? Touch placements on the wheel to explore the facts and related questions."}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={s.heading}>
                    {vi
                        ? report.input.precision === "approximate"
                          ? "Khả năng quanh giờ ước tính"
                          : "Khả năng khi chưa rõ giờ sinh"
                        : report.input.precision === "approximate"
                          ? "Possibilities around the estimated time"
                          : "Possibilities without a confirmed birth time"}
                    </Text>
                    <Text style={s.body}>
                      {vi
                        ? report.input.precision === "approximate"
                          ? `Nilaza lấy mẫu mỗi 15 phút trong khoảng ±${report.input.uncertaintyMinutes} phút. Đây là các khả năng được lấy mẫu, không phải giới hạn sai số được bảo đảm.`
                          : "Nilaza lấy mẫu mỗi 15 phút trong ngày sinh. Đây là các khả năng được lấy mẫu, không phải giới hạn sai số được bảo đảm."
                        : report.input.precision === "approximate"
                          ? `Nilaza samples every fifteen minutes within ±${report.input.uncertaintyMinutes} minutes. These are sampled possibilities, not guaranteed error bounds.`
                          : "Nilaza samples every fifteen minutes across the birth date. These are sampled possibilities, not guaranteed error bounds."}
                    </Text>
                    {report.chart.sampledRanges.map((r) => (
                      <View key={r.body} style={[s.card, s.rangeCard]}>
                        <View style={s.rangeHeader}>
                          <Text style={s.rangeGlyph}>
                            {r.possibleSigns.length === 1
                              ? signGlyphs[r.possibleSigns[0]] ?? "✧"
                              : "✧"}
                          </Text>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={s.rangeBodyName}>
                              {localizeAstrologyBody(r.body, language)}
                            </Text>
                            <Text style={s.rangeHint}>
                              {r.possibleSigns.length === 1
                                ? vi
                                  ? "Cung xuất hiện trong các mẫu"
                                  : "Sign found in the sampled interval"
                                : vi
                                  ? "Các cung khả dĩ trong các mẫu"
                                  : "Possible signs in the sampled interval"}
                            </Text>
                          </View>
                        </View>
                        <View style={s.rangeSigns}>
                          {r.possibleSigns.map((id) => (
                            <View key={id} style={s.rangeSignChip}>
                              <Text style={s.rangeSignGlyph}>
                                {signGlyphs[id] ?? "✧"}
                              </Text>
                              <Text style={s.rangeSignName}>
                                {localizeAstrologySign(
                                  id as Parameters<typeof localizeAstrologySign>[0],
                                  language,
                                )}
                              </Text>
                            </View>
                          ))}
                        </View>
                        <Text style={s.rangeMeaning}>
                          {bodyMeaning(r.body, language)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
                <Action
                  label={
                    data.reports.some((r) => r.id === report.id)
                      ? vi
                        ? "Đã lưu bản đồ"
                        : "Chart saved"
                      : vi
                        ? "Lưu bản đồ trên thiết bị"
                        : "Save chart on device"
                  }
                  onPress={() => {
                    void saveReport();
                  }}
                  disabled={busy || !loaded}
                />
                {!!onSaveToJournal && (
                  <Control
                    label={
                      vi
                        ? "Lưu câu hỏi vào Nhật ký"
                        : "Save questions to Journal"
                    }
                    onPress={() => {
                      const context = buildSafeAstrologyContext(
                        report,
                        language,
                      );
                      onSaveToJournal({
                        sourceId: report.id,
                        title: context.sourceLabel,
                        summary: context.safeSummary,
                      });
                      setNotice(
                        vi
                          ? "Đã lưu câu hỏi vào Nhật ký trên thiết bị."
                          : "Questions saved to Journal on this device.",
                      );
                    }}
                  />
                )}
                {!!onDiscuss && (
                  <>
                    <Text style={s.note}>
                      {vi
                        ? "Bạn có thể mang các cung và câu hỏi sang trò chuyện. Ngày, giờ và nơi sinh không được đính kèm; chưa gửi tin nhắn cho đến khi bạn chọn gửi."
                        : "Bring the signs and questions into chat. Birth date, time and place are excluded; no message is sent until you choose to send."}
                    </Text>
                    <Control
                      label={
                        vi
                          ? "Mở trò chuyện với Astrologer"
                          : "Open Astrologer conversation"
                      }
                      onPress={() => onDiscuss(report)}
                    />
                  </>
                )}
                {report.input.date < "1970-01-01" && (
                  <Text style={s.error}>
                    {vi
                      ? "Ngày sinh trước 1970: múi giờ tại địa phương cần đối chiếu tư liệu lịch sử. Vùng IANA hiện tại có thể không đại diện đủ mọi thay đổi trong quá khứ."
                      : "For births before 1970, verify local time against historical records. A present-day IANA region may not represent every past local change."}
                  </Text>
                )}
                <Control
                  label={
                    vi
                      ? "Sửa dữ liệu · tạo bản mới"
                      : "Edit birth details · new revision"
                  }
                  onPress={() => editBirthDetails(report)}
                />
                <Text style={s.heading}>
                  {vi ? "Độ tin cậy & phương pháp" : "Accuracy & method"}
                </Text>
                <Text style={s.note}>
                  {vi
                    ? "Vị trí được tính bằng Astronomy Engine 2.1.19 (MIT). Bộ kiểm tra 500 vị trí / 50 thời điểm với NASA/JPL đạt sai số tối đa 0,0051°. Đây là kiểm tra mẫu, không bảo đảm cho mọi đầu vào. Giờ sinh, tọa độ và quy tắc múi giờ lịch sử có thể gây sai lệch lớn hơn."
                    : "Positions use Astronomy Engine 2.1.19 (MIT). A 500-position / 50-instant NASA/JPL comparison showed a maximum difference of 0.0051°. This is sample validation, not a guarantee for every input. Birth time, location and historical time-zone rules can introduce larger errors."}
                </Text>
                {Math.abs(report.input.place.latitude) > 66 && (
                  <Text style={s.error}>
                    {vi
                      ? "Vĩ độ cao: cần đối chiếu chuyên biệt Cung mọc và hệ nhà."
                      : "High latitude: Ascendant and houses need specialized cross-checking."}
                  </Text>
                )}
                <Text style={s.note}>
                  {report.chart.provenance.calculationVersion} ·{" "}
                  {vi ? "Múi giờ" : "Time zone"}:{" "}
                  {report.chart.time.provenance.timezone}
                  {report.chart.time.provenance.tzdata ===
                  "runtime_version_unavailable"
                    ? vi
                      ? " · thiết bị không công bố phiên bản cơ sở múi giờ; bản lưu giữ UTC và tọa độ đã dùng."
                      : " · device does not expose its time-zone database version; saved data retains the resolved UTC and coordinates."
                    : ""}
                </Text>
                <Text style={s.note}>
                  {vi
                    ? "Diễn giải biểu tượng không xác định tính cách hoặc dự đoán tương lai. Không dùng kết quả để đưa ra quyết định y tế, pháp lý hoặc tài chính."
                    : "Symbolic interpretation does not establish personality or predict the future. Do not use it for medical, legal or financial decisions."}
                </Text>
              </>
            )}
          </ScrollView>
        </>
      )}
      <Modal
        visible={showAiConsent}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAiConsent(false)}
      >
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.heading}>
              {vi ? "Cho phép gửi dữ kiện lá số cho AI Chiêm tinh?" : "Share chart facts with Astrology AI?"}
            </Text>
            <Text style={s.note}>
              {vi
                ? "Nilaza sẽ gửi một số vị trí hành tinh, góc hợp, nhà và lưu ý liên quan do app chọn từ lá số, cùng câu hỏi hiện tại, tới nhà cung cấp AI để viết một bài đọc. Ngày giờ sinh, nơi sinh, tọa độ, Nhật ký và lịch sử trò chuyện không được gửi. Câu hỏi không được lưu trong bài đọc hay nhật ký sử dụng; bài đọc đã lược bớt thông tin được lưu vào tài khoản để bạn xem và xóa."
                : "Nilaza sends a limited set of relevant placements, aspects, houses and caveats selected by the app, together with your current question, to the AI provider for one response. Birth date, time, place, coordinates, Journal and chat history are excluded. Your question is not saved in the report or usage log; a sanitized report is stored on your account for you to view or delete."}
            </Text>
            {astrologyQaTraceCaptureEnabled ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: qaTraceConsentAccepted }}
                onPress={() => setQaTraceConsentAccepted((value) => !value)}
                style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 12 }}
              >
                <Text style={{ color: colors.gold, fontSize: 18 }}>{qaTraceConsentAccepted ? "☑" : "□"}</Text>
                <Text style={s.note}>
                  {vi
                    ? "Tùy chọn QA staging: cho phép mã hóa và lưu nguyên văn system prompt, dữ kiện/câu hỏi đã gửi và phản hồi provider để Owner đối chiếu trong AI Studio. Chỉ Owner xem được trong tối đa 24 giờ; ciphertext được dọn theo lịch purge staging. Bỏ chọn nếu không muốn lưu."
                    : "Optional staging QA: allow the exact system prompt, submitted facts/question, and provider response to be encrypted and stored for Owner review in AI Studio. Only an Owner can view it for up to 24 hours; ciphertext is removed by the staging purge schedule. Leave unchecked to avoid capture."}
                </Text>
              </Pressable>
            ) : null}
            <Action
              label={vi ? "Đồng ý và gửi một câu hỏi" : "Agree and send one question"}
              disabled={!pendingAiQuestion || aiStatus === "loading"}
              onPress={() => void runAiQuestion()}
            />
            <Control
              label={vi ? "Hủy" : "Cancel"}
              onPress={() => setShowAiConsent(false)}
            />
          </View>
        </View>
      </Modal>
      <Modal
        visible={deleteId !== null}
        transparent
        animationType="none"
        onRequestClose={() => setDeleteId(null)}
      >
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.heading}>
              {vi
                ? "Xóa bản đã chọn và report AI?"
                : "Delete this chart and its AI report?"}
            </Text>
            <Text style={s.note}>
              {vi
                ? "Nếu report đã đồng bộ, report trên tài khoản cũng sẽ bị xóa. Các mục khác vẫn được giữ."
                : "If an AI report was synced, it will also be deleted from your account. Other items are retained."}
            </Text>
            <Action
              label={deletingAiReport ? (vi ? "Đang xóa…" : "Deleting…") : vi ? "Xác nhận xóa" : "Confirm deletion"}
              disabled={busy || deletingAiReport}
              onPress={() => {
                const targetId = deleteId;
                if (!targetId) return;
                const account = accountGeneration.current;
                setDeletingAiReport(true);
                void (async () => {
                  try {
                    await onDeleteAiReport?.(targetId);
                    if (!live.current || account !== accountGeneration.current) return;
                    await save({
                      ...workingData.current,
                      reports: workingData.current.reports.filter((r) => r.id !== targetId),
                      notes: workingData.current.notes.filter((n) => n.id !== targetId),
                    });
                    if (live.current && account === accountGeneration.current) {
                      setDeleteId(null);
                      if (report?.id === targetId) setReport(null);
                    }
                  } catch {
                    if (live.current && account === accountGeneration.current) setError(vi
                      ? "Chưa xóa được report trên tài khoản; bản đồ trên thiết bị vẫn được giữ để bạn thử lại."
                      : "The account report could not be deleted; the device chart remains so you can retry.");
                  } finally {
                    if (live.current && account === accountGeneration.current) setDeletingAiReport(false);
                  }
                })();
              }}
            />
            <Control
              label={vi ? "Hủy" : "Cancel"}
              onPress={() => setDeleteId(null)}
            />
            {message}
          </View>
        </View>
      </Modal>
      <Modal
        visible={exportText !== null}
        animationType="none"
        onRequestClose={() => setExportText(null)}
      >
        <View style={[s.root, { padding: 24 }]}>
          <Control
            label={vi ? "Đóng bản xuất" : "Close export"}
            onPress={() => setExportText(null)}
          />
          <Text style={s.note}>
            {vi
              ? "Bản xuất chứa thông tin sinh và suy ngẫm riêng tư. Chỉ chia sẻ đến nơi bạn chọn và tin cậy."
              : "This export contains private birth data and reflections. Share only to a destination you choose and trust."}
          </Text>
          <Control
            label={vi ? "Chia sẻ bản xuất JSON" : "Share JSON export"}
            onPress={() => {
              void Share.share({
                title: "Nilaza Astrology",
                message: exportText ?? "",
              }).catch(() =>
                setError(
                  vi
                    ? "Chưa chia sẻ được. Bạn có thể chọn và sao chép nội dung."
                    : "Sharing unavailable. Select and copy the content instead.",
                ),
              );
            }}
          />
          <ScrollView>
            <Text selectable style={s.note}>
              {exportText}
            </Text>
          </ScrollView>
          {message}
        </View>
      </Modal>
      <Modal
        visible={reflection !== null}
        animationType="none"
        onRequestClose={() => setReflection(null)}
      >
        <KeyboardAvoidingView
          style={[s.root, { padding: 24, paddingTop: 36, gap: 16 }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16 }}
          >
            <Text style={s.heading}>{reflection?.title}</Text>
            <Text style={s.body}>{reflection?.prompt}</Text>
            <Field
              label={vi ? "Suy ngẫm riêng tư" : "Private reflection"}
              value={note}
              onChange={setNote}
              multiline
            />
            <Action
              label={vi ? "Lưu suy ngẫm" : "Save reflection"}
              disabled={!note.trim() || busy || data.notes.length >= 100}
              onPress={() => {
                if (!reflection) return;
                const n = {
                  ...reflection,
                  id: `note-${Date.now()}`,
                  text: note.trim(),
                  createdAt: new Date().toISOString(),
                };
                void save({
                  ...workingData.current,
                  notes: [n, ...workingData.current.notes],
                })
                  .then(() => {
                    setReflection(null);
                    setNotice(
                      vi
                        ? "Đã lưu suy ngẫm trên thiết bị."
                        : "Reflection saved on this device.",
                    );
                  })
                  .catch(failSave);
              }}
            />
            <Control
              label={vi ? "Đóng · không lưu" : "Close without saving"}
              onPress={() => setReflection(null)}
            />
            {message}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.body}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.moon}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={multiline ? 4000 : 140}
        multiline={multiline}
        style={[
          s.input,
          multiline && { minHeight: 160, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
function Action({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.action, disabled && { opacity: 0.5 }]}
    >
      <Text style={s.actionText}>{label}</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: colors.charcoal },
  page: {
    padding: 22,
    paddingBottom: 48,
    gap: 20,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  top: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  fieldLabel: {
    color: colors.ivory,
    fontFamily: typography.bodySemiBoldFontFamily,
    fontSize: 14,
    marginTop: 8,
  },
  kicker: {
    fontFamily: typography.bodyMediumFontFamily,
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.3,
  },
  title: {
    fontFamily: typography.headlineRegularFontFamily,
    color: colors.ivory,
    fontSize: 36,
    lineHeight: 43,
  },
  heading: {
    fontFamily: typography.headlineRegularFontFamily,
    color: colors.ivory,
    fontSize: 27,
    lineHeight: 34,
  },
  body: {
    fontFamily: typography.bodyFontFamily,
    color: colors.ivory,
    fontSize: 16,
    lineHeight: 26,
  },
  note: {
    fontFamily: typography.bodyFontFamily,
    color: colors.moon,
    fontSize: 14,
    lineHeight: 22,
  },
  error: {
    fontFamily: typography.bodyFontFamily,
    color: "#F0BAC3",
    fontSize: 15,
    lineHeight: 24,
    padding: 12,
  },
  input: {
    fontFamily: typography.bodyFontFamily,
    color: colors.ivory,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#211F22",
  },
  action: {
    minHeight: 52,
    padding: 16,
    backgroundColor: colors.gold,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 16,
    color: colors.charcoal,
    textAlign: "center",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    gap: 12,
  },
  disclosure: {
    backgroundColor: "rgba(255, 255, 255, 0.045)",
    borderColor: "rgba(201, 164, 92, 0.22)",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  homeSection: { gap: 12, paddingHorizontal: 2 },
  rangeCard: {
    backgroundColor: "rgba(247, 241, 230, 0.045)",
    gap: 12,
  },
  rangeHeader: { alignItems: "center", flexDirection: "row", gap: 14 },
  rangeGlyph: {
    alignItems: "center",
    color: colors.gold,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 42,
    lineHeight: 50,
    minWidth: 50,
    textAlign: "center",
  },
  rangeBodyName: {
    color: colors.ivory,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 24,
    lineHeight: 30,
  },
  rangeHint: {
    color: colors.moon,
    fontFamily: typography.bodyFontFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  rangeSigns: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rangeSignChip: {
    alignItems: "center",
    backgroundColor: "rgba(201, 164, 92, 0.10)",
    borderColor: "rgba(201, 164, 92, 0.38)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  rangeSignGlyph: {
    color: colors.gold,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 18,
  },
  rangeSignName: {
    color: colors.ivory,
    fontFamily: typography.bodyMediumFontFamily,
    fontSize: 13,
  },
  rangeMeaning: {
    color: "#DCD8D0",
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 22,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.charcoal,
    padding: 22,
    borderRadius: 12,
    gap: 18,
  },
});
