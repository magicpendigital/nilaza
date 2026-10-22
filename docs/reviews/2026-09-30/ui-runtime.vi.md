# Nilaza — audit UI/UX qua trình duyệt, 30/09/2026

**Đã chạy ứng dụng thật qua trình duyệt tích hợp (IAB).** Chrome không khả dụng với plugin; chủ dự án đã cho phép dùng IAB để thử ChatGPT. Đây là Expo web ở localhost8081 và protected Admin ở localhost4173, kết nối Nilaza Staging QA theo cấu hình hiện tại. Không phải nghiệm thu iOS/Android, font lớn hoặc screen reader trên thiết bị.

Phạm vi thao tác: Home/Explore, Classic và Moon Garden intro, spread/deck/draw/result/learning/save Tarot; guide catalog và Love Oracle hai lượt; form/chart Astrology giờ không rõ và giờ10:30; Premium gate; Admin login/AI Studio/Test Run/Prompt Composer. Các input là tình huống giả lập. Không mở lịch sử chat riêng để đánh giá. Kích thước phone đã xác minh:390×844,360×640; chat Nilaza desktop872×884; Admin1366×900; ChatGPT1061×884. Viewport override đã được reset.

Ảnh là JPEG thực, không mockup hoặc ảnh chỉnh sửa. [Manifest kích thước](screenshots/manifest.json). Một screenshot chỉ chứng minh trạng thái chụp; không chứng minh mọi request đều dùng provider hay cloud sync đã hoàn chỉnh.

## Các điểm hoạt động tốt đã thấy

- Explore, deck intro, chọn spread, quick draw ba lá, result và lưu insight đi được qua UI. CTA dock vẫn hiện trên màn hẹp. Classic/Moon artwork được giữ toàn hình trong slot `contain` ở màn intro đã xem.
- Journal save báo thành công; mở Home ở client/tab khác cùng origin thấy recent Classic mới. Bằng chứng này phù hợp với local persistence, chưa chứng minh cross-device/cloud.
- Chart tính được với dữ liệu giả lập; giờ không rõ giữ Moon Leo/Virgo và không bịa Rising/houses. Nhập giờ10:30 rồi xác nhận lại nơi sinh mở chart chi tiết; có content mythology.
- Admin yêu cầu đăng nhập, sau đăng nhập mở được cả Content Operations và AI Studio. UI ghi rõ preview/not connected, không hiển thị điểm chất lượng giả.

## Findings đã quan sát và đường kiểm thử lại

Mức P1: độ tin cậy hoặc core value; P2: trở ngại hành trình/readability/accessibility; P3: polish/copy. Một số vấn đề đã có trong báo cáo source Mxx; không cộng số bảng này để tuyên bố số lỗi độc lập.

| ID | Mức / evidence | Vấn đề và tác động | Điều kiện đạt |
| --- | --- | --- | --- |
| U01 | P2 · observed + source | **Tarot intro first fold gần như chỉ có artwork và khoảng trống.** Classic/Moon390×844 chưa thấy tên/story; Moon360×640 chưa thấy cả badge Free. CTA footer vẫn có nhưng người mới thiếu lý do chọn bộ | First fold chứa tên, một câu giá trị, trạng thái Free/Premium và CTA; artwork không mất chi tiết. Test390×844,360×640 và native |
| U02 | P2 · observed | Deck intro gom traits, story, sample và library78lá trong một scroll rất dài; thông tin giúp quyết định bị chìm, người dùng cần cuộn nhiều | About/Cards hoặc progressive disclosure; ưu tiên mô tả, sample và hành động. Không coi độ dài DOM là phép đo FPS |
| U03 | P2 · observed | Đi từ Explore/deck intro sang spread rồi chọn deck lại. Deck đã chọn vẫn giữ, nhưng bước xác nhận trùng làm tăng công sức | Shortcut giữ lựa chọn, chỉ xác nhận khi có thay đổi; hành trình/back rõ |
| U04 | P2 · observed | Shortcut deck intro không hỏi ý định trước draw. Result dùng câu mặc định “Thông điệp nào đang cần được nhìn thấy?”/Bản thân nên chất lượng cá nhân hóa hạn chế | Hiện câu hỏi/chủ đề trước rút, cho sửa hoặc bỏ qua rõ; không nhận chuyện đời người dùng như đã được cung cấp |
| U05 | P1 · observed + canonical text | Six of Swords upright / Three of Swords upright / Page of Wands reversed được hiển thị. Three of Swords có câu “Điều bạn bắt đầu đang cần kết nối, phần hỏi và hình đang rõ hơn.” Không tự nhiên và không gắn tốt keywords heartache/separation | QC nghĩa theo lá/suit/position và VI/EN; semantic/content reviewer ngoài schema linter. Seed `tarot-cards.json` chứa đúng câu này, không quy lỗi cho model |
| U06 | P1 · observed | Synthesis mặc định áp “quá khứ… chuyển tiếp”, “nỗi đau và chia cắt… bước cần thiết để chữa lành” khi chưa có sự kiện người dùng | Câu điều kiện/biểu tượng để người dùng xác nhận; không khẳng định đau/chia cắt hoặc sự cần thiết như chuyện đã biết. Actual provider của reading chưa xác minh |
| U07 | P2 · observed | “Vì sao trải bài này nói như vậy?” mở thư viện sáu bài học chung, chưa dẫn tới cards/positions của reading hiện tại | Mở giải thích dựa trên lá và vị trí thật, cho học thêm sau; nhãn phản ánh đúng đích |
| U08 | P2 · observed | “Viết vào Nhật ký” lưu insight ngay và toast “Đã lưu vào Nhật ký”, không mở ô viết. Người dùng có thể tưởng sẽ được ghi cảm xúc | Phân biệt “Lưu insight” và “Viết ghi chú”; bước viết có draft/save/error rõ |
| U09 | P2 · observed + source gap | Deck copy nhắc giọng đọc theo bộ/chat với từng lá/share theo chủ đề; source AI không consume deck editor prompt và share renderer hiện chủ yếu text | Chỉ mô tả capability đã chạy; test tone khác nhau/card context/actual image export trước khi hứa |
| U10 | P2 · observed / visual judgment | Explore có Oracle card lớn đồng thời CTA Oracle sticky; artwork Tarot thumbnail rất tối, khó nhận biết bộ ở glance đầu | Một action ưu tiên rõ; thumbnail nhận diện được artwork/tên, contrast kiểm chứng trước khi chốt. Chưa đo contrast ratio bằng tool |
| U11 | P3 · observed | VI catalog lẫn FREE, PREMIUM-PREVIEW, English/raw theme labels; guide accessibility có “Save favorite guide”. “Biên niên” rỗng trên archetype và Face phase3 copy mang tính triển khai | VI/EN copy đầy đủ; taxonomy thân thiện, ẩn section không phù hợp, future feature có lợi ích/ngữ cảnh rõ |
| U12 | P2 · AX observation, native-unverified | Root Home/Explore/subflow trong một số snapshot không có tab nào selected; explicit tab click mới có selected. Orientation/accessibility state có thể lệch với screen hiện tại | Selected state dựa trên active root destination, kể cả subflow/back; chốt HTML và TalkBack/VoiceOver, không suy mọi reader hỏng từ AX snapshot |
| U13 | P1 · actual two-turn AI | Love Oracle nhắc “Trải bài tình cảm này…” khi fresh room chưa có card/handoff; lượt sau viện The Hanged Man không được cung cấp. Đây là lỗi grounding, không phải bằng chứng backend đã rút lá khác | Không viện reading/card như context có thật; muốn dùng metaphor phải nói rõ giả định và phù hợp consent. Xem [paired evidence](ai-c01-paired-observation.json) |
| U14 | P2 · observed + source M22 | Quick replies vẫn hỏi trải bài khi user đang hỏi chuyện kiểm tra điện thoại. Body tự giới thiệu “The Love Oracle gửi bạn” lặp identity trong header | Follow-up theo turn hiện tại; một câu hỏi/hành động có ích, identity không lặp mỗi reply |
| U15 | P2 · observed desktop + source M05/M06 | Lượt reply thứ hai nằm dưới fold, không tự đưa phần mới vào tầm nhìn ở phiên desktop đã chạy; feedback icon rất nhỏ | New reply indicator/positioning hợp lý; target48px theo brand. Test keyboard/native và lịch sử dài riêng |
| U16 | P2 · observed | Astrology yêu cầu gõ YYYY-MM-DD/HH:mm; đổi unknown-hour sang giờ cụ thể phải xác nhận lại nơi sinh. Hợp đồng tính đúng nhưng interaction khá kỹ thuật | Date/time picker có locale, nhãn giờ không rõ dễ hiểu; giữ place confirmation khi dữ liệu liên quan đổi, giải thích lý do |
| U17 | P3 · observed | Chart/caveat đưa UTC/IANA/calculation identifiers và nhiều disclaimer vào trải nghiệm đọc; tăng tải đọc và khó biết insight nào quan trọng | Một caveat ngắn cạnh dữ kiện liên quan; metadata/engine details vào mục xem chi tiết; không che giới hạn Moon/Rising/houses |
| U18 | P1 · observed + source | Astrology chart xem được nhưng AI input/send bị khóa Premium; unlock chưa có purchase/restore hoàn chỉnh và client khởi tạo tierFree. Không thể retest candidate qua consumer UI hiện tại | Authoritative entitlement + QA path dùng đúng hợp đồng; không bypass guard bằng owner flag hoặc token. Gate server Premium hiện có phải được giữ |
| U19 | P2 · observed + source | Admin Test Run của Tarot ghi NOT CONNECTED; Astrology ghi “No provider test has run from AI Studio”. Optimize/evaluation không có measured scores | Test phải gọi hợp đồng thực và lưu prompt/model/version/schema/result; nếu chưa làm giữ nhãn planned/not connected. UI hiện trung thực nhưng chức năng đánh giá chưa hoàn thiện |
| U20 | P2 · observed | Protected Admin lồng shell + Studio tạo hai navigation layers; desktop hẹp tăng scroll. Standalone Studio desktop đọc dễ hơn; prompt pair textareas chỉ132 px cao | AI Studio được thiết kế desktop, panel sizing/focus và editor expansion phù hợp; không ép Admin về phone consumer layout |
| U21 | P2 · observed + source | Chuyển Test output rồi quay lại Prompt composer: cached candidate vẫn trong editor nhưng status trở về “Loaded from…”. Nhãn unsaved/backend unchanged chỉ hiện lại khi input; có thể hiểu nhầm editor là active | Persist dirty state dựa trên draft so với active pair, giữ nhãn khi load/re-render. `app.js:1939–1953,1994–1998,2660–2667`: input sửa DOM label nhưng không cập nhật status state; cached draft được ưu tiên trong textarea |

## Căn nguyên Tarot hero và hướng sửa

[Classic first fold](screenshots/classic-intro-mobile.jpg), [Classic sau cuộn](screenshots/classic-intro-mobile-after-scroll.jpg), [Moon360×640](screenshots/moon-intro-360x640.jpg).

Source `App.tsx:7934` dùng Image `contain`; style14218–14222 đặt width100% và aspectRatio3/2, không override height. RN Web0.21.2 Image đọc kích thước source106–116 và ghép imageSizeStyle trước styles app331–335. DOM đo tại390px: image/parent width333px, height640px; artwork960×640 được contain thành333×222 trong slot640px; hero ngoài335×1013. `minHeight500` là floor. Khoảng trống trên/dưới artwork và slot cao đẩy nội dung xuống, **không phải crop ở hai intro này**.

Native RN0.81.5 Image cũng ghép dimensions trước props style trong source Android170–172/iOS133–135; hành vi Yoga chưa được đo trên thiết bị, không kết luận chỉ lỗi web. Sửa đề xuất: wrapper có ratio rõ và Image absolute-fill, hoặc height theo container width; giữ contain, đưa tên/short value trước vùng nội dung dài. Existing VisualFeatureCard có computed-height pattern `App.tsx:10093–10116` để tham khảo. Chưa sửa app trong audit này.

## AI và Admin runtime evidence

[C01 controlled hai lượt](ai-c01-paired-observation.json) và [AI review mục8](ai-customer-quality.vi.md) chứa cùng hai user inputs. ChatGPT dùng Temporary + Unpersonalized, UI Pro power5/5; model backend chính xác không có bằng chứng. Nilaza actual model/fallback/version cũng chưa xác minh. Đây là một pair tự nhiên, mỗi sản phẩm có lịch sử reply của chính nó; chưa chạy14case/3repetitions, không có win rate.

Astrology Prompt Composer đã load active pair VI/EN `2026-09-25-ai-insight-v1`, đối chiếu read-only DB với editor, lưu prior pair để rollback. Candidate đã điền vào **editor thật**; UI xác nhận “Astrology prompt browser draft saved” và “Unsaved browser draft · backend prompt is unchanged”. [Bằng chứng draft](screenshots/admin-astrology-draft.jpg). Sau Test Run, UI xác nhận không model call/cost/latency được ghi: [bằng chứng Test Run](screenshots/admin-test-no-provider.jpg). Draft chưa được publish, chưa đo cải thiện runtime.

## Phần chưa nghiệm thu

Welcome/auth/goals của tài khoản mới, password recovery/account switching, Today Pulse/Oracle/Council actual inference, Journal cloud edit/delete/reopen, export/account cloud deletion, payment/restore, offline/retry, full seven-deck/art slots, keyboard/safe area/native back,200%font/ReduceMotion/TalkBack/VoiceOver và performance native. Cần ma trận QA riêng; không tuyên bố đã tìm mọi vấn đề có thể tồn tại.

Changed: tài liệu/evidence và local Admin draft; một insight Tarot giả lập được lưu qua UI, hai turn chat và trace có thể tạo dữ liệu QA qua lifecycle hiện có. Không thay active prompt/model route, entitlements, schema, RLS, payment hoặc app code. Local draft có thể bỏ; prior active pair đã lưu cho rollback nếu triển khai về sau.
