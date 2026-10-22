import { act, renderHook } from "@testing-library/react-native";
import { useFontReadiness } from "../useFontReadiness";

afterEach(() => jest.useRealTimers());
it("releases a stalled font load while allowing a later successful load", () => {
  jest.useFakeTimers();
  const { result, rerender } = renderHook(({ loaded, error }) => useFontReadiness(loaded, error), { initialProps: { loaded: false, error: null as Error | null } });
  expect(result.current).toBe(false);
  act(() => jest.advanceTimersByTime(4000));
  expect(result.current).toBe(true);
  rerender({ loaded: true, error: null });
  expect(result.current).toBe(true);
});
it("opens immediately on an explicit font failure", () => {
  const { result } = renderHook(() => useFontReadiness(false, new Error("asset unavailable")));
  expect(result.current).toBe(true);
});
