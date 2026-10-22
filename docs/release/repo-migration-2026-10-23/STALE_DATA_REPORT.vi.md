# Nilaza — danh sách dữ liệu cũ/lỗi thời trong thư mục `D:\nilaza`

Ngày 23/10/2026, Asia/Bangkok. Đây là **danh sách để Owner tự xóa**; agent **không xóa tệp nào**. Số liệu đo trực tiếp trên ổ đĩa hôm nay (đơn vị MB/GB nhị phân). Chỉ đọc tên tệp và kích thước, không mở nội dung hồ sơ trình duyệt, ảnh QA hay video.

**Trước khi xóa bất kỳ thứ gì:** bản sao lưu cây làm việc đã có tại `D:\nilaza_backup_2026-10-23\workspace` (28.444 tệp, 7,48 GB, 0 lỗi; đã loại `node_modules`, `.git`, cache, hồ sơ trình duyệt và tệp `.env*`/khóa). Sao lưu **không** chứa `.git` (lịch sử vẫn ở repo GitHub cũ) và **không** chứa các thư mục cache/build ở nhóm A.

Tổng quan: thư mục dự án đang chiếm khoảng **50 GB** (không tính `.git` ~3 GB), trong đó phần lớn là cache, bản build/bản xuất có thể tạo lại; nguồn phát hành sau khi lọc chỉ ~265 MB.

---

## Nhóm A — Xóa an toàn (tạo lại được hoặc đã hết giá trị)

| # | Mục | Dung lượng | Vì sao xóa được | Lưu ý |
|---|---|---:|---|---|
| A1 | `.gradle-codex-escalated`, `.gradle-codex`, `.gradle-native-release-20260930`, `.gradle-codex-escalated2`, `.gradle-user-home`, `.gradle-project-*` (6 thư mục) | **~17,2 GB** | Cache Gradle do các lượt build thử tạo ra | Build kế tiếp tự tải lại. Bản phát hành chính thức dùng EAS Build nên không cần. |
| A2 | `apps/mobile/android/app/build`, `apps/mobile/android/app/.cxx`, `apps/mobile/android/build` | **~2,05 GB** | Đầu ra biên dịch Android | Tạo lại khi build. |
| A3 | Bản xuất web/JS cũ **đang bị Git theo dõi**: `apps/mobile/.codex-web-export` (367 MB), `.codex-expo-export-final/-responsive/-account/-reconciled` (4×55 MB), `.codex-js-export` (74 MB) | **~660 MB** | Bản xuất Metro tạm của các lượt kiểm thử tháng 9–10 | Có thể tạo lại bằng `expo export`. |
| A4 | Bản xuất CI cũ: `apps/mobile/.ci-native`, `.ci-native-qa-20260926`, `.ci-web-export`, `.ci-web-export-qa-20260926`, `.ci-web-export-ai-fix-20260926` | **~390 MB** | Kết quả chạy CI/QA cục bộ ngày 26/09 | |
| A5 | `apps/mobile/dist` (370 MB), `apps/mobile/dist-web-mythology` (64 MB), `output/` (427 MB: `mvp-20261001`, `mvp-20261001-fonts`, `mythology-android`…) | **~860 MB** | Bản xuất web/Android thử nghiệm của các lượt QA | Không dùng làm artifact phát hành (không có hash/commit). |
| A6 | Hồ sơ Chrome QA: `.codex-chrome-rose-qa` (182 MB), `.codex-ui-audit-chrome` (7 MB), `-9224` (7 MB), `-9225` (59 MB) | **~255 MB** | Hồ sơ trình duyệt tự động của các phiên audit; chứa tệp `Login Data`, `Cookies`, `History` | Xóa ở ổ đĩa không xóa bản đã nằm trong lịch sử Git của repo cũ (repo đó giữ nguyên làm kho lưu trữ). Trước khi xóa, hãy đăng xuất/thu hồi phiên các tài khoản từng đăng nhập trong các hồ sơ này. |
| A7 | APK QA cũ: `tarot-release-qa-20260929` (1,29 GB), `tarot-ux-fix-qa-20260929` (1,17 GB), `apk-inspect` | **~2,47 GB** | Bản APK ký debug ngày 29/09 (v4–v7 và các biến thể `aligned/base`), đã bị bản mới thay thế | Không dùng làm bản phát hành. Nếu muốn giữ mốc lịch sử, giữ **một** APK mới nhất. |
| A8 | 283 tệp rời ở thư mục gốc: `device-*.png`, `qa-device-*.png/.xml`, `window-*.xml` | **~49 MB** | Ảnh chụp màn hình/UI dump của điện thoại trong đợt QA 29–30/09 | Có thể chứa dữ liệu tài khoản thử; nên xóa. |
| A9 | `tmp/` (76 MB: `astral-recovered`, `astral-review-crops`), `temporarily/`, tệp tên `"temporarily`, `audit/ui-2026-07-08`, `scratch/`, `.kotlin-daemon-native-release-20260930/`, `.expo-codex`, `.expo-codex-debug`, `.codex-remote-attachments`, `.codex-expo-dev-launcher-gradle-plugin`, `.npm-cache-codex` (201 MB), `.npm-cache-codex-debug` | **~280 MB** | Thư mục tạm của công cụ/agent và ảnh khôi phục đã dùng xong | |
| A10 | `apps/mobile/App_fixed.tsx`, `apps/mobile/App_restored.tsx` | ~1,8 MB | Hai bản sao cũ của `App.tsx`, không được import (audit 30/09) | Gây rủi ro sửa nhầm. Giữ trong repo cũ nếu cần tham khảo. |

**Tổng nhóm A: ~24 GB.**

## Nhóm B — Cần Owner xác nhận trước khi xóa

| # | Mục | Dung lượng | Nhận định | Gợi ý |
|---|---|---:|---|---|
| B1 | `documents/` — `Trị liệu` (318 MB), `Tư thế lẻ` (160 MB), `Tổng hợp tư thế cơ bản` (48 MB) | **~526 MB** | Toàn bộ là tệp video `.mov` có tên về trị liệu/tư thế (ví dụ “Giảm đau lưng dưới”). **Có vẻ không thuộc dự án Nilaza.** Tôi chỉ đọc tên tệp, không mở. | Nếu không phải tài liệu của Nilaza: chuyển khỏi thư mục dự án. |
| B2 | `artifacts/` (13.445 tệp, **1,67 GB**) — lớn nhất: `celestial-reverie-path-rename-2026-10-19` (213 MB), `tinh-quang-free-integration-2026-10-18` (213 MB), `resend-auth-android-qa-2026-10-05` (209 MB), `astrology-ai-android-qa-2026-09-26` (206 MB), `ux-depth-implementation-2026-10-14` (188 MB), `ai-operations-qa-2026-10-16` (186 MB) | **~1,67 GB** | Bằng chứng QA/kiểm tra theo từng lượt; **không nằm trong repo phát hành mới** (allowlist loại `artifacts/`). Nhiều thư mục là ảnh chụp thiết bị. | Giữ gọn các mục gắn với phát hành: `android-release-unblock-2026-10-19` (45 MB), `android-key-backup-*`, `release-preparation-*`, `singapore-*`. Còn lại: nén vào kho riêng (Drive/ổ ngoài) rồi xóa khỏi thư mục. |
| B3 | `design/` (205 MB: `launch` 91 MB, `stitch` 84 MB, `brand-experience` 30 MB) | **~205 MB** | Tham chiếu thiết kế cũ (Stitch đã bị thay bởi Open Reflection v1), bản xuất slide/PDF. Không vào repo mới. | Giữ `design/launch/.../source` nếu còn dùng làm nguồn tài liệu; còn lại lưu trữ ngoài. |
| B4 | `.cache/release-preparation-2026-10-18` | **3,55 GB** | Ứng viên nguồn **v4** (18/10) — đã bị ứng viên 19/10 thay thế | Có thể xóa sau khi repo mới hoàn tất. |
| B5 | `.cache/android-release-unblock-2026-10-19` (candidate `ab597f4`) | **3,50 GB** | Ứng viên đang dùng làm nền đối chiếu | **Giữ cho đến khi repo mới được tạo và kiểm xong**, sau đó xóa. |
| B6 | `.brand-work` | **13,7 GB** | `android-sdk` 5,8 GB (có `adb`, cần để cài APK lên điện thoại và build cục bộ); `gradle` 4,0 GB (bản phân phối Gradle); `libreoffice` 1,5 GB + `LibreOffice.msi` 357 MB (công cụ dựng tài liệu); ~1,6 GB ảnh/QA review Astrology và store-release 04/10; `npm-cache` 104 MB | Giữ `android-sdk` nếu còn dùng `adb`; xóa `gradle`, `libreoffice*`, các thư mục `*-review-*`/`*-qa-*`/`store-release-readiness-*`/`domain-update-*` nếu không còn cần xem lại. |
| B7 | `node_modules` (gốc 5,5 GB; `apps/mobile` 2,9 GB; `apps/web` 24 MB) | **~8,4 GB** | Thư viện cài lại được bằng `npm ci` | Chỉ xóa nếu cần chỗ trống; cài lại mất vài phút. |
| B8 | `.local` (1,4 MB), `.agents`, `.wrangler-config`, `skills/…` | nhỏ | Cấu hình/công cụ cục bộ chưa rõ chủ sở hữu | Không cần xóa; không ảnh hưởng dung lượng. |

## Nhóm C — **KHÔNG xóa**: nguồn thật chưa được Git theo dõi

516 mục chưa theo dõi gồm mã nguồn đang dùng. Chúng **chỉ có ở ổ này và ở bản sao lưu**:

- `apps/mobile/src/…` (feedback, emailConfirmation, tarotDeckIdentity, readingPresentation…), `apps/admin/{feedback-inbox,workflow-catalog,workflow-view}.js`, `apps/web/src/lib/*`.
- `scripts/*` (43 tệp: release-evidence, database-target-gate, recovery, key-backup…), `supabase/migrations` mới (3 tệp), `supabase/functions/ai-feedback`, `_shared/answer-*`, `marketing-waitlist`, `supabase/templates`.
- `packages/ai-contracts`, `packages/content/data/{tarot-learning-depth.json,tarot-staging/}`, `packages/growth-nilaza/youtube`.
- **Ảnh gốc Tarot `assets/tarot/celestial-reverie` (440 MB), `classic-arcana/{contact-sheets,revisions}`** và `apps/mobile/assets/runtime/tarot/celestial-reverie` — **chưa có trong lịch sử Git nào**. Nếu mất ổ đĩa, chỉ còn bản sao lưu trong `D:\nilaza_backup_2026-10-23`.

## Nhóm D — Ảnh gốc Tarot (`assets/tarot/**/*.png`): quyết định về kho lưu

Bộ 78 lá × 7 bộ dạng PNG gốc chiếm **1,37 GB / 1.436 tệp** (celestial-reverie 440 MB, classic-arcana 249 MB, astral-pop-atelier 224 MB, moon-garden 219 MB, stellar-academy 58 MB, golden-thread 36 MB, rose-mirror 35 MB, star-seeker 19 MB, deck-covers/backs 28 MB). App chỉ dùng bản đã tối ưu trong `apps/mobile/assets/runtime/tarot` (JPG, ~62 MB). **Đề xuất:** repo mới **không** chứa PNG gốc (giảm repo từ ~1,63 GB xuống ~265 MB); tệp JSON/Markdown/JPG mô tả bộ bài vẫn ở lại. PNG gốc được lưu ở nơi riêng (Drive private/ổ ngoài) — **bạn cần chọn nơi lưu** và tự xóa khỏi thư mục sau khi chắc chắn có bản sao thứ hai.

---

## Thứ tự xóa đề xuất (từ rủi ro thấp đến cao)

1. Nhóm A1–A2 (≈19 GB cache Gradle và build) — tạo lại được.
2. A3–A5, A7–A9 (≈4,3 GB).
3. A6 (hồ sơ Chrome) — sau khi đã đăng xuất/đổi mật khẩu các tài khoản liên quan.
4. B4 (`.cache/release-preparation…`), rồi B5 sau khi repo mới được tạo xong.
5. B1–B3 sau khi bạn xác nhận/lưu trữ riêng.

Cách xóa an toàn trên Windows: xóa bằng File Explorer vào Thùng rác trước, kiểm tra `npm run mobile:check` còn chạy, rồi mới xóa vĩnh viễn. **Không xóa** các mục thuộc nhóm C trước khi repo mới được đẩy lên và bản sao lưu được mở thử.
