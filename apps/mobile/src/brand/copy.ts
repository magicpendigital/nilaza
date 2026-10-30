import identity from "../../../../packages/content/data/brand-identity.json";
import type { Language } from "../types";

const shared = {
  vi: { ...identity.copy.vi, createAccount: "Tạo tài khoản", signIn: "Đăng nhập", goalsTitle: "Bạn muốn lắng nghe điều gì?", goalsHint: "Chọn 1–3 điều bạn quan tâm, hoặc bỏ qua. Bạn có thể thay đổi trong Hồ sơ.", continue: "Tiếp tục", skip: "Bỏ qua lúc này", saving: "Đang lưu…", saveError: "Chưa lưu được lựa chọn. Vui lòng thử lại.", missingGoals: "Chọn từ 1 đến 3 mục, hoặc bỏ qua.", close: "Đóng", recent: "Gần đây", empty: "Những điều bạn lưu sẽ xuất hiện ở đây.", today: "Dành một phút cho chính mình.", reflection: "Phút phản chiếu", breath: "Thở chậm ba nhịp.", more: "Khám phá thêm", currentMood: "Bạn đang cảm thấy thế nào?",
    todayCard: "Lá bài hôm nay", todayCardTitle: "Một lá cho riêng bạn", todayCardHint: "Lật trong 10 giây, mang theo cả ngày.", revealToday: "Lật lá hôm nay", revisitToday: "Xem lại lá hôm nay", todayCardRevealedHint: "Lá của bạn vẫn ở đây cả ngày.", streakDays: "Chuỗi {n} ngày",
    skyToday: "Bầu trời hôm nay", yourSky: "Bầu trời của bạn", signToday: "{sign} · hôm nay", addBirthDate: "Thêm ngày sinh để nhận lời nhắn theo cung mỗi ngày.", openSky: "Xem bầu trời của bạn",
    askLabel: "Hỏi Nilaza", askPlaceholder: "Điều gì đang ở trong lòng bạn?", askSend: "Mở trò chuyện với câu hỏi này", forYou: "Dành cho bạn",
    yourMessage: "Thông điệp cho bạn", smallStep: "Việc nhỏ hôm nay", guidance: "Dẫn hướng hôm nay", anotherGuidance: "Gợi ý khác", saveToday: "Lưu vào Nhật ký", savedToday: "Đã lưu", askDeeper: "Hỏi sâu hơn", share: "Chia sẻ",
    changeTopic: "Đổi chủ đề", continueReading: "Đọc tiếp", subtitleMorning: "Một phút cho riêng mình trước khi bắt đầu ngày.", subtitleDay: "Dừng lại một chút giữa ngày.", subtitleEvening: "Ba phút cho riêng mình trước khi ngủ." },
  en: { ...identity.copy.en, createAccount: "Create account", signIn: "Log in", goalsTitle: "What would you like to explore?", goalsHint: "Choose 1–3 interests, or skip. You can change these in Profile.", continue: "Continue", skip: "Skip for now", saving: "Saving…", saveError: "Your choices could not be saved. Please try again.", missingGoals: "Choose 1–3 interests, or skip.", close: "Close", recent: "Recent", empty: "Your saved insights will appear here.", today: "Take a moment for yourself.", reflection: "Your reflection", breath: "Take three slow breaths.", more: "Explore more", currentMood: "How are you feeling?",
    todayCard: "Today's card", todayCardTitle: "A card just for you", todayCardHint: "Ten seconds to reveal, a whole day to carry.", revealToday: "Reveal today's card", revisitToday: "See today's card again", todayCardRevealedHint: "Your card stays here all day.", streakDays: "{n}-day streak",
    skyToday: "Today's sky", yourSky: "Your sky", signToday: "{sign} · today", addBirthDate: "Add your birth date for a daily sign message.", openSky: "See your sky",
    askLabel: "Ask Nilaza", askPlaceholder: "What's on your mind?", askSend: "Open chat with this question", forYou: "For you",
    yourMessage: "Your message", smallStep: "One small step today", guidance: "Today's guidance", anotherGuidance: "Another idea", saveToday: "Save to Journal", savedToday: "Saved", askDeeper: "Ask deeper", share: "Share",
    changeTopic: "Change topic", continueReading: "Continue reading", subtitleMorning: "A minute for yourself before the day begins.", subtitleDay: "A small pause in the middle of the day.", subtitleEvening: "Three minutes for yourself before sleep." }
};
type BrandCopy = typeof shared.en;
const translations: Record<Language, BrandCopy> = {
  ...shared,
  "zh-Hans": { ...shared.en, tagline: "留一片空间，倾听自己。", intro: "陪你探索问题、感受与自我的 AI 伙伴。", startReflection: "开始片刻自省", revisitReflection: "回顾今日自省", chat: "聊天", journal: "打开日记", publicCta: "加入候补名单", createAccount: "创建账户", signIn: "登录", goalsTitle: "你想倾听什么？", goalsHint: "选择 1–3 项关注点，或跳过。你可以在个人资料中修改。", continue: "继续", skip: "暂时跳过", saving: "正在保存…", saveError: "无法保存你的选择，请重试。", missingGoals: "请选择 1–3 项，或跳过。", close: "关闭", recent: "最近", empty: "你保存的感悟将显示在这里。", today: "留一分钟给自己。", reflection: "片刻自省", breath: "慢慢呼吸三次。", more: "探索更多", currentMood: "你现在感觉如何？" },
  ja: { ...shared.en, tagline: "自分の声に耳を澄ます場所。", intro: "問いや気持ち、自分自身の探求に寄り添う AI パートナー。", startReflection: "振り返りを始める", revisitReflection: "今日の振り返りを見る", chat: "チャット", journal: "日記を開く", publicCta: "ウェイトリストに登録", createAccount: "アカウントを作成", signIn: "ログイン", goalsTitle: "どんなことに向き合いたいですか？", goalsHint: "関心を 1〜3 つ選ぶか、スキップできます。後でプロフィールから変更できます。", continue: "続ける", skip: "今はスキップ", saving: "保存中…", saveError: "選択を保存できませんでした。もう一度お試しください。", missingGoals: "1〜3 つ選ぶか、スキップしてください。", close: "閉じる", recent: "最近の記録", empty: "保存した気づきがここに表示されます。", today: "自分のために、ひとときを。", reflection: "振り返りの時間", breath: "ゆっくり三回呼吸しましょう。", more: "もっと探す", currentMood: "今、どんな気持ちですか？" },
  ko: { ...shared.en, tagline: "나의 목소리에 귀 기울이는 공간.", intro: "질문과 감정, 자기 탐색을 함께하는 AI 동반자.", startReflection: "잠시 돌아보기", revisitReflection: "오늘의 돌아보기 다시 보기", chat: "대화", journal: "일기 열기", publicCta: "대기 명단에 등록", createAccount: "계정 만들기", signIn: "로그인", goalsTitle: "무엇에 귀 기울이고 싶나요?", goalsHint: "관심사를 1–3개 선택하거나 건너뛰세요. 프로필에서 변경할 수 있어요.", continue: "계속", skip: "지금은 건너뛰기", saving: "저장 중…", saveError: "선택을 저장하지 못했어요. 다시 시도해 주세요.", missingGoals: "1–3개를 선택하거나 건너뛰세요.", close: "닫기", recent: "최근 기록", empty: "저장한 생각이 여기에 표시돼요.", today: "나를 위한 잠깐의 시간.", reflection: "돌아보는 시간", breath: "천천히 세 번 숨을 쉬어 보세요.", more: "더 알아보기", currentMood: "지금 기분이 어떤가요?" }
};
export const brandCopy = (language: Language): BrandCopy => translations[language] ?? translations.en;

export function notificationLabel(language: Language, unread: number): string {
  const labels: Record<Language, string> = {
    vi: `Thông báo, ${unread} chưa đọc`,
    en: `Notifications, ${unread} unread`,
    "zh-Hans": `通知，${unread} 条未读`,
    ja: `通知、未読 ${unread} 件`,
    ko: `알림, 읽지 않은 항목 ${unread}개`
  };
  return labels[language] ?? labels.en;
}
