import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { GuestPreview } from "../GuestPreview";

const cards = [
  { id: "major-00-fool", group: "major" as const, name: "Chàng Khờ", sub: "0 · The Fool", image: { uri: "fool.png" }, learned: false },
  { id: "cups-01", group: "cups" as const, name: "Át Cốc", sub: "Ace of Cups", image: { uri: "cups.png" }, learned: false }
];

function renderPreview(overrides: Partial<Parameters<typeof GuestPreview>[0]> = {}) {
  const props = {
    language: "vi" as const,
    deckName: "Vườn Trăng",
    cards,
    renderCard: (id: string) => <Text>{`Ý nghĩa ${id}`}</Text>,
    signs: [{ id: "aries", name: "Bạch Dương" }, { id: "taurus", name: "Kim Ngưu" }],
    renderSign: (id: string) => <Text>{`Cung ${id}`}</Text>,
    onCreateAccount: jest.fn(),
    onSignIn: jest.fn(),
    onExit: jest.fn(),
    ...overrides
  };
  return { props, screen: render(<GuestPreview {...props} />) };
}

test("guests open a card meaning and a sign guide, then go back", () => {
  const { props, screen } = renderPreview();
  fireEvent.press(screen.getByText("Chàng Khờ"));
  expect(screen.getByText("Ý nghĩa major-00-fool")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Quay lại"));
  expect(screen.queryByText("Ý nghĩa major-00-fool")).toBeNull();
  fireEvent.press(screen.getByText("12 cung"));
  fireEvent.press(screen.getByText("Kim Ngưu"));
  expect(screen.getByText("Cung taurus")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Quay lại"));
  fireEvent.press(screen.getByLabelText("Quay lại"));
  expect(props.onExit).toHaveBeenCalledTimes(1);
});

test("the dock invites to create an account or sign in", () => {
  const { props, screen } = renderPreview();
  fireEvent.press(screen.getByText("Tạo tài khoản"));
  fireEvent.press(screen.getByText("Đăng nhập"));
  expect(props.onCreateAccount).toHaveBeenCalled();
  expect(props.onSignIn).toHaveBeenCalled();
});
