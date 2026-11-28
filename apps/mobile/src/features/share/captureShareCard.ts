import type { RefObject } from "react";
import { Share, type View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { captureRef, releaseCapture } from "react-native-view-shot";
import type { ShareFormat } from "./shareEvents";
import { SHARE_FORMAT_SIZE } from "./ShareCardView";

/**
 * "returned" means the system share sheet came back without an error. Android does not tell the app whether
 * a message was actually sent, so this is never counted as a delivered share.
 */
export type ShareOutcome = "returned" | "unavailable" | "failed";

/**
 * Some receiving apps (Facebook, Messenger) drop the text that travels with an image, so the message with the tracked link is also
 * copied first and the person can paste it. Best effort: a clipboard failure never blocks the share. Returns whether it was copied.
 */
export async function copyShareText(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

type NativeShare = {
  open: (options: { url: string; type: string; message: string; title: string; failOnCancel: boolean }) => Promise<unknown>;
};

/** The native share module is loaded on demand so a build without it, or a test, falls back instead of failing at import. */
function loadNativeShare(): NativeShare | null {
  try {
    const loaded = require("react-native-share") as { default?: NativeShare } & Partial<NativeShare>;
    const candidate = (loaded.default ?? loaded) as Partial<NativeShare>;
    return typeof candidate.open === "function" ? (candidate as NativeShare) : null;
  } catch {
    return null;
  }
}

// The receiving app may still be reading the image after the share sheet returns, so the file is released at the next share, not at once.
let pendingRelease: string | null = null;

/** Releases the image kept from the previous share. Called before each new share and by tests. */
export function releasePending() {
  const uri = pendingRelease;
  pendingRelease = null;
  if (!uri) return;
  try {
    releaseCapture(uri);
  } catch {
    // The temporary file is also removed by the system; cleanup is best effort.
  }
}

/**
 * Captures the card as a PNG in the chosen format (post 1080x1350, story 1080x1920) and hands it to the system share sheet. With a message, the image and the text go in one
 * share through react-native-share; if that module is missing or fails, the image alone goes through expo-sharing. Cancelling the
 * share sheet is not a failure. Never throws.
 */
export async function shareCardImage(card: RefObject<View | null>, dialogTitle: string, message?: string, format: ShareFormat = "post"): Promise<ShareOutcome> {
  const size = SHARE_FORMAT_SIZE[format] ?? SHARE_FORMAT_SIZE.post;
  releasePending();
  let uri: string | null = null;
  let launched = false;
  try {
    if (!card.current) return "failed";
    uri = await captureRef(card, { format: "png", quality: 1, width: size.width, height: size.height, result: "tmpfile" });
    const native = message ? loadNativeShare() : null;
    if (native && message) {
      try {
        await native.open({ url: uri, type: "image/png", message, title: dialogTitle, failOnCancel: false });
        launched = true;
        return "returned";
      } catch {
        // Fall back to sharing the image alone.
      }
    }
    if (!(await Sharing.isAvailableAsync())) return "unavailable";
    await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle });
    launched = true;
    return "returned";
  } catch {
    return "failed";
  } finally {
    if (uri) {
      pendingRelease = uri;
      if (!launched) releasePending();
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
