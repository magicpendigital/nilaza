import { astrologySignIds, localizeAstrologySign, type AstrologySignId } from "../astrology/contracts";
import type { Language } from "../../types";

type SignedText = { sign?: string; signId?: string; title?: string; reflection?: string };

/**
 * ai-daily-zodiac-pulse answers with the English sign name ("Capricorn"); show the app's own name
 * ("Ma Kết") in the sign, title and reflection instead (live QA 2026-11-01).
 */
export function localizePulseSign<T extends SignedText>(pulse: T, language: Language): T {
  const english = typeof pulse.sign === "string" ? pulse.sign.trim() : "";
  const id = english.toLowerCase();
  if (!(astrologySignIds as readonly string[]).includes(id)) return pulse;
  const local = localizeAstrologySign(id as AstrologySignId, language);
  if (!local || local === english) return pulse;
  const swap = (text?: string) => (typeof text === "string" ? text.split(english).join(local) : text);
  return { ...pulse, sign: local, signId: pulse.signId ?? id, title: swap(pulse.title), reflection: swap(pulse.reflection) };
}
