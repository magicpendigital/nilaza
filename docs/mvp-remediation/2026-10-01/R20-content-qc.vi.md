# R20 — QC nội dung Tarot canonical VI/EN

Ngày: 2026-10-01. Owner: `content_data_agent`. Phạm vi: chỉnh dữ liệu nguồn cục bộ; chưa publish hay kiểm chứng câu trả lời LLM.

Đã sửa và rà soát **78/78 lá canonical: 22 Major, 56 Minor**, giữ nguyên ID, thứ tự, tên, arcana, số, suit, rank, element và cấu trúc JSON. Đây là review của người biên tập; **chưa phải nghiệm thu độc lập song ngữ, artwork hay toàn bộ bộ bài**.

## Phạm vi và gate

Đã đọc AGENTS, Task Router, Plan QC, PRD Tarot, Tarot Content System, Brand Guidelines; áp dụng Tarot Content QC, hướng dẫn bilingual-review và Tarot Deck Production update/integration. Preflight PASS trước khi sửa; record hiện tại giữ hash trước/sau và đã PASS lại sau sửa. Những nguồn được route khác không đổi hash.

Whole-App impact: canonical copy đi vào thư viện, chi tiết lá, reveal và phần nghĩa từng lá trong kết quả. Admin seed và Supabase generated seed cần root tích hợp lại. ID/orientation/API/schema không đổi; không truy cập dữ liệu riêng tư, thông tin xác thực hay provider. Deck metadata, deck-specific intro, scene, artwork, App.tsx, runtime prompt và generated outputs không được sửa trong R20. Rollback chỉ delta nội dung R20, giữ thay đổi của các agent khác và phần skill config có sẵn trước R20.

Ba repository skill được đánh giá `verified-current`: quy trình hiện tại đã yêu cầu nội dung riêng theo lá, VI/EN, agency và ledger theo hash. Không cần sửa SKILL.md trong scope này. Quy tắc cụ thể mới được ghi trong config content skills; version cuối: `2026-10-01-canonical-semantic-qc-v3`. Các chỉnh sửa VI có sẵn của owner được giữ lại.

## Thay đổi

So với canonical sạch ở HEAD trước R20: **930 giá trị chuỗi đổi trên 78 lá**.

| Nhóm dữ liệu | Số giá trị chuỗi đổi | Độ phủ |
| --- | ---: | --- |
| uprightMeaning | 156 | 78 lá × VI/EN |
| reversedMeaning | 156 | 78 lá × VI/EN |
| reflectionQuestion | 156 | 78 lá × VI/EN |
| keywords | 336 | 56 Minor × 3 từ khóa × VI/EN |
| intro | 72 | 36 lá × VI/EN |
| personalityPortrait | 54 | 27 lá × VI/EN |

- Bốn lá Three có trục riêng: Wands mở rộng/phản hồi; Cups tình bạn/niềm vui chung; Swords đau lòng; Pentacles kỹ năng/phối hợp. Đã bỏ câu rank-three sai nghĩa “Điều bạn bắt đầu đang cần kết nối, phần hỏi và hình đang rõ hơn”.
- Six, Eight, Nine và các court cards cũng được phân biệt theo suit. Eight of Swords có từ khóa “cảm giác mắc kẹt / giới hạn / khả năng lựa chọn”; nội dung rèn kỹ năng thuộc Eight of Pentacles. Knight of Pentacles là nhịp đều, bền bỉ; khác Knight of Wands nhiệt huyết và Knight of Swords nhanh/quyết đoán.
- Page of Wands reversed nói về thiếu hướng hoặc ngại thử; kết quả chưa hoàn chỉnh không định nghĩa khả năng. Không gán khách hàng “non nớt”.
- Three of Swords dùng điều kiện “Nếu điều này phù hợp”; không mặc định khách đã bị tổn thương, không ép tha thứ hay coi đau khổ là cần thiết. Eight of Swords thừa nhận giới hạn thực tế; Nine of Swords không phủ nhận lo âu là tưởng tượng; Ten of Swords không hứa điều tồi tệ nhất đã qua.
- Five of Pentacles không quy việc thiếu trợ giúp thành lỗi của khách; Six of Pentacles không hứa cho đi sẽ được trả lại. Death không dự báo cái chết hay buộc rời quan hệ; Tower không dự báo tai họa hay yêu cầu chịu biến cố. Lovers/Two of Cups không xác nhận cảm xúc của người khác.
- Mỗi câu hỏi có một trọng tâm theo lá, tránh dùng chung công thức thay keyword. Giữ quyền tự đối chiếu và đặt sang một bên điều không phù hợp. Các nghĩa xuôi/ngược dài tối đa 173 ký tự; câu hỏi tối đa 92 ký tự, tính trên VI/EN hiện tại. Đây là số ký tự nguồn, chưa chứng minh layout hay accessibility.

## Kiểm chứng

| Kiểm tra đã chạy | Kết quả |
| --- | --- |
| `feature:preflight` trước sửa và sau sửa | PASS |
| `npm run validate:data` trên bản cuối | PASS: 7 deck, 78 lá, 0 legacy ASCII VI, 0 mojibake, 0 content safety lint |
| Đối chiếu HEAD canonical với bản cuối | 78/78 ID và metadata nguyên vẹn; cấu trúc/đường dẫn leaf nguyên vẹn |
| Đối chiếu trục nghĩa 78 lá × xuôi/ngược × VI/EN | 312 mốc từ/ngữ theo lá PASS |
| 12 tình huống framing khó × mốc VI/EN | 36 mốc PASS |
| Nghĩa xuôi, ngược, câu hỏi: VI và EN | 6 trường đều có 78 giá trị khác nhau |
| Mỗi câu hỏi đúng một dấu hỏi | 156/156 PASS |
| `git diff --check` cho các nguồn sửa | PASS |

Trước sửa chỉ có **60 nghĩa xuôi và 36 nghĩa ngược khác nhau** trong từng ngôn ngữ. Câu hỏi đã có 78 chuỗi khác nhau nhưng nhiều câu dùng cùng khuôn thay keyword; độ khác nhau của chuỗi không đủ chứng minh chất lượng.

Ma trận mốc nghĩa và 12 framing cases lưu trong record R20 ở `semanticAcceptanceMatrix` và `sourceFramingChecks`. Đã chạy Node đọc trực tiếp JSON trên đĩa, kiểm tra 312 mốc chủ đề, 36 mốc framing, độ trùng và dấu hỏi: `errors=[]`. Đây là kiểm tra hồi quy nội dung bằng mốc từ/ngữ kết hợp đọc biên tập cả hai ngôn ngữ; không thay thế đánh giá ngữ nghĩa độc lập hoặc safety của AI runtime.

Framing cases gồm: câu hỏi chung không mặc định đau lòng; thử sáng tạo thất bại không gán khả năng; giới hạn thật không quy thành tự tạo; lo lặp lại không chẩn đoán/phủ nhận; kết thúc khó không bảo đảm phục hồi; hỗ trợ khó tiếp cận không trách người dùng; cho/nhận không hứa đáp lại; không đọc ý nghĩ người khác; Death không literal/ép chấm dứt; Tower không bắt buộc chịu khổ; trực giác không thay dữ kiện; Pentacles King không dùng lá bài ra quyết định tài chính. Không có provider call hay phản hồi AI mới trong những kiểm tra này.

## Độ phủ biên tập theo lá

Từng hàng đã rà nghĩa xuôi/ngược, question, keyword, intro và portrait hiện tại ở VI/EN. Hai trục dưới đây ghi điều được đối chiếu; 312 đoạn mốc kiểm tra cụ thể nằm trong record. Những intro/portrait không cần sửa vẫn được đọc, không mặc định đổi tất cả là chất lượng cao hơn.

| Card ID | Trục nghĩa xuôi VI/EN | Trục nghĩa ngược VI/EN |
| --- | --- | --- |
| `major-00-fool` | Khởi đầu / beginning | chuẩn bị / preparation |
| `major-01-magician` | Nguồn lực và ý định / resources and intention | phân tán / scattered purpose |
| `major-02-high-priestess` | Trực giác và dữ kiện / intuition and evidence | tiếng ồn / noise |
| `major-03-empress` | Nuôi dưỡng / nurture | cho quá mức / overgiving |
| `major-04-emperor` | Cấu trúc / structure | cứng nhắc / rigidity |
| `major-05-hierophant` | Học từ truyền thống / tradition | quy tắc không còn hợp / inherited rules |
| `major-06-lovers` | Kết nối tự nguyện / willing connection | chưa đồng điệu / misalignment |
| `major-07-chariot` | Giữ hướng / direction | nhiều lực kéo / competing pulls |
| `major-08-strength` | Can đảm dịu dàng / gentle courage | gồng chịu / excessive endurance |
| `major-09-hermit` | Khoảng riêng / solitude | cô lập hoặc quá bận / isolation or busyness |
| `major-10-wheel` | Chu kỳ / cycles | nhịp lặp hoặc chống đổi thay / recurring pattern |
| `major-11-justice` | Dữ kiện công bằng / fair evidence | thiên kiến / bias |
| `major-12-hanged-man` | Dừng đổi góc nhìn / pause and perspective | chờ thiếu mục đích / purposeless waiting |
| `major-13-death` | Chuyển đổi / transition | chưa sẵn sàng khép lại / reluctance to close |
| `major-14-temperance` | Điều độ / moderation | nghiêng một phía / imbalance |
| `major-15-devil` | Ràng buộc / attachment | nhận diện để có lựa chọn / recognition and choice |
| `major-16-tower` | Xem lại nền tảng / foundations | né điều chỉnh / avoiding adjustment |
| `major-17-star` | Hy vọng nhẹ / gentle hope | khó hy vọng / difficulty hoping |
| `major-18-moon` | Mơ hồ và cảm xúc / uncertainty | kiểm tra suy đoán / check guesses |
| `major-19-sun` | Niềm vui / joy | kỳ vọng quá cao / high expectations |
| `major-20-judgement` | Nhìn lại trách nhiệm / review and responsibility | tự trách / self-blame |
| `major-21-world` | Hoàn tất / completion | phần dang dở / unfinished part |
| `minor-wands-ace` | Tia ý tưởng / inspiration | chưa có hướng / lack of direction |
| `minor-wands-two` | Chọn hướng / planning direction | kế hoạch chưa rõ / unclear plan |
| `minor-wands-three` | Mở rộng và phản hồi / expansion | kỳ vọng và chờ đợi / waiting |
| `minor-wands-four` | Cột mốc chung / milestone | thuộc về chưa vững / uncertain belonging |
| `minor-wands-five` | Va chạm ý kiến / clashing ideas | né hoặc kéo dài tranh luận / avoided debate |
| `minor-wands-six` | Ghi nhận / recognition | lệ thuộc lời khen / approval dependence |
| `minor-wands-seven` | Giữ lập trường / holding position | phòng thủ liên tục / constant defense |
| `minor-wands-eight` | Nhịp nhanh trao đổi / rapid communication | chồng thông tin / crossed messages |
| `minor-wands-nine` | Kiên cường có nghỉ / resilience | ép cố quá sức / pushing too hard |
| `minor-wands-ten` | Gánh trách nhiệm / responsibilities | chia hoặc khó nhờ giúp / release or support |
| `minor-wands-page` | Khám phá sáng tạo / creative curiosity | ngại thử hoặc thiếu hướng / blocked exploration |
| `minor-wands-knight` | Hành động nhiệt huyết / enthusiastic action | vội hoặc đổi liên tục / haste |
| `minor-wands-queen` | Tự tin ấm áp / warm confidence | so sánh / comparison |
| `minor-wands-king` | Tầm nhìn phối hợp / coordinated vision | áp đặt hoặc thiếu thực hiện / imposed vision |
| `minor-cups-ace` | Mở lòng cảm xúc / openness | khó đón nhận / difficulty receiving |
| `minor-cups-two` | Đáp lại hai phía / reciprocity | chưa đồng điệu / misalignment |
| `minor-cups-three` | Tình bạn sẻ chia / friendship | áp lực hòa nhập / fitting in pressure |
| `minor-cups-four` | Khoảng lặng trước lời mời / contemplation | quan tâm trở lại hoặc cần nghỉ / rest |
| `minor-cups-five` | Thừa nhận mất mát / disappointment | thấy điểm tựa hoặc cần thời gian / support |
| `minor-cups-six` | Ký ức và lòng tốt / memory | lý tưởng hóa quá khứ / idealization |
| `minor-cups-seven` | Nhiều khả năng / possibilities | làm rõ tiêu chí / criteria |
| `minor-cups-eight` | Xem lại ý nghĩa / meaning and redirection | quen thuộc hay né cảm xúc / avoidance |
| `minor-cups-nine` | Hài lòng hiện tại / contentment | kỳ vọng không đáp nhu cầu / unmet needs |
| `minor-cups-ten` | Giá trị chung / belonging | hình ảnh lý tưởng / ideal happiness |
| `minor-cups-page` | Gọi tên cảm xúc / naming feeling | khó bộc lộ / expression difficulty |
| `minor-cups-knight` | Bày tỏ có cân nhắc / considered expression | lý tưởng hoặc hứa thiếu làm / promises |
| `minor-cups-queen` | Thấu cảm có ranh giới / empathy | ôm cảm xúc người khác / taking in too much |
| `minor-cups-king` | Cân nhắc khi cảm xúc mạnh / perspective | dồn nén hoặc để cảm xúc quyết / suppression |
| `minor-swords-ace` | Ý rõ có dữ kiện / clarity | thông tin thiếu / missing facts |
| `minor-swords-two` | Hai hướng chưa rõ / indecision | quá tải quyết định / pressure |
| `minor-swords-three` | Đau lòng có điều kiện / heartache | dịu nỗi đau không ép / gentleness |
| `minor-swords-four` | Nghỉ tâm trí / mental rest | khó nghỉ hoặc trở lại sớm / restlessness |
| `minor-swords-five` | Giá phải trả để thắng / conflict cost | hòa giải không chịu hại / reconciliation |
| `minor-swords-six` | Bước chuyển / transition | còn vướng / unresolved |
| `minor-swords-seven` | Kín đáo và trách nhiệm / discretion | thẳng thắn có riêng tư / honesty |
| `minor-swords-eight` | Mắc kẹt và giới hạn thật / constraints | lựa chọn nhỏ hoặc hỗ trợ / choice |
| `minor-swords-nine` | Lo và dữ kiện / worry | chia sẻ không đòi hết lo / sharing |
| `minor-swords-ten` | Kết thúc khó / difficult ending | bắt đầu lại không ép / restart |
| `minor-swords-page` | Hỏi và kiểm tra / questions | thông tin chưa đủ / incomplete information |
| `minor-swords-knight` | Quyết đoán có lắng nghe / decisiveness | vội kết luận / hasty conclusions |
| `minor-swords-queen` | Ranh giới thẳng thắn / direct boundaries | bảo vệ quá chặt / overprotection |
| `minor-swords-king` | Tiêu chí công bằng / fair criteria | lý lẽ cứng / rigid reasoning |
| `minor-pentacles-ace` | Cơ hội thực tế / practical opportunity | chuẩn bị và khả thi / preparation |
| `minor-pentacles-two` | Điều phối nguồn lực / juggling | ôm quá nhiều / demands |
| `minor-pentacles-three` | Kỹ năng phối hợp / teamwork | vai trò chưa rõ / unclear roles |
| `minor-pentacles-four` | Giữ an toàn nguồn lực / security | nới lỏng hoặc sợ mất / control |
| `minor-pentacles-five` | Thiếu nguồn lực không trách / shortage | hỗ trợ chưa dễ tiếp cận / access |
| `minor-pentacles-six` | Cho nhận tôn trọng / exchange | lệch cân có điều kiện / unequal exchange |
| `minor-pentacles-seven` | Đánh giá nỗ lực / assessment | chờ thiếu phản hồi / impatience |
| `minor-pentacles-eight` | Rèn kỹ năng / practice | máy móc hoặc hoàn hảo / perfectionism |
| `minor-pentacles-nine` | Tự chủ / self-sufficiency | giá trị gắn thành tựu / achievement worth |
| `minor-pentacles-ten` | Nền tảng chung / lasting foundations | kỳ vọng gia đình / expectations |
| `minor-pentacles-page` | Học thực hành / hands-on learning | khó tạo thói quen / starting |
| `minor-pentacles-knight` | Nhịp đều / consistency | cứng hoặc trì trệ / rigid routine |
| `minor-pentacles-queen` | Chăm sóc thực tế / practical care | vượt khả năng / capacity |
| `minor-pentacles-king` | Quản trị nguồn lực / resources | kiểm soát hoặc vật chất / control |

## Hash nguồn

SHA-256 cho UTF-8 text, chuẩn hóa CRLF thành LF; không phải hash artwork hay hash acceptance theo deck.

| Nguồn | Trước R20 | Sau R20 |
| --- | --- | --- |
| `packages/content/data/tarot-cards.json` | `c850fd6a900b6a4bda0add45abf1b9e0a6d4660425aec64f6d17406fb1dc50be` | `2688f997eb10bfcf5a59107b5ff09b7034168eb8a1ca39ac165df2cb192a6865` |
| `packages/agent-config/tarot-card-skills.json` | `e3c91916b7d8817068490e3d74d108b5120e9bd88ed82afcc8a56cf2293b0cb9` | `f713532df2b47112a634376fdcf850a64120f65c55242acc49774a7273a35503` |

Hash canonical trước bằng hash sạch tại HEAD. Hash skill config trước là snapshot working tree khi nhận R20, gồm thay đổi owner có sẵn; không dùng HEAD của config để quy toàn bộ diff cho R20.

## Handoff cho root tích hợp

1. `npm run admin:seed` qua record generator phù hợp và gated runner: tạo lại `apps/admin/generated/content-seed.json` bằng `scripts/build-admin-seed.mjs`. SourceVersion của Admin đổi vì canonical JSON đổi. R20 chưa chạy generator.
2. `npm run supabase:seed:generate`: tạo lại `supabase/seed.generated.sql` bằng `scripts/generate-supabase-seed.mjs`. Đây chỉ là file SQL; không thực thi seed, migration, db push hay publish. Nội dung server/live chỉ được cập nhật qua đường owner cho phép và phải readback. Không được suy từ Expo đọc JSON mới rằng DB đã đổi.
3. Mobile source canonical đọc JSON trực tiếp, root đã nhận thông báo file ổn định. Nếu UI còn keyword cũ, kiểm tra nguồn effective/content bundle/cache/override. Lời tổng hợp/reflection từ server là scope runtime riêng; R20 không sửa prompt hay ngôn ngữ trả lời server.
4. Quality gate `contentSha256` chứa canonicalCard, effective deck intro, visual prompt và scene. Vì toàn bộ 78 meanings đổi, cả **7 deck × 78 = 546 per-card content hash/evidence bindings** cần chuẩn bị/đánh giá lại; không sao chép nhãn PASS cũ chỉ vì đã refresh hash.
5. Các đường mặc định gate sẽ tạo/refresh: `assets/tarot/{moon-garden,rose-mirror,golden-thread,star-seeker,stellar-academy,astral-pop-atelier,classic-arcana}/quality-review.json`. Khi kiểm tra handoff, không có file ở bảy đường mặc định này. Nếu root sử dụng `--review-file` riêng, refresh đúng ledger đó. `stellar-mosaic` dùng source folder `stellar-academy`. Review lại bilingualCopy/reflectionSafety và sceneAndMeaning trên hash mới; artwork không được mặc định chấp nhận từ review canonical.
6. Không chạy legacy `scripts/generate-tarot-data.mjs`; nó có thể ghi đè sửa biên tập. Không tự regenerate artwork chỉ vì content hash đổi; xem artwork/scene có thật sự lệch archetype trước.

## Manager test và phần còn lại

Sau root tích hợp: Explore → Tarot → Classic Arcana → thư viện. Mở bốn lá Three, Page of Wands ngược, Eight/Nine/Ten of Swords, Six of Pentacles và Knight of Pentacles; đổi VI/EN. Kiểm tra từ khóa đúng lá, nghĩa xuôi/ngược khác nhau, một câu hỏi cụ thể đọc được ngay. Đi tiếp reveal/kết quả và Journal để đối chiếu text với đúng ID/orientation; không trộn việc này với kiểm chứng provider của phần tổng hợp.

Rủi ro còn lại: cần reviewer song ngữ độc lập; deck-specific intros vẫn có thể dùng copy cũ hoặc lệch với nghĩa canonical; cần kiểm scene/art/legibility và đủ gate deck trước nghiệm thu. Saved readings/server bundles có thể giữ nội dung cũ. Chưa có nghiệm thu native iOS/Android, UI layout, Admin readback, LLM trace hay cải thiện chất lượng model trong R20. Nội dung gợi ý là diễn giải của Nilaza cho tự phản chiếu; không tuyên bố đây là nghĩa Tarot duy nhất hay dự báo sự kiện.
