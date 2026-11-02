import type { Language } from "../../types";

export type HomeNextStepId = "reveal" | "write" | "reminder";

/**
 * The one suggested next step on Home (analysis HO-05, Owner 2026-11-02): reveal today's card,
 * then write a few lines, then turn on the morning reminder. Nothing once all three are done.
 */
export function homeNextStep(state: { revealed: boolean; wroteToday: boolean; reminderOn: boolean; reminderSupported: boolean }): HomeNextStepId | null {
  if (!state.revealed) return "reveal";
  if (!state.wroteToday) return "write";
  if (state.reminderSupported && !state.reminderOn) return "reminder";
  return null;
}

export function homeNextStepCopy(id: Exclude<HomeNextStepId, "reveal">, language: Language) {
  const vi = language === "vi";
  if (id === "write") {
    return vi
      ? { title: "Viết vài dòng", body: "Một hai câu về lá hôm nay là đủ. Nhật ký giữ lại cho bạn đọc lại sau.", cta: "Viết ngay" }
      : { title: "Write a few lines", body: "A sentence or two about today's card is enough. Your Journal keeps it for later.", cta: "Write now" };
  }
  return vi
    ? { title: "Bật nhắc buổi sáng", body: "Nilaza nhắc bạn mở lá mỗi sáng, ngay trên máy, theo giờ bạn chọn.", cta: "Chọn giờ nhắc" }
    : { title: "Turn on a morning reminder", body: "Nilaza reminds you to open your card each morning, on this device, at a time you choose.", cta: "Choose a time" };
}
