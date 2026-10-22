import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { DevicePushRegistration, Language, NotificationPermissionState } from "./types";

const androidDefaultChannelId = "nilaza-reflections";

function normalizePermissionStatus(status?: string): NotificationPermissionState {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  if (status === "undetermined") return "unknown";
  return "unavailable";
}

export function notificationPlatform(): DevicePushRegistration["platform"] {
  if (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web") return Platform.OS;
  return "unknown";
}

export function notificationDeviceId() {
  return `nilaza-${notificationPlatform()}`;
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === "web") return "unavailable";
  try {
    const result = await Notifications.getPermissionsAsync();
    return normalizePermissionStatus(result.status);
  } catch {
    return "unavailable";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === "web") return "unavailable";
  try {
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true
      }
    });
    return normalizePermissionStatus(result.status);
  } catch {
    return "unavailable";
  }
}

export async function configureNotificationRuntime() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(androidDefaultChannelId, {
      name: "Nilaza reflections",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default"
    });
  } catch {
    // Push should never block the core reflection app.
  }
}

export async function getExpoPushTokenSafe() {
  if (Platform.OS === "web") return undefined;
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return undefined;
  }
}

export async function buildDevicePushRegistration(language: Language): Promise<DevicePushRegistration> {
  await configureNotificationRuntime();
  const permissionStatus = await getNotificationPermissionState();
  const expoPushToken = permissionStatus === "granted" ? await getExpoPushTokenSafe() : undefined;
  return {
    expoPushToken,
    deviceId: notificationDeviceId(),
    platform: notificationPlatform(),
    permissionStatus,
    locale: language,
    timezone: getDeviceTimezone(),
    updatedAt: new Date().toISOString()
  };
}

export function subscribeToNotificationResponses(onRoute: (route?: string) => void) {
  if (Platform.OS === "web") return () => {};
  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const targetRoute = response.notification.request.content.data?.targetRoute;
      onRoute(typeof targetRoute === "string" ? targetRoute : undefined);
    });
    return () => subscription.remove();
  } catch {
    return () => {};
  }
}

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}
