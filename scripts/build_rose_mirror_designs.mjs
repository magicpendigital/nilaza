import fs from "node:fs";

const DESIGNS_PATH = "packages/content/data/tarot-card-designs.json";

const style = {
  vi: "tình yêu, gương cổ, hồng trầm, ranh giới cảm xúc",
  en: "love, antique mirrors, muted rose, emotional boundaries"
};

const cardBackPrompt = {
  vi: "Mặt sau bài Rose Mirror, kích thước 1024 x 1768px, cùng tỷ lệ với lá tarot đã render. Nền than đen pha hồng trầm, tâm bài là gương oval cổ với đường phản chiếu ngà, vòng cánh hồng khô tối giản bao quanh và ánh vàng ấm như nến. Khung bo góc, viền rose-gold mảnh, cảm giác mềm và thân mật nhưng không quá hồng. Không chữ, không số, không biểu tượng Rider-Waite.",
  en: "Rose Mirror card back, 1024 x 1768px, matching the rendered tarot-card ratio. Use a charcoal base washed with muted rose, a central antique oval mirror with an ivory reflection line, a restrained ring of dried-petal marks, and warm candle-gold accents. Rounded frame, slim rose-gold border, tender and intimate without becoming overly pink. No text, no numbers, no Rider-Waite symbols."
};

const sceneByCardId = {
  "major-00-fool": {
    vi: "Một người trẻ đứng trước chiếc gương oval đặt hé trên sàn nhung, tay chạm vào tia nến đầu tiên như chuẩn bị bước vào căn phòng cảm xúc mới; cánh hồng rơi thành lối nhỏ, bóng phản chiếu dịu và còn bỏ ngỏ.",
    en: "A young seeker stands before a slightly open oval mirror on velvet, touching the first candlebeam as if entering a new emotional room; rose petals form a small path, the reflection gentle and unresolved."
  },
  "major-01-magician": {
    vi: "Một chân dung nửa người bên bàn trang điểm cổ, bốn vật nhỏ nằm cân bằng quanh gương: nến, chén nước, trâm bạc và đồng xu rose-gold; nhân vật gom ánh phản chiếu thành một vòng sáng tự chủ.",
    en: "A half-length portrait at an antique vanity, four small objects balanced around the mirror: candle, water cup, silver hairpin, and rose-gold coin; the figure gathers reflections into a self-possessed halo."
  },
  "major-02-high-priestess": {
    vi: "Một người giữ bí mật ngồi sau tấm rèm lụa hồng khói, gương đen phản chiếu vầng sáng ngà thay vì khuôn mặt; ngọc trai và giấy ghi chú mờ tạo cảm giác trực giác sâu.",
    en: "A keeper of secrets sits behind smoky rose silk curtains, a black mirror reflecting ivory light instead of a face; pearls and blurred notes create a deep intuitive hush."
  },
  "major-03-empress": {
    vi: "Một chân dung dịu dàng giữa vườn hồng khô trong phòng kính, tay nâng lọ nước hoa và chiếc gương cầm tay; lụa, ngọc trai và ánh nến làm nổi bật sự nuôi dưỡng bản thân.",
    en: "A tender portrait in a dried-rose conservatory, holding a perfume bottle and hand mirror; silk, pearls, and candlelight emphasize self-nurture and sensual care."
  },
  "major-04-emperor": {
    vi: "Một nhân vật điềm tĩnh ngồi trước gương khung rose-gold vuông vững, đặt chìa khóa và dây ruy băng đã buộc gọn trên bàn; bố cục chắc, ấm, nói về ranh giới có cấu trúc.",
    en: "A composed figure sits before a sturdy rose-gold square mirror, with a key and neatly tied ribbon on the table; the composition feels grounded, warm, and structured around boundaries."
  },
  "major-05-hierophant": {
    vi: "Một người hướng dẫn thắp hai cây nến trước gương cổ trong căn phòng yên tĩnh, phía sau là những khung ảnh trống và chuỗi ngọc trai; nghi lễ thân mật thay cho giáo điều.",
    en: "A guide lights two candles before an antique mirror in a quiet room, with empty picture frames and pearl strands behind; intimate reflective practice replaces dogma."
  },
  "major-06-lovers": {
    vi: "Hai chiếc gương oval nghiêng vào nhau trên bàn nhung, phản chiếu hai bàn tay gần chạm nhưng vẫn có khoảng thở; cánh hồng và dây ruy băng mở tượng trưng cho lựa chọn có ý thức.",
    en: "Two oval mirrors lean toward each other on velvet, reflecting two hands almost touching while keeping breathing room; petals and an untied ribbon symbolize conscious choice."
  },
  "major-07-chariot": {
    vi: "Một chân dung quyết đoán nhìn vào gương dài, hai dải ruy băng hồng trầm kéo theo hai hướng nhưng được giữ bằng một chiếc khóa rose-gold ở giữa; chuyển động mạnh mà vẫn tự chủ.",
    en: "A decisive portrait faces a tall mirror, two muted-rose ribbons pulling in opposite directions but held by a central rose-gold clasp; forceful movement remains self-directed."
  },
  "major-08-strength": {
    vi: "Một nhân vật dịu mà vững đặt tay lên vết nứt sáng trong gương, bên cạnh là nhánh hồng có gai được quấn lụa; sức mạnh đến từ sự mềm mỏng có ranh giới.",
    en: "A gentle yet steady figure rests a hand on a glowing crack in the mirror, beside a thorned rose branch wrapped in silk; strength comes from softness with boundaries."
  },
  "major-09-hermit": {
    vi: "Một người ngồi một mình trong góc phòng tối ấm, cầm nến nhỏ soi vào gương bỏ túi; xung quanh là cánh hồng khô và khoảng trống yên lặng cho tự vấn.",
    en: "A solitary figure sits in a warm dark corner, holding a small candle toward a pocket mirror; dried petals and quiet space invite self-inquiry."
  },
  "major-10-wheel": {
    vi: "Một vòng gương nhỏ xoay quanh lọ nước hoa và đồng hồ bỏ túi không số, các phản chiếu cánh hồng đổi hướng trong ánh nến; cảm giác chu kỳ cảm xúc đang chuyển pha.",
    en: "A ring of small mirrors turns around a perfume bottle and numberless pocket watch, rose-petal reflections shifting in candlelight; emotional cycles are changing phase."
  },
  "major-11-justice": {
    vi: "Một chân dung thẳng thắn đứng giữa hai gương đối xứng, một bên phản chiếu trái tim mềm, một bên phản chiếu chiếc chìa khóa sắc nét; ánh sáng chia đôi nhưng không lạnh.",
    en: "An honest portrait stands between two symmetrical mirrors, one reflecting a soft heart, the other a precise key; the light divides the scene without becoming cold."
  },
  "major-12-hanged-man": {
    vi: "Một chiếc gương treo ngược bằng ruy băng lụa, phản chiếu gương mặt bình thản nhìn sự việc từ góc khác; cánh hồng lơ lửng chậm trong không khí nến.",
    en: "A mirror hangs upside down from silk ribbon, reflecting a calm face seeing the situation from another angle; rose petals drift slowly through candlelit air."
  },
  "major-13-death": {
    vi: "Một bàn tay tháo bông hồng héo khỏi khung gương cổ, để lộ mầm hồng mới trong ánh ngà; bố cục thanh lịch về kết thúc, buông bỏ và tái sinh cảm xúc.",
    en: "A hand removes a wilted rose from an antique mirror frame, revealing a new rosebud in ivory light; an elegant composition about endings, release, and emotional renewal."
  },
  "major-14-temperance": {
    vi: "Hai lọ thủy tinh rót ánh hồng trầm và ánh ngà vào một bát phản chiếu, tạo đường sáng cân bằng trước gương; cảm giác hòa giải nhẹ nhàng, không kịch tính.",
    en: "Two glass bottles pour muted rose and ivory light into a reflective bowl before a mirror, forming a balanced glow; gentle reconciliation without drama."
  },
  "major-15-devil": {
    vi: "Một bàn trang điểm phủ nhung với chiếc gương ám khói phản chiếu ruy băng quấn quá chặt quanh chìa khóa; cánh hồng có gai và ánh nến thấp nói về ham muốn, dính mắc và quyền chọn tháo nút.",
    en: "A velvet vanity holds a smoky mirror reflecting a ribbon tied too tightly around a key; thorned petals and low candlelight speak of desire, attachment, and the choice to untie."
  },
  "major-16-tower": {
    vi: "Một gương đứng nứt thành nhiều mảng rose-gold trong căn phòng vẫn yên, cánh hồng bị gió thổi khỏi bàn; hình ảnh về sự thật làm vỡ cấu trúc cũ, không sao chép tháp sét.",
    en: "A standing mirror cracks into rose-gold fragments in an otherwise still room, petals blown from the vanity; truth breaks an old structure without copying a lightning tower."
  },
  "major-17-star": {
    vi: "Một nhân vật rửa tay trong bát nước phản chiếu sao nhỏ bên cạnh gương oval, cánh hồng nổi như lời hứa dịu; bố cục sáng hơn, tự chăm sóc và hy vọng.",
    en: "A figure washes their hands in a water bowl reflecting tiny stars beside an oval mirror, petals floating like a gentle promise; brighter, self-care, and hopeful."
  },
  "major-18-moon": {
    vi: "Hai gương nhỏ phản chiếu cùng một khuôn mặt nhưng cảm xúc khác nhau, giữa chúng là vầng trăng mờ trong nước hoa; sương hồng trầm, ngọc trai và bóng tối mềm gợi trực giác và hoài nghi.",
    en: "Two small mirrors reflect the same face with different emotions, between them a blurred moon inside perfume-like water; muted rose mist, pearls, and soft darkness suggest intuition and doubt."
  },
  "major-19-sun": {
    vi: "Một gương cổ đón tia sáng ngà ấm làm bừng lên cánh hồng trên bàn, chân dung trong gương mỉm cười nhẹ; vui tươi trưởng thành, không chói, không trẻ con.",
    en: "An antique mirror catches warm ivory light that brightens petals on the table, the reflected portrait wearing a small smile; mature joy, never harsh or childish."
  },
  "major-20-judgement": {
    vi: "Nhiều mảnh gương nhỏ dựng thành vòng quanh một người đang tháo khăn che mặt, ánh nến gọi dậy sự thật bên trong; cảm giác thức tỉnh, tha thứ và chọn giọng nói mới.",
    en: "Small mirror shards form a circle around a figure removing a veil, candlelight calling up inner truth; awakening, forgiveness, and choosing a new voice."
  },
  "major-21-world": {
    vi: "Một căn phòng gương mở ra thành vòng hoa hồng khô, ngọc trai và chìa khóa, ở giữa là chân dung trọn vẹn nhìn thẳng nhưng dịu; cảm giác hoàn tất một vòng trưởng thành cảm xúc.",
    en: "A mirror room opens into a wreath of dried roses, pearls, and keys, with a centered complete portrait looking directly yet gently; the completion of an emotional maturation cycle."
  },
  "minor-wands-ace": {
    vi: "Một que diêm vừa cháy trước gương nhỏ, ngọn lửa phản chiếu thành nụ hồng sáng; ruy băng lụa và gai mảnh gợi khởi đầu của ham muốn có ý thức.",
    en: "A freshly lit match before a small mirror, its flame reflected as a luminous rosebud; silk ribbon and fine thorns suggest the beginning of conscious desire."
  },
  "minor-wands-two": {
    vi: "Hai cây nến ở hai mép gương oval, giữa chúng là chìa khóa đặt trên bản đồ cảm xúc không chữ; một người cân nhắc bước tới gần hay giữ khoảng cách.",
    en: "Two candles at the edges of an oval mirror, a key resting on a wordless emotional map between them; a figure considers moving closer or keeping distance."
  },
  "minor-wands-three": {
    vi: "Ba vệt nến phản chiếu kéo dài trên gương bàn, hướng ra ô cửa tối hồng; cánh hồng bay như tín hiệu chờ hồi đáp sau khi đã chủ động.",
    en: "Three candle reflections stretch across a tabletop mirror toward a dark rose window; petals move like signals awaiting response after an initiative has been made."
  },
  "minor-wands-four": {
    vi: "Bốn cây nến nhỏ tạo thành khung ấm quanh gương, ruy băng mở và cánh hồng xếp thành vòng thân mật; cảm giác an toàn khi được chào đón.",
    en: "Four small candles form a warm frame around a mirror, untied ribbon and petals arranged in an intimate circle; the safety of being welcomed."
  },
  "minor-wands-five": {
    vi: "Năm que nến mảnh phản chiếu chồng chéo trong gương nứt nhẹ, các dải ruy băng kéo lệch nhau; căng thẳng, hấp dẫn và va chạm bản ngã được giữ trong bố cục đẹp.",
    en: "Five slender candles reflect in a lightly cracked mirror, ribbons pulling off-center; tension, attraction, and clashing egos held in an elegant composition."
  },
  "minor-wands-six": {
    vi: "Một chân dung tự tin nâng nến trước gương, sáu đốm sáng rose-gold hiện quanh viền như lời công nhận; chiến thắng mềm, không phô trương.",
    en: "A confident portrait lifts a candle before the mirror, six rose-gold lights appearing around the edge like recognition; soft victory without display."
  },
  "minor-wands-seven": {
    vi: "Một người giữ nến trước ngực, phía sau gương phản chiếu bảy nhánh gai hồng như những câu hỏi xâm nhập; dáng đứng yên nhưng bảo vệ ranh giới.",
    en: "A figure holds a candle to their chest while the mirror behind reflects seven thorned rose stems like intrusive questions; still posture, firm boundary."
  },
  "minor-wands-eight": {
    vi: "Tám vệt sáng nến lao qua bề mặt gương dài như tin nhắn không chữ, cánh hồng bị kéo thành đường chuyển động; động lực nhanh nhưng vẫn sang.",
    en: "Eight candle streaks travel across a long mirror like wordless messages, petals pulled into motion lines; fast momentum while staying refined."
  },
  "minor-wands-nine": {
    vi: "Một chân dung mệt nhưng tỉnh táo đứng sau chín que nến đã cháy thấp, tay giữ ruy băng không cho tuột khỏi gương; sức bền và cảnh giác cảm xúc.",
    en: "A tired but alert portrait stands behind nine low-burning candles, holding a ribbon so it will not slip from the mirror; endurance and emotional vigilance."
  },
  "minor-wands-ten": {
    vi: "Mười cây nến tắt dần được gom trong khay rose-gold trước gương, khói mỏng che nửa khuôn mặt phản chiếu; gánh nặng của đam mê cần được đặt xuống.",
    en: "Ten fading candles gathered in a rose-gold tray before a mirror, thin smoke veiling half the reflected face; the burden of passion asks to be set down."
  },
  "minor-wands-page": {
    vi: "Chân dung trẻ tò mò trong áo lụa hồng trầm, cầm que diêm chưa quẹt trước gương bỏ túi; ánh mắt háo hức, sáng tạo, chưa vội hứa.",
    en: "A curious young portrait in muted rose silk holds an unstruck match before a pocket mirror; eager, creative, not yet making promises."
  },
  "minor-wands-knight": {
    vi: "Chân dung chuyển động với áo choàng lụa như lửa nến, tay cầm ruy băng đỏ hồng phản chiếu trong gương dài; hóa học mạnh, cần hướng đi rõ.",
    en: "A kinetic portrait with silk cloak like candle flame, holding a red-rose ribbon reflected in a tall mirror; strong chemistry needing direction."
  },
  "minor-wands-queen": {
    vi: "Một nữ hoàng nội lực ngồi bên gương tròn, tóc điểm gai hồng và ánh nến, tay mở nhẹ như mời nhưng không nhượng ranh giới; quyến rũ tự chủ.",
    en: "An inwardly powerful queen sits beside a round mirror, hair touched with rose thorns and candlelight, one hand open in invitation without surrendering boundaries."
  },
  "minor-wands-king": {
    vi: "Một chân dung uy nghiêm trước gương khói, nhiều nến được đặt thành đường dẫn có trật tự; động lực đam mê được lãnh đạo bằng sự chín chắn.",
    en: "A regal portrait before a smoky mirror, candles arranged into an ordered path; passionate momentum led with maturity."
  },
  "minor-cups-ace": {
    vi: "Một chén thủy tinh rose-gold đầy nước phản chiếu gương oval và nụ hồng nổi; giọt sáng ngà tràn nhẹ như cảm xúc mới được phép xuất hiện.",
    en: "A rose-gold glass cup filled with water reflects an oval mirror and floating rosebud; ivory light gently overflows like a new feeling allowed to emerge."
  },
  "minor-cups-two": {
    vi: "Hai chén nước đặt trước hai gương nhỏ, mỗi chén phản chiếu bàn tay của người kia mà không hòa lẫn; thân mật, đối xứng, có ranh giới.",
    en: "Two water cups sit before two small mirrors, each cup reflecting the other's hand without merging; intimacy, symmetry, and boundaries."
  },
  "minor-cups-three": {
    vi: "Ba lọ nước hoa nhỏ và ba gương bỏ túi tạo thành vòng trên khăn lụa, cánh hồng rải nhẹ như lời chúc kín đáo; niềm vui bạn bè và nâng đỡ cảm xúc.",
    en: "Three small perfume bottles and three pocket mirrors form a circle on silk, petals scattered like private blessings; friendship joy and emotional support."
  },
  "minor-cups-four": {
    vi: "Một người ngồi bên gương mờ, ba chén phản chiếu sau lưng và một chén sáng đặt gần tay nhưng chưa chạm; sự khép lại nhẹ nhàng trước lời mời mới.",
    en: "A figure sits beside a fogged mirror, three cups reflected behind and one glowing cup near the hand but untouched; gentle withdrawal before a new offer."
  },
  "minor-cups-five": {
    vi: "Năm chén thủy tinh trên bàn gương, hai chén còn đầy phía xa, ba chén đổ tạo vệt nước hồng trầm; buồn tiếc được nhìn bằng lòng dịu.",
    en: "Five glass cups on a mirrored table, two still full in the distance and three spilled into muted rose water; grief seen with tenderness."
  },
  "minor-cups-six": {
    vi: "Một gương cổ phản chiếu ký ức mềm: hai bàn tay trẻ đặt cánh hồng vào chén nước; màu ngà ấm, hoài niệm nhưng không mắc kẹt.",
    en: "An antique mirror reflects a soft memory: young hands placing petals into a water cup; warm ivory nostalgia without being trapped in the past."
  },
  "minor-cups-seven": {
    vi: "Bảy lọ thủy tinh phản chiếu bảy khả năng trong gương mờ: ngọc trai, chìa khóa, hoa, khăn lụa, nến, nước, khoảng trống; đẹp nhưng khó chọn.",
    en: "Seven glass bottles reflect seven possibilities in a fogged mirror: pearl, key, flower, silk, candle, water, empty space; beautiful but hard to choose."
  },
  "minor-cups-eight": {
    vi: "Tám chén nước xếp lại trên bàn, một nhân vật trong gương quay đi với áo lụa tối; cánh hồng dẫn ra khỏi vùng quen thuộc của cảm xúc cũ.",
    en: "Eight water cups remain on the table while a reflected figure turns away in dark silk; petals lead out of the familiar room of old feeling."
  },
  "minor-cups-nine": {
    vi: "Chín chén nhỏ như lọ hương đặt thành vòm quanh gương, chân dung phản chiếu thư thái với nụ cười rất nhẹ; thỏa mãn riêng tư và tự đủ.",
    en: "Nine small cups like fragrance vessels form an arch around a mirror, the reflected portrait relaxed with a very slight smile; private contentment and enoughness."
  },
  "minor-cups-ten": {
    vi: "Mười chén nước phản chiếu thành dải sáng hồng ngà trên gương dài, nhiều bàn tay khác nhau cùng đặt cánh hồng vào vòng tròn; cảm giác thuộc về an toàn.",
    en: "Ten cups reflect into a rose-ivory arc across a long mirror, different hands placing petals into a circle; safe belonging."
  },
  "minor-cups-page": {
    vi: "Chân dung trẻ mơ mộng nhìn vào chén nước như chiếc gương nhỏ, một cánh hồng nổi tạo hình trái tim không hoàn hảo; cảm xúc mới và lời nhắn dịu.",
    en: "A dreamy young portrait looks into a water cup like a small mirror, one petal forming an imperfect heart; new feeling and a gentle message."
  },
  "minor-cups-knight": {
    vi: "Một chân dung lãng mạn cầm lọ nước hoa trước gương, áo lụa chuyển động như nước; ánh mắt chân thành nhưng cần đi chậm.",
    en: "A romantic portrait carries a perfume bottle before a mirror, silk moving like water; sincere gaze, but needing to move slowly."
  },
  "minor-cups-queen": {
    vi: "Một nữ hoàng cảm xúc ngồi cạnh bát nước phản chiếu trăng mờ, tay chạm ngọc trai và cánh hồng; sâu sắc, bao dung, biết giữ lòng mình.",
    en: "An emotional queen sits beside a water bowl reflecting a blurred moon, touching pearls and petals; deep, compassionate, and protective of her own heart."
  },
  "minor-cups-king": {
    vi: "Một chân dung điềm tĩnh trước gương đen, quanh bàn là các chén nước yên không gợn; cảm xúc lớn được chứa bằng sự trưởng thành.",
    en: "A calm portrait before a black mirror, still water cups arranged around the table; large feeling contained with maturity."
  },
  "minor-swords-ace": {
    vi: "Một trâm bạc sắc như lưỡi kiếm đặt dọc giữa gương, chia lớp sương hồng thành hai phần rõ; sự thật sạch, sáng và không tàn nhẫn.",
    en: "A silver hairpin sharp as a blade lies down the center of a mirror, dividing rose mist into two clear fields; truth that is clean, bright, and not cruel."
  },
  "minor-swords-two": {
    vi: "Hai gương cầm tay che hai phía khuôn mặt phản chiếu, hai trâm bạc bắt chéo trên khăn lụa; do dự vì cần lắng nghe cả trái tim lẫn sự thật.",
    en: "Two hand mirrors cover both sides of a reflected face, two silver hairpins crossed on silk; indecision that needs both heart and truth."
  },
  "minor-swords-three": {
    vi: "Ba trâm bạc xuyên qua một mảnh lụa hồng đặt trước gương nứt nhẹ, không có trái tim bị đâm; đau lòng được diễn tả bằng vải, kính và ánh sáng.",
    en: "Three silver pins pierce a rose silk piece before a lightly cracked mirror, with no pierced heart; heartbreak expressed through fabric, glass, and light."
  },
  "minor-swords-four": {
    vi: "Bốn trâm bạc nằm song song bên cạnh gương phủ khăn lụa, một cây nến thấp cháy yên; nghỉ ngơi để lời thật có thể lắng xuống.",
    en: "Four silver pins rest parallel beside a silk-covered mirror, one low candle burning steadily; rest so truth can settle."
  },
  "minor-swords-five": {
    vi: "Năm mảnh gương nhỏ phản chiếu một chiếc ruy băng bị cắt, ánh sáng sắc nhưng căn phòng im; thắng thua để lại khoảng cách cần được nhìn nhận.",
    en: "Five small mirror shards reflect a cut ribbon, light sharp while the room stays silent; winning and losing leave distance that must be acknowledged."
  },
  "minor-swords-six": {
    vi: "Sáu trâm bạc đặt trong hộp nhung, một gương nhỏ phản chiếu dòng nước tối hồng như chuyến rời đi lặng lẽ; chuyển sang nơi an toàn hơn.",
    en: "Six silver pins rest in a velvet box, a small mirror reflecting dark rose water like a quiet departure; moving toward safer ground."
  },
  "minor-swords-seven": {
    vi: "Bảy mảnh kính được giấu một phần dưới khăn lụa, một bàn tay kéo gương bỏ túi khỏi bóng tối; chiến lược, bí mật và nhu cầu trung thực với chính mình.",
    en: "Seven glass shards are partly hidden under silk, a hand drawing a pocket mirror out of shadow; strategy, secrecy, and the need for self-honesty."
  },
  "minor-swords-eight": {
    vi: "Tám dải ruy băng hồng trầm vắt qua gương như những đường cấm, chân dung phía sau nhìn thấy khe sáng nhỏ; cảm giác mắc kẹt nhưng vẫn có lối nhìn khác.",
    en: "Eight muted-rose ribbons cross a mirror like forbidden lines, the portrait behind seeing a narrow light gap; feeling trapped while another view remains possible."
  },
  "minor-swords-nine": {
    vi: "Chín vệt sáng mảnh phản chiếu trên gương đầu giường, một người thức trong bóng nến thấp; lo âu được giữ dịu, không kinh dị.",
    en: "Nine thin light marks reflect on a bedside mirror while a figure lies awake in low candlelight; anxiety held gently, never horrific."
  },
  "minor-swords-ten": {
    vi: "Mười trâm bạc đã được đặt xuống bên cạnh gương nứt, khăn lụa phủ lên phần sắc nhất; kết thúc đau nhưng căn phòng bắt đầu sáng lại.",
    en: "Ten silver pins have been set down beside a cracked mirror, silk covering the sharpest part; a painful ending as the room begins to brighten."
  },
  "minor-swords-page": {
    vi: "Chân dung trẻ sắc sảo quan sát gương cầm tay, tay cầm trâm bạc như bút nhưng không viết chữ; tò mò, tỉnh táo, học cách nói thật.",
    en: "A sharp young portrait studies a hand mirror, holding a silver pin like a pen without writing; curious, alert, learning how to speak truth."
  },
  "minor-swords-knight": {
    vi: "Một chân dung lao về phía gương dài, áo lụa cắt thành đường chéo ánh sáng, trâm bạc trong tay; sự thật đến nhanh, cần mềm lại trước khi làm đau.",
    en: "A portrait rushes toward a tall mirror, silk garment cutting diagonal light, silver pin in hand; truth arrives fast and must soften before it wounds."
  },
  "minor-swords-queen": {
    vi: "Một nữ hoàng rõ ràng ngồi trước gương sáng, tay cầm trâm bạc và cành hồng đã tỉa gai; lòng trắc ẩn đi cùng tiêu chuẩn sắc nét.",
    en: "A clear-eyed queen sits before a bright mirror, holding a silver pin and a rose stem with thorns trimmed; compassion paired with precise standards."
  },
  "minor-swords-king": {
    vi: "Một chân dung trầm tĩnh trước gương vuông, bốn góc có ánh bạc và rose-gold cân bằng; quyết định sáng suốt, lời nói có trách nhiệm.",
    en: "A composed portrait before a square mirror, silver and rose-gold light balanced at the corners; wise decision and responsible speech."
  },
  "minor-pentacles-ace": {
    vi: "Một đồng xu rose-gold nằm trong hộp nhung mở trước gương, phản chiếu thành nụ hồng ngà; cơ hội mới cho giá trị bản thân và sự chăm sóc.",
    en: "A rose-gold coin rests in an open velvet box before a mirror, reflected as an ivory rosebud; a new opportunity for self-worth and care."
  },
  "minor-pentacles-two": {
    vi: "Hai đồng xu nhỏ cân bằng trên ruy băng uốn hình vô cực trước gương bàn, bên cạnh là chìa khóa và lọ hương; giữ nhịp giữa nhu cầu và nguồn lực.",
    en: "Two small coins balance on an infinity-shaped ribbon before a tabletop mirror, beside a key and fragrance bottle; balancing needs and resources."
  },
  "minor-pentacles-three": {
    vi: "Ba bàn tay cùng đặt ngọc trai, chìa khóa và đồng xu quanh gương trang điểm, không chữ, không bản vẽ; hợp tác tinh tế để xây điều đáng quý.",
    en: "Three hands place a pearl, key, and coin around a vanity mirror, with no writing or blueprint; refined collaboration to build what matters."
  },
  "minor-pentacles-four": {
    vi: "Bốn đồng xu rose-gold được giữ sát quanh gương nhỏ, một bàn tay khép hộp nhung hơi chặt; tự bảo vệ và nỗi sợ mất giá trị.",
    en: "Four rose-gold coins are held close around a small mirror, a hand closing the velvet box a little too tightly; self-protection and fear of losing value."
  },
  "minor-pentacles-five": {
    vi: "Năm đồng xu mờ nằm ngoài vùng sáng của gương, một chiếc khăn lụa ấm được để gần mép bàn như lời mời hỗ trợ; thiếu thốn nhưng không bị bỏ rơi.",
    en: "Five dim coins sit outside the mirror's warm light, a soft silk cloth placed near the table edge as an offer of support; scarcity without abandonment."
  },
  "minor-pentacles-six": {
    vi: "Sáu đồng xu và sáu viên ngọc trai được chia đều trên khay gương, hai bàn tay trao nhận trong ánh nến; hào phóng có cân bằng.",
    en: "Six coins and six pearls are evenly shared on a mirrored tray, two hands giving and receiving in candlelight; generosity with balance."
  },
  "minor-pentacles-seven": {
    vi: "Bảy đồng xu nhỏ đặt cạnh chậu hồng trong phòng gương, một người quan sát mầm cây qua phản chiếu; kiên nhẫn với giá trị đang lớn lên.",
    en: "Seven small coins rest beside a potted rose in a mirror room, a figure watching the sprout through reflection; patience with value that is growing."
  },
  "minor-pentacles-eight": {
    vi: "Tám mặt gương nhỏ đang được đánh bóng từng chiếc trên khăn nhung, bên cạnh là dụng cụ mảnh và cánh hồng khô; luyện tập sự chăm chút.",
    en: "Eight small mirrors are polished one by one on velvet, beside delicate tools and dried petals; practicing devotion to craft and care."
  },
  "minor-pentacles-nine": {
    vi: "Một chân dung tự đủ trong áo lụa đứng bên gương cao, chín viên ngọc trai và đồng xu xếp quanh lọ hương; vẻ đẹp của sự độc lập mềm mại.",
    en: "A self-possessed portrait in silk stands beside a tall mirror, nine pearls and coins arranged around a fragrance bottle; the beauty of soft independence."
  },
  "minor-pentacles-ten": {
    vi: "Mười đồng xu rose-gold đặt thành cây gia phả trừu tượng quanh gương cổ, nhiều khung ảnh trống và cánh hồng khô; di sản cảm xúc và sự an toàn lâu dài.",
    en: "Ten rose-gold coins form an abstract family tree around an antique mirror, with empty frames and dried petals; emotional legacy and lasting security."
  },
  "minor-pentacles-page": {
    vi: "Chân dung trẻ nâng một đồng xu trước gương bỏ túi như đang học giá trị của mình, mắt sáng và thận trọng; bắt đầu chăm sóc điều thật.",
    en: "A young portrait lifts one coin before a pocket mirror as if studying their own value, bright-eyed and careful; beginning to care for what is real."
  },
  "minor-pentacles-knight": {
    vi: "Một chân dung bền bỉ đặt từng chiếc chìa khóa lên khay gương, áo nhung tối và ánh nến đều; tiến chậm, đáng tin, biết giữ lời.",
    en: "A steadfast portrait places keys one by one onto a mirrored tray, dark velvet and steady candlelight; slow, reliable movement that keeps promises."
  },
  "minor-pentacles-queen": {
    vi: "Một nữ hoàng ấm áp ngồi bên hộp nhung mở, tay chạm đồng xu, ngọc trai và cành hồng đã chăm; sự sung túc bắt đầu từ tự chăm sóc.",
    en: "A warm queen sits beside an open velvet box, touching a coin, pearls, and a tended rose branch; abundance begins with self-care."
  },
  "minor-pentacles-king": {
    vi: "Một chân dung vững chãi trước gương khung nặng rose-gold, chìa khóa, đồng xu và khăn lụa được xếp ngăn nắp; giá trị ổn định, hào phóng và có trách nhiệm.",
    en: "A grounded portrait before a heavy rose-gold mirror frame, keys, coins, and silk arranged with order; stable, generous, responsible value."
  }
};

const technicalVi = "Thiết kế inner artwork theo phong cách premium mystical editorial, tỷ lệ chân dung tarot, bố cục trung tâm với nhiều khoảng thở, nền than đen pha hồng trầm, ánh nến champagne, gương cổ, rose-gold, lụa và cánh hồng khô. Không tạo khung bài, không viền, không tiêu đề, không số, không chữ, không watermark, không sao chép Rider-Waite, không giống người nổi tiếng.";
const technicalEn = "Design inner artwork in a premium mystical editorial tarot portrait ratio, centered composition with generous negative space, charcoal and muted rose atmosphere, champagne candlelight, antique mirror surfaces, rose-gold, silk, and dried petals. No card frame, no border, no title, no numbers, no text, no watermark, no Rider-Waite copy, no celebrity likeness.";

const designs = JSON.parse(fs.readFileSync(DESIGNS_PATH, "utf8"));
const rose = designs.find((deck) => deck.deckId === "rose-mirror");

if (!rose) {
  throw new Error("Missing rose-mirror design set");
}

const missing = rose.cards.map((card) => card.cardId).filter((cardId) => !sceneByCardId[cardId]);
if (missing.length > 0) {
  throw new Error(`Missing Rose Mirror scenes: ${missing.join(", ")}`);
}

rose.style = style;
rose.cardBackPrompt = cardBackPrompt;
rose.cards = rose.cards.map((card) => {
  const scene = sceneByCardId[card.cardId];
  return {
    ...card,
    visualPrompt: {
      vi: `${style.vi}. ${scene.vi} ${technicalVi}`,
      en: `${style.en}. ${scene.en} ${technicalEn}`
    },
    testingStatus: "ready_for_visual_prototype"
  };
});

fs.writeFileSync(DESIGNS_PATH, `${JSON.stringify(designs, null, 2)}\n`, "utf8");
console.log(`Updated ${rose.cards.length} Rose Mirror card prompts in ${DESIGNS_PATH}`);
