import { readFileSync } from "fs";
import { join } from "path";

// Developer notes once leaked into user-facing strings (payments vendor,
// staging OAuth, "local preview" share cards). Keep them out of the screens
// a closed tester or store reviewer can reach.
const screenSources = [
  "App.tsx",
  "src/auth/AuthFlow.tsx",
  "src/features/astrology/AstrologyExperience.tsx",
  "src/features/council/useAiCouncilRoom.ts",
  "src/features/astrology/AstrologyChartStory.tsx",
  "src/features/astrology/AstrologyAiGuidePanel.tsx",
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
  // Vietnamese screens mixing English words (analysis TA-10, JO-07, CH-14/15).
  "Guide đang lắng nghe",
  "Chưa tạo được reading",
  "Chọn guide",
  "Guide gợi ý",
  "review safety",
  "chọn prompt ngắn",
  "Một AI companion",
  "Các guide cùng",
  "Mỗi guide sẽ",
  "cho Astrology AI",
  "Reading dùng để",
  "vào Journal",
  "lượt Astrology AI",
  "Xóa Journal",
  "tới AI provider",
  "Bản đọc Astrology",
  "daily insight mỗi ngày",
  "Oracle insight để lưu",
  "Insight này đã",
  "Các insight và",
  "từ insight này",
  "Guide đọc trải bài",
  "đổi guide để"
];

describe("user-facing copy", () => {
  it.each(screenSources)("%s contains no developer-only phrases", (relativePath) => {
    const source = readFileSync(join(__dirname, "..", "..", relativePath), "utf8");
    const found = bannedPhrases.filter((phrase) => source.includes(phrase));
    expect(found).toEqual([]);
  });
});
