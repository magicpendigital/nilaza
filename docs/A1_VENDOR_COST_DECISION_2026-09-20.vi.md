# A1 — Bảng quyết định vendor, license và chi phí

Ngày lập: 20/09/2026  
Trạng thái: **draft để duyệt cùng G-A1**  
Nguyên tắc: không mua, không tạo account trả phí và không đưa dữ liệu người dùng thật vào vendor trong A1.

## 0. Kết luận về khả năng tự xây

**Có thể tự xây phần khung và vận hành v1 mà không mua license vendor trả phí.** Nilaza có thể giữ calculator server-side hiện tại (`astronomy-engine`), tự viết adapter cho tropical/Whole Sign/aspects, tự viết input validation và renderer. Astronomy Engine được công bố dưới MIT và mô tả độ chính xác khoảng ±1 arcminute so với các mô hình tham chiếu; điều đó phù hợp để làm baseline/prototype, nhưng không tự chứng minh ngưỡng production của Nilaza. Xem [repository và MIT license](https://github.com/cosinekitty/astronomy).

Điều này không có nghĩa mọi dữ liệu đều “không cần license”:

- Thuật toán, house/aspect rules, input validation và visual renderer có thể tự viết.
- Ephemeris model/data phải được kiểm tra quyền sử dụng và provenance. Nếu chọn Swiss Ephemeris, tài liệu chính thức yêu cầu chọn AGPL hoặc mua Professional License trước khi phân phối phần mềm/dịch vụ; vì vậy chưa đưa vào runtime. [Swiss Ephemeris programming interface](https://www.astro.com/swisseph-download/doc/swephprg.pdf).
- Timezone có thể dùng IANA tz database theo điều kiện công bố của nó, nhưng vẫn phải pin version và kiểm historical offsets. [IANA tz database source](https://github.com/eggert/tz).
- Geocoding có thể tránh vendor bằng cách yêu cầu người dùng xác nhận địa điểm/toạ độ, hoặc tự vận hành dữ liệu có quyền rõ ràng. Không gọi dịch vụ public tùy tiện ở production khi chưa kiểm quota, attribution, retention và policy.

Phương án tài chính phù hợp lúc này là **build-first, vendor-optional**: hoàn thành framework/fixtures/contract với engine hiện có; song song xin báo giá để so sánh accuracy, legal, SLA, privacy và unit cost. Chỉ chuyển engine sau khi có fixture report và quyết định license bằng văn bản.

## 1. Các quyết định cần tách riêng

Astrology không phải một gói vendor duy nhất. Cần quyết định độc lập cho:

1. **Ephemeris/calculation engine:** tạo longitude, retrograde, angles, houses và aspects.
2. **Place/time resolver:** xác nhận locality, coordinates, IANA timezone và historical offset.
3. **Rendering:** hiển thị chart trên mobile; ưu tiên thư viện phù hợp Expo và accessibility.
4. **AI interpretation:** diễn giải chart facts sau khi calculator hoàn tất; không được dùng AI để tính placement.

Tách như vậy giúp Nilaza đổi provider hoặc tắt một phần mà không làm hỏng chart đã lưu. Mỗi output phải có provider/version/data provenance và được kiểm bằng fixture.

## 2. Ma trận phương án

| Thành phần | Phương án baseline | Ưu điểm | Rủi ro/cost cần xác minh | Quyết định A1 |
| --- | --- | --- | --- | --- |
| Calculator | `astronomy-engine` hiện có, chạy server-side | Không thêm license thương mại ở prototype; dễ giữ adapter hiện tại | Chưa đủ bằng chứng độc lập cho ngưỡng accuracy; cần kiểm convention, historical time và high-latitude | Dùng làm baseline fixture/prototype; chưa được gọi là production-certified |
| Calculator | Swiss Ephemeris | Hệ sinh thái chiêm tinh phổ biến, có thể đối chiếu sâu | Dual licensing AGPL/Professional; cần legal review, phí và điều kiện phân phối/service; phải xác minh runtime | Chỉ POC/đánh giá sau khi có tư vấn license và quote |
| Calculator | Hosted commercial astrology API | Có thể giảm công vận hành và có SLA | Dữ liệu sinh ra ngoài hệ thống, recurring cost, rate limit, vendor lock-in, privacy/DPA | Chỉ shortlist sau khi có DPA, data retention, accuracy fixture và giá theo volume |
| Place/time | Resolver có historical timezone/coordinates được cấp quyền | Đóng gap DST/offset và place ambiguity | Chi phí request, coverage địa danh, quota, lưu cache và DPA | Chọn một adapter server-side sau spike; không dùng GPS hiện tại làm nơi sinh |
| Renderer | SVG/vector + layered artwork, 2.5D | Dễ giữ chart fact-driven, text fallback và accessibility | Cần profiling Expo/mobile; dependency chưa có trong current package | Spike A4; chốt package version sau compatibility test |
| Renderer | Canvas/Skia | Có thể tốt hơn khi nhiều line/animation | Complexity, accessibility/text overlay và native performance | Chỉ chuyển nếu SVG spike không đạt budget |
| AI interpretation | Route hiện có theo `model-routing.json` | Có sẵn fallback và prompt versioning | Chi phí/token, output drift, không để AI thay calculator | Giữ boundary hiện tại; A2/A3 thêm eval/cost guardrail |

## 3. Bảng thông tin phải có trước khi chọn

Mỗi vendor/engine candidate phải điền cùng một mẫu, không dùng demo marketing làm evidence:

- license và quyền dùng cho app thương mại, redistribution/runtime, attribution;
- dữ liệu nào rời Nilaza, retention, subprocessors, DPA và xóa dữ liệu;
- supported date range, historical timezone/DST, coordinates, polar/high-latitude behavior;
- output fields, precision, house/aspect convention, version pinning và reproducibility;
- SLA, timeout, quota, retry, rate limit, status page và rollback;
- giá dev/staging/production theo request, cache policy và worst-case cost trên 1.000/10.000 chart;
- kết quả trên fixture độc lập của Nilaza, gồm circular longitude diff và classification ở ranh giới;
- đường tích hợp với backend hiện có, không đặt provider key trong mobile.

## 4. Nguyên tắc ra quyết định

Calculator chỉ được chọn khi đạt cả bốn điều kiện: (1) license/data egress được phê duyệt; (2) fixture bắt buộc đạt hoặc có deviation được giải thích; (3) output có version/provenance và fallback an toàn; (4) chi phí worst-case phù hợp với giá/credits dự kiến. Nếu một điều kiện chưa đạt, giữ adapter baseline ở chế độ nội bộ và không quảng cáo “chính xác cao”.

Không hard-code giá vào plan khi chưa có quote theo thời điểm triển khai. Product owner cần chốt ngân sách tối đa cho chart calculation, geocoding/timezone và AI interpretation trước khi bật paid beta.

## 5. Gate và người quyết định

| Gate | Người duyệt | Artifact bắt buộc |
| --- | --- | --- |
| License/legal | Product owner + legal/ops | Terms, license text, DPA/data flow |
| Accuracy | Tech/QA + product | 50+ fixture report, convention declaration, error/uncertainty report |
| Cost | Product/finance | Quote, volume scenarios, cache/retry budget, unit economics |
| Privacy | Product/security | Redaction, retention/delete/export, provider boundary |
| Release | Product owner | G-A3/G-A6 evidence và rollback runbook |

**A1 outcome:** chưa chọn vendor trả phí. A3 được phép chạy POC/fixture trên dữ liệu tổng hợp hoặc fixture công khai, sau khi decision ID và quyền truy cập được ghi nhận. Mọi migration hoặc production integration vẫn bị chặn bởi `supabase/migration-ledger.json` cho tới khi ledger được reconcile và owner phê duyệt.
