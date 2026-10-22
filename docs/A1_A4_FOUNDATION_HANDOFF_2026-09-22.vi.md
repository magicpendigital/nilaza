> Cập nhật cùng ngày: yêu cầu tiếp tục của chủ sản phẩm đã mở bước triển khai prototype thần thoại. Trạng thái mới và các giới hạn A3 nằm tại [handoff Mythology + A3](MYTHOLOGY_A3_HANDOFF_2026-09-22.vi.md). Điểm dừng visual trong tài liệu cũ dưới đây chỉ mô tả slice trước.

# Bàn giao A1/A4 — Nền tảng Astrology và điểm dừng Visual Gate

Ngày: 22/09/2026  
Trạng thái: **A1 foundation hoàn tất; A4.1 foundation hoàn tất; A4 visual production đang dừng có chủ đích**

## Task

Hoàn thiện foundation A1 và bắt đầu A4 theo yêu cầu: dựng bộ khung trước; chỉ đi tiếp vào đồ họa/tương tác khi có thể cam kết trải nghiệm thần thoại đủ khác biệt cho người dùng Nilaza.

## Plan followed

Theo [kế hoạch A1/A4](A1_A4_FOUNDATION_IMPLEMENTATION_PLAN_2026-09-22.vi.md): giữ A3/G-A3 là prerequisite cho chart facts cá nhân; không mua vendor, không thêm provider key, không đổi migration/database và không dùng artwork để giả dữ liệu chart.

## Changed

- Thêm boundary typed cho chart ở `apps/mobile/src/features/astrology/contracts.ts`. Nó chỉ đánh dấu chart `ready` khi nhận canonical contract tái lập được; legacy backend và local preview vẫn có thể hiển thị facts nhận được nhưng không mở personal wheel.
- Thêm geometry độc lập với renderer trong `chartGeometry.ts`: anchor theo longitude, radius/zoom, label collision layers, aspect segments và hit target ổn định. Các test chứng minh anchor không thay semantic angle khi zoom và label không thay vị trí fact.
- Thêm `AstrologyChartFoundation.tsx` vào report. Người dùng có thể đọc và chọn facts theo list; Moon/Rising legacy được giữ “Chờ xác minh”, thay vì được trình bày là placement chính xác.
- Thêm fixture tổng hợp, không có dữ liệu sinh/định danh người dùng, 12-sign registry, một chapter Bạch Dương internal prototype, source/provenance và Visual Gate tại:
  - `packages/content/data/astrology-chart-fixtures.json`
  - `packages/content/data/astrology-visual-system.json`
- Thêm `npm run validate:astrology` để chặn fixture không hợp lệ, user linkage, artwork-as-fact, chapter/source thiếu provenance hoặc mở Visual Gate sớm.

## Manager test path

1. Mở **Explore → Astrology** và tạo một preview bằng ngày sinh.
2. Ở Report, xem block **Chart facts**. Local/legacy result phải nói rõ đang chờ facts được xác minh; nếu có facts nhận được, chạm một row để xem đúng placement.
3. Moon/Rising không được hiển thị như fact chính xác trước canonical chart verified; khi thiếu giờ sinh vẫn hiện giới hạn tương ứng.
4. Xem `packages/content/data/astrology-visual-system.json`: chỉ chapter Bạch Dương là prototype nội bộ; 11 chapter còn lại và mọi artwork đều chưa sản xuất.
5. Chạy `npm run validate:astrology` để xác nhận Visual Gate vẫn blocked.

## Checks run

| Check | Kết quả |
| --- | --- |
| `npm --workspace apps/mobile run check` | Pass |
| `npm --workspace apps/mobile test -- --runInBand` | Pass, 27 suites / 174 tests |
| Astrology geometry/presentation/backend target tests | Pass sau các điều chỉnh parser/UI |
| `npm run validate:astrology` | Pass |
| `npm run validate:data` | Pass |
| `npm run validate:visual-assets` | Pass |
| `npm run validate:brand` | Pass |
| Metro web export + `validate:mobile-export` | Pass, 55.46 MB |
| Android embedded bundle | Pass, 3,563,921 bytes / 566 assets |
| `npm run supabase:migration-ledger:check` | Ledger vẫn `blocked_pending_reconciliation`; không thực hiện DB push/repair |
| `git diff --check` | Pass |

## Known risks and deliberate limits

- `astronomy-engine` đang là MIT baseline vendor-free nhưng runtime hiện vẫn chưa đạt G-A3: thiếu historical place/timezone/DST resolver, 50+ independent accuracy fixtures, canonical endpoint contract, MC/house verification và lifecycle delete/export đầy đủ.
- A4 hiện **không có SVG/canvas renderer, pinch zoom/pan, original mythic artwork, animation production, native visual profile hay device accessibility evidence**. Đây là điểm dừng có chủ đích, không phải visual bản cuối.
- Không đưa fixture vào report/analytics/LLM/production seed. Không có chart cá nhân nào được vẽ từ fixture.
- Không tạo build Android mới hoặc cài lại điện thoại vì task này không tạo release candidate; embedded bundle chỉ là build evidence.

## Visual Gate: năng lực cần bổ sung trước khi tiếp tục

Không nên triển khai tiếp bằng `View`, icon chung hoặc một PNG nền; cách đó sẽ tạo dashboard tĩnh, không đạt cảm giác bước vào thế giới thần thoại mà Nilaza cần.

Phần tiếp theo cần:

1. **A3/G-A3 trước:** calculator contract đã xác minh, resolver timezone lịch sử/DST/place, fixtures độc lập và policy cho unknown time.
2. **Renderer 2D native:** `react-native-svg` tương thích Expo, `react-native-gesture-handler` cho zoom/pan/hit map; benchmark trước khi chốt. Chỉ thêm `@shopify/react-native-skia`/GPU work nếu particles, masking, parallax và glow là requirement đã chốt.
3. **Art direction + motion:** storyboard rõ cho chart reveal, chọn planet/aspect, mở mythology chapter; bộ 12 hero artworks, glyph/motif và texture/background gốc hoặc licensed, có provenance/alt text.
4. **Năng lực chuyên môn:** một model cấp cao hoặc người có kinh nghiệm rõ về React Native graphics, gesture/accessibility, art direction và motion design; sau đó cần review thực Android/iOS ở 60fps, thiết bị yếu, font lớn và Reduce Motion.

## Recommended next task

Dừng ở đây theo Visual Gate. Khi có model/năng lực visual cao hơn và direction/artwork đầu vào, tiếp tục theo thứ tự **A3 deterministic chart accuracy → A4.1 SVG prototype trên một fixture → manager duyệt art direction → A4.2–A4.7**. Không bỏ qua A3 để vẽ chart cá nhân từ output legacy.
