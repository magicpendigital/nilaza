import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import * as Sharing from "expo-sharing";

const retentionMs = 10 * 60 * 1000;
const directory = () => new Directory(Paths.cache, "nilaza-private-exports-v1");
export async function cleanupExportFiles() {
  const folder = directory();
  if (!folder.exists) return;
  const now = Date.now();
  for (const item of folder.list()) {
    const match = /^nilaza-data-(\d{13})\.json$/.exec(item.name);
    if (item instanceof File && match && (now - Number(match[1]) >= retentionMs || Number(match[1]) > now)) item.delete();
  }
}

export async function deliverExport(json: string, filename: string, active: () => boolean): Promise<"dialog_closed" | "download_requested"> {
  if (!/^nilaza-data-[0-9TZ.\-]+\.json$/.test(filename)) throw new Error("Invalid export filename");
  if (!active() || !await Sharing.isAvailableAsync() || !active()) throw new Error("Export is unavailable");
  await cleanupExportFiles();
  if (!active()) throw new Error("Account closed during export");
  const folder = directory();
  if (!folder.exists) folder.create();
  const file = new File(folder, `nilaza-data-${Date.now()}.json`);
  let created = false;
  let retainForRecipient = false;
  try {
    file.create(); created = true;
    file.write(json);
    if (!active()) throw new Error("Account closed during export");
    await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "Nilaza" });
    if (Platform.OS === "android") {
      // Android chooser completion can precede the recipient reading the URI.
      retainForRecipient = true;
      setTimeout(() => { try { if (file.exists) file.delete(); } catch { /* Startup cleanup retries expiry. */ } }, retentionMs);
    }
    if (!active()) throw new Error("Account closed during export");
    // Returning from the sheet does not prove the user saved a copy.
    return "dialog_closed";
  } finally {
    // Cleanup must not replace the sheet outcome; startup retries expired files.
    try { if (created && !retainForRecipient && file.exists) file.delete(); } catch { /* Private-cache TTL cleanup retries on startup. */ }
  }
}
