# Nilaza — giai đoạn 1: làm sạch Android release

Ngày 25/10/2026, Asia/Bangkok. Hồ sơ Plan & QC: [`android-release-hygiene-2026-10-25.json`](../../feature-plans/android-release-hygiene-2026-10-25.json) — Feature Preflight PASS. Phạm vi: chỉ cấu hình Android (manifest và `app.json`); **không** đổi mã ứng dụng, backend, khóa ký hay cài đặt store. Kết quả nằm trong nhánh local `android/release-hygiene-2026-10-25`, chưa đẩy lên GitHub.

## 1. Đã sửa

| Mục | Trước | Sau |
|---|---|---|
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | Có trong manifest chính **và** do `expo-file-system` thêm lúc gộp | Không còn trong manifest đã gộp của bản release (`tools:node="remove"`) |
| `SYSTEM_ALERT_WINDOW` | Có trong manifest chính (bản debug có riêng trong manifest debug) | Không còn trong bản release; manifest debug giữ nguyên |
| `POST_NOTIFICATIONS` | **Thiếu** — trên Android 13+ app không thể xin quyền thông báo | Đã khai báo; code xin quyền (`src/notifications.ts`) giữ nguyên |
| `android:allowBackup` | `true` | `false` — dữ liệu nhật ký/hồ sơ/giờ sinh không đi vào bản sao lưu tự động của Google |
| `androidx.compose.ui.tooling.PreviewActivity` | Có trong bản release, `exported=true` (activity công cụ xem trước, không dùng khi chạy) | Đã gỡ khỏi bản release |
| `app.json` (`android`) | Không khai báo | Thêm `allowBackup: false`, `permissions`, `blockedPermissions` để lần `expo prebuild` sau không đưa quyền cũ trở lại |

**Vì sao cần sửa trực tiếp manifest:** dự án có thư mục `android/` được commit, nên EAS Build coi là dự án “bare” và theo tài liệu Expo không chạy prebuild; các trường trong `app.json` không tự áp vào manifest. Chỉ sửa `app.json` sẽ không có tác dụng.

**Vì sao cần `tools:node="remove"`:** lần gộp manifest đầu tiên (chỉ xóa dòng khai báo trong manifest chính) cho thấy hai quyền lưu trữ **vẫn còn**, do chính `expo-file-system` khai báo. Ứng dụng chỉ ghi tệp xuất vào thư mục cache riêng rồi chia sẻ qua `expo-sharing`, không cần quyền lưu trữ chung.

## 2. Bằng chứng (local, Windows, Gradle 8.14.3, JDK 17, SDK 36)

Chạy `:app:processReleaseMainManifest` rồi đọc `merged_manifest/release/.../AndroidManifest.xml` (đã gộp mọi thư viện):

- **Quyền `android.permission.*` còn lại (7):** `INTERNET`, `POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, `READ_APP_BADGE`. Cộng 22 quyền không thuộc nhóm hệ thống do `expo-notifications` và Firebase thêm (quyền huy hiệu icon của các hãng launcher, `c2dm.permission.RECEIVE`, install referrer, quyền nội bộ của app). Đây là quyền mức thường; cần khai báo thông báo/đẩy trong biểu mẫu Data safety.
- `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`: **không có**. `POST_NOTIFICATIONS`: **có**. `allowBackup="false"`. `debuggable` không đặt. `usesCleartextTraffic` không đặt (mặc định tắt với target ≥ 28). `extractNativeLibs="false"`.
- **Thành phần `exported=true` (3):** `MainActivity` (màn hình khởi chạy), `FirebaseInstanceIdReceiver` (có quyền `c2dm.permission.SEND` bảo vệ), `ProfileInstallReceiver` (có quyền `DUMP` bảo vệ). `PreviewActivity` đã biến mất.
- Kiểm tra khác trên cây làm việc: `mobile:check` đạt; Jest **53/53 suites, 327/327 tests**; `mobile:release:config:check` đạt (0.1.3, Android 4).

Hai lần chạy Gradle thành công (7 phút 6 giây và 7 phút 54 giây) dùng cache có sẵn ở `D:\nilaza\.brand-work\gradle`, chế độ offline.

**Chưa kiểm được:** một lần chạy thử đồng thời hai tác vụ release + debug bị lỗi biên dịch script của module `expo` (“unable to resolve class expo.modules.plugin…”) — chưa tìm nguyên nhân (nghi do chạy offline/cache khi bật cấu hình debug). Vì vậy **chưa xác minh manifest bản debug** sau khi thêm `tools:node="remove"` cho `SYSTEM_ALERT_WINDOW`. Bản debug không phát hành lên Play; mặc định manifest debug có quyền cao hơn nên dự kiến vẫn giữ quyền này, cần kiểm khi cần dựng bản debug.

## 3. Cấu hình EAS / AAB — kết luận từng điểm

| Điểm | Kết luận | Bằng chứng / giới hạn |
|---|---|---|
| Loại gói của profile `production` | **AAB** | `eas.json` không đặt `buildType`; theo tài liệu Expo lệnh Gradle mặc định là `:app:bundleRelease`. Profile `preview` đặt `apk` cho cài trực tiếp. |
| Ký bản phát hành | **Do EAS bơm vào** | Repo vẫn để `release` dùng ký debug như chỗ giữ chỗ. Với dự án bare, EAS tạo `android/app/eas-build.gradle` dùng keystore từ credentials và áp cho cả `release` lẫn `debug` (tài liệu Expo). Chưa chạy build EAS nên chưa chứng minh chữ ký thật. |
| `debug.keystore` | **Không có** trong repo mới (allowlist từ chối `*.keystore`) | Không ảnh hưởng EAS; build release cục bộ bằng `gradlew` sẽ không ký được nếu không có tệp này. |
| Số phiên bản | 0.1.3 / versionCode 4 khớp giữa `app.json` và `build.gradle`; `appVersionSource: remote`, `autoIncrement: true` | EAS giữ bộ đếm versionCode ở phía remote; **chưa đọc** giá trị đang có. Lần upload Play đầu tiên cần versionCode > 0 và không trùng bản đã upload (chưa từng upload). |
| Biến môi trường backend | **Chưa có** | Hồ sơ 04/10 ghi EAS production thiếu `EXPO_PUBLIC_NILAZA_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (chỉ tên, chưa đọc lại hôm nay). **Một AAB dựng bây giờ sẽ không có cấu hình backend** — chặn đến khi Singapore sẵn sàng và Owner duyệt gắn biến. |
| Mục tiêu SDK | compile/target 36, minSdk 24, NDK 27.1 | Đáp ứng yêu cầu API 36 của Play từ 31/08/2026. |
| Trang 16 KB | `extractNativeLibs=false`, NDK 27 | Căn chỉnh thực của thư viện `.so` chưa kiểm — cần kiểm trên AAB thật. |
| Kiến trúc CPU | `armeabi-v7a, arm64-v8a, x86, x86_64` | Play tách theo ABI khi tải; `x86` chủ yếu cho máy ảo. Có thể cắt bớt để AAB nhỏ hơn, không bắt buộc. |
| Thu nhỏ mã | R8/`shrinkResources` tắt (`enableProguardInReleaseBuilds=false`) | Tùy chọn làm sau; bật có rủi ro hồi quy, cần thử riêng. |
| `expo-dev-client` | Phụ thuộc trong `package.json`; plugin không khai báo | Manifest release chỉ có `DevSettingsActivity` của React Native (`exported=false`); không thấy launcher dev trong bản release. |

## 4. Việc còn lại của giai đoạn 1 / bước tiếp theo

1. Đẩy nhánh và mở PR để CI online kiểm lại (nhánh đặt tên theo quy tắc Vercel để không deploy Admin).
2. Khi Singapore sẵn sàng: Owner duyệt gắn 3 biến `EXPO_PUBLIC_*` vào môi trường production của EAS.
3. Chạy `eas build -p android --profile production` (sau khi có biến và Owner duyệt): kiểm chữ ký, versionCode, kích thước AAB, 16 KB, và liệt kê quyền của AAB (`bundletool`).
4. Thử trên Android 13+ (Air1 Ultra, API 33): hộp thoại xin quyền thông báo xuất hiện; App info không liệt kê quyền lưu trữ hay vẽ trên ứng dụng khác.
5. Quyết định về R8/cắt ABI và xác minh manifest debug (tùy chọn).

## 5. Rủi ro còn lại

- `allowBackup=false` nghĩa là khi người dùng đổi máy, dữ liệu cục bộ **không** tự khôi phục; cần luồng đồng bộ cloud/export rõ ràng (đã có nút xuất dữ liệu; đồng bộ cloud còn các gate riêng).
- Quyền `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` và các quyền huy hiệu do `expo-notifications` thêm: hợp lý cho nhắc nhở nhưng cần được mô tả trong Data safety/mô tả cửa hàng.
- Xác nhận chữ ký, kích thước và 16 KB chỉ có khi dựng AAB thật.
