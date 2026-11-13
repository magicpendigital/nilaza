# Chọn môi trường backend cho Nilaza (08/11/2026)

Câu hỏi của Owner: đẩy phần đã tối ưu lên Singapore ngay, hay làm tiếp trên backend test hiện tại (project QA cũ) rồi khi xong mới đẩy tất cả sang Singapore? Mục tiêu: tốc độ, hiệu suất, bảo mật.

## 1. Dữ kiện

| | Project QA cũ `akgrokwnkfqnfjqrildi` | Singapore `etfajmrwyywokgafzxsb` |
|---|---|---|
| Tổ chức | Tổ chức khác (không phải Nilaza Free) | Nilaza Free `drxbmvimiekeoeesgssp` |
| Lịch sử migration | **Lệch, đang khóa** (`blocked_pending_reconciliation`): không biết chính xác bảng nào đã áp, bằng tay hay bằng CLI | Sạch: 0 bảng, 0 migration (đọc 26/10) |
| Đã chứng minh | Live QA 31/10–03/11 chạy được | Gói v2 (33 tệp) chạy thử PASS trên Postgres 17 Docker: cách ly A/B, phân quyền, khôi phục (04/11) |
| Vai trò Owner đã chọn (09/10) | Tạm thời | **Backend chính** cho closed test rồi production |

Giới hạn gói Supabase (đọc trang chính thức 08/11 — [pricing](https://supabase.com/pricing), [backups](https://supabase.com/docs/guides/platform/backups)):
- **Free:** tự **tạm dừng sau 1 tuần không hoạt động**; **không có bản sao lưu tự động**; 500 MB CSDL, 50.000 người dùng/tháng, 500.000 lượt gọi Edge Function/tháng; tối đa 2 project đang chạy.
- **Pro:** từ **25 USD/tháng** (gồm 10 USD compute = 1 project Micro); **sao lưu hằng ngày giữ 7 ngày**; **không bao giờ tạm dừng**; branching (môi trường thử tạm) 0,01344 USD/giờ mỗi nhánh; gói áp cho cả tổ chức, không trộn Free và Pro trong một tổ chức.

## 2. Ba phương án

| | A. Làm tiếp trên QA cũ, cuối cùng chuyển hết sang Singapore | B. Chuyển sang Singapore ngay, làm mọi thứ ở đó | **C. Ba tầng: máy local → Singapore (staging, rồi production) — khuyến nghị** |
|---|---|---|---|
| Tốc độ | Nhanh trước mắt; chậm và rủi ro lúc chuyển một lần (big-bang) | Nhanh, nhưng mỗi thử nghiệm đều chạm môi trường có người thử | Nhanh nhất về lâu dài: thử trên máy (Docker) trong vài giây, chỉ thứ đã qua kiểm mới lên Singapore |
| Độ tin cậy | Thấp: QA cũ lệch lịch sử nên "chạy được ở QA" **không chứng minh** chạy được ở Singapore; phải làm hai lần mọi deploy | Trung bình | Cao: một đích, một sổ cái, một bộ bằng chứng; cái người thử dùng đúng là cái sẽ phát hành |
| Bảo mật | Dữ liệu và khóa rải ở 2 tổ chức; khó thu hồi | Tốt hơn A | Tốt nhất: Singapore là nơi duy nhất có dữ liệu thật; QA cũ đóng băng rồi dừng; khóa đặt mới cho Singapore |
| Dữ liệu người thử | Phải chuyển tài khoản người thử từ QA cũ sang Singapore (gần như không thể giữ phiên đăng nhập) | Giữ nguyên | Giữ nguyên từ closed test sang production |

**A bị loại** vì đúng cái QA cũ thiếu nhất là thứ Singapore cần chứng minh: lịch sử migration sạch. Mỗi tuần làm tiếp ở QA cũ là thêm một tuần chênh lệch phải chuyển sau.

## 3. Khuyến nghị: phương án C, theo 4 bước

1. **Ngay bây giờ — áp gói v2 lên Singapore (bước 2c, Owner đã đồng ý 08/11).** Bản chạy thử còn hạn tới 11/11. Sau đó deploy các Edge Function đã có, đặt khóa mới cho Singapore (OpenRouter, service role chỉ ở backend), bật cờ không lưu dữ liệu (ZDR) cho AI.
2. **Chuyển Admin staging và bản Android thử sang Singapore** (3 biến `EXPO_PUBLIC_*` trên EAS, cấu hình Vercel). **Đóng băng QA cũ:** không deploy thêm; giữ 2–4 tuần làm đối chiếu; sau đó Owner tạm dừng project và thu hồi khóa của nó.
3. **Làm việc hằng ngày trên máy (Supabase local bằng Docker):** migration mới và Edge Function chạy thử local + bộ kiểm 17 mục, rồi mới đẩy lên Singapore qua phiếu duyệt. Không thử nghiệm trực tiếp trên Singapore.
4. **Trước khi mời người thử thật (closed test, ≥ 12 người × 14 ngày): nâng tổ chức Singapore lên Pro (~25 USD/tháng).** Lý do: người thử là người thật với nhật ký và giờ sinh — Free **không có sao lưu**; và nếu nhóm thử vắng một tuần, project **tự dừng** làm hỏng 14 ngày đếm của Google. Cùng project này đi thẳng lên production, người thử giữ tài khoản. Khi đã có người dùng thật, thử migration mới bằng **branching** (trả theo giờ, chỉ khi dùng) thay vì làm thẳng trên production.

Chi phí thêm dự kiến: 0 USD cho tới closed test; ~25 USD/tháng từ closed test (cộng branching vài USD khi dùng). Ngân sách AI giữ nguyên (5 USD/ngày, 50 USD/14 ngày).

## 4. Bảo mật đi kèm

- Một nơi có dữ liệu thật (Singapore); RLS và cách ly A/B đã kiểm trong bản chạy thử, sẽ kiểm lại bằng Security Advisor ngay sau 2c.
- Khóa mới riêng cho Singapore, chỉ ở Supabase Secrets/EAS; không dùng lại khóa của QA cũ.
- Mọi lệnh gọi AI: bắt đăng nhập, hạn mức, công tắc (bản vá Daily insight/Astrology report làm trước khi mở cho người thử).
- Tắt đăng ký người dùng mới cho tới khi Auth/SMTP xong (bộ kiểm 2c yêu cầu "tác dụng phụ đã tắt").
- Sau khi chuyển xong: thu hồi khóa và tạm dừng QA cũ để không còn bề mặt tấn công thứ hai.

## 5. Quyết định cần Owner (lần lượt)

1. Bây giờ: làm các việc trong [phiếu chạy 2c](singapore-packet-v2-2026-11-04/RUN_2C.vi.md) (đọc dashboard, đăng nhập CLI).
2. Sau 2c: duyệt deploy Edge Function và đặt khóa cho Singapore; chuyển Admin staging/EAS sang Singapore; đóng băng QA cũ.
3. Trước closed test: nâng tổ chức Nilaza Free lên Pro.
