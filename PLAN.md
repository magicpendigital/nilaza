# PLAN — bảng tiến độ sống của Nilaza

> **Cập nhật lần cuối: 08/11/2026** — `main` tại `033fb86` (PR #30); PR #31 đang mở (PLAN, skills, template, gói SQL v2); PR #32 đang mở (đặc tả màn Admin).
> Đây là **tệp đầu tiên** Owner và mọi Agent đọc khi bắt đầu phiên mới. Nó trả lời: *đang ở đâu, còn gì, chờ ai*. Lý do, quy trình và bẫy môi trường nằm ở [`docs/HANDOFF_CURRENT_STATE.vi.md`](docs/HANDOFF_CURRENT_STATE.vi.md); chi tiết từng việc nằm ở `docs/feature-plans/*.json`.

## Quy tắc cập nhật (bắt buộc với Agent)

1. **Đầu phiên:** `git fetch` rồi làm việc trên `origin/main` mới nhất (03/11 từng có thư mục làm việc tụt 84 commit so với GitHub). Đọc tệp này → chỉ mở tài liệu mà mục liên quan trỏ tới.
2. **Cuối mỗi PR / mỗi phiên:** sửa tệp này trong **cùng PR**: đổi trạng thái, thêm số PR, cập nhật "Cập nhật lần cuối". Mã mục (HO-02, AD-01…) phải khớp `docs/backlog/review-2026-10-30.json` — cập nhật `status`/`pr`/`note` ở đó luôn.
3. Chỉ ghi điều **đã kiểm chứng**; cái gì chưa thử trên máy thật/cloud thì ghi rõ "chưa kiểm".
4. Giữ tệp ngắn (≤ 200 dòng): việc xong quá 2 tuần chuyển xuống "Đã xong gần đây" rồi xóa; lịch sử đã có trong Git.

Ký hiệu: ✅ xong · 🟡 làm một phần · ⬜ chưa làm · ⛔ bị chặn (chờ Owner/cloud) · 🔍 chờ kiểm trên máy thật

## 1. Mục tiêu và quyết định đang hiệu lực

- **Mục tiêu:** bản Android **miễn phí** lên Google Play; closed test ≥ 12 người × 14 ngày (tài khoản Play cá nhân). iOS làm sau.
- AI qua **OpenRouter**, model cấu hình trong Admin, khóa chỉ ở backend. Mặc định mọi tính năng: `deepseek/deepseek-v4.1-flash` → dự phòng `xiaomi/mimo-v2.6-flash` (quyết định 02/11).
- 18+; khách xem được nội dung tĩnh; tính năng gọi AI cần đăng nhập. Mọi tài khoản đăng nhập là Premium trong closed test; nội dung Premium ghi "Sắp có".
- Ngân sách AI QA 5 USD/ngày, 50 USD/14 ngày. Hạn mức: Chat+Oracle 5/ngày, Tarot 1/ngày, Chiêm tinh AI 1/ngày, Council 1/ngày (+4 câu hỏi tiếp).
- Crisis: chỉ dùng số **115**. Tên lá: tên gốc tiếng Anh là tiêu đề, tên Việt dòng nhỏ.
- **04/11:** dự phòng LLM giai đoạn 0 được duyệt; nhà cung cấp trực tiếp ưu tiên **Anthropic → Gemini (khóa trả phí) → OpenAI → DeepSeek**; được gửi **tên gọi** người dùng cho AI trong chat; **Tarot AI 1 lượt/ngày** cho mọi tài khoản; tài khoản thử `magicpendigital@gmail.com` được đặt Premium để test.
- Backend dự kiến: Supabase **Singapore** `etfajmrwyywokgafzxsb`. App và Admin staging **vẫn trỏ project QA cũ** `akgrokwnkfqnfjqrildi` (nơi chạy live QA 31/10–03/11).

## 2. Giai đoạn

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| 0 | Repo sạch, Vercel, CI | ✅ |
| 1 | Làm sạch Android release (manifest) | ✅ (chưa dựng AAB) |
| 2 | Backend Singapore: SQL 2a ✅ 2b ✅; **2c: Owner duyệt gói v2 ngày 08/11 → chờ Owner đọc dashboard + đăng nhập CLI**; deploy `account-delete` ✅ duyệt, làm sau 2c; Auth/SMTP ⛔; chặn chi phí AI 🟡 | ⛔ chờ Owner |
| 3 | UI/UX trước closed test (Gói A + rà soát 30/10) | 🟡 phần lớn xong, xem mục 3 |
| 4 | QA online + thiết bị + AAB đầu tiên | ⬜ chặn bởi GĐ 2 và biến EAS |
| 5 | Play Console, Data safety, store listing | ⬜ Owner |
| 6–7 | Internal → Closed (≥14 ngày) → Production | ⬜ |

## 3. Việc còn mở theo khu vực

Bảng rà soát 30/10: **107 mục — 50 xong, 24 làm một phần, 33 chưa làm** (`docs/backlog/review-2026-10-30.json`).

### App (làm được ngay, không cần backend)
- ✅ (nhánh này) Nút Oracle nổi: không còn trên Khám phá, cao 48px, chừa đệm cuối danh sách (U-A).
- ✅ (nhánh này) Thanh tab luôn giữ nhãn, chỉ ẩn khi cuộn xuống dài (U-I).
- ✅ (nhánh này) Nút 👍/👎/Lưu và nút Báo cáo mới trên từng tin nhắn persona, nút Council đạt 48px (mục 0.2 roadmap).
- ✅ (nhánh này) Tôi: tài khoản mới thấy lời mời thay vì 0/0/0 (U-F); gợi ý "Chạm để xem" ở kiểu trải chỉ hiện khi thẻ đóng (U-G).
- ⬜ CH-12 bàn phím che ô nhập (Android) · CO-03 lỗi Council chỉ hiện toast · TA-15 chạm bộ bài sau lá đầu mở ảnh · HO-07 nối "lá hôm nay" với Tarot · JO-08 xuất dữ liệu ngoài JSON.
- 🟡 TA-06 đổi biểu tượng "Bắt đầu lại" · HO-04 · JO-06/07/09 · CH-14/15 · N-04 · PR-04 (chi tiết trong backlog).
- ⬜ Chữ lớn 150–200% (`maxFontSizeMultiplier`), ảo hóa danh sách dài (U-B, U-C), thang tiêu đề/placeholder/thumbnail (U-D/E/H) — Gói B.

### App (bị chặn)
- ⛔ Xóa tài khoản: giao diện đã có nhưng tắt (`accountDeleteLive=false`), chờ deploy `account-delete` + trang web xóa dữ liệu + hộp thư hỗ trợ (PR-01).
- ⛔ Oracle gọi AI thật (OR-01) · Daily AI tự chạy (HO-02) · Tarot AI mở rộng kiểu trải · Báo cáo về server (CH-02 cần deploy `ai-feedback`).
- 🔍 Chờ thử trên máy thật: Back, TalkBack, nhắc buổi sáng, chọn ngày giờ native, bàn phím, chữ lớn.

### Admin — đề xuất: [`docs/proposals/ADMIN_REDESIGN_2026-11-03.vi.md`](docs/proposals/ADMIN_REDESIGN_2026-11-03.vi.md)
- ⬜ Nghiêm trọng: AD-01 publish 1 mục đẩy toàn bộ · AD-03/06 nháp và bản publish đè nhau · AD-05 nội dung sửa ở Admin không tới AI · AD-07 không có khôi phục · AD-08 không upload ảnh · AD-09 nháp AI Studio không lưu · AD-11 chỉ prompt Chiêm tinh publish được.
- ⬜ AD-14/15, 17/18, 19, 20, 21, 23, 24/25, 28–31 (quyền, lưu, xem trước, audit, ngôn ngữ, hộp phản hồi, điều hướng).
- 🟡 AD-10 công tắc AI (thiếu Tarot, Daily) · AD-26/27.

### AI / backend — đề xuất: [`docs/proposals/LLM_PROVIDERS_FALLBACK_2026-11-03.vi.md`](docs/proposals/LLM_PROVIDERS_FALLBACK_2026-11-03.vi.md)
- ⛔ **Ưu tiên chi phí/an toàn:** `ai-daily-insight` và `ai-astrology-report` không bắt đăng nhập, không hạn mức; Chat persona và Tarot AI không có hạn mức phía server (AI-02).
- ⬜ AI-10 Astrology report và Đọc sâu dùng chung route khác hợp đồng · AI-06 cờ không lưu dữ liệu (ZDR) chỉ có ở Chiêm tinh · AI-05 mục tiêu/giọng ghép thẳng vào system prompt · AI-03 Owner không sửa được prompt Tarot/Persona · AI-07 không chấm điểm trước khi publish · AI-04, 09, 12, 13, 15, 17, 18.
- ⬜ Dự phòng nhiều nhà cung cấp: Giai đoạn 0 (chỉ OpenRouter: `models[]`, ZDR, kiểm định dạng trong bộ định tuyến) → 1 → 2 → 3.

## 4. Đang chờ Owner (mỗi mục một quyết định)

1. **Bước 2c — Owner đã đồng ý 08/11 (gói v2).** Việc của Owner trước 11/11 (hạn bản chạy thử): đọc dashboard Singapore và đăng nhập Supabase CLI theo [phiếu chạy 2c](docs/release/singapore-packet-v2-2026-11-04/RUN_2C.vi.md). Bộ kiểm đích: BLOCKED 0 lỗi, chỉ chờ thông tin dashboard, sổ cái đọc lại và tệp lời duyệt.
   **Phương án môi trường (đề xuất 08/11, [phân tích](docs/release/BACKEND_ENVIRONMENT_STRATEGY_2026-11-08.vi.md)):** local Docker → Singapore làm staging rồi production; đóng băng QA cũ sau khi chuyển; nâng tổ chức Singapore lên Pro (~25 USD/tháng) trước khi mời người thử thật.
2. Owner tự làm: gắn 3 biến `EXPO_PUBLIC_*` vào EAS production (đã đồng ý 04/11) → dựng AAB đầu tiên; tuyển ≥ 12 (nên 15–20) người thử.
3. Bộ thiết kế Admin chi tiết (19 màn): PR #32 + [đặc tả](docs/proposals/ADMIN_SCREENS_SPEC_2026-11-04.vi.md) + canvas <https://claude.ai/artifact/JfSTk3fKJANL1T8Ptcxo9k>. Owner đã chốt 04/11: gộp Astrology report vào Đọc sâu; Daily bỏ toàn văn Nhật ký; tâm trạng chỉ dùng nếu ghi trong 24 giờ; dự phòng đắt hơn được, trần 0,02 USD/lượt; biên tập viên chỉ lưu nháp, Owner phát hành. Cổng phát hành theo mục 5.1 của đặc tả (duyệt 04/11): không bỏ qua lớp an toàn; chỉ Owner bỏ qua lớp chất lượng khi khôi phục hoặc sửa khẩn cấp, gắn nhãn "Chưa chấm" và chấm lại trong 24 giờ. **Còn chờ:** các con số độ dài (đội biên tập).

## 4b. Đã duyệt 04/11, đang chờ làm (lát cắt backend tiếp theo)

- ⬜ Bắt buộc đăng nhập + hạn mức + công tắc cho `ai-daily-insight` (bỏ toàn văn Nhật ký, chỉ nhãn tâm trạng 24 giờ); tắt `ai-astrology-report` và chuyển lối vào sang Đọc sâu (code, rồi xin deploy).
- ⬜ Dự phòng LLM giai đoạn 0: `models[]` + ZDR cho mọi tính năng, kiểm định dạng trong bộ định tuyến, giữ nội dung lỗi, khóa Gemini sang header.
- ⬜ Gửi tên gọi cho AI trong chat persona (CH-13); Tarot AI 1 lượt/ngày phía server và app.
- ⬜ Đặt `magicpendigital@gmail.com` là Premium trên project đang chạy QA (một câu SQL — sẽ đưa lệnh để Owner xác nhận).
- ⬜ Deploy `account-delete` + trang web xóa dữ liệu + hộp thư hỗ trợ (sau 2c).

## 5. Đã xong gần đây (31/10 – 04/11)

04/11 (PR #31): skills được rà soát — `nilaza-plan-qc` 1.6.0, thêm `nilaza-ai-runtime`, skills cài cho cả Claude Code lẫn Codex ([đánh giá](docs/SKILLS_REVIEW_2026-11-04.vi.md)); thư mục `project-template/` cho dự án khác (Owner đã chuyển ra khỏi repo 08/11); gói SQL v2 chạy thử PASS.


PR #9–#30: Home "Hôm nay" (lá hôm nay, ghi chú, nhịp 30 ngày, Bước tiếp theo), chế độ khách, Tarot làm lại theo thiết kế (dock kết quả, Học lá, tên lá gốc + Việt), Nhật ký/Tôi/Đăng nhập theo thiết kế, Chiêm tinh (hub, Big 3, so sánh với người khác, Đọc sâu AI), Chat hub + Council (cuộn tới tin mới, báo cáo, 115), bộ lọc khủng hoảng chung, công tắc AI, Admin (xác nhận thao tác nguy hiểm, chặn trùng ID, môi trường), OpenRouter-only + DeepSeek/Xiaomi, sửa Tarot/Chiêm tinh AI theo live QA (bỏ JSON mode, chờ 60 s, chẩn đoán). Kiểm chứng: mobile 449/449 test, tsc (03/11, máy local).

## 6. Bản đồ tài liệu (chỉ mở khi cần)

| Cần | Đọc |
|---|---|
| Quyết định, bẫy môi trường, việc cấm tự làm | `docs/HANDOFF_CURRENT_STATE.vi.md` mục 2, 6, 7 |
| Sửa ở đâu, kiểm bằng lệnh nào | `docs/AGENT_TASK_ROUTER.md` |
| Cổng Plan & QC, preflight | `docs/PLAN_QC_PROTOCOL.md`, `docs/feature-plans/` |
| Danh sách 107 mục rà soát + trạng thái | `docs/backlog/review-2026-10-30.json` |
| Lộ trình Google Play | `docs/release/GOOGLE_PLAY_ROADMAP_AND_UX_REVIEW_2026-10-23.vi.md` |
| Gói backend Singapore | `docs/release/singapore-backend-readiness-2026-10-25/`, bản v2: `docs/release/singapore-packet-v2-2026-11-04/` |
| Skill nào cho việc gì | `docs/SKILLS_REVIEW_2026-11-04.vi.md` |
