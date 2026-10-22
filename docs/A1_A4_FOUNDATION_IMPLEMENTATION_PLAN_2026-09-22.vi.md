# A1/A4 — Nền tảng Astrology và Visual Gate

## Yêu cầu tiếp tục: Mythology World + đánh giá A3

Chủ sản phẩm đã cho phép triển khai tiếp visual, thay điểm dừng A4 bằng kiểm chứng prototype. Không đồng nghĩa nghiệm thu production.

- Entry: Astrology hub → thư viện thần thoại → vòng 12 cung → chương biểu tượng, quay về giữ report.
- UI: artwork gốc, SVG tương tác, zoom/reset, chương VI/EN, font thương hiệu, Reduce Motion. Vòng khám phá không phải bản đồ sao cá nhân.
- Data: state giao diện; assets/features và manifest. Không birth data, analytics, permission hoặc persistence mới.
- A3: triển khai module thuần xác thực ngày/giờ, timezone/DST và test trước khi nối backend; không deploy/migration hoặc giả chứng nhận độ chính xác.
- Write scope: feature Astrology, assets/manifests, dependency/lockfile, module A3/tests và handoff. Giữ nguyên Admin, auth, credits, Council, marketing.
- QC: TypeScript/Jest, data/visual/brand validators, web/native export, browser viewport; ghi riêng device QA. A3 kiểm DST gap/overlap, leap day, biên ngày/offset, unknown time.
- Manager acceptance: mở thư viện không cần dữ liệu sinh, chọn 12 cung, đọc chương, đổi ngôn ngữ, zoom/reset và quay lại. Artwork không được trình bày như dữ liệu tính toán.
- Rollback: bỏ entry component; module A3 chưa nối production không đổi endpoint đang chạy. Database ledger vẫn chặn migration.

Ngày: 22/09/2026  
Trạng thái: **foundation hoàn tất; Visual Gate đang chặn visual production**  
Phạm vi đã thực hiện: foundation A1 có thể kiểm chứng và skeleton A4.1 fixture-driven. Tài liệu này không tuyên bố G-A3 hoặc G-A4 đã đóng.

## Mục tiêu và tiêu chí nghiệm thu

Nilaza cần một nền tảng Birth Chart không bịa dữ kiện, sẵn sàng nhận calculator đã được kiểm chứng sau này, đồng thời có một khung native cho A4 để dữ liệu, hình học, nội dung và màn hình có thể phát triển độc lập với artwork.

Một manager có thể nghiệm thu foundation khi:

1. Mobile phân biệt rõ chart facts đã tính, preview cục bộ và dữ liệu không đủ; không vẽ wheel cá nhân khi chưa có placement đã xác minh.
2. Một fixture không chứa dữ liệu người dùng đi qua contract → geometry → danh sách chi tiết với anchor ổn định, có kiểm tra xung đột label và lựa chọn bằng danh sách thay thế.
3. Unknown birth time hoặc location/timezone chưa xác nhận không bị trình bày như Rising, nhà hoặc chart chính xác.
4. Mọi dữ liệu visual/content mẫu có VI/EN, provenance và boundary rõ: artwork không thể thay thế chart facts.
5. Không thêm vendor trả phí, provider key, migration, DB write mới hoặc lời hứa marketing về độ chính xác/G-A4.

## Whole-App Impact Brief

| Mặt tác động | Quyết định cho slice này |
| --- | --- |
| Entry point | Giữ Explore → Astrology và Report hiện có. Khung A4 chỉ xuất hiện trong report dưới trạng thái facts rõ ràng; không thêm tab/deep link. |
| Data write | Không tạo migration hoặc DB write. Dùng birth profile/report hiện có ở chế độ đọc; fixture chỉ là dữ liệu tổng hợp trong repository. |
| Backend contract | Không đổi Edge Function trong slice này. Mobile có typed adapter/presentation boundary nhận legacy chart hiện có và canonical chart sau A3. Calculator, timezone resolver và fixture accuracy vẫn thuộc G-A3. |
| Canonical source | `docs/A1_ASTROLOGY_CHART_CONTRACT_2026-09-20.json` giữ vai trò source contract draft; fixture/schema visual mới tham chiếu `contractId`, `contractVersion`, `calculationStatus` và không sửa Council contract. |
| Admin | Không thêm workspace hay mở raw birth/chart data trong Admin. Asset/content publish workflow chỉ được mô hình hóa bằng manifest local. |
| Privacy/safety | Không log raw birth date, time, place, coordinates, placement payload hoặc câu hỏi vào event mới. Unknown time/location khiến renderer rơi về trạng thái giải thích, không giả chart. Nội dung vẫn là self-reflection/entertainment. |
| Analytics | Không phát thêm event runtime cho đến khi event dictionary A3 được tích hợp với consent/redaction. Geometry fixture không chứa ID người dùng. |
| Rollback/fallback | Bỏ component A4 là app quay về Big Three/text report hiện tại. Khi facts không hợp lệ, fallback là explanatory state/list, không phải hình chart tĩnh giả. |
| Surfaces không đụng | Council A2, Tarot, Journal persistence, Supabase schema/migrations, auth, credits, notifications, Admin và public marketing. |

## Impact map và đường sửa

| Khu vực | Thay đổi dự kiến | Giới hạn |
| --- | --- | --- |
| Mobile data boundary | Types/parser/chart status cho placement, angle, house, aspect và uncertainty | Không xác nhận calculator accuracy; không phát sinh report mới |
| A4 geometry | Hàm pure polar layout, hit target/list fallback, collision spacing và zoom-independent anchors | Chưa render SVG/canvas/gesture đa chạm |
| Mobile UI | Một `AstrologyChartFoundation` có loading/limited/error/fixture-ready state, accessibility labels và danh sách facts | Không xem nó là chart visual hoàn chỉnh |
| Content/assets | Manifest visual system + fixture chart + một chapter schema có VI/EN/provenance | Không tạo bộ 12 artwork hoặc publish content |
| Validation | Script kiểm JSON/provenance; Jest geometry/parser tests; TypeScript/mobile/data/visual validators | Không thay thế G-A3 fixture accuracy suite hay QA native G-A4 |

## Files dự kiến

- `apps/mobile/src/features/astrology/contracts.ts`
- `apps/mobile/src/features/astrology/chartPresentation.ts`
- `apps/mobile/src/features/astrology/chartGeometry.ts`
- `apps/mobile/src/features/astrology/AstrologyChartFoundation.tsx`
- `apps/mobile/src/features/astrology/__tests__/chartGeometry.test.ts`
- `apps/mobile/src/features/astrology/__tests__/chartPresentation.test.ts`
- `apps/mobile/src/backendClient.ts` và phần Astrology report được giới hạn trong `apps/mobile/App.tsx`
- `packages/content/data/astrology-visual-system.json`
- `packages/content/data/astrology-chart-fixtures.json`
- `scripts/validate-astrology-foundation.mjs`, `package.json`, và handoff sau khi kiểm tra

## Visual Gate — điểm dừng bắt buộc

Sau khi foundation chạy và được kiểm tra, **dừng trước A4.2–A4.7** nếu chưa có toàn bộ điều kiện sau:

1. A3.2/G-A3 có canonical chart facts và fixture accuracy/unknown-time/DST evidence.
2. Art direction/storyboard được duyệt cho ít nhất 3 tương tác: reveal, chọn planet/aspect, mở mythology chapter.
3. Asset layer gốc hoặc có license rõ ràng: 12 hero artworks, glyph/motif, texture/background; không dùng ảnh AI làm dữ liệu chart.
4. Renderer stack đã quyết định sau spike: Expo-compatible `react-native-svg`, gesture zoom/pan và native performance profile; chỉ thêm Skia/GL nếu requirement thực sự là particle/parallax GPU.
5. Có năng lực motion/visual direction chuyên sâu và review Android/iOS thực, gồm 60fps, font lớn và Reduce Motion.

Nếu thiếu các điều kiện này, không được dùng View/Ionicons/PNG chung để giả một trải nghiệm thần thoại “wow”. Handoff phải nêu rõ model/kỹ năng cần bổ sung thay vì hạ chuẩn bằng dashboard tĩnh.

## Validation và manager test path

Sau edits, chạy theo scope:

```powershell
npm run validate:astrology
npm --workspace apps/mobile run check
npm --workspace apps/mobile test -- --runInBand
npm run validate:data
npm run validate:visual-assets
npm run validate:brand
npm run validate:mobile-export
```

Kiểm thủ công sau khi build/test environment sẵn sàng: mở Explore → Astrology → report; quan sát loading/limited/facts trạng thái; mở fixture explorer nội bộ bằng input adapter; chọn một placement/aspect qua list; bật font lớn/Reduce Motion; tắt mạng và xác nhận fallback không gọi chart là calculated.

Không chạy `supabase db push` hoặc migration repair vì ledger vẫn `blocked_pending_reconciliation`.

## Chủ sở hữu, write scope và stop condition

- Owner: Product/Tech lead.
- Write scope: các file liệt kê ở trên và tài liệu handoff; không sửa config Council hoặc artifacts marketing đang uncommitted.
- Allowed data: fixture tổng hợp, configuration và local presentation state; không có raw chat/journal/birth data thật hay secrets.
- Stop condition: dừng trước visual production/interactive graphics khi Visual Gate chưa đủ; dừng endpoint/persistence work nếu phải thay schema hoặc cần timezone/license quyết định.
