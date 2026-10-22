import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { playTarotRevealHaptic } from "../interactions";

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("expo-haptics", () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Light: "light" } }));

describe("Tarot reveal haptic", () => {
  beforeEach(() => jest.clearAllMocks());
  it.each(["ios", "android"])("plays one light impact on %s", async os => {
    (Platform as { OS: string }).OS = os;
    await playTarotRevealHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });
  it("does not vibrate the QA web browser", async () => {
    (Platform as { OS: string }).OS = "web";
    await playTarotRevealHaptic();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
  it("tolerates unavailable hardware", async () => {
    (Platform as { OS: string }).OS = "ios";
    jest.mocked(Haptics.impactAsync).mockRejectedValueOnce(new Error("unavailable"));
    await expect(playTarotRevealHaptic()).resolves.toBeUndefined();
  });
});
