import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Chip, PrimaryButton, SecondaryButton } from "../../a2ui";
import { colors, layout, radius, spacing, typography } from "../../theme";
import type { JournalEntry, Language } from "../../types";
import type { JournalDraft, JournalDraftStore } from "./journalDraftStore";

type NoteDraft = Pick<JournalEntry, "title" | "summary" | "mood">;
export function JournalComposer({ language, onSave, onClose, draftStore, prompt }: {
  language: Language; onSave: (draft: NoteDraft) => Promise<boolean>; onClose: () => void;
  draftStore?: JournalDraftStore;
  // A writing prompt from Home; shown as the heading and used as the title when none is typed. Never written into the draft.
  prompt?: string;
}) {
  const vi = language === "vi";
  const [localDraft, setLocalDraft] = useState<JournalDraft>({ title: "", body: "", mood: "reflective" });
  const [localSaving, setLocalSaving] = useState(false);
  const [error, setError] = useState(false);
  const [, refresh] = useState(0);
  const locked = useRef(false), mounted = useRef(true);
  const currentStore = useRef(draftStore);
  currentStore.current = draftStore;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    setError(false);
    if (!draftStore) return;
    const unsubscribe = draftStore.subscribe(() => refresh(value => value + 1));
    // Catch a hydration/ACK that completed between render and subscription.
    refresh(value => value + 1);
    void draftStore.hydrate();
    return unsubscribe;
  }, [draftStore]);
  const snapshot = draftStore?.getSnapshot();
  const { title, body, mood } = snapshot?.draft ?? localDraft;
  const ready = !draftStore || snapshot?.status === "ready";
  const saving = draftStore ? snapshot?.submission === "saving" || snapshot?.submission === "clearing" : localSaving;
  const clearFailed = snapshot?.submission === "clear_error";
  const active = !draftStore || draftStore.isActive();
  const disabled = !ready || saving || clearFailed || !active;
  const update = (patch: Partial<JournalDraft>) => {
    setError(false);
    if (draftStore) void draftStore.update({ ...draftStore.getSnapshot().draft, ...patch });
    else setLocalDraft(value => ({ ...value, ...patch }));
  };
  const save = async () => {
    const store = draftStore;
    if (disabled) return;
    const captured = store?.beginSubmit();
    if (store && !captured) return;
    if (!store && (locked.current || !body.trim())) return;
    const draft = captured?.draft ?? { title, body, mood };
    if (!store) { locked.current = true; setLocalSaving(true); }
    setError(false);
    let saved = false;
    try {
      saved = await onSave({ title: draft.title.trim() || prompt || (vi ? "Ghi chú của mình" : "My note"), summary: draft.body.trim(), mood: draft.mood });
    } catch { saved = false; }
    const cleared = store && captured ? await store.finishSubmit(captured.revision, saved) : saved;
    if (!store) locked.current = false;
    if (!mounted.current || currentStore.current !== store || (store && !store.isActive())) return;
    if (!store) setLocalSaving(false);
    if (saved && cleared) onClose(); else if (!saved) setError(true);
  };
  const retryDraft = async () => {
    const store = draftStore;
    if (!store) return;
    const wasClear = store.getSnapshot().submission === "clear_error";
    const succeeded = wasClear ? await store.retryClear() : await store.retry();
    if (wasClear && succeeded && mounted.current && currentStore.current === store && store.isActive()) onClose();
  };
  return <View style={styles.stack}>
    <Text accessibilityRole="header" style={styles.title}>{prompt ?? (vi ? "Viết cho mình" : "Write for yourself")}</Text>
    <Text style={styles.body}>{vi ? "Một vài dòng để ghi lại điều bạn đang cảm thấy. Ghi chú này được giữ trong nhật ký riêng của bạn." : "A few lines to remember what you are feeling. This note stays in your private journal."}</Text>
    {draftStore && !ready ? <View style={styles.stack}>
      <Text accessibilityRole={snapshot?.status === "read_error" ? "alert" : undefined} style={styles.body}>{snapshot?.status === "read_error"
        ? (vi ? "Chưa thể mở bản nháp. Hãy thử lại để giữ nội dung đã có." : "Your draft could not be opened. Retry to keep existing content.")
        : (vi ? "Đang mở bản nháp…" : "Opening your draft…")}</Text>
      {snapshot?.status === "read_error" ? <SecondaryButton disabled={!active} label={vi ? "Thử mở lại" : "Retry opening"} onPress={() => { void retryDraft(); }} /> : null}
    </View> : null}
    <Text style={styles.body}>{vi ? "Tiêu đề · tùy chọn" : "Title · optional"}</Text>
    <TextInput accessibilityLabel={vi ? "Tiêu đề ghi chú" : "Note title"} value={title} onChangeText={title => update({ title })}
      editable={!disabled} maxLength={160} placeholder={prompt ?? (vi ? "Điều mình muốn nhớ" : "Something to remember")}
      placeholderTextColor={colors.moon} style={styles.input} />
    <Text style={styles.body}>{vi ? "Nội dung" : "Your note"}</Text>
    <TextInput accessibilityLabel={vi ? "Nội dung ghi chú" : "Note text"} value={body} onChangeText={body => update({ body })}
      editable={!disabled} maxLength={10000} multiline placeholder={vi ? "Hôm nay mình..." : "Today I..."}
      placeholderTextColor={colors.moon} style={[styles.input, styles.note]} />
    <Text style={styles.body}>{vi ? "Cảm xúc lúc này" : "How you feel"}</Text>
    <View style={styles.moods}>{[
      { id: "calm", vi: "Bình an", en: "Calm" }, { id: "curious", vi: "Tò mò", en: "Curious" },
      { id: "reflective", vi: "Suy ngẫm", en: "Reflective" }, { id: "hopeful", vi: "Hy vọng", en: "Hopeful" },
      { id: "stuck", vi: "Mắc kẹt", en: "Stuck" }
    ].map(item => <Chip key={item.id} active={mood === item.id} label={vi ? item.vi : item.en} onPress={() => { if (!disabled && !locked.current) update({ mood: item.id }); }} />)}</View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{vi ? "Chưa lưu được. Nội dung của bạn vẫn ở đây; hãy thử lưu lại." : "Could not save. Your draft is still here; try saving again."}</Text> : null}
    {draftStore && ready && snapshot?.persistence === "saving" && !saving ? <Text style={styles.body}>{vi ? "Đang lưu bản nháp…" : "Saving your draft…"}</Text> : null}
    {draftStore && ready && snapshot?.persistence === "error" ? <View style={styles.stack}>
      <Text accessibilityRole="alert" style={styles.error}>{clearFailed
        ? (vi ? "Ghi chú đã lưu, nhưng chưa xoá được bản nháp. Thử lại để hoàn tất; ghi chú sẽ không được tạo thêm." : "Your note was saved, but its draft could not be cleared. Retry to finish without creating another note.")
        : (vi ? "Bản nháp chưa lưu được trên thiết bị. Nội dung vẫn ở đây trong phiên này; hãy thử lại." : "Your draft could not be saved on this device. Your text is still here in this session; please retry.")}</Text>
      <SecondaryButton disabled={!active || saving} label={clearFailed ? (vi ? "Hoàn tất lưu" : "Finish saving") : (vi ? "Lưu lại bản nháp" : "Retry saving draft")} onPress={() => { void retryDraft(); }} />
    </View> : null}
    <PrimaryButton disabled={disabled || !body.trim()} label={saving ? (vi ? "Đang lưu..." : "Saving...") : (vi ? "Lưu vào nhật ký" : "Save to journal")} onPress={() => { void save(); }} />
    <SecondaryButton disabled={saving} label={vi ? "Quay lại" : "Back"} onPress={onClose} />
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md }, title: { ...typography.headlineLg, fontFamily: typography.headlineRegularFontFamily, color: colors.ivory },
  body: { ...typography.body, fontFamily: typography.bodyFontFamily, color: colors.onSurface },
  input: { ...typography.body, fontFamily: typography.bodyFontFamily, color: colors.ivory, minHeight: layout.minimumTouchTarget,
    borderColor: colors.border, borderWidth: 1, borderRadius: radius.control, padding: spacing.md, backgroundColor: colors.panel },
  note: { minHeight: 160, textAlignVertical: "top" }, moods: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  error: { ...typography.body, color: colors.rose }
});
