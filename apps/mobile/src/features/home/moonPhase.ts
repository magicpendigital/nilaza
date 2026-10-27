import type { Language } from "../../types";

// Mean synodic month from a reference new moon (2000-01-06 18:14 UTC). The
// error stays within about half a day, enough for a daily phase name; it is not
// an astronomical ephemeris.
const SYNODIC_MONTH_DAYS = 29.530588853;
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86400000;

export type MoonPhaseId =
  | "new"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

export type MoonPhase = { id: MoonPhaseId; ageDays: number; illumination: number; waxing: boolean };

const phaseOrder: MoonPhaseId[] = ["new", "waxing_crescent", "first_quarter", "waxing_gibbous", "full", "waning_gibbous", "last_quarter", "waning_crescent"];

export function moonPhaseFor(date: Date): MoonPhase {
  const elapsedDays = (date.getTime() - REFERENCE_NEW_MOON_MS) / DAY_MS;
  const ageDays = ((elapsedDays % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const fraction = ageDays / SYNODIC_MONTH_DAYS;
  const id = phaseOrder[Math.floor(fraction * 8 + 0.5) % 8];
  return { id, ageDays, illumination: (1 - Math.cos(2 * Math.PI * fraction)) / 2, waxing: fraction < 0.5 };
}

const phaseCopy: Record<MoonPhaseId, { vi: string; en: string; hintVi: string; hintEn: string }> = {
  new: { vi: "Trăng non", en: "New moon", hintVi: "Hợp để đặt một ý định nhỏ.", hintEn: "A good time to set one small intention." },
  waxing_crescent: { vi: "Trăng lưỡi liềm đầu", en: "Waxing crescent", hintVi: "Hợp để bắt đầu một việc nhỏ và giữ nhịp.", hintEn: "A good time to start something small and keep at it." },
  first_quarter: { vi: "Trăng thượng huyền", en: "First quarter", hintVi: "Hợp để bước qua một chút ngại ngần.", hintEn: "A good time to move past a little hesitation." },
  waxing_gibbous: { vi: "Trăng gần tròn", en: "Waxing gibbous", hintVi: "Hợp để chỉnh lại kế hoạch trước khi hoàn thành.", hintEn: "A good time to refine a plan before finishing it." },
  full: { vi: "Trăng tròn", en: "Full moon", hintVi: "Hợp để nhìn rõ điều mình đang cảm thấy.", hintEn: "A good time to see clearly what you feel." },
  waning_gibbous: { vi: "Trăng sau rằm", en: "Waning gibbous", hintVi: "Hợp để cảm ơn và chia sẻ điều đã học.", hintEn: "A good time to give thanks and share what you learned." },
  last_quarter: { vi: "Trăng hạ huyền", en: "Last quarter", hintVi: "Hợp để buông một việc không còn hợp với mình.", hintEn: "A good time to let go of what no longer fits." },
  waning_crescent: { vi: "Trăng lưỡi liềm cuối", en: "Waning crescent", hintVi: "Hợp để nghỉ ngơi và lắng lại.", hintEn: "A good time to rest and settle." }
};

export function moonPhaseLabel(id: MoonPhaseId, language: Language) {
  const copy = phaseCopy[id];
  return language === "vi" ? { name: copy.vi, hint: copy.hintVi } : { name: copy.en, hint: copy.hintEn };
}

// SVG path for the lit part of a moon disc of radius r centred at (c, c).
export function moonLitPath(phase: MoonPhase, c: number, r: number): string | null {
  if (phase.illumination < 0.02) return null;
  if (phase.illumination > 0.98) return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c} ${c + r} A ${r} ${r} 0 1 1 ${c} ${c - r} Z`;
  const terminator = Math.abs(1 - 2 * phase.illumination) * r;
  const crescent = phase.illumination < 0.5;
  const outerSweep = phase.waxing ? 1 : 0;
  const innerSweep = phase.waxing === crescent ? 0 : 1;
  return `M ${c} ${c - r} A ${r} ${r} 0 0 ${outerSweep} ${c} ${c + r} A ${terminator.toFixed(2)} ${r} 0 0 ${innerSweep} ${c} ${c - r} Z`;
}
