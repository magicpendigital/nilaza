import type { Locale } from "./site";
export const featureWorkflows = {
  "vi": {
    "ai-council": ["Chọn trò chuyện 1–1 với một guide hoặc mở phiên Council.", "Các guide AI lấy cảm hứng từ nguyên mẫu, nhân vật hoặc chủ đề; không đại diện cho người thật.", "So sánh góc nhìn, tiếp tục hỏi sâu hoặc lưu insight hữu ích vào Nhật ký."],
    "oracle": [
      "Mở Oracle từ Trang chủ hoặc Khám phá và chia sẻ điều bạn muốn soi chiếu.",
      "Oracle giúp làm rõ câu hỏi và có thể gợi ý mở Tarot, một guide, Council hoặc Astrology phù hợp.",
      "Bạn chọn hành động tiếp theo; lưu insight hữu ích khi có hành động lưu."
    ],
    "tarot": [
      "Đặt ý định, chọn độ sâu trải bài và bộ bài phù hợp.",
      "Rút từng lá, xem biểu tượng cùng nghĩa xuôi/ngược, rồi đọc tổng hợp trải bài.",
      "Lưu trải bài vào Nhật ký hoặc tiếp tục hỏi sâu. Diễn giải không phải lời tiên đoán chắc chắn."
    ],
    "journal": [
      "Mở tab Nhật ký, chọn Viết ghi chú; nhập nội dung, có thể thêm tiêu đề và cảm xúc.",
      "Lưu ghi chú hoặc xem lại insight, trò chuyện và trải bài đã lưu; kiểm tra trạng thái lưu và thử lại khi báo lỗi.",
      "Tìm lại những mục đáng nhớ. Phạm vi lưu trên thiết bị và đồng bộ phụ thuộc bản ứng dụng."
    ],
    "astrology": [
      "Từ Khám phá → Astrology, đọc 12 cung hoặc thư viện thần thoại mà không cần thông tin sinh.",
      "Nếu muốn bản đồ cá nhân, tự nguyện nhập thông tin sinh; xem độ chính xác và phần chưa chắc chắn khi không biết giờ sinh.",
      "Khám phá các vị trí đã tính qua Chart Story và lưu bản đồ trên thiết bị. Diễn giải AI và đồng bộ có điều kiện riêng trong bản đang dùng."
    ]
  },
  "en": {
    "ai-council": ["Choose a one-to-one guide chat or open a Council session.", "AI guides are inspired by archetypes, figures, or themes; they do not represent real people.", "Compare perspectives, ask a deeper question, or save a useful insight to your Journal."],
    "oracle": [
      "Open Oracle from Home or Explore and share what you want to reflect on.",
      "Oracle helps clarify your question and may suggest tarot, a guide, Council, or Astrology.",
      "Choose your next action; keep useful insights when a save action is available."
    ],
    "tarot": [
      "Set an intention, choose the depth of your spread and a deck that fits.",
      "Draw cards one at a time, explore their symbols and upright/reversed meanings, then read the spread summary.",
      "Save the reading to your Journal or ask a deeper question. Interpretation is not a certain prediction."
    ],
    "journal": [
      "Open Journal and choose Write a note; add your text, with an optional title and mood.",
      "Save your note or revisit saved insights, conversations, and readings; check the save status and retry if an error appears.",
      "Return to what matters. Local storage and sync depend on the app build you use."
    ],
    "astrology": [
      "From Explore → Astrology, read the 12 signs or mythology library without birth information.",
      "For a personal chart, choose to add birth details; review accuracy and uncertainty if your birth time is unknown.",
      "Explore calculated placements through Chart Story and save charts on your device. AI interpretation and sync have separate conditions in your current build."
    ]
  }
} as const satisfies Record<Locale, Record<string, readonly string[]>>;
