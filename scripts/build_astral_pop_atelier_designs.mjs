import fs from "node:fs";

const CARDS_PATH = "packages/content/data/tarot-cards.json";
const OUT_PATH = "assets/tarot/astral-pop-atelier/astral-pop-atelier-full-deck-manifest.json";

const localized = (vi, en) => ({ vi, en });

const baseTechnical = {
  vi: "Thiết kế inner artwork theo phong cách premium mystical anime editorial, tỉ lệ chân dung tarot cho artwork slot 656 x 1130px, bố cục trung tâm có nhiều khoảng thở, silhouette rõ khi thu nhỏ. Palette charcoal black, ink indigo, soft ivory, champagne gold, astral cyan, coral rose, star lemon; hiệu ứng holographic chỉ là ánh phản chiếu tinh tế. Không tạo khung bài, không viền, không tiêu đề, không số, không chữ, không watermark, không sao chép Rider-Waite, không giống nhân vật anime nổi tiếng, không celebrity likeness, không school uniform, không trẻ con hóa, không sexualized styling, không horror occult.",
  en: "Design inner artwork in a premium mystical anime editorial style, tarot portrait ratio for the 656 x 1130px artwork slot, centered composition with generous negative space, clear silhouette when scaled down. Palette of charcoal black, ink indigo, soft ivory, champagne gold, astral cyan, coral rose, star lemon; holographic effects only as refined reflections. No card frame, no border, no title, no numbers, no text, no watermark, no Rider-Waite copy, no famous anime character resemblance, no celebrity likeness, no school uniform, no childlike treatment, no sexualized styling, no horror occult imagery."
};

const majorScenes = {
  "major-00-fool": {
    portrait: localized(
      "Một người trẻ vừa bước vào xưởng sao, mắt sáng vì tò mò, balo mở hé với vài charm phát sáng. Nhân vật không ngây ngô mà là người dám thử, đang đứng ở ngưỡng cửa giữa đời cũ và một bản đồ mới.",
      "A young seeker entering the star atelier, eyes bright with curiosity, an open backpack holding glowing charms. The character is not naive; they are brave enough to try, standing between an old life and a new map."
    ),
    story: localized(
      "The Fool trong Astral Pop Atelier là khoảnh khắc bạn bước vào điều chưa biết với trái tim còn run nhưng vẫn mở. Lá bài không hứa rằng mọi thứ sẽ dễ, chỉ nhắc rằng đôi khi bản sắc mới bắt đầu từ một bước thử rất nhỏ.",
      "The Fool in Astral Pop Atelier is the moment of entering the unknown with a trembling but open heart. The card does not promise ease; it reminds you that a new identity can begin with one small experiment."
    ),
    scene: localized(
      "Một người trẻ đứng ở ngưỡng cửa atelier sau nửa đêm, phía trước là sàn indigo phản chiếu sao, phía sau là thành phố tối mềm, balo mở hé với charm ngôi sao, tai nghe pha lê và mảnh bản đồ sao phát sáng. Gió nhẹ kéo dải ruy băng cyan-coral thành đường chuyển động, ánh champagne gold viền quanh dáng nhân vật.",
      "A young seeker stands at the doorway of a midnight atelier, an indigo floor reflecting stars ahead, a soft dark city behind, an open backpack with star charms, crystal headphones, and a glowing personal star-map fragment. A light breeze pulls cyan-coral ribbons into motion, champagne-gold edge light tracing the figure."
    )
  },
  "major-01-magician": {
    portrait: localized(
      "Một creator trẻ đứng bên bàn làm việc ánh sao, gom bốn vật biểu tượng thành một vòng sáng: bút ánh sáng, cốc nước trăng, lưỡi giấy bạc và đồng xu sao. Ánh mắt tập trung, tự chủ, biết mình có công cụ để bắt đầu.",
      "A young creator at a starlit worktable, gathering four symbolic tools into one glow: a light pen, moon-water cup, silver paper blade, and star coin. Focused, self-possessed, aware that they already have tools to begin."
    ),
    story: localized(
      "The Magician là lúc người dùng nhận ra mình không thiếu năng lực, chỉ cần gom động lực vào một ý định rõ. Trong deck này, phép thuật không phải quyền năng bên ngoài mà là khả năng biến cảm xúc thành hành động có hình dạng.",
      "The Magician is the moment of realizing you are not without power; you need to gather your momentum toward one clear intention. Here, magic is not external power but the ability to shape feeling into action."
    ),
    scene: localized(
      "Một creator trẻ đứng trước bàn atelier hình bán nguyệt, tay nâng bút ánh sáng vẽ một vòng sao mảnh trong không khí. Trên bàn có bốn vật được sắp cân bằng: glow baton như Wands, cốc nước trăng như Cups, lưỡi giấy bạc như Swords, đồng xu sao như Pentacles. Nền charcoal và ink indigo, ánh cyan và star lemon phản chiếu trên mặt bàn, coral rose chỉ là điểm nhấn nhỏ.",
      "A young creator stands at a crescent atelier desk, lifting a light pen that draws a thin star circle in the air. Four balanced tools rest on the desk: a glow baton for Wands, moon-water cup for Cups, silver paper blade for Swords, star coin for Pentacles. Charcoal and ink-indigo ground, cyan and star-lemon reflections on the desk, coral rose as a small accent only."
    )
  },
  "major-02-high-priestess": {
    portrait: localized(
      "Một người giữ thư viện cảm xúc ngồi sau rèm ánh sao, khuôn mặt bình tĩnh, tay đặt lên tai nghe pha lê như đang nghe tiếng nói bên trong. Phía sau là hai màn sương sáng nhưng không có chữ.",
      "A keeper of the emotional library sits behind starlit curtains, calm-faced, one hand on crystal headphones as if listening inward. Behind them are two luminous mist panels with no readable text."
    ),
    story: localized(
      "The High Priestess là khoảng lặng giữa các thông báo, nơi trực giác chưa cần giải thích ngay. Lá bài này mời người dùng lắng nghe điều mình đã biết từ lâu nhưng chưa dám tin.",
      "The High Priestess is the quiet between notifications, where intuition does not need immediate explanation. The card invites the user to listen to what they have long sensed but not yet trusted."
    ),
    scene: localized(
      "Một người giữ thư viện cảm xúc ngồi trong phòng yên tĩnh của atelier, rèm ánh sao cyan rơi mềm hai bên, tay chạm vào tai nghe pha lê, mắt nhìn xuống mặt nước đen phản chiếu trăng mờ. Phía sau có hai mảng sáng dọc như cánh cửa trực giác nhưng không có chữ hay ký hiệu đọc được.",
      "A keeper of the emotional library sits in a quiet atelier room, cyan starlight curtains falling softly on both sides, one hand touching crystal headphones, eyes lowered toward black water reflecting a blurred moon. Behind them, two vertical light panels suggest doors of intuition but contain no readable symbols or text."
    )
  },
  "major-03-empress": {
    portrait: localized(
      "Một người sáng tạo dịu dàng chăm sóc khu vườn holographic trong atelier, tay nâng chậu cây sao đang nở. Nhân vật mang động lực nuôi dưỡng, tự chăm sóc, sáng tạo mềm nhưng không yếu.",
      "A tender creator tending a holographic garden inside the atelier, holding a blooming star plant. The figure carries nurturing, self-care, and soft creativity without weakness."
    ),
    story: localized(
      "The Empress trong deck này là lời nhắc rằng điều được chăm sóc sẽ lớn lên, kể cả bản thân. Vẻ đẹp của lá bài không nằm ở sự hoàn hảo mà ở khả năng cho cảm xúc một nơi an toàn để nở.",
      "The Empress in this deck reminds us that what is tended will grow, including the self. Its beauty is not perfection but the ability to give feeling a safe place to bloom."
    ),
    scene: localized(
      "Một người sáng tạo dịu dàng ngồi trong khu vườn holographic nhỏ bên trong atelier, tay nâng chậu cây sao đang nở thành hoa cyan và coral rose. Xung quanh là vải ivory, dây charm vàng champagne, vài cánh sáng như cánh hoa nổi chậm trong không khí. Nền charcoal và ink indigo giữ cảm giác premium, ánh sáng mềm như sau nửa đêm.",
      "A tender creator sits in a small holographic garden inside the atelier, holding a star plant blooming into cyan and coral-rose flowers. Around them are ivory fabric, champagne-gold charm chains, and a few petal-like light fragments drifting slowly. Charcoal and ink-indigo ground keeps the premium mood, with soft after-midnight light."
    )
  },
  "major-04-emperor": {
    portrait: localized(
      "Một kiến trúc sư trẻ của ranh giới ngồi trước mô hình thành phố sao, áo khoác có đường cắt gọn, tay đặt lên khối lập phương ánh vàng. động lực vững, bảo vệ, có cấu trúc nhưng không cứng lạnh.",
      "A young architect of boundaries sits before a star-city model, wearing a clean-cut jacket, one hand on a gold-lit cube. Steady, protective, structured, but not cold."
    ),
    story: localized(
      "The Emperor là phần trong ta biết đặt cấu trúc để tự do có nơi đứng. Trong Astral Pop Atelier, quyền lực đẹp nhất là khả năng tạo khung an toàn cho điều mình đang xây.",
      "The Emperor is the part of us that sets structure so freedom has somewhere to stand. In Astral Pop Atelier, the best power is the ability to create a safe frame for what we are building."
    ),
    scene: localized(
      "Một kiến trúc sư trẻ ngồi trước mô hình thành phố sao trên bàn atelier, các đường grid cyan và champagne gold tạo thành khối lập phương, cầu thang ánh sáng và cửa vòm nhỏ. Nhân vật mặc áo khoác tối có đường cắt gọn, tay đặt lên một khối vàng sáng như viên đá nền tảng, ánh mắt bình tĩnh và bảo vệ.",
      "A young architect sits before a star-city model on an atelier desk, cyan and champagne-gold grid lines forming a cube, light stairs, and small arches. The figure wears a dark clean-cut jacket, one hand resting on a glowing gold cube like a foundation stone; the hand must show exactly five natural fingers with the thumb visible and no extra finger-like highlights, gaze calm and protective."
    )
  },
  "major-05-hierophant": {
    portrait: localized(
      "Một mentor trẻ-trưởng-thành đang dẫn một khoảnh khắc học hỏi trong thư viện atelier, không giáo điều mà rất ấm. Nhân vật giữ một cuốn sổ trống và mời người xem tự viết nguyên tắc của mình.",
      "A young-adult mentor guiding a learning reflection in the atelier library, warm rather than dogmatic. The figure holds a blank notebook and invites the viewer to write their own principles."
    ),
    story: localized(
      "The Hierophant ở đây không ép người dùng đi theo truyền thống cứng nhắc. Lá bài hỏi: nguyên tắc nào thật sự giúp bạn sống rõ hơn, và điều gì chỉ là tiếng ồn thừa kế?",
      "The Hierophant here does not force rigid tradition. It asks which principles truly help you live more clearly, and which inherited noise can be released."
    ),
    scene: localized(
      "Một mentor trong thư viện atelier thắp hai đèn sao trên bàn, phía sau là kệ sách trừu tượng và các khung note hoàn toàn trống, không chữ. Nhân vật đặt một cuốn sổ trắng cạnh chén trà trăng, ánh champagne gold tạo cảm giác khoảnh khắc học hỏi thân mật.",
      "A mentor in the atelier library lights two star lamps on a table, with abstract bookshelves and completely blank note frames behind. The figure sets a blank notebook beside moon tea, champagne-gold light creating an intimate learning reflection."
    )
  },
  "major-06-lovers": {
    portrait: localized(
      "Hai nhân vật hoặc hai phiên bản của cùng một trái tim đứng trước cửa sổ sao, gần nhau nhưng vẫn có khoảng thở. Lá bài nhấn vào lựa chọn có ý thức, kết nối và giá trị cá nhân.",
      "Two figures, or two versions of one heart, stand before a star window, close but with breathing room. The card emphasizes conscious choice, connection, and personal values."
    ),
    story: localized(
      "The Lovers không chỉ là tình yêu, mà là khoảnh khắc chọn điều phù hợp với giá trị sâu nhất. Trong Astral Pop Atelier, kết nối đẹp là kết nối còn giữ được sự thật của mỗi người.",
      "The Lovers is not only romance; it is the moment of choosing what aligns with deeper values. In Astral Pop Atelier, beautiful connection still preserves each person's truth."
    ),
    scene: localized(
      "Hai nhân vật đứng ở hai phía cửa sổ atelier hình vòm, tay gần chạm nhưng giữa họ là một chòm sao nhỏ tạo khoảng thở. Một dải ruy băng coral rose mở nút trên nền indigo, ánh cyan và champagne gold phản chiếu thành hai quỹ đạo gặp nhau.",
      "Two figures stand on opposite sides of an arched atelier window, hands nearly touching while a small constellation creates breathing room between them. An untied coral-rose ribbon rests on indigo ground, cyan and champagne-gold reflections forming two meeting orbits."
    )
  },
  "major-07-chariot": {
    portrait: localized(
      "Một nhân vật quyết đoán điều khiển chiếc xe ánh sáng trừu tượng tạo từ hai luồng sao trái chiều. Gương mặt tập trung, không hiếu thắng, đang học cách dẫn động lực đi cùng một hướng.",
      "A determined figure steers an abstract light vehicle formed from two opposing star streams. Focused rather than aggressive, they are learning to direct momentum toward one path."
    ),
    story: localized(
      "The Chariot là lúc nhiều phần trong bạn cùng muốn kéo đi. Lá bài mời bạn chọn hướng đi đủ rõ để tốc độ không biến thành kiệt sức.",
      "The Chariot appears when many parts of you pull in different directions. It invites a direction clear enough that speed does not become exhaustion."
    ),
    scene: localized(
      "Một nhân vật đứng trong studio chuyển động, tay giữ hai dây sáng cyan và coral rose đang kéo về hai phía, dưới chân là đường ray sao dẫn ra ngoài cửa atelier. Ánh champagne gold khóa hai luồng động lực vào một trục thẳng, tạo cảm giác tiến lên có chủ đích.",
      "A figure stands in a motion studio, holding two light reins, cyan and coral rose, pulling in opposite directions, with a star rail beneath their feet leading out of the atelier door. Champagne-gold light locks both energies into one axis, creating purposeful movement."
    )
  },
  "major-08-strength": {
    portrait: localized(
      "Một nhân vật dịu nhưng vững ôm một khối sáng đang rung, giống như ôm lấy phần cảm xúc hoang dại của mình. Sức mạnh đến từ sự mềm có ranh giới.",
      "A gentle but steady figure holds a trembling light form, like embracing their own wild feeling. Strength comes from softness with boundaries."
    ),
    story: localized(
      "Strength trong deck này không cần tiếng gầm. Nó là khả năng ở lại với cảm xúc mạnh mà không để cảm xúc điều khiển toàn bộ mình.",
      "Strength in this deck does not need a roar. It is the ability to stay with intense feeling without letting it control the whole self."
    ),
    scene: localized(
      "Một nhân vật quỳ trong vùng ánh sáng mềm, hai tay ôm một sinh thể ánh sao trừu tượng như trái tim đang rung, không phải động vật thật. Dải ruy băng cyan quấn nhẹ quanh cả hai như ranh giới an toàn, coral rose phát sáng ở ngực nhân vật.",
      "A figure kneels in soft light, holding an abstract star-being like a trembling heart, not a real animal. A cyan ribbon gently circles both as a safe boundary, coral rose glowing at the figure's chest."
    )
  },
  "major-09-hermit": {
    portrait: localized(
      "Một nhân vật ngồi một mình trên gác atelier, soi đèn sao vào cuốn sổ trống. Sự cô đơn ở đây không lạnh, mà là không gian để nghe lại tiếng mình.",
      "A figure sits alone in the atelier loft, shining a star lamp onto a blank notebook. Solitude is not cold here; it is space to hear the self again."
    ),
    story: localized(
      "The Hermit mời người dùng tạm rời khỏi tiếng ồn để tìm lại ánh sáng riêng. Lá bài không cổ vũ cô lập, chỉ cho thấy một khoảng lặng có thể tự chăm sóc.",
      "The Hermit invites the user to step away from noise and find their own light again. It does not praise isolation; it shows how quiet can heal."
    ),
    scene: localized(
      "Một nhân vật ngồi trên gác xép atelier, cầm đèn lồng sao nhỏ chiếu xuống cuốn sổ trắng và bản đồ sao chưa hoàn thành. Thành phố xa mờ qua cửa sổ indigo, các hạt sáng cyan lơ lửng như câu hỏi yên tĩnh.",
      "A figure sits in the atelier loft, holding a small star lantern over a blank notebook and unfinished star map. A distant city blurs through an indigo window, cyan light particles floating like quiet questions."
    )
  },
  "major-10-wheel": {
    portrait: localized(
      "Một nhân vật đứng trước vòng quay charm sao, nơi các biểu tượng cảm xúc đang đổi vị trí. Ánh mắt không hoảng loạn; họ đang học cách đi cùng chu kỳ.",
      "A figure stands before a wheel of star charms where emotional symbols are changing places. Their gaze is not panicked; they are learning to move with cycles."
    ),
    story: localized(
      "Wheel of Fortune trong Astral Pop Atelier là lời nhắc rằng nhịp đời đang xoay. Người dùng không cần kiểm soát toàn bộ vòng quay, chỉ cần nhận ra điểm mình có thể chọn.",
      "Wheel of Fortune in Astral Pop Atelier reminds us that life is turning. The user does not need to control the whole wheel, only recognize where choice is possible."
    ),
    scene: localized(
      "Một vòng charm sao treo giữa atelier xoay quanh nhân vật: tai nghe pha lê, cốc nước trăng, bút ánh sáng, đồng xu sao và mảnh gương nhỏ. Các biểu tượng đổi vị trí trong quỹ đạo cyan-coral, nền indigo có texture giấy.",
      "A wheel of star charms hangs in the atelier around the figure: crystal headphones, moon-water cup, light pen, star coin, and a small mirror shard. The figure's visible hand must show exactly five natural fingers with no extra finger-like highlights. The symbols shift positions in a cyan-coral orbit over indigo paper texture."
    )
  },
  "major-11-justice": {
    portrait: localized(
      "Một nhân vật đứng giữa hai mặt phản chiếu: một bên là trái tim sáng, một bên là đường grid sự thật. Dáng đứng thẳng nhưng không phán xét.",
      "A figure stands between two reflections: one showing a luminous heart, the other a truth grid. Their posture is upright but not judgmental."
    ),
    story: localized(
      "Justice hỏi người dùng nhìn rõ cả cảm xúc lẫn trách nhiệm. Công bằng ở đây không phải tự trách, mà là đủ trung thực để chọn điều mình có thể đứng sau.",
      "Justice asks the user to see both feeling and responsibility. Fairness here is not self-blame, but enough honesty to choose what they can stand behind."
    ),
    scene: localized(
      "Một nhân vật đứng giữa hai tấm kính ánh sao đối xứng; bên trái phản chiếu trái tim coral rose mềm, bên phải phản chiếu lưới cyan sắc nét. Một tia champagne gold nằm ngang như cán cân ánh sáng nhưng không tạo biểu tượng cân truyền thống.",
      "A figure stands between two symmetrical star-glass panels; the left reflects a soft coral-rose heart, the right a precise cyan grid. A champagne-gold light beam rests horizontally like balance, without forming a traditional scale symbol."
    )
  },
  "major-12-hanged-man": {
    portrait: localized(
      "Một nhân vật lơ lửng trong phòng không trọng lực của atelier, nhìn thế giới từ góc đảo ngược nhưng gương mặt rất bình thản. Lá bài nói về tạm dừng để đổi góc nhìn.",
      "A figure floats in the atelier's zero-gravity room, seeing the world upside down with a calm face. The card speaks of pausing to change perspective."
    ),
    story: localized(
      "The Hanged Man không phải bế tắc, mà là khoảnh khắc bạn ngừng ép câu trả lời. Khi dừng đủ lâu, điều từng rối có thể lộ ra hình dạng mới.",
      "The Hanged Man is not failure; it is the moment of not forcing the answer. When you pause long enough, what was tangled can reveal a new shape."
    ),
    scene: localized(
      "Một nhân vật lơ lửng ngược nhẹ trong căn phòng không trọng lực, tóc và dải ruy băng cyan trôi chậm, bên dưới là bản đồ sao phản chiếu như mặt nước. Ánh coral rose rất mỏng quanh cổ tay, cảm giác buông mà vẫn an toàn.",
      "A figure floats gently upside down in a zero-gravity room, hair and cyan ribbons drifting slowly, below them a star map reflecting like water. A thin coral-rose glow around the wrists suggests surrender held safely."
    )
  },
  "major-13-death": {
    portrait: localized(
      "Một nhân vật tháo bỏ lớp áo ánh sao cũ, phía dưới là vệt sáng mới đang hiện ra. Lá bài tập trung vào chuyển hóa thanh lịch, không kinh dị.",
      "A figure removes an old star-lit outer layer, revealing a new glow beneath. The card focuses on elegant transformation, not horror."
    ),
    story: localized(
      "Death trong deck này là ẩn dụ thay lớp cũ của bản sắc. Có điều đã hoàn thành vai trò của nó; việc buông xuống tạo chỗ cho một hình dạng sống mới.",
      "Death in this deck is an identity-shedding metaphor. Something has finished its role; releasing it creates room for a new living form."
    ),
    scene: localized(
      "Một nhân vật đứng trong góc atelier yên tĩnh, nhẹ nhàng cởi lớp áo khoác indigo phủ bụi sao cũ, để lộ áo trong soft ivory có mầm sáng cyan. Những charm cũ rơi xuống thành cánh hoa ánh sáng, không có xương, không có hình ảnh chết chóc.",
      "A figure stands in a quiet atelier corner, gently removing an indigo coat dusted with old stars, revealing a soft-ivory inner layer with a cyan sprout of light. Old charms fall like light petals, with no bones or death imagery."
    )
  },
  "major-14-temperance": {
    portrait: localized(
      "Một nhân vật pha hai luồng sáng cảm xúc thành một màu dịu hơn trong cốc thủy tinh trăng. Dáng người chậm rãi, tự chăm sóc, biết điều độ.",
      "A figure blends two emotional light streams into a softer color inside a moon-glass cup. Slow, self-care, and balanced."
    ),
    story: localized(
      "Temperance nhắc rằng người dùng không phải chọn cực đoan. Đôi khi câu trả lời là pha trộn hai phần tưởng như đối lập cho đến khi chúng cùng thở được.",
      "Temperance reminds the user that extremes are not the only options. Sometimes the answer is blending two apparent opposites until both can breathe."
    ),
    scene: localized(
      "Một nhân vật đứng bên bàn pha chế ánh sao, rót hai luồng sáng cyan và coral rose từ hai bình thủy tinh vào cốc trăng ở giữa. Hơi sáng champagne gold tỏa thành vòng mềm, nền charcoal giúp cảnh không quá ngọt.",
      "A figure stands at a star-mixing table, pouring cyan and coral-rose light from two glass vessels into a moon cup at the center. Champagne-gold vapor forms a soft ring, with charcoal grounding the scene so it is not overly sweet."
    )
  },
  "major-15-devil": {
    portrait: localized(
      "Một nhân vật đối diện chiếc gương indigo phản chiếu các dây charm quấn quá chặt quanh cổ tay. động lực là nhận diện dính mắc và quyền chọn tháo nút, không hù dọa.",
      "A figure faces an indigo mirror reflecting charm cords tied too tightly around their wrists. The momentum is recognizing attachment and the choice to untie, not fear."
    ),
    story: localized(
      "The Devil soi vào nơi người dùng trao quyền cho thứ làm mình nhỏ lại. Lá bài không kết án ham muốn; nó hỏi điều gì đang biến thành dây buộc.",
      "The Devil looks at where the user gives power to what keeps them small. The card does not condemn desire; it asks what has become a binding cord."
    ),
    scene: localized(
      "Một nhân vật đứng trước gương indigo khói, trong gương có các dây charm cyan-coral quấn hơi chặt quanh cổ tay và một chiếc khóa sao mở hé. Ánh champagne gold chiếu vào nút buộc, tạo cảm giác có thể tháo ra, không có quỷ, không sừng, không hình ảnh kinh dị.",
      "A figure stands before a smoky indigo mirror; in the reflection, cyan-coral charm cords are tied a little too tightly around the wrists beside a half-open star lock. Champagne-gold light falls on the knot, making release possible, with no demon, horns, or horror imagery."
    )
  },
  "major-16-tower": {
    portrait: localized(
      "Một nhân vật đứng giữa mô hình atelier đang nứt thành các mảnh ánh sáng, không hoảng loạn mà đang nhìn sự thật hiện ra. Đây là sụp đổ để giải phóng, không tai họa.",
      "A figure stands as a model of the atelier cracks into light fragments, not panicked but watching truth appear. This is collapse as liberation, not disaster."
    ),
    story: localized(
      "The Tower là khoảnh khắc cấu trúc không thật bị lộ ra. Trong Astral Pop Atelier, sự rung chuyển đầu tiên có thể là điều giúp người dùng thôi sống trong căn phòng quá chật.",
      "The Tower is the moment an untrue structure is revealed. In Astral Pop Atelier, the first shock can help the user stop living inside a room that has become too small."
    ),
    scene: localized(
      "Một mô hình tháp atelier trừu tượng bằng kính sao nứt thành mảnh cyan và champagne gold, nhân vật đứng phía trước giữ một mảnh bản đồ sao còn nguyên. Không có sét đánh sao chép truyền thống; sự nứt vỡ đến từ ánh sáng sự thật bên trong.",
      "An abstract atelier tower model made of star glass cracks into cyan and champagne-gold fragments, while the figure stands before it holding one intact star-map piece. No copied lightning-tower composition; the break comes from truth-light inside."
    )
  },
  "major-17-star": {
    portrait: localized(
      "Một nhân vật ngồi bên cửa sổ atelier, rửa tay trong bát nước sao, ánh mắt dịu lại sau bão. Lá bài là hy vọng có thật, không quá chói.",
      "A figure sits by the atelier window, washing their hands in star water, their gaze softening after a storm. The card is real hope, not glare."
    ),
    story: localized(
      "The Star là khoảng hồi phục khi người dùng có thể tin lại từng chút. Hy vọng trong deck này nhỏ, sáng và đủ bền để quay về với bản thân.",
      "The Star is a recovery space where the user can begin trusting again, little by little. Hope in this deck is small, luminous, and steady enough to return to the self."
    ),
    scene: localized(
      "Một nhân vật ngồi bên cửa sổ hình vòm, tay chạm vào bát nước phản chiếu nhiều ngôi sao nhỏ. Các giọt nước bay lên thành chòm sao cyan, vải ivory và ánh champagne gold tạo cảm giác tự chăm sóc sau đêm dài.",
      "A figure sits beside an arched window, hands touching a bowl of water reflecting tiny stars. Water droplets rise into a cyan constellation, with ivory fabric and champagne-gold light creating self-care after a long night."
    )
  },
  "major-18-moon": {
    portrait: localized(
      "Một nhân vật đi qua hành lang gương của atelier, mỗi mặt gương phản chiếu một cảm xúc khác nhau. Không khí mơ hồ nhưng an toàn, mời đi chậm.",
      "A figure walks through the atelier's mirror hallway, each mirror reflecting a different emotion. The atmosphere is uncertain but safe, inviting a slower pace."
    ),
    story: localized(
      "The Moon không bắt người dùng kết luận khi mọi thứ còn mờ. Lá bài nhắc rằng nỗi sợ có thể phóng to câu chuyện, nên hãy đi chậm và quan sát mẫu hình lặp lại.",
      "The Moon does not force a conclusion while things remain unclear. It reminds the user that fear can enlarge the story, so move slowly and watch repeating patterns."
    ),
    scene: localized(
      "Một nhân vật bước qua hành lang gương indigo, mỗi gương phản chiếu một phiên bản cảm xúc khác nhau của gương mặt: bối rối, tò mò, bình tĩnh. Sương cyan và coral rose rất mỏng, trăng mờ nằm trong chén nước ở cuối hành lang.",
      "A figure walks through an indigo mirror hallway, each mirror reflecting a different emotional version of the face: confused, curious, calm. Thin cyan and coral-rose mist, with a blurred moon resting in a water cup at the hall's end."
    )
  },
  "major-19-sun": {
    portrait: localized(
      "Một nhân vật mở cửa atelier đón ánh sáng sớm, nụ cười nhỏ và trưởng thành. Niềm vui ở đây rõ ràng, ấm, không trẻ con.",
      "A figure opens the atelier door to morning light, wearing a small mature smile. Joy here is clear, warm, and not childish."
    ),
    story: localized(
      "The Sun là lúc điều phức tạp trở nên đơn giản hơn. Lá bài cho phép người dùng nhận niềm vui mà không phải xin lỗi vì mình đang sáng.",
      "The Sun is when complexity becomes simpler. The card lets the user receive joy without apologizing for being bright."
    ),
    scene: localized(
      "Một nhân vật mở cửa atelier, ánh star lemon và soft ivory tràn vào làm các charm sao trên bàn bừng sáng. Nền vẫn có charcoal nhẹ để giữ chiều sâu, coral rose và cyan phản chiếu trên má và tay áo.",
      "A figure opens the atelier door, star-lemon and soft-ivory light spilling in and waking the star charms on the desk. A touch of charcoal remains for depth, with coral rose and cyan reflected on the cheek and sleeve."
    )
  },
  "major-20-judgement": {
    portrait: localized(
      "Một nhân vật tháo khăn che tai, nghe tiếng gọi từ bản đồ sao của chính mình. Dáng đứng vừa xúc động vừa tỉnh thức, không bị phán xét.",
      "A figure removes a cloth from their ears, hearing a call from their own star map. The posture is moved and awakened, not judged."
    ),
    story: localized(
      "Judgement trong Astral Pop Atelier là lúc người dùng nghe rõ hơn tiếng gọi nội tâm. Lá bài không kết án quá khứ; nó mời biến phán xét thành học hỏi.",
      "Judgement in Astral Pop Atelier is the moment the user hears the inner call more clearly. The card does not condemn the past; it invites turning judgment into learning."
    ),
    scene: localized(
      "Một nhân vật đứng giữa vòng mảnh gương sao, tháo lớp vải mỏng khỏi tai khi bản đồ sao trước ngực phát sáng. Các mảnh gương phản chiếu những phiên bản cũ nhưng không có chữ, ánh champagne gold gọi nhân vật về phía trước.",
      "A figure stands in a circle of star-mirror fragments, removing a thin cloth from their ears as the star map at their chest lights up. The fragments reflect old versions of the self without text, champagne-gold light calling the figure forward."
    )
  },
  "major-21-world": {
    portrait: localized(
      "Một nhân vật đứng ở trung tâm atelier đã mở toàn bộ cửa sổ, xung quanh là vòng sao của các bài học đã tích hợp. Cảm giác hoàn tất, trưởng thành và sẵn sàng bước ra.",
      "A figure stands at the center of the atelier with all windows open, surrounded by a star ring of integrated lessons. Complete, mature, and ready to step out."
    ),
    story: localized(
      "The World khép lại một vòng học bằng sự trọn vẹn hơn, không phải sự hoàn hảo. Trong deck này, người dùng bước ra khỏi xưởng sao với nhiều phần của mình đã được gọi tên.",
      "The World closes a learning cycle with greater wholeness, not perfection. In this deck, the user leaves the star atelier with more parts of the self named."
    ),
    scene: localized(
      "Một nhân vật đứng giữa atelier mở rộng, bốn cửa sổ nhỏ đại diện bốn phòng suit tỏa ánh cyan, coral rose, champagne gold và soft ivory. Một vòng sao mảnh bao quanh nhân vật như quỹ đạo hoàn tất, sàn indigo phản chiếu toàn bộ hình bóng.",
      "A figure stands in the expanded atelier, four small windows representing the four suit rooms glowing cyan, coral rose, champagne gold, and soft ivory. A thin star ring surrounds the figure like a completed orbit, the indigo floor reflecting the whole silhouette."
    )
  }
};

const suitConfig = {
  wands: {
    room: localized("Spark Studio", "Spark Studio"),
    domain: localized("động lực, sáng tạo, ham muốn và hành động", "drive, creativity, desire, and action"),
    motifs: localized("comet sparks, glow batons, stage light, flame charms, kinetic ribbons", "comet sparks, glow batons, stage light, flame charms, kinetic ribbons"),
    color: localized("astral cyan và coral rose chạy nhanh trên nền charcoal", "astral cyan and coral rose moving fast over charcoal"),
    object: localized("glow baton", "glow baton")
  },
  cups: {
    room: localized("Tide Room", "Tide Room"),
    domain: localized("cảm xúc, kết nối, tình yêu và trực giác", "emotion, connection, love, and intuition"),
    motifs: localized("moon tea, reflective water, crystal headphones, floating petals, glass cups, soft waves", "moon tea, reflective water, crystal headphones, floating petals, glass cups, soft waves"),
    color: localized("soft ivory, cyan nước trăng và coral rose dịu", "soft ivory, moon-water cyan, and gentle coral rose"),
    object: localized("glass cup", "glass cup")
  },
  swords: {
    room: localized("Signal Hall", "Signal Hall"),
    domain: localized("suy nghĩ, sự thật, giao tiếp và ranh giới", "thought, truth, communication, and boundaries"),
    motifs: localized("glass screens, silver ink, paper planes, transparent ribbons, light cuts, clean air", "glass screens, silver ink, paper planes, transparent ribbons, light cuts, clean air"),
    color: localized("ink indigo, silver-cyan và champagne gold sắc mảnh", "ink indigo, silver-cyan, and thin champagne gold"),
    object: localized("silver paper blade", "silver paper blade")
  },
  pentacles: {
    room: localized("Earth Lab", "Earth Lab"),
    domain: localized("giá trị bản thân, công việc, cơ thể và nguồn lực", "self-worth, work, body, and resources"),
    motifs: localized("charm coins, terrariums, craft tools, vending tokens, small plants, desk objects", "charm coins, terrariums, craft tools, vending tokens, small plants, desk objects"),
    color: localized("champagne gold, soft ivory và cyan ổn định trên nền indigo", "champagne gold, soft ivory, and steady cyan over indigo"),
    object: localized("star coin", "star coin")
  }
};

const rankScenes = {
  ace: {
    portrait: localized("một nhân vật trẻ phát hiện hạt giống động lực đầu tiên của suit", "a young figure discovering the first seed of the suit's momentum"),
    story: localized("Ace mở ra một khả năng mới còn nhỏ nhưng sống động. Lá bài hỏi người dùng sẽ đặt hạt giống này vào loại đất nào.", "Ace opens a new possibility that is still small but alive. The card asks what kind of ground the user will give this seed."),
    scene: localized("một vật biểu tượng duy nhất vừa phát sáng lần đầu, đặt ở trung tâm như hạt giống của cả căn phòng", "one symbolic object lighting for the first time, centered like the seed of the whole room")
  },
  two: {
    portrait: localized("một nhân vật đứng giữa hai lựa chọn, học cách giữ cân bằng mà không tự chia đôi mình", "a figure standing between two options, learning balance without splitting the self in two"),
    story: localized("Two là nơi mối quan hệ giữa hai lực bắt đầu. Lá bài không ép chọn ngay, nhưng mời một bước nhỏ để bớt mắc kẹt.", "Two is where the relationship between two forces begins. It does not force an immediate choice, but invites one small step out of being stuck."),
    scene: localized("hai vật biểu tượng đối xứng, giữa chúng là một quỹ đạo sao nhỏ tạo điểm quyết định", "two symbolic objects in symmetry, with a small star orbit between them as the decision point")
  },
  three: {
    portrait: localized("một nhân vật mở rộng ý tưởng của mình với sự hỗ trợ hoặc phản hồi từ xung quanh", "a figure expanding their idea with support or feedback from around them"),
    story: localized("Three cho thấy điều bắt đầu đã cần hình dạng rộng hơn. Lá bài mời người dùng cho ý tưởng được kết nối và lớn lên.", "Three shows that what began now needs a wider shape. The card invites the user's idea to connect and grow."),
    scene: localized("ba nguồn sáng cùng tạo thành một tam giác mềm, mở ra chiều sâu của căn phòng", "three light sources forming a soft triangle, opening depth in the room")
  },
  four: {
    portrait: localized("một nhân vật nghỉ trong cấu trúc an toàn, cảm thấy được giữ mà không bị khóa lại", "a figure resting inside a safe structure, held without being locked in"),
    story: localized("Four nói về nền tảng. Lá bài nhắc rằng an toàn là nơi để thở, không phải cái cớ để đông cứng.", "Four speaks of foundation. The card reminds us that safety is a place to breathe, not an excuse to freeze."),
    scene: localized("bốn điểm sáng tạo thành một khung trú ẩn tối giản quanh nhân vật", "four light points forming a minimal shelter frame around the figure")
  },
  five: {
    portrait: localized("một nhân vật đối diện ma sát đẹp nhưng khó chịu, đang học gọi tên xung đột", "a figure facing beautiful but uncomfortable friction, learning to name conflict"),
    story: localized("Five đưa căng thẳng lên bề mặt. Lá bài không làm tình huống đáng sợ hơn, chỉ giúp người dùng thấy điểm cần xử lý.", "Five brings tension to the surface. The card does not make the situation scarier; it helps the user see what needs attention."),
    scene: localized("năm đường sáng lệch nhịp cắt qua không gian nhưng vẫn được giữ trong bố cục thanh lịch", "five off-rhythm light lines crossing the space while staying elegant")
  },
  six: {
    portrait: localized("một nhân vật nhận lại nhịp thở sau căng thẳng, được hỗ trợ mà vẫn tự chủ", "a figure regaining rhythm after tension, supported while remaining self-directed"),
    story: localized("Six là điều chỉnh và hồi phục. Lá bài cho thấy một vòng động lực có thể trở lại cân bằng sau va chạm.", "Six is repair and adjustment. The card shows an momentum loop returning to balance after friction."),
    scene: localized("sáu đốm sáng tạo thành đường dẫn mềm ra khỏi vùng căng thẳng", "six light points forming a gentle path out of tension")
  },
  seven: {
    portrait: localized("một nhân vật bảo vệ điều quan trọng, mắt tỉnh táo, ranh giới rõ nhưng không đóng kín", "a figure protecting what matters, alert-eyed, with clear boundaries but not closed off"),
    story: localized("Seven là thử thách của sự sáng suốt. Lá bài hỏi người dùng đang bảo vệ giá trị thật hay chỉ đang phản xạ vì sợ.", "Seven is a challenge of discernment. The card asks whether the user is protecting a real value or reacting from fear."),
    scene: localized("bảy vật thể nhỏ tạo thành vòng thử thách quanh nhân vật, để lại một lối mở rõ", "seven small objects forming a challenge ring around the figure, leaving one clear opening")
  },
  eight: {
    portrait: localized("một nhân vật đang luyện tập nhịp lặp có ý thức, chuyển động nhanh nhưng không rối", "a figure practicing conscious repetition, moving quickly without becoming chaotic"),
    story: localized("Eight là tiến bộ qua nhịp lặp. Lá bài nhắc rằng tốc độ chỉ có ích khi vẫn nhớ vì sao mình bắt đầu.", "Eight is progress through repetition. The card reminds us that speed helps only when we remember why we began."),
    scene: localized("tám vệt sáng hoặc vật biểu tượng di chuyển theo một hướng rõ ràng", "eight light streaks or symbolic objects moving in one clear direction")
  },
  nine: {
    portrait: localized("một nhân vật đứng gần thành quả, vừa tự hào vừa nhận ra cái giá của nó", "a figure standing near attainment, both proud and aware of its cost"),
    story: localized("Nine là ngưỡng gần hoàn tất. Lá bài mời người dùng nhận giá trị của hành trình mà không biến nó thành áp lực hoàn hảo.", "Nine is the threshold near completion. The card invites the user to honor the journey without turning it into perfection pressure."),
    scene: localized("chín điểm sáng xếp thành vòm riêng tư quanh nhân vật", "nine light points arranged as a private arch around the figure")
  },
  ten: {
    portrait: localized("một nhân vật mang chu kỳ đã đầy, cần sắp xếp lại để không quá tải", "a figure carrying a cycle that has become full, needing rearrangement before overload"),
    story: localized("Ten cho thấy điều gì đã đi đến mức cần hoàn tất hoặc phân bổ lại. Lá bài hỏi thứ gì không còn thật sự thuộc về người dùng.", "Ten shows what has reached a point of completion or redistribution. The card asks what no longer truly belongs to the user."),
    scene: localized("mười vật biểu tượng tạo thành cụm sáng lớn, đẹp nhưng hơi nặng, đang chờ được sắp xếp lại", "ten symbolic objects forming a large luminous cluster, beautiful but slightly heavy, waiting to be reorganized")
  },
  page: {
    portrait: localized("một apprentice trẻ-trưởng-thành tò mò, học ngôn ngữ của suit bằng sự khiêm tốn", "a young-adult apprentice, curious and humble, learning the suit's language"),
    story: localized("Page là phần còn mới nhưng đầy tiềm năng. Lá bài khuyến khích học thử, quan sát và không cần chứng minh mình đã biết hết.", "Page is the new but promising part of the self. The card encourages learning, observing, and not needing to prove mastery."),
    scene: localized("một nhân vật cầm vật biểu tượng của suit như công cụ lần đầu được trao", "a figure holding the suit's symbolic object like a tool received for the first time")
  },
  knight: {
    portrait: localized("một seeker đang chuyển động mạnh, cần mục đích để tốc độ không cuốn mình đi", "a seeker moving with force, needing purpose so speed does not carry them away"),
    story: localized("Knight là động lực lên đường. Lá bài hỏi hướng đi nào xứng đáng với sức nóng hiện tại.", "Knight is momentum setting out. The card asks which direction deserves the current intensity."),
    scene: localized("một nhân vật tiến qua căn phòng với dải sáng kéo dài phía sau như quỹ đạo", "a figure moving through the room with a trailing light path like an orbit")
  },
  queen: {
    portrait: localized("một guardian làm chủ không gian nội tâm của suit, mềm nhưng có tiêu chuẩn rõ", "a guardian owning the inner space of the suit, soft but with clear standards"),
    story: localized("Queen là động lực chăm sóc có chủ quyền. Lá bài nhắc rằng nuôi dưỡng người khác không đồng nghĩa quên mất bản thân.", "Queen is sovereign care. The card reminds us that nurturing others does not mean forgetting the self."),
    scene: localized("một nhân vật ngồi trong trung tâm căn phòng, điều chỉnh các vật biểu tượng bằng cử chỉ dịu và chắc", "a figure seated at the room's center, arranging symbolic objects with a gentle and certain gesture")
  },
  king: {
    portrait: localized("một steward trưởng thành giữ tầm nhìn cho suit, lãnh đạo bằng rõ ràng hơn là áp đặt", "a mature steward holding the suit's vision, leading through clarity rather than control"),
    story: localized("King là khả năng đứng vững và dùng quyền lực có trách nhiệm. Lá bài hỏi người dùng đang quản trị động lực này như thế nào.", "King is the ability to stand steady and use power responsibly. The card asks how the user is stewarding this momentum."),
    scene: localized("một nhân vật đứng trước bản đồ sao của căn phòng, các vật biểu tượng xếp thành hệ thống rõ ràng", "a figure standing before the room's star map, symbolic objects arranged into a clear system")
  }
};

const specificMinorDetails = {
  wands: {
    ace: localized("một glow baton vừa bật lên như tia lửa đầu tiên trong Spark Studio", "a glow baton igniting like the first spark in the Spark Studio"),
    two: localized("hai glow baton chỉ về hai cửa atelier khác nhau, bản đồ sao nhỏ nằm giữa", "two glow batons pointing toward two different atelier doors, a small star map between them"),
    three: localized("ba tín hiệu pháo sáng bay ra cửa sổ studio như lời mời phản hồi", "three flare signals traveling out the studio window like invitations for response"),
    four: localized("bốn cột đèn sân khấu nhỏ tạo thành vùng chào đón ấm áp", "four small stage lights forming a warm welcome zone"),
    five: localized("năm dải lửa charm va vào nhau như cuộc tranh luận sáng tạo", "exactly five clearly countable flame-charm wands clashing like a creative argument, each wand with a visible baton core and charm head"),
    six: localized("sáu đốm sáng vỗ tay im lặng quanh nhân vật, công nhận mà không phô trương", "exactly six clearly countable glow wands or torch-lights silently applauding around the figure, recognition without display"),
    seven: localized("bảy spark line tiến gần, nhân vật giơ tay mở trước ngực như ranh giới nhưng không cầm thêm wand", "exactly seven clearly countable approaching spark-wands around the figure, while the figure raises an open empty hand as a boundary and holds no wand"),
    eight: localized("tám vệt comet chạy ngang studio như tin nhắn không chữ", "exactly eight clearly countable comet-wands crossing the studio like wordless messages, with eight bright heads and eight visible trails"),
    nine: localized("chín glow baton đã cháy thấp, nhân vật vẫn đứng vững sau một chặng dài", "nine low-burning glow batons, the figure still standing after a long stretch"),
    ten: localized("mười charm lửa được gom lại thành bó quá nặng cần đặt xuống", "exactly ten clearly countable fire-charm wands gathered into one heavy bundle, with ten distinct wand tips or charm heads visible"),
    page: localized("apprentice cầm que sáng chưa bật, tò mò trước sân khấu cảm xúc", "an apprentice holding an unlit glow stick, curious before the emotional stage"),
    knight: localized("seeker lao qua Spark Studio với áo khoác kéo thành vệt comet", "a seeker rushing through the Spark Studio with a coat trailing like a comet"),
    queen: localized("guardian của Spark Studio ngồi giữa vòng lửa charm, ấm áp và tự chủ", "the Spark Studio guardian seated inside a ring of flame charms, warm and self-possessed"),
    king: localized("steward của Spark Studio đứng trước bản đồ chiến dịch sáng tạo bằng ánh sao", "the Spark Studio steward standing before a creative campaign map made of starlight")
  },
  cups: {
    ace: localized("một cốc nước trăng vừa đầy, cảm xúc mới tràn lên như ánh sao mềm", "a moon-water cup filling for the first time, new feeling rising like soft starlight"),
    two: localized("hai cốc nước trăng phản chiếu hai gương mặt gần nhau nhưng còn khoảng thở", "two moon-water cups reflecting two faces close together with breathing room"),
    three: localized("ba cốc moon tea chạm nhẹ trong vòng bạn bè riêng tư", "three moon-tea cups touching lightly in a private friendship circle"),
    four: localized("ba cốc đã nguội ở phía sau và một cốc sáng đặt gần tay nhưng chưa chạm", "three cooled cups behind and one glowing cup near the hand but untouched"),
    five: localized("năm cốc thủy tinh trên bàn nước, vài cốc nghiêng tạo vệt coral rose dịu", "five glass cups on a water table, some tilted into gentle coral-rose streaks"),
    six: localized("sáu cốc nhỏ giữ ký ức như ảnh không chữ trong nước", "six small cups holding memories like wordless images in water"),
    seven: localized("bảy cốc phản chiếu bảy khả năng đẹp nhưng khó chọn", "seven cups reflecting seven beautiful but hard-to-choose possibilities"),
    eight: localized("tám cốc còn lại phía sau khi nhân vật đi về cửa sổ yên tĩnh", "exactly eight clearly countable cups left behind as the figure walks toward a quiet window, with no ninth cup-like reflection"),
    nine: localized("chín cốc moon tea xếp thành vòm hài lòng riêng tư", "nine moon-tea cups arranged into an arch of private contentment"),
    ten: localized("mười cốc phản chiếu thành vòng belonging an toàn quanh nhiều bàn tay", "ten cups reflecting into a safe belonging circle around many hands"),
    page: localized("apprentice lắng nghe một cốc nước như đang nhận tin nhắn cảm xúc", "an apprentice listening to a water cup like receiving an emotional message"),
    knight: localized("seeker mang cốc moon tea đi qua phòng như lời tỏ bày cần đi chậm", "a seeker carrying moon tea through the room like a confession that needs to move slowly"),
    queen: localized("guardian của Tide Room ngồi bên bát nước sâu, tay giữ tai nghe pha lê", "the Tide Room guardian seated beside a deep water bowl, holding crystal headphones"),
    king: localized("steward của Tide Room trước mặt nước yên, nhiều cốc lớn được giữ ổn định", "the Tide Room steward before still water, several large cups held steady")
  },
  swords: {
    ace: localized("một lưỡi giấy bạc chia màn sương indigo thành đường sự thật mới", "a silver paper blade dividing indigo mist into a new line of truth"),
    two: localized("hai màn kính che hai phía khuôn mặt, nhân vật cần nhìn cả hai bên", "two glass screens cover both sides of the face, the figure needing to see both sides"),
    three: localized("ba lưỡi giấy bạc xuyên qua mảnh vải coral rose, không dùng biểu tượng trái tim bị đâm", "three silver paper blades piercing coral-rose fabric, without using a pierced-heart symbol"),
    four: localized("bốn lưỡi giấy bạc nằm song song bên cạnh tai nghe đã tắt, tâm trí nghỉ", "four silver paper blades resting parallel beside turned-off headphones, the mind resting"),
    five: localized("năm mảnh kính phản chiếu một dải ruy băng bị cắt, thắng thua để lại im lặng", "exactly five clearly countable glass-sword shards reflecting a cut ribbon, victory and loss leaving silence"),
    six: localized("sáu paper plane ánh bạc bay qua hành lang indigo về vùng yên hơn", "six silver paper planes moving through an indigo hall toward a quieter zone"),
    seven: localized("bảy mảnh kính được giấu một phần dưới vải, nhân vật cầm đèn sự thật nhỏ", "seven glass pieces partly hidden under fabric, the figure holding a small truth lamp"),
    eight: localized("tám ruy băng trong suốt chắn trước gương nhưng vẫn để lộ một khe sáng", "eight transparent ribbons blocking a mirror while leaving one narrow light gap"),
    nine: localized("chín vệt sáng mảnh trên trần phòng ngủ atelier, nhân vật thức nhưng được giữ dịu", "nine thin light marks on the atelier bedroom ceiling, the awake figure held gently"),
    ten: localized("mười lưỡi giấy bạc đã được đặt xuống cạnh gương nứt, bình minh rất nhẹ bắt đầu", "ten silver paper blades set down beside a cracked mirror, a very soft dawn beginning"),
    page: localized("apprentice quan sát màn kính, cầm bút bạc như học cách nói thật", "an apprentice studying a glass screen, holding a silver pen while learning to speak truth"),
    knight: localized("seeker lao qua Signal Hall với đường chéo ánh bạc, cần làm mềm lời nói", "a seeker rushing through Signal Hall with diagonal silver light, needing to soften words"),
    queen: localized("guardian của Signal Hall cắt gọn ruy băng rối bằng sự rõ ràng nhân hậu", "the Signal Hall guardian trimming tangled ribbon with compassionate clarity"),
    king: localized("steward của Signal Hall đứng trước lưới quyết định sáng, bình tĩnh và chịu trách nhiệm", "the Signal Hall steward before a luminous decision grid, calm and accountable")
  },
  pentacles: {
    ace: localized("một đồng xu sao nằm trong terrarium nhỏ, cơ hội vật chất vừa nảy mầm", "a star coin inside a small terrarium, material opportunity just sprouting"),
    two: localized("hai đồng xu sao cân bằng trên quỹ đạo hình vô cực quanh bàn làm việc", "two star coins balanced on an infinity orbit around a worktable"),
    three: localized("ba bàn tay đặt coin, cây nhỏ và công cụ craft quanh mô hình chung", "three hands placing exactly three matching star coins around a shared model, all coins using the same round pentacle design and the same star emblem"),
    four: localized("bốn đồng xu sao được giữ sát quanh hộp charm, tự bảo vệ hơi quá chặt", "four star coins held close around a charm box, self-protection a little too tight"),
    five: localized("năm đồng xu mờ ngoài vùng sáng, một khăn ivory nằm gần như lời mời hỗ trợ", "five dim coins outside the light, an ivory cloth nearby as an offer of support"),
    six: localized("sáu đồng xu sao được chia đều giữa hai bàn tay trong ánh đèn ấm", "six star coins shared evenly between two hands in warm light"),
    seven: localized("bảy đồng xu đặt quanh chậu cây đang lớn chậm trong Earth Lab", "seven coins placed around a slowly growing plant in the Earth Lab"),
    eight: localized("tám charm coin được đánh bóng từng chiếc cạnh dụng cụ craft tinh tế", "eight charm coins polished one by one beside refined craft tools"),
    nine: localized("chín đồng xu sao và cây nhỏ tạo thành không gian độc lập mềm mại", "nine star coins and small plants forming a soft independent space"),
    ten: localized("mười đồng xu sao tạo thành cây gia phả trừu tượng không chữ", "ten star coins forming a wordless abstract family tree"),
    page: localized("apprentice nâng một đồng xu sao như đang học giá trị của điều thật", "an apprentice lifting one star coin as if learning the value of what is real"),
    knight: localized("seeker đặt từng chìa khóa và coin vào khay, tiến chậm nhưng đáng tin", "a seeker placing keys and coins one by one onto a tray, slow but reliable"),
    queen: localized("guardian của Earth Lab chăm một terrarium sao và hộp coin mở", "the Earth Lab guardian tending a star terrarium and an open coin box"),
    king: localized("steward của Earth Lab trước hệ thống coin, cây và công cụ được sắp rõ ràng", "the Earth Lab steward before a clear system of coins, plants, and tools")
  }
};

const visualQaNotes = {
  "major-04-emperor": "Visual QA: visible hands must have exactly five natural fingers, with a clear thumb, no missing finger and no extra finger-like highlight.",
  "major-10-wheel": "Visual QA: visible hands must have exactly five natural fingers, no sixth finger and no extra finger-like highlight.",
  "minor-cups-eight": "Visual QA: show exactly eight cups as the only cup-like objects; reflections may exist but must not read as a ninth cup.",
  "minor-pentacles-three": "Visual QA: show exactly three matching pentacle coins using one consistent round star-coin design.",
  "minor-swords-five": "Visual QA: show exactly five clearly countable sword-like glass shards; no hidden sixth shard and no missing sword.",
  "minor-wands-five": "Visual QA: show exactly five clearly countable wand objects, not abstract ribbons that cannot be counted.",
  "minor-wands-six": "Visual QA: show exactly six clearly countable wand or torch-light objects; avoid a seventh prominent light that reads as another wand.",
  "minor-wands-seven": "Visual QA: show exactly seven total wand objects around the figure; the figure must hold no wand, and there must be no eighth wand-like streak.",
  "minor-wands-eight": "Visual QA: show exactly eight clearly countable comet-wands with eight bright heads and no extra wand-like streaks.",
  "minor-wands-ten": "Visual QA: show exactly ten clearly countable wands in the heavy bundle, with ten visible tips or charm heads."
};

function buildMinorScene(card) {
  const suit = suitConfig[card.suit];
  const rank = rankScenes[card.rank];
  const detail = specificMinorDetails[card.suit][card.rank];
  return {
    portrait: localized(
      `${card.name.en} là ${rank.portrait.vi} trong ${suit.room.vi}. Hình ảnh phải cho thấy ${suit.domain.vi} bằng ${suit.motifs.vi}.`,
      `${card.name.en} is ${rank.portrait.en} inside the ${suit.room.en}. The image should express ${suit.domain.en} through ${suit.motifs.en}.`
    ),
    story: localized(
      `${card.name.en} trong Astral Pop Atelier đặt chủ đề ${card.keywords.vi.join(", ")} vào ${suit.room.vi}. ${rank.story.vi}`,
      `${card.name.en} in Astral Pop Atelier places the themes of ${card.keywords.en.join(", ")} inside the ${suit.room.en}. ${rank.story.en}`
    ),
    scene: localized(
      `Trong ${suit.room.vi}, ${detail.vi}. Cảnh dùng ${rank.scene.vi}, với ${suit.color.vi}, giữ cảm giác anime editorial cao cấp và không quá trang trí.`,
      `Inside the ${suit.room.en}, ${detail.en}. The scene uses ${rank.scene.en}, with ${suit.color.en}, keeping a premium anime editorial mood without over-decoration.`
    )
  };
}

function buildPrompt(card, scene) {
  const qa = visualQaNotes[card.id] ? ` ${visualQaNotes[card.id]}` : "";
  return localized(
    `Astral Pop Atelier, premium mystical anime editorial. Thiết kế inner artwork cho lá ${card.name.en}: ${scene.scene.vi} Ý nghĩa gợi ý: ${card.keywords.vi.join(", ")}. ${baseTechnical.vi}`,
    `Astral Pop Atelier, premium mystical anime editorial. Create the inner artwork for ${card.name.en}: ${scene.scene.en} Meaning cues: ${card.keywords.en.join(", ")}.${qa} ${baseTechnical.en}`
  );
}

const cards = JSON.parse(fs.readFileSync(CARDS_PATH, "utf8"));
const designs = cards.map((card) => {
  const scene = card.arcana === "major" ? majorScenes[card.id] : buildMinorScene(card);
  if (!scene) throw new Error(`Missing Astral scene for ${card.id}`);
  return {
    cardId: card.id,
    title: {
      vi: card.name.en,
      en: card.name.en
    },
    arcana: card.arcana,
    suit: card.suit,
    rank: card.rank,
    keywords: card.keywords,
    portrait: scene.portrait,
    cardStory: scene.story,
    visualPrompt: buildPrompt(card, scene),
    testingStatus: "ready_for_visual_prototype"
  };
});

const manifest = {
  deckId: "astral-pop-atelier",
  status: "full_deck_design_review",
  version: "2026-06-14-full-design-v1",
  name: {
    vi: "Astral Pop Atelier",
    en: "Astral Pop Atelier"
  },
  shortDescription: {
    vi: "Một bộ bài anime-premium về bản sắc, cảm xúc và hành trình biến những điều khó gọi tên thành bản đồ sao của riêng mình.",
    en: "A premium anime-inspired deck about identity, emotion, and turning unnamed feelings into a personal star map."
  },
  vibe: {
    vi: "Cảm xúc, điện ảnh, hiện đại, giàu cá tính",
    en: "Emotional, cinematic, modern, expressive"
  },
  theme: ["self", "identity", "emotion", "daily", "genz"],
  accentColor: "#7FD8D2",
  visualDirection: {
    vi: "Phong cách anime editorial cao cấp trong một xưởng sáng tạo sau nửa đêm: nền than đen và indigo, ánh sao cyan, rose-coral, champagne gold, nhân vật biểu cảm và các vật thể cảm xúc biến thành chòm sao.",
    en: "Premium anime editorial inside a midnight creative atelier: charcoal and indigo ground, cyan starlight, coral rose, champagne gold, expressive characters, and emotional objects becoming constellations."
  },
  readingStyle: {
    vi: "Ấm, giàu hình ảnh, nói với người dùng như một người bạn sáng suốt: gọi tên cảm xúc, nhìn rõ lựa chọn và kết thúc bằng một câu hỏi tự phản chiếu.",
    en: "Warm, vivid, and wise like a trusted friend: name the feeling, clarify the choice, and close with one reflective question."
  },
  productionRules: {
    cardSize: {
      width: 1024,
      height: 1768
    },
    artworkArea: {
      width: 656,
      height: 1130
    },
    artworkOnly: true,
    noTextInArtwork: true,
    noFrameInArtwork: true,
    noRiderWaiteCopy: true,
    noFamousAnimeOrCelebrityLikeness: true
  },
  suitGrammar: suitConfig,
  cardBackPrompt: {
    vi: "Mặt sau bài Astral Pop Atelier, kích thước 1024 x 1768px, cùng tỷ lệ với lá tarot đã render. Nền charcoal và ink indigo có texture giấy mịn, trung tâm là biểu tượng cửa sổ atelier hình vòm nhìn ra một chòm sao cyan-coral, các charm nhỏ như ngôi sao, tai nghe pha lê, bút ánh sáng và đồng xu sao xoay thành quỹ đạo mềm. Viền champagne gold nhiều lớp, silhouette rõ khi thu nhỏ trên màn rút bài. Không chữ, không số, không biểu tượng Rider-Waite.",
    en: "Astral Pop Atelier card back, 1024 x 1768px, matching the rendered tarot-card ratio. Use charcoal and ink-indigo paper texture, a central arched atelier window opening onto a cyan-coral constellation, with small charms such as stars, crystal headphones, a light pen, and star coins orbiting softly. Layered champagne-gold border, clear silhouette when scaled down on the draw screen. No text, no numbers, no Rider-Waite symbols."
  },
  cards: designs
};

fs.writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${designs.length} Astral Pop Atelier card designs to ${OUT_PATH}`);
