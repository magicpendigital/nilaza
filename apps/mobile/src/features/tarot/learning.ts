import depth from "../../../../../packages/content/data/tarot-learning-depth.json";
import type { Language } from "../../types";

export const tarotLearningContentVersion = depth.version;
const labels = {
  symbolLens: { vi: "Đọc biểu tượng", en: "Reading the symbols" },
  upright: { vi: "Hiểu sâu khi xuôi", en: "Upright in context" },
  reversed: { vi: "Hiểu sâu khi ngược", en: "Reversed in context" },
  example: { vi: "Một ví dụ đời thường", en: "An everyday example" },
  misreading: { vi: "Tránh hiểu nhầm", en: "Avoiding a misreading" },
  practice: { vi: "Thử phản chiếu", en: "Try a reflection" },
};
export function getTarotLearningSections(cardId: string, language: Language) {
  const card = depth.cards[cardId as keyof typeof depth.cards];
  if (!card) return [];
  const locale = language === "vi" ? "vi" : "en";
  return (Object.keys(labels) as Array<keyof typeof labels>).map(key => ({
    id: key, title: labels[key][locale], body: card[key][locale],
    notes: key === "symbolLens" ? [depth.symbolNote[locale]] : undefined,
  }));
}

export const tarotQuestionExamples = {
  love: { vi: ["Tôi muốn hiểu nhu cầu nào của mình trong mối quan hệ này?", "Ranh giới nào tôi muốn nói rõ hơn?"], en: ["Which of my needs do I want to understand in this relationship?", "Which boundary would I like to express more clearly?"] },
  career: { vi: ["Tôi muốn rèn kỹ năng nào cho bước tiếp theo?", "Điều gì giúp tôi chọn ưu tiên công việc vừa sức?"], en: ["Which skill do I want to develop for my next step?", "What could help me choose a manageable work priority?"] },
  self: { vi: ["Điều gì trong mình đang cần được lắng nghe hôm nay?", "Một thói quen nào tôi muốn quan sát lại?"], en: ["What part of me needs attention today?", "Which habit would I like to look at again?"] },
  decision: { vi: ["Tôi muốn làm rõ giá trị nào trước lựa chọn này?", "Điều gì cần được tìm hiểu thêm trước bước tiếp theo?"], en: ["Which value do I want to clarify before this choice?", "What would I like to learn before my next step?"] },
  open: { vi: ["Tôi muốn nhìn tình huống này từ góc nào khác?", "Một bước nhỏ nào phù hợp với tôi hôm nay?"], en: ["What other perspective could I bring to this situation?", "Which small step could fit me today?"] },
};
