import { act, fireEvent, render } from "@testing-library/react-native";
import { InboxScreen } from "../features/notifications/InboxScreen";
import type { InAppNotification } from "../types";

const notification = {
  id: "n1",
  status: "unread",
  title: { vi: "Thông điệp hôm nay đã sẵn sàng", en: "Today's insight is ready" },
  body: { vi: "Mở Nilaza để đọc.", en: "Open Nilaza to read." },
  createdAt: "2026-10-31T08:00:00.000Z"
} as unknown as InAppNotification;

function setup() {
  const props = { onBack: jest.fn(), onDismiss: jest.fn(), onRestore: jest.fn(), onMarkAllRead: jest.fn(), onMarkRead: jest.fn(), onOpen: jest.fn() };
  return { props, screen: render(<InboxScreen language="vi" notifications={[notification]} {...props} />) };
}

afterEach(() => jest.useRealTimers());

test("each notification has its own labelled actions and a back button", () => {
  const { props, screen } = setup();
  fireEvent.press(screen.getByLabelText("Đánh dấu đã đọc: Thông điệp hôm nay đã sẵn sàng"));
  expect(props.onMarkRead).toHaveBeenCalledWith("n1");
  fireEvent.press(screen.getByLabelText("Quay lại"));
  expect(props.onBack).toHaveBeenCalled();
  expect(screen.getByText("Đánh dấu tất cả đã đọc")).toBeTruthy();
});

test("a dismissed notification can be restored for five seconds", () => {
  jest.useFakeTimers();
  const { props, screen } = setup();
  fireEvent.press(screen.getByLabelText("Bỏ thông báo: Thông điệp hôm nay đã sẵn sàng"));
  expect(props.onDismiss).toHaveBeenCalledWith("n1");
  fireEvent.press(screen.getByText("Hoàn tác"));
  expect(props.onRestore).toHaveBeenCalledWith("n1");
  fireEvent.press(screen.getByLabelText("Bỏ thông báo: Thông điệp hôm nay đã sẵn sàng"));
  act(() => { jest.advanceTimersByTime(5000); });
  expect(screen.queryByText("Hoàn tác")).toBeNull();
});
