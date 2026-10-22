# Đồng bộ Nilaza — Open Reflection v1

Ngày bắt đầu: 2026-09-11. Kế hoạch được chủ sản phẩm phê duyệt trong task này. Tài liệu này theo dõi triển khai; không đồng nghĩa đã phát hành.

## Quyết định và phạm vi

Open Reflection v1; wordmark NILAZA dùng EB Garamond Regular 400, nội dung/nút dùng Hanken Grotesk. Thông điệp: “Một khoảng mở để lắng nghe mình.” / “A space to listen to yourself.” Đợt app đầu: nhận diện, welcome, onboarding một bước và Home. Giữ auth-first, năm tab, các ID mục tiêu hiện có. Bộ ra mắt gồm web/help, hướng dẫn VI/EN, PDF/DOCX/PPTX, social, OG và tài sản store.

## Whole-App Impact Brief

| Mặt tác động | Quyết định triển khai |
| --- | --- |
| Tuyến công việc | Cross-cutting: tài liệu/skills → brand assets → mobile → web/Admin → ấn phẩm → nghiệm thu. |
| Điểm vào | Launcher/splash, welcome/auth/deep link, onboarding sau đăng nhập, Home/Today Pulse; header/footer web; login/shell Admin. |
| Ghi dữ liệu | Tái sử dụng profile, goals, tone, nickname và onboarded. Không xóa câu trả lời cũ. Lưu thất bại phải hiển thị lỗi và cho thử lại. |
| Backend | Không thêm API, migration, loại phiên AI hoặc lượt tính phí. Giữ auth, sync, credits, journal và các luồng khôi phục hiện có. |
| Admin | Chỉ nhận diện login/shell và hướng dẫn. Giữ Content Operations, AI Studio, phân quyền, dữ liệu và audit. |
| Nội dung/quyền riêng tư | Public chỉ lấy Help/legal VI/EN. Tài liệu owner, Agent và prompt không vào public/corpus. Ảnh nghiệm thu dùng dữ liệu kiểm thử. Không tự thêm giá, ngày ra mắt, chứng thực hoặc lời hứa sức khỏe. |
| Phân tích | Dùng sự kiện hiện có; không thêm SDK, không đưa nội dung riêng tư vào payload. |
| Ngoài phạm vi | Guest, thanh toán, email marketing, đăng bài/quảng cáo, toàn bộ thiết kế lại Chat/Tarot/Journal, thay schema hoặc phát hành chính thức. |
| Rollback | Giữ master v1 và lịch sử concept. Khôi phục bản mã/asset trước theo thay đổi có phạm vi; icon/splash cần binary mới. Web quay về deployment đã nghiệm thu. Không xóa dữ liệu. |

## Tệp dự kiến

- Chuẩn và hướng dẫn: `docs/BRAND_GUIDELINES.md`, AGENTS/router/Plan-QC/DESIGN/Stitch/A2UI, PRD/MVP, agent config; `skills/` và công cụ sync/validate.
- Nguồn: `assets/brand/open-reflection/v1`, `packages/content/data/brand-identity.json`, công cụ sinh asset và runtime; `assets/features` cho artwork riêng.
- Tích hợp: mobile App/auth/A2UI/theme/native config; web components/layout/copy/help; Admin login/shell.
- Ra mắt: `design/launch/open-reflection-v1/` chứa nguồn chỉnh sửa, bản xuất và manifest bằng chứng.

Workspace đã có nhiều thay đổi trước task; chỉnh từng vùng, giữ nguyên thay đổi không liên quan. Không dùng reset/clean/prebuild --clean.

## Cổng nghiệm thu và cách người quản lý thử

1. **A — Tài liệu/skills:** Agent mới đọc AGENTS → router → Brand Guidelines, tìm được master, phân biệt concept, chọn đúng kiểm tra. Backend-only không bị buộc vào thiết kế.
2. **B1 — Asset:** `assets:generate -- --check`, `validate:brand`, `validate:visual-assets`; checksum, kích thước, alpha, icon safe zone, font, motion 800 ms/Reduce Motion. Chạy lại generator không quay về Stitch/Gemini.
3. **B2 — App:** tạo tài khoản → xác nhận → chọn/bỏ qua mục tiêu → Home → mở/xem lại phút phản chiếu → Chat/Journal. Kiểm tra người cũ, onboarding dở, lỗi lưu, đổi tài khoản, offline, password reset/deep link. Chạy mobile check, data và test hành vi liên quan.
4. **B3 — Web/Admin:** VI/EN, Help/search, waitlist, header/footer/OG/favicon; admin check/test và cả hai workspace. Chạy web check/build, public-content/corpus check.
5. **C — Ấn phẩm:** mỗi file có ngôn ngữ, brand version, app reference, nguồn sửa được; render mọi trang kiểm tra dấu, tràn chữ, ảnh và liên kết. Không mô tả tính năng chưa kiểm chứng.
6. **D — Release candidate:** thiết bị iOS/Android thật hoặc môi trường release phù hợp; icon/splash/notification, 360/390/430 px, tablet/landscape, font lớn, screen reader, Reduce Motion/font fallback. Manager xem app, website preview và toàn bộ ấn phẩm cùng phiên bản trước phê duyệt phát hành.

## Tiến độ

| Nhóm | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Master Open Reflection v1 | Đã chốt thiết kế | `design/brand-experience/2026-09-10/master-v1/HANDOFF-QC.vi.md` |
| A — Tài liệu và skills | Đã tích hợp, kiểm tra tuyến và đồng bộ | Brand Guidelines, router/Plan-QC, skill quick_validate và skills:check |
| B1 — Asset chính thức | Đã tích hợp, kiểm tra tự động | 84 nguồn repo, 118 exports; validate:brand; 9 feature visuals; 555 runtime assets |
| B2 — Mobile | Đã tích hợp; đạt check/test, browser và compile Android debug | 13 suites / 54 tests; Home ở năm kích thước web preview; APK arm64 debug tạo thành công; native RC chưa kiểm chứng |
| B3 — Website/Admin | Đã tích hợp; đạt build/check/test local | Web 43 trang, Pagefind 16 trang Help VI/EN; Admin 29 tests; cần thử workspace có quyền và waitlist cấu hình thực |
| C — Hướng dẫn/ấn phẩm | Đã chuẩn bị và render; chưa phát hành | 34 exports; 33 nguồn chỉnh sửa; 4 DOCX, 7 PDF, 2 PPTX, 21 graphics; ảnh store native còn thiếu |
| D — Nghiệm thu RC | Chưa kiểm chứng | — |
| Phát hành chính thức | Chưa phát hành | Phê duyệt riêng sau nghiệm thu |

## Nhật ký kiểm chứng

Ghi kết quả thực tế tại đây sau mỗi cổng; phân biệt kiểm tra tự động, xem browser và kiểm chứng native. Không dùng ảnh mock hoặc web preview để chứng nhận screenshot store/native release.

### Tổng hợp 2026-09-13

- `npm run validate:brand`: đạt 84 nguồn / 118 bản xuất; generator `--check` không có sai lệch.
- `npm run skills:check`: hai skill cài đặt khớp nguồn repo. Hai skill đã qua `quick_validate.py`. Walkthrough Home/header/PDF/social/backend tại [QC](../design/launch/open-reflection-v1/review/QC.vi.md).
- Mobile TypeScript check đạt; 54 tests trong 13 suites đạt cho auth, account storage, recovery, onboarding, Home và font fallback. Browser dùng tài khoản kiểm thử local, kiểm tra bỏ qua mục tiêu, Today Pulse mở/xem lại, giữ trạng thái khi reload và Journal.
- `validate:visual-assets`, `validate:data`, `validate:public-content` đạt. Corpus hiện hành 22 tài liệu / 56 chunks, chỉ nguồn Help/legal.
- Web check/build đạt; 43 trang, Pagefind hai ngôn ngữ / 16 trang. Browser kiểm tra ảnh/OG, Help search và trạng thái waitlist chưa cấu hình. Không gửi yêu cầu đăng ký thật. Admin check và 29 tests đạt; browser mới xác nhận màn đăng nhập, chưa xác nhận hai workspace sau đăng nhập.
- Bộ Office/PDF đã render/xem; quick start hai trang, user guide năm trang, slide tám trang mỗi ngôn ngữ, brand guide sáu trang. Bộ social 18 ảnh, OG VI/EN và avatar. [Mục lục bàn giao](../design/launch/open-reflection-v1/README.md); `npm run validate:launch` kiểm tra nguồn công khai, phiên bản và checksum.
- Android debug build đã đạt ngày 2026-09-13: `:app:assembleDebug -PreactNativeArchitectures=arm64-v8a`, 21 phút 33 giây, 530 tasks. SDK/NDK và Gradle cache riêng trong `.brand-work` giải quyết môi trường SDK hệ thống không ghi được. APK 65.082.123 bytes, package `app.nilaza.mobile`, v0.1.0, minSdk 24/targetSdk 36; `apksigner verify` đạt với chữ ký Android Debug. [Bằng chứng và checksum](../design/launch/open-reflection-v1/review/native/android-debug.json). Đây là development client cần Metro, chưa phải RC độc lập hoặc bản store.
- ADB không có thiết bị kết nối; chưa chạy native, chưa kiểm chứng iOS. Cảnh báo deprecated từ Gradle/dependency vẫn còn và được tách khỏi kết quả build thành công. Quy trình chạy lại và các ca nghiệm thu ở [Mobile EAS Testing](MOBILE_EAS_TESTING.md#open-reflection-native-verification-2026-09-13).

### Kiểm tra Android trực tiếp — 2026-09-14

Air1 Ultra đã kết nối ADB, cài APK debug và mở qua Metro/USB. Lần chạy đầu gặp `window.addEventListener is not a function`: effect theo dõi cuộn web trong `App.tsx` chỉ kiểm tra sự tồn tại của `window`, trong khi React Native cũng có global này. Đã thêm điều kiện `Platform.OS === "web"` cho hai effect DOM/CSS và cuộn; không đổi storage/auth/backend. Mobile TypeScript check đạt. Sau khởi động lại, ảnh chụp trực tiếp thiết bị xác nhận welcome với logo, thông điệp và hai CTA đã render, không còn màn lỗi này. Đây mới là kiểm chứng khởi động debug; chưa nghiệm thu auth/onboarding/Home, accessibility, splash release hoặc ảnh store. Ảnh kỹ thuật lưu local tại `.brand-work/android-after-scroll-fix.png`, không đưa vào ấn phẩm công khai.

### Người quản lý kiểm tra

### Điều chỉnh theo nghiệm thu 2026-09-14

**Cập nhật 16/09:** xem [review Android](UX_REVIEW_ANDROID_2026-09-14.md) để biết bằng chứng mới nhất. APK standalone đã build và cài cập nhật giữ dữ liệu; mở Home khi không có adb reverse/Metro. Oracle online trả lời đúng model pinned, không fallback; tự đưa lượt mới vào vùng nhìn. Tarot một/ba lá hiển thị mặt trước trung tâm, số lượng và bước Xem thông điệp; nút lên đầu đã kiểm tra đầy đủ trong màn hình và hoạt động. Help VI/EN và corpus được cập nhật theo hành vi kiểm chứng; Office/PDF/slide chưa xuất lại. Đây là bản thử nội bộ, không phải nghiệm thu toàn bộ RC hoặc phát hành store.

**Cập nhật 20/09:** APK QA mới đã được kiểm chứng trên Air1 Ultra sau khi khởi động không có Metro/reverse. Cache Today Pulse không còn hiển thị nội dung khác ngày; phản hồi AI đã hoàn tất không còn che Home/Explore; thẻ bộ bài Tarot giữ artwork, tên, mô tả và CTA trong cùng vùng nhìn; header Tarot dùng lockup Open Reflection chính thức. Phiên bản, checksum, bằng chứng và giới hạn còn lại ở [review Android](UX_REVIEW_ANDROID_2026-09-14.md). Không thay tính năng công khai thành đã phát hành.

Mở rộng chẩn đoán Oracle: trace Staging QA xác nhận `openrouter/free` chọn `nvidia/nemotron-3.5-content-safety:free`, trả nhãn phân loại thay vì lời trò chuyện. Kế hoạch sửa: phiên bản route mới cố định model hội thoại đã có trace thành công (`nex-agi/nex-n2.5-mini:free`), giữ cấu hình cũ archived để rollback; đồng bộ seed/default trong repo. Chỉ môi trường `Nilaza Staging QA`; không phát hành production. Không thay API, schema, consent, moderation, credits hoặc ghi nội dung riêng tư vào tài liệu. AI Studio tiếp tục thấy phiên bản route và usage metadata hiện có. Kiểm chứng bằng truy vấn cấu hình, provider tests và câu hỏi QA trên điện thoại; không coi đổi route là đã nghiệm thu chất lượng. Chat thay avatar N bằng symbol chính thức, bỏ intent/moderation kỹ thuật nhưng vẫn thông báo rõ khi dùng phản hồi dự phòng. Rollback route mới bằng cách archive và kích hoạt lại phiên bản trước trong cùng transaction.

Chủ sản phẩm xác nhận Home/các mục hiển thị, yêu cầu sửa Oracle fallback trên thiết bị, CTA/cuộn Tarot và phản hồi khi rút từng lá; thêm nghi thức trước Today Pulse. Phạm vi: cấu hình public runtime/Metro, HomeExperience, TarotFlow và bố cục dock. Giữ auth-first, profile, card selection, credit/backend contracts; không gọi AI thêm cho nghi thức. Người đã mở Today Pulse xem lại ngay; người mới phải chủ động mở lá trước khi đánh dấu đã xem. Lá Tarot đã rút hiện mặt trước tại trung tâm, có trạng thái hoàn tất và hành động tiếp tục rõ ràng. Kiểm chứng: TypeScript, Home interaction tests, runtime config tests, Android device và bản APK chứa bundle để thử không cần Metro. Không xóa local account khi chuyển sang backend đã cấu hình; tài khoản online có thể cần đăng nhập riêng. Bản độc lập chỉ là internal test ký debug, không phải bản phát hành store. Rollback theo các tệp thay đổi, giữ dữ liệu và các bản APK trước.

Native compatibility follow-up: kiểm tra template Expo đang cài và React Native 0.81.5 cho thấy `MainApplication` còn gọi `SoLoader.init(this, false)`. Đồng bộ riêng bootstrap sang `loadReactNative(this)` của SDK hiện hành để dùng merged native libraries; giữ package ID, lifecycle dispatcher, intent filters, auth/data và quyền. Kiểm tra bằng compile Android; không chạy prebuild hoặc ghi đè native project.

Kiểm tra tiếp theo xác nhận Reanimated 4.1 trong `apps/mobile/package.json` bắt buộc New Architecture, trong khi Gradle cũ đặt `newArchEnabled=false`; Expo chưa khai báo override. Đồng bộ Expo và Android thành `true` theo dependency hiện có. Đây là sửa lệch cấu hình native có sẵn, không phải yêu cầu của logo/motion (brand vẫn dùng React Native Animated). Cần kiểm chứng native toàn bộ auth, storage, tab navigation và animation trước RC; không đổi schema/profile/backend. Rollback phải dùng một binary/dependency set tương thích đã nghiệm thu, không chỉ đổi cờ về false khi vẫn giữ Reanimated 4.

1. Mở trang bàn giao local hoặc README; xem welcome/Home, tải VI/EN PDF/PPTX và thử bộ lọc social.
2. Trong app preview: tạo tài khoản thử → bỏ qua hoặc chọn mục tiêu → mở/đóng/xem lại phút phản chiếu → Trò chuyện/Mở Nhật ký → quay lại Home. Người đã hoàn tất không bị hỏi onboarding lại.
3. Kiểm tra website VI/EN, Help/search, sau đó thử Admin hai workspace và waitlist ở preview có cấu hình thực.
4. Nghiệm thu binary RC trên iOS/Android trước khi chụp ảnh store phone/tablet; thay ảnh preview trong hướng dẫn/slide bằng ảnh RC cùng phiên bản và sinh lại manifest.
5. Chỉ sau nghiệm thu mới mở PDF download trên web, phát hành website/ấn phẩm và upload store theo phê duyệt riêng. Chưa gửi email, đăng social hoặc mua quảng cáo.

Rollback: giữ master và lịch sử concept/slide cũ; khôi phục các thay đổi mã/asset có phạm vi, sinh lại exports và chạy validators. Icon/splash cần binary mới; web quay về deployment đã nghiệm thu. Không thay schema hoặc xóa dữ liệu người dùng.

### Domain tổ chức và Nilaza — 2026-10-04

Chủ sản phẩm chọn `magicpendigital.com` cho tổ chức và `https://nilaza.magicpendigital.com` cho Nilaza. Đã tích hợp vào Brand Guidelines/manifest, tài liệu VI/EN, slide r4, nguồn và ảnh social/OG, mục lục/ZIP và URL website local. Bộ hiện hành có 34 exports; đã render và xem 36 trang PDF, 18 social và hai OG, kiểm tra hyperlink/canonical/checksum và đối chiếu ZIP. Các kiểm tra brand, public-content, skills, web và launch đạt. Xem [bàn giao domain và bằng chứng](NILAZA_OFFICIAL_DOMAIN_2026-10-04.vi.md).

Lịch sử audit và ảnh browser/native giữ nguyên. Snapshot hướng dẫn làm mới từ Help đã duyệt; hình app vẫn là preview. Chưa cấu hình DNS/TLS, email, backend origin hoặc triển khai/phát hành; các cổng native RC và release tiếp tục theo runbook hiện hành.
