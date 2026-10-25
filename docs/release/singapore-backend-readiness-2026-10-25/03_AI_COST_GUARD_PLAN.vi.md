# Gói C — Chặn chi phí AI (kế hoạch; chưa nối vào endpoint)

Ngày 25/10/2026, Asia/Bangkok. Nhà cung cấp: **OpenRouter**, model do Owner cấu hình trong trang quản trị. **Gói này là kế hoạch và thứ tự an toàn, không phải mã đã chạy.** Không đặt khóa nhà cung cấp trên Singapore cho tới khi các lát cắt ở mục 5 đạt.

## 1. Kết luận

- **Hôm nay chưa có lớp nào chặn chi phí đang hoạt động trên đường gọi AI.** Sáu endpoint gọi bộ định tuyến model: `ai-persona-chat`, `ai-tarot-reading`, `ai-council`, `ai-astrology-insight`, `ai-astrology-report`, `ai-daily-insight` (Oracle chạy qua `ai-oracle-turn`, đường riêng — chưa kiểm cách nó gọi nhà cung cấp, nên cũng phải nằm trong cổng). Hạn mức theo người dùng và ngân sách chung mới chỉ có ở lớp SQL/thư viện đã viết, **chưa được endpoint nào gọi**.
- Nền đã có và đã kiểm thử cục bộ (R10, ngày 02/10): giữ chỗ → nhận → biên nhận → kết thúc (`nilaza_ai_usage_*`), worker, adapter RPC — 28 test Deno PASS khi chạy lại hôm nay; 13 nhóm SQL PASS theo hồ sơ R10 (02/10, PGlite — không chạy lại hôm nay). Chiến dịch được seed `disabled`.
- Cho tới khi nối xong, an toàn nhất là **không có khóa** (xem lớp 0).

## 2. Các lớp bảo vệ (từ ngoài vào trong)

| Lớp | Cơ chế | Trạng thái | Ghi chú |
|---|---|---|---|
| **0. Không có khóa** | Không đặt `OPENROUTER_API_KEY`; bộ định tuyến coi là `missing_api_key` và rơi về câu trả lời cục bộ an toàn có nhãn | **Sẵn sàng** (hành vi đã mô tả ở `functions/README.md`) | Ra mắt thử/closed test có thể bắt đầu ở đây: Tarot, thư viện, lá số cục bộ vẫn dùng được; AI sinh văn bản ở chế độ dự phòng |
| **1. Hạn mức khóa phía OpenRouter** | Tạo khóa riêng cho Nilaza với `limit` (USD) và `limit_reset` = daily/weekly/monthly; đặt `limit` ≤ trần ngày đã duyệt (5 USD) hoặc thấp hơn lúc đầu (ví dụ 1 USD/ngày) | **Việc của Owner khi tạo khóa**; cần *management key* của OpenRouter | Tài liệu OpenRouter nêu trường `limit`/`limit_reset` (reset 00:00 UTC) nhưng **không nêu điều gì xảy ra khi chạm trần** — phải thử bằng khóa thử với mức rất nhỏ trước khi tin vào nó |
| **2. Trần ngân sách trong cơ sở dữ liệu** | Campaign: **5 USD/ngày, 50 USD/14 ngày**, 10 USD trong đó cho đánh giá; cảnh báo ở 2 và 4 USD/ngày, 40 USD/chiến dịch; chi phí tính bằng microUSD; vượt dự phòng thì tự tạm dừng | Có SQL + test; **chưa nối**; seed `disabled` | Ngày tính theo UTC+7. Chưa biết hóa đơn thật → attempt chưa rõ giữ nguyên toàn bộ dự phòng |
| **3. Hạn mức theo người dùng** | Chat + Oracle dùng chung **5 lượt/ngày**; Tarot **1 lá/ngày** (đã duyệt). **Đề xuất thêm:** Astrology AI 1 lượt/ngày, Council 1 lượt/ngày | Có SQL cho 3 tính năng đầu; **Astrology/Council chưa có trong chính sách** | Một lượt chỉ tính khi kết quả mới được lưu; lỗi hoàn lượt nhưng không xóa chi phí đã phát sinh |
| **4. Giới hạn mỗi lần gọi** | Đầu vào ≤ 2.000 token; tối đa 2 lần thử/thao tác; `max_tokens` đầu ra theo route; route phải chỉ định model và giá xác định | Một phần: `maxOutputTokens` đã có trong adapter; **chưa có bộ đếm token phía server**, chưa chặn route giá không rõ | Admin phải ghim model cụ thể, không dùng bộ định tuyến “tự chọn” |
| **5. Công tắc dừng** | (a) Xóa secret `OPENROUTER_API_KEY` trên Supabase → rơi về dự phòng ngay; (b) tạm dừng campaign (cập nhật trạng thái); (c) tắt route trong Admin; (d) thu hồi khóa trên OpenRouter | (a) và (d) dùng được ngay khi có khóa; (b) khi lớp 2 nối xong | Ghi rõ ai làm và mất bao lâu có hiệu lực vào sổ vận hành |
| **6. Giám sát** | Admin hiển thị đã dùng/đang giữ/vượt/giờ reset/cảnh báo/tạm dừng; thông báo khi qua ngưỡng 2 và 4 USD; đối soát hàng tuần với bảng điều khiển OpenRouter | **Chưa có** | Không dùng nhật ký quan sát làm hóa đơn |

## 3. Khoảng trống phải đóng (từ R10, cộng thêm hôm nay)

1. **Lưu kết quả theo thao tác:** chưa gắn kết quả bền vững của Chat/Tarot/Oracle với `operation id` trong cùng giao dịch lưu; không được lấy kết quả cũ của cùng người dùng làm biên nhận cho thao tác mới.
2. **Đối soát:** chưa có RPC đối soát cho thao tác đang chạy/chưa rõ chi phí hoặc worker chết; không tự hoàn tiền phần đã gửi.
3. **Giới hạn số lần thử, đồng thời, tốc độ theo người dùng:** quota theo kết quả thành công không giới hạn số lần thất bại.
4. **Token và giá thật:** chưa có bộ đếm token phía server; chưa chặn route giá không rõ; “0,10 USD/thao tác” chỉ là trần kỹ thuật.
5. **Chỉ 3 tính năng trong chính sách** (`persona_chat`, `oracle_router`, `tarot_reading`): Council, Astrology insight, Daily insight, Astrology report và Admin Test Run **chưa có cổng** (quyết định 23/10 đưa Council và Astrology AI vào bản đầu).
6. **Astrology AI đòi quyền `premium_astrology_ai`** kể cả với người dùng miễn phí: cần đường cấp quyền cho nhóm miễn phí (hoặc bỏ điều kiện này trong bản miễn phí) trước khi mở tính năng.
7. **Kiểm thử nhiều kết nối/đồng thời** trên PostgreSQL phù hợp (PGlite chỉ một kết nối).

## 4. Thứ tự phát hành an toàn đề xuất

| Giai đoạn | Điều kiện vào | Cái gì chạy |
|---|---|---|
| **0 — Không khóa** | Gói A áp xong, hàm triển khai | Mọi thứ cục bộ + câu trả lời dự phòng; đủ để chạy closed test về trải nghiệm, đăng nhập, Nhật ký, xóa tài khoản |
| **1 — Một tính năng, trần thấp** | Lát cắt S1–S2 PASS; khóa OpenRouter riêng với `limit` ≈ 1 USD/ngày đã **thử chạm trần**; campaign bật với trần thấp | Chỉ Tarot 1 lá (tính năng ít tốn nhất, đã có policy) |
| **2 — Chat/Oracle** | S3 PASS; theo dõi 3 ngày không có vượt trần | Chat + Oracle (5 lượt/ngày chung) |
| **3 — Astrology AI, Council** | S4 PASS và bộ chấm chất lượng/an toàn R17/R15/R21 đạt (hoặc công tắc tắt từng tính năng) | Astrology insight 1/ngày, Council 1/ngày |
| **4 — Ngân sách closed test** | Giai đoạn 1–3 ổn định | Trần 5 USD/ngày, 50 USD/14 ngày (đã duyệt), khóa OpenRouter `limit` tương ứng |

## 5. Lát cắt triển khai (mỗi lát có nghiệm thu; S = nhỏ, M = vừa, L = lớn)

| # | Nội dung | Cỡ | Nghiệm thu bắt buộc |
|---|---|---|---|
| **S1** | Lưu kết quả theo thao tác: thêm `operation_id` (duy nhất, cho phép NULL) cho bảng kết quả Tarot/Chat; hàm lưu và tra cứu theo thao tác | M | Test mất ACK/crash giữa lưu và kết thúc trên PostgreSQL; kết quả cũ không dùng làm biên nhận mới |
| **S2** | Nối Tarot (1 lá/ngày): reserve → claim → generate → receipt → persist → finish; lỗi → dự phòng + hoàn lượt | M | Test Deno + SQL: lượt thứ 2 bị từ chối; mở lại không gọi nhà cung cấp; campaign `disabled` ⇒ không gọi; xuất hiện đúng trong Admin |
| **S3** | Nối Chat và Oracle (quota chung) | M | Lượt thứ 6 bị từ chối; hai thiết bị cùng lúc không vượt; Oracle và Persona dùng chung nhóm |
| **S4** | Mở rộng chính sách + SQL cho `astrology_insight`, `council` (và quyết định cho daily insight/report); cấp quyền cho nhóm miễn phí | L | Migration chuyển tiếp mới (không sửa tệp đã duyệt); test quota/ngân sách cho tính năng mới; đường quyền khớp server |
| **S5** | RPC đối soát + màn hình Admin (đã dùng/giữ/vượt/giờ reset, cảnh báo, tạm dừng) | M | Thao tác đối soát có biên nhận và nhật ký người vận hành; cảnh báo kích hoạt ở 2 và 4 USD |
| **S6** | Giới hạn số lần thử/đồng thời/tốc độ theo người dùng; giám sát lạm dụng | M | Test tải nhiều thiết bị; thử lại không làm tăng chi phí vô hạn |

## 6. Danh sách kiểm trước khi đặt khóa OpenRouter trên production

- [ ] Gói A đã áp; hàm đã deploy; Admin đăng nhập được; campaign `disabled` đã xác nhận.
- [ ] S1–S3 PASS (S4 nếu mở Astrology/Council).
- [ ] Khóa OpenRouter **riêng cho Nilaza**, `limit` và `limit_reset` đã đặt, **đã thử chạm trần** với khóa thử và hành vi (chặn hay vẫn tính phí) đã ghi lại.
- [ ] Cài đặt riêng tư OpenRouter: không dùng prompt để huấn luyện/không lưu nếu có; model đã chọn có điều khoản phù hợp (tránh model `:free` có điều khoản thu thập).
- [ ] Route trong Admin ghim model cụ thể, giá đã biết, `maxOutputTokens` đặt.
- [ ] Công tắc dừng (xóa secret, tạm dừng campaign, tắt route) đã **diễn tập** một lần.
- [ ] Cảnh báo/giám sát bật; người nhận cảnh báo xác định.
- [ ] Owner duyệt trần ngày và trần chiến dịch bằng chữ.

## 7. Quyết định cần Owner

1. Có chạy closed test **giai đoạn 0 (không AI)** trước không? *(đề xuất: có — ít rủi ro chi phí, kiểm đăng nhập/xóa tài khoản/Nhật ký trước)*
2. Trần ngày lúc đầu khi bật giai đoạn 1: *(đề xuất 1 USD/ngày cho khóa và campaign, tăng dần lên 5 USD)*.
3. Hạn mức Astrology AI và Council: *(đề xuất 1 lượt/ngày mỗi loại)*; Astrology AI có mở cho người dùng miễn phí không.
4. Model nào và nhà cung cấp phụ nào (xem điều khoản dữ liệu) — chọn trong Admin sau khi S2 xong.
