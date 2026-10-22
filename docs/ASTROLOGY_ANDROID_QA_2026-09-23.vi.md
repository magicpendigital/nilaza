# Astrology Android QA — bản cài nội bộ ngày 23/09/2026

## Kết luận nghiệm thu

Bản APK mới đã được đóng gói, cài đè lên điện thoại Android đang kết nối và kiểm thử từ luồng thật của ứng dụng. Dữ liệu ứng dụng hiện có được giữ nguyên trong quá trình cài. Luồng **Explore → Astrology → Thế giới thần thoại / Bản đồ sao cá nhân → Chart Story → Người dẫn đường → Dữ liệu** hoạt động ổn định trên thiết bị thử; bản đồ đã lưu còn nguyên sau nhiều lần force-stop và cài đè.

Trong quá trình kiểm thử đã phát hiện ba lỗi UX thật trên thiết bị. Cả ba đã được sửa, đóng gói lại và chạy lại trên bản APK cuối. Không ghi nhận crash, lỗi JavaScript nghiêm trọng hoặc lỗi tính chart trong hành trình cuối.

Trạng thái của candidate này là **sẵn sàng để chủ sản phẩm review A3/A4 local trên Android**. Đây chưa phải bản phát hành công khai: APK đang ký bằng Android Debug certificate; Người dẫn đường AI vẫn là preview minh bạch, chưa gọi model, chưa kiểm tra entitlement, chưa trừ credit và chưa mở thanh toán.

## Dấu vết bản build

| Thuộc tính | Giá trị |
|---|---|
| Thiết bị thử | Air1 Ultra |
| Hệ điều hành | Android 13, API 33, arm64 |
| Package | `app.nilaza.mobile` |
| Phiên bản ứng dụng | `0.1.1` |
| Android version code | `2` |
| APK | [`app-release.apk`](../apps/mobile/android/app/build/outputs/apk/release/app-release.apk) |
| Kích thước | 102.284.303 byte |
| SHA-256 | `F281199CC926290E7707FC831B29789132632D21403DF5F9C43D8E48B45BDA2E` |
| Manifest | [`app-release.manifest.json`](../apps/mobile/android/app/build/outputs/apk/release/app-release.manifest.json) |
| Source revision ghi trong manifest | `f5c7950817674e0bfdcae3040661c909a47db1e7` |
| Trạng thái source khi build | Có thay đổi chưa commit (`has_uncommitted_changes`) |
| Chữ ký | APK Signature Scheme v2 hợp lệ; Android Debug certificate, chỉ dùng nội bộ |
| Cách cài | `adb install -r`; thành công, không uninstall hoặc xóa app data |

Manifest được sinh sau lần build cuối và checksum được đối chiếu lại trực tiếp từ APK. `sha256sum` trên chính `base.apk` đang cài trong thiết bị trả về cùng hash `f281...a2e`, xác nhận điện thoại đang chạy đúng artifact nêu trên. Thư mục bằng chứng gồm ảnh chụp và accessibility hierarchy tại [`.brand-work/astrology-android-qa-2026-09-23`](../.brand-work/astrology-android-qa-2026-09-23).

## Phạm vi và dữ liệu kiểm thử

Hành trình chính sử dụng hồ sơ QA sau:

- Ngày sinh: `2000-01-01`.
- Giờ sinh: `12:00`, trạng thái biết giờ chính xác.
- Nơi sinh: `Hanoi · VN · Hanoi`.
- Múi giờ sinh: `Asia/Bangkok`.
- UTC đã xác nhận: `2000-01-01T05:00:00Z`.

Kết quả trên thiết bị:

- Mặt Trời: Ma Kết `10,07°`.
- Mặt Trăng: Bọ Cạp `9,81°`.
- Cung Mọc: Bạch Dương `14,33°`.

Các giá trị này khớp với kết quả nền tảng đã kiểm chứng trước đó cho cùng đầu vào. App tính vị trí bằng core deterministic local; AI không được dùng để tạo hoặc sửa dữ kiện của chart.

## Ma trận hành trình đã kiểm thử

| Hành trình / điều kiện | Thao tác và tiêu chí | Kết quả cuối |
|---|---|---|
| Cài đặt và khởi động | Cài đè APK, mở từ launcher, cold start nhiều lần | Đạt; app mở vào Home, dữ liệu cũ được giữ. Cold start quan sát khoảng 1,3–2,0 giây trên máy thử; đây là số quan sát, chưa phải benchmark phòng lab |
| Điểm vào ứng dụng | Home → Explore → cuộn tới Astrology → mở tính năng | Đạt; điều hướng, header và bottom navigation hoạt động |
| Cổng vào | Xem toàn bộ tranh và các lựa chọn vào thư viện / bản đồ cá nhân | Đạt; tranh hiển thị toàn cảnh, CTA không gây nhầm lẫn trong lần test cuối |
| Thế giới thần thoại | Mở vòng 12 cung, chạm trực tiếp Ma Kết trên vòng | Đạt; selection và nội dung chương đổi theo cung được chạm |
| Tạo chart exact | Nhập ngày, giờ, tìm Hanoi offline, chọn kết quả, xác nhận múi giờ và UTC, tính chart | Đạt; UTC và ba vị trí chính đúng với baseline |
| Chart Story | Mở chart, đọc chương Mặt Trời, chạm Bọ Cạp/Moon và quan sát chart cùng nội dung | Đạt; highlight và câu chuyện dùng cùng selection, không phải cuộn để tìm nội dung liên quan |
| Bottom sheet | Chuyển `peek / focus / full` bằng handle, vuốt lên/xuống và phím Back vật lý | Đạt sau sửa; handle luôn nhìn thấy trong full, vuốt hai chiều hoạt động, Back đi `full → focus → peek` |
| Người dẫn đường AI | Mở tab, nhập câu hỏi, xem preview và thông tin Premium/privacy | Đạt trong phạm vi preview; không có request AI, checkout hoặc trừ credit; không có Oracle FAB che input/CTA |
| Dữ liệu chart | Mở tab Dữ liệu, chọn Moon và cuộn xem thông số | Đạt; nội dung đổi theo lựa chọn và vẫn gắn với chart đang mở |
| Lưu và khôi phục | Lưu chart, force-stop, mở lại app, mở lại chart đã lưu; lặp sau các lần cài đè | Đạt; ngày/giờ/UTC và kết quả chart còn nguyên |
| Mất mạng | Tắt Wi-Fi, cold start, mở chart đã lưu; kiểm Home, Chat và Journal | Đạt; chart local mở được, app không crash. Chat và Journal hiện cảnh báo đồng bộ đúng ngữ cảnh |
| Khôi phục mạng | Bật lại Wi-Fi, kết nối mạng và bấm Thử lại trong Chat | Đạt; cảnh báo đồng bộ biến mất sau khi retry thành công |
| Phân tách lỗi đồng bộ | Khi Chat/Journal lỗi, mở Home và Astrology | Đạt sau sửa; cảnh báo không còn chiếm chỗ trên Home hoặc Chart Story |
| Cỡ chữ hệ thống lớn | Font scale `1.3`, cold start và đi Home → Explore → Astrology → chart đã lưu → full sheet → Câu chuyện → Người dẫn đường → Dữ liệu | Đạt; CTA, tab, input và nội dung vẫn truy cập/cuộn được, không có điều khiển bị mất. Một số nhãn dài được rút gọn trực quan nhưng accessibility label vẫn đầy đủ. Đã khôi phục font scale gốc `0.92` sau kiểm thử |
| Log runtime | Lọc logcat trong các vòng cold start, tạo/mở chart, sheet, AI preview và offline | Không thấy fatal, React JS `TypeError`, `ReferenceError` hoặc unhandled error trong lượt cuối |

Ảnh tiêu biểu của bản cuối gồm `61-final2-sheet-full.png`, `62-final2-swipe-down-focus.png`, `63-final2-swipe-up-full.xml`, `65-final2-ai-preview.png`, `68-offline-chat.png`, `69-offline-journal.xml`, `72-offline-chart-open.png` và `74-online-chat-after-retry.xml` trong thư mục bằng chứng.

## Ba lỗi đã phát hiện và sửa

### 1. Oracle FAB che bề mặt Người dẫn đường AI

**Quan sát trên máy:** nút Oracle toàn cục nằm trên vùng nhập câu hỏi, nút gửi và CTA Premium của Astrology, làm giảm khả năng thao tác và gây nhầm vai trò giữa hai trợ lý.

**Sửa:** bề mặt tạo nội dung chuyên biệt được ưu tiên; Oracle FAB không render khi màn hình hiện tại đã có generation surface riêng. Oracle vẫn xuất hiện ở Home và Explore.

**Retest:** mở Người dẫn đường, focus ô câu hỏi và xem preview. Input, send và CTA không còn bị che; Home/Explore vẫn có Oracle.

### 2. Cảnh báo lỗi đồng bộ Chat xuất hiện trên mọi màn hình

**Quan sát trên máy:** khi backend đồng bộ Chat không sẵn sàng, banner toàn cục nén không gian của Chart Story và khiến người dùng tưởng Astrology bị lỗi.

**Sửa:** trạng thái lỗi Chat và Journal được lưu độc lập; banner chỉ hiện trong đúng khu vực liên quan. Lỗi quyền Admin được chuyển sang toast riêng thay vì bị gắn nhãn lỗi Chat. Lỗi storage cục bộ vẫn được phép hiện toàn cục vì ảnh hưởng toàn app.

**Retest:** tắt mạng và đi qua Home, Chat, Journal, Explore và Astrology. Chỉ Chat/Journal có thông báo tương ứng; chart local mở bình thường. Bật mạng và Retry xóa được thông báo Chat.

### 3. Handle của bottom sheet bị cắt ở trạng thái full

**Quan sát trên máy:** chiều cao full dùng chiều cao cửa sổ thay vì chiều cao surface thực. Handle đi vào vùng hệ thống phía trên, khó nhìn và khó vuốt để thu gọn.

**Sửa:** đo chiều cao surface thật bằng layout và giới hạn `sheetHeights.full` theo vùng đó; vẫn giữ focus height làm ngưỡng an toàn.

**Retest:** handle full hiển thị trong vùng app; vuốt nhanh xuống chuyển sang focus, vuốt lên trở lại full, Back vật lý thu gọn theo từng mức. Tab AI ở full cũng giữ handle và không bị overlay.

## Kiểm tra tự động và kỹ thuật

| Kiểm tra | Kết quả |
|---|---|
| Mobile quality check / TypeScript | Đạt sau toàn bộ thay đổi |
| Toàn bộ Jest mobile | 35/35 suites, 207/207 tests đạt |
| Targeted `AstrologyChartStory` sau sửa chiều cao sheet | 9/9 tests đạt |
| Astrology foundation + mythology | Đạt theo vòng A3/A4 hiện tại |
| Astrology AI contract | Schema/fixtures và contract tests đạt; runtime AI chưa bật |
| Android release build | Gradle release build thành công, 958 tasks; chỉ có warning |
| APK signing | `apksigner` xác nhận v2 hợp lệ |
| Release manifest | Sinh thành công và checksum khớp APK cuối |
| Cài trên thiết bị | `adb install -r` trả về `Success` |

Sau thay đổi layout cuối chỉ cần chạy lại targeted test và TypeScript vì logic tính chart, persistence và contract không đổi; toàn bộ 207 tests đã đạt ngay trước thay đổi layout đó.

## Đánh giá trung thực từ góc nhìn người dùng

- **Điểm mạnh hiện tại:** cổng vào, vòng thần thoại và Chart Story đã tạo được một hành trình có chủ đích hơn; chart và phần giải thích phản ứng cùng một selection. Trên thiết bị thật, trải nghiệm không còn giống một báo cáo chữ đặt cạnh một biểu đồ kỹ thuật.
- **Khả năng hiểu:** người mới có thể bắt đầu từ câu chuyện Mặt Trời, chạm một vị trí khác và thấy ngay mối liên hệ với mình. Tab Dữ liệu vẫn phục vụ người muốn kiểm tra thông số.
- **Giá trị AI:** cách đặt Người dẫn đường vào ngay chart cho thấy rõ mô hình giá trị trả phí dự kiến. Candidate này mới kiểm chứng UX và ranh giới privacy/entitlement bằng preview, chưa chứng minh chất lượng câu trả lời AI hoặc willingness-to-pay.
- **Độ tin cậy:** dữ kiện chart được tính local, có bước xác nhận timezone/UTC và không bị AI bịa. Một thiết bị Android và một hồ sơ exact chưa đủ thay thế ma trận thiết bị, input hiếm, DST và accessibility trước public release.
- **Mức “wow”:** visual và chuyển động sheet đủ tốt để owner đánh giá trực tiếp. Chưa có dữ liệu người dùng thật để kết luận đạt “wow”, chuyển đổi hoặc retention.

## Giới hạn và blocker trước phát hành công khai

1. APK dùng Android Debug certificate. Cần EAS/keystore production, provenance sạch và store-ready artifact trước khi phân phối công khai.
2. Source state khi build có thay đổi chưa commit. Candidate dùng để review nội bộ; không phải release có thể tái tạo hoàn toàn từ một commit sạch.
3. Người dẫn đường AI chưa có runtime endpoint/provider, entitlement enforcement, credit ledger, paywall hoặc payment. Không được quảng bá là tính năng AI trả phí đã hoạt động.
4. Chart hiện lưu cục bộ. Chưa có cloud report sync hoặc kiểm chứng đổi thiết bị; xóa app có thể làm mất dữ liệu chưa xuất.
5. Supabase migration ledger vẫn chặn `db push`/repair cho tới khi có forward path được review và database-owner phê duyệt.
6. Chưa kiểm thử TalkBack thủ công, switch access, landscape/tablet hoặc ma trận nhiều Android OEM. Hành trình font scale `1.3` và accessibility labels/hierarchy đã đạt trên máy thử, nhưng không thay thế assistive-technology acceptance.
7. Chưa kiểm thử iOS cho candidate này, chưa review Play Store disclosures/subscription rules, và chưa phát hành store.
8. Chưa có test người dùng thật, đo conversion, retention, willingness-to-pay hoặc chất lượng câu trả lời AI live.

Các giới hạn trên không chặn việc owner review A3/A4 local trên điện thoại hiện tại. Chúng chặn tuyên bố production-ready và public release.

## Checklist để chủ sản phẩm review trên điện thoại

1. Mở Nilaza từ launcher, chọn **Explore → Astrology**.
2. Kiểm tra cổng vào: toàn bộ tranh có nhìn rõ, hai hướng vào có dễ hiểu và đúng thứ tự ưu tiên hay không.
3. Mở **Thế giới thần thoại**, chạm trực tiếp Ma Kết và ít nhất hai cung khác trên vòng; đánh giá độ rõ của selection, tranh và chiều sâu câu chuyện.
4. Quay lại Astrology, mở chart Hanoi đã lưu. Nếu muốn tạo lại, dùng `2000-01-01`, `12:00`, `Hanoi · VN · Hanoi` và xác nhận UTC `05:00Z`.
5. Trong **Câu chuyện**, chạm Mặt Trời, Mặt Trăng/Bọ Cạp và một nhà hoặc góc hợp; kiểm tra chart highlight và nội dung có luôn nói đúng selection hay không.
6. Vuốt sheet từ peek lên focus/full rồi vuốt xuống; bấm handle và Back vật lý. Xác nhận không có phần điều khiển bị vùng hệ thống che.
7. Mở **Người dẫn đường**, nhập một câu hỏi liên quan chart và xem preview. Đánh giá cách giải thích giá trị Premium; không kỳ vọng câu trả lời AI live, credit hoặc checkout trong build này.
8. Mở **Dữ liệu**, chọn một thiên thể khác và đối chiếu thông số với phần Câu chuyện.
9. Thoát app, mở lại và mở chart đã lưu để xác nhận dữ liệu còn nguyên.
10. Ghi phản hồi theo năm nhóm: ấn tượng cổng vào; dễ hiểu với người mới; chiều sâu câu chuyện; độ mượt của chart/sheet; mức sẵn sàng trả phí cho Người dẫn đường AI nếu chất lượng live đạt yêu cầu.

Không cần xóa dữ liệu hoặc cài lại app để thực hiện checklist này.

## QC handoff

```text
Task: Đóng gói APK, cài Android, kiểm thử A3/A4 và sửa lỗi tìm thấy.
Plan followed: A3/A4 handoff + Nilaza Plan & QC Protocol.
Changed: Oracle overlay guard; contextual Chat/Journal sync notices; measured full-sheet height; APK, manifest và báo cáo QA.
Manager test path: Launcher → Explore → Astrology → Mythology / saved chart → Story → AI preview → Data → relaunch.
Checks run: Mobile check; 35 suites/207 tests; targeted 9 tests; release build/signature/manifest; device online/offline/persistence/back/sheet/logcat.
Known risks: Debug signing; dirty source provenance; AI/payment/cloud sync chưa live; accessibility và device matrix chưa hoàn chỉnh.
Recommended next task: Owner review candidate trên thiết bị, chốt UX/content; sau đó triển khai runtime AI + entitlement/payment trong một vertical slice riêng và nghiệm thu lại trước release.
```
