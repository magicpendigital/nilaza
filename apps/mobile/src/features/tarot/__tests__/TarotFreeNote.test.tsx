import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react-native";
import { resetTarotNoteCache, TarotFreeNote, useTarotFreeNote, type TarotNoteViewState } from "../TarotFreeNote";
import type { TarotNoteOutcome } from "../tarotNote";

const note: TarotNoteViewState = {
  kind: "note",
  note: { text: "Đoạn một.\n\nĐoạn hai.", need: "Bạn cần được nghe.", askThem: "" },
  experiment: { campaignId: "note-v1", variant: "b" }
};

describe("TarotFreeNote box", () => {
  it("shows the note with label, badge, lead, paragraphs and footnote", () => {
    const screen = render(<TarotFreeNote language="vi" state={note} onRetry={jest.fn()} />);
    expect(screen.getByText("LỜI NHẮN RIÊNG CHO BẠN")).toBeTruthy();
    expect(screen.getByText("MIỄN PHÍ HÔM NAY")).toBeTruthy();
    expect(screen.getByText("Bạn cần được nghe.")).toBeTruthy();
    expect(screen.getByText("Đoạn một.")).toBeTruthy();
    expect(screen.getByText("Đoạn hai.")).toBeTruthy();
    expect(screen.getByText(/không phải lời phán/)).toBeTruthy();
  });

  it("takes one feedback tap, then thanks", () => {
    const onFeedback = jest.fn();
    const screen = render(<TarotFreeNote language="vi" state={note} onRetry={jest.fn()} onFeedback={onFeedback} />);
    fireEvent.press(screen.getByRole("button", { name: "Đúng" }));
    expect(onFeedback).toHaveBeenCalledWith("yes");
    expect(screen.queryByRole("button", { name: "Chưa" })).toBeNull();
    expect(screen.getByText(/Cảm ơn bạn/)).toBeTruthy();
  });

  it("writing state shows the progress text and works with reduced motion", () => {
    const screen = render(<TarotFreeNote language="vi" state={{ kind: "writing" }} reduceMotion onRetry={jest.fn()} />);
    expect(screen.getByText("Nilaza đang đọc các lá cùng câu hỏi của bạn…")).toBeTruthy();
  });

  it("guest, used today, error and offline states say what happened", () => {
    const onSignIn = jest.fn();
    const guest = render(<TarotFreeNote language="vi" state={{ kind: "guest" }} onRetry={jest.fn()} onSignIn={onSignIn} />);
    fireEvent.press(guest.getByRole("button", { name: "Đăng nhập để nhận lời nhắn" }));
    expect(onSignIn).toHaveBeenCalled();
    const guestNoButton = render(<TarotFreeNote language="vi" state={{ kind: "guest" }} onRetry={jest.fn()} />);
    expect(guestNoButton.queryByRole("button")).toBeNull();

    const used = render(<TarotFreeNote language="vi" state={{ kind: "used_today" }} onRetry={jest.fn()} />);
    expect(used.getByText(/Lời nhắn mới có lại vào ngày mai/)).toBeTruthy();
    expect(used.queryByText("MIỄN PHÍ HÔM NAY")).toBeNull();

    const onRetry = jest.fn();
    const error = render(<TarotFreeNote language="vi" state={{ kind: "error", reason: "busy" }} onRetry={onRetry} />);
    expect(error.getByText("Chưa viết được lời nhắn lúc này. Lượt hôm nay vẫn còn nguyên.")).toBeTruthy();
    fireEvent.press(error.getByRole("button", { name: "Thử lại" }));
    expect(onRetry).toHaveBeenCalled();

    const offline = render(<TarotFreeNote language="en" state={{ kind: "error", reason: "offline" }} onRetry={jest.fn()} />);
    expect(offline.getByText(/You are offline/)).toBeTruthy();
  });

  it("a safety block and three failed tries are calm, final states without a retry button", () => {
    const blocked = render(<TarotFreeNote language="vi" state={{ kind: "blocked" }} onRetry={jest.fn()} />);
    expect(blocked.getByText("Nilaza không viết lời nhắn cho câu hỏi này. Bài đọc ở trên vẫn đầy đủ.")).toBeTruthy();
    expect(blocked.queryByRole("button")).toBeNull();
    expect(blocked.queryByText("Thử lại")).toBeNull();
    const attempts = render(<TarotFreeNote language="vi" state={{ kind: "attempts_today" }} onRetry={jest.fn()} />);
    expect(attempts.getByText("Hôm nay Nilaza chưa viết được lời nhắn sau vài lần thử. Bạn thử lại vào ngày mai nhé.")).toBeTruthy();
    expect(attempts.queryByRole("button")).toBeNull();
    const en = render(<TarotFreeNote language="en" state={{ kind: "blocked" }} onRetry={jest.fn()} />);
    expect(en.getByText(/does not write a note for this question/)).toBeTruthy();
  });

  it("a saved reading shows a small button that asks for the note", () => {
    const onReveal = jest.fn();
    const screen = render(<TarotFreeNote language="vi" state={{ kind: "saved" }} onRetry={jest.fn()} onReveal={onReveal} />);
    fireEvent.press(screen.getByRole("button", { name: "Xem lời nhắn" }));
    expect(onReveal).toHaveBeenCalled();
  });

  it("a crisis answer shows the 115 card and no note", () => {
    const screen = render(<TarotFreeNote language="vi" state={{ kind: "crisis" }} onRetry={jest.fn()} />);
    expect(screen.getAllByText(/115/).length).toBeGreaterThan(0);
    expect(screen.queryByText("LỜI NHẮN RIÊNG CHO BẠN")).toBeNull();
  });
});

describe("useTarotFreeNote", () => {
  beforeEach(() => resetTarotNoteCache());

  const okOutcome: TarotNoteOutcome = { kind: "note", note: { text: "Xin chào", need: "", askThem: "" }, experiment: null };

  it("asks once per draw and reuses the answer after a remount", async () => {
    const request = jest.fn(async () => okOutcome);
    const first = renderHook(() => useTarotFreeNote({ drawId: "d1", signedIn: true, request }));
    expect(first.result.current.state).toEqual({ kind: "writing" });
    await waitFor(() => expect(first.result.current.state?.kind).toBe("note"));
    first.unmount();
    const second = renderHook(() => useTarotFreeNote({ drawId: "d1", signedIn: true, request }));
    expect(second.result.current.state?.kind).toBe("note");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("an opened saved reading (auto false) asks nothing until the person taps reveal", async () => {
    const request = jest.fn(async () => okOutcome);
    const hook = renderHook(() => useTarotFreeNote({ drawId: "d5", signedIn: true, request, auto: false }));
    expect(hook.result.current.state).toEqual({ kind: "saved" });
    expect(request).not.toHaveBeenCalled();
    act(() => hook.result.current.reveal());
    await waitFor(() => expect(hook.result.current.state?.kind).toBe("note"));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("a blocked answer is cached and never retried", async () => {
    const request = jest.fn(async (): Promise<TarotNoteOutcome> => ({ kind: "blocked" }));
    const hook = renderHook(() => useTarotFreeNote({ drawId: "d6", signedIn: true, request }));
    await waitFor(() => expect(hook.result.current.state).toEqual({ kind: "blocked" }));
    hook.unmount();
    const again = renderHook(() => useTarotFreeNote({ drawId: "d6", signedIn: true, request }));
    expect(again.result.current.state).toEqual({ kind: "blocked" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("guests never trigger a request; no drawId shows nothing", () => {
    const request = jest.fn(async () => okOutcome);
    const guest = renderHook(() => useTarotFreeNote({ drawId: "d2", signedIn: false, request }));
    expect(guest.result.current.state).toEqual({ kind: "guest" });
    const local = renderHook(() => useTarotFreeNote({ drawId: undefined, signedIn: true, request }));
    expect(local.result.current.state).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it("an error is not cached, so retry asks again", async () => {
    const request = jest.fn<Promise<TarotNoteOutcome>, [string]>()
      .mockResolvedValueOnce({ kind: "unavailable", reason: "busy" })
      .mockResolvedValueOnce(okOutcome);
    const hook = renderHook(() => useTarotFreeNote({ drawId: "d3", signedIn: true, request }));
    await waitFor(() => expect(hook.result.current.state).toEqual({ kind: "error", reason: "busy" }));
    act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.state?.kind).toBe("note"));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("a thrown request becomes the error state, never invented text", async () => {
    const request = jest.fn(async (): Promise<TarotNoteOutcome> => { throw new Error("network"); });
    const hook = renderHook(() => useTarotFreeNote({ drawId: "d4", signedIn: true, request }));
    await waitFor(() => expect(hook.result.current.state).toEqual({ kind: "error", reason: "busy" }));
  });
});
