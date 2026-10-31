import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { requestNotificationPermission } from "../../notifications";
import type { Language } from "../../types";

// Local "today's card" reminder (analysis wave 1, Profile design): scheduled on the device, no server.
export type DailyReminder = { enabled: boolean; hour: number; minute: number };
export const dailyReminderKey = "nilaza.dailyReminder.v1";
export const defaultDailyReminder: DailyReminder = { enabled: false, hour: 8, minute: 0 };
export const dailyReminderTimes = [{ hour: 7, minute: 0 }, { hour: 8, minute: 0 }, { hour: 12, minute: 0 }, { hour: 21, minute: 0 }];
const reminderId = "nilaza-daily-card";

export function normalizeDailyReminder(value: unknown): DailyReminder {
  const item = value as Partial<DailyReminder> | null;
  const hour = Number.isInteger(item?.hour) && item!.hour! >= 0 && item!.hour! < 24 ? item!.hour! : defaultDailyReminder.hour;
  const minute = Number.isInteger(item?.minute) && item!.minute! >= 0 && item!.minute! < 60 ? item!.minute! : defaultDailyReminder.minute;
  return { enabled: item?.enabled === true, hour, minute };
}

export const reminderTimeLabel = (reminder: Pick<DailyReminder, "hour" | "minute">) =>
  `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`;

export type ReminderResult = "scheduled" | "cancelled" | "denied" | "unsupported";

export async function applyDailyReminder(reminder: DailyReminder, language: Language): Promise<ReminderResult> {
  if (Platform.OS === "web") return "unsupported";
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId).catch(() => undefined);
    if (!reminder.enabled) return "cancelled";
    if ((await requestNotificationPermission()) !== "granted") return "denied";
    const vi = language === "vi";
    await Notifications.scheduleNotificationAsync({
      identifier: reminderId,
      content: {
        title: vi ? "Lá bài hôm nay" : "Today's card",
        body: vi ? "Một phút cho riêng mình: lật lá bài hôm nay nhé." : "A minute for yourself: turn today's card.",
        data: { route: "home" }
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: reminder.hour, minute: reminder.minute, channelId: "nilaza-reflections" }
    });
    return "scheduled";
  } catch {
    return "unsupported";
  }
}
