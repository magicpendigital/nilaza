import { readFileSync } from "fs";
import { join } from "path";

// Developer notes once leaked into user-facing strings (payments vendor,
// staging OAuth, "local preview" share cards). Keep them out of the screens
// a closed tester or store reviewer can reach.
const screenSources = [
  "App.tsx",
  "src/auth/AuthFlow.tsx",
  "src/features/astrology/AstrologyExperience.tsx",
];

const bannedPhrases = [
  "RevenueCat",
  "OAuth",
  "share card local",
  "Local share",
  "Backend sau này",
  "backend build",
  "trước khi backend xuất",
  "Route Astrology AI",
  "Prompt Astrology AI",
  "dữ liệu review local",
  "Reset bản local",
];

describe("user-facing copy", () => {
  it.each(screenSources)("%s contains no developer-only phrases", (relativePath) => {
    const source = readFileSync(join(__dirname, "..", "..", relativePath), "utf8");
    const found = bannedPhrases.filter((phrase) => source.includes(phrase));
    expect(found).toEqual([]);
  });
});
