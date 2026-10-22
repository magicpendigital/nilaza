# A1 — Baseline và sổ quyết định triển khai Nilaza

Ngày lập: 20/09/2026  
Trạng thái: **khung A1 đã hoàn tất; quyết định vendor/license còn chờ báo giá và phân tích tài chính**  
Lane: cross-cutting (product, backend, mobile, design, content, analytics, privacy)  
Owner đề xuất: Product/Tech Lead; phối hợp Editor, Designer, QA và Data/Marketing

Tài liệu này là bàn giao A1 cho kế hoạch [Hoàn thiện sản phẩm](APP_PHASED_DELIVERY_PLAN_2026-09-20.vi.md). A1 chỉ chuẩn hóa phạm vi, contract và quyết định có bằng chứng; chưa sửa hành vi app, chưa thêm migration, chưa mua provider/license và chưa publish production.

## 1. Whole-App Impact Brief

| Mặt tác động | Kết luận A1 |
| --- | --- |
| Entry point | Giữ auth-first và 5 tab hiện có. Astrology vào từ Explore/Profile với hai lối: **Bản đồ sao của bạn** và **Khám phá 12 cung**; chart đã lưu có đường mở lại. Không thêm deep link mới trong A1. |
| Data write | A1 không ghi database. A3 sẽ cần birth-profile revision, chart snapshot, report và provenance; xóa/export phải bao gồm cả cache và dữ liệu dẫn xuất. |
| Backend contract | Calculator chạy server-side; AI chỉ diễn giải placement đã tính. Contract nháp nằm ở `A1_ASTROLOGY_CHART_CONTRACT_2026-09-20.json`, chưa thay `Record<string, unknown>` trong mobile. |
| Canonical contract | Chart contract là nguồn dữ liệu tính toán; interpretation contract và visual theme là hai phiên bản độc lập. Council tiếp tục dùng `packages/agent-config/council-contract.json`; A1 không sửa contract Council. |
| Admin | A2/A4 sẽ cần Content Ops cho nguồn thần thoại, asset provenance và publish readiness; AI Studio chỉ thấy prompt/eval metadata đã giảm nhạy cảm. A1 chưa mở workspace mới. |
| Privacy/safety | Birth date/time/place/coordinates được coi là dữ liệu cá nhân nhạy cảm theo ngữ cảnh. Không đưa raw birth data, raw chart, raw prompt/chat vào analytics, trace hoặc marketing audience. Unknown time không được đoán kín. Nội dung chiêm tinh là biểu tượng/tự phản chiếu, không chẩn đoán hay dự đoán chắc chắn. |
| Analytics/observability | Event dictionary nháp chỉ ghi lifecycle, version, pseudonymous user id và outcome. Không ghi payload chart hoặc nội dung AI. A2/A3 phải thêm correlation/idempotency và đối soát client/backend. |
| Rollback | Feature flag tắt Astrology entry hoặc chỉ cho xem thư viện tĩnh; giữ chart/report cũ có provenance. Không dùng kết quả UTC giả làm fallback. Mọi schema mới phải additive và đi qua migration ledger. |
| Agent handoff | A2: Product/AI + mobile, A3: Backend/astro + QA, A4: mobile/design/content. Write scope của A1 chỉ `docs/` và liên kết kế hoạch. Production action, DB repair/push, provider trả phí và license đều cần quyết định riêng của manager. |

## 2. Baseline có thể kiểm chứng

| Khu vực | Evidence hiện tại | Tình trạng | Khoảng trống quyết định |
| --- | --- | --- | --- |
| Astrology endpoint | `supabase/functions/ai-astrology-report/index.ts` dùng `astronomy-engine@2.1.19`, tropical, Sun–Pluto, ASC và Whole Sign khi có dữ liệu. AI nhận kết quả calculator để diễn giải. | Có nền MVP | Cần adapter và contract typed; cần kiểm tra độc lập, version hóa convention và uncertainty. |
| Thời gian/nơi sinh | Function nhận `utcOffsetMinutes`, mặc định UTC khi thiếu; dùng noon khi không biết giờ; đã có caveat nhưng chưa có historical IANA/DST resolution bắt buộc. | P0 — không đủ cho claim “chính xác cao” | Place confirmation, IANA timezone/offset theo ngày, DST ambiguous/nonexistent, precision exact/approximate/unknown; cấm silent UTC. |
| Mobile input | `apps/mobile/src/backendClient.ts` có birth date/time, `birthTimeKnown`, place, lat/lon, timezone, offset, provider và consent; chart trả về `Record<string, unknown>`. | Có input sơ bộ | Cần typed canonical contract, input revision và lỗi/uncertainty hiển thị được. |
| Engine/vendor | `packages/content/data/astrology-strategy.json` còn là strategy cũ, nêu local mock/FreeAstroAPI/AstroAPI/Swiss Ephemeris. | Chưa chốt | So sánh fixture, chi phí, dữ liệu ra ngoài, vận hành và quyền. Swiss Ephemeris yêu cầu rà AGPL/Professional trước khi dùng thương mại. |
| Visual | Brand Open Reflection v1 và feature visual manifest đã có; chưa có chart renderer hay 12 chương thần thoại. | Chưa bắt đầu | Chốt 2.5D vector + layered artwork; tạo concept trước khi sản xuất hàng loạt; không dùng ảnh AI để vẽ dữ liệu chart. |
| Personas/guide | Có prompt/config và Council contract đang được quản lý; review sản phẩm xác định nguy cơ persona chung chung và thiếu session/handoff sâu. | P1 | A2 cần method packs, continuity, eval holdout và value event trước paid acquisition. |
| Analytics | Có scripts/contract validation và các thay đổi đo lường đang diễn ra trong worktree. | Chưa có event spine A1 cho Astrology | Chuẩn hóa event names, required fields, forbidden fields và correlation. |
| Database/migrations | `supabase/migration-ledger.json` là `blocked_pending_reconciliation`; có local-only và remote-only migrations. | P0 cho mọi DB write | Không repair/push. Phải reconstruct/review remote, diff local/live, owner approve và ghi ledger. |
| Validation baseline | Scripts hiện có: `validate:data`, `validate:backend`, `supabase:check`, `supabase:migration-ledger:check`, `mobile:check`, `admin:check`. | Sẽ chạy sau khi tạo artifact | Ghi kết quả thật trong handoff; lỗi pre-existing phải tách khỏi A1. |

## 3. Quyết định A1 và lý do

| ID | Quyết định | Trạng thái/điều kiện |
| --- | --- | --- |
| D-A1-01 | Dùng thuật ngữ sản phẩm **Chiêm tinh → Bản đồ sao cá nhân lúc sinh**. “Cung hoàng đạo” là 12 phần của zodiac; “chòm sao/constellation” chỉ dùng khi ghi rõ là minh họa thiên văn. | Đề xuất chốt; cần manager xác nhận copy VI/EN. |
| D-A1-02 | Phạm vi v1 là Western tropical, địa tâm, Sun–Pluto, ASC/MC, Whole Sign houses, 5 major aspects có orb version. Whole Sign là lựa chọn scope, không phải tuyên bố đúng hơn mọi trường phái. | Chờ G-A1; đổi convention sau A1 phải tạo contract version mới. |
| D-A1-03 | Có thể tự xây framework/calculator adapter mà không mua license vendor trả phí. Giữ `astronomy-engine` làm baseline adapter để làm fixture/prototype; chưa tuyên bố đủ cho production accuracy. So sánh Swiss Ephemeris hoặc provider có quyền thương mại trước A3. | Không mua/không tích hợp license trong A1; xem [vendor decision sheet](A1_VENDOR_COST_DECISION_2026-09-20.vi.md). |
| D-A1-04 | Chart calculation, AI interpretation và visual theme tách version/provenance. AI không được tự suy placement; artwork không được vẽ marker/degree/aspect. | Bắt buộc cho A3/A4. |
| D-A1-05 | Trải nghiệm dùng vector 2D + artwork lớp + motion tạo chiều sâu (2.5D), không full 3D sky ở v1. SVG spike trước; chỉ chuyển canvas/Skia nếu profiling chứng minh cần. | Chờ prototype A4; Reduce Motion và text fallback bắt buộc. |
| D-A1-06 | Birth input phải có place confirmation, IANA timezone/historical offset và precision. Thiếu giờ chỉ trả phần đủ tin cậy; ASC/nhà không hiển thị như chắc chắn. | P0 trước beta Astrology. |
| D-A1-07 | Event payload chỉ dùng pseudonymous id, version, outcome và aggregate-safe dimensions; cấm raw birth/chart/chat. | Draft trong event dictionary; A2/A3 triển khai runtime. |
| D-A1-08 | Không sửa schema hoặc chạy `supabase db push`/repair trong A1 vì migration ledger đang blocked. | Hard stop theo `docs/SUPABASE_MIGRATION_LEDGER.md`. |

## 4. Gap register ưu tiên

### P0 — phải đóng trước Astrology beta hoặc paid traffic

1. **Historical time resolution:** nơi sinh phải map tới locality, coordinates, IANA timezone và offset đúng ngày; xử lý DST lặp/không tồn tại bằng xác nhận.
2. **Typed chart contract:** thay dần `Record<string, unknown>` bằng contract versioned, có input precision, conventions, engine/data/calculation version, provenance và uncertainty.
3. **Independent fixture pack:** tối thiểu 50 fixture đa địa lý, DST, leap day, ranh giới 0°/360°, retrograde/station, unknown time, high latitude và aspects sát orb; so sánh nguồn độc lập khi khả thi.
4. **Không false precision:** không fallback kín sang UTC/noon; không hiển thị ASC/house/Moon như chắc chắn khi input không đủ.
5. **Migration reconciliation:** giải quyết ledger trước mọi persistence schema mới.
6. **Event spine:** entry → birth profile → request → result/error → reveal → element → save/share/handoff/value rating với correlation/idempotency.
7. **Release claims:** copy phải nói rõ self-reflection/entertainment, giới hạn dữ liệu và khác biệt giữa minh họa thần thoại với bầu trời thật.

### P1 — cần hoàn tất trước launch candidate

1. Renderer chart 2.5D, accessibility, reduced motion, memory/asset budget và 12 chương thần thoại có provenance.
2. Chart → guide → journal handoff giữ đúng placement IDs và consent; report revision/revisit/delete/export.
3. Persona/Council continuity, method packs, holdout eval và useful rating để chứng minh giá trị khác General AI.
4. Payment/credits/idempotency, provider cost guardrails và retry không charge lặp.
5. Admin review/publish readiness cho prompt, source, artwork, locale và safety copy.
6. Campaign/publishing/marketing attribution chỉ sau khi value event và privacy boundary ổn định.

## 5. Architecture decisions cho A2–A4

### 5.1 Luồng dữ liệu đề xuất

`BirthProfileRevision` → `ChartCalculation` → `CanonicalChart` → `Interpretation` → `VisualTheme` → `ReflectionAction`.

Mỗi node giữ `version`, `source`, `createdAt`, `correlationId` và parent id. Chart snapshot được tái tạo từ input + convention + engine/data version; interpretation có thể thay prompt/model mà không làm thay đổi placement. Visual layer chỉ nhận chart facts và theme tokens.

### 5.2 Quy tắc uncertainty

- `exact`: ngày, giờ, nơi và timezone đã xác nhận.
- `approximate`: người dùng chỉ biết khoảng giờ hoặc geocode có độ bất định; hiển thị phạm vi, không một điểm giả chính xác.
- `unknown`: không biết giờ hoặc không đủ place/timezone; ẩn ASC/nhà và đánh dấu phần không tính được.
- Placement gần ranh giới cung/nhà/aspect phải giữ full precision, hiển thị uncertainty và không tự làm tròn để đổi phân loại.

### 5.3 Privacy boundary

Raw birth data chỉ được dùng ở calculator/report path có consent. Traces, analytics, campaign audiences và marketing exports dùng event-safe ids/aggregates. Admin xem provider/version/status và redacted diagnostics; không xem raw chart/chat nếu không có quyền vận hành được ghi trong policy.

## 6. Brief đồ họa Astrology v1

**Concept:** “Đài quan sát thần thoại” — một không gian trưởng thành, tĩnh và có chiều sâu theo Open Reflection; dữ liệu thật nằm ở trung tâm, thần thoại tạo ngữ cảnh và cảm xúc.

- **Lớp dữ liệu:** vòng 360°, 12 sign, house ring khi đủ dữ kiện, glyph/marker, ASC/MC, aspect lines. Renderer tính tất cả từ longitude; label collision chỉ dời nhãn có leader line.
- **Lớp không gian:** zoom nhẹ, highlight, filter aspect, camera/parallax tiết chế; không làm planet chạy quanh natal chart cố định; tap có list fallback khi vùng dày.
- **Lớp thư viện:** 12 chapter, mỗi chapter có artwork nhiều lớp, biểu tượng, nguồn/biến thể thần thoại, kiến thức phổ thông và câu hỏi phản chiếu. Artwork không được mô tả là ảnh bầu trời thật lúc sinh.
- **Typography/color:** EB Garamond cho tiêu đề, Hanken Grotesk cho nội dung; #151416, #0E5A5A, #C9A45C, #F7F1E6 cùng asset manifest chính thức. Không dùng concept logo/old infinity marks.
- **Accessibility:** Reduce Motion có bản tĩnh; screen reader đọc placement/sign/house/degree; hit target ≥48 px; viewport 360/390/430 px; không phụ thuộc màu đơn lẻ.
- **Performance acceptance dự kiến:** cached chart mở ≤1 giây, interaction ≤100 ms, target 60 fps và fallback ≥30 fps trên Android chuẩn thấp đã chọn, không leak sau 20 open/close. Đo release-like native sau prototype.
- **Asset governance:** tải theo chapter, cache có giới hạn; artwork lỗi dùng glyph/background thay thế để chart/text vẫn đọc được; provenance và locale bắt buộc.

## 7. Backlog bàn giao

Backlog máy đọc được nằm ở [A1 backlog JSON](A1_BACKLOG_2026-09-20.json); bảng vendor/license/cost ở [A1 vendor decision sheet](A1_VENDOR_COST_DECISION_2026-09-20.vi.md). Các việc đầu tiên:

1. A2 — method packs và session/handoff/value event cho 3 guide chủ lực.
2. A3 — timezone/place resolver, calculator adapter, typed contract, 50+ fixtures và report sai khác.
3. A3 — input UX cho exact/approximate/unknown, lỗi/retry và revision/persistence sau khi ledger được giải quyết.
4. A4 — SVG/2.5D spike, chart renderer fixture-driven, 12-chapter content/art concept, accessibility/performance.
5. A5 — chart-to-guide-to-journal, consented memory, follow-up và useful rating.
6. A6 — payment, privacy export/delete, release candidate và store evidence.

Mỗi item có owner, write scope, dependency, validation và stop condition trong JSON; item có provider/license/schema dependency không được tự chuyển sang production.

## 8. Cổng G-A1 và đường test cho manager

**Manager test path:**

1. Mở ba artifact A1; kiểm tra các quyết định D-A1-01…08.
2. Nhập một birth profile có giờ/nơi rõ; xác nhận chart facts sẽ được tính trước AI interpretation.
3. Đọc case không biết giờ và case DST/ambiguous; xác nhận giao diện sẽ nói rõ phần không chắc chắn.
4. Mở visual brief; kiểm tra 2.5D chỉ tạo chiều sâu, không thể ghi đè dữ liệu chart và có Reduce Motion.
5. Kiểm tra event dictionary không chứa raw birth/chart/chat; kiểm tra rollback và ledger hard stop.

**G-A1 chỉ đạt khi:** manager duyệt terminology/conventions, phạm vi v1, phương án engine/license để A3 đánh giá, 2.5D direction, privacy/event boundary và thứ tự backlog. Nếu chưa đạt, trả lại đúng decision ID; không tự chọn provider trả phí, license hoặc migration.

## 9. QC và bàn giao

Artifact A1 không làm thay đổi runtime. Sau khi tạo file, chạy các kiểm tra JSON và baseline read-only trong handoff. `supabase:migration-ledger:check` có thể báo blocked theo thiết kế; đó là tín hiệu an toàn, không phải lý do để repair.

**Known risks:** engine hiện tại chưa được chứng minh độc lập ở ngưỡng acceptance; historical timezone/geocoding chưa có; artwork/renderer chưa prototype; worktree có thay đổi khác của dự án nên kết quả kiểm phải phân biệt pre-existing.

**Recommended next task:** tiếp tục A2 ở các phạm vi không ghi DB trong khi lấy báo giá vendor; chỉ chốt engine/license và bật persistence integration sau khi có fixture report, phân tích unit economics và migration owner giải quyết ledger.
