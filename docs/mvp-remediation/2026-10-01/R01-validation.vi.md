# R01 — Kiểm chứng local ngày 01/10/2026

Đây là kết quả nguồn local sau các lát cắt R04–R09 và R13/R20. Không phải CI, signed native build, nghiệm thu thiết bị hoặc cloud acceptance. Hồ sơ: `mvp-R01-root-validation-2026-10-01.json` và `mvp-R01-local-bundles-2026-10-01.json`.

## Kết quả đã chạy

| Kiểm tra | Kết quả |
|---|---|
| Full mobile Jest | **44 suites, 269 tests PASS**, 35.619s; không skip, không kéo dài timeout |
| Mobile TypeScript | PASS |
| Journal draft/Composer/export targeted | 20/20 PASS; bao gồm lỗi disk/read/clear, account close và missed subscription ACK |
| Tarot prompt resolver/context | 9/9 Deno tests PASS sau sửa positional labels; Edge index Deno check PASS |
| Journal Edge handler | 10/10 Deno tests PASS; index Deno check PASS |
| Backend source validation | 14 paths/21 functions PASS |
| Supabase static validation | 72 pass,9 warning,0 fail; không chứng minh live policies |
| Admin tests | 78 PASS; protected Content/AI Studio read-only đã kiểm, không Publish/Test Run |
| Governance/Council/release config | PASS; 22 agents/6 lanes, canonical Council contract; version0.1.3/build4 |
| Brand/content/visual assets | PASS; 118 exports/84 sources;7 decks/78 cards;24 visuals/684 runtime files |
| Production Expo web export | PASS,1621 modules/660 assets; validator PASS74.17 MiB dưới repository cap120 MiB |
| Production Android embed | PASS,1986 modules/660 assets; tạo JS+map+assets, không APK/AAB |

Astrology tests đã chạy trong full suite, gồm ChartStory và Experience; không tăng timeout để che kết quả. Node local25.9 không phải CI Node20. Website check/build trước đó đạt0warnings/43pages, nhưng trước dependency install R09; chưa ràng buộc nó với RC cuối.

## Artifact baseline trước tối ưu font R19

| Artifact | Raw bytes | Gzip bytes* | SHA256 raw |
|---|---:|---:|---|
| Web JS `index-64e9945cff4325e40240b71cfbe1a7d0.js` | 9,238,430 | 2,324,729 | `dfaa6ff677c93113785d1645ce4bfc24b83a37ae2054110c3bff2cfc0fc717c5` |
| Android `index.android.bundle` | 10,073,779 | 2,483,386 | `68d0ae0c6a06280b173db10aeec3dc5a2e66c1081e4bef1be8b492531e9840be` |

Web directory:664 files/77,772,604 bytes. Android directory:663 files/99,251,568 bytes **gồm sourcemap**, không coi là download size của app. Gzip dùng Node zlib để so sánh local; không phải actual network transfer. Web validator so với400.5MiB lịch sử, không quy toàn bộ giảm81.5% cho phiên sửa này.

Commands đã chạy từ apps/mobile: `expo export --platform web --output-dir ../../output/mvp-20261001/web` và `expo export:embed --entry-file index.js --platform android --dev false --bundle-output ../../output/mvp-20261001/android/index.android.bundle --sourcemap-output ../../output/mvp-20261001/android/index.android.bundle.map --assets-dest ../../output/mvp-20261001/android/assets`, NODE_ENV production. Output ở `output/mvp-20261001`. Local export cần sandbox escalation cho filesystem; không có auto-review rejection. V8 cache deserialize warning đã tự full crawl; exit0 và artifact mới là chứng cứ build đạt.

## Giới hạn còn mở

- Migration ledger vẫn blocked. MCY schema được xác minh ở QA cũ; owner chọn chuẩn bị QA sạch, giữ QA cũ làm bằng chứng. Không db push/repair/create/retarget/deploy.
- Browser đã xác nhận Tarot first-fold/Why/repeat và manual note ở lượt trước. Sau install, Metro cũ chết; tab cache không chứng minh draft source mới. Metro mới đã khởi động qua feature:run, nhưng CDP tab mới đang timeout; durable draft browser/native acceptance còn mở.
- Chưa có signed Android/iOS RC, native font200%, TalkBack/VoiceOver, share-recipient proof, cloud A/B/RLS hoặc hai-client tombstone/CAS test.
- Chưa có cost/atomic quota gate, real provider VI/EN acceptance,84-run blind AI eval,8–12 real-user UAT, paid entitlement/store release.

R01 local test/build gate đã xanh; R01 CI/native và G1 MVP chưa đạt. Sau sửa source tiếp theo phải ràng buộc artifact mới; các hash trên giữ làm baseline trướcR19, không gọi là RC cuối.

## Sau import-only R19

TypeScript và2font-readiness tests PASS. Fresh web/Android exports PASS,639assets/8TTF, byte-identical8font với baseline. Web73,206,942bytes/69.82MiB, JS9,227,668bytes/gzip2,322,310/hash`d8df816a67a6ea33e278ccde99aabc702ff4d7baae2947138a18e5a0af4d36bf`. Android directory94,665,080bytes gồmmap, JS10,060,865bytes/gzip2,481,500/hash`dfa773529901e0dabd3371b91e262aee6842591e7bc46dd902cdc9691f5df993`. [R19 handoff](R19-fonts-handoff.vi.md) có before/after; không đo startup/native hoặc suy download size từmap.
