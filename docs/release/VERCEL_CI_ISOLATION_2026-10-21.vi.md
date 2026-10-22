# Nilaza — cấu hình Vercel cho nhánh CI

Ngày 21/10/2026, Asia/Bangkok. Owner đã trực tiếp yêu cầu kiểm tra và cấu hình qua trình duyệt Codex đã đăng nhập.

**Đã lưu và đọc lại thành công quy tắc bỏ qua build cho riêng nhánh CI hiện tại.** Thay đổi chỉ nằm ở Project Settings của `nilaza-admin-staging`, team `magicpens-projects`, repository `magicpendigital/nilaza`. Chưa push/PR, chạy CI online, build hoặc deploy Admin trong lượt này.

## Cấu hình đã kiểm tra

| Mục | Trước và sau thay đổi |
| --- | --- |
| Production branch | `main`, giữ nguyên |
| Tự gán domain Production | Bật, giữ nguyên |
| Domain Production đang cấu hình | `nilaza-admin-staging.vercel.app` |
| Preview Branch Tracking | Bật, `All unassigned branches`, giữ nguyên |
| Domain Preview | Không có domain gắn trong trang đã kiểm |
| Root Directory | `apps/admin`, giữ nguyên |
| Include files outside root / skip unaffected project | Đều bật, giữ nguyên |
| Node trên Vercel | `24.x`, giữ nguyên |
| System Environment Variables | Bật ở Production và Preview; không đọc giá trị secret |
| Deploy Hooks | Trang Git không có hook |
| Deployment Checks | Trang build hiện không có check cấu hình; không suy rằng release đã được bảo vệ bởi CI |

Mục **Ignored Build Step** đổi từ **Automatic** sang **Custom**, với lệnh đã kiểm thử:

```sh
case "${VERCEL_GIT_COMMIT_REF:-}" in ""|"codex/android-release-unblock-2026-10-19") exit 0 ;; *) exit 1 ;; esac
```

Ý nghĩa:

- Đúng nhánh `codex/android-release-unblock-2026-10-19`: trả `0`, bỏ qua build Admin.
- Thiếu hoặc rỗng thông tin nhánh: cũng trả `0`, dừng build thay vì cho qua khi chưa biết nguồn.
- Các nhánh có tên khác, gồm `main`: trả `1`, tiếp tục quy trình build hiện có. Không thêm quyền hay tự phê duyệt release.

Vercel quy định mã `0` là bỏ qua/cancel, mã `1` là tiếp tục build. Quy tắc này chạy sau khi checkout; deployment bị cancel vẫn có thể tạo metadata và tính vào quota. Nó không ngăn chuyển source lên Vercel hoặc thay các gate giữ bí mật/phát hành. [Tài liệu Ignored Build Step](https://vercel.com/docs/project-configuration/project-settings), [hướng dẫn Vercel](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel).

## Bằng chứng và giới hạn

Đã chạy **9/9 ca local PASS** bằng Git for Windows Bash với profile bị tắt và môi trường không chứa credential: nhánh CI chính xác, rỗng, không đặt biến, `main`, nhánh Preview khác, hai tên gần giống, chuỗi chứa cú pháp shell và dấu nháy. Kiểm tra cả mã thoát và việc chuỗi tên nhánh không bị thực thi như lệnh. Không cài dependency hoặc sửa source ứng dụng.

Sau Save, đã tải lại trang, mở Project Settings và đối chiếu đúng toàn bộ lệnh. Đã đọc lại Production/Preview để xác nhận các mục ở trên giữ nguyên. Production Overrides hiển thị command cũ rỗng của bản đang phục vụ; không redeploy bản đó.

- [Kết quả kiểm thử lệnh](../../artifacts/vercel-ci-isolation-2026-10-21/command-validation.json).
- [Biên nhận từ giao diện sau tải lại](../../artifacts/vercel-ci-isolation-2026-10-21/browser-setting-result.json).
- [Ảnh cấu hình đã lưu](../../artifacts/vercel-ci-isolation-2026-10-21/ignored-build-step-saved.jpg).
- [Đối chiếu cuối](../../artifacts/vercel-ci-isolation-2026-10-21/final-receipt.json).

Các lỗi chuẩn bị local được giữ trong `initial-preparation-failures.json`: tên ownerAgent quá ngắn, vị trí Bash ban đầu không tồn tại, PATH thiếu Git và khác chủ sở hữu khi chạy trong sandbox. Lệnh kiểm thử được chạy bằng Git Bash đã có dưới đúng ngữ cảnh sở hữu repository, không thêm `safe.directory` toàn cục hay đọc cấu hình tài khoản. Một số thao tác đọc UI phải điều chỉnh locator do nhãn trùng/lặp; chỉ có một thao tác Save cấu hình project.

**Đây là cấu hình đã lưu và kiểm thử local, chưa phải bằng chứng một deployment thực đã bị hủy.** Source commit đã kiểm ngày 20/10 vẫn là `ab597f41d9dea9ec82c9a1ed83a676850909a44c`; các kết quả 34 jobs trước đây không được đổi thành CI online PASS. Cần tiếp tục kiểm đường chuyển nguồn/lịch sử Git an toàn, base trên GitHub và các project khác có thể cùng liên kết repository trước khi trình thao tác remote cụ thể. Quy tắc này chỉ áp dụng project Admin đã nêu; không chứng nhận toàn bộ repository không còn tác nhân deploy khác.

## Khôi phục và bước tiếp theo

Muốn bỏ quy tắc: mở [Build and Deployment — Ignored Build Step](https://vercel.com/magicpens-projects/nilaza-admin-staging/settings/build-and-deployment#ignored-build-step), mở **Project Settings**, chọn **Automatic**, rồi Save. Không cần redeploy, ngắt Git hay đổi nhánh Production để khôi phục setting này.

Nếu sau này dùng tên nhánh CI khác, phải cập nhật quy tắc tương ứng trước thao tác Git. Bản build qua CLI thiếu thông tin nhánh sẽ bị bỏ qua; xử lý trong packet build cụ thể, không âm thầm tắt quy tắc. `ignoreCommand` trong source tương lai hoặc thao tác redeploy bỏ chọn ignore step có thể thay hành vi; luôn kiểm effective config trước build.

Owner không cần gửi thêm key, mật khẩu hoặc OTP cho bước vừa hoàn tất. Bước kế tiếp là chuẩn bị đường CI online đúng source và kiểm tác động remote; SQL Singapore, provider/chi phí, native Android và phát hành Play vẫn theo [báo cáo ứng viên](ANDROID_RELEASE_UNBLOCK_2026-10-19.vi.md) và các gate hiện có.
