import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { AccountScope } from "../../auth/accountScope";
import type { AccountStorage } from "../../auth/accountStorage";
import { colors, layout, radius, typography } from "../../theme";
import { isOpaqueAnswerId, type AnswerProvenance, type AnswerFeature } from "../../../../../packages/ai-contracts/answer-provenance";
import { FEEDBACK_CATEGORIES, type FeedbackCategory, type FeedbackSubmission, type FeedbackReceipt } from "../../../../../packages/ai-contracts/feedback";
import { createFeedbackQueue, FeedbackQueueError, type FeedbackQueueItem } from "./feedbackQueue";

export type FeedbackPanelTarget = {
  feature: AnswerFeature; localAnswerId: string; provenance?: AnswerProvenance;
  sectionIds: string[]; sectionLabels?: Record<string, string>; language: "vi" | "en";
};
export type FeedbackPanelProps = {
  target: FeedbackPanelTarget; storage: AccountStorage; scope: AccountScope; ready: boolean;
  send: (payload: FeedbackSubmission) => Promise<FeedbackReceipt>;
  onClose: () => void;
  onExportServer?: () => Promise<void>;
  onDeleteServer?: () => Promise<void>;
};
const categories: Record<FeedbackCategory, [string, string]> = {
  too_generic: ["Quá chung chung", "Too generic"], incorrect_facts: ["Sai lá bài hoặc dữ kiện", "Incorrect cards or facts"],
  unclear: ["Khó hiểu", "Hard to understand"], inappropriate: ["Không phù hợp hoặc gây khó chịu", "Inappropriate or upsetting"],
  language: ["Lỗi ngôn ngữ", "Language issue"], technical: ["Lỗi kỹ thuật", "Technical issue"],
};

export function FeedbackPanel({ target, storage, scope, ready, send, onClose, onExportServer, onDeleteServer }: FeedbackPanelProps) {
  const vi = target.language === "vi";
  const sendRef = useRef(send); sendRef.current = send;
  const queue = useMemo(() => createFeedbackQueue({ storage, scope, send: payload => sendRef.current(payload) }), [storage, scope]);
  const [category, setCategory] = useState<FeedbackCategory>("too_generic");
  const [sectionId, setSectionId] = useState<string | undefined>();
  const [items, setItems] = useState<FeedbackQueueItem[]>([]);
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"pending" | "sending" | undefined>();
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [withoutVerifiedLink, setWithoutVerifiedLink] = useState(false);
  const busyRef = useRef(false), generation = useRef(0);
  const sections = [...new Set(target.sectionIds.filter(isOpaqueAnswerId))].slice(0, 40);
  const sectionLabel = (id: string, index: number) => typeof target.sectionLabels?.[id] === "string"
    ? target.sectionLabels[id].replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 160)
    : id === "summary" ? (vi ? "Tóm tắt" : "Summary") : (vi ? `Phần ${index}` : `Section ${index}`);
  const targetKey = `${target.feature}:${target.localAnswerId}:${target.provenance?.answerReceiptId ?? ""}:${target.language}`;
  const matchesTarget = (item: FeedbackQueueItem) => item.payload.feature === target.feature && item.payload.localAnswerId === target.localAnswerId;
  const current = items.find(item => matchesTarget(item) && item.payload.category === category && item.payload.sectionId === sectionId
    && item.payload.answerReceiptId === (withoutVerifiedLink ? undefined : target.provenance?.answerReceiptId) && item.payload.language === target.language);
  const stillActive = (operation: number) => scope.active && generation.current === operation;
  const messageFor = (value: unknown) => {
    const code = value instanceof FeedbackQueueError ? value.code : (value as { code?: string })?.code;
    const copy: Record<string, [string, string]> = {
      queue_full: ["Thiết bị đã có 50 phản hồi đang chờ. Hãy gửi hoặc xóa các phản hồi trước khi thêm.", "This device has 50 pending reports. Send or delete them before adding more."],
      invalid_queue: ["Không đọc được phản hồi đã lưu. Dữ liệu được giữ nguyên để bạn xuất và kiểm tra.", "Saved feedback could not be read. It is preserved so you can export and inspect it."],
      storage_write_failed: ["Chưa lưu được trên thiết bị. Phản hồi chưa được xác nhận; hãy thử lại.", "Could not save on this device. Feedback is not confirmed; please retry."],
      receipt_not_saved: ["Máy chủ đã nhận nhưng thiết bị chưa lưu được xác nhận. Thử lại sẽ dùng cùng mã phản hồi.", "The server received it but this device could not save the receipt. Retry uses the same feedback ID."],
      deletion_pending: ["Yêu cầu xóa chưa hoàn tất. Hãy chọn Xóa tất cả phản hồi và thử lại; các phản hồi cũ sẽ không được gửi lại.", "Deletion is unfinished. Choose Delete all feedback and retry; old submissions will not be sent again."],
      delete_not_saved: ["Phản hồi trên tài khoản đã xóa; thiết bị chưa xóa được bản lưu. Hãy thử xóa lại. Các phản hồi cũ sẽ không được gửi lại.", "Account feedback was deleted, but the device copy could not be cleared. Retry deletion; old submissions will not be sent again."],
      session_closed: ["Phiên tài khoản đã kết thúc. Hãy mở lại sau khi đăng nhập.", "This account session ended. Reopen after signing in."],
      account_closed: ["Phiên tài khoản đã kết thúc. Hãy mở lại sau khi đăng nhập.", "This account session ended. Reopen after signing in."],
    };
    return copy[code ?? ""]?.[vi ? 0 : 1] ?? (vi ? "Chưa hoàn tất. Dữ liệu hiện có được giữ để bạn thử lại." : "This could not finish. Existing data is retained so you can retry.");
  };
  useEffect(() => {
    const operation = ++generation.current;
    setLoaded(false); setItems([]); setCategory("too_generic"); setSectionId(undefined); setError(""); setNotice(""); setConfirmDelete(false); setWithoutVerifiedLink(false);
    busyRef.current = true; setBusy(true);
    void (async () => {
      try {
        const state = await queue.load();
        if (!stillActive(operation)) return;
        setItems(state.items); setLoaded(true);
        if (state.deletionPending) setError(messageFor(new FeedbackQueueError("deletion_pending")));
        if (ready && state.items.some(item => matchesTarget(item) && item.status === "queued")) {
          setPhase("sending");
          const retried = await queue.retryQueued(target);
          if (stillActive(operation)) setItems(retried.items);
        }
      } catch (value) { if (stillActive(operation)) setError(messageFor(value)); }
      finally { if (stillActive(operation)) { busyRef.current = false; setBusy(false); setPhase(undefined); } }
    })();
    return () => { generation.current++; };
  }, [queue, targetKey, ready]);

  const submit = async (omitVerifiedLink = withoutVerifiedLink) => {
    const chosen = omitVerifiedLink ? items.find(item => matchesTarget(item) && item.payload.category === category && item.payload.sectionId === sectionId
      && item.payload.answerReceiptId === undefined && item.payload.language === target.language) : current;
    if (busyRef.current || !loaded || !scope.active || chosen?.status === "sent") return;
    setWithoutVerifiedLink(omitVerifiedLink);
    busyRef.current = true; setBusy(true); setPhase("pending"); setError(""); setNotice("");
    const operation = generation.current;
    try {
      const item = chosen ?? await queue.enqueue({ feature: target.feature, localAnswerId: target.localAnswerId, category, language: target.language,
        ...(sectionId ? { sectionId } : {}), ...(!omitVerifiedLink && target.provenance?.answerReceiptId ? { answerReceiptId: target.provenance.answerReceiptId } : {}),
        ...(target.provenance?.sourceKind ? { sourceKind: target.provenance.sourceKind } : {}) });
      if (!stillActive(operation)) return;
      setItems(previous => [...previous.filter(entry => entry.payload.clientFeedbackId !== item.payload.clientFeedbackId), item]);
      if (ready) {
        setPhase("sending");
        const result = await queue.deliver(item.payload.clientFeedbackId);
        if (stillActive(operation)) setItems(previous => previous.map(entry => entry.payload.clientFeedbackId === result.payload.clientFeedbackId ? result : entry));
      }
    } catch (value) { if (stillActive(operation)) setError(messageFor(value)); }
    finally { if (stillActive(operation)) { busyRef.current = false; setBusy(false); setPhase(undefined); } }
  };
  const manage = async (action: "export" | "delete") => {
    if (busyRef.current || !scope.active || !ready) return;
    const operation = generation.current;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    try {
      if (action === "export") await onExportServer?.();
      else if (onDeleteServer) {
        await queue.deleteAll(onDeleteServer);
        if (stillActive(operation)) { setItems([]); setConfirmDelete(false); setNotice(vi ? "Đã xóa phản hồi và xác nhận chẩn đoán trên tài khoản và thiết bị. Các bài đọc vẫn được giữ." : "Feedback and diagnostic receipts were deleted from the account and device. Your readings are retained."); }
      }
    } catch (value) { if (stillActive(operation)) setError(messageFor(value)); }
    finally { if (stillActive(operation)) { busyRef.current = false; setBusy(false); } }
  };
  const status = phase === "pending" ? (vi ? "Đang lưu phản hồi trên thiết bị…" : "Saving feedback on this device…")
    : phase === "sending" || current?.status === "sending" ? (vi ? "Đang gửi phản hồi…" : "Sending feedback…")
      : current?.status === "sent" ? (vi ? "Đã gửi. Đội ngũ đã nhận phản hồi." : "Sent. The team has received your feedback.")
        : current?.status === "queued" ? (vi ? "Đang chờ gửi trên thiết bị. Phản hồi sẽ được thử lại khi bạn mở mục này trong phiên online." : "Queued on this device. It will be retried when you open this panel in an online session.")
          : current?.status === "failed" ? (vi ? "Gửi chưa thành công. Bạn có thể thử lại." : "Sending failed. You can retry.") : "";
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={styles.panel}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>{vi ? "Góp ý câu trả lời" : "Feedback on this answer"}</Text>
        <Text style={styles.body}>{vi ? "Chỉ gửi lựa chọn và mã liên kết để đội ngũ kiểm tra chất lượng; không gửi câu hỏi, dữ liệu sinh hoặc nội dung câu trả lời." : "Only your choices and reference IDs are sent for quality review; your question, birth details and answer text are excluded."}</Text>
        {!loaded && !error ? <ActivityIndicator accessibilityLabel={vi ? "Đang mở phản hồi" : "Opening feedback"} color={colors.gold} /> : null}
        <Text style={styles.label}>{vi ? "Điều cần cải thiện" : "What could improve?"}</Text>
        {FEEDBACK_CATEGORIES.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: value === category, disabled: busy }}
          disabled={busy} style={[styles.option, category === value && styles.selected]} onPress={() => { setCategory(value); setError(""); setNotice(""); }}>
          <Text style={styles.body}>{value === category ? "● " : "○ "}{categories[value][vi ? 0 : 1]}</Text>
        </Pressable>)}
        {sections.length ? <><Text style={styles.label}>{vi ? "Phần liên quan" : "Related section"}</Text>
          {[undefined, ...sections].map((value, index) => <Pressable key={value ?? "whole"} accessibilityRole="radio"
            accessibilityState={{ checked: value === sectionId, disabled: busy }} disabled={busy}
            style={[styles.option, sectionId === value && styles.selected]} onPress={() => { setSectionId(value); setError(""); }}>
            <Text style={styles.body}>{sectionId === value ? "● " : "○ "}{value === undefined ? (vi ? "Toàn bộ câu trả lời" : "Whole answer")
              : sectionLabel(value, index)}</Text>
          </Pressable>)}</> : null}
        {!!status && <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>}
        {!!error && <Text accessibilityRole="alert" style={styles.status}>{error}</Text>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={styles.status}>{notice}</Text>}
        {current?.failure === "answer_receipt_unavailable" ? <View style={styles.confirm}>
          <Text style={styles.body}>{vi ? "Liên kết xác minh của câu trả lời không còn dùng được. Bạn có thể gửi lựa chọn góp ý mà không kèm liên kết này." : "This answer's verification link is unavailable. You can submit your feedback choices without that link."}</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit(true)} style={styles.button}>
            <Text style={styles.buttonText}>{vi ? "Gửi không kèm liên kết xác minh" : "Send without verified link"}</Text>
          </Pressable>
        </View> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !loaded || !scope.active || current?.status === "sent" }}
          disabled={busy || !loaded || !scope.active || current?.status === "sent"} onPress={() => void submit()} style={[styles.button, styles.primary, busy && styles.disabled]}>
          <Text style={styles.buttonText}>{current?.status === "sent" ? (vi ? "Đã gửi" : "Sent") : current ? (vi ? "Thử gửi lại" : "Retry sending") : (vi ? "Gửi phản hồi" : "Send feedback")}</Text>
        </Pressable>
        <Text style={styles.note}>{vi ? "Khi bạn mở bảng này, bản lưu trên thiết bị quá 30 ngày sẽ được dọn dẹp. Bạn có thể xuất phản hồi cùng dữ liệu tài khoản." : "Opening this panel removes device records older than 30 days. Feedback is included in your account data export."}</Text>
        {onExportServer ? <Pressable accessibilityRole="button" disabled={busy || !ready} onPress={() => void manage("export")} style={styles.button}><Text style={styles.buttonText}>{vi ? "Xuất phản hồi trên tài khoản" : "Export account feedback"}</Text></Pressable> : null}
        {onDeleteServer ? <Pressable accessibilityRole="button" disabled={busy || !ready} onPress={() => setConfirmDelete(true)} style={styles.button}><Text style={styles.buttonText}>{vi ? "Xóa tất cả phản hồi" : "Delete all feedback"}</Text></Pressable> : null}
        {confirmDelete ? <View style={styles.confirm}>
          <Text style={styles.body}>{vi ? "Xóa phản hồi và xác nhận chẩn đoán trên tài khoản và thiết bị? Các bài đọc không bị xóa." : "Delete feedback and diagnostic receipts from your account and this device? Your readings will remain."}</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void manage("delete")} style={styles.button}><Text style={styles.buttonText}>{vi ? "Xác nhận xóa phản hồi" : "Confirm feedback deletion"}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmDelete(false)} style={styles.button}><Text style={styles.buttonText}>{vi ? "Hủy" : "Cancel"}</Text></Pressable>
        </View> : null}
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><Text style={styles.buttonText}>{vi ? "Đóng" : "Close"}</Text></Pressable>
      </ScrollView>
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 16 },
  panel: { maxHeight: "92%", width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: colors.charcoal, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border },
  content: { padding: 20, gap: 12 }, title: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 28, lineHeight: 34 },
  body: { color: colors.ivory, fontFamily: typography.bodyFontFamily, fontSize: 16, lineHeight: 24 },
  label: { color: colors.ivory, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16, lineHeight: 24, marginTop: 8 },
  option: { minHeight: layout.minimumTouchTarget, justifyContent: "center", borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: radius.control },
  selected: { borderColor: colors.gold, backgroundColor: colors.surfaceHigh },
  button: { minHeight: layout.minimumTouchTarget, justifyContent: "center", alignItems: "center", padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control },
  primary: { backgroundColor: colors.teal }, buttonText: { color: colors.ivory, textAlign: "center", fontFamily: typography.bodySemiBoldFontFamily, fontSize: 16, lineHeight: 24 },
  status: { color: colors.ivory, fontFamily: typography.bodyMediumFontFamily, fontSize: 16, lineHeight: 24 },
  note: { color: colors.onSurfaceVariant, fontFamily: typography.bodyFontFamily, fontSize: 14, lineHeight: 21 },
  disabled: { opacity: 0.6 }, confirm: { gap: 10, padding: 12, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.card },
});
