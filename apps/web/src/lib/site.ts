export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];
// Only publish a locale after all typed public content and routes are translated.
export const languageNames: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };

export const isLocale = (value: string | undefined): value is Locale => locales.includes(value as Locale);

export const copy = {
  vi: {
    nav: { home: "Trang chủ", explore: "Tính năng", how: "Cách sử dụng", help: "Trợ giúp", safety: "An toàn & riêng tư", waitlist: "Tham gia danh sách chờ" },
    footer: "Nilaza là người bạn đồng hành AI cho chiêm nghiệm và tự khám phá — không phải dịch vụ bói toán hay tư vấn chuyên môn.",
    beta: "Đang hoàn thiện cho đợt thử nghiệm giới hạn",
    available: "Đã có trong bản thử nghiệm",
    planned: "Đang phát triển"
  },
  en: {
    nav: { home: "Home", explore: "Features", how: "How it works", help: "Help", safety: "Safety & privacy", waitlist: "Join the waitlist" },
    footer: "Nilaza is an AI companion for reflection and self-discovery — not fortune-telling or professional advice.",
    beta: "Being refined for a limited beta",
    available: "Available in the beta build",
    planned: "In development"
  }
} satisfies Record<Locale, Record<string, unknown>>;

export const featureCopy = {
  vi: [
    { slug: "oracle", title: "Nilaza Oracle", eyebrow: "Một câu hỏi. Một hướng đi sáng rõ hơn.", description: "Kể điều đang khiến bạn bối rối. Oracle giúp tách cảm xúc, giả định và bước nhỏ an toàn tiếp theo.", image: "oracle", status: "available" },
    { slug: "ai-council", title: "Người dẫn đường AI & Council", eyebrow: "Một cuộc trò chuyện riêng, hoặc nhiều góc nhìn.", description: "Trò chuyện 1-1 với người dẫn đường AI phù hợp, hoặc mời nhiều guide vào Council. Mỗi guide là một trải nghiệm AI lấy cảm hứng — không phải người thật.", image: "ai-council", status: "available" },
    { slug: "tarot", title: "Tarot phản chiếu", eyebrow: "Biểu tượng để đặt câu hỏi tốt hơn.", description: "Chọn trải bài, rút lá và nhận diễn giải giàu chiều sâu nhưng không khẳng định tương lai chắc chắn.", image: "tarot", status: "available" },
    { slug: "journal", title: "Nhật ký & insight", eyebrow: "Giữ lại điều đáng nhớ.", description: "Viết ghi chú riêng với cảm xúc của bạn, hoặc lưu insight và trải bài để xem lại trong Nhật ký.", image: "journal", status: "available" },
    { slug: "astrology", title: "Chiêm tinh cá nhân", eyebrow: "Dữ liệu được tính trước, AI diễn giải sau.", description: "Khám phá bản đồ sao cá nhân, Chart Story và 12 chương thần thoại cung hoàng đạo. Thư viện có thể đọc mà không cần nhập thông tin sinh.", image: "astrology", status: "available" }
  ],
  en: [
    { slug: "oracle", title: "Nilaza Oracle", eyebrow: "One question. A clearer next step.", description: "Share what feels tangled. Oracle helps separate feelings, assumptions, and one safe next action.", image: "oracle", status: "available" },
    { slug: "ai-council", title: "AI Guides & Council", eyebrow: "One private conversation, or several perspectives.", description: "Chat one-to-one with an AI guide that fits the moment, or invite several guides into a Council. Each guide is an inspired AI experience — not a real person.", image: "ai-council", status: "available" },
    { slug: "tarot", title: "Reflective tarot", eyebrow: "Symbols that help you ask better questions.", description: "Choose a spread, draw cards, and receive nuanced interpretation without claims of certain prediction.", image: "tarot", status: "available" },
    { slug: "journal", title: "Journal & insights", eyebrow: "Keep what is worth returning to.", description: "Write a standalone note with your mood, or save insights and readings to revisit in your Journal.", image: "journal", status: "available" },
    { slug: "astrology", title: "Personal astrology", eyebrow: "Calculated data first, AI interpretation second.", description: "Explore your calculated birth chart, Chart Story, and 12 zodiac mythology chapters. Read the library without adding birth information.", image: "astrology", status: "available" }
  ]
} as const;

export const intentions = {
  vi: [
    { slug: "clarity", label: "Mình cần sáng rõ", prompt: "Điều gì là sự thật, điều gì chỉ là giả định của mình?", response: "Hãy bắt đầu bằng một chi tiết bạn biết chắc, rồi đặt phần còn lại vào nhóm ‘cần kiểm chứng’." },
    { slug: "relationships", label: "Mình đang rối trong một mối quan hệ", prompt: "Mình đang cảm thấy gì, cần gì, và ranh giới nào cần được nói rõ?", response: "Bạn chưa cần đoán ý người kia. Hãy gọi tên cảm xúc, nhu cầu và một câu hỏi chân thành bạn có thể hỏi." },
    { slug: "next-step", label: "Mình cần một bước nhỏ", prompt: "Việc nhỏ nhất mình có thể làm hôm nay là gì?", response: "Chọn hành động mất dưới mười phút và hoàn toàn nằm trong khả năng kiểm soát của bạn." }
  ],
  en: [
    { slug: "clarity", label: "I need clarity", prompt: "What is fact, and what might be my assumption?", response: "Start with one detail you know for certain, then place everything else in a ‘needs checking’ list." },
    { slug: "relationships", label: "A relationship feels tangled", prompt: "What am I feeling, needing, and ready to name as a boundary?", response: "You do not need to guess their mind. Name the feeling, the need, and one honest question you can ask." },
    { slug: "next-step", label: "I need one small step", prompt: "What is the smallest thing I can do today?", response: "Choose an action that takes under ten minutes and remains fully within your control." }
  ]
} as const;

export const guideSpotlight = {
  vi: {
    persona: {
      name: "Guide Thấu Cảm & Kết Nối",
      role: "Một giọng nói ấm cho những cuộc trò chuyện khó.",
      prompt: "Mình nên nói gì để vừa thành thật vừa giữ được sự tinh tế?",
      reply: "Hãy bắt đầu bằng điều bạn biết chắc về cảm xúc của mình, rồi chọn một câu nói rõ nhu cầu mà không đoán thay phần của người kia."
    },
    council: {
      prompt: "Mình đang đứng giữa việc nói ra và im lặng.",
      guides: ["Thấu cảm", "Lý trí", "Nhịp tự nhiên"],
      reply: "Ba góc nhìn cùng đưa bạn về một bước nhỏ: nói điều quan trọng, giữ ranh giới, và cho phép câu trả lời đến sau."
    }
  },
  en: {
    persona: {
      name: "Communication Mentor",
      role: "A warm voice for difficult conversations.",
      prompt: "How can I be honest without losing my tact?",
      reply: "Start with what you know about your own feeling, then name the need clearly without guessing the other person's side."
    },
    council: {
      prompt: "I am caught between speaking up and staying quiet.",
      guides: ["Empathy", "Reason", "Natural pace"],
      reply: "Three lenses bring you back to one small step: say what matters, keep your boundary, and let the answer arrive later."
    }
  }
} as const;
