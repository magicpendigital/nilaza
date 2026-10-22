import {
  getAstrologyAspectEmphasis,
  getAstrologyAspectLineMetrics,
  getAstrologyAspectLineStyle,
  resolveFocusedBodies,
} from "../chartVisuals";

const facts = [{ id: "sun" }, { id: "moon" }, { id: "venus" }];
const moonVenus = { bodyA: "moon", bodyB: "venus" };

describe("astrology chart visual hierarchy", () => {
  it("resolves prefixed chart-selection IDs to the matching body", () => {
    expect(resolveFocusedBodies("body:moon", facts)).toEqual(["moon"]);
  });

  it("highlights both endpoints when an aspect is selected", () => {
    expect(
      resolveFocusedBodies("aspect.moon_venus.sextile", facts, moonVenus),
    ).toEqual(["moon", "venus"]);
  });

  it("emphasizes only the selected aspect and direct links to a focused body", () => {
    expect(
      getAstrologyAspectEmphasis(moonVenus, "body:moon", "moon", false),
    ).toBe("related");
    expect(
      getAstrologyAspectEmphasis(moonVenus, "aspect.moon_venus.sextile", undefined, true),
    ).toBe("selected");
    expect(
      getAstrologyAspectEmphasis(moonVenus, "body:sun", "sun", false),
    ).toBe("quiet");
    expect(getAstrologyAspectEmphasis(moonVenus, null, undefined, false)).toBe(
      "ambient",
    );
  });

  it("uses distinct color/pattern pairs and a clear selected-to-quiet contrast", () => {
    const styles = ["conjunction", "sextile", "square", "trine", "opposition"].map(
      getAstrologyAspectLineStyle,
    );
    expect(new Set(styles.map((style) => `${style.color}:${style.dashArray ?? "solid"}`)).size).toBe(5);
    expect(getAstrologyAspectLineMetrics("selected").opacity).toBeGreaterThan(
      getAstrologyAspectLineMetrics("quiet").opacity,
    );
    expect(getAstrologyAspectLineMetrics("selected").width).toBeGreaterThan(
      getAstrologyAspectLineMetrics("quiet").width,
    );
  });
});
