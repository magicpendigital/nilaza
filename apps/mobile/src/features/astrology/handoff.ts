import type { ChatHandoffContext } from "../../types";
import type { SavedChart } from "./persistence";
import chapters from "../../../../../packages/content/data/astrology-mythology-chapters.json";
import { localizeAstrologyBody } from "./contracts";
export function buildSafeAstrologyContext(
  report: SavedChart,
  language: string,
): ChatHandoffContext {
  const vi = language === "vi";
  const keyFacts = report.chart.placements.filter((p) =>
    ["sun", "moon"].includes(p.body),
  );
  const rising = report.chart.angles.find((p) => p.body === "ascendant");
  const sections = [...keyFacts, ...(rising ? [rising] : [])].map((p) => {
    const chapter = chapters.chapters.find((c) => c.id === p.sign)!;
    return {
      title: `${localizeAstrologyBody(p.body, vi ? "vi" : "en")} · ${vi ? chapter.name.vi : chapter.name.en}`,
      body: vi ? chapter.question.vi : chapter.question.en,
    };
  });
  const caveat = vi
    ? "Các vị trí do bộ tính local cung cấp; dùng để suy ngẫm, không dự đoán. Không tự bổ sung góc, nhà hoặc vị trí chưa được cung cấp."
    : "Positions come from the local calculator; use them for reflection, not prediction. Do not invent absent angles, houses or placements.";
  return {
    sourceType: "astrology_report",
    sourceId: report.id,
    sourceLabel: vi ? "Bản đồ sao cá nhân" : "Personal birth chart",
    safeSummary: sections.length
      ? sections.map((s) => `${s.title}: ${s.body}`).join("\n")
      : vi
        ? "Chưa rõ giờ sinh. Không có vị trí điểm chính xác; chỉ trò chuyện về chủ đề người dùng chọn."
        : "Birth time is uncertain. No exact point placements are supplied; discuss only the user's chosen theme.",
    astrology: {
      focus: vi ? "Tự khám phá" : "Self-discovery",
      birthTimeKnown: report.input.precision === "exact",
      calculationStatus: "partial_local",
      provider: "astronomy-engine",
      sunSign: keyFacts.find((p) => p.body === "sun")?.sign,
      moonSign: keyFacts.find((p) => p.body === "moon")?.sign,
      risingSign: rising?.sign,
      caveats: [caveat],
      sections,
    },
  };
}
