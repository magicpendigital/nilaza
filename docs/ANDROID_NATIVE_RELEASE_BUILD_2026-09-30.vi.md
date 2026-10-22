# Native Android release build — 30/09/2026

## Kết luận

Native Android build đã được chạy thành công và APK đã được cài, cold-launch trên điện thoại Air1 Ultra. Lỗi lần này nằm ở môi trường/cache build, không phải lỗi TypeScript, native source hay product flow.

APK vẫn là **internal QA artifact debug-signed**, chưa phải bản production/store.

## Các lỗi đã xử lý

### 1. Gradle project cache bị khóa

Gradle bỏ qua `GRADLE_USER_HOME` cho project cache và vẫn ghi vào:

```text
apps/mobile/android/.gradle/8.14.3/fileHashes/fileHashes.lock
```

Kết quả là `Access is denied`. Build được chuyển sang cache riêng có quyền ghi bằng `--project-cache-dir D:/nilaza/.gradle-project-native-release-20260930`.

### 2. Kotlin daemon không ghi được AppData

Kotlin daemon trước đó không tạo được file tạm dưới `C:\Users\Admin\AppData\Local\kotlin\daemon`. Build được chạy với JDK 17 đúng theo hướng dẫn native của repo và quyền elevated để xác minh lỗi ACL của máy. Không đưa credential hoặc thay đổi quyền lâu dài vào repo.

### 3. Tham số `-D` bị Windows Gradle wrapper tách sai

Các tham số `-Dorg.gradle.java.home=...` và `-Dkotlin.compiler.execution.strategy=...` bị `gradlew.bat` tách thành tên task khi đường dẫn/chuỗi có dấu chấm. Đã bỏ các tham số này, chỉ dùng `JAVA_HOME` trỏ tới JDK 17 và `--no-daemon`.

### 4. Expo Gradle plugin output bị hỏng

Một jar Expo plugin chỉ còn descriptor 641 bytes và thiếu `ExpoModulesGradlePlugin`. Đã dừng daemon, xoá đúng hai thư mục build sinh trong `node_modules` đã được xác minh, sau đó để Gradle biên dịch lại. Không sửa package source, package-lock hoặc nâng version dependency.

## Lệnh build thành công

```powershell
$env:JAVA_HOME='C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
$env:GRADLE_USER_HOME='D:\nilaza\.gradle-native-release-20260930'
cd D:\nilaza\apps\mobile\android
.\gradlew.bat :app:assembleRelease `
  -PreactNativeArchitectures=arm64-v8a `
  --project-cache-dir D:\nilaza\.gradle-project-native-release-20260930 `
  --console=plain --no-daemon --max-workers=1
```

Kết quả cuối: **BUILD SUCCESSFUL**, 958 tasks, 26 phút 16 giây.

## Artefact và provenance

- APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
- Manifest: `apps/mobile/android/app/build/outputs/apk/release/app-release.manifest.json`
- SHA-256: `1F9E65C270FBD8F5727A22FBD6096B52181D36C229F7DB5876D49055AB54418C`
- Package: `app.nilaza.mobile`
- Version: `0.1.3` / Android versionCode `4`
- Min SDK: `24`; target SDK: `36`
- ABI: `arm64-v8a`
- Embedded bundle: `assets/index.android.bundle`
- Runtime assets copied by Expo: `660`
- Signing: v2 hợp lệ, 1 signer; dùng debug keystore, **không phải production signing**
- Source revision tại thời điểm build: `691ab75f59b829dbd19de77e3a8ffb109a4d4941`
- Working tree: dirty do các thay đổi Nilaza tồn tại trước task này; không coi đây là CI/release provenance sạch.

## Device smoke test

Thiết bị `Q88549EEXCUOONGA` — Air1 Ultra, Android API 33:

- `adb install -r`: **PASS**
- Gỡ reverse port Metro: **PASS**
- Cold launch sau force-stop, không chạy Metro: **PASS**
- Home và bottom tabs: **PASS**
- Explore: **PASS**
- Explore → Learn Tarot: **PASS**
- Tarot deck cover/artwork native: **PASS**, ảnh hiển thị đúng trong APK native
- Không thấy lỗi Metro, crash hoặc màn hình trắng trong smoke test

Evidence: [native cold-launch screenshot](D:/nilaza/device-native-release-20260930.png), [native Home XML](D:/nilaza/window-native-release.xml), [native Explore XML](D:/nilaza/window-native-release-explore.xml), [native Tarot learning XML](D:/nilaza/window-native-release-learn.xml).

Vòng QA 78 lá, EN, offline/error và timeout đã được xác nhận trước đó trên cùng thiết bị trong [Tarot QA report](D:/nilaza/docs/TAROT_RELEASE_QA_2026-09-29.vi.md). Native smoke hiện tại xác nhận bundle/assets đó được đóng vào APK release-mode và mở được đúng flow.

## Static gates sau build

- Feature preflight: **PASS**
- TypeScript mobile check: **PASS**
- Jest mobile: **38 suites / 222 tests PASS**
- `validate:data`: **PASS** — 7 decks, 78 cards, 22 Major, 56 Minor
- `validate:visual-assets`: **PASS** — 684 runtime files, 62.36 MB
- `validate:mobile-export`: **PASS**
- `validate:governance`: **PASS**
- `mobile:release:config:check`: **PASS** — 0.1.3 / Android 4 / iOS 4
- APK signature/package/bundle inspection: **PASS**
- `supabase:migration-ledger:check`: báo **blocked pending reconciliation**; không chạy database push/repair

## Cảnh báo không chặn build

- Android CXX tool báo SDK XML version 4 trong khi một tool đọc tối đa version 3; build vẫn hoàn tất. Nên đồng bộ command-line tools/Android Studio trước CI release chính thức.
- Gradle/Kotlin/Android dependencies phát nhiều deprecation warnings; không có compile error.
- Expo báo `NODE_ENV` chưa được đặt và tiếp tục dùng `.env.local`/`.env`; không lộ giá trị secret trong log.

## Quyết định release

**Native build gate: đạt cho internal QA. Production release gate: chưa đạt.**

Trước khi phát hành store cần:

1. Build lại trên CI/EAS với production signing và clean provenance.
2. Đồng bộ Android command-line tools để loại cảnh báo SDK XML.
3. Chạy Mobile Quality CI và manager acceptance trên đúng artefact đã ký.
4. Reconcile migration ledger trước mọi database push/repair.

## Rollback

APK, Gradle cache và plugin build output là artefact local. Có thể xoá các output/cache này hoặc bỏ qua khi checkout sạch. Không cần migration rollback, backend rollback hay remote action.
