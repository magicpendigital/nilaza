import { moonQuartersBetween, moonStateAt, nextNewOrFullMoon } from "../../../../../packages/astrology-core/sky.mjs";
import { daysBetween, deviceZone, localDateOf, localDayRange, type LocalZone } from "../astrology/localDay";
import type { Language } from "../../types";

// Moon phase from astronomy-engine (spec section 6.1). The four main phases are single moments:
// a day is named after one only when that moment falls inside the local calendar day.

export type MoonPhaseId =
  | "new"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

export type MoonPhase = { id: MoonPhaseId; illumination: number; waxing: boolean; exactAt?: Date };

export function moonPhaseFor(date: Date, zone: LocalZone = deviceZone): MoonPhase {
  const { illumination, waxing } = moonStateAt(date);
  const [start, end] = localDayRange(date, zone);
  const quarter = moonQuartersBetween(start, end)[0];
  if (quarter) return { id: quarter.kind, illumination, waxing, exactAt: quarter.at };
  const half = illumination < 0.5 ? "crescent" : "gibbous";
  return { id: `${waxing ? "waxing" : "waning"}_${half}` as MoonPhaseId, illumination, waxing };
}

/** Next full or new Moon from the start of today, in local calendar days (0 = today). */
export function nextMoonEvent(date: Date, zone: LocalZone = deviceZone): { kind: "full" | "new"; at: Date; days: number } {
  const [start] = localDayRange(date, zone);
  const event = nextNewOrFullMoon(start);
  return { ...event, days: daysBetween(localDateOf(date, zone), localDateOf(event.at, zone)) };
}

const phaseCopy: Record<MoonPhaseId, { vi: string; en: string; hintVi: string; hintEn: string }> = {
  new: { vi: "Trăng mới", en: "New moon", hintVi: "Nhiều người dùng dịp này để đặt một ý định nhỏ.", hintEn: "Many people use it to set one small intention." },
  waxing_crescent: { vi: "Trăng lưỡi liềm đầu", en: "Waxing crescent", hintVi: "Trăng đang lớn dần, một việc nhỏ có thể bắt đầu từ đây.", hintEn: "The Moon is growing; a small start can begin here." },
  first_quarter: { vi: "Trăng thượng huyền", en: "First quarter", hintVi: "Nửa vầng sáng, nửa chặng tăng đã qua.", hintEn: "Half lit, halfway through the waxing cycle." },
  waxing_gibbous: { vi: "Trăng gần tròn", en: "Waxing gibbous", hintVi: "Trăng sắp tròn, một dịp để chỉnh lại điều đang làm.", hintEn: "Nearly full, a moment to refine what you are doing." },
  full: { vi: "Trăng tròn", en: "Full moon", hintVi: "Cả vầng sáng, cảm xúc có thể hiện rõ hơn.", hintEn: "Fully lit; feelings may show more clearly." },
  waning_gibbous: { vi: "Trăng khuyết dần", en: "Waning gibbous", hintVi: "Trăng bắt đầu giảm, một dịp nhìn lại điều đã học.", hintEn: "The Moon begins to wane, a moment to look back on what you learned." },
  last_quarter: { vi: "Trăng hạ huyền", en: "Last quarter", hintVi: "Nửa vầng sáng, chu kỳ đang giảm dần.", hintEn: "Half lit as the cycle wanes." },
  waning_crescent: { vi: "Trăng lưỡi liềm cuối", en: "Waning crescent", hintVi: "Cuối chu kỳ, nhịp chậm và lắng lại.", hintEn: "The end of the cycle, a slower and quieter pace." }
};

export function moonPhaseLabel(id: MoonPhaseId, language: Language) {
  const copy = phaseCopy[id];
  return language === "vi" ? { name: copy.vi, hint: copy.hintVi } : { name: copy.en, hint: copy.hintEn };
}

// SVG path for the lit part of a moon disc of radius r centred at (c, c).
export function moonLitPath(phase: Pick<MoonPhase, "illumination" | "waxing">, c: number, r: number): string | null {
  if (phase.illumination < 0.02) return null;
  if (phase.illumination > 0.98) return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c} ${c + r} A ${r} ${r} 0 1 1 ${c} ${c - r} Z`;
  const terminator = Math.abs(1 - 2 * phase.illumination) * r;
  const crescent = phase.illumination < 0.5;
  const outerSweep = phase.waxing ? 1 : 0;
  const innerSweep = phase.waxing === crescent ? 0 : 1;
  return `M ${c} ${c - r} A ${r} ${r} 0 0 ${outerSweep} ${c} ${c + r} A ${terminator.toFixed(2)} ${r} 0 0 ${innerSweep} ${c} ${c - r} Z`;
}
