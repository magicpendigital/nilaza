import type { AstrologyChartSelection, AstrologyChartSelectionModel } from "./chartSelection";
import { localizeAstrologyBody, localizeAstrologySign } from "./contracts";
import { aspectName, aspectMeaning, houseMeaning } from "./AstrologyGlossary";

const themes: Record<string, [string, string]> = {
  sun: ["hướng sống và cách thể hiện bản thân", "direction and self-expression"],
  moon: ["nhu cầu cảm xúc và sự chăm sóc", "emotional needs and care"],
  mercury: ["cách học hỏi và trao đổi", "learning and communication"],
  venus: ["điều trân trọng và cách trao nhận", "values and giving and receiving"],
  mars: ["hành động và ranh giới", "action and boundaries"],
  jupiter: ["khám phá và tìm ý nghĩa", "exploration and meaning"],
  saturn: ["trách nhiệm và giới hạn", "responsibility and limits"],
  uranus: ["tự chủ và đổi mới", "autonomy and change"],
  neptune: ["tưởng tượng và lý tưởng", "imagination and ideals"],
  pluto: ["thay đổi dài hạn và quyền chủ động", "long-term change and agency"],
  ascendant: ["cách bước vào hoàn cảnh mới", "entering new situations"],
  midheaven: ["đóng góp và điều muốn được ghi nhận", "contribution and recognition"],
};
const expressions: Record<string, [string, string]> = {
  aries: ["thử bắt đầu trực tiếp, rồi kiểm tra nhịp của mình", "starting directly, then checking your pace"],
  taurus: ["xây sự ổn định bằng trải nghiệm cụ thể và thời gian", "building steadiness through concrete experience and time"],
  gemini: ["khám phá nhiều câu hỏi và trao đổi các góc nhìn", "exploring questions and exchanging perspectives"],
  cancer: ["chú ý cảm giác thuộc về và điều tạo sự an tâm", "noticing belonging and what brings reassurance"],
  leo: ["thử biểu đạt điều quan trọng với mình một cách cởi mở", "openly expressing what matters to you"],
  virgo: ["quan sát chi tiết và điều chỉnh từng bước có ích", "noticing details and making useful small adjustments"],
  libra: ["cân nhắc nhiều phía và tìm cách trao đổi công bằng", "considering different sides and fair exchange"],
  scorpio: ["quan sát điều sâu kín cùng ranh giới tin cậy", "noticing private concerns and boundaries of trust"],
  sagittarius: ["mở rộng góc nhìn và kiểm nghiệm điều mình tin", "broadening perspective and testing beliefs"],
  capricorn: ["chọn ưu tiên bền vững và tiến từng bước thực tế", "choosing sustainable priorities and practical steps"],
  aquarius: ["thử góc nhìn độc lập trong mối liên hệ với cộng đồng", "trying an independent perspective in a community"],
  pisces: ["lắng nghe tưởng tượng và cảm xúc với giới hạn rõ", "listening to imagination and feeling with clear limits"],
};

export function buildAstrologyGuidePrompts(selected: AstrologyChartSelection, language: "vi" | "en") {
  const vi = language === "vi";
  if (selected.kind === "body") {
    const label = localizeAstrologyBody(selected.bodyId, language);
    const sign = localizeAstrologySign(selected.sign, language);
    const theme = themes[selected.bodyId]?.[vi ? 0 : 1] ?? label;
    return vi ? [`${label} ở ${sign} gợi tôi quan sát ${theme} như thế nào?`,
      `Với ${label} ở ${sign}, tôi có thể thử một bước nhỏ nào về ${theme}?`]
      : [`What might my ${label} in ${sign} invite me to notice about ${theme}?`,
        `With ${label} in ${sign}, what small step could I try around ${theme}?`];
  }
  if (selected.kind === "aspect") {
    const pair = `${localizeAstrologyBody(selected.bodyA, language)} ${vi ? "và" : "and"} ${localizeAstrologyBody(selected.bodyB, language)}`;
    const name = aspectName(selected.aspectType, language);
    return vi ? [`Góc ${name} giữa ${pair} gợi tôi phối hợp hai nhu cầu ra sao?`, `Với góc ${name} giữa ${pair}, một thử nghiệm nhỏ nào giúp tôi lắng nghe cả hai?`]
      : [`How could I work with both themes in the ${name} between ${pair}?`, `What small experiment could help me listen to both themes in the ${name} between ${pair}?`];
  }
  const sign = localizeAstrologySign(selected.sign, language);
  return selected.kind === "house"
    ? vi ? [`Nhà ${selected.house} ở ${sign} gợi tôi chú ý điều gì?`, `Tôi có thể thử bước nhỏ nào trong chủ đề Nhà ${selected.house} ở ${sign}?`]
      : [`What might House ${selected.house} in ${sign} invite me to notice?`, `What small step could I try around House ${selected.house} in ${sign}?`]
    : vi ? [`Biểu tượng ${sign} gợi tôi suy ngẫm điều gì?`, `Tôi có thể dùng lăng kính ${sign} để quan sát một tình huống cụ thể ra sao?`]
      : [`What could the symbol of ${sign} invite me to reflect on?`, `How could I use the ${sign} lens to reflect on a specific situation?`];
}

export function buildAstrologyPlacementReflection(selected: AstrologyChartSelection, model: AstrologyChartSelectionModel, language: "vi" | "en") {
  const vi = language === "vi";
  if (selected.kind === "aspect") return aspectMeaning(selected.aspectType, language);
  if (selected.kind === "body") {
    const label = localizeAstrologyBody(selected.bodyId, language);
    const sign = localizeAstrologySign(selected.sign, language);
    const theme = themes[selected.bodyId]?.[vi ? 0 : 1] ?? label;
    const style = expressions[selected.sign]?.[vi ? 0 : 1] ?? sign;
    const house = selected.sourceKind === "placement" && model.anglesAndHousesAvailable
      ? model.houses.find(item => item.sign === selected.sign) : undefined;
    return vi
      ? `${label} gợi chủ đề ${theme}; ${sign} thêm lăng kính ${style}.${house ? ` Trong hệ Whole Sign của bản đồ này, vị trí thuộc Nhà ${house.house}: ${houseMeaning(house.house, language).toLowerCase()}.` : " Chưa gán lĩnh vực nhà cho vị trí này."} Hãy chọn một tình huống gần đây và kiểm xem cách đọc này có phù hợp với trải nghiệm của bạn không. Đây là gợi ý biểu tượng, không phải đặc điểm bắt buộc.`
      : `${label} represents ${theme}; ${sign} adds a lens of ${style}.${house ? ` In this chart's Whole Sign system, the placement falls in House ${house.house}: ${houseMeaning(house.house, language).toLowerCase()}.` : " No house area is assigned to this position here."} Choose a recent situation and check whether this reading fits your experience. It is a symbolic invitation, not a required trait.`;
  }
  if (selected.kind === "house") return vi
    ? `Nhà ${selected.house} gợi lĩnh vực ${houseMeaning(selected.house, language).toLowerCase()}. Cung ${localizeAstrologySign(selected.sign, language)} ở đỉnh nhà thêm lăng kính ${expressions[selected.sign]?.[0]}. Chọn một việc trong lĩnh vực này để thử cách tiếp cận ấy; không coi nó là lời dự báo.`
    : `House ${selected.house} represents ${houseMeaning(selected.house, language).toLowerCase()}. ${localizeAstrologySign(selected.sign, language)} at its cusp adds a lens of ${expressions[selected.sign]?.[1]}. Choose one situation in this area to try that approach; treat it as reflection rather than a prediction.`;
  return "";
}
