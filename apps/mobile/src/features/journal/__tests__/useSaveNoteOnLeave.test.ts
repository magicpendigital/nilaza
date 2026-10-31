import { renderHook } from "@testing-library/react-native";
import { PendingNote, useSaveNoteOnLeave } from "../useSaveNoteOnLeave";

test("an unsaved note is saved when the screen leaves", () => {
  const save = jest.fn();
  const { rerender, unmount } = renderHook(({ pending }: { pending: PendingNote }) => useSaveNoteOnLeave(pending, save), {
    initialProps: { pending: null as PendingNote }
  });
  rerender({ pending: { id: "entry-1", note: "Điều mình muốn nhớ" } });
  unmount();
  expect(save).toHaveBeenCalledWith("entry-1", "Điều mình muốn nhớ");
});

test("flush saves once and an unchanged note is not saved", () => {
  const save = jest.fn();
  const { result, unmount } = renderHook(() => useSaveNoteOnLeave({ id: "entry-2", note: "Ghi chú" }, save));
  result.current.flush();
  unmount();
  expect(save).toHaveBeenCalledTimes(1);

  const untouched = jest.fn();
  renderHook(() => useSaveNoteOnLeave(null, untouched)).unmount();
  expect(untouched).not.toHaveBeenCalled();
});

test("a note on an entry being deleted is dropped", () => {
  const save = jest.fn();
  const { result, unmount } = renderHook(() => useSaveNoteOnLeave({ id: "entry-3", note: "Ghi chú" }, save));
  result.current.drop();
  unmount();
  expect(save).not.toHaveBeenCalled();
});
