# Tự nhận diện ngôn ngữ và gửi email theo ngôn ngữ đăng ký — phương án (15/11/2026)

Trạng thái: **Owner duyệt 15/11, đã làm trong app** (chờ bản build Android mới để kiểm trên máy thật); mẫu email đã áp lên Supabase. **18/11:** sửa lỗi Owner gặp khi thử 17/11 — ngôn ngữ chọn khi chưa đăng nhập giờ được lưu trên máy và theo vào tài khoản mới (trước đó tài khoản mới lấy lại ngôn ngữ máy và ghi đè ngôn ngữ email); chờ bản build Android mới.

**Owner quyết 15/11:** ngôn ngữ máy khác Tiếng Việt → **English**; đổi ngôn ngữ trong Cài đặt thì email về sau **đổi theo**. Người đã dùng app giữ ngôn ngữ đã lưu (hồ sơ trên máy có sẵn ngôn ngữ, nên không cần thêm dấu “đã tự chọn”). Tiêu đề thư cũng rẽ nhánh theo ngôn ngữ (Supabase cho dùng biến trong tiêu đề).

## 1. Owner muốn gì

1. App tự hiển thị theo ngôn ngữ điện thoại trên **trang bắt đầu, đăng ký, đăng nhập**.
2. Người dùng đổi được sang ngôn ngữ khác.
3. Khi gửi đăng ký, gửi kèm **ngôn ngữ lúc đăng ký**, và email gửi đi theo ngôn ngữ đó.

## 2. Hiện trạng (đối chiếu mã ngày 15/11)

| Phần | Đang có | Còn thiếu |
|---|---|---|
| Ngôn ngữ app | Hai ngôn ngữ dùng được: Tiếng Việt, English (Trung/Nhật/Hàn hiện “Sắp ra mắt”). Mặc định **Tiếng Việt** (`apps/mobile/src/i18n.ts`). | Không đọc ngôn ngữ điện thoại; app chưa cài `expo-localization`. |
| Lưu lựa chọn | Ngôn ngữ nằm trong hồ sơ trên máy (`nilaza.profile`), giữ qua các lần mở app. | Không phân biệt “người dùng tự chọn” với “mặc định”. |
| Nút đổi ngôn ngữ | Có menu ngôn ngữ ở **trang bắt đầu** (`AuthFlow.tsx`). | Trang **Đăng ký** và **Đăng nhập** không có menu: phải quay lại trang bắt đầu mới đổi được. |
| Gửi đăng ký | Gửi `name` và thời điểm xác nhận 18+ (`supabaseAuth.ts`). | Không gửi ngôn ngữ. |
| Mẫu email | Song ngữ (tiếng Việt trước, một dòng tiếng Anh) — xem [đề xuất mẫu email](AUTH_EMAIL_TEMPLATES_2026-11-15.vi.md). | Chưa chọn ngôn ngữ theo người nhận. |

## 3. Phương án đề xuất

### 3.1 Nhận diện ngôn ngữ điện thoại

- Thêm thư viện chính thức của Expo `expo-localization` (đi kèm Expo SDK 54 app đang dùng), đọc ngôn ngữ ưu tiên của máy bằng `getLocales()`.
- Quy đổi: máy để tiếng Việt → **Tiếng Việt**; máy để tiếng Anh → **English**; ngôn ngữ khác (Trung, Nhật, Hàn, Pháp…) → **English** (vì chưa có bản dịch, English dễ hiểu hơn với người nước ngoài). *Owner chọn:* ngôn ngữ khác về English hay về Tiếng Việt.
- **Chỉ áp cho lần mở app đầu tiên** hoặc khi người dùng chưa từng tự chọn. Người đã dùng app giữ nguyên ngôn ngữ hiện tại — không đổi ngang khi họ cập nhật app.
- Lưu thêm dấu “người dùng đã tự chọn ngôn ngữ”; khi đã có dấu này thì không bao giờ tự đổi theo máy nữa.

### 3.2 Đổi ngôn ngữ

- Giữ menu ở trang bắt đầu; **thêm cùng menu đó** vào góc trên trang Đăng ký và Đăng nhập (dùng lại thành phần sẵn có, không thiết kế mới).
- Đổi ở đâu thì cả app đổi theo và được lưu lại.

### 3.3 Gửi ngôn ngữ khi đăng ký

- Khi bấm Đăng ký, app gửi thêm `locale` (`vi` hoặc `en`) — ngôn ngữ đang hiển thị **đúng lúc bấm** — cùng tên người dùng. Supabase lưu vào thông tin tài khoản (user metadata). Không cần SQL hay bảng mới.
- “Gửi lại thư xác nhận” và “Quên mật khẩu” dùng ngôn ngữ đã lưu trong tài khoản, nên thư sau cũng đúng ngôn ngữ.
- *Owner chọn:* khi người dùng đã đăng nhập rồi đổi ngôn ngữ trong Cài đặt, có cập nhật ngôn ngữ email theo không? Đề xuất **có** (thư quên mật khẩu về sau đúng ngôn ngữ họ đang dùng); nếu Owner muốn giữ cố định “ngôn ngữ lúc đăng ký” thì bỏ bước này.

### 3.4 Email theo ngôn ngữ

- Mẫu email của Supabase cho phép rẽ nhánh theo thông tin tài khoản: mỗi mẫu có **bản tiếng Việt và bản tiếng Anh** trong cùng một tệp, chọn bằng `locale`.
- **Không có `locale` → tiếng Việt** (tài khoản cũ, Owner, thành viên Admin).
- Lời mời thành viên Admin: hàm `admin-team-invite` có thể gửi kèm `locale`; đề xuất cố định **tiếng Việt** vì trang quản trị chỉ có tiếng Việt.
- Tiêu đề thư: *chưa kiểm* Supabase có cho tiêu đề rẽ nhánh theo ngôn ngữ không. Nếu không được, tiêu đề giữ dạng song ngữ ngắn, ví dụ “Xác nhận email · Confirm your email — Nilaza”.
- Nội dung tiếng Việt theo [đề xuất mẫu email](AUTH_EMAIL_TEMPLATES_2026-11-15.vi.md); bản tiếng Anh dịch đủ ý (không chỉ một dòng), soạn cùng lúc khi Owner duyệt nội dung.

## 4. Ảnh hưởng

- **Cần bản build Android mới** (thư viện mới là phần gốc của app, không cập nhật qua mạng được). Gộp vào bản thử nội bộ kế tiếp.
- Không đổi cơ sở dữ liệu, không thêm Edge Function. Admin không bị ảnh hưởng (trừ lời mời, cố định tiếng Việt).
- Riêng tư: chỉ gửi mã ngôn ngữ (`vi`/`en`), không gửi vùng hay múi giờ.
- Quay lui: bỏ đọc ngôn ngữ máy thì app trở lại mặc định Tiếng Việt; mẫu email không có `locale` vẫn gửi tiếng Việt.

## 5. Kiểm thử dự kiến

- Kiểm thử tự động: quy đổi ngôn ngữ (vi, en, zh, fr, không đọc được → mặc định); người đã tự chọn không bị đổi; đăng ký gửi đúng `locale` vừa chọn.
- Trên điện thoại thật: đặt máy tiếng Anh → mở app mới cài → trang bắt đầu tiếng Anh; đổi sang Tiếng Việt ở trang Đăng ký → đăng ký → thư xác nhận tiếng Việt; làm ngược lại với tiếng Anh; “Quên mật khẩu” ra đúng ngôn ngữ.
- Gmail điện thoại và máy tính, không vào Thư rác.

## 6. Thứ tự làm và việc cần Owner duyệt

1. Owner duyệt phương án này (và 2 lựa chọn ở 3.1, 3.3) cùng nội dung email tiếng Việt.
2. Agent: lập hồ sơ tính năng, sửa app (3.1–3.3) + kiểm thử, viết lại mẫu email hai bản trong repo → PR, xin duyệt gộp.
3. **Owner duyệt riêng:** áp mẫu email lên Supabase (đổi cài đặt); đổi hàm `admin-team-invite` nếu gửi `locale` (deploy Edge Function).
4. Build Android thử nội bộ, chạy kiểm thử ở mục 5.
