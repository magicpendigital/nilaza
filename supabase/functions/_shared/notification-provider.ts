export type NotificationProviderName = "expo";

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default";
};

export type PushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

export type PushReceipt = {
  status: "ok" | "error";
  message?: string;
  details?: {
    error?: string;
  };
};

export type NotificationProvider = {
  name: NotificationProviderName;
  sendBatch(messages: PushMessage[]): Promise<PushTicket[]>;
  readReceipts(ids: string[]): Promise<Record<string, PushReceipt>>;
};

export class ExpoNotificationProvider implements NotificationProvider {
  name: NotificationProviderName = "expo";

  async sendBatch(messages: PushMessage[]) {
    if (!messages.length) return [];
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.errors?.[0]?.message ?? "Expo push send failed");
    }
    return (Array.isArray(body.data) ? body.data : [body.data]).filter(Boolean) as PushTicket[];
  }

  async readReceipts(ids: string[]) {
    if (!ids.length) return {};
    const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ids })
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.errors?.[0]?.message ?? "Expo push receipt lookup failed");
    }
    return (body.data ?? {}) as Record<string, PushReceipt>;
  }
}

export function createNotificationProvider(): NotificationProvider {
  return new ExpoNotificationProvider();
}
