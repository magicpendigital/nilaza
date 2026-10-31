import type { Language } from "../../types";

export type AskTopic = "love" | "career" | "self" | "decision";

// Lowercase and strip Vietnamese tones so "Người ấy" and "nguoi ay" match the same rule.
export function foldQuestion(text: string) {
  return ` ${text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()} `;
}

// Multi-syllable phrases also match untoned typing; single syllables keep their tones,
// since "yêu"/"yếu", "thi"/"thì" and "vợ"/"vô" collapse to the same letters without them.
const topicWords: Record<AskTopic, string[]> = {
  love: ["người ấy", "anh ấy", "cô ấy", "crush", "người yêu", "ny", "yêu", "thương", "chia tay", "mối quan hệ", "bạn trai", "bạn gái", "vợ", "chồng", "hẹn hò", "tình cảm", "quay lại", "love", "relationship", "partner", "boyfriend", "girlfriend", "breakup", "dating", "ex"],
  career: ["công việc", "sếp", "đồng nghiệp", "việc làm", "nghỉ việc", "lương", "dự án", "phỏng vấn", "công ty", "sự nghiệp", "thăng chức", "khởi nghiệp", "kinh doanh", "đi học", "kỳ thi", "job", "work", "career", "boss", "interview", "project", "promotion", "business", "exam"],
  decision: ["có nên", "nên hay", "hay không nên", "lựa chọn", "quyết định", "should i", "decide", "decision", "choose", "or not"],
  self: ["bản thân", "mệt", "buồn", "lo lắng", "áp lực", "tự tin", "chữa lành", "myself", "anxious", "tired", "confidence", "healing"]
};

const toned = (text: string) => ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()} `;

// Decision wording wins over the subject ("Có nên nghỉ việc?" is a decision), then love, career, self.
export function detectTarotTopic(question: string): AskTopic | null {
  const exact = toned(question);
  const folded = foldQuestion(question);
  if (!folded.trim()) return null;
  const matches = (word: string) => exact.includes(` ${word} `) || (word.includes(" ") && folded.includes(foldQuestion(word)));
  for (const topic of ["decision", "love", "career", "self"] as AskTopic[]) {
    if (topicWords[topic].some(matches)) return topic;
  }
  return null;
}

export type AskSuggestion = { question: string; note: string };

const otherPerson = /\b(nguoi ay|anh ay|co ay|ban ay|crush|nguoi yeu cu|ny|nguoi kia|ho|he|she|they|my ex)\b/;
const mindReading = /\b(co that long|that long|co yeu|con yeu|con thuong|co thich|co nho|con nho|nghi gi|nghi sao|quay lai|love me|miss me|think of me|come back|feel about me)\b/;
const prediction = /\b(khi nao|bao gio|co duoc khong|se .+ khong|co .+ khong|lieu|co dau|thanh cong khong|will|when will|is it going to)\b/;

const reframes: Record<"mind" | "returning" | AskTopic, { vi: string; en: string }> = {
  mind: { vi: "Mình cần biết điều gì để cảm thấy an toàn trong mối quan hệ này?", en: "What do I need to know to feel safe in this relationship?" },
  returning: { vi: "Mình cần gì để thấy bình yên, dù người ấy có quay lại hay không?", en: "What do I need to feel at peace, whether or not they come back?" },
  love: { vi: "Mình muốn mối quan hệ này mang lại cảm giác gì cho mình?", en: "How do I want this relationship to feel for me?" },
  career: { vi: "Mình có thể chuẩn bị gì để tiến gần hơn tới điều mình muốn trong công việc?", en: "What can I prepare to move closer to what I want at work?" },
  decision: { vi: "Mình cần cân nhắc điều gì trước khi chọn?", en: "What do I need to weigh before I choose?" },
  self: { vi: "Điều gì đang giúp mình, và điều gì đang cản mình lúc này?", en: "What is helping me, and what is holding me back right now?" }
};

const notes = {
  mind: { vi: "Tarot không đọc được suy nghĩ của người khác, nhưng có thể giúp bạn nhìn rõ điều mình cần.", en: "Tarot can't read another person's mind, but it can help you see what you need." },
  prediction: { vi: "Tarot không dự đoán chắc chắn. Một câu hỏi mở giúp bạn thấy rõ lựa chọn của mình.", en: "Tarot doesn't predict for certain. An open question helps you see your own choices." }
};

// Local reframing for questions that ask the cards to read someone's mind or fix the future.
export function suggestTarotQuestion(question: string, topic: AskTopic, language: Language): AskSuggestion | null {
  const folded = foldQuestion(question);
  if (folded.trim().length < 6) return null;
  const locale = language === "vi" ? "vi" : "en";
  if (otherPerson.test(folded) && mindReading.test(folded)) {
    const key = /\b(quay lai|come back)\b/.test(folded) ? "returning" : "mind";
    return { question: reframes[key][locale], note: notes.mind[locale] };
  }
  if (prediction.test(folded)) return { question: reframes[topic][locale], note: notes.prediction[locale] };
  return null;
}
