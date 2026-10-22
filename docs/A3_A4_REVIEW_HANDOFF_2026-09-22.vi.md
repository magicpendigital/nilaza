# A3/A4 — bàn giao bản chạy thử sau review

Ngày 22/09/2026. Đã hoàn thiện luồng **Astrology chạy local và Thế giới thần thoại để chuyển sang kiểm thử thiết bị**. Chưa gọi đây là A3/A4 production hoàn chỉnh: cloud/backend, nghiệm thu native và bằng chứng chuyển đổi trả phí vẫn còn các bước riêng. Chưa đóng gói APK hoặc cài điện thoại trong lượt này, đúng trình tự người dùng yêu cầu.

> **Cập nhật 23/09/2026:** bước đóng gói, cài đè giữ dữ liệu, kiểm thử Android thật và sửa lỗi đã hoàn tất. Xem [báo cáo Android QA và checklist owner](ASTROLOGY_ANDROID_QA_2026-09-23.vi.md). Báo cáo mới thay thế các ghi chú bên dưới về việc chưa có APK hoặc chưa kiểm tra font lớn; các giới hạn production, AI live, payment, TalkBack và ma trận thiết bị vẫn giữ nguyên theo phạm vi được nêu trong báo cáo đó.

## Cập nhật sau khi duyệt visual `Chart Story + Người dẫn đường AI`

- Chart exact mới tạo hoặc đã lưu nay mở thẳng vào một màn thống nhất: vòng sao ở trên, sheet `Câu chuyện · Người dẫn đường · Dữ liệu` ở dưới. Báo cáo và bản đồ không còn là hai điểm đến rời nhau đối với chart exact.
- App thật bắt đầu ở `Câu chuyện` với Mặt Trời được chọn, để người dùng nhận giá trị miễn phí trước. Route visual review bắt đầu ở `Người dẫn đường` để đối chiếu đúng target owner đã chọn.
- Chạm thiên thể, cung, nhà, góc hợp hoặc evidence AI cập nhật cùng một selection; chart highlight và nội dung sheet không còn dùng hai nguồn trạng thái riêng.
- Sheet có ba mức `peek / focus / full`, kéo tại handle, nút truy cập và Back theo thứ tự `full → focus → peek → rời màn`.
- Lớp `Người dẫn đường AI · Premium` hiện là preview trung thực: không có model call, checkout hoặc credit deduction. CTA thiếu backend hiển thị rõ đây là bản xem trước.
- Contract AI đã version hóa request/response, evidence, caveat, privacy và entitlement `premium_astrology_ai`. Contract v1 cấm raw ngày/giờ/nơi sinh/tọa độ/timezone, Journal, lịch sử chat, account và device.
- Hai tài sản mới `astrology-chart-story-stage` và `astrology-chart-story-parchment` tạo sân khấu thần thoại và mặt đọc dịu hơn mà không vẽ giả dữ kiện của chart.

Manager có thể review trực tiếp tại `http://localhost:8089/__preview/astrology-chart-story` khi dev server đang chạy. Route này dùng hồ sơ tổng hợp, không lưu và không gửi dữ liệu.

Các phần chưa được coi là hoàn tất trong candidate này: portal mới, nhớ selection/chương đang đọc, Journal/Chat continuity từ chính `Chart Story`, analytics mới, build-time feature flag, tablet/landscape side panel, runtime endpoint/provider/entitlement/payment cho AI và nghiệm thu Android/TalkBack. Build hiện chỉ dành cho nhóm nội bộ.

## Những thay đổi người dùng có thể nhận thấy

1. **Cổng vào thấy toàn tranh.** Ảnh giữ tỷ lệ 2:3, không dùng cover để cắt mép; chú thích nằm ngoài tranh. Đã kiểm tra vòm cổng, bậc thang, mặt nước và cảnh xa ở 390×844.
2. **Chạm trực tiếp cung trên vòng.** 12 vùng tương tác có nhãn truy cập và vùng chạm 48px. Có hàng lựa chọn thay thế, zoom 100–250%, pan/reset. Pinch hai ngón đã có code; cần xác nhận bằng Android thật.
3. **Vòng sao giữ trong vùng nhìn.** Vòng tách khỏi vùng cuộn chứa lựa chọn và phần đọc. Đã phát hiện và sửa trường hợp chọn Moon trên 320×568 làm vòng cuộn khuất. Thử lại thấy cả vòng và chi tiết Moon cùng lúc. Chọn thiên thể, góc hợp hoặc nhà hiển thị dữ kiện/giải thích gần thao tác; hướng dẫn mở trong hộp riêng.
4. **12 tranh riêng, 12 chương VI/EN.** Mỗi chương có câu chuyện cổ, dị bản/ranh giới nguồn, góc đọc của Nilaza và bài thực hành. Có nguồn Hyginus theo mục, phân biệt thần thoại với dữ kiện thiên văn. Libra không bị gán một truyện thần linh không có trong nguồn; Sagittarius phân biệt Crotus với Chiron. Tranh là diễn giải hiện đại, không tuyên bố tái dựng khảo cổ.
5. **Đọc có thể tiếp tục.** Đánh dấu chương, lưu đã đọc, mở lại chương và viết suy ngẫm riêng tư. Mở thư viện không cần ngày sinh. Khi đi từ chart cá nhân, chương có thêm những vị trí thật thuộc cung đang đọc.
6. **Bản đồ cá nhân hoạt động.** Tìm nơi sinh offline → xác nhận tọa độ/múi giờ → chọn biết giờ/ước chừng/không rõ → kiểm tra UTC → tính → xem → lưu/mở lại/sửa thành bản mới/xuất/xóa. Có trạng thái tải, lỗi lưu và thử lại. Không trừ credits, không mua license vendor, không gửi dữ liệu sinh cho AI để tính.
7. **Múi giờ tách đúng mục đích.** Múi giờ sinh theo nơi và ngày sinh; giờ hiển thị theo thiết bị hoặc IANA người dùng chọn. EU/Mỹ có xử lý ngày 23/25 giờ, giờ bị bỏ qua và giờ xuất hiện hai lần. Chọn lại múi giờ hiển thị không sửa chart đã lưu.

Tên gọi trong UI: “bản đồ sao” cho birth chart, “cung hoàng đạo” cho 12 phần 30° của vòng chiêm tinh. Không coi các phần này là ranh giới chòm sao thiên văn IAU.

## Kết quả kiểm tra kỹ thuật

### Delta sau khi tích hợp `Chart Story + Người dẫn đường AI`

Vòng kiểm tra cuối được chạy lại trên đúng source state hiện tại, thay cho số liệu baseline trước khi có `Chart Story`:

| Kiểm tra | Kết quả cuối |
|---|---|
| Mobile TypeScript | Đạt |
| Targeted Astrology | 5/5 suites, 26/26 tests đạt |
| Toàn bộ Jest mobile | 35/35 suites, 207/207 tests đạt |
| Astrology foundation + mythology | Đạt |
| Astrology AI contract | Schema/fixtures đạt; 9/9 contract tests đạt |
| Visual/content data | Đạt; 24 feature visuals, 604 runtime assets, không phát hiện mojibake/safety issue |
| Mobile release config | Đạt; app 0.1.1, Android 2, iOS 2 |
| Browser interaction QA | Đạt tại 390×844 và 320×568; drag ba mức, tab, direct selection, save và AI preview boundary hoạt động; clean reload không có console error mới |
| Design QA | `design-qa.md`: `passed`; source và implementation đã được đặt cùng comparison input ở full view và focused region |

Các kiểm tra calculator/JPL/cross-check trong bảng dưới là bằng chứng A3/A4 foundation đã chạy trước đó và vẫn là phạm vi accuracy hiện có; chúng không biến chart candidate thành chart được vendor hoặc bên độc lập chứng nhận.

| Kiểm tra local | Kết quả / phạm vi |
|---|---|
| Mobile TypeScript | Đạt |
| Jest toàn mobile | Đã được thay bằng vòng hiện tại: 35 suites, 207 tests đạt; gồm lưu lỗi/thử lại, mở lại, hủy/xác nhận xóa bằng storage giả lập, account isolation, dữ liệu sai và handoff không mang ngày/giờ/nơi sinh |
| Core tests | 14 đạt: lịch Gregorian, DST, unknown/approximate, hình học ASC/MC, contract và thang thời gian |
| JPL longitude reference | 500/500 đạt, 50 thời điểm × 10 thiên thể; sai lệch lớn nhất 0,0050897315°, ngưỡng giữ nguyên 0,01° |
| Cross-check chart/angle | 50/50 ca, 10 địa lý, công thức scalar độc lập; sai lệch góc lớn nhất 0,0208721016°, ngưỡng 0,1° |
| Contract, nội dung, brand, tài sản, Council, governance | Đạt; 12 tranh có checksum và mỗi ảnh runtime dưới 300KB |
| Web production export | Đạt; tổng khoảng 64,17MB, gồm toàn bộ tài sản mobile chứ không chỉ Astrology |
| Android embedded JS/assets | Đạt; đây chưa phải APK, chưa chứng minh chạy Hermes/gesture/FPS trên máy thật |

CI mobile đã thêm các kiểm tra Astrology và đường dẫn kích hoạt tương ứng. Đây là kết quả chạy local; chưa push hoặc chạy GitHub Actions cho patch này.

500 mẫu là kiểm chứng vị trí có phạm vi, **không phải bảo đảm sai số cho mọi đầu vào**. Bộ 50 chart kiểm hình học bằng phương pháp độc lập, chưa phải bộ chart được vendor chứng nhận. Candidate vẫn không tự đặt trạng thái verified. Quy tắc thang thời gian, dữ liệu nơi sinh, license và cách tái lập nằm ở [README core](../packages/astrology-core/README.md).

## Review mô phỏng theo người dùng mục tiêu

Đây là walkthrough do agent thực hiện qua giao diện thật của bản web dùng chung component, calculator và persistence với app. Dữ liệu sinh/ghi chú đều là dữ liệu QA tổng hợp trong namespace preview riêng. Không phải nghiên cứu người dùng thật, không có conversion/retention đo được. Preview không kiểm chứng luồng đăng nhập Supabase, credits, chat AI thực tế hoặc đồng bộ đa thiết bị.

| Góc nhìn / hành trình đã thao tác | Kết quả quan sát |
|---|---|
| Người tò mò, chưa muốn nhập ngày sinh: Home → cổng → chạm Song Ngư → đọc 4 lớp → đánh dấu → đã đọc → viết suy ngẫm → về Home → reload | Chương đúng, tranh riêng, nguồn/câu hỏi hiện đầy đủ; ghi chú và tiến độ còn sau mở lại |
| Người thích khám phá biểu đồ: bật demo → Moon → góc Sun/Mars → hướng dẫn → nhà 7 → zoom/reset | Dữ kiện đổi theo lựa chọn; demo luôn có nhãn tổng hợp. Đã sửa lỗi cuộn khuất vòng trên màn ngắn và thử lại |
| Người Việt tạo bản đồ: 2000-01-01 12:00, Hanoi → xác nhận UTC → tính → lưu → tương tác → mở lại | UTC 05:00Z; Sun Ma Kết 10,07°, Moon Bọ Cạp 9,81°, ASC Bạch Dương 14,33°; mở lại giữ kết quả |
| Người đang sống tại Mỹ: chọn America/Los_Angeles → lưu → xem ngày/thời điểm lưu → xem bản xuất | Hiển thị ngày 21/09 trong khi UTC/VN đã 22/09; bản xuất giữ UTC sinh và đầy đủ revision. Chỉ xem JSON, không chia sẻ ra ngoài |
| Người EU gặp DST: Paris 2020-03-29 02:30 → kiểm tra → chọn không rõ giờ → tính và lưu | Giờ không tồn tại bị từ chối rõ ràng; unknown dùng 23 giờ thực tế; Moon có thể Kim Ngưu/Song Tử, không tạo ASC/nhà/góc hợp chính xác |
| Người Mỹ gặp giờ trùng: New York 2020-11-01 01:30 → chọn lần thứ hai | Bắt buộc lựa chọn; xác nhận UTC 06:30Z với offset −05:00 |
| Người chỉ biết giờ ước chừng: New York 2020-11-02 12:00 ±30 phút | Khoảng 16:30–17:30Z; báo cáo chỉ có khả năng theo mẫu, không wheel cá nhân giả |
| Người dùng tiếng Anh, màn hình 320×568 | Mở chart đã lưu, chọn Moon và cung trực tiếp; vòng giữ trong vùng nhìn sau sửa. Đi qua đủ 12 chương bằng Next; tất cả có ảnh, 4 lớp và nguồn |

Console không có lỗi runtime mới trong lượt walkthrough cuối; vẫn có cảnh báo tương thích web của Expo/RN về shadow, push notification và native animation fallback. Các lỗi hot-reload cũ trong quá trình sửa không được tính là kết quả bản cuối.

### Nhận xét trung thực

- **Ấn tượng đầu:** toàn cảnh cổng và bộ tranh tạo nhận diện riêng, nhất quán và hấp dẫn hơn prototype. Đây là đánh giá thị giác của agent, chưa thể gọi là “wow đã được người dùng xác nhận”.
- **Dễ dùng:** đã giải quyết đúng điểm khó chọn rồi cuộn lại xem. Ở màn hình ngắn, phần điều khiển vẫn cần cuộn trong khu vực riêng; vòng sao luôn ở trên. Ký hiệu dày cần zoom hoặc dùng danh sách. Cỡ chữ rất lớn/TalkBack cần thử máy thật.
- **Chiều sâu:** nội dung có nguồn và phân biệt dị bản giúp vượt khỏi vài câu mô tả chung. Tuy nhiên mỗi chương hiện là một bài đọc ngắn có chiều sâu hơn, chưa phải chuyên khảo. Người am hiểu lâu năm sẽ cần thêm nhiều nguồn, bài so sánh và các tuyến học nối tiếp.
- **Cá nhân hóa:** vị trí tính thật, liên kết chương và suy ngẫm giúp trải nghiệm liền mạch. Phần diễn giải hiện có vẫn là cấu trúc biên tập theo vị trí/chủ đề; chưa có tổng hợp sâu toàn chart hay chuỗi học thích nghi nhiều phiên. Không nên quảng cáo là chuyên gia chiêm tinh AI đã được kiểm chứng.
- **Khả năng trả phí:** có thể đem thử giá trị, chưa có cơ sở kết luận đủ bán subscription. Đề xuất thử nhóm người dùng đọc sâu với nhiệm vụ cụ thể, đo hoàn thành bài, lưu suy ngẫm, quay lại ngày 7 và willingness-to-pay thực tế; không dùng số lượt mở do tò mò làm bằng chứng chuyển đổi.
- **Điểm ma sát còn lại:** nhập ngày kiểu YYYY-MM-DD; tìm tên quốc tế/địa điểm gần nhất khi thiếu làng; IANA có tên thành phố đại diện gây khó hiểu (Hanoi từ GeoNames dùng Asia/Bangkok). Đã ưu tiên tên thành phố trong kết quả tìm kiếm và bản địa hóa nhãn trạng thái. Lịch sử địa phương trước 1970 vẫn cần review bổ sung.

## Tích hợp, dữ liệu và giới hạn release

App chính dùng Explore → Astrology và storage theo account. Profile xóa dữ liệu sinh sẽ xóa cả các chart local mới; bookmark/ghi chú không bị xóa theo. Handoff qua Astrologer chỉ mang những cung/chủ đề được cho phép, không mang raw ngày/giờ/nơi/tọa độ. Chức năng Journal hiện nối với luồng lưu sẵn có; chưa có buổi E2E signed-in kiểm tra chat/Journal trên backend thật.

Chưa đồng bộ chart lên cloud. UI nói rõ “lưu trên thiết bị”; đổi máy hoặc xóa app có thể mất dữ liệu nếu chưa xuất. Đây là quyết định triển khai local, không phải đã hoàn tất backend A3. Migration ledger Supabase vẫn chặn push/repair; không deploy endpoint hay tự vượt gate. Endpoint Astrology cũ chưa được nâng cấp và không được luồng mới gọi để tạo chart.

Chưa thay giá/entitlement, chưa khóa nội dung sau paywall, chưa phát hành store. Không bật telemetry chứa dữ liệu sinh hoặc câu hỏi riêng tư. Admin vẫn quản lý nội dung bằng seed versioned, chưa có màn chỉnh sửa chuyên biệt cho toàn bộ atlas mới.

## Bước tiếp theo: đóng gói và kiểm thử điện thoại

1. Build APK mới có `react-native-svg 15.12.1`; ghi build ID, checksum, môi trường backend. Không chỉ đẩy JS vào APK cũ thiếu native module.
2. Cài lên Android đang kết nối, giữ dữ liệu hiện hữu; dùng hồ sơ QA riêng. Bắt đầu từ đăng nhập → Explore → Astrology, không từ preview dev.
3. Lặp hành trình Việt Nam, thư viện, lưu/mở lại sau force-stop; kiểm back vật lý, bàn phím, nút và vùng an toàn, pinch/pan/reset, mất mạng, đổi múi giờ hệ thống, font lớn và TalkBack.
4. Kiểm Profile xóa birth data, đổi account/logout, Journal/handoff; không gửi raw birth vào request/log. Chỉ xóa dữ liệu test đã được xác nhận.
5. Đo cold start, thời gian tính exact/unknown, FPS/JS stalls và bộ nhớ trên máy thật. Chỉ gọi nghiệm thu native sau khi có kết quả, sửa lỗi và chạy lại.

Chủ sản phẩm cần review nội dung/ảnh và mức hấp dẫn; không cần mua license để chạy thử phần tính hiện tại. Quyết định cloud sync và mở paywall được tách khỏi đợt cài thiết bị này.

## Điểm vào để tiếp tục làm việc

- Kế hoạch/impact: [A3/A4 completion plan](A3_A4_COMPLETION_PLAN_2026-09-22.vi.md).
- Feature: `apps/mobile/src/features/astrology`; tích hợp account/Journal/Chat ở `apps/mobile/App.tsx`.
- Core và dữ liệu tham chiếu: `packages/astrology-core`.
- Chương/ảnh: `packages/content/data/astrology-mythology-depth.json`, `assets/features/astrology/chapter-art-generation.json`.
- Preview thư viện thần thoại: `http://localhost:8083/__preview/mythology`, dữ liệu QA riêng.
- Preview visual `Chart Story + AI`: `http://localhost:8089/__preview/astrology-chart-story`, dữ liệu tổng hợp, không lưu/gửi; production không có route này.
- Logs kiểm thử/export: `output/a3-a4-*.log` (local, không commit).
