import React, { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, layout } from "../../theme";
import type { Language } from "../../types";
import { copyShareText, shareCardImage, shareLinkText, type ShareOutcome } from "./captureShareCard";
import type { ShareCardModel } from "./shareCardContent";
import { shareLinkMessage } from "./shareLink";
import { ShareCardView } from "./ShareCardView";

export type ShareEventName = "share_tapped" | "share_completed";
export type ShareEventMeta = { surface: string; action: "image" | "link"; outcome?: "returned" | "unavailable" | "failed" };

type Props = {
  visible: boolean;
  language: Language;
  model: ShareCardModel;
  /** Tracked link built once per opening, so the same id is used for both buttons. */
  url: string;
  /** Invite flows lead with the link; card flows lead with the image. */
  primary?: "image" | "link";
  onClose: () => void;
  onEvent: (name: ShareEventName, meta: ShareEventMeta) => void;
};

export function ShareCardSheet({ visible, language, model, url, primary = "image", onClose, onEvent }: Props) {
  const vi = language === "vi";
  const cardRef = useRef<View>(null);
  const { width } = useWindowDimensions();
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardWidth = Math.max(240, Math.min(360, width - 48));

  const finish = (action: "image" | "link", outcome: ShareOutcome, copied = false) => {
    onEvent("share_completed", { surface: model.surface, action, outcome });
    setBusy(false);
    setStatusIsError(outcome !== "returned");
    setStatus(
      outcome === "failed"
        ? vi ? "Chưa chia sẻ được. Bạn thử lại hoặc dùng nút gửi link." : "Could not share. Try again or use the link button."
        : outcome === "unavailable"
          ? vi ? "Thiết bị này chưa hỗ trợ chia sẻ ảnh. Hãy dùng nút gửi link." : "Image sharing is not available here. Use the link button."
          : copied
            ? vi ? "Đã sao chép lời nhắn kèm link. Nếu ứng dụng bạn chọn không hiện lời nhắn cùng ảnh, hãy dán vào tin nhắn." : "Message and link copied. If the app you chose does not show the message with the image, paste it into your message."
            : ""
    );
  };

  const shareImage = async () => {
    if (busy) return;
    setBusy(true);
    setStatus("");
    onEvent("share_tapped", { surface: model.surface, action: "image" });
    // The message travels with the image. It is also copied first, because some apps (Facebook, Messenger) drop the text of an image share.
    const message = shareLinkMessage(language, model.surface, url, model);
    const copied = await copyShareText(message);
    finish("image", await shareCardImage(cardRef, vi ? "Chia sẻ thẻ Nilaza" : "Share your Nilaza card", message), copied);
  };

  const shareLink = async () => {
    if (busy) return;
    setBusy(true);
    setStatus("");
    onEvent("share_tapped", { surface: model.surface, action: "link" });
    finish("link", await shareLinkText(shareLinkMessage(language, model.surface, url, model), "Nilaza"));
  };

  const imageButton = { label: vi ? "Chia sẻ ảnh" : "Share image", onPress: shareImage };
  const linkButton = { label: primary === "link" ? (vi ? "Gửi lời mời" : "Send invite") : vi ? "Gửi kèm link" : "Send link", onPress: shareLink };
  const [first, second] = primary === "link" ? [linkButton, imageButton] : [imageButton, linkButton];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>{vi ? "Chia sẻ" : "Share"}</Text>
          <View style={styles.cardWrap}>
            <ShareCardView ref={cardRef} model={model} width={cardWidth} />
          </View>
          <Text style={styles.privacy}>
            {vi
              ? "Thẻ chỉ có nội dung công khai của thư viện. Câu hỏi, ghi chú, tâm trạng và thông tin sinh của bạn không được gửi đi."
              : "The card only has public library content. Your question, notes, mood and birth details are not sent."}
          </Text>
          <Text style={styles.privacy}>
            {vi
              ? "Ảnh được gửi kèm lời nhắn và link của bạn. Nếu ứng dụng nhận không hiện lời nhắn, lời nhắn đã được sao chép sẵn để bạn dán."
              : "The image goes with a message and your link. If the receiving app does not show the message, it is already copied so you can paste it."}
          </Text>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={first.onPress} style={[styles.primary, busy && styles.disabled]}>
            <Text style={styles.primaryText}>{first.label}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={second.onPress} style={[styles.secondary, busy && styles.disabled]}>
            <Text style={styles.secondaryText}>{second.label}</Text>
          </Pressable>
          {status ? <Text accessibilityLiveRegion="polite" style={[styles.status, statusIsError ? null : styles.statusOk]}>{status}</Text> : null}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>{vi ? "Đóng" : "Close"}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.charcoal },
  content: { padding: 24, alignItems: "center", gap: 14 },
  title: { color: colors.ivory, fontFamily: "EBGaramond_500Medium", fontSize: 28, alignSelf: "flex-start" },
  cardWrap: { alignItems: "center" },
  privacy: { color: colors.muted, fontFamily: "HankenGrotesk_400Regular", fontSize: 13, lineHeight: 19, textAlign: "center" },
  primary: { minHeight: layout.minimumTouchTarget, alignSelf: "stretch", borderRadius: 8, backgroundColor: colors.ivory, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.charcoal, fontFamily: "HankenGrotesk_600SemiBold", fontSize: 16 },
  secondary: { minHeight: layout.minimumTouchTarget, alignSelf: "stretch", borderRadius: 8, borderWidth: 1, borderColor: colors.gold, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.gold, fontFamily: "HankenGrotesk_600SemiBold", fontSize: 16 },
  disabled: { opacity: 0.6 },
  statusOk: { color: colors.moon },
  status: { color: colors.rose, fontFamily: "HankenGrotesk_400Regular", fontSize: 13, textAlign: "center" },
  close: { minHeight: layout.minimumTouchTarget, alignItems: "center", justifyContent: "center" },
  closeText: { color: colors.moon, fontFamily: "HankenGrotesk_500Medium", fontSize: 15 }
});
