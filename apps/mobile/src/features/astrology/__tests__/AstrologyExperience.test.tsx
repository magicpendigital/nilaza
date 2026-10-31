import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AstrologyExperience } from "../AstrologyExperience";
import responseFixture from "../../../../../../packages/agent-config/astrology-ai-insight/fixtures/valid-response.json";
import type { AstrologyAiInsightResponse, AstrologyAiInvocation } from "../astrologyAiInsight";
import type { AnswerCorrelation } from "../../../../../../packages/ai-contracts/answer-provenance";
import {
  freshAstrologyData,
  AstrologyPersistence,
  AstrologyData,
} from "../persistence";
jest.mock("../MythologyWorld", () => {
  const ReactLocal = require("react");
  const { Pressable, Text, View } = require("react-native");
  return {
    MythologyWorld: ({ onBack, onSaveChart, onSubmitAiQuestion, aiErrorMessage, aiAnswer, onSaveAiAnswer, onRetryAiQuestion, onReportAiAnswer }: {
      onBack?: () => void;
      onSaveChart?: () => void;
      onSubmitAiQuestion?: (question: string) => void;
      aiErrorMessage?: string;
      aiAnswer?: { title: string; paragraphs: string[] };
      onSaveAiAnswer?: () => void;
      onRetryAiQuestion?: () => void;
      onReportAiAnswer?: () => void;
    }) =>
      ReactLocal.createElement(
        View,
        null,
        ReactLocal.createElement(Text, null, "Bản đồ tương tác đã sẵn sàng"),
        ReactLocal.createElement(
          Pressable,
          { onPress: onSaveChart },
          ReactLocal.createElement(Text, null, "Lưu bản đồ trên thiết bị"),
        ),
        ReactLocal.createElement(
          Pressable,
          { onPress: onBack },
          ReactLocal.createElement(Text, null, "Trở về Astrology"),
        ),
        ReactLocal.createElement(
          Pressable,
          { onPress: () => onSubmitAiQuestion?.("What pattern can I reflect on?") },
          ReactLocal.createElement(Text, null, "Gửi câu hỏi thử"),
        ),
        aiErrorMessage ? ReactLocal.createElement(Text, { testID: "ai-error" }, aiErrorMessage) : null,
        aiAnswer ? ReactLocal.createElement(Text, null, aiAnswer.title) : null,
        onSaveAiAnswer ? ReactLocal.createElement(Pressable, { onPress: onSaveAiAnswer }, ReactLocal.createElement(Text, null, "Lưu đầy đủ câu trả lời")) : null,
        onRetryAiQuestion ? ReactLocal.createElement(Pressable, { onPress: onRetryAiQuestion }, ReactLocal.createElement(Text, null, "Thử phân tích lại")) : null,
        onReportAiAnswer ? ReactLocal.createElement(Pressable, { onPress: onReportAiAnswer }, ReactLocal.createElement(Text, null, "Góp ý câu trả lời")) : null,
      ),
    MythologyEntry: () => null,
  };
});
jest.setTimeout(15000);
function memory() {
  let data: unknown = freshAstrologyData();
  return {
    read: () => data as AstrologyData,
    storage: {
      loadJson: jest.fn(async () => data),
      saveJsonOrThrow: jest.fn(async (_key: string, value: unknown) => {
        data = JSON.parse(JSON.stringify(value));
      }),
    } as unknown as AstrologyPersistence,
  };
}
// Computed and reopened charts land on the overview; the wheel (mocked MythologyWorld) opens from it.
async function openWheel(screen: ReturnType<typeof render>) {
  await waitFor(() => expect(screen.getByText("Bánh xe lá số & dữ liệu")).toBeTruthy());
  fireEvent.press(screen.getByText("Bánh xe lá số & dữ liệu"));
}
async function fillForm(
  screen: ReturnType<typeof render>,
  date: string,
  time: string,
  city: string,
) {
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Tạo lá số của bạn" }).props
        .accessibilityState.disabled,
    ).toBe(false),
  );
  fireEvent.press(screen.getByText("Tạo lá số của bạn"));
  const [year, month, day] = date.split("-");
  fireEvent.changeText(screen.getByLabelText("Ngày"), day);
  fireEvent.changeText(screen.getByLabelText("Tháng"), month);
  fireEvent.changeText(screen.getByLabelText("Năm"), year);
  const [hour, minute] = time.split(":").map(Number);
  fireEvent.changeText(screen.getByLabelText("Giờ"), String(hour % 12 || 12));
  fireEvent.changeText(screen.getByLabelText("Phút"), String(minute).padStart(2, "0"));
  fireEvent.press(screen.getByRole("radio", { name: hour >= 12 ? "Chiều" : "Sáng" }));
  fireEvent.changeText(screen.getByLabelText("Nơi sinh"), city);
  fireEvent.press(screen.getAllByText(new RegExp("^" + city + " ·"))[0]);
  fireEvent.press(screen.getByText("Đây đúng là nơi sinh của tôi"));
  fireEvent.press(screen.getByText("Xem bầu trời của mình"));
}
test("Vietnam birth completes calculation, failed disk write is visible, retry saves and reload opens the same chart", async () => {
  const m = memory();
  const screen = render(
    <AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} />,
  );
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  expect(screen.getByText("UTC: 2000-01-01T05:00:00Z")).toBeTruthy();
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await openWheel(screen);
  await waitFor(() =>
    expect(screen.getByText("Bản đồ tương tác đã sẵn sàng")).toBeTruthy(),
  );
  (m.storage.saveJsonOrThrow as jest.Mock).mockRejectedValueOnce(
    new Error("disk full"),
  );
  fireEvent.press(screen.getByText("Lưu bản đồ trên thiết bị"));
  await waitFor(() =>
    expect(screen.getByText(/Chưa lưu được trên thiết bị/)).toBeTruthy(),
  );
  expect(m.read().reports).toHaveLength(0);
  fireEvent.press(screen.getByText("Lưu bản đồ trên thiết bị"));
  await waitFor(() => expect(m.read().reports).toHaveLength(1));
  expect(m.read().reports[0].chart.time.utc).toBe("2000-01-01T05:00:00Z");
  screen.unmount();
  const reopened = render(
    <AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} />,
  );
  await waitFor(() => expect(reopened.getByText("1 lá số trên máy này")).toBeTruthy());
  fireEvent.press(reopened.getByText("1 lá số trên máy này"));
  await waitFor(() => expect(reopened.getByText("Mở bản đồ 1")).toBeTruthy());
  fireEvent.press(reopened.getByText("Mở bản đồ 1"));
  await openWheel(reopened);
  expect(reopened.getByText("Bản đồ tương tác đã sẵn sàng")).toBeTruthy();
  fireEvent.press(reopened.getByText("Trở về Astrology"));
  // The wheel returns to the chart overview; one more back reaches the hub.
  fireEvent.press(reopened.getByText("← Trở lại"));
  fireEvent.press(reopened.getByText("Xóa bản đồ 1"));
  fireEvent.press(reopened.getByText("Hủy"));
  expect(m.read().reports).toHaveLength(1);
  fireEvent.press(reopened.getByText("Xóa bản đồ 1"));
  fireEvent.press(reopened.getByText("Xác nhận xóa"));
  await waitFor(()=>expect(m.read().reports).toHaveLength(0));
  expect(m.read().nextRevision).toBe(2);
});
test("New York DST overlap requires explicit occurrence and resolves the chosen UTC", async () => {
  const m = memory(),
    screen = render(
      <AstrologyExperience
        language="vi"
        storage={m.storage}
        onBack={() => {}}
      />,
    );
  await fillForm(screen, "2020-11-01", "01:30", "New York City");
  expect(screen.getByText(/Giờ này xuất hiện hai lần/)).toBeTruthy();
  expect(screen.queryByText("Tạo bản đồ")).toBeNull();
  fireEvent.press(screen.getByText("Lần thứ hai · UTC-05:00"));
  fireEvent.press(screen.getByText("Xem bầu trời của mình"));
  expect(screen.getByText("UTC: 2020-11-01T06:30:00Z")).toBeTruthy();
});

test("Astrology AI consent double tap starts only one provider request", async () => {
  const m = memory();
  let rejectRequest: (reason?: unknown) => void = () => {};
  const requestAstrologyAi = jest.fn(() => new Promise((_, reject) => {
    rejectRequest = reject;
  }));
  const screen = render(
    <AstrologyExperience
      language="vi"
      storage={m.storage}
      onBack={() => {}}
      canRequestAstrologyAi
      requestAstrologyAi={requestAstrologyAi as never}
    />,
  );
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await openWheel(screen);
  await waitFor(() => expect(screen.getByText("Bản đồ tương tác đã sẵn sàng")).toBeTruthy());

  fireEvent.press(screen.getByText("Gửi câu hỏi thử"));
  const consent = screen.getByText("Đồng ý và gửi một câu hỏi");
  fireEvent.press(consent);
  fireEvent.press(consent);
  expect(requestAstrologyAi).toHaveBeenCalledTimes(1);

  rejectRequest(new Error("test cleanup"));
  await waitFor(() => expect(screen.getByText(/Người dẫn đường chưa thể hoàn tất/)).toBeTruthy());
});

function answerFor(invocation: AstrologyAiInvocation, correlation: AnswerCorrelation) {
  const evidenceFactIds = [invocation.selectedFactIds[0]], caveatIds = invocation.caveats.map(item => item.id).slice(0, 1);
  const report = {
    ...responseFixture, requestId: invocation.requestId, language: invocation.language,
    metadata: { ...responseFixture.metadata, reportRevision: invocation.chart.reportRevision }, evidenceFactIds,
    patterns: responseFixture.patterns.map(item => ({ ...item, evidenceFactIds, caveatIds })),
    tensions: responseFixture.tensions.map(item => ({ ...item, evidenceFactIds, caveatIds })),
    focusSections: responseFixture.focusSections.map(item => ({ ...item, evidenceFactIds, caveatIds })),
  } as AstrologyAiInsightResponse;
  return { report, provenance: { ...correlation, schemaVersion: "nilaza.answer-provenance.v1" as const,
    feature: "astrology_insight" as const, locale: invocation.language, sourceKind: "mock" as const,
    generatedAt: report.metadata.generatedAt, validationStatus: "validated" as const, persistenceStatus: "stored" as const,
    remoteId: report.reportId, promptVersion: report.metadata.promptVersion,
  } };
}

test("explicit save updates an already saved chart, reopens full AI report and reports metadata only", async () => {
  const m = memory(), onReportAnswer = jest.fn();
  const requestAstrologyAi = jest.fn(async (input: AstrologyAiInvocation, correlation: AnswerCorrelation) => answerFor(input, correlation));
  const screen = render(<AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} canRequestAstrologyAi
    requestAstrologyAi={requestAstrologyAi} onReportAnswer={onReportAnswer} />);
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await openWheel(screen);
  await waitFor(() => expect(screen.getByText("Bản đồ tương tác đã sẵn sàng")).toBeTruthy());
  fireEvent.press(screen.getByText("Lưu bản đồ trên thiết bị"));
  await waitFor(() => expect(m.read().reports).toHaveLength(1));
  fireEvent.press(screen.getByText("Gửi câu hỏi thử"));
  fireEvent.press(screen.getByText("Đồng ý và gửi một câu hỏi"));
  await waitFor(() => expect(screen.getByText(responseFixture.headline)).toBeTruthy());
  expect(m.read().reports[0].aiInsight).toBeUndefined();
  fireEvent.press(screen.getByText("Góp ý câu trả lời"));
  expect(onReportAnswer).toHaveBeenCalledWith(expect.objectContaining({ feature: "astrology_insight", localAnswerId: requestAstrologyAi.mock.calls[0][0].requestId }));
  expect(JSON.stringify(onReportAnswer.mock.calls[0][0])).not.toContain(responseFixture.synthesis);
  fireEvent.press(screen.getByText("Lưu đầy đủ câu trả lời"));
  await waitFor(() => expect(m.read().reports[0].aiInsight?.response.headline).toBe(responseFixture.headline));
  const snapshot = m.read().reports[0].aiInsight!;
  expect(snapshot.context.selectedFactIds).toEqual(requestAstrologyAi.mock.calls[0][0].selectedFactIds);
  expect(snapshot.context).not.toHaveProperty("userFocus");
  screen.unmount();
  const reopened = render(<AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} canRequestAstrologyAi onReportAnswer={onReportAnswer} />);
  await waitFor(() => expect(reopened.getByText("1 lá số trên máy này")).toBeTruthy());
  fireEvent.press(reopened.getByText("1 lá số trên máy này"));
  fireEvent.press(reopened.getByText("Mở bản đồ 1"));
  await openWheel(reopened);
  await waitFor(() => expect(reopened.getByText(responseFixture.headline)).toBeTruthy());
  expect(m.read().reports[0].aiInsight).toEqual(snapshot);
});

test("a retry preserves interaction but uses distinct attempt and client request IDs", async () => {
  const m = memory();
  let calls = 0;
  const requestAstrologyAi = jest.fn(async (input: AstrologyAiInvocation, correlation: AnswerCorrelation) => {
    if (!calls++) throw new Error("synthetic failure");
    return answerFor(input, correlation);
  });
  const screen = render(<AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} canRequestAstrologyAi requestAstrologyAi={requestAstrologyAi} />);
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await openWheel(screen);
  await waitFor(() => expect(screen.getByText("Gửi câu hỏi thử")).toBeTruthy());
  fireEvent.press(screen.getByText("Gửi câu hỏi thử"));
  fireEvent.press(screen.getByText("Đồng ý và gửi một câu hỏi"));
  await waitFor(() => expect(screen.getByText(/Người dẫn đường chưa thể hoàn tất/)).toBeTruthy());
  fireEvent.press(screen.getByText("Thử phân tích lại"));
  fireEvent.press(screen.getByText("Đồng ý và gửi một câu hỏi"));
  await waitFor(() => expect(screen.getByText(responseFixture.headline)).toBeTruthy());
  const [first, second] = requestAstrologyAi.mock.calls;
  expect(first[1].interactionId).toBe(second[1].interactionId);
  expect(first[1].attemptId).not.toBe(second[1].attemptId);
  expect(first[1].clientRequestId).not.toBe(second[1].clientRequestId);
  expect(second[1].clientRequestId).toBe(second[0].requestId);
});

test("an old account load cannot replace the newly selected account data", async () => {
  let finishOld: (value: AstrologyData) => void = () => {};
  const old = memory(), current = memory();
  (old.storage.loadJson as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  const screen = render(<AstrologyExperience language="vi" storage={old.storage} onBack={() => {}} />);
  screen.rerender(<AstrologyExperience language="vi" storage={current.storage} onBack={() => {}} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Tạo lá số của bạn" }).props.accessibilityState.disabled).toBe(false));
  finishOld({ ...freshAstrologyData(), displayZone: "Invalid/old_account" });
  await waitFor(() => expect(screen.queryByText(/Dữ liệu Astrology đã lưu không hợp lệ/)).toBeNull());
  expect(current.storage.saveJsonOrThrow).not.toHaveBeenCalled();
});

test("an old account AI result cannot appear or be saved after storage changes", async () => {
  const old = memory(), current = memory();
  let complete: () => void = () => {};
  const requestAstrologyAi = jest.fn((input: AstrologyAiInvocation, correlation: AnswerCorrelation) => new Promise<ReturnType<typeof answerFor>>(resolve => {
    complete = () => resolve(answerFor(input, correlation));
  }));
  const screen = render(<AstrologyExperience language="vi" storage={old.storage} onBack={() => {}} canRequestAstrologyAi requestAstrologyAi={requestAstrologyAi} />);
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await openWheel(screen);
  await waitFor(() => expect(screen.getByText("Gửi câu hỏi thử")).toBeTruthy());
  fireEvent.press(screen.getByText("Gửi câu hỏi thử"));
  fireEvent.press(screen.getByText("Đồng ý và gửi một câu hỏi"));
  expect(requestAstrologyAi).toHaveBeenCalledTimes(1);
  screen.rerender(<AstrologyExperience language="vi" storage={current.storage} onBack={() => {}} canRequestAstrologyAi requestAstrologyAi={requestAstrologyAi} />);
  await waitFor(() => expect(screen.getByText("Chưa có lá số nào")).toBeTruthy());
  complete();
  await waitFor(() => expect(screen.queryByText(responseFixture.headline)).toBeNull());
  expect(current.storage.saveJsonOrThrow).not.toHaveBeenCalled();
  expect(old.storage.saveJsonOrThrow).not.toHaveBeenCalled();
});
