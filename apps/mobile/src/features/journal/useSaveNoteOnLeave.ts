import { useEffect, useRef } from "react";

export type PendingNote = { id: string; note: string } | null;

/**
 * Keeps the latest unsaved Journal note and saves it when the screen leaves, so a note typed
 * without tapping Lưu ghi chú survives the back arrow, Android Back and a tab change.
 * `flush` saves now (back arrow); `drop` forgets it (the entry is being deleted).
 */
export function useSaveNoteOnLeave(pending: PendingNote, save: (id: string, note: string) => void) {
  const pendingRef = useRef<PendingNote>(pending);
  pendingRef.current = pending;
  const saveRef = useRef(save);
  saveRef.current = save;
  const flush = () => {
    const current = pendingRef.current;
    pendingRef.current = null;
    if (current) saveRef.current(current.id, current.note);
  };
  useEffect(() => flush, []);
  return { flush, drop: () => { pendingRef.current = null; } };
}
