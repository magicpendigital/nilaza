# Nilaza — triển khai UI/UX và chiều sâu nội dung

Ngày 14/10/2026. Theo kế hoạch owner đã đồng ý trong `UX_CONTENT_DEPTH_REVIEW_2026-10-14.vi.md`. Preflight: `feature-plans/mobile-ux-depth-implementation-2026-10-14.json`.

> **Kế hoạch tiếp theo đã cập nhật:** [đánh giá ba ảnh tham khảo và luồng nội dung–Admin–AI–feedback](TAROT_ASTROLOGY_CONTENT_ADMIN_REVIEW_2026-10-14.vi.md). Handoff này chỉ xác nhận phạm vi đợt đầu; chưa có nghĩa nội dung sâu đã chỉnh được từ Admin, AI đã dùng nội dung đó, hoặc feedback đã tới đội vận hành. Sửa parity/provenance và kiểm một lát cắt đầy đủ được ưu tiên trước mở rộng 72 lá còn lại.

## Đã tích hợp trong mã

| Phần | Thay đổi | Cách owner kiểm tra |
|---|---|---|
| Tarot AI | Giữ mọi section hợp lệ; thông điệp chính lên trước nghĩa tham khảo; mở được phần đầy đủ. Response thiếu trường hợp lệ dùng nội dung có sẵn, có nhãn rõ. | Kết quả ba lá → Đọc diễn giải đầy đủ → đọc đủ các phần, không nhầm nghĩa tham khảo là diễn giải riêng. |
| Tarot lưu/mở lại | Snapshot có sections, ngôn ngữ, phiên bản hiển thị và prompt ID. Màn kết quả đọc nghĩa đã lưu trước nghĩa thư viện hiện tại. Nhật ký cũng đọc được sections khi nguồn gốc chưa mở lại được. | Lưu → Nhật ký → mở diễn giải → mở nguồn; nội dung giữ nguyên. Snapshot cũ thiếu sections vẫn đọc được phần đã lưu. |
| Tarot thử lại | Giữ cùng lá và ID bài đọc; khóa thao tác gửi trùng; không ghi thêm sự kiện tiêu hao lượt Tarot local. Chỉ hiện nút khi có đường AI đăng nhập phù hợp. | Khi AI chưa hoàn tất → thử lại → kiểm các lá và số lượt local. Retry/provider quota online cần QA ở môi trường đã được duyệt. |
| Astrology ngữ cảnh | Câu hỏi mẫu gọi đúng thiên thể/cung; góc hợp nêu hai thiên thể và loại góc. Dữ kiện đang chọn được ưu tiên trong giới hạn request hiện hành, kể cả nhà ngoài 1/4/7/10. | Chọn Sao Kim và một góc hợp → chọn câu hỏi → đối chiếu chủ thể/dữ kiện trong request giả lập. |
| Astrology chiều sâu | Giữ tất cả patterns/tensions/focus/reflection hợp lệ, tiêu đề, nguồn tham chiếu và lưu ý. Tóm tắt trước; có nút đọc toàn bộ. Phân biệt đầu ra mock với AI thật. | Mở mọi phần của fixture dài; không mất phần sau các ngưỡng cũ. Bấm nguồn để quay về vị trí tương ứng. |
| Astrology cách đọc | Nối chức năng hành tinh, lăng kính cung và nhà Whole Sign từ model đã tính; không gán nhà cho góc hoặc khi thiếu dữ kiện. Mở thêm nguồn lực, điều quan sát và câu hỏi của cả 12 hướng dẫn cung. | Đọc Sun rồi Venus cùng/khác cung; so sánh chủ đề; mở lăng kính cung; kiểm trường hợp không có nhà. |
| Học Tarot | Sáu bài có nút chọn từng bài; mặc định một lá cho lượt mới; có thực hành một lá và câu hỏi mẫu chọn/sửa được. Câu hỏi trong hướng dẫn bộ bài cũng chọn được. | Học Tarot → chọn bài → Thực hành một lá → sửa câu hỏi → tiếp tục. |
| Thư viện mẫu | Sáu lá có sáu phần VI/EN: biểu tượng, xuôi, ngược, ví dụ, hiểu nhầm, thực hành. Xóa khối nghĩa lặp ở màn học lá. | The Fool, The Hermit, Two of Cups, Four of Swords, Eight of Pentacles, Queen of Wands → mở bài học sâu. |
| Toàn app | Thư viện guide mở danh sách; mục gần đây mở đúng mục Nhật ký; nút mở nguồn chỉ hiện cho loại được hỗ trợ. Nhãn kỹ thuật được thay bằng ngôn ngữ người dùng; privacy copy phân biệt đường local/cloud. | Home → một mục gần đây; Explore → Thư viện guide; Profile → Riêng tư & dữ liệu. |

Thư viện chuyên sâu hiện là **6/78 lá đại diện**. Bản này chưa phải mở rộng hoàn tất 78 lá. Phần biểu tượng được ghi rõ là lăng kính truyền thống, không khẳng định mọi bộ bài vẽ cùng một cảnh. Canonical meanings, nghệ thuật, phép tính chart và các hợp đồng auth/credits không được tái tạo.

## Theo từng đợt của kế hoạch

| Đợt | Trạng thái |
|---|---|
| 1 — Tính đúng và không mất nội dung | Đã tích hợp và kiểm tự động; cần xác nhận thao tác app/native và retry online. Các section Tarot chưa có ID card/position rõ được giữ như phần tổng thể, không tự gán theo thứ tự. |
| 2 — Trải nghiệm mẫu đủ sâu | Đã tích hợp sáu lá và cách đọc chart; có fixture kết quả ba lá, chưa có bằng chứng chất lượng AI production. |
| 3 — Hành trình người mới | Đã tích hợp các sửa cụ thể; chưa thực hiện nghiên cứu với người dùng mới thật. |
| 4 — Mở rộng và kiểm AI | Đã chuẩn bị 12 tình huống song ngữ và rubric; chưa chạy provider benchmark hoặc đối chiếu ChatGPT, chưa mở rộng 72 lá còn lại. |
| 5 — Hybrid | Đã đo bản dựng và chuẩn bị pack Rose Mirror 78 lá + manifest SHA-256 + ZIP đã kiểm. Chưa upload, chưa bật tải online, chưa nghiệm thu cache/resume/offline của pack tải. |

## Bằng chứng và kiểm tra

Thư mục bằng chứng: `../artifacts/ux-depth-implementation-2026-10-14/`.

- Full mobile suite cuối: **48 suites, 302 tests PASS**. Hai suite client/điều hướng liên quan cũng đã được kiểm riêng với 36 tests PASS.
- Mobile TypeScript cuối, validate:data, astrology:ai-contract:check và runtime-check PASS; trạng thái và SHA-256 source/artifact ghi trong `evidence.json`.
- Brand và visual/runtime asset checks PASS; không có artwork mới.
- Metro production web export + validate:mobile-export và Android embedded bundle đã chạy. Sau chỉnh sửa source cuối, chỉ bản dựng cuối trong evidence.json được dùng làm nguồn bàn giao.
- Jest ban đầu bị lỗi ghi cache trong thư mục sandbox; chuyển cache của lượt này vào workspace rồi chạy thành công. Không nới kiểm tra hoặc bỏ test.
- Dev static export bị lỗi chunk React Native; preview dùng Expo dev server. Production không có cấu hình online hiển thị trạng thái thiếu cấu hình đúng như runtime guard. Không sửa guard để vượt qua.

Các ảnh QA, nếu có, là từ đường `__DEV__` với dữ liệu giả lập và component thật. Harness không có tài khoản, không lưu vào AsyncStorage, không gửi câu hỏi/AI/cloud. Save/reopen trong harness là vòng JSON trong bộ nhớ; tests và walkthrough tài khoản/native là những lớp bằng chứng riêng.

Preview đã kiểm ở 390 × 884: Tarot VI/EN mở đủ ba section, vòng lưu/mở lại JSON giữ nội dung, câu hỏi mẫu điền vào ô sửa và chọn bài học thứ hai thay nội dung bài thứ nhất. Astrology chọn Sao Kim Kim Ngưu đã tạo đúng câu hỏi về Sao Kim; câu chuyện dùng Nhà 11 từ fixture Whole Sign. Mở sâu lăng kính cung và kiểm ở 320 × 720; root scroll width là 320 px. Đây chưa phải chứng nhận toàn bộ accessibility hoặc font scaling.

Ảnh từ component thật với dữ liệu giả lập:

![Tarot — bài học sâu tiếng Việt](../artifacts/ux-depth-implementation-2026-10-14/tarot-card-depth-vi.jpg)

![Astrology — Sao Kim Kim Ngưu và nhà tính từ fixture](../artifacts/ux-depth-implementation-2026-10-14/astrology-venus-story-vi.jpg)

Danh sách tám ảnh và quan sát: `browser-observations.json`. Phép so sánh AX đầu tiên dùng bản diff nên không đủ dữ liệu; đã đối chiếu lại bản đầy đủ và xác nhận giữ đủ ba section. Không coi kết quả diff thiếu nội dung là lỗi mất dữ liệu.

## Dữ liệu hybrid và giới hạn đo

`content-measurement.json` ghi dung lượng source và các folder xuất bản. Tổng folder Android có cả sourcemap phục vụ kiểm tra; không được coi là dung lượng APK/IPA. Thư viện mẫu mới khoảng 19 KB, nên bổ sung chiều sâu văn bản không phải lý do chính để bắt người dùng tải cả nội dung online.

Pack pilot ở `rose-mirror-pilot/manifest.json` và `rose-mirror-cards.zip`: đủ 78 ID, SHA-256 từng ảnh và toàn archive, ZIP đọc lại và kiểm khớp hash. `approvedOrigin` đang trống, `activationStatus` là `prepared_local_only`. App hiện vẫn bundle các bộ bài; chưa tuyên bố tiết kiệm dung lượng từ việc tháo pack ra khỏi app.

## Whole-App, quyền riêng tư và rollback

Các section được giữ trong `sourceSnapshot` qua đường lưu/đồng bộ Nhật ký hiện có; không thay schema database. Astrology vẫn chỉ gửi facts được cho phép và câu hỏi hiện tại sau consent, không thêm birth data, Journal hay lịch sử chat. Các thay đổi không publish prompt/model hoặc gọi provider. Không retarget Supabase, bật allowlist, chạy migration hay deploy.

Rollback: revert đúng diff của lượt này; fields snapshot mới là tùy chọn, nên dữ liệu cũ vẫn tương thích. Giữ default deck và Astrology core offline. Không reset workspace vì có thay đổi có sẵn của owner/các lượt khác.

Skill Plan & QC, Brand Experience và Tarot Content QC vẫn phù hợp; inventory A2UI đã cập nhật `ReadingDetails`. Không thay quy tắc nhận diện hoặc sản xuất deck. Một lần preflight bị chặn vì bốn file Jest cache mới chưa ghi inventory; thứ tự chạy đã được sửa và gate được chạy lại. Chi tiết nằm trong plan/evidence.

Rà React cuối: hooks giữ thứ tự ổn định, toggle dùng functional state update, phần sâu là trình bày thuần không fetch/save, snapshot có version và tương thích trường cũ, QA import chỉ nằm trong nhánh `__DEV__`. Web production đã xác nhận loại đường QA ra khỏi bundle. Các lời khuyên Next.js/DOM của skill không áp vào React Native.

## Phần cần nghiệm thu tiếp

Owner kiểm mẫu nội dung và luồng trên iOS/Android; mở rộng toàn bộ 78 lá sau khi dùng mẫu làm chuẩn biên tập. Chạy bộ 12 tình huống trên AI trong môi trường QA đã được duyệt để đánh giá chất lượng thực và chi phí. Pilot online cần origin, chính sách quyền truy cập, cache/resume/rollback và mapping target đúng quyết định owner. Các cổng cloud và production của `AGENTS.md` vẫn áp dụng; gói local này không tự cấp quyền kích hoạt chúng.
