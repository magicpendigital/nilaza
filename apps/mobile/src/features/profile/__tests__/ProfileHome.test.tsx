import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ProfileHome, type ProfileHomeProps } from "../ProfileHome";
import { DeleteAccountPanel } from "../DeleteAccountPanel";
import { normalizeDailyReminder, reminderTimeLabel } from "../dailyReminder";

function renderProfile(overrides: Partial<ProfileHomeProps> = {}) {
  const props: ProfileHomeProps = {
    language: "vi",
    name: "Linh",
    signLabel: "Song Ngư",
    memberSince: "27/10/2026",
    stats: { streak: 3, journal: 12, readings: 4 },
    goals: "Tình yêu, Hiểu bản thân",
    tone: "Dịu dàng",
    birth: "2000-03-15",
    languageLabel: "Tiếng Việt",
    reminder: { enabled: false, hour: 8, minute: 0 },
    onReminderChange: jest.fn(),
    onEdit: jest.fn(),
    onPreferences: jest.fn(),
    onBirth: jest.fn(),
    onNotifications: jest.fn(),
    onPrivacy: jest.fn(),
    onUsage: jest.fn(),
    onAccount: jest.fn(),
    onHelp: jest.fn(),
    onLegal: jest.fn(),
    onSignOut: jest.fn(),
    version: "0.1.3",
    ...overrides
  };
  return { props, screen: render(<ProfileHome {...props} />) };
}

test("the profile follows the design and hides account deletion until it is available", () => {
  const { props, screen } = renderProfile();
  expect(screen.getByText("Tôi")).toBeTruthy();
  expect(screen.getByText("Song Ngư · bạn đồng hành từ 27/10/2026")).toBeTruthy();
  expect(screen.getByLabelText("12 mục Nhật ký")).toBeTruthy();
  expect(screen.getByText("Mỗi ngày lúc 08:00")).toBeTruthy();
  expect(screen.queryByText("Xóa tài khoản")).toBeNull();
  expect(screen.getByText("Nilaza 0.1.3 · Nội dung để giải trí và tự phản chiếu")).toBeTruthy();
  fireEvent.press(screen.getByText("Ngày sinh, tên & bản đồ"));
  expect(props.onBirth).toHaveBeenCalled();
  fireEvent.press(screen.getByText("Điều khoản & Quyền riêng tư"));
  expect(props.onLegal).toHaveBeenCalled();
});

test("the name card opens Tôi là ai only when the screen provides it", () => {
  expect(renderProfile().screen.queryByText("Tôi là ai ›")).toBeNull();
  const onWhoAmI = jest.fn();
  const { screen } = renderProfile({ onWhoAmI });
  fireEvent.press(screen.getByLabelText("Linh, mở Tôi là ai"));
  expect(onWhoAmI).toHaveBeenCalled();
});

test("choosing a reminder time turns the reminder on", () => {
  const { props, screen } = renderProfile();
  fireEvent.press(screen.getByText("Nhắc lá bài hôm nay"));
  fireEvent.press(screen.getByText("21:00"));
  expect(props.onReminderChange).toHaveBeenCalledWith({ enabled: true, hour: 21, minute: 0 });
  const withDelete = renderProfile({ onDeleteAccount: jest.fn() });
  expect(withDelete.screen.getByText("Xóa tài khoản")).toBeTruthy();
});

test("reminder settings are normalised", () => {
  expect(normalizeDailyReminder({ enabled: true, hour: 7, minute: 30 })).toEqual({ enabled: true, hour: 7, minute: 30 });
  expect(normalizeDailyReminder({ enabled: "yes", hour: 99 })).toEqual({ enabled: false, hour: 8, minute: 0 });
  expect(normalizeDailyReminder(null)).toEqual({ enabled: false, hour: 8, minute: 0 });
  expect(reminderTimeLabel({ hour: 7, minute: 5 })).toBe("07:05");
});

test("account deletion needs the typed phrase and reports failures", async () => {
  const onDelete = jest.fn().mockResolvedValue("Chưa xóa được tài khoản.");
  const screen = render(<DeleteAccountPanel language="vi" onDelete={onDelete} />);
  fireEvent.press(screen.getByText("Xóa vĩnh viễn"));
  expect(onDelete).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText("Gõ XÓA để xác nhận"), "xóa");
  fireEvent.press(screen.getByText("Xóa vĩnh viễn"));
  await waitFor(() => expect(screen.getByText("Chưa xóa được tài khoản.")).toBeTruthy());
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test("a new account sees an invitation instead of zero counters", () => {
  const { screen } = renderProfile({ stats: { streak: 0, journal: 0, readings: 0 } });
  expect(screen.getByText("Hành trình của bạn bắt đầu từ đây")).toBeTruthy();
  expect(screen.queryByLabelText("0 mục Nhật ký")).toBeNull();
  const started = renderProfile({ stats: { streak: 0, journal: 1, readings: 0 } });
  expect(started.screen.getByLabelText("1 mục Nhật ký")).toBeTruthy();
  expect(started.screen.queryByText("Hành trình của bạn bắt đầu từ đây")).toBeNull();
});

test("Lô 1: the plan row shows only with a plan, and today's energy opens usage", () => {
  const { props, screen } = renderProfile();
  expect(screen.queryByText("Gói của bạn")).toBeNull();
  fireEvent.press(screen.getByText("Năng lượng hôm nay"));
  expect(props.onUsage).toHaveBeenCalledTimes(1);
  const withPlan = renderProfile({ plan: "Premium" });
  expect(withPlan.screen.getByText("Gói của bạn")).toBeTruthy();
  fireEvent.press(withPlan.screen.getByText("Premium"));
  expect(withPlan.props.onUsage).toHaveBeenCalledTimes(1);
});
