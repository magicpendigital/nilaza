import type { RefObject } from "react";
import { Share, type View } from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef, releaseCapture } from "react-native-view-shot";
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "./ShareCardView";

/**
 * "returned" means the system share sheet came back without an error. Android does not tell the app whether
 * a message was actually sent, so this is never counted as a delivered share.
 */
export type ShareOutcome = "returned" | "unavailable" | "failed";

/** Captures the card as a 1080x1350 PNG and hands it to the system share sheet. Never throws. */
export async function shareCardImage(card: RefObject<View | null>, dialogTitle: string): Promise<ShareOutcome> {
  let uri: string | null = null;
  try {
    if (!card.current) return "failed";
    if (!(await Sharing.isAvailableAsync())) return "unavailable";
    uri = await captureRef(card, { format: "png", quality: 1, width: SHARE_IMAGE_WIDTH, height: SHARE_IMAGE_HEIGHT, result: "tmpfile" });
    await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle });
    return "returned";
  } catch {
    return "failed";
  } finally {
    if (uri) {
      try {
        releaseCapture(uri);
      } catch {
        // The temporary file is also removed by the system; cleanup is best effort.
      }
    }
  }
}

/** Shares the tracked link with its short message through the system share sheet. Never throws. */
export async function shareLinkText(message: string, title: string): Promise<ShareOutcome> {
  try {
    await Share.share({ title, message });
    return "returned";
  } catch {
    return "failed";
  }
}
