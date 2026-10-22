# QA vòng phát hành Tarot — 29/09/2026

## 1. Phạm vi và ranh giới artefact

Vòng này kiểm tra riêng các đường dẫn có rủi ro cao trước khi quyết định đóng gói bản release:

- thư viện đủ 78 lá và màn hình chi tiết lá bài;
- chuyển sang EN và kiểm tra copy của Tarot;
- lỗi mạng, offline và fallback cục bộ;
- timeout backend cho request sinh diễn giải Tarot;
- kiểm tra trực tiếp trên điện thoại Android đang kết nối.

Không có deploy, upload store, database push/repair, thay đổi migration hay ghi dữ liệu production.

Artefact cài trên máy là **internal QA APK debug-signed**, không phải release artifact:

- Package: `app.nilaza.mobile`
- Version: `0.1.3` / Android versionCode `4`
- Thiết bị: `Q88549EEXCUOONGA` — Air1_Ultra, Android UI bounds 1080×2280
- APK: `tarot-release-qa-20260929/tarot-release-qa-v7.apk`
- SHA-256: `DF4C0E889C270202F705E7FAC77C9FAC4A45A04D375C7CAC51ABE83172C23A19`

## 2. Ma trận kiểm thử trên điện thoại

| Kịch bản | Thao tác | Kết quả | Bằng chứng |
|---|---|---|---|
| VI — thư viện 78 lá | Explore → Học Tarot → thư viện → quét toàn bộ danh sách | **PASS** — 78/78 tên duy nhất, không thiếu, artwork hiển thị; nút có accessibility label | `qa-device-v7-library.png`, `qa-device-v7-scan.xml` |
| VI — chi tiết lá | Mở Page of Pentacles, cuộn đến ý nghĩa xuôi/ngược | **PASS** — tên deck, artwork, intro, tag, ý nghĩa xuôi/ngược hiển thị; không blank | `qa-device-card-meaning.png`, `qa-device-card-meaning-bottom.png` |
| EN — locale | Profile → Identity & language → English → Tarot Learning Library | **PASS** — title, level, `78 Cards`, card labels và CTA đều bằng EN; không thấy nhãn VI trong scan | `qa-device-profile-en.xml`, `qa-device-en-learning.png`, `qa-device-en-scan.xml` |
| EN — thư viện | Quét danh sách bằng canonical English names | **PASS** — 78/78 tên duy nhất, không thiếu | `qa-device-en-library-final.png`, `qa-device-en-scan.xml` |
| Offline — fallback | Tắt Wi‑Fi và mobile data, tạo trải bài 1 lá synthetic, mở message | **PASS** — kết quả local xuất hiện khoảng 3,7 giây; có artwork, orientation và reflection; không spinner vô hạn, không duplicate action | `qa-device-offline-reading.png`, `qa-device-offline-poll.xml` |
| Error — request lỗi | Mock rejection của backend trong test client | **PASS** — trả fallback cục bộ, giữ moderation status fallback | `apps/mobile/src/__tests__/backendClient.test.ts` |
| Timeout backend | Fake timer cho request treo, chạy đến budget Tarot 75.000 ms | **PASS** — AbortController abort đúng budget và `generateTarotReading` trả fallback | `apps/mobile/src/__tests__/backendClient.test.ts` |

Thiết bị đã được bật lại Wi‑Fi và mobile data sau kiểm thử offline.

## 3. Sửa lỗi phát hiện trong vòng này

### P1 đã sửa — Explore bỏ mất stage `learn`

Callback của Explore trước đó gọi `startTarot("topic")` cho mọi nút Tarot. Vì vậy CTA “Học Tarot” mở topic flow thay vì thư viện học. Đã đổi callback thành:

```tsx
onTarot={(stage) => startTarot(stage ?? "topic")}
```

Đã rebuild bundle, cài lại APK QA v7 và retest trực tiếp: CTA mở đúng learning library, sau đó quét đủ 78 lá.

## 4. Kiểm thử tĩnh và tự động

Các gate đã chạy:

- `feature:preflight`: **PASS**
- TypeScript mobile check: **PASS**
- Jest mobile: **38 suites, 222 tests PASS** ở lần chạy tổng hợp cuối
- Tarot backend client timeout test: **PASS**
- `validate:data`: **PASS** — 7 decks, 78 cards, 22 Major, 56 Minor
- `validate:visual-assets`: **PASS** — runtime assets hợp lệ
- `validate:governance`: **PASS**
- `mobile:release:config:check`: **PASS** — version 0.1.3 / code 4
- `adb devices`: **PASS** — thiết bị QA online

Một lần chạy Jest đầu tiên có 1 test session bootstrap timeout khi chạy cùng toàn bộ suite; chạy riêng test đó đạt 6/6 và lần chạy toàn bộ tiếp theo đạt 222/222. Không tái hiện được lỗi.

`supabase:migration-ledger:check` trả về trạng thái **blocked pending reconciliation**. Vì vậy không chạy database push/repair và không coi đây là lỗi của Tarot client.

## 5. Findings còn lại trước release

| Mức | Finding | Ảnh hưởng | Khuyến nghị | Retest |
|---|---|---|---|---|
| P1 đã đóng | Explore “Học Tarot” mở sai stage | Người dùng không vào được learning library từ CTA chính | Đã sửa và retest 78/78 | PASS |
| P0 release gate | Native Gradle release rebuild không hoàn tất trong môi trường này; lỗi access denied tại Gradle/Kotlin daemon temp/cache | Không có native release APK mới để xác nhận signing và resource packaging | Chạy native release build trong CI/máy build có quyền ghi cache, sau đó lặp lại smoke test trên artefact đã ký | Chưa thể đóng trong workspace này |
| P1 packaging | APK thử nghiệm JS-only v6 dùng native base không khớp nên artwork bị blank. v7 đã dùng native base có resource Tarot tương ứng và artwork hiển thị đúng | Cho thấy packaging native phải được kiểm tra độc lập với bundle | Không dùng v6 làm bằng chứng sản phẩm; bắt buộc kiểm tra resource trong artefact release thật | v7 PASS; release artifact cần retest |
| P2 UX | Khi backend chậm, UI hiện “Opening your spread…” đến khi budget 75 giây; chưa có progressive hint hoặc nút retry riêng | Người dùng có thể nghĩ app bị treo trước khi fallback | Thêm mốc slow-state sau khoảng 8–12 giây và copy retry/fallback trước release nếu backend latency thực tế cao | Unit timeout PASS; device 75 giây thật chưa chạy |
| P3 tùy chọn | Offline fallback thành công nhưng chưa có nhãn “local/offline” | Người dùng không biết kết quả đến từ fallback | Cân nhắc thêm nhãn minh bạch trong một sprint UX sau | Không chặn QA logic |

## 6. Khuyến nghị đóng gói

**Chưa đóng gói release từ workspace này.** Logic Tarot, coverage 78 lá, EN, offline/error fallback và timeout contract đều đạt trong vòng QA; tuy nhiên APK đã cài chỉ là debug-signed internal QA APK và native release rebuild đang bị chặn bởi quyền ghi Gradle/Kotlin cache. Cần tạo artefact native release đã ký trong CI hoặc máy build hợp lệ, rồi chạy lại smoke test tối thiểu: mở Explore → Học Tarot, kiểm tra artwork, đổi EN, tắt mạng và mở một reading.

## 7. Đường dẫn test cho manager

1. Trên điện thoại mở **Explore → Học Tarot → Xem thư viện lá**; xác nhận danh sách có 78 tên khác nhau và mở một lá để xem artwork, xuôi/ngược.
2. Vào **Profile → Identity & language → English**; quay lại Tarot và xác nhận title, CTA, card names đều bằng EN.
3. Tắt Wi‑Fi và mobile data; chạy trải bài 1 lá synthetic; xác nhận kết quả xuất hiện, không có spinner vô hạn và không lưu/trừ lặp.
4. Xem test timeout trong `backendClient.test.ts` và phần release gate ở biên bản này.

## 8. Rollback và bảo mật

Patch thuộc vòng này giới hạn ở callback stage trong `apps/mobile/App.tsx`, test timeout trong `apps/mobile/src/__tests__/backendClient.test.ts` và báo cáo QA. Có thể revert các thay đổi đó mà không cần migration hoặc remote rollback. Evidence chỉ chứa route, locale, tên lá, timing và trạng thái; không ghi auth token, identifier tài khoản hay payload riêng tư.
