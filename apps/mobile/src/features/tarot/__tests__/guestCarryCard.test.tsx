import { fireEvent, render } from "@testing-library/react-native";
import { GuestCarryCard } from "../GuestCarryCard";

describe("Home card for the card drawn before sign-in", () => {
  it("names the card and opens its reading when pressed", () => {
    const onPress = jest.fn();
    const screen = render(<GuestCarryCard language="vi" cardName="Tình Nhân" image={{ uri: "lovers.png" }} reversed={false} busy={false} onPress={onPress} />);
    expect(screen.getByText("Tình Nhân")).toBeTruthy();
    expect(screen.getByText("Mở bài đọc đúng lá này →")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: /Lá bạn đã rút khi chưa đăng nhập: Tình Nhân/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not fire twice while it is opening, and speaks English", () => {
    const onPress = jest.fn();
    const busy = render(<GuestCarryCard language="vi" cardName="Tình Nhân" image={{ uri: "x.png" }} reversed busy onPress={onPress} />);
    expect(busy.getByText("Đang mở bài đọc...")).toBeTruthy();
    fireEvent.press(busy.getByText("Tình Nhân"));
    expect(onPress).not.toHaveBeenCalled();
    const en = render(<GuestCarryCard language="en" cardName="The Lovers" image={{ uri: "x.png" }} reversed={false} busy={false} onPress={onPress} />);
    expect(en.getByText("A CARD IS WAITING")).toBeTruthy();
    expect(en.getByText("Open the reading of this very card →")).toBeTruthy();
  });
});
