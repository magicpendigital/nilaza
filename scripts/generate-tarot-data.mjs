import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const writeJson = (relativePath, data) => {
  fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

const localized = (vi, en) => ({ vi, en });
const list = (vi, en) => ({ vi, en });

const major = [
  ["major-00-fool", 0, "Ke Khoi Hanh", "The Fool", ["khoi dau", "niem tin", "tu do"], ["beginnings", "trust", "freedom"], "Mot canh cua moi dang mo ra. La bai moi ban thu nghiem voi long tin, nhung van giu su tinh tao.", "A new door is opening. This card invites trust, experimentation, and clear awareness.", "Dung voi vang chi vi muon thoat khoi dieu cu. Hay kiem tra lai dong co va ranh gioi.", "Do not rush only to escape the old. Recheck your motive and boundaries."],
  ["major-01-magician", 1, "Nha Gia Kim", "The Magician", ["y chi", "ky nang", "bien hoa"], ["will", "skill", "transformation"], "Ban da co nhieu cong cu hon ban nghi. Dieu quan trong la tap trung vao mot y dinh ro rang.", "You have more tools than you think. The key is to focus them toward one clear intention.", "Nang luc bi phan tan hoac dung sai muc dich. Hay don gian hoa va noi that voi chinh minh.", "Power may be scattered or misdirected. Simplify and be honest with yourself."],
  ["major-02-high-priestess", 2, "Nu Tu Te", "The High Priestess", ["truc giac", "bi mat", "lang nghe"], ["intuition", "mystery", "listening"], "Cau tra loi chua can bi ep ra thanh loi. Hay lang nghe dieu ban da cam thay tu lau.", "The answer does not need to be forced into words yet. Listen to what you have long sensed.", "Tieng on ben ngoai co the lam ban xa khoi truc giac. Hay tam dung truoc khi quyet dinh.", "Outside noise may be pulling you away from intuition. Pause before deciding."],
  ["major-03-empress", 3, "Nu Hoang Nuoi Duong", "The Empress", ["nuoi duong", "sang tao", "phong phu"], ["nurture", "creation", "abundance"], "Dieu ban cham soc se lon len. Hay cho ban than khong gian de mem mai va sang tao.", "What you tend will grow. Give yourself space to be soft, creative, and receptive.", "Ban co the dang cho di qua nhieu. Hay hoi: minh cung can duoc nuoi duong o dau?", "You may be giving too much. Ask where you also need to be nourished."],
  ["major-04-emperor", 4, "Nguoi Kien Tao", "The Emperor", ["cau truc", "trach nhiem", "nen tang"], ["structure", "responsibility", "foundation"], "Su on dinh khong giam bot tu do; no giup tu do co cho dung. Hay dat mot cau truc ro rang.", "Structure does not reduce freedom; it gives freedom a place to stand. Set a clear frame.", "Kiem soat qua chat co the lam dieu quy gia bi nghet tho. Hay phan biet ky luat va so hai.", "Too much control can suffocate what matters. Separate discipline from fear."],
  ["major-05-hierophant", 5, "Nguoi Giu Truyen Thong", "The Hierophant", ["gia tri", "hoc hoi", "truyen thong"], ["values", "learning", "tradition"], "Hay tim mot nguyen tac dang tin de bua vao. Khong phai moi thu cu deu can bi pha bo.", "Find a trustworthy principle to lean on. Not everything old needs to be broken.", "Ban co the dang song theo cau tra loi cua nguoi khac. Hay hoi dieu gi that su dung voi minh.", "You may be living by someone else's answer. Ask what is truly aligned for you."],
  ["major-06-lovers", 6, "Nguoi Yeu", "The Lovers", ["lua chon", "ket noi", "gia tri"], ["choice", "connection", "values"], "Ket noi that su can su lua chon co y thuc. Hay chon dieu phu hop voi gia tri sau cung cua ban.", "True connection asks for conscious choice. Choose what matches your deeper values.", "Su thieu dong bo giua loi noi va nhu cau co the tao ra khoang cach. Hay noi that nhe nhang.", "A mismatch between words and needs may create distance. Speak gently and truthfully."],
  ["major-07-chariot", 7, "Chien Xa", "The Chariot", ["huong di", "y chi", "tien len"], ["direction", "will", "movement"], "Da den luc gom dong luc lai va tien ve phia truoc. Mot huong di ro se giup ban bot keo co.", "It is time to gather your momentum and move. A clear direction reduces inner conflict.", "Tien nhanh ma khong co huong co the lam ban met. Hay xac dinh dieu minh dang theo duoi.", "Moving fast without direction can exhaust you. Name what you are actually pursuing."],
  ["major-08-strength", 8, "Suc Manh Diu Dang", "Strength", ["can dam", "tu bi", "kiem che"], ["courage", "compassion", "restraint"], "Suc manh that khong can on ao. Su diu dang co the giu duoc dieu ma ap luc khong giu noi.", "Real strength does not need to be loud. Gentleness can hold what pressure cannot.", "Dung bien su chiu dung thanh viec bo qua ban than. Can dam cung la biet noi khong.", "Do not turn endurance into self-erasure. Courage can also mean saying no."],
  ["major-09-hermit", 9, "An Si", "The Hermit", ["mot minh", "chieu soi", "tim nghia"], ["solitude", "illumination", "meaning"], "Ban can mot khoang lang de nghe lai tieng noi that. Dung so viec tam thoi di cham.", "You need quiet enough to hear your honest voice. Do not fear a slower pace.", "Co doc qua lau co the thanh tu co lap. Hay mo mot canh cua nho cho su ket noi an toan.", "Solitude held too long can become isolation. Open one small door to safe connection."],
  ["major-10-wheel", 10, "Vong Xoay", "Wheel of Fortune", ["chu ky", "thay doi", "co hoi"], ["cycles", "change", "opportunity"], "Mot chu ky dang chuyen dong. Thay vi bam chat, hay tim cach di cung nhip thay doi.", "A cycle is turning. Rather than gripping tightly, learn how to move with the change.", "Neu moi thu lap lai, co the co mot bai hoc chua duoc goi ten. Hay nhin mau hinh cu.", "If things repeat, a lesson may still be unnamed. Look at the old pattern."],
  ["major-11-justice", 11, "Cong Ly", "Justice", ["su that", "can bang", "trach nhiem"], ["truth", "balance", "accountability"], "Su that can duoc nhin bang mat ro rang. Lua chon tot nhat la lua chon ban co the dung sau.", "Truth asks for clear eyes. The best choice is one you can stand behind.", "Ban co the dang qua khat khe voi minh hoac ne tranh trach nhiem. Hay can lai bang cong tam.", "You may be too harsh with yourself or avoiding responsibility. Weigh things fairly."],
  ["major-12-hanged-man", 12, "Nguoi Dao Chieu", "The Hanged Man", ["tam dung", "goc nhin", "buong bo"], ["pause", "perspective", "surrender"], "Cach tien len co the la tam dung. Mot goc nhin moi se xuat hien khi ban bot ep cau tra loi.", "Progress may look like pausing. A new angle appears when you stop forcing the answer.", "Cho doi qua lau co the thanh tri hoan. Hay phan biet buong bo va ne tranh.", "Waiting too long can become avoidance. Separate surrender from postponement."],
  ["major-13-death", 13, "Chuyen Hoa", "Death", ["ket thuc", "tai sinh", "chuyen hoa"], ["ending", "rebirth", "transformation"], "Mot dieu cu dang can khep lai de tao khong gian cho phien ban moi. Hay ton trong qua trinh chuyen hoa.", "Something old needs to close so a new form can breathe. Honor the transition.", "Khong chiu ket thuc co the lam ban mac ket. Hay hoi dieu gi da hoan thanh vai tro cua no.", "Refusing an ending may keep you stuck. Ask what has finished its role."],
  ["major-14-temperance", 14, "Hoa Hop", "Temperance", ["dieu do", "pha tron", "hoi phuc"], ["moderation", "blending", "self-care"], "Ban khong can chon cuc doan. Su dung do co the den tu viec pha tron hai dieu tuong nhu doi lap.", "You do not need an extreme. Alignment may come from blending two apparent opposites.", "Lech nhip co the do ban dang ep minh qua muc. Hay quay lai voi su deu dan.", "Imbalance may come from forcing yourself. Return to steadiness."],
  ["major-15-devil", 15, "Rang Buoc", "The Devil", ["rang buoc", "ham muon", "ao tuong"], ["attachment", "desire", "illusion"], "La bai nay soi vao noi ban trao quyen cho dieu khien minh nho lai. Nhan ra la buoc dau de tu do.", "This card points to where you give power to what keeps you small. Seeing it is the first freedom.", "Ban co the dang giam nhe mot rang buoc. Hay goi ten dieu minh so mat neu thay doi.", "You may be minimizing an attachment. Name what you fear losing if you change."],
  ["major-16-tower", 16, "Thap Vo", "The Tower", ["su that bat ngo", "sup do", "giai phong"], ["revelation", "collapse", "liberation"], "Dieu khong vung co the dang lo ra. Su that ban dau gay rung chuyen, nhung co the giai phong ban.", "What was unstable may be revealing itself. Truth can shake first, then free you.", "Neu cu giu mot cau truc da nut, ap luc se lon hon. Hay tim diem can thao go som.", "Holding a cracked structure increases pressure. Find what needs to be dismantled early."],
  ["major-17-star", 17, "Ngoi Sao", "The Star", ["hy vong", "niem tin", "chua lanh"], ["hope", "faith", "renewal"], "Sau nhung dieu on ao, hy vong tro lai nhe nhu nuoc. Hay de ban than tin mot cach cham rai.", "After noise, hope returns like water. Let yourself believe slowly.", "Ban co the dang kho tin vao dieu tot dep. Hay bat dau bang mot bang chung nho rang minh van co the hoi phuc.", "You may struggle to trust goodness. Begin with one small proof that you can recover."],
  ["major-18-moon", 18, "Mat Trang", "The Moon", ["mo ho", "giac mo", "vo thuc"], ["uncertainty", "dreams", "subconscious"], "Khong phai moi thu can ro ngay. Hay di cham trong vung mo ho va ghi lai cam giac lap lai.", "Not everything must be clear immediately. Move slowly through uncertainty and note repeating feelings.", "Noi so co the dang phong dai cau chuyen. Hay tim du lieu thuc te truoc khi ket luan.", "Fear may be enlarging the story. Seek grounded evidence before concluding."],
  ["major-19-sun", 19, "Mat Troi", "The Sun", ["niem vui", "ro rang", "song suc"], ["joy", "clarity", "vitality"], "Anh sang dang lam moi thu don gian hon. Hay cho phep minh don nhan niem vui ma khong can xin loi.", "Light is making things simpler. Let yourself receive joy without apology.", "Ban co the dang che bot anh sang cua minh. Hay hoi noi nao can su that va su hien dien hon.", "You may be dimming your light. Ask where truth and presence are needed."],
  ["major-20-judgement", 20, "Tieng Goi", "Judgement", ["thuc tinh", "goi ten", "tha thu"], ["awakening", "calling", "release"], "Mot tieng goi ben trong dang ro hon. Day la luc nhin lai, tha bot ganh nang, va chon cach song that hon.", "An inner call grows clearer. This is a time to review, release, and choose a truer way to live.", "Neu ban cu tu ket an minh, tieng goi se kho nghe. Hay doi phan xet thanh hoc hoi.", "If you keep judging yourself, the call is hard to hear. Turn judgment into learning."],
  ["major-21-world", 21, "The Gioi", "The World", ["hoan tat", "tron ven", "hoi nhap"], ["completion", "wholeness", "integration"], "Mot vong tron dang khep lai. Hay ghi nhan dieu ban da hoc va buoc tiep voi su tron ven hon.", "A circle is closing. Honor what you learned and step forward with more wholeness.", "Ban co the dang chua cho phep minh cong nhan thanh qua. Hay ket thuc dung cach truoc khi sang chuong moi.", "You may not be letting yourself recognize progress. Complete well before beginning again."]
];

const suits = {
  wands: {
    vi: "Gay Lua",
    en: "Wands",
    element: "fire",
    domain: localized("y chi, sang tao, dong luc va hanh dong", "will, creativity, drive, and action"),
    symbol: localized("canh gay moc mam va tia lua nho", "sprouting staffs and small flames"),
    seed: ["spark", "movement", "courage"]
  },
  cups: {
    vi: "Chiec Coc",
    en: "Cups",
    element: "water",
    domain: localized("cam xuc, tinh yeu, truc giac va ket noi", "emotion, love, intuition, and connection"),
    symbol: localized("coc nuoc, song mem va anh trang", "chalices, soft water, and moonlight"),
    seed: ["feeling", "connection", "tenderness"]
  },
  swords: {
    vi: "Luoi Kiem",
    en: "Swords",
    element: "air",
    domain: localized("suy nghi, su that, giao tiep va xung dot", "thought, truth, communication, and conflict"),
    symbol: localized("luoi kiem mong, may va duong chan troi", "thin blades, clouds, and horizon lines"),
    seed: ["clarity", "words", "discernment"]
  },
  pentacles: {
    vi: "Dong Xu",
    en: "Pentacles",
    element: "earth",
    domain: localized("co the, tien bac, cong viec va nen tang vat chat", "body, money, work, and material foundations"),
    symbol: localized("dong xu khac sao, re cay va dat am", "star-marked coins, roots, and warm earth"),
    seed: ["grounding", "craft", "resources"]
  }
};

const ranks = [
  ["ace", 1, "At", "Ace", "hat giong", "seed", "Mot mam moi dang xuat hien trong linh vuc {domain}.", "A fresh seed appears in the realm of {domain}.", "Hat giong can dat tot; dung ep no thanh ket qua ngay.", "A seed needs good soil; do not force it into an outcome immediately."],
  ["two", 2, "Hai", "Two", "can bang", "balance", "Ban dang hoc cach giu hai dieu cung luc trong {domain}.", "You are learning to hold two things at once in {domain}.", "Do du co the thanh do du keo dai. Hay chon mot buoc nho.", "Indecision can become delay. Choose one small step."],
  ["three", 3, "Ba", "Three", "phat trien", "growth", "Dieu ban bat dau dang can ket noi, phan hoi va hinh dang ro hon.", "What you began now needs connection, feedback, and clearer shape.", "Phat trien thieu nen tang co the lam ban tan suc. Hay quay lai voi dieu cot loi.", "Growth without grounding may scatter you. Return to the core."],
  ["four", 4, "Bon", "Four", "nen tang", "foundation", "Mot cau truc dang giup ban nghi ngoi hoac on dinh hon.", "A structure is helping you rest or stabilize.", "An toan qua muc co the thanh dong bang. Hay mo mot cua so nho.", "Too much safety can become stagnation. Open one small window."],
  ["five", 5, "Nam", "Five", "ma sat", "friction", "Co mot diem cang dang doi ban nhin thang vao su that.", "A point of tension asks you to face what is true.", "Xung dot khong duoc goi ten se lap lai. Hay cham vao no mot cach binh tinh.", "Unnamed conflict repeats. Approach it calmly."],
  ["six", 6, "Sau", "Six", "dieu chinh", "repair", "Sau cang thang, ban co co hoi dieu chinh va lay lai nhip.", "After tension, you have a chance to repair and regain rhythm.", "Dung o lai trong dieu da qua chi vi no quen. Hay cho phep minh di tiep.", "Do not remain with what is over just because it is familiar. Let yourself move."],
  ["seven", 7, "Bay", "Seven", "thu thach", "challenge", "Ban can su sang suot de bao ve dieu quan trong trong {domain}.", "Discernment helps you protect what matters in {domain}.", "Phong thu qua muc co the lam ban mat ket noi. Hay phan biet canh giac va dong cua.", "Too much defense can cost connection. Separate caution from closing off."],
  ["eight", 8, "Tam", "Eight", "ren luyen", "practice", "Su tien bo den tu nhung dong tac lap lai co y thuc.", "Progress comes from conscious repetition.", "Lap lai may moc co the lam mat y nghia. Hay nho vi sao minh bat dau.", "Mechanical repetition can drain meaning. Remember why you began."],
  ["nine", 9, "Chin", "Nine", "thu hoach", "attainment", "Mot thanh qua dang den gan; hay nhin ca gia tri va cai gia cua no.", "An attainment is near; notice both its value and its cost.", "Dung de thanh qua bien thanh ap luc phai hoan hao.", "Do not let achievement become pressure to be perfect."],
  ["ten", 10, "Muoi", "Ten", "hoan tat", "completion", "Mot chu ky trong {domain} da day den muc can sap xep lai.", "A cycle in {domain} has reached a point that needs rearranging.", "Neu qua tai, hay dat xuong dieu khong con thuc su cua ban.", "If overloaded, put down what is no longer truly yours."],
  ["page", 11, "Nguoi Hoc Viec", "Page", "hoc hoi", "apprentice", "Mot phan tre, to mo trong ban muon hoc ngon ngu cua {domain}.", "A young, curious part of you wants to learn the language of {domain}.", "Su non not khong sai, nhung can khiem ton va thuc hanh.", "Inexperience is not wrong, but it needs humility and practice."],
  ["knight", 12, "Nguoi Len Duong", "Knight", "dong luc", "seeker", "dong luc dang muon tien len nhanh trong {domain}.", "momentum wants to move quickly through {domain}.", "Toc do can duoc dan boi muc dich, khong chi boi cam xuc nhat thoi.", "Speed needs purpose, not only passing emotion."],
  ["queen", 13, "Nguoi Giu Vuon", "Queen", "nuoi duong", "guardian", "Ban dang duoc moi cham soc va lam chu khong gian noi tam cua {domain}.", "You are invited to tend and own the inner space of {domain}.", "Cham soc nguoi khac khong nen dong nghia voi quen minh.", "Caring for others should not mean forgetting yourself."],
  ["king", 14, "Nguoi Tri Vi", "King", "lam chu", "stewardship", "Da den luc dung vung va ra quyet dinh chin chan trong {domain}.", "It is time to stand steady and make mature choices in {domain}.", "Quyen luc thieu mem mai co the thanh ap dat. Hay lanh dao bang su ro rang.", "Power without softness can become control. Lead with clarity."]
];

const minorSpecifics = {
  wands: {
    ace: ["tia lua dau tien", "first spark"],
    two: ["chon huong di", "choosing direction"],
    three: ["nhin xa hon", "looking outward"],
    four: ["an mung nho", "small celebration"],
    five: ["va cham y chi", "clashing wills"],
    six: ["duoc cong nhan", "recognition"],
    seven: ["giu lap truong", "holding ground"],
    eight: ["tin tuc nhanh", "quick movement"],
    nine: ["kien cuong", "resilience"],
    ten: ["ganh qua nhieu", "heavy burden"],
    page: ["to mo sang tao", "creative curiosity"],
    knight: ["hanh dong nong nhiet", "impulsive action"],
    queen: ["tu tin am ap", "warm confidence"],
    king: ["tam nhin dan dat", "visionary leadership"]
  },
  cups: {
    ace: ["mo long", "opening heart"],
    two: ["dap lai", "mutuality"],
    three: ["tinh ban", "friendship"],
    four: ["chan nan", "emotional pause"],
    five: ["tiec nuoi", "grief"],
    six: ["ky uc", "memory"],
    seven: ["nhieu lua chon", "many options"],
    eight: ["roi di", "walking away"],
    nine: ["hai long", "contentment"],
    ten: ["gan ket", "belonging"],
    page: ["tin nhan cam xuc", "emotional message"],
    knight: ["lang man", "romantic pursuit"],
    queen: ["thau cam", "deep empathy"],
    king: ["cam xuc chin chan", "emotional maturity"]
  },
  swords: {
    ace: ["su that moi", "new truth"],
    two: ["ne tranh quyet dinh", "avoided choice"],
    three: ["dau long", "heartache"],
    four: ["nghi tam tri", "mental rest"],
    five: ["thang ma mat", "costly win"],
    six: ["di qua vung kho", "moving through difficulty"],
    seven: ["chien luoc", "strategy"],
    eight: ["tu gioi han", "self-limitation"],
    nine: ["lo au", "anxiety"],
    ten: ["ket thuc dau", "painful ending"],
    page: ["quan sat", "watchful learning"],
    knight: ["loi noi nhanh", "fast words"],
    queen: ["ranh gioi tri tue", "clear boundaries"],
    king: ["phan doan sang suot", "clear judgment"]
  },
  pentacles: {
    ace: ["co hoi vat chat", "material opportunity"],
    two: ["can bang nguon luc", "resource balance"],
    three: ["cong tac", "collaboration"],
    four: ["giu chat", "holding tightly"],
    five: ["thieu thon", "scarcity"],
    six: ["cho va nhan", "giving and receiving"],
    seven: ["kien nhan", "patience"],
    eight: ["tay nghe", "craft"],
    nine: ["tu chu", "self-sufficiency"],
    ten: ["di san", "legacy"],
    page: ["hoc cach xay", "learning to build"],
    knight: ["ben bi", "steady effort"],
    queen: ["cham soc thuc te", "practical care"],
    king: ["quan tri nguon luc", "resource stewardship"]
  }
};

function buildIntro(nameVi, nameEn, domainVi, domainEn) {
  return localized(
    `${nameEn} la mot la bai ve ${domainVi}. No khong dua ra ket luan tuyet doi, ma mo mot goc nhin de ban tu hoi dieu gi dang can duoc thay ro.`,
    `${nameEn} is a card about ${domainEn}. It does not give an absolute answer; it opens an angle for noticing what wants to be seen.`
  );
}

function buildPersonality(keywordsVi, keywordsEn, nameVi, nameEn) {
  return localized(
    `${nameEn} co tinh cach ${keywordsVi.slice(0, 3).join(", ")}. Neu la mot nguoi ban, la bai nay se noi nhe nhung thang: hay nhin vao dieu dang lap lai va chon mot buoc co y thuc.`,
    `${nameEn} carries a ${keywordsEn.slice(0, 3).join(", ")} personality. If it were a friend, this card would speak gently but directly: notice the repeating pattern and choose one conscious step.`
  );
}

function buildReflection(keywordVi, keywordEn) {
  return localized(
    `Neu ${keywordVi} dang la chu de chinh, mot hanh dong nho nao se giup ban thanh that hon voi minh hom nay?`,
    `If ${keywordEn} is the central theme, what small action would make you more honest with yourself today?`
  );
}

const majorCards = major.map(([id, number, viName, enName, viKeywords, enKeywords, viUp, enUp, viRev, enRev]) => ({
  id,
  arcana: "major",
  number,
  suit: null,
  rank: null,
  element: "spirit",
  name: localized(enName, enName),
  keywords: list(viKeywords, enKeywords),
  intro: buildIntro(viName, enName, "mot chu de lon trong hanh trinh noi tam", "a larger theme in the inner journey"),
  personalityPortrait: buildPersonality(viKeywords, enKeywords, viName, enName),
  uprightMeaning: localized(viUp, enUp),
  reversedMeaning: localized(viRev, enRev),
  reflectionQuestion: buildReflection(viKeywords[0], enKeywords[0])
}));

const minorCards = Object.entries(suits).flatMap(([suitId, suit]) =>
  ranks.map(([rankId, number, viRank, enRank, viKeyword, enKeyword, viUp, enUp, viRev, enRev]) => {
    const enName = `${enRank} of ${suit.en}`;
    const [viSpecific, enSpecific] = minorSpecifics[suitId][rankId];
    const viKeywords = [viKeyword, viSpecific, suit.domain.vi.split(",")[0]];
    const enKeywords = [enKeyword, enSpecific, suit.domain.en.split(",")[0]];
    return {
      id: `minor-${suitId}-${rankId}`,
      arcana: "minor",
      number,
      suit: suitId,
      rank: rankId,
      element: suit.element,
      name: localized(enName, enName),
      keywords: list(viKeywords, enKeywords),
      intro: buildIntro(viName, enName, suit.domain.vi, suit.domain.en),
      personalityPortrait: localized(
        `${enName} mang dang hinh cua ${viSpecific}: mot nguoi ban soi vao ${suit.domain.vi}, nhac ban chon cach phan ung co y thuc hon.`,
        `${enName} carries the shape of ${enSpecific}: a companion for ${suit.domain.en}, asking you to respond with more awareness.`
      ),
      uprightMeaning: localized(viUp.replace("{domain}", suit.domain.vi), enUp.replace("{domain}", suit.domain.en)),
      reversedMeaning: localized(viRev.replace("{domain}", suit.domain.vi), enRev.replace("{domain}", suit.domain.en)),
      reflectionQuestion: buildReflection(viSpecific, enSpecific)
    };
  })
);

const cards = [...majorCards, ...minorCards];

const deckDesigns = [
  {
    deckId: "moon-garden",
    style: localized("noi tam, thien nhien dem, anh trang", "inward, night-botanical, moonlit"),
    cardBackPrompt: localized(
      "Mat lung bai Khu Vuon Trang: nen than den, hoa dem, trang khuyet, duong vien vang sam, khong chu.",
      "Moon Garden card back: charcoal paper, night flowers, crescent moon, muted gold line border, no text."
    )
  },
  {
    deckId: "rose-mirror",
    style: localized("tinh yeu, guong co, hong tram", "love, antique mirrors, muted rose"),
    cardBackPrompt: localized(
      "Mat lung bai Guong Hong: nen hong tram tren than den, guong co, canh hong kho, anh nen am, khong chu.",
      "Rose Mirror card back: muted rose over charcoal, antique mirror, dried petals, candlelit warmth, no text."
    )
  },
  {
    deckId: "golden-thread",
    style: localized("chien luoc, chi vang, hinh hoc co dien", "strategy, gold thread, classic geometry"),
    cardBackPrompt: localized(
      "Mat lung bai Soi Chi Vang: nen teal tham, chi vang, ky hieu hinh hoc, chat giay luu tru, khong chu.",
      "Golden Thread card back: deep teal ground, gold thread, geometric sigils, archival paper texture, no text."
    )
  }
].map((deck) => ({
  ...deck,
  cards: cards.map((card) => {
    const suit = card.suit ? suits[card.suit] : null;
    const symbolVi = suit?.symbol.vi ?? "bieu tuong trung tam rieng cua la Major Arcana";
    const symbolEn = suit?.symbol.en ?? "the Major Arcana card's own central archetype";
    return {
      cardId: card.id,
      title: card.name,
      visualPrompt: localized(
        `${deck.style.vi}. Thiet ke la ${card.name.vi} theo phong cach premium mystical editorial, ty le tarot dung, nen khong copy Rider-Waite, dung ${symbolVi}, co khong gian am va duong vien tinh te, khong chu tren mat bai.`,
        `${deck.style.en}. Design ${card.name.en} in a premium mystical editorial tarot-card ratio, original composition that does not copy Rider-Waite, using ${symbolEn}, warm negative space, refined border, no text on card face.`
      ),
      testingStatus: "ready_for_visual_prototype"
    };
  })
}));

const skills = {
  version: "2026-06-07-local-v1",
  purpose: localized(
    "Cac skill noi dung de AI Agent viet, kiem tra va mo rong du lieu tung la bai tarot.",
    "Content skills for AI agents to write, validate, and extend individual tarot card data."
  ),
  safetyBoundary: localized(
    "Moi noi dung tarot phai la giai tri va tu phan chieu; khong khang dinh tuong lai, khong dua loi khuyen y te/phap ly/tai chinh.",
    "All tarot content is entertainment and self-reflection; never claim certain futures or provide medical/legal/financial advice."
  ),
  skills: [
    {
      id: "tarot_card_intro_writer",
      outputField: "intro",
      purpose: localized("Viet gioi thieu ngan cho tung la bai.", "Write a short introduction for each card."),
      checks: ["short", "bilingual", "non-deterministic", "clear card theme"]
    },
    {
      id: "tarot_card_personality_builder",
      outputField: "personalityPortrait",
      purpose: localized("Xay dung chan dung tinh cach cua la bai nhu mot guide noi tam.", "Build the card's personality portrait as an inner guide."),
      checks: ["warm", "distinct", "reflective", "not personified as a real entity"]
    },
    {
      id: "tarot_card_meaning_interpreter",
      outputField: "uprightMeaning/reversedMeaning",
      purpose: localized("Viet nghia xuoi/nguoc co the dung cho AI reading.", "Write upright/reversed meanings usable in AI readings."),
      checks: ["actionable", "emotionally safe", "no fear claims", "works in love/career/self contexts"]
    },
    {
      id: "tarot_reflection_question_writer",
      outputField: "reflectionQuestion",
      purpose: localized("Tao cau hoi journal sau moi la bai.", "Create a journal question after each card."),
      checks: ["one question", "self-reflection", "no shame", "mobile-friendly"]
    },
    {
      id: "tarot_card_visual_prompt_designer",
      outputField: "visualPrompt",
      purpose: localized("Tao prompt thiet ke visual rieng cho tung deck va tung la.", "Create visual design prompts per deck and card."),
      checks: ["original artwork", "no protected deck copy", "deck-specific", "tarot-card ratio"]
    },
    {
      id: "tarot_spread_synthesis_writer",
      outputField: "reading.summary",
      purpose: localized("Noi cac la bai thanh mot thong diep 3-la an toan.", "Synthesize selected cards into a safe 3-card message."),
      checks: ["references selected cards", "no fixed fate", "ends with reflection", "mentions uncertainty where needed"]
    }
  ]
};

writeJson("packages/content/data/tarot-cards.json", cards);
writeJson("packages/content/data/tarot-card-designs.json", deckDesigns);
writeJson("packages/agent-config/tarot-card-skills.json", skills);

// Rose Mirror uses curated per-card visual scenes that are intentionally richer
// than the generic deck prompt generator above.
await import("./build_rose_mirror_designs.mjs");
