// The one call to action on the pages that share links open. Before the Play listing is public it points to the
// waitlist on the same page. When the Owner approves the switch, put the public Play address in `playStoreUrl`
// (one line) and every share page shows a Google Play button instead. Nothing else needs to change.
export const shareCtaConfig = {
  playStoreUrl: ""
};

const playPattern = /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[A-Za-z][A-Za-z0-9_.]{2,120}$/;

export type ShareCta = { kind: "waitlist" | "play"; href: string; label: string; benefit: string; privacy: string };

export function shareCtaOf(locale: "vi" | "en", playStoreUrl: string = shareCtaConfig.playStoreUrl): ShareCta {
  const vi = locale === "vi";
  if (playPattern.test(playStoreUrl.trim())) {
    return {
      kind: "play",
      href: playStoreUrl.trim(),
      label: vi ? "Tải Nilaza trên Google Play" : "Get Nilaza on Google Play",
      benefit: vi ? "Rút bài, xem bản đồ số và bầu trời mỗi ngày, ngay trên điện thoại." : "Draw cards, see your number map and the daily sky, right on your phone.",
      privacy: vi ? "Ngày sinh và ghi chú của bạn được tính và giữ trên máy, không cần chia sẻ với ai." : "Your birth date and notes are calculated and kept on your device; you do not have to share them."
    };
  }
  return {
    kind: "waitlist",
    href: "#join",
    label: vi ? "Đăng ký thử bản Android" : "Sign up to try the Android app",
    benefit: vi ? "Nhận tin qua email khi bản Android mở thử, để tự rút bài, xem bản đồ số và bầu trời mỗi ngày trên điện thoại." : "Get an email when the Android app opens for testing, to draw your own cards and see your numbers and the daily sky on your phone.",
    privacy: vi ? "Chỉ cần email. Không cần ngày sinh, không cần thanh toán." : "Only an email. No birth date, no payment."
  };
}
