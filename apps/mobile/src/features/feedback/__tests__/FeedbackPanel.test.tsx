import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AccountScope } from "../../../auth/accountScope";
import { FeedbackPanel } from "../FeedbackPanel";

function setup(language: "vi" | "en", ready: boolean) {
  let saved: unknown = null;
  const storage = { loadJson: async () => saved, saveJsonOrThrow: async (_: string, value: unknown) => { saved = JSON.parse(JSON.stringify(value)); } } as any;
  const scope = new AccountScope({ status: "signed_in", user: { id: "synthetic" } } as any);
  const send = jest.fn(async (payload: any) => ({ schemaVersion: "ai-feedback-v1" as const, clientFeedbackId: payload.clientFeedbackId,
    feedbackId: "00000000-0000-4000-8000-000000000001", receivedAt: new Date().toISOString(), correlationStatus: "unverified_client" as const }));
  const onDeleteServer = jest.fn(async () => {});
  const ui = render(<FeedbackPanel target={{ feature: "tarot_reading", localAnswerId: "request-test", sectionIds: ["summary"], language }} storage={storage} scope={scope} ready={ready} send={send} onClose={() => {}} onDeleteServer={onDeleteServer} />);
  return { ...ui, send, onDeleteServer, saved: () => saved };
}
test("Vietnamese feedback queues offline without claiming server receipt", async () => {
  const ui = setup("vi", false);
  await waitFor(() => expect(ui.getByRole("button", { name: "Gửi phản hồi" })).toBeEnabled());
  fireEvent.press(ui.getByRole("button", { name: "Gửi phản hồi" }));
  await waitFor(() => expect(ui.getByRole("button", { name: "Thử gửi lại" })).toBeTruthy());
  expect(ui.send).not.toHaveBeenCalled();
  expect((ui.saved() as any).items[0].status).toBe("queued");
  expect(ui.queryByRole("button", { name: "Đã gửi" })).toBeNull();
});
test("English feedback shows sent only after acknowledgement; deletion needs explicit confirmation", async () => {
  const ui = setup("en", true);
  await waitFor(() => expect(ui.getByRole("button", { name: "Send feedback" })).toBeEnabled());
  fireEvent.press(ui.getByRole("button", { name: "Send feedback" }));
  await waitFor(() => expect(ui.getByRole("button", { name: "Sent" })).toBeDisabled());
  expect(ui.send).toHaveBeenCalledTimes(1);
  expect(ui.send.mock.calls[0][0]).not.toHaveProperty("notes");
  fireEvent.press(ui.getByRole("button", { name: "Delete all feedback" }));
  expect(ui.onDeleteServer).not.toHaveBeenCalled();
  fireEvent.press(ui.getByRole("button", { name: "Confirm feedback deletion" }));
  await waitFor(() => expect(ui.onDeleteServer).toHaveBeenCalledTimes(1));
  await waitFor(() => expect((ui.saved() as any).items).toEqual([]));
});
test("a guide chat report is sent as persona_chat with conversation wording", async () => {
  let saved: unknown = null;
  const storage = { loadJson: async () => saved, saveJsonOrThrow: async (_: string, value: unknown) => { saved = JSON.parse(JSON.stringify(value)); } } as any;
  const scope = new AccountScope({ status: "signed_in", user: { id: "synthetic" } } as any);
  const send = jest.fn(async (payload: any) => ({ schemaVersion: "ai-feedback-v1" as const, clientFeedbackId: payload.clientFeedbackId,
    feedbackId: "00000000-0000-4000-8000-000000000002", receivedAt: new Date().toISOString(), correlationStatus: "unverified_client" as const }));
  const ui = render(<FeedbackPanel target={{ feature: "persona_chat", localAnswerId: "1793440000000-abc", sectionIds: [], language: "vi" }} storage={storage} scope={scope} ready send={send} onClose={() => {}} />);
  expect(ui.getByText(/Sai sự thật hoặc hiểu sai ý mình/)).toBeTruthy();
  await waitFor(() => expect(ui.getByRole("button", { name: "Gửi phản hồi" })).toBeEnabled());
  fireEvent.press(ui.getByRole("button", { name: "Gửi phản hồi" }));
  await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  expect(send.mock.calls[0][0]).toMatchObject({ feature: "persona_chat", localAnswerId: "1793440000000-abc" });
});
