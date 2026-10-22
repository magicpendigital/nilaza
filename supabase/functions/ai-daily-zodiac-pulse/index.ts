import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type DailyZodiacPulseInput = {
  language?: "vi" | "en" | string;
  dateKey?: string;
  profile?: {
    nickname?: string;
    goals?: string[];
    tone?: string;
  };
  birthProfile?: {
    birthDate?: string;
    birthTime?: string;
    birthTimeKnown?: boolean;
    birthPlace?: string;
  };
  recentEntries?: Array<{
    title?: string;
    sourceType?: string;
    mood?: string;
    createdAt?: string;
  }>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

function stableIndex(seed: string, length: number) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return length ? hash % length : 0;
}

function getApproximateSunSign(birthDate?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((birthDate ?? "").trim());
  if (!match) return undefined;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const starts = [
    ["Capricorn", 1, 1], ["Aquarius", 1, 20], ["Pisces", 2, 19], ["Aries", 3, 21],
    ["Taurus", 4, 20], ["Gemini", 5, 21], ["Cancer", 6, 21], ["Leo", 7, 23],
    ["Virgo", 8, 23], ["Libra", 9, 23], ["Scorpio", 10, 23], ["Sagittarius", 11, 22],
    ["Capricorn", 12, 22]
  ] as const;
  return starts.reduce((current, [sign, startMonth, startDay]) => (
    month > startMonth || (month === startMonth && day >= startDay) ? sign : current
  ), "Capricorn");
}

function profileCompleteness(input: DailyZodiacPulseInput, sunSign?: string) {
  if (!sunSign) return "empty";
  if (!input.birthProfile?.birthTimeKnown) return "birth_time_missing";
  if (input.birthProfile?.birthPlace?.trim()) return "full_pending_backend";
  return "sun_only";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const input = (await req.json()) as DailyZodiacPulseInput;
    const language = input.language ?? "vi";
    const dateKey = input.dateKey ?? new Date().toISOString().slice(0, 10);
    const sunSign = getApproximateSunSign(input.birthProfile?.birthDate);
    const status = profileCompleteness(input, sunSign);
    const seed = `${dateKey}:${sunSign ?? "pending"}:${input.profile?.tone ?? "gentle"}:${input.profile?.goals?.[0] ?? "self"}`;
    const moods = language === "vi"
      ? ["dịu lại", "rõ hơn", "can đảm mềm", "lắng nghe sâu"]
      : ["softening", "clearer", "gentle courage", "deep listening"];
    const cues = language === "vi"
      ? [
        "chọn một việc nhỏ giúp cơ thể thấy an toàn hơn",
        "nói chậm lại trước khi trả lời một tin nhắn quan trọng",
        "để trực giác có thêm bằng chứng trước khi kết luận",
        "viết một dòng thật thà thay vì tìm một đáp án hoàn hảo"
      ]
      : [
        "choose one small thing that helps your body feel safer",
        "slow down before answering an important message",
        "let your intuition gather evidence before concluding",
        "write one honest line instead of hunting for a perfect answer"
      ];
    const mood = moods[stableIndex(`${seed}:mood`, moods.length)] ?? moods[0];
    const cue = cues[stableIndex(seed, cues.length)] ?? cues[0];
    const caveats = sunSign
      ? [
        language === "vi"
          ? "Đây là gợi ý tự phản chiếu, không phải dự đoán chắc chắn."
          : "This is a self-reflection cue, not a certain prediction.",
        ...(status === "birth_time_missing"
          ? [language === "vi" ? "Thiếu giờ sinh nên Rising/house chưa được dùng." : "Birth time is missing, so Rising/houses are not used."]
          : [])
      ]
      : [language === "vi" ? "Cần ngày sinh để mở Sun-sign pulse." : "Birth date is needed for a Sun-sign pulse."];

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");
    let persistenceStatus = "skipped";

    if (supabaseUrl && supabaseAnonKey && authHeader) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const accessToken = authHeader.replace(/^Bearer\s+/i, "");
      const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
      if (!userError && userData.user) {
        const { error: usageError } = await supabase.from("usage_events").insert({
          user_id: userData.user.id,
          event_name: "daily_zodiac_pulse_generated",
          feature: "daily_zodiac_pulse",
          metadata: {
            dateKey,
            sunSign: sunSign ?? null,
            profileCompleteness: status,
            recentEntryCount: input.recentEntries?.length ?? 0,
            calculationVersion: "daily_zodiac_pulse_mvp_v1"
          }
        });
        persistenceStatus = usageError ? "usage_error" : "stored";
      } else {
        persistenceStatus = "auth_error";
      }
    }

    return jsonResponse({
      id: `zodiac-${dateKey}-${sunSign?.toLowerCase() ?? "pending"}`,
      dateKey,
      sign: sunSign,
      profileCompleteness: status,
      mood,
      title: sunSign ? (language === "vi" ? `${sunSign} hôm nay` : `${sunSign} today`) : "Daily Zodiac Pulse",
      reflection: sunSign
        ? (language === "vi"
          ? `Với ${sunSign} như một điểm bắt đầu biểu tượng, hôm nay hãy ${cue}.`
          : `With ${sunSign} as a symbolic starting point, today invites you to ${cue}.`)
        : (language === "vi"
          ? "Thêm ngày sinh để Nilaza tạo một tín hiệu cung hoàng đạo nhẹ cho ngày hôm nay."
          : "Add your birth date for a light zodiac signal today."),
      microAction: language === "vi"
        ? "Giữ đây như một câu hỏi trong ngày, không phải kết luận về tương lai."
        : "Hold this as a question for the day, not a conclusion about the future.",
      caveats,
      source: "backend",
      hasBirthDate: Boolean(sunSign),
      calculationVersion: "daily_zodiac_pulse_mvp_v1",
      persistenceStatus
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
