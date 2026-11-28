# Bàn giao: Báo cáo tổng hợp Bản đồ số — lô R0, R1, R2 (28/11/2026)

Nhánh `claude/numerology-report-r0-r2`, cắt từ `origin/main` 66a0792. **Chưa push, chưa merge, chưa chạy SQL, chưa deploy.**
Kế hoạch gốc: `docs/proposals/ASTRO_NUMEROLOGY_SYNTHESIS_TWO_SYSTEMS_PLAN_2026-11-28.vi.md`. Hồ sơ: `docs/feature-plans/numerology-report-r0-r2-2026-11-28.json`.

## 1. Đã làm gì

Theo quyết định Owner 28/11: báo cáo chỉ cho Bản đồ số; mỗi ngày (giờ Việt Nam) **1 báo cáo giao thành công + tối đa 2 lần lỗi**; dùng lại báo cáo đã lưu khi bộ số không đổi; dùng cặp model rẻ; báo cáo **chỉ lưu trên điện thoại**; làm giống "Lời nhắn riêng" (`ai-numerology-message`).

**R0 — nội dung (bản nháp, chờ Owner duyệt)**
- `packages/content/data/numerology-report.json`: chữ vi/en của thẻ, mục lục 7 phần, gợi ý từng phần, hộp đồng ý, thông báo lỗi; câu hỏi phản chiếu và các khối chữ dùng cho báo cáo. Trạng thái `draft`, chưa có người duyệt → máy chủ **từ chối** gọi AI cho tới khi Owner duyệt.
- Prompt `numerology_report_system` (vi + en) trong `packages/agent-config/prompt-library.json`, Admin không sửa được.

**R1 — ứng dụng**
- Thẻ "Báo cáo tổng hợp" nằm ngay dưới thẻ Lời nhắn riêng ở màn Bản đồ số. Mở ra: mục lục 7 phần; **Phần 1 ghép ngay trên máy** từ nội dung có sẵn (không gửi đi); Phần 2–7 mờ kèm gợi ý, **không có đồng hồ đếm ngược**.
- Luồng: hộp giải thích/đồng ý → gửi lên máy chủ → lưu trên máy ở khóa `nilaza.numerology.report.v1`, gắn với dấu vân tay của bộ số. Bộ số không đổi thì mở lại báo cáo cũ, không gọi AI. Nút "Tạo lại" chỉ hiện khi năm cá nhân, ngày sinh hoặc tên làm bộ số đổi (tháng cá nhân và ngôn ngữ **không** tính).
- Dữ liệu gửi đi (`buildReportPayload`): các con số, chữ số **có mặt** trong biểu đồ (không gửi số lần lặp), các đường đầy/trống, mã khối, ngôn ngữ. **Không** gửi tên, ngày sinh, năm sinh, tuổi. Có test chặn rò rỉ.
- Mục "Tôi là ai" → Báo cáo đã lưu: thêm một dòng nhỏ có **Xem** và **Xóa** (xóa có bước xác nhận).
- "Xuất dữ liệu" có thêm báo cáo đã lưu.
- Tính năng tắt (`feature_paused`) → hiện "Sắp có". Tài khoản Free → máy chủ trả `premium_required`, app hiện ghi chú Premium (app không tự đoán gói).

**R2 — máy chủ, Admin, tài liệu (chỉ code, chưa chạy thật)**
- Edge Function mới `supabase/functions/ai-numerology-report/`: kiểm tra theo thứ tự đăng nhập → công tắc bật → nội dung đã duyệt → Premium → giữ lượt trong ngày → kiểm tra yêu cầu rất chặt (đúng khóa, chữ số tăng dần, đường phải khớp chữ số, mã khối phải đúng bộ máy chủ tự tính) → ghép chữ khối đã duyệt → gọi model. Máy chủ **không lưu** chữ báo cáo.
- Migration `supabase/migrations/20261128100000_numerology_report.sql`: thêm công tắc `numerology_report` (**mặc định TẮT**), tuyến model, cho phép tên tính năng mới trong các ràng buộc và RPC publish; có khối hoàn tác.
- Tuyến model: chính `deepseek/deepseek-v4.1-flash`, dự phòng `xiaomi/mimo-v2.6-flash` (qua OpenRouter), tối đa 4000 token, tắt suy luận.
- Admin: tính năng mới hiện trong Công tắc, AI Studio, Nhà cung cấp, Tổng quan, Quyền truy cập, Danh mục quy trình; hợp đồng `admin-model-router-config` nhận tính năng mới.
- Bản nháp Data safety (`docs/release/PLAY_DATA_SAFETY_BILLING_2026-11-16.vi.md` mục 2.5) và trang Quyền riêng tư vi/en (đã dựng lại kho trợ giúp công khai).

## 2. Owner cần duyệt (từng việc một)

1. **Nội dung**: chữ trong `packages/content/data/numerology-report.json` và prompt `numerology_report_system`. Khi duyệt, đặt `status: approved` + tên người duyệt (cần nhóm rà soát nội dung `nilaza-content-review` trước).
2. **Chạy migration** `20261128100000_numerology_report.sql` — sha256 (LF): `dc9806fd990485caf4ef214280f630fef0b2ea4b751a7e0af037a14a62a3d649`. File đổi thì duyệt hết hiệu lực.
3. **Deploy** Edge Function `ai-numerology-report` (mới).
4. **Deploy lại** `admin-model-router-config` (để Admin lưu được tuyến của tính năng mới).
5. **Ngân sách thử mù** so sánh model (làm sau, theo quyết định 28/11).
6. **Chọn model** chính thức sau thử mù (hiện là cặp rẻ ở trên).
7. **Bật công tắc** `numerology_report` trên Admin (chỉ sau 1–4).
8. **Data safety trên Play Console** theo bản nháp mục 2.5 — xác nhận việc khai "chữ số có mặt trong biểu đồ ngày sinh".

Nhắc: mỗi lần push lên `main` sẽ tự deploy Admin staging.

## 3. Đã kiểm chứng (trên máy, 28/11)

- Mobile jest toàn bộ (lead chạy lại 28/11 với `node_modules` đầy đủ): 134 bộ, 1189/1189 test qua.
- Mobile `tsc` (lead chạy lại với `node_modules` đầy đủ): 0 lỗi. 13 lỗi agent thấy trước đó là do worktree thiếu thư viện.
- Deno `supabase/functions`: 499 qua, 0 lỗi (`deno.lock` đã trả lại như cũ).
- `ai-operations:test` có PGlite: 49 test, 44 qua, 0 lỗi (còn lại bỏ qua); riêng bản phát lại migration báo cáo bằng PGlite: 4/4 qua. Lưu ý: máy này không có PGlite trong worktree, đã mượn tạm thư viện từ thư mục khác rồi gỡ.
- `validate:data`, `validate:backend`, `validate:public-content`, `admin:check`, `admin:test` (338 qua, 0 lỗi), `council:contract:check`, `prompt:consumers:check`, `supabase:check` (83 qua, 15 cảnh báo môi trường, 0 lỗi), `supabase:migration-ledger:check` (vẫn ở trạng thái "chờ đối soát" như trước — không chạy db push/repair).
- `node scripts/feature-preflight.mjs --ci --base origin/main`: qua.
- Dấu vân tay `App.tsx` trong `apps/admin/workflow-catalog.js` đã cập nhật.

## 4. Chưa kiểm chứng

- Chưa thử trên điện thoại (Back, TalkBack, chữ lớn, cuộn dài).
- Chưa gọi model thật: chưa đo chất lượng tiếng Việt, chi phí mỗi báo cáo, thời gian chạy (có thể gần giới hạn khi phải sang model dự phòng).
- Chưa chạy migration trên Supabase thật; chưa deploy function; chưa thử đầu-cuối với tài khoản Premium/Free.
- Bản nháp Data safety và trang Quyền riêng tư chưa được Owner duyệt.

## 5. Câu hỏi mở

- App để máy chủ quyết định Free/Premium (giống Lời nhắn riêng); tài khoản Free chỉ biết sau khi bấm gửi. Có muốn khóa sớm trên app không?
- Dấu vân tay bộ số có tính đỉnh cao (pinnacle) và thử thách: khi sang giai đoạn đỉnh cao mới, nút "Tạo lại" cũng hiện. Có đồng ý không?
- Có nên khai "chữ số có mặt trong biểu đồ" là dữ liệu ngày sinh suy ra trong Data safety không?

## 6. Hoàn tác

Tắt công tắc `numerology_report` trên Admin → app hiện "Sắp có", không gửi gì. Migration có khối hoàn tác ở cuối file. Báo cáo đã lưu nằm trên máy người dùng, xóa được ở "Báo cáo đã lưu".
