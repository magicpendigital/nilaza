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
    MythologyWorld: ({ onBack, onSaveChart, onSubmitAiQuestion, aiErrorMessage, aiAnswer, onSaveAiAnswer, onRetryAiQuestion, onReportAiAnswer, initialTab, aiUnlockLabel, aiCrisis }: {
      onBack?: () => void;
      onSaveChart?: () => void;
      onSubmitAiQuestion?: (question: string) => void;
      aiErrorMessage?: string;
      aiAnswer?: { title: string; paragraphs: string[] };
      onSaveAiAnswer?: () => void;
      onRetryAiQuestion?: () => void;
      onReportAiAnswer?: () => void;
      initialTab?: string;
      aiUnlockLabel?: string;
      aiCrisis?: boolean;
    }) =>
      ReactLocal.createElement(
        View,
        null,
        ReactLocal.createElement(Text, null, "Bản đồ tương tác đã sẵn sàng"),
        ReactLocal.createElement(Text, { testID: "entry-tab" }, initialTab ?? "none"),
        aiUnlockLabel ? ReactLocal.createElement(Text, { testID: "unlock-label" }, aiUnlockLabel) : null,
        aiCrisis ? ReactLocal.createElement(Text, { testID: "ai-crisis" }, "crisis") : null,
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
  await waitFor(() => expect(screen.getByLabelText("Ngày")).toBeTruthy());
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
test("chart overview shows the Big 3 headline and topic tabs; the hub shows today's Moon", async () => {
  const m = memory();
  const screen = render(
    <AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} />,
  );
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  // Sun in Capricorn opens the headline.
  await waitFor(() => expect(screen.getByText(/^Người đi đường dài /)).toBeTruthy());
  expect(screen.getByRole("tab", { name: "Tổng quan" }).props.accessibilityState.selected).toBe(true);
  fireEvent.press(screen.getByRole("tab", { name: "Công việc" }));
  expect(screen.getByText(/^Thiên đỉnh · /)).toBeTruthy();
  expect(screen.getByText(/^Sao Thổ · /)).toBeTruthy();
  expect(screen.getByText("Đây là gợi ý để tự soi chiếu, không phải dự đoán.")).toBeTruthy();
  expect(screen.queryByText("Bánh xe lá số & dữ liệu")).toBeNull();
  fireEvent.press(screen.getByRole("tab", { name: "Bản thân" }));
  expect(screen.getByText("Nếu bạn chưa chắc giờ sinh, phần này có thể khác.")).toBeTruthy();
  fireEvent.press(screen.getByRole("tab", { name: "Tổng quan" }));
  fireEvent.press(screen.getByText("Lưu bản đồ trên thiết bị"));
  await waitFor(() => expect(m.read().reports).toHaveLength(1));
  fireEvent.press(screen.getByText("← Trở lại"));
  await waitFor(() => expect(screen.getByText(/^Người đi đường dài /)).toBeTruthy());
  expect(screen.getByText(/^Mặt Trăng đi qua nhà /)).toBeTruthy();
  expect(screen.getByText("Nghiêng về")).toBeTruthy();
  expect(screen.queryByText("Bổ sung giờ sinh")).toBeNull();
});
test("without a birth time the hub hides Rising and today's Moon and invites the time", async () => {
  const m = memory();
  const screen = render(
    <AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} />,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Tạo lá số của bạn" }).props.accessibilityState.disabled).toBe(false),
  );
  fireEvent.press(screen.getByText("Tạo lá số của bạn"));
  fireEvent.changeText(screen.getByLabelText("Ngày"), "01");
  fireEvent.changeText(screen.getByLabelText("Tháng"), "01");
  fireEvent.changeText(screen.getByLabelText("Năm"), "2000");
  fireEvent.press(screen.getByText("Không rõ"));
  fireEvent.changeText(screen.getByLabelText("Nơi sinh"), "Hanoi");
  fireEvent.press(screen.getAllByText(/^Hanoi ·/)[0]);
  fireEvent.press(screen.getByText("Đây đúng là nơi sinh của tôi"));
  fireEvent.press(screen.getByText("Xem bầu trời của mình"));
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await waitFor(() => expect(screen.getByRole("tab", { name: "Công việc" })).toBeTruthy());
  fireEvent.press(screen.getByRole("tab", { name: "Công việc" }));
  expect(screen.getByText("Phần này cần giờ sinh chính xác.")).toBeTruthy();
  expect(screen.getByText("Bổ sung giờ sinh")).toBeTruthy();
  fireEvent.press(screen.getByRole("tab", { name: "Tổng quan" }));
  fireEvent.press(screen.getByText("Lưu bản đồ trên thiết bị"));
  await waitFor(() => expect(m.read().reports).toHaveLength(1));
  fireEvent.press(screen.getByText("← Trở lại"));
  await waitFor(() => expect(screen.getByText(/Thêm giờ sinh chính xác/)).toBeTruthy());
  expect(screen.queryByText(/^Mặt Trăng đi qua nhà /)).toBeNull();
  expect(screen.queryByText("Cung mọc")).toBeNull();
  fireEvent.press(screen.getByText("Bổ sung giờ sinh"));
  // The form reopens on the exact-time mode with the saved date.
  expect(screen.getByLabelText("Giờ")).toBeTruthy();
  expect(screen.getByLabelText("Năm").props.value).toBe("2000");
});
test("So với một người saves another person only after consent, compares and deletes on the device", async () => {
  const m = memory();
  const screen = render(
    <AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} />,
  );
  await waitFor(() => expect(screen.getByText("So với một người")).toBeTruthy());
  fireEvent.press(screen.getByText("So với một người"));
  // Without an own chart the list asks for it first.
  expect(screen.getByText(/Lưu lá số của bạn trước/)).toBeTruthy();
  fireEvent.press(screen.getByText("← Trở lại"));
  await fillForm(screen, "2000-03-15", "14:30", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await waitFor(() => expect(screen.getByText("Lưu bản đồ trên thiết bị")).toBeTruthy());
  fireEvent.press(screen.getByText("Lưu bản đồ trên thiết bị"));
  await waitFor(() => expect(m.read().reports).toHaveLength(1));
  fireEvent.press(screen.getByText("← Trở lại"));
  fireEvent.press(screen.getByText("So với một người"));
  fireEvent.press(screen.getByText("Thêm người"));
  const addPerson = () => {
    fireEvent.changeText(screen.getByLabelText("Tên hoặc biệt danh"), "Minh");
    fireEvent.press(screen.getByRole("radio", { name: "Người nhà" }));
    fireEvent.changeText(screen.getByLabelText("Ngày"), "02");
    fireEvent.changeText(screen.getByLabelText("Tháng"), "08");
    fireEvent.changeText(screen.getByLabelText("Năm"), "1998");
    fireEvent.press(screen.getByText("Không rõ"));
    fireEvent.changeText(screen.getByLabelText("Nơi sinh"), "Hanoi");
    fireEvent.press(screen.getAllByText(/^Hanoi ·/)[0]);
    fireEvent.press(screen.getByText("Đây đúng là nơi sinh của tôi"));
    fireEvent.press(screen.getByText("Tiếp tục"));
    fireEvent.press(screen.getByText("Tạo bản đồ"));
  };
  addPerson();
  await waitFor(() => expect(screen.getByText("Trước khi lưu bản đồ của người khác")).toBeTruthy());
  // Declining keeps nothing.
  fireEvent.press(screen.getByText("Không lưu"));
  expect(m.read().people ?? []).toHaveLength(0);
  fireEvent.press(screen.getByText("Thêm người"));
  addPerson();
  await waitFor(() => expect(screen.getByText("Mình hiểu, lưu bản đồ")).toBeTruthy());
  fireEvent.press(screen.getByText("Mình hiểu, lưu bản đồ"));
  await waitFor(() => expect(screen.getByText("Bạn và Minh")).toBeTruthy());
  expect(m.read().people).toHaveLength(1);
  expect(m.read().people![0]).toMatchObject({ name: "Minh", relationship: "family" });
  expect(screen.getByText("Nguyên tố")).toBeTruthy();
  // Minh's birth time is unknown, so the Moon carries a note and no Moon aspect is read.
  expect(screen.getByText("Giờ sinh chưa rõ nên Mặt Trăng có thể khác.")).toBeTruthy();
  expect(screen.queryByText(/Mặt Trăng của bạn ·|· Mặt Trăng của Minh/)).toBeNull();
  // Family hides Venus–Mars, and nothing on this screen offers AI.
  expect(screen.queryByText(/Sao Kim của bạn · .* · Sao Hỏa của Minh|Sao Hỏa của bạn · .* · Sao Kim của Minh/)).toBeNull();
  expect(screen.queryByText(/AI/)).toBeNull();
  fireEvent.press(screen.getByText("Xóa lá số của Minh"));
  fireEvent.press(screen.getByText("Xác nhận xóa"));
  await waitFor(() => expect(m.read().people).toHaveLength(0));
  expect(screen.getByText(/Chưa có ai/)).toBeTruthy();
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
  await waitFor(() => expect(screen.queryByText(/Dữ liệu chiêm tinh đã lưu không hợp lệ/)).toBeNull());
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

test("Nil P1-B: a locked birth profile refuses a different own chart on save and before AI, but still calculates it", async () => {
  const m = memory();
  const requestAstrologyAi = jest.fn(async (input: AstrologyAiInvocation, correlation: AnswerCorrelation) => answerFor(input, correlation));
  const screen = render(<AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} canRequestAstrologyAi requestAstrologyAi={requestAstrologyAi} />);
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await openWheel(screen);
  fireEvent.press(screen.getByText("Lưu bản đồ trên thiết bị"));
  await waitFor(() => expect(m.read().reports).toHaveLength(1));
  const lock = m.read().birthProfileLock!;
  expect(lock.revisions).toHaveLength(0);
  expect(JSON.stringify(lock)).not.toContain("2000-01-01");
  // Simulate a profile whose correction window has closed.
  (m.storage.loadJson as jest.Mock).mockResolvedValueOnce({ ...m.read(), birthProfileLock: { ...lock, createdAt: "2026-01-01T00:00:00.000Z" } });
  screen.unmount();
  const again = render(<AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} canRequestAstrologyAi requestAstrologyAi={requestAstrologyAi} />);
  await waitFor(() => expect(again.getByText("Tạo lá số mới")).toBeTruthy());
  fireEvent.press(again.getByText("Tạo lá số mới"));
  await waitFor(() => expect(again.getByLabelText("Ngày")).toBeTruthy());
  fireEvent.changeText(again.getByLabelText("Ngày"), "02");
  fireEvent.changeText(again.getByLabelText("Tháng"), "01");
  fireEvent.changeText(again.getByLabelText("Năm"), "2000");
  fireEvent.changeText(again.getByLabelText("Giờ"), "12");
  fireEvent.changeText(again.getByLabelText("Phút"), "00");
  fireEvent.press(again.getByRole("radio", { name: "Chiều" }));
  fireEvent.changeText(again.getByLabelText("Nơi sinh"), "Hanoi");
  fireEvent.press(again.getAllByText(/^Hanoi ·/)[0]);
  fireEvent.press(again.getByText("Đây đúng là nơi sinh của tôi"));
  fireEvent.press(again.getByText("Xem bầu trời của mình"));
  await waitFor(() => expect(again.getByText("Tạo bản đồ")).toBeTruthy());
  fireEvent.press(again.getByText("Tạo bản đồ"));
  await openWheel(again);
  expect(again.getByText("Bản đồ tương tác đã sẵn sàng")).toBeTruthy();
  fireEvent.press(again.getByText("Gửi câu hỏi thử"));
  fireEvent.press(again.getByText("Đồng ý và gửi một câu hỏi"));
  await waitFor(() => expect(again.getByTestId("ai-error").props.children).toBe("Hồ sơ sinh đã được khoá để kết quả luôn nhất quán. Nếu bạn nhập nhầm, hãy liên hệ hỗ trợ"));
  expect(requestAstrologyAi).not.toHaveBeenCalled();
  const writes = (m.storage.saveJsonOrThrow as jest.Mock).mock.calls.length;
  fireEvent.press(again.getByText("Lưu bản đồ trên thiết bị"));
  // The AI panel message plus the page message from the refused save.
  await waitFor(() => expect(again.getAllByText("Hồ sơ sinh đã được khoá để kết quả luôn nhất quán. Nếu bạn nhập nhầm, hãy liên hệ hỗ trợ")).toHaveLength(2));
  expect((m.storage.saveJsonOrThrow as jest.Mock).mock.calls.length).toBe(writes);
  expect(m.read().reports).toHaveLength(1);
}, 60000); // Two full chart flows; slower than the 15 s default on CI-sized machines.

test("Nil P1-B: a replayed reading is shown with a gentle note that no turn was used", async () => {
  const m = memory();
  const requestAstrologyAi = jest.fn(async (input: AstrologyAiInvocation, correlation: AnswerCorrelation) => {
    const fresh = answerFor(input, correlation);
    return { ...fresh, replayed: true, context: { chart: input.chart, selectedFactIds: input.selectedFactIds, facts: input.facts, caveats: input.caveats } };
  });
  const screen = render(<AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} canRequestAstrologyAi requestAstrologyAi={requestAstrologyAi} />);
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await openWheel(screen);
  fireEvent.press(screen.getByText("Gửi câu hỏi thử"));
  fireEvent.press(screen.getByText("Đồng ý và gửi một câu hỏi"));
  await waitFor(() => expect(screen.getByText("Nilaza giữ nguyên diễn giải trước cho chủ đề này để kết quả luôn nhất quán — không tốn thêm lượt.")).toBeTruthy());
  expect(screen.getByText(responseFixture.headline)).toBeTruthy();
});

test("method, time zone and backup sit in one settings group on the hub (analysis AS-05)", async () => {
  const { storage } = memory();
  const screen = render(<AstrologyExperience language="vi" storage={storage} onBack={() => {}} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Tạo lá số của bạn" }).props.accessibilityState.disabled).toBe(false));
  expect(screen.queryByText("Múi giờ hiển thị")).toBeNull();
  expect(screen.queryByText("Sao lưu & riêng tư")).toBeNull();
  fireEvent.press(screen.getByText("Cài đặt & dữ liệu"));
  expect(screen.getByText("Múi giờ hiển thị")).toBeTruthy();
  expect(screen.getByText("Sao lưu & riêng tư")).toBeTruthy();
});

async function failAiWith(code: string) {
  const m = memory();
  const requestAstrologyAi = jest.fn(async () => { throw Object.assign(new Error(code), { code }); });
  const screen = render(<AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} canRequestAstrologyAi
    requestAstrologyAi={requestAstrologyAi as never} />);
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await openWheel(screen);
  await waitFor(() => expect(screen.getByText("Bản đồ tương tác đã sẵn sàng")).toBeTruthy());
  fireEvent.press(screen.getByText("Gửi câu hỏi thử"));
  fireEvent.press(screen.getByText("Đồng ý và gửi một câu hỏi"));
  await waitFor(() => expect(screen.getByTestId("ai-error")).toBeTruthy());
  return screen;
}

test("a crisis answer carries the 115 support copy and the crisis flag (UX review K5/U2)", async () => {
  const screen = await failAiWith("crisis_support");
  expect(screen.getByTestId("ai-error").props.children).toMatch(/gọi 115/);
  expect(screen.getByTestId("ai-crisis")).toBeTruthy();
});

test("maintenance says the turn was not used (UX review U4)", async () => {
  const screen = await failAiWith("route_not_ready");
  expect(screen.getByTestId("ai-error").props.children).toBe("Đọc sâu đang bảo trì, lượt của bạn chưa bị trừ. Hãy thử lại sau.");
  expect(screen.queryByTestId("ai-crisis")).toBeNull();
});

test("a guest is sent to sign-in from the deep read and the wheel, with no Premium wording (UX review K4/U1)", async () => {
  const m = memory(), onRequestSignIn = jest.fn(), requestAstrologyAi = jest.fn();
  const screen = render(<AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} canRequestAstrologyAi={false}
    aiSignInRequired onRequestSignIn={onRequestSignIn} requestAstrologyAi={requestAstrologyAi as never} />);
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await waitFor(() => expect(screen.getByText("Đăng nhập để dùng · 1 lượt/ngày")).toBeTruthy());
  expect(screen.queryByText(/Sắp ra mắt/)).toBeNull();
  fireEvent.press(screen.getByText("Đăng nhập để dùng · 1 lượt/ngày"));
  expect(onRequestSignIn).toHaveBeenCalledTimes(1);
  await openWheel(screen);
  await waitFor(() => expect(screen.getByText("Bản đồ tương tác đã sẵn sàng")).toBeTruthy());
  expect(screen.getByTestId("unlock-label").props.children).toBe("Đăng nhập để dùng · 1 lượt/ngày");
  fireEvent.press(screen.getByText("Gửi câu hỏi thử"));
  expect(onRequestSignIn).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("Đồng ý và gửi một câu hỏi")).toBeNull();
  expect(requestAstrologyAi).not.toHaveBeenCalled();
});

test("\"Đọc đầy đủ\" opens the chart on the AI guide tab; the wheel row opens the story (UX review K7/U6)", async () => {
  const m = memory();
  const requestAstrologyAi = jest.fn(async (input: AstrologyAiInvocation, correlation: AnswerCorrelation) => answerFor(input, correlation));
  const screen = render(<AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} canRequestAstrologyAi
    requestAstrologyAi={requestAstrologyAi} />);
  await fillForm(screen, "2000-01-01", "12:00", "Hanoi");
  fireEvent.press(screen.getByText("Tạo bản đồ"));
  await openWheel(screen);
  await waitFor(() => expect(screen.getByTestId("entry-tab").props.children).toBe("story"));
  fireEvent.press(screen.getByText("Gửi câu hỏi thử"));
  fireEvent.press(screen.getByText("Đồng ý và gửi một câu hỏi"));
  await waitFor(() => expect(screen.getByText(responseFixture.headline)).toBeTruthy());
  fireEvent.press(screen.getByText("Trở về Astrology"));
  await waitFor(() => expect(screen.getByText("Đọc đầy đủ")).toBeTruthy());
  fireEvent.press(screen.getByText("Đọc đầy đủ"));
  await waitFor(() => expect(screen.getByTestId("entry-tab").props.children).toBe("guide"));
});

test("Lô 2: the hub tile opens today's sky, and entering on the sky goes straight back out", async () => {
  const m = memory();
  const onWriteJournal = jest.fn();
  const screen = render(<AstrologyExperience language="vi" storage={m.storage} onBack={() => {}} onWriteJournal={onWriteJournal} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Tạo lá số của bạn" }).props.accessibilityState.disabled).toBe(false));
  fireEvent.press(screen.getByRole("button", { name: /^Bầu trời hôm nay: Trăng ở / }));
  expect(screen.getByText("7 ngày tới của Mặt Trăng")).toBeTruthy();
  fireEvent.press(screen.getByText("Viết vào Nhật ký"));
  expect(onWriteJournal).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByText("← Trở lại"));
  expect(screen.queryByText("7 ngày tới của Mặt Trăng")).toBeNull();
  expect(screen.getByRole("button", { name: "Tạo lá số của bạn" })).toBeTruthy();

  const onBack = jest.fn();
  const direct = render(<AstrologyExperience language="vi" storage={memory().storage} onBack={onBack} initialStage="sky" />);
  expect(direct.getByText("7 ngày tới của Mặt Trăng")).toBeTruthy();
  await waitFor(() => expect(direct.getByText("Thêm ngày sinh →")).toBeTruthy());
  fireEvent.press(direct.getByText("← Trở lại"));
  expect(onBack).toHaveBeenCalledTimes(1);
});
