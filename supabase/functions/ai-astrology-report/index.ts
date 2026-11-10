import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as Astronomy from "https://esm.sh/astronomy-engine@2.1.19";
import { generateWithModelRoute } from "../_shared/model-router.ts";
import { AiRequestError, aiAuthUserOrUnavailable, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";
import { featurePaused } from "../_shared/feature-switch.ts";
import { claimDailyAttempt } from "../_shared/daily-attempts.ts";
import { accountTierPolicy } from "../_shared/account-tier-policy.ts";
import { compactLines, safeJsonParse, sanitizeProviderMetadata } from "../_shared/model-provider.ts";

type Language = "vi" | "en";
type AstrologyFocus = "personality" | "love" | "career" | "inner_lesson";

type BirthProfileInput = {
  birthDate?: string;
  birthTime?: string;
  birthTimeKnown?: boolean;
  birthPlace?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  utcOffsetMinutes?: number;
  geocodeProvider?: string;
  geocodePlaceId?: string;
  consentVersion?: string;
};

type AstrologyInput = {
  language?: Language | string;
  focus?: AstrologyFocus | string;
  birthProfile?: BirthProfileInput;
};

type PlanetDefinition = {
  key: string;
  label: {
    vi: string;
    en: string;
  };
  body: any;
  allowRetrograde: boolean;
};

const provider = "astronomy-engine";
const providerVersion = "2.1.19";
const calculationVersion = "nilaza-astronomy-engine-mvp-v1";
const promptVersionId = "astrology_interpreter_system";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const signs = [
  { id: "aries", vi: "Bạch Dương", en: "Aries" },
  { id: "taurus", vi: "Kim Ngưu", en: "Taurus" },
  { id: "gemini", vi: "Song Tử", en: "Gemini" },
  { id: "cancer", vi: "Cự Giải", en: "Cancer" },
  { id: "leo", vi: "Sư Tử", en: "Leo" },
  { id: "virgo", vi: "Xử Nữ", en: "Virgo" },
  { id: "libra", vi: "Thiên Bình", en: "Libra" },
  { id: "scorpio", vi: "Bọ Cạp", en: "Scorpio" },
  { id: "sagittarius", vi: "Nhân Mã", en: "Sagittarius" },
  { id: "capricorn", vi: "Ma Kết", en: "Capricorn" },
  { id: "aquarius", vi: "Bảo Bình", en: "Aquarius" },
  { id: "pisces", vi: "Song Ngư", en: "Pisces" }
];

const planets: PlanetDefinition[] = [
  { key: "sun", label: { vi: "Mặt Trời", en: "Sun" }, body: Astronomy.Body.Sun, allowRetrograde: false },
  { key: "moon", label: { vi: "Mặt Trăng", en: "Moon" }, body: Astronomy.Body.Moon, allowRetrograde: false },
  { key: "mercury", label: { vi: "Sao Thủy", en: "Mercury" }, body: Astronomy.Body.Mercury, allowRetrograde: true },
  { key: "venus", label: { vi: "Sao Kim", en: "Venus" }, body: Astronomy.Body.Venus, allowRetrograde: true },
  { key: "mars", label: { vi: "Sao Hỏa", en: "Mars" }, body: Astronomy.Body.Mars, allowRetrograde: true },
  { key: "jupiter", label: { vi: "Sao Mộc", en: "Jupiter" }, body: Astronomy.Body.Jupiter, allowRetrograde: true },
  { key: "saturn", label: { vi: "Sao Thổ", en: "Saturn" }, body: Astronomy.Body.Saturn, allowRetrograde: true },
  { key: "uranus", label: { vi: "Sao Thiên Vương", en: "Uranus" }, body: Astronomy.Body.Uranus, allowRetrograde: true },
  { key: "neptune", label: { vi: "Sao Hải Vương", en: "Neptune" }, body: Astronomy.Body.Neptune, allowRetrograde: true },
  { key: "pluto", label: { vi: "Sao Diêm Vương", en: "Pluto" }, body: Astronomy.Body.Pluto, allowRetrograde: true }
];

const aspectDefinitions = [
  { type: "conjunction", angle: 0, orb: 6 },
  { type: "sextile", angle: 60, orb: 4 },
  { type: "square", angle: 90, orb: 5 },
  { type: "trine", angle: 120, orb: 5 },
  { type: "opposition", angle: 180, orb: 6 }
];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function signedLongitudeDelta(from: number, to: number) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function signForLongitude(longitude: number) {
  const normalized = normalizeDegrees(longitude);
  const signIndex = Math.floor(normalized / 30);
  const sign = signs[signIndex] ?? signs[0];
  return {
    id: sign.id,
    label: {
      vi: sign.vi,
      en: sign.en
    },
    degree: round(normalized - signIndex * 30)
  };
}

function parseFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isValidFocus(value: string | undefined): value is AstrologyFocus {
  return value === "personality" || value === "love" || value === "career" || value === "inner_lesson";
}

function isValidLanguage(value: string | undefined): value is Language {
  return value === "vi" || value === "en";
}

function buildUtcDate(birthProfile: BirthProfileInput) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthProfile.birthDate ?? "");
  if (!dateMatch) throw new Error("birthProfile.birthDate must use YYYY-MM-DD");

  const [, yearText, monthText, dayText] = dateMatch;
  const birthTimeKnown = birthProfile.birthTimeKnown !== false && Boolean(birthProfile.birthTime);
  const timeText = birthTimeKnown ? birthProfile.birthTime ?? "12:00" : "12:00";
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeText);
  if (!timeMatch) throw new Error("birthProfile.birthTime must use HH:mm when supplied");

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) throw new Error("birthProfile.birthTime is out of range");

  const offsetMinutes = parseFiniteNumber(birthProfile.utcOffsetMinutes) ?? 0;
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMinutes * 60_000;
  const utcDate = new Date(utcMillis);
  if (Number.isNaN(utcDate.getTime())) throw new Error("Birth date could not be parsed");

  return {
    utcDate,
    timePrecision: birthTimeKnown ? "exact_or_user_supplied" : "date_only",
    offsetMinutes
  };
}

function geocentricLongitude(body: any, date: Date) {
  const vector = Astronomy.GeoVector(body, date, true);
  return normalizeDegrees(Astronomy.Ecliptic(vector).elon);
}

function calculatePlacement(definition: PlanetDefinition, date: Date) {
  const longitude = geocentricLongitude(definition.body, date);
  const nextLongitude = geocentricLongitude(definition.body, new Date(date.getTime() + 86_400_000));
  const dailyMotionDegrees = signedLongitudeDelta(longitude, nextLongitude);
  const sign = signForLongitude(longitude);

  return {
    key: definition.key,
    label: definition.label,
    longitude: round(longitude),
    sign,
    retrograde: definition.allowRetrograde && dailyMotionDegrees < 0,
    dailyMotionDegrees: round(dailyMotionDegrees, 4)
  };
}

function calculateAscendant(date: Date, latitude: number, longitude: number) {
  const julianDay = date.getTime() / 86_400_000 + 2440587.5;
  const centuries = (julianDay - 2451545.0) / 36525;
  const gmst = 280.46061837 + 360.98564736629 * (julianDay - 2451545) + 0.000387933 * centuries ** 2 - centuries ** 3 / 38710000;
  const localSidereal = normalizeDegrees(gmst + longitude);
  const obliquity = 23.439291 - 0.0130042 * centuries;
  const theta = (Math.PI / 180) * localSidereal;
  const phi = (Math.PI / 180) * latitude;
  const eps = (Math.PI / 180) * obliquity;
  const ascendant = normalizeDegrees((180 / Math.PI) * Math.atan2(-Math.cos(theta), Math.sin(theta) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
  const sign = signForLongitude(ascendant);

  return {
    key: "rising",
    label: {
      vi: "Cung Mọc",
      en: "Rising"
    },
    longitude: round(ascendant),
    sign,
    approximate: true,
    method: "nilaza-mvp-ascendant-v1"
  };
}

function calculateWholeSignHouses(ascendantLongitude: number) {
  const ascendantSignIndex = Math.floor(normalizeDegrees(ascendantLongitude) / 30);
  return Array.from({ length: 12 }, (_, index) => {
    const signIndex = (ascendantSignIndex + index) % 12;
    const sign = signs[signIndex] ?? signs[0];
    return {
      house: index + 1,
      sign: {
        id: sign.id,
        label: {
          vi: sign.vi,
          en: sign.en
        }
      },
      cuspLongitude: signIndex * 30
    };
  });
}

function calculateAspects(placements: ReturnType<typeof calculatePlacement>[]) {
  const aspects = [];
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const first = placements[i];
      const second = placements[j];
      const separation = Math.abs(signedLongitudeDelta(first.longitude, second.longitude));
      for (const aspect of aspectDefinitions) {
        const orb = Math.abs(separation - aspect.angle);
        if (orb <= aspect.orb) {
          aspects.push({
            type: aspect.type,
            bodies: [first.key, second.key],
            angle: aspect.angle,
            orb: round(orb),
            separation: round(separation)
          });
          break;
        }
      }
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb).slice(0, 12);
}

function buildInterpretation(chart: Record<string, unknown>, language: Language, focus: AstrologyFocus) {
  const placements = chart.placements as Array<ReturnType<typeof calculatePlacement>>;
  const sun = placements.find((placement) => placement.key === "sun");
  const moon = placements.find((placement) => placement.key === "moon");
  const rising = (chart.angles as Array<Record<string, unknown>> | undefined)?.find((angle) => angle.key === "rising") as
    | { sign?: { label?: Record<Language, string> } }
    | undefined;
  const focusLabel: Record<AstrologyFocus, { vi: string; en: string }> = {
    personality: { vi: "bản chất và nhịp sống nội tâm", en: "identity and inner rhythm" },
    love: { vi: "cách bạn yêu và cần được gặp gỡ", en: "how you love and want to be met" },
    career: { vi: "động lực, nhịp làm việc và hướng phát triển", en: "motivation, work rhythm, and direction" },
    inner_lesson: { vi: "bài học bên trong", en: "inner lesson" }
  };

  const summary =
    language === "vi"
      ? `Bản đồ sao này đặt trọng tâm vào ${focusLabel[focus].vi}. Mặt Trời ở ${sun?.sign.label.vi ?? "chưa rõ"} gợi cách bạn định vị bản thân; Mặt Trăng ở ${moon?.sign.label.vi ?? "chưa rõ"} cho thấy vùng cảm xúc cần được chăm sóc.`
      : `This chart focuses on ${focusLabel[focus].en}. Sun in ${sun?.sign.label.en ?? "unknown"} points to identity patterns; Moon in ${moon?.sign.label.en ?? "unknown"} highlights emotional needs.`;
  const risingText =
    rising?.sign?.label?.[language]
      ? language === "vi"
        ? `Cung Mọc ${rising.sign.label.vi} đang được tính ở chế độ xấp xỉ MVP, nên nên dùng như tín hiệu định hướng thay vì kết luận tuyệt đối.`
        : `Rising ${rising.sign.label.en} is calculated with the MVP approximation, so treat it as directional rather than absolute.`
      : language === "vi"
        ? "Chưa đủ giờ sinh và tọa độ để tính Cung Mọc/nhà một cách đáng tin cậy."
        : "Birth time and coordinates are not complete enough to calculate Rising/houses reliably.";

  return {
    summary,
    sections: [
      {
        key: "big_three",
        title: {
          vi: "Big 3",
          en: "Big 3"
        },
        body: {
          vi: `${sun?.label.vi ?? "Mặt Trời"}: ${sun?.sign.label.vi ?? "chưa rõ"}. ${moon?.label.vi ?? "Mặt Trăng"}: ${moon?.sign.label.vi ?? "chưa rõ"}. ${risingText}`,
          en: `${sun?.label.en ?? "Sun"}: ${sun?.sign.label.en ?? "unknown"}. ${moon?.label.en ?? "Moon"}: ${moon?.sign.label.en ?? "unknown"}. ${risingText}`
        }
      },
      {
        key: "reflection",
        title: {
          vi: "Gợi ý soi chiếu",
          en: "Reflection prompt"
        },
        body: {
          vi: "Hãy dùng bản đồ này như một ngôn ngữ biểu tượng để hỏi: mình đang cần sống thật hơn ở đâu, và cần dịu lại với phần nào của mình?",
          en: "Use this chart as symbolic language to ask: where am I ready to live more honestly, and where do I need to soften toward myself?"
        }
      }
    ],
    promptVersionId,
    moderationStatus: "passed"
  };
}

function parseAstrologyInterpretation(
  text: string,
  fallback: ReturnType<typeof buildInterpretation>
): ReturnType<typeof buildInterpretation> {
  const trimmed = text.trim();
  const json = safeJsonParse(trimmed) ?? safeJsonParse(trimmed.match(/\{[\s\S]*\}/)?.[0] ?? "");
  if (!json || typeof json !== "object") return { ...fallback, summary: trimmed || fallback.summary };
  return {
    summary: typeof json.summary === "string" && json.summary.trim() ? json.summary.trim() : fallback.summary,
    sections: Array.isArray(json.sections) ? json.sections : fallback.sections,
    promptVersionId: fallback.promptVersionId,
    moderationStatus: fallback.moderationStatus
  };
}

async function hashInput(input: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buildChart(input: AstrologyInput) {
  const birthProfile = input.birthProfile ?? {};
  const language = isValidLanguage(input.language) ? input.language : "vi";
  const focus = isValidFocus(input.focus) ? input.focus : "personality";
  const { utcDate, timePrecision, offsetMinutes } = buildUtcDate(birthProfile);
  const latitude = parseFiniteNumber(birthProfile.latitude);
  const longitude = parseFiniteNumber(birthProfile.longitude);
  const caveats: Array<{ code: string; message: { vi: string; en: string } }> = [];

  if (timePrecision === "date_only") {
    caveats.push({
      code: "birth_time_unknown",
      message: {
        vi: "Không có giờ sinh chính xác, nên Moon có thể lệch nếu sinh gần lúc chuyển cung; Rising và nhà sẽ không được xem là chắc chắn.",
        en: "Exact birth time is missing, so Moon can shift near sign boundaries; Rising and houses are not treated as certain."
      }
    });
  }
  if (!birthProfile.utcOffsetMinutes && birthProfile.utcOffsetMinutes !== 0) {
    caveats.push({
      code: "timezone_offset_missing",
      message: {
        vi: "Chưa có offset múi giờ lịch sử từ geocoding/timezone provider; backend tạm tính theo UTC.",
        en: "Historical timezone offset is missing from a geocoding/timezone provider; backend temporarily calculates in UTC."
      }
    });
  }

  const placements = planets.map((planet) => calculatePlacement(planet, utcDate));
  const angles: Array<Record<string, unknown>> = [];
  let houses: Array<Record<string, unknown>> = [];

  if (typeof latitude === "number" && typeof longitude === "number" && timePrecision !== "date_only") {
    const rising = calculateAscendant(utcDate, latitude, longitude);
    angles.push(rising);
    houses = calculateWholeSignHouses(rising.longitude);
    caveats.push({
      code: "mvp_ascendant_approximation",
      message: {
        vi: "Cung Mọc/nhà đang dùng công thức xấp xỉ MVP. Giai đoạn scale nên thay bằng Swiss Ephemeris hoặc house engine chuyên dụng.",
        en: "Rising/houses use an MVP approximation. At scale, replace this with Swiss Ephemeris or a dedicated house engine."
      }
    });
  } else {
    caveats.push({
      code: "coordinates_or_time_missing",
      message: {
        vi: "Thiếu tọa độ hoặc giờ sinh, nên backend chỉ trả placements hành tinh và aspects.",
        en: "Coordinates or birth time are missing, so backend returns planetary placements and aspects only."
      }
    });
  }

  const chart = {
    provider,
    providerVersion,
    calculationVersion,
    zodiac: "tropical",
    houseSystem: houses.length ? "whole_sign_mvp" : "unavailable",
    time: {
      birthDate: birthProfile.birthDate,
      birthTime: birthProfile.birthTime ?? null,
      birthTimeKnown: timePrecision !== "date_only",
      timezone: birthProfile.timezone ?? null,
      utcOffsetMinutes: offsetMinutes,
      utcDateTime: utcDate.toISOString(),
      precision: timePrecision
    },
    location: {
      label: birthProfile.birthPlace ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      geocodeProvider: birthProfile.geocodeProvider ?? null,
      geocodePlaceId: birthProfile.geocodePlaceId ?? null
    },
    placements,
    angles,
    houses,
    aspects: calculateAspects(placements)
  };

  return {
    language,
    focus,
    chart,
    caveats
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    // Sign-in, switch and daily limit come before reading the body or calling a model (decision 2026-11-04; limit 2026-11-10).
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    }) : null;
    const { input: requestInput, userId } = await guardAiJsonRequest(req, {
      configured: Boolean(supabase),
      authenticate: async (token) => {
        if (!supabase) return null;
        const { data, error } = await supabase.auth.getUser(token);
        return aiAuthUserOrUnavailable(data?.user, error);
      }
    });
    if (!supabase) return jsonResponse({ error: "ai_unavailable" }, 503);
    const input = requestInput as AstrologyInput;
    const birthProfile = input.birthProfile ?? {};
    if (!birthProfile.birthDate) return jsonResponse({ error: "birthProfile.birthDate is required" }, 400);
    if (await featurePaused(supabase as never, "astrology_report")) return jsonResponse({ error: "feature_paused" }, 503);
    const attempt = await claimDailyAttempt(supabase as never, {
      userId, eventName: "astrology_report_attempted", feature: "astrology",
      limit: accountTierPolicy.astrologyPreview?.dailyLimit ?? 3
    });
    if (attempt === "limit_reached") return jsonResponse({ error: "daily_limit_reached" }, 429);
    if (attempt === "unavailable") return jsonResponse({ error: "usage_check_unavailable" }, 503);

    const { language, focus, chart, caveats } = buildChart(input);
    const fallbackInterpretation = buildInterpretation(chart, language, focus);
    const inputSummary = {
      birthDate: birthProfile.birthDate,
      birthTimeKnown: chart.time.birthTimeKnown,
      birthPlace: birthProfile.birthPlace ?? null,
      hasCoordinates: chart.location.latitude !== null && chart.location.longitude !== null,
      focus,
      language
    };
    const inputHash = await hashInput({
      calculationVersion,
      birthProfile,
      focus,
      language
    });

    let persistenceStatus = "skipped";
    let remoteId: string | undefined;
    let birthProfileId: string | undefined;
    const generation = await generateWithModelRoute({
      feature: "astrology_report",
      supabase,
      traceContext: {
        userId,
        request: req,
        metadata: {
          focus,
          language,
          calculationVersion,
          promptVersionId,
          caveatCount: caveats.length,
          hasCoordinates: chart.location.latitude !== null && chart.location.longitude !== null
        }
      },
      system: compactLines([
        "You are Nilaza's astrology interpretation engine.",
        "Only interpret placements and caveats already calculated by the backend.",
        "Do not invent placements, claim fixed fate, or provide medical, legal, financial, or mental-health advice.",
        "Return compact JSON only with keys: summary, sections."
      ]),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            language,
            focus,
            chart,
            caveats
          })
        }
      ],
      fallbackText: JSON.stringify({
        summary: fallbackInterpretation.summary,
        sections: fallbackInterpretation.sections
      })
    });
    const interpretation = {
      ...parseAstrologyInterpretation(generation.text, fallbackInterpretation),
      promptVersionId,
      moderationStatus: generation.moderationStatus,
      model: sanitizeProviderMetadata(generation)
    };

    if (supabase && userId) {
        if (generation.moderationStatus === "blocked") {
          await supabase.from("safety_events").insert({
            user_id: userId,
            feature: "astrology",
            reason: "blocked_topic",
            summary: `astrology_report blocked: ${generation.safetyReason ?? "safety_filter"}`,
            status: "open"
          });
        }
        const { data: currentBirthProfile } = await supabase
          .from("birth_profiles")
          .select("id")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const birthPayload = {
          user_id: userId,
          birth_date: birthProfile.birthDate ?? null,
          birth_time: birthProfile.birthTimeKnown === false ? null : birthProfile.birthTime ?? null,
          birth_time_known: chart.time.birthTimeKnown,
          birth_place: birthProfile.birthPlace ?? null,
          timezone: birthProfile.timezone ?? null,
          utc_offset_minutes: chart.time.utcOffsetMinutes,
          latitude: chart.location.latitude,
          longitude: chart.location.longitude,
          geocode_provider: birthProfile.geocodeProvider ?? null,
          geocode_place_id: birthProfile.geocodePlaceId ?? null,
          consent_version: birthProfile.consentVersion ?? "astrology_birth_data_v1",
          updated_at: new Date().toISOString()
        };

        if (currentBirthProfile?.id) {
          const { data: updatedBirthProfile } = await supabase
            .from("birth_profiles")
            .update(birthPayload)
            .eq("id", currentBirthProfile.id)
            .select("id")
            .single();
          birthProfileId = updatedBirthProfile?.id;
        } else {
          const { data: insertedBirthProfile } = await supabase
            .from("birth_profiles")
            .insert(birthPayload)
            .select("id")
            .single();
          birthProfileId = insertedBirthProfile?.id;
        }

        const { data: report, error: reportError } = await supabase
          .from("astrology_reports")
          .insert({
            user_id: userId,
            birth_profile_id: birthProfileId ?? null,
            focus,
            language,
            provider,
            provider_version: providerVersion,
            calculation_version: calculationVersion,
            input_hash: inputHash,
            input_summary: inputSummary,
            chart_data: chart,
            interpretation,
            caveats,
            status: "completed"
          })
          .select("id")
          .single();

        await supabase.from("usage_events").insert({
          user_id: userId,
          event_name: "astrology_report_generated",
          feature: "astrology",
          metadata: {
            focus,
            provider,
            providerVersion,
            calculationVersion,
            caveatCodes: caveats.map((caveat) => caveat.code),
            persistence: reportError ? "report_error" : "stored",
            model: sanitizeProviderMetadata(generation)
          }
        });
        persistenceStatus = reportError ? "report_error" : "stored";
        remoteId = report?.id;
    }

    return jsonResponse({
      remoteId,
      chart,
      interpretation,
      caveats,
      provider,
      providerVersion,
      calculationVersion,
      promptVersionId,
      moderationStatus: generation.moderationStatus,
      model: sanitizeProviderMetadata(generation),
      persistenceStatus
    });
  } catch (error) {
    if (error instanceof AiRequestError) return jsonResponse({ error: error.code }, error.status);
    return jsonResponse({ error: "service_unavailable" }, 503);
  }
});
