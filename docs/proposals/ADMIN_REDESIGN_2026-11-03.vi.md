# Đề xuất tái thiết kế trang Admin và nối dữ liệu Admin ↔ App ↔ AI

Ngày 03/11/2026. Căn cứ: đọc mã nguồn `main` tại `033fb86` (sau PR #30) và bảng rà soát 30/10 (`docs/backlog/review-2026-10-30.json`, mã AD-xx, AI-xx). **Đây là đề xuất, chưa sửa mã Admin.** Không xem được giao diện thật vì Admin bắt buộc đăng nhập Supabase; mọi nhận xét giao diện dựa trên mã.

## 1. Kết luận ngắn

Vấn đề lớn nhất của Admin **không phải vẻ ngoài mà là "chỉnh mà không có tác dụng"**: nhiều thứ Owner sửa trong Admin không bao giờ tới app hay mô hình AI, còn nhiều thứ quyết định chất lượng AI lại nằm cứng trong mã, Admin không thấy. Vì vậy thứ tự đúng là: (1) làm cho mỗi ô trong Admin có tác dụng thật hoặc ẩn đi, (2) gom lại điều hướng theo công việc của quản trị viên, (3) rồi mới làm đẹp.

## 2. Hiện trạng giao diện (đã kiểm trong mã)

| Vấn đề | Căn cứ |
|---|---|
| 3 tầng điều hướng trùng nhau: thanh workspace của shell → 5 nút sidebar → 11 tab trong AI Studio | `ai-studio.html:21-25, 44-46` (AD-24) |
| Còn khu "Legacy sample controls" và ô prompt "local preview" không lưu đi đâu | `ai-studio.html:49`, `app.js:990, 2465` |
| Nút "Publish" mang 3 nghĩa tùy tab: phát hành thật / lưu nháp trình duyệt / bị khóa | `app.js:1414-1419, 1508-1515` (AD-17) |
| Bắt dán JWT, anon key, URL endpoint bằng tay ở Council Builder và Model Router | `app.js:2024-2036, 2189-2194` (AD-21) |
| Publish một bản ghi Content đẩy **toàn bộ** dữ liệu; nháp chỉ nằm trong trình duyệt; không có lịch sử/khôi phục | AD-01, AD-03, AD-06, AD-07 (chưa sửa) |
| Không cảnh báo khi rời trang còn thay đổi chưa lưu (0 `beforeunload`) | grep `apps/admin` |
| Ngôn ngữ lẫn lộn: Content/AI Studio `lang="en"`, Growth/Recovery `lang="vi"`; nhiều chữ "VI / EN" | AD-21 |
| Không upload ảnh, chỉ gõ đường dẫn trong repo | AD-08 |
| `app.js` 3.530 dòng một tệp; CSS mỗi workspace một kiểu, không có token chung; Content không có thuộc tính ARIA | đếm dòng, `content.js` |

Đã xong từ 30/10: công tắc AI cho Council/Chat/Đọc sâu Chiêm tinh (AD-10 một phần), ô tìm kiếm không mất focus (AD-16), ghim supabase-js và thông báo lỗi đăng nhập rõ (AD-26/27), danh sách nhà cung cấp theo khóa có ở backend (AI-11 một phần), xác nhận trước thao tác nguy hiểm (AD-02), chặn trùng ID (AD-04), hiện môi trường đang ghi (AD-13).

## 3. Trường dữ liệu: Admin sửa được gì, thực tế ai đọc

| Đối tượng | Admin cho sửa | Thực tế backend/app dùng | Khoảng hở |
|---|---|---|---|
| Model route theo tính năng | provider, model, model dự phòng, temperature, max tokens, `fallbackWhen`, reasoning | Có đọc (`_shared/model-router.ts`) | **Không thấy/sửa được thời gian chờ** (40 s, Chiêm tinh 60 s, cứng ở `model-provider.ts:31`); `fallbackWhen` luôn bị ghi danh sách mặc định; các cờ `safetyPolicy` khác reasoning **lưu nhưng không ai thi hành**; route `oracle_router` publish được nhưng Oracle **không gọi model**; editor `notifications`, `face_reading` bị server từ chối |
| Prompt Chiêm tinh (VI+EN) | Có, publish thật | `ai-astrology-insight` dùng | `ai-astrology-report` bỏ qua, dùng prompt cứng |
| Prompt Tarot | Chỉ "nháp trình duyệt" | Runtime đọc `prompt_versions` | **Admin không ghi được** (AI-03) |
| Prompt Persona | Persona Studio là danh sách cứng 3 persona, các ô (archetype, pace, strengths…) chỉ để xem trước | Runtime đọc `prompt_versions` + bảng `personas` | **Không ô nào trong Persona Studio có tác dụng** |
| Prompt Council, Daily insight, Astrology report | Không có | Cứng trong mã | Owner không thấy, không sửa |
| Persona, bộ bài, 78 lá (Content) | Có, publish thành "content bundle" | App dùng để hiển thị | **AI không đọc bundle**: chat đọc bảng `personas`, Tarot đọc `packages/content/data/tarot-cards.json` trong repo → nghĩa lá và phong cách bộ bài sửa ở Admin **không tới mô hình** (AD-05) |
| Council config | Publish bị khóa | Runtime đọc `ai_council_*_versions`; app gửi template riêng | Một roster đã publish sẽ **thay âm thầm** persona người dùng chọn |
| Công tắc AI | Council, Chat, Đọc sâu Chiêm tinh | `_shared/feature-switch.ts` | Tarot AI và Daily **không tắt được** |
| Hạn mức | Không có | `account-tier-policy.json` (Chiêm tinh 1/ngày, Council 1/ngày) trong repo; `ai-usage-policy.json` đang `disabled_until_reviewed`; `ai-usage-operation.ts` **không được hàm nào dùng** | Chat persona, Tarot AI, Daily **không có hạn mức phía server** |
| Luật an toàn | Không có | Danh sách từ khóa cứng (`model-router.ts:181`, `crisis-safety.ts`) | Không xem/sửa được |

## 4. Ngữ cảnh truyền cho mô hình — chỗ bị sót

| Tính năng | Đang gửi | Bị sót / sai |
|---|---|---|
| Chat persona | mục tiêu, giọng, persona, 8 lượt gần nhất (800 ký tự/lượt), khối ngữ cảnh từ Tarot/Chiêm tinh | Không gửi **tên gọi** (chờ Owner quyết, CH-13), không có **ngày/giờ địa phương**, không có tâm trạng gần đây; giọng mặc định "gentle"; mục tiêu/giọng ghép thẳng vào system prompt không giới hạn độ dài (AI-05, rủi ro chèn lệnh) |
| Council | câu hỏi, tên + vai trò persona, lịch sử do app cắt | Prompt cứng; **không dùng prompt riêng, giọng, chủ đề của từng persona**; server không giới hạn độ dài lịch sử |
| Tarot AI | nghĩa lá chuẩn, chiều, vị trí, kiểu trải, chủ đề, câu hỏi | Không dùng **phong cách bộ bài** và nghĩa đã sửa ở Admin; không có mục tiêu/giọng người dùng; chỉ nhận 3 kiểu trải |
| Đọc sâu Chiêm tinh | hợp đồng lá số, fact đã chọn, câu hỏi | Nối tốt nhất. Nhưng **dùng chung route `astrology_report` với `ai-astrology-report`** (hợp đồng đầu ra khác nhau) → bản report có thể luôn rơi về dự phòng (AI-10) |
| Daily insight | ngôn ngữ, ngày, tên, mục tiêu, giọng, 3 mục Nhật ký gần nhất | **Không yêu cầu đăng nhập, không hạn mức, không công tắc**; prompt cứng |
| Astrology report | ngôn ngữ, chủ đề, lá số | **Đăng nhập không bắt buộc** → người lạ gọi được mô hình tốn tiền; không hạn mức |
| Oracle | — | Server chưa gọi mô hình, trả câu cố định; app gửi 12 lượt nhưng bộ ghép chỉ nhận 8 (AI-15) |
| Zodiac Pulse | app gửi cả hồ sơ sinh + 5 mục Nhật ký | Server chỉ dùng cung Mặt Trời → **gửi thừa dữ liệu nhạy cảm** |

**Hai việc nên làm sớm nhất vì liên quan chi phí/an toàn:** bắt buộc đăng nhập + hạn mức cho `ai-daily-insight` và `ai-astrology-report`; tách route của Astrology report khỏi Đọc sâu. Cả hai cần deploy Edge Function nên phải Owner duyệt.

## 5. Kiến trúc thông tin mới đề xuất

Một thanh điều hướng trái duy nhất, tiếng Việt, xếp theo **việc quản trị viên làm hằng ngày**, không theo cấu trúc kỹ thuật:

```
Tổng quan        — sức khỏe hệ thống: AI đang bật/tắt, lỗi 24h, chi phí hôm nay/14 ngày, phản hồi mới
Nội dung
  ├ Người dẫn (persona)   — hồ sơ + prompt + xem trước như trên app, publish TỪNG mục
  ├ Bộ bài & 78 lá        — lọc "thiếu dịch / chưa duyệt", upload ảnh, xem trước lá
  └ Văn bản trong app     — câu hằng ngày, câu hỏi Nhật ký…
AI
  ├ Tính năng AI          — mỗi tính năng 1 thẻ: Bật/Tắt · Hạn mức/ngày · Chuỗi model · Prompt · Thời gian chờ
  ├ Nhà cung cấp & Model  — khóa đã cấu hình (không hiện giá trị), Kiểm tra khóa, tình trạng, độ trễ
  ├ Prompt & phiên bản    — mọi prompt (Tarot, Persona, Council, Daily, Chiêm tinh), so sánh bản, khôi phục
  └ Chạy thử & chấm điểm  — chạy bộ câu mẫu trước khi publish
Vận hành
  ├ Phản hồi người dùng   — gán người xử lý, ghi chú, mở đúng câu trả lời/trace
  ├ Nhật ký AI (trace)
  └ Lịch sử thao tác      — ai đổi gì, khi nào, khôi phục
Tăng trưởng (giữ nguyên, đọc là chính)
```

Nguyên tắc giao diện:
- **Một nghĩa cho mỗi nút**: "Lưu nháp" (lưu lên server, chỉ mình thấy) và "Phát hành" (áp cho người dùng, có hộp xác nhận tóm tắt thay đổi). Bỏ "nháp trình duyệt".
- **Không bao giờ bắt dán JWT/khóa**: dùng phiên đăng nhập sẵn có; khóa nhà cung cấp chỉ đặt ở Supabase Secrets, Admin chỉ hiện "đã cấu hình / chưa".
- **Mỗi ô có tác dụng thật**, nếu chưa có thì ẩn hoặc ghi "chưa áp dụng" — bỏ khu Legacy.
- Tiếng Việt mặc định, thuật ngữ kỹ thuật (payload, slug, schema) vào phần "Chi tiết kỹ thuật" thu gọn.
- Thanh trạng thái cố định: môi trường đang ghi (QA/Singapore), thay đổi chưa lưu, cảnh báo khi rời trang.
- Dùng chung token màu/khoảng cách với thương hiệu Open Reflection (charcoal/ivory/gold), tương phản ≥ 4,5:1, ARIA cho tab/form.

## 6. Lộ trình đề xuất (mỗi bước một PR nhỏ)

| Bước | Nội dung | Cần Owner duyệt |
|---|---|---|
| A1 | Dọn: bỏ Legacy, bỏ ô dán JWT/khóa, một nghĩa cho Lưu/Phát hành, cảnh báo rời trang, Việt hóa nhãn | Không (chỉ mã Admin; push `main` sẽ tự deploy Admin staging) |
| A2 | Điều hướng mới (mục 5) gom 3 workspace thành một khung | Duyệt bản thiết kế |
| A3 | Content: publish từng mục, nháp lưu server, lịch sử + khôi phục (AD-01/03/06/07) | SQL nếu cần bảng mới |
| A4 | "Tính năng AI": thẻ theo tính năng gồm công tắc (thêm Tarot, Daily), hạn mức, thời gian chờ, chuỗi model | SQL + deploy Edge Function |
| A5 | Prompt editor cho Tarot, Persona; đưa prompt Council/Daily/Report ra cấu hình (AI-03) | Deploy |
| A6 | Nối Content → AI: persona và nghĩa lá publish ở Admin được AI dùng (AD-05) | SQL + deploy |
| A7 | Upload ảnh (Supabase Storage), xem trước như app (AD-08, AD-19) | Tạo bucket |

## 7. Quyết định cần Owner

1. Duyệt kiến trúc điều hướng ở mục 5 (hoặc góp ý) trước khi làm A2.
2. Có gửi **tên gọi** của người dùng cho AI trong chat persona không (CH-13)?
3. Hạn mức phía server cho Chat persona, Tarot AI, Daily (đề xuất theo `ai-usage-policy.json`: Chat+Oracle 5/ngày, Tarot 1/ngày, Daily 1/ngày).
