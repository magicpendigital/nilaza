# Nilaza — ưu tiên UI/UX, chiều sâu nội dung và phân phối dữ liệu

Ngày: 14/10/2026. Owner đã đồng ý hướng lưu trữ kết hợp và bổ sung ưu tiên UI/UX; feedback chất lượng áp dụng cho **cả thư viện lẫn câu trả lời AI**.

> **Cập nhật sau đợt triển khai đầu và ba ảnh tham khảo của owner:** đọc [báo cáo nội dung và Admin toàn tuyến](TAROT_ASTROLOGY_CONTENT_ADMIN_REVIEW_2026-10-14.vi.md) để dùng kế hoạch tiếp theo mới nhất. Ưu tiên được điều chỉnh: tính đúng cấu hình, provenance và feedback → một lát cắt Admin–app–AI hoàn chỉnh → đánh giá có đo lường → mở rộng nội dung → pilot hybrid. Phần dưới giữ làm hồ sơ đánh giá ban đầu; trạng thái triển khai nằm trong [handoff đợt đầu](UX_CONTENT_DEPTH_IMPLEMENTATION_2026-10-14.vi.md).

## Quyết định ưu tiên

Giữ hướng hybrid đã đề xuất: một bộ Tarot đầy đủ và Astrology cốt lõi trong app; thư viện mở rộng có thể tải theo nhu cầu. Đưa tính đúng, khả năng đọc đủ nội dung, và hoàn thành lượt đầu của người mới lên trước việc chuyển hàng loạt tài nguyên sang online. Đo dung lượng và hiệu năng có thể làm song song. Không cần thay model hoặc tăng độ dài mọi câu trả lời trước khi khắc phục chỗ mất dữ liệu trên đường tới UI.

Đây là hồ sơ đánh giá và kế hoạch, không phải xác nhận đã sửa sản phẩm hoặc đã nghiệm thu production. Preflight: `docs/feature-plans/mobile-ux-depth-audit-2026-10-14.json`. Các thay đổi có sẵn của workspace được giữ nguyên.

## Phạm vi và giới hạn bằng chứng

- Đọc mã nguồn hiện tại: Home, Explore, Chat, Tarot, Astrology, Journal, Profile; dữ liệu tĩnh; hợp đồng và lớp hiển thị kết quả AI.
- Các phát hiện mã nguồn là `code_supported_risk` hoặc `code_supported_fact`; không thay thế bằng chứng thao tác trực tiếp.
- Preview web: chỉ chạy local, dotenv tắt, các endpoint Supabase/API/Admin trống, trace QA tắt, dữ liệu giả. Ảnh và nhật ký chạy ở `artifacts/ux-depth-audit-2026-10-14/` nếu truy cập thành công.
- Native iOS/Android, screen reader, font scaling hệ điều hành, hành vi AI online và model/prompt đang được publish: **unverified** trong lượt này.
- Chưa có cặp đầu ra Nilaza/ChatGPT cho cùng đầu vào. Không kết luận model yếu hơn, không chấm điểm thắng/thua và không coi lượt chạy fallback là mẫu chất lượng AI production.

## Những điểm tốt cần giữ

Home đã có CTA chính Today Pulse và hành động Chat/Journal; Tarot có hai nhánh học và trải bài, thư viện 78 lá, rút từng lá và lưu/hỏi tiếp. Astrology có bộ tính thực, quy tắc bất định giờ sinh, 12 hướng dẫn cung, thần thoại có phân biệt dị bản và thực hành. Nhật ký đã có tìm kiếm, lọc, ghi chú và trạng thái lưu. Đánh giá này không đề xuất thiết kế lại nhận diện Open Reflection hoặc thay năm tab chính.

## Đánh giá theo khu vực và luồng người mới

Đây là đánh giá cấu trúc luồng từ mã, chưa phải kết luận về kích thước chữ, khoảng cách, độ tương phản hay vùng chạm trên thiết bị.

| Khu vực | Nhận định hiện tại | Cải thiện ưu tiên |
|---|---|---|
| Home | Có một hành động chính rõ trong cấu trúc; mục gần đây chưa dẫn thẳng vào đúng bài. | Giữ trọng tâm hôm nay; cho tiếp tục đúng nội dung đã mở. |
| Explore | Có các điểm vào Tarot/Astrology; một số nhãn chưa khớp đích hoặc chứa thuật ngữ nội bộ. | Người mới hiểu được sẽ nhận gì sau mỗi lần bấm; nhóm theo nhu cầu khám phá, học và thực hành. |
| Học Tarot/thư viện lá | Đủ danh mục cơ bản nhưng độ sâu của các khối chưa đồng đều, có lặp và chưa nối chặt với thực hành. | Giải thích biểu tượng, ví dụ, khác biệt xuôi/ngược; câu hỏi mẫu chọn được. |
| Trải Tarot/kết quả | Có đủ bước chính, nhưng nguy cơ mất phần AI và fallback chung làm suy giảm giá trị cuối luồng. | Bảo toàn kết quả trước; mặc định một lá cho lượt nhập môn, giữ lựa chọn nâng cao dễ tìm. |
| Thư viện Astrology | Có nội dung cung và thần thoại; cần phân biệt học kiến thức với hiểu chart cá nhân. | Một ý chính, ví dụ, thuật ngữ mở tại chỗ và bài thực hành cho mỗi chương. |
| Chart/AI Astrology | Có dữ kiện tính thực, nhưng gợi ý sai chủ thể và giới hạn phần hiển thị ảnh hưởng chất lượng diễn giải. | Sửa đúng hành tinh/góc hợp; dẫn qua Sun/Moon/Ascendant khi dữ kiện cho phép; mở đầy đủ các phần AI. |
| Chat/hỏi tiếp | Chưa kiểm live persona chat. Đường hỏi tiếp từ Astrology có rủi ro thiếu chủ thể. | Mang theo đối tượng được chọn trong phạm vi đồng ý; đánh giá chất lượng nhiều lượt bằng tình huống giả lập. |
| Journal | Đã có tìm kiếm/lọc/ghi chú; tính liên tục phụ thuộc mở đúng bài và giữ nguyên bản diễn giải đã lưu. | Snapshot đầy đủ, mở lại chính xác, nút quay về nguồn chỉ xuất hiện khi hỗ trợ. |
| Profile/privacy | Copy lưu trữ chưa giải thích đầy đủ đường local/cloud. | Mô tả đúng dữ liệu theo trạng thái tài khoản và đồng bộ thực tế. |

Luồng nhập môn Tarot đề xuất: **chọn nhu cầu → chọn/sửa câu hỏi mẫu → rút một lá → đọc thông điệp chính → mở diễn giải → lưu hoặc hỏi tiếp**. Bộ bài mặc định dùng ngay; tùy chọn đổi bộ và trải nhiều lá vẫn hiện rõ. Đây là thiết kế đề xuất cần kiểm với người mới, chưa phải hành vi đã triển khai.

## Phát hiện ưu tiên

| ID | Mức | Bằng chứng mã nguồn | Ảnh hưởng và nghiệm thu cần có |
|---|---|---|---|
| T01 | P1 | `backendClient.ts:263` và `ai-tarot-reading/index.ts:53` hỗ trợ `sections`; `App.tsx:2356` không giữ các phần đó trong kết quả; `App.tsx:8379` đọc nghĩa chuẩn từng lá. | Diễn giải chi tiết có thể bị mất trước khi hiển thị/lưu. Dùng response giả lập ba phần khác nhau theo ba vị trí; kiểm mọi phần đọc được và vẫn còn sau lưu/mở lại. Chuẩn hóa liên kết section–card–position trước khi coi đó là diễn giải từng lá. |
| T02 | P1 | `backendClient.ts:476` dùng fallback khi không có backend result; `App.tsx:2306` tạo tổng hợp mẫu không dùng câu hỏi; `App.tsx:5079` đi tới kết quả. | Người dùng có thể hiểu phản hồi mẫu ngắn là AI cá nhân hóa. Hiển thị rõ “ý nghĩa có sẵn / chưa có diễn giải AI”, cho thử lại đúng lượt, giữ nguyên lá và tránh trừ credits lặp. |
| A01 | P1 | `AstrologyChartStory.tsx:565` chỉ tách Moon/Ascendant, nhánh còn lại ở `:590` dùng tên Sun. | Chọn Venus/Mars/Saturn có thể tạo câu hỏi về Mặt Trời ở cung của hành tinh đó. Test fixture có Sun/Venus khác cung, kiểm tên/cung đúng ở VI/EN. |
| A02 | P1/P2 | `AstrologyChartStory.tsx:611`, `AstrologyExperience.tsx:457`, `astrologyAiInsight.ts:115` và `:160`: gợi ý “góc hợp này” nhưng request chỉ có câu hỏi và tập facts giới hạn, không có đối tượng UI đang chọn/lịch sử trả lời. | Câu hỏi tiếp có thể mất chủ thể. Ưu tiên câu hỏi tự đủ nghĩa và fact ID đã chọn trong phạm vi dữ liệu được phép. Không tự thêm Journal, birth data hoặc toàn bộ lịch sử vào prompt. |
| A03 | P2 | `astrologyAiInsight.ts:190` chỉ giữ 2 patterns, 1 tension, 1 focus section, 2 reflection questions, tối đa 7 đoạn; panel hiển thị bản đã làm phẳng. | Nội dung hợp lệ có thể không còn đường đọc. Giữ cấu trúc section, tiêu đề, facts/caveats; summary trước và phần chi tiết mở được. Test response hợp lệ vượt các ngưỡng cũ. |
| T03 | P2 | Nghĩa xuôi/ngược VI của 78 lá hiện khoảng 25–41 đơn vị tách khoảng trắng; `App.tsx:8177` và `:8186` lặp nghĩa; `:8408` giải thích chủ yếu bằng cùng nghĩa chuẩn. | Nhiều khối chưa tạo thêm chiều sâu. Cần biểu tượng → ý nghĩa → vị trí trong trải → liên hệ câu hỏi → ví dụ/giới hạn → thực hành; không chỉ tăng số chữ. |
| T04 | P2 | `App.tsx:7860`/`:7890` trình bày sáu bài học nối tiếp; `:8085` câu hỏi mẫu là text; `:7955` vào ô hỏi trống. | Người mới phải tự chuyển kiến thức thành thao tác. Câu hỏi mẫu nên chọn được và sửa được; một bài nhập môn dẫn đến lượt thực hành một lá. Mức khó tìm phải được xác nhận qua walkthrough. |
| T05 | P2 | `App.tsx:8447` lưu interpretation nhưng reopen ở `:4702`/`:4735` tìm canonical cards hiện tại; renderer ở `:8383` đọc lại nghĩa. | Nội dung cũ có thể đổi khi thư viện đổi. Snapshot phải giữ kết quả, locale và phiên bản; “nghĩa hiện tại” là nhánh riêng. |
| A04 | P2 | `AstrologyChartStory.tsx:494`/`:998` ghép glossary hành tinh với hướng dẫn cung/thần thoại; `AstrologySignGuide.tsx:75` ẩn một phần nội dung sâu khi dùng ở chart. | Bản đồ được tính thực nhưng diễn giải vẫn ghép các đoạn chung, chưa tạo tổng hợp hành tinh–cung–nhà. Bổ sung cầu nối dễ hiểu và một liên hệ từ facts thực; không bịa placements/house khi thiếu giờ sinh. |
| G01 | P2 | `App.tsx:6201` nhãn thư viện guide mở guide cụ thể; `HomeExperience.tsx:48` mục gần đây mở danh sách Nhật ký; `App.tsx:9141` có nút nguồn rộng hơn các kiểu handler hỗ trợ. | Nhãn và đích đến cần nhất quán; bấm một mục gần đây phải mở đúng mục, hành động không hỗ trợ phải có giải thích hoặc không xuất hiện. |
| G02 | P2 | `App.tsx:6195`, `:6210`, `:9106`, `:9582`: các từ “preview”, “placements”, “Phase 3 / consent”, “Snapshot nguồn”, “seed trên máy”. | Rà soát ngôn ngữ nội bộ trên mặt người dùng; thay bằng lợi ích, trạng thái và hành động cụ thể. Tách thông tin chẩn đoán cho owner/admin. |
| G03 | P1/P2 | `App.tsx:9353` copy lưu trên máy chưa giải thích đầy đủ các đường đồng bộ tài khoản tại `:3408`. | Privacy copy phải đúng theo runtime: dữ liệu nào ở máy/cloud, trạng thái đồng bộ, xóa/đăng xuất làm gì. Kiểm trên cả local và online được phép, không suy từ bản QA. |

Các line numbers phản ánh source ngày đánh giá và có thể dịch chuyển. Chưa có bằng chứng `numberOfLines` cắt nội dung toàn bộ kết quả Tarot; các chỗ cắt teaser không được gọi nhầm là lỗi cắt diễn giải.

## Cấu trúc nội dung cần hướng tới

### Thư viện Tarot

1. Một ý chính dễ hiểu và hình lá rõ.
2. Hai hoặc ba biểu tượng thực sự có trong tranh, giải thích liên hệ với ý nghĩa.
3. Nghĩa xuôi/ngược: khác biệt cụ thể, tránh biến lá ngược thành kết luận xấu.
4. Ví dụ dùng trong chủ đề quan hệ, tự khám phá hoặc quyết định; không biến thành lời khuyên chuyên môn.
5. Cách hiểu nhầm thường gặp và một câu hỏi thực hành.
6. Nét riêng của bộ bài khi đã được biên tập; giữ ID/nghĩa nền thống nhất.

Thử trên một nhóm lá đại diện Major/Minor/Court trước khi triển khai toàn bộ 78 lá; không nhân bản cùng một mẫu chỉ thay tên lá. Có đủ VI/EN và kiểm nội dung/art thực tế cùng nhau.

### Kết quả Tarot

- Tóm tắt trả lời đúng trọng tâm câu hỏi.
- Từng lá gắn với vị trí và chiều; phân biệt ý nghĩa tham khảo với diễn giải theo câu hỏi.
- Nối các lá: chỗ hỗ trợ nhau, căng thẳng hoặc góc nhìn khác nhau; không chỉ liệt kê.
- Một bước phản chiếu khả thi và câu hỏi tiếp có ngữ cảnh.
- Mở sâu để xem biểu tượng/dữ kiện dẫn tới diễn giải, không trình bày suy nghĩ nội bộ của model.
- Trạng thái AI/local/error rõ ràng và lưu nguyên kết quả.

### Astrology

- Giải thích hành tinh là chức năng/nhu cầu, cung là cách biểu hiện, nhà là lĩnh vực đời sống; đây là khung biểu tượng.
- Đường “Bắt đầu với 3 điểm” dẫn người mới qua Sun/Moon/Ascendant khi đủ dữ kiện; không buộc người mới tự giải mã vòng tròn.
- Một placement cần có câu nối hành tinh × cung × nhà được tính thực; khi không biết nhà thì nói rõ phạm vi.
- Góc hợp nêu đúng hai thiên thể, loại góc và diễn giải có giới hạn.
- Thần thoại, glossary, dữ liệu kỹ thuật và phương pháp tính vẫn có thể đọc sâu nhưng không chiếm mọi màn đầu.
- AI dùng đối tượng đang chọn; nếu facts không đủ thì hỏi rõ hoặc nêu giới hạn, không đoán.

Nội dung đọc nhanh và nội dung đầy đủ cùng tồn tại. Cách phân tầng này phù hợp nguyên tắc [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): người mới thấy phần cần trước, lối đi sâu phải rõ ràng. Nguồn được đọc ngày 14/10/2026.

## Whole-App Impact Brief cho các đợt cải thiện tiếp theo

| Mặt tác động | Phạm vi cần xử lý trước khi triển khai |
|---|---|
| Entry/UI | Home, Explore, thư viện, form, kết quả, hỏi tiếp, quay lại; giữ năm tab và nhận diện; ưu tiên CTA rõ và nội dung đọc được. |
| Dữ liệu | Bổ sung phần diễn giải vào snapshot, version/locale và khả năng đọc snapshot cũ; tải hình sau này không xóa bài đọc. |
| Backend contract | Một schema cho kết quả từng feature; kiểm response, card/fact ID; fallback có trạng thái; retry/idempotency và quyền credits. |
| Admin | Nội dung thư viện nháp/duyệt/publish; prompt/model/version có nguồn; preview phải dùng cùng compiler/schema với runtime. |
| Privacy/safety | Hỏi tiếp chỉ mang phần ngữ cảnh được đồng ý; không thêm birth data/Journal/history âm thầm; giữ disclaimer và xử lý bất định. |
| Quan sát | Đo hoàn thành lượt đầu, lỗi/retry, mở chi tiết, lưu/mở lại; chỉ metadata cần thiết, không log câu hỏi cá nhân. |
| Rollback | Khôi phục renderer/content revision trước; đọc snapshot cũ; giữ local fallback có nhãn; không cần bật cloud để đọc thư viện cơ bản. |
| Giữ nguyên | Bộ tính Astrology, logic chọn lá, auth/credits hiện hành và cloud target không đổi trong audit; mọi thay đổi sau phải có preflight riêng. |

## Thứ tự triển khai đề xuất

| Đợt | Kết quả cần đạt | Nghiệm thu |
|---|---|---|
| 1 — Tính đúng và không mất nội dung | Sửa chủ thể Astrology; giữ sections Tarot và phần sâu Astrology; rõ fallback; snapshot không đổi. | Fixture có dữ liệu khác biệt, render–save–reopen parity, API lỗi/retry không đổi lá hay trừ lặp. |
| 2 — Một trải nghiệm mẫu đủ sâu | Làm một nhóm lá Tarot đại diện, một lượt trải ba lá, một chart/story mẫu và một chương Astrology theo cấu trúc mới. | Owner đọc được cả bản ngắn lẫn đầy đủ; không lặp chung; facts, hình, diễn giải khớp nhau. |
| 3 — Người mới hoàn thành tác vụ | Câu hỏi mẫu có thể chọn; lộ trình một lá/Big Three; nhãn đúng đích; đọc tiếp/lưu/quay lại mạch lạc. | Walkthrough với người chưa biết sản phẩm; ghi số lần cần trợ giúp, bỏ dở và nhầm lẫn; không coi agent persona là người dùng thật. |
| 4 — Mở rộng nội dung và kiểm AI | Mở rộng VI/EN đã qua QC; kiểm input–prompt–provider–parse–UI–save toàn tuyến. | Bộ đánh giá cùng dữ kiện, điều kiện rõ; độ sâu tốt hơn không tăng lỗi/chi phí ngoài ngân sách. |
| 5 — Phân phối dữ liệu hybrid | Thử một bộ phụ tải theo nhu cầu sau khi đo bản build. | Đo giảm dung lượng thực, tải dở/offline/cache/phiên bản/chi phí; giữ mặc định dùng ngay. |

Không cam kết lịch hoặc chi phí triển khai khi chưa chốt lát cắt, mẫu nội dung và schema. Đo build/hiệu năng là luồng song song, không cần đợi hết mọi đợt nội dung.

## Thước đo chất lượng thay cho chỉ đếm chữ

Đề xuất 12 tình huống giả lập (6 Tarot, 6 Astrology), mỗi tình huống VI/EN: hỏi cụ thể/mơ hồ, nhiều lá, lá ngược, Sun khác Venus, góc hợp đang chọn, giờ sinh không chắc và hỏi tiếp. Đầu vào so sánh phải có cùng câu hỏi, cards/positions/orientation hoặc calculated facts, ngôn ngữ và ngữ cảnh được phép. Ghi model/version/prompt/runtime và mức output; không dùng câu trả lời cũ thiếu provenance.

Chấm theo: đúng dữ kiện; trả lời đúng câu hỏi; giải thích cụ thể; liên kết các yếu tố; tránh lặp; hữu ích để tự phản chiếu; dễ đọc; tiếp nối đúng ngữ cảnh; an toàn. Dữ kiện sai hoặc kết luận gây hại là lỗi chặn, dù văn phong trôi chảy. Thêm latency, tỷ lệ lỗi và chi phí mỗi lượt để so sánh có ý nghĩa.

Nếu đối chiếu ChatGPT, reviewer không thấy tên sản phẩm ở vòng chấm đầu; sau đó chủ sản phẩm so sánh cảm nhận. Chưa chạy benchmark này, chưa tuyên bố Nilaza đạt ngang/vượt ChatGPT.

## Kiểm tra triển khai và manager test path

Các sửa UI/content sau này cần mobile check/test, validate:data, validate:visual-assets khi thay hình, web export và Android embedded bundle theo router. Sửa schema/prompt/backend cần canonical contract, kiểm generated consumers và authenticated QA trong môi trường được duyệt; native QA vẫn riêng. Audit này không thay code nên không chạy lại toàn bộ test suite để giả làm nghiệm thu sản phẩm.

Manager path: Explore → một câu hỏi mẫu → một lá → đọc ngắn → mở sâu → lưu → đổi tab → mở đúng lượt; lặp với ba lá. Astrology → thư viện không nhập birth → hướng dẫn cung → chương; fixture chart → Sun → Venus → aspect → câu hỏi tiếp. Sau đó kiểm trạng thái AI lỗi, mất mạng, font lớn, VI/EN và màn hẹp. Nút mới theo chuẩn vùng chạm 48 px của Nilaza; ảnh chụp không chứng nhận đầy đủ accessibility. [W3C về target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) là nguồn tham khảo, không đồng nhất ngưỡng WCAG web với chuẩn sản phẩm Nilaza.

## Bằng chứng giao diện của lượt này

**Trạng thái: kiểm mã nguồn hoàn tất; walkthrough trực quan bị chặn.** Preflight và lệnh khởi động local đã chạy, Metro in địa chỉ `http://localhost:8081/`, nhưng trình duyệt trả `ERR_CONNECTION_TIMED_OUT`; kiểm tra HTTP từ máy cũng không kết nối được và kiểm tra cổng không thấy listener 8081. Chưa xác định nguyên nhân dev server không phục vụ được. Đã dừng phiên chạy do lượt này tạo.

Không có screenshot app hợp lệ, không hoàn thành lượt Tarot/Chart trên trình duyệt, không gọi AI provider. Vì vậy chưa kết luận bố cục đã đạt/không đạt trên kích thước màn hình nào, chưa chấm accessibility và chưa xác nhận mức chất lượng AI production. Nhật ký bằng chứng: `artifacts/ux-depth-audit-2026-10-14/evidence.json`. Khi preview hoạt động, chạy lại manager path phía trên và chụp các bước thực tế trước khi nghiệm thu giao diện.

Các skill Nilaza Plan & QC và Brand Experience vẫn phù hợp: giữ phân biệt đề xuất–tích hợp–nghiệm thu, source content song ngữ và bằng chứng native riêng. Lượt đánh giá chỉ thêm hồ sơ dự án, chưa phát sinh quy tắc bền vững cần sửa skill.
