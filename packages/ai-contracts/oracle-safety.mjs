// Deterministic Oracle safety and routing shared by the ai-oracle-turn server and the on-device
// Oracle direction chooser (Owner decision 2026-10-31). Pure functions, no I/O.
export function normalizeOracleText(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']/g, " ").replace(/\s+/g, " ").trim();
}

// Deterministic support catches the audit phrases before prompt/model/quota work.
// This bounded phrase policy is not a clinical classifier or full moderation.
export function oracleSafetySignal(value) {
  // Remove only the bounded laughter idiom, not other signals in the sentence.
  const n = normalizeOracleText(value).replace(/\b(?:muon )?chet cuoi\b/g, "");
  const crisis = [
    /\b(?:kill|hurt|harm) myself\b/, /\bself (?:harm|injury)\b/, /\bsuicid(?:e|al)\b/,
    /\bend (?:my|this) life\b/, /\b(?:want|wish|going|ready) to die\b/,
    /\b(?:wish|wishing) (?:i (?:was|were)|to be) dead\b/,
    /\b(?:want|wish) to disappear forever\b/,
    /\b(?:i(?: am|'m)? (?:going to|about to)|i (?:will|plan to|intend to)) (?:shoot|hang|drown|stab|poison) myself\b/,
    /\b(?:i(?: am|'m)? (?:going to|about to)|i (?:will|plan to|intend to)) jump (?:off|from) (?:a |the )?(?:bridge|roof|building)\b/,
    /\b(?:i(?: am|'m)? (?:going to|about to)|i (?:will|plan to|intend to)) (?:take|swallow) (?:all (?:my|the)|too many) (?:sleeping )?pills\b/,
    /\b(?:don'?t|do not|no longer) want to (?:live|be alive|exist)\b/,
    /\b(?:can'?t|cannot) go on living\b/, /\b(?:no|not any) reason to live\b/,
    /\btu tu\b/, /\btu (?:lam hai|gay thuong tich|cat tay)\b/,
    /\b(?:muon|dinh|se) (?:chet|ket thuc cuoc doi|ket thuc cuoc song)\b/,
    /\buoc gi (?:minh |toi )?chet\b/,
    /\b(?:dinh|se|sap|muon|dang chuan bi) (?:nhay (?:cau|lau)|treo co|tu thieu|tu ban)\b/,
    /\b(?:dinh|se|sap|muon|da|vua|dang) (?:uong|nuot) (?:het|qua lieu|tat ca) thuoc\b/,
    /\b(?:khong|chang) (?:con )?muon (?:song|ton tai|tiep tuc song)\b/,
    /\bkhong (?:con )?(?:ly do|y nghia) (?:de )?song\b/,
    /\b(?:muon|uoc gi) (?:minh )?bien mat mai mai\b/
  ];
  if (crisis.some(pattern => pattern.test(n))) return "self_harm_signal";
  const regulated = [
    /\b(?:diagnose me|medical diagnosis|legal advice|financial advice|mental health diagnosis)\b/,
    /\b(?:chan doan|ke don thuoc|tu van phap ly|tu van dau tu|nen mua co phieu)\b/,
    /\b(?:guaranteed future|will definitely happen|certainly happen)\b/
  ];
  return regulated.some(pattern => pattern.test(n)) ? "regulated_request" : null;
}

export function oracleIntent(value) {
  if (oracleSafetySignal(value)) return "safety_redirect";
  const n = normalizeOracleText(value);
  if (/\b(?:tarot|trai bai|rut (?:mot )?(?:la )?bai|draw (?:a )?(?:tarot|card)|card spread)\b/.test(n)) return "tarot_handoff";
  if (/\b(?:astrology|zodiac|birth chart|moon sign|rising sign|chiem tinh|ban do sao|cung hoang dao)\b/.test(n)) return "astrology_handoff";
  if (/\b(?:council|hoi dong|nhieu goc nhin)\b/.test(n)) return "council_handoff";
  if (/\b(?:guide|mentor|persona|nhan vat)\b/.test(n)) return "persona_handoff";
  if (/\b(?:journal|nhat ky|ghi lai|save (?:this|a) reflection)\b/.test(n)) return "journal_handoff";
  return "reflect";
}

export function oracleSafetyReply(locale, signal) {
  if (signal !== "self_harm_signal") return locale === "vi"
    ? "Mình có thể cùng bạn nhìn lại điều khiến bạn băn khoăn, nhưng không thể chẩn đoán hay đưa ra lời khuyên chuyên môn. Bạn có thể tìm một chuyên gia phù hợp và chuẩn bị những câu hỏi bạn muốn trao đổi với họ."
    : "I can help you reflect on what is worrying you, but I cannot diagnose or provide professional advice. You can contact a qualified professional and prepare the questions you want to discuss with them.";
  return locale === "vi"
    ? "Mình nghe thấy bạn đang rất khó khăn, và bạn không cần ở một mình với điều này. Nếu bạn có thể làm hại bản thân hoặc đang không an toàn, hãy liên hệ dịch vụ khẩn cấp hoặc hỗ trợ khủng hoảng tại nơi bạn đang ở ngay lúc này. Nếu có thể, hãy nhờ một người bạn tin cậy ở bên và tránh xa những vật có thể gây hại. Bạn có đang ở nơi an toàn và có ai có thể ở cạnh bạn ngay bây giờ không?"
    : "I hear that this is very hard, and you do not have to be alone with it. If you might hurt yourself or are unsafe, contact emergency services or crisis support where you are right now. If possible, ask someone you trust to stay with you and move away from anything you could use to hurt yourself. Are you somewhere safe, and is there someone who can be with you now?";
}
