import { resolveAdaptiveLayout } from "../responsive";

describe("resolveAdaptiveLayout", () => {
  it.each([
    [320, 568, "phone", "portrait", "bottom", "compact", 16],
    [390, 884, "phone", "portrait", "bottom", "compact", 20],
    [844, 390, "phone", "landscape", "bottom", "medium", 32],
    [768, 1024, "tablet", "portrait", "bottom", "medium", 32],
    [820, 1180, "tablet", "portrait", "bottom", "medium", 32],
    [1024, 768, "tablet", "landscape", "rail", "expanded", 40],
    [1366, 1024, "tablet", "landscape", "rail", "expanded", 40]
  ] as const)(
    "%ix%i resolves to %s/%s with %s navigation",
    (width, height, deviceClass, orientation, navMode, layoutMode, gutter) => {
      expect(resolveAdaptiveLayout(width, height)).toEqual(expect.objectContaining({
        deviceClass,
        orientation,
        navMode,
        layoutMode,
        gutter
      }));
    }
  );

  it("treats a narrow tablet split view as a compact viewport", () => {
    const layout = resolveAdaptiveLayout(500, 1024);
    expect(layout.deviceClass).toBe("phone");
    expect(layout.navMode).toBe("bottom");
    expect(layout.columns).toBe(1);
  });

  it("uses compact-height spacing without changing touch target policy", () => {
    expect(resolveAdaptiveLayout(844, 390).isCompactHeight).toBe(true);
    expect(resolveAdaptiveLayout(390, 884).isCompactHeight).toBe(false);
  });
});
