# Phiếu deploy Edge Function + đặt khóa cho Singapore (09/11/2026)

Đích: project Singapore `etfajmrwyywokgafzxsb` (đã có schema từ bước 2c ngày 08/11). Mã nguồn: nhánh `codex/android-release-unblock-2026-10-19` tại commit được ghi khi chạy. **App và Admin staging vẫn trỏ project QA cũ**, nên deploy xong chưa có người dùng nào gọi tới các hàm này; việc chuyển app/Admin là bước sau.

## 1. Hàm deploy đợt 1 (18 hàm)

| Nhóm | Hàm | Gọi model AI? |
|---|---|---|
| Tài khoản và dữ liệu | `profile-upsert`, `journal-entries`, `user-credits`, `account-delete` | Không |
| AI có bắt đăng nhập | `ai-persona-chat`, `ai-tarot-reading`, `ai-council`, `ai-astrology-insight` | Có (qua OpenRouter) |
| AI không gọi model | `ai-oracle-turn` (câu soạn sẵn), `ai-daily-zodiac-pulse` (tính tại chỗ), `ai-feedback` | Không |
| Thông báo trong app | `notification-inbox`, `notification-preferences`, `notification-register-device` | Không |
| Admin | `admin-ai-council-config`, `admin-model-router-config`, `admin-astrology-prompt-config`, `admin-documentation` | Không |

Cả 18 hàm biên dịch đạt bằng `deno check` trên máy ngày 09/11. Tất cả đều tự xác thực người dùng bên trong hàm (hỏi máy chủ Auth), và giữ `verify_jwt` mặc định (bật).

## 2. Hàm **giữ lại**, chưa deploy

| Hàm | Lý do |
|---|---|
| `ai-daily-insight`, `ai-astrology-report` | Chưa bắt đăng nhập, chưa có hạn mức → người lạ gọi được model tốn tiền. Deploy sau bản vá đã được duyệt 04/11 |
| `generate-today-pulse`, `group-chat-orchestrator` | Bản nháp chưa dùng, không xác thực |
| `marketing-waitlist` | Dùng cho website, cần khóa Turnstile riêng |
| `admin-ai-trace-qa-payload` | Công cụ QA cần khóa mã hóa và lịch dọn dẹp (cron chưa bật) |
| `notification-dispatch`, `notification-receipts`, `notification-send-test` | Đường gửi thông báo đẩy làm sau, cùng cấu hình thông báo đẩy |

## 3. Khóa và cấu hình (Owner tự đặt — không gửi giá trị cho tôi)

Supabase tự cấp sẵn `SUPABASE_URL` và các khóa của project cho hàm; **không** đặt tay.

**3a. Tạo khóa OpenRouter mới, riêng cho Singapore** (không dùng lại khóa của project QA cũ):
1. openrouter.ai → Keys → Create key, tên `nilaza-singapore-staging`, **đặt Credit limit** (đề xuất 50 USD, khớp ngân sách 50 USD/14 ngày).
2. openrouter.ai → Settings → Privacy: **tắt** cho phép nhà cung cấp dùng dữ liệu để huấn luyện; **bật Zero Data Retention (ZDR)** nếu tài khoản cho phép. Code hiện chỉ gửi cờ ZDR cho Chiêm tinh; giai đoạn 0 (đã duyệt 04/11) sẽ gửi cho mọi tính năng. Cài đặt ở tài khoản là lớp bảo vệ ngay từ bây giờ.

**3b. Đặt vào Supabase** — trên trình duyệt (khóa không bị lưu vào lịch sử lệnh): Dashboard → Edge Functions → **Secrets** → Add new secret:

| Tên | Giá trị |
|---|---|
| `OPENROUTER_API_KEY` | khóa vừa tạo |
| `AI_TRACE_ENVIRONMENT` | `staging` |

Không đặt `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` lúc này: nhà cung cấp trực tiếp thuộc giai đoạn 2 của kế hoạch dự phòng.

## 4. Lệnh deploy (Owner chạy trong PowerShell tại `D:\nilaza_clean_staging\repo`)

Docker không cần: `--use-api` đóng gói trên máy chủ Supabase.

```powershell
$fns = @('profile-upsert','journal-entries','user-credits','account-delete','ai-persona-chat','ai-tarot-reading','ai-council','ai-astrology-insight','ai-oracle-turn','ai-daily-zodiac-pulse','ai-feedback','notification-inbox','notification-preferences','notification-register-device','admin-ai-council-config','admin-model-router-config','admin-astrology-prompt-config','admin-documentation'); foreach ($f in $fns) { npx supabase functions deploy $f --project-ref etfajmrwyywokgafzxsb --use-api; if ($LASTEXITCODE -ne 0) { Write-Host "DUNG LAI O $f"; break } }
```

Lệnh dừng ngay ở hàm đầu tiên bị lỗi. Gửi tôi toàn bộ kết quả.

## 5. Kiểm sau khi deploy (tôi làm, chỉ đọc)

- Dashboard → Edge Functions: đúng 18 hàm, trạng thái Active, Verify JWT bật.
- Gọi thử **không** kèm đăng nhập vào một vài hàm → phải bị từ chối (401); không hàm AI nào chạy model khi chưa đăng nhập.
- Còn **chưa kiểm được** cho tới khi có tài khoản thử: phiên đăng nhập ký bằng khóa ECC P-256 của project có qua được cổng `verify_jwt` không (tài liệu Supabase nói hai cách khác nhau). Nếu không qua, sửa bằng cách deploy lại với `--no-verify-jwt`: các hàm vẫn tự kiểm người dùng bên trong.

## 6. Điều kiện dừng và hoàn tác

Dừng nếu: lệnh báo lỗi; dashboard hiện hàm không có trong danh sách 1; hàm AI trả lời khi gọi không đăng nhập. Hoàn tác: xóa hàm trên Dashboard (Edge Functions → hàm → Delete) hoặc xóa secret; database không bị ảnh hưởng.
