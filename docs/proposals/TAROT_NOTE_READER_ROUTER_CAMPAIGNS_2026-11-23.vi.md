# Lô C còn lại: lời nhắn riêng, gợi ý người dẫn thông minh, chiến dịch model (23/11/2026)

Tài liệu đề xuất. Chưa sửa mã app, Edge Function hay cơ sở dữ liệu. Thiết kế màn hình nằm trong canvas
"Nilaza — Thiết kế lại Tarot & Astrology", hàng 10: `TarotFreeNote`, `ReaderSuggest`, `TarotNoteStates`,
`AdminModelCampaigns`.

Owner quyết ngày 23/11: chọn model theo gói chuyển sang Lô D; đồng ý chạy thử mù 20 câu hỏi tiếng Việt; muốn
Admin chọn model theo từng tính năng và chạy chiến dịch thử trên dữ liệu thật; muốn gợi ý người dẫn hiểu ý định
người dùng thay vì chỉ theo bộ bài.

## 1. Lời nhắn riêng cho bạn (Free, 1 lần/ngày)

**Vị trí:** ngay dưới "Tóm lại" trên màn kết quả, trước mục lục báo cáo 9 phần.

**Nội dung (150–250 từ):** trả lời thẳng câu hỏi; gọi tên nhu cầu bên dưới câu hỏi; gắn ý vào đúng vị trí lá
(vị trí "Người ấy" là cách người dùng cảm nhận, không đoán suy nghĩ người kia); kết bằng một câu có thể hỏi
người thật. Dòng nhỏ: "AI viết riêng cho câu hỏi này · gợi ý để soi chiếu, không phải lời phán". Nút
"Đúng / Chưa" ghi phản hồi.

**Mục lục báo cáo:** phần 1 đọc được, phần 2–9 có khóa, một đoạn mờ, nút "Mở báo cáo đầy đủ". Không đếm ngược,
không giảm giá ép (quyết định Q3 ngày 21/11).

**Trạng thái:** đang viết (khung xám, đọc lá trong lúc chờ); khách (mời đăng nhập, giữ trải bài); đã dùng lượt
hôm nay (đọc lại lời nhắn cũ, bài đọc Nilaza vẫn đủ); lỗi/mất mạng (không trừ lượt, nút Thử lại, không hiện chữ
dự phòng như thể AI viết). Câu hỏi có dấu hiệu khủng hoảng: không viết, hiện thẻ 115.

**Kỹ thuật:** chế độ mới `note` trong `ai-tarot-reading` (dùng chung kiểm tra đăng nhập, hạn mức, công tắc), route
riêng `tarot_note` (model rẻ, 700 token, 20 giây), khuôn JSON ngắn `{note, need, askThem}`. Hạn mức: dùng chung
"1 bài AI Tarot/ngày" của Free (quyết định 04/11). Cần migration thêm `tarot_note` vào danh sách tính năng route.

## 2. Gợi ý người dẫn theo ý định

**Vấn đề đã xác nhận trong mã:** `getRecommendedTarotGuide(deckId)` trong `apps/mobile/App.tsx` chỉ dựa vào bộ
bài (`tarotGuideDeckDefaults`), lý do hiển thị cũng theo bộ bài. Câu hỏi và chủ đề không được dùng. Vì vậy người
hỏi công việc vẫn có thể thấy Inner Child Healer, người hỏi tình yêu thấy Clear Strategist.

**Thiết kế hai tầng:**

1. **Tầng luật (miễn phí, trong máy, luôn chạy):** chấm điểm từng người dẫn theo chủ đề người dùng chọn (trọng số
   lớn nhất), từ khóa tiếng Việt/Anh trong câu hỏi (ví dụ "người cũ, crush, chia tay" → tình yêu; "sếp, đổi việc,
   lương" → công việc; "tổn thương, ba mẹ, hồi nhỏ" → chữa lành), dữ kiện lá (nhiều Cốc → cảm xúc/quan hệ,
   nhiều Kiếm → quyết định, nhiều Ẩn chính → chiều sâu) và một trọng số nhỏ theo bộ bài. Kết quả: một gợi ý chính
   kèm lý do nêu đúng câu hỏi và lá, hai người dẫn thay thế mỗi người một câu "nếu bạn muốn…", hai câu mở đầu.
2. **Tầng AI (tùy chọn):** chỉ gọi khi tầng luật chưa chắc (điểm hai người đầu sát nhau hoặc câu hỏi không có từ
   khóa). Một model nhỏ đọc câu hỏi, chủ đề và tên lá, trả JSON `{intent, emotionalLoad, slug, reason}`; slug
   phải thuộc danh sách người dẫn đang bật, sai thì bỏ. Hết 4 giây hoặc lỗi: dùng kết quả tầng luật. Route
   `reader_router` chọn trong Admin (cần migration).

**Lời nhắc khi chọn lệch chủ đề:** hiện một lần mỗi trải bài, không chặn: "Clear Strategist thường dẫn chuyện công
việc và quyết định. Câu bạn hỏi là chuyện tình cảm… Bạn muốn góc nhìn nào?" với hai nút "Vẫn hỏi…" và
"Đổi sang…".

**Về "nhiều model cùng quyết định":** đề xuất **không** gọi 3 model cho mỗi lần gợi ý (tốn gấp 3, chậm hơn, lợi
ích nhỏ với một lựa chọn trong 6 người dẫn). Thay vào đó Admin chạy chiến dịch so OpenAI, Gemini, DeepSeek… trên
lượng người dùng thật, chọn model thắng. Nếu sau này cần, có thể thêm chế độ "hai model đồng ý mới dùng AI, không
thì dùng luật" cho câu hỏi khó.

**Số đo:** tỉ lệ chọn đúng gợi ý chính; tỉ lệ chọn lệch chủ đề; tỉ lệ đổi lại sau lời nhắc; tỉ lệ hỏi tiếp từ 2 tin
trở lên; tỉ lệ cần gọi AI. Ghi vào `usage_events`, không ghi nội dung câu hỏi.

**Riêng tư:** tầng luật không gửi gì ra ngoài. Tầng AI gửi câu hỏi tới nhà cung cấp như bài đọc chuyên sâu; cần
đăng nhập, hạn mức, công tắc; ưu tiên route có `zdr` / `data_collection: "deny"`.

## 3. Admin: model theo tính năng và chiến dịch thử

**Đã có:** trang Model router cho phép xuất bản chuỗi model (tối đa 4 bước) cho 6 tính năng; chưa có `tarot_note`,
`reader_router`; chưa có chiến dịch.

**Thêm:**

- Thẻ "Tuyến model đang chạy" cho Lời nhắn riêng, Đọc chuyên sâu, Gợi ý người dẫn.
- **Chiến dịch:** tính năng, 2–3 bản (mỗi bản là một chuỗi model), tỉ lệ chia người dùng (cố định theo người dùng
  bằng băm mã tài khoản), ngày bắt đầu/kết thúc, đối tượng (đã đăng nhập, ngôn ngữ), điều kiện dừng sớm (lỗi định
  dạng, chi phí).
- **Bảng số đo theo bản:** lượt, "Đúng điều bạn nghĩ", mở báo cáo, hỏi tiếp, chi phí/lượt, thời gian p95, lỗi
  định dạng, dự phòng. Chênh lệch nhỏ hơn khoảng tin cậy ghi "chưa đủ dữ liệu". Admin chỉ thấy số đếm.
- Nút "Chọn bản thắng và xuất bản" (ghi nhật ký, chỉ vai trò được phép).

**Cần migration (Owner duyệt riêng):** (a) thêm `tarot_note`, `reader_router` vào tính năng route + route mặc định;
(b) bảng `model_campaigns` và `model_campaign_variants`, cột `campaign_id`/`variant` trong dấu vết AI và
`usage_events`; RPC xuất bản chỉ Admin. Router đọc chiến dịch đang chạy trước route mặc định.

## 4. Chạy thử mù 20 câu hỏi tiếng Việt

**Mục đích:** chọn model cho lời nhắn riêng (Lô C) và model mặc định cho báo cáo Premium (Lô D).

**Bộ câu hỏi (tình yêu 6, công việc 5, bản thân 5, gia đình 2, chung 2):**

1. Mình có nên nhắn lại cho người cũ không?
2. Người ấy có thật lòng với mình không?
3. Mối quan hệ mập mờ này sẽ đi về đâu?
4. Mình có nên tỏ tình với bạn thân không?
5. Vì sao mình cứ yêu những người không yêu lại mình?
6. Hai đứa cãi nhau suốt, có nên tiếp tục không?
7. Sếp mới hay soi, mình có nên xin chuyển nhóm?
8. Mình có nên nghỉ việc để kinh doanh riêng?
9. Tháng này mình có nên đòi tăng lương?
10. Mình đang chán việc nhưng không biết muốn gì.
11. Có nên nhận lời mời làm ở công ty khác lương cao hơn nhưng xa nhà?
12. Vì sao mình hay trì hoãn dù biết việc quan trọng?
13. Mình đang kiệt sức, cần thay đổi điều gì?
14. Làm sao để bớt so sánh mình với người khác?
15. Mình có đang sống đúng với điều mình muốn không?
16. Năm nay mình cần buông bỏ điều gì?
17. Ba mẹ không ủng hộ lựa chọn của mình, nên làm sao?
18. Mình và anh chị em đang căng thẳng, có nên chủ động làm lành?
19. Tuần tới mình nên chú ý điều gì?
20. Năng lượng của mình lúc này đang thế nào?

**Cách chạy:** mỗi câu cố định một bộ lá (gieo hạt cố định, trộn chủ đề và kiểu trải). Mỗi model viết cùng lời
nhắc; tên model ẩn thành Bài X/Y/Z, thứ tự xáo; Owner chấm "bài nào hay nhất" và đánh dấu bài sai (đoán ý người
khác, nói chung chung, không trả lời câu hỏi). Sau khi chấm xong mới hiện tên, chi phí, thời gian.

**Hai cách làm, cần Owner chọn:**

- **A (đề xuất):** mở rộng `admin-ai-eval-run` nhận "route thay thế" cho từng bản, chạy trong Admin. Cần sửa mã,
  deploy `admin-ai-eval-run` và `ai-tarot-reading` (Owner duyệt), dùng ngân sách chạy thử 1 USD/tháng đã có
  (ước tính 20 câu × 3 model ≈ 0,1–0,4 USD).
- **B:** script chạy trên máy Owner bằng khóa OpenRouter Owner tự đặt vào biến môi trường; agent không đọc khóa.
  Nhanh hơn nhưng kết quả không nằm trong Admin.

## 5. Thứ tự làm đề xuất

1. Owner duyệt deploy `ai-tarot-reading` + `admin-ai-eval-run` (Lô C phần 1, đã ở `main`).
2. Tầng luật gợi ý người dẫn (chỉ app, không SQL/deploy) — làm được ngay.
3. Migration route `tarot_note`/`reader_router` + chế độ `note` + giao diện lời nhắn.
4. Chạy thử mù (cách A hoặc B) để chọn model cho `tarot_note`.
5. Migration chiến dịch + trang Admin chiến dịch + tầng AI gợi ý người dẫn.
