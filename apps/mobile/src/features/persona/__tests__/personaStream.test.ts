import { buildPersonaHistory, createThrottledText, deepenPrompt } from "../personaStream";

describe("buildPersonaHistory", () => {
  const turns = (count: number, length: number, tier?: string) => Array.from({ length: count }, (_, index) => ({
    role: index % 2 === 0 ? "user" as const : "guide" as const,
    text: `${index} ${"ý".repeat(length)}`,
    uiMetadata: tier && index % 2 === 1 ? { modelTier: tier } : undefined
  }));

  it("keeps today's 8 x 800 for standard guides", () => {
    const history = buildPersonaHistory(turns(20, 3000));
    expect(history).toHaveLength(8);
    expect(history.every((item) => item.text.length <= 800)).toBe(true);
    expect(history[0].text.startsWith("12 ")).toBe(true);
  });

  it("widens to 12 x 2,500 after a knowledge-tier reply", () => {
    const history = buildPersonaHistory(turns(20, 3000, "deep_knowledge"));
    expect(history).toHaveLength(12);
    expect(history.every((item) => item.text.length <= 2500)).toBe(true);
  });

  it("drops the oldest turns first when the body would be too large", () => {
    const history = buildPersonaHistory(turns(20, 3000, "deep_knowledge"), 20000);
    expect(history.length).toBeLessThan(12);
    expect(history[history.length - 1].text.startsWith("19 ")).toBe(true);
  });
});

describe("createThrottledText", () => {
  afterEach(() => jest.useRealTimers());

  it("applies only the latest text once per interval, and cancel drops a pending update", () => {
    jest.useFakeTimers();
    const apply = jest.fn();
    const throttled = createThrottledText(apply, 80);
    throttled.push("a");
    throttled.push("ab");
    throttled.push("abc");
    expect(apply).not.toHaveBeenCalled();
    jest.advanceTimersByTime(80);
    expect(apply.mock.calls).toEqual([["abc"]]);
    throttled.push("abcd");
    throttled.cancel();
    jest.advanceTimersByTime(200);
    expect(apply).toHaveBeenCalledTimes(1);
    throttled.push("abcde");
    throttled.flush();
    expect(apply).toHaveBeenLastCalledWith("abcde");
  });
});

describe("deepenPrompt", () => {
  it("is written in the app language", () => {
    expect(deepenPrompt("vi")).toContain("đào sâu");
    expect(deepenPrompt("en")).toContain("go deeper");
  });
});
