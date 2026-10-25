# Gói B — Xóa tài khoản (backend đã viết và kiểm thử cục bộ, chưa deploy)

Ngày 25/10/2026, Asia/Bangkok. Google Play yêu cầu ứng dụng cho tạo tài khoản phải có **đường xóa tài khoản ngay trong app** và **một URL web** để yêu cầu xóa, đồng thời khai báo trong biểu mẫu Data safety ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/13327111)). Tính đến hôm nay trong app chỉ có “Xóa dữ liệu trên thiết bị”, ghi rõ “tài khoản cloud cần luồng backend riêng”. Gói này làm phần backend.

## 1. Đã làm

| Thành phần | Tệp | Trạng thái |
|---|---|---|
| Migration | `supabase/migrations/20261025000000_account_deletion_v1.sql` | Viết xong, replay cùng 30 migration trước **PASS**; **chưa áp** |
| Edge Function | `supabase/functions/account-delete/` (`index.ts`, `handler.ts`, `handler_test.ts`) + `config.toml` (`verify_jwt = true`) + mục trong `functions/README.md` | Viết xong; **13/13 test Deno PASS** (cùng 28 test cũ của guard và worker, tổng 41/41); **chưa deploy** |
| Kiểm tra SQL | `scripts/singapore-packet-replay.mjs` | **10/10 PASS** trên PostgreSQL 17.5 cục bộ, gồm quét mọi bảng và đối chứng âm |

## 2. Luồng xử lý

\`\`\`text
App (người dùng gõ cụm xác nhận) ──POST {"confirm":"delete-my-account"}──▶ account-delete
  1  Kiểm Authorization: Bearer → user thật, không ẩn danh (guard dùng chung, giới hạn 32 KB, timeout đọc 5 giây)
  2  begin   : từ chối tài khoản staff; ghi/tiếp tục yêu cầu theo băm của user id (không có email, không có tên)
  3  tra email qua Auth admin API (lỗi → dừng, không đoán)
  4  purge   : xóa generation_jobs + usage_events, xóa nội dung safety_events, xóa dòng waitlist theo băm email
  5  auth.admin.deleteUser → các bảng ON DELETE CASCADE tự mất
  6  finish  : đánh dấu hoàn tất (hoặc failed + mã lỗi ngắn để thử lại)
\`\`\`

- **ID người dùng chỉ lấy từ token đã xác thực**, không bao giờ từ nội dung yêu cầu; nội dung phải đúng một khóa `confirm`.
- **Không bao giờ báo thành công nếu tài khoản chưa bị xóa.** Lỗi giữa chừng trả `502 deletion_incomplete` kèm `retry: true`; gọi lại an toàn (idempotent). Nếu tài khoản đã mất, trả hoàn tất.
- **Thông báo lỗi đã lọc:** không có thông điệp cơ sở dữ liệu hay nhà cung cấp trong phản hồi (có test).
- Khóa `service_role` chỉ nằm trong hàm; ba hàm SQL và bảng yêu cầu chỉ `service_role` dùng được (test kiểm `anon` và `authenticated` bị từ chối).

## 3. Bản đồ dữ liệu: cái gì xảy ra với từng loại dữ liệu

| Nhóm | Bảng | Xử lý khi xóa |
|---|---|---|
| **Xóa theo tài khoản** (ON DELETE CASCADE) | `user_profiles`, `birth_profiles`, `chat_sessions`, `chat_messages`, `tarot_readings`, `journal_entries`, `daily_insights`, `daily_zodiac_pulse`, `astrology_reports`, `subscriptions`, `credit_ledger`, `device_push_tokens`, `notification_preferences`, `notification_events`, `notification_deliveries`, `in_app_notifications`, `ai_trace_runs`, `ai_trace_spans`, `ai_trace_payload_refs`, `ai_trace_scores`, `ai_trace_qa_captures`, `admin_document_access_log`, `nilaza_private.ai_quota_days`, `nilaza_private.ai_answer_receipts`, `nilaza_private.ai_feedback`, `admin_role_assignments` | Mất cùng tài khoản |
| **Chỉ bị gỡ liên kết nếu không xử lý thêm** (ON DELETE SET NULL) | `generation_jobs` (tóm tắt đầu vào, trình bày), `usage_events` (metadata), `safety_events` (`summary` là văn bản tự do có thể trích lời người dùng) | **Hàm purge xóa dòng** (`generation_jobs`, `usage_events`) hoặc **xóa nội dung và gỡ liên kết** (`safety_events`: giữ lý do/trạng thái cho thống kê lạm dụng, thay `summary` bằng “[removed on account deletion]”) |
| **Khóa theo email, không theo user id** | `marketing_waitlist` + `marketing_consent_events`, `marketing_suppressions`, `marketing_email_tokens`, `marketing_deliveries`, `beta_invites` (xóa theo dòng cha) | Purge xóa dòng có `email_hash` trùng băm email chuẩn hóa của tài khoản (cùng cách băm với form đăng ký waitlist) |
| **Giữ lại ở dạng ẩn danh** | `nilaza_private.ai_usage_operations` (`user_id` về NULL, giữ chi phí dự phòng để không làm biến mất chi phí) | Không còn định danh người dùng |
| **Không áp dụng cho người dùng cuối** | `prompt_versions`, `model_route_versions`, `admin_content_bundles`… (chỉ staff tạo; một số cột `ON DELETE RESTRICT`) | Tài khoản staff/owner bị từ chối (`staff_account_requires_owner_review`) — việc xóa cần Owner rà soát |
| **Storage** | Không có bucket hay đối tượng nào do ứng dụng dùng | Không có gì để xóa |

**Dấu vết còn lại có chủ đích:** bảng `nilaza_private.account_deletion_requests` giữ **băm SHA-256 có tiền tố tên miền của user id** (không phải email/tên), trạng thái, số lần thử, mã lỗi ngắn; dòng hoàn tất bị xóa sau **90 ngày**. Đây là bằng chứng cho phép thử lại và trả lời “đã xóa chưa”. Cần ghi trong chính sách riêng tư.

**Ngoài cơ sở dữ liệu của Nilaza (cần ghi trong Data safety/chính sách, chưa giải quyết bằng mã):**
- Nội dung đã gửi tới **OpenRouter** để sinh câu trả lời: thời gian lưu do chính sách nhà cung cấp/model; bật cài đặt không lưu/không huấn luyện khi tạo khóa.
- **Resend** giữ nhật ký thư xác nhận/đặt lại mật khẩu theo chính sách của họ.
- **Bản sao lưu/nhật ký của Supabase** có thể giữ dữ liệu thêm một thời gian (chưa kiểm chính sách gói Free).
- **Dữ liệu trên thiết bị** do app xóa (lát cắt mobile bên dưới).

## 4. Đã kiểm chứng và chưa kiểm chứng

**Đã (cục bộ, dữ liệu giả):** quyền vai trò; staff bị chặn; yêu cầu lặp; thử lại sau lỗi; mã lỗi ngắn bị chuẩn hóa; bảng yêu cầu không chứa email/tên/user id; sau khi xóa, **không còn dòng nào ở 55 bảng chứa dấu nhận dạng của người dùng đã xóa** (quét `to_jsonb(row)` không phân biệt hoa thường, kể cả email) trong khi dữ liệu của người dùng khác vẫn còn ở 7 bảng. **Đối chứng âm:** nếu bỏ bước purge, cùng phép quét tìm thấy dữ liệu sót ở 5 bảng (`generation_jobs`, `usage_events`, `safety_events`, `marketing_waitlist`, `marketing_consent_events`) — chứng minh phép quét có hiệu lực.

**Chưa:** `auth.admin.deleteUser` và `getUserById` trên Supabase thật (phiên bản `supabase-js@2.7.1` đang dùng trong các hàm hiện có); token hết hạn sau khi xóa trên dịch vụ thật; đồng thời nhiều kết nối; các cột/bảng mới nếu migration sau này thêm dữ liệu người dùng (**mỗi bảng mới có user id phải cập nhật bản đồ trên và bài quét**).

## 5. Việc còn lại (mỗi mục là một lát cắt riêng, cần duyệt)

1. **Áp migration + deploy hàm** — sau khi bạn duyệt gói A (bậc 2) rồi bậc 3. Kiểm thử trên tài khoản giả: tạo → có dữ liệu → xóa → đăng nhập lại thất bại → dữ liệu mất.
2. **Ứng dụng (lát cắt mobile):** thêm đường dẫn cổng `/account/delete` vào `backendClient`; trong Hồ sơ → “Tài khoản & vận hành” thêm “Xóa tài khoản” với bước xác nhận (gõ cụm xác nhận bằng ngôn ngữ của người dùng), gửi `confirm`, khi `completed` thì xóa dữ liệu cục bộ, đăng xuất, về màn chào; khi `retry` hiện thông báo thử lại; tài khoản staff hiện hướng dẫn liên hệ. Có test giao diện và đường lỗi.
3. **Trang web yêu cầu xóa (URL cho Play):** `https://nilaza.magicpendigital.com/vi/account-deletion` và `/en/`: hướng dẫn xóa trong app, chính sách giữ lại, cách yêu cầu khi không còn truy cập app. Cần **hộp thư hỗ trợ có thật** (hiện chưa có; Resend không nhận thư — đề xuất Cloudflare Email Routing cho `support@magicpendigital.com`, miễn phí, bạn cấu hình).
4. **Data safety:** khai “người dùng có thể yêu cầu xóa dữ liệu”, dữ liệu bị xóa “tất cả dữ liệu gắn với tài khoản”, kèm URL ở mục 3.
5. **Chính sách riêng tư:** thêm đoạn về thời gian giữ yêu cầu xóa (90 ngày, chỉ băm), dữ liệu ở nhà cung cấp AI/email.
