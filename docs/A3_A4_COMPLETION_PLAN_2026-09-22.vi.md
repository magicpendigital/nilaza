# A3/A4 — hoàn thiện sau review prototype

Yêu cầu: sửa crop cổng, chọn trực tiếp trên vòng, loại thao tác cuộn đi/về, tăng chiều sâu thư viện, timezone quốc tế, hoàn thiện A3/A4 và chạy mô phỏng end-to-end trước đợt đóng gói/cài Android riêng.

## Whole-App Impact Brief

- Entry: Explore → Astrology → thư viện/cá nhân. Portal luôn thấy toàn tranh; explorer có vùng wheel và điều khiển liền nhau; reader sâu tách khỏi điều khiển chart. Preview dev dùng cùng components và calculator flow.
- Data: chart revision và timezone preference, chapter progress/bookmark được lưu theo account namespace; export/delete/reset đi cùng. JSON nội dung/nguồn/ảnh có version. Không đưa birth data hoặc câu hỏi vào analytics/log.
- Contract: schema executable v0.2 và semantic validator là nguồn chart; core deterministic tách timezone/place resolver, thang thời gian, calculation và interpretation. Mọi consumer phải từ chối contract sai; không tin client tự đặt verified.
- Backend: chuẩn bị integration với endpoint hiện có và auth/quota/persistence phù hợp; không tự deploy hay repair/push DB khi ledger blocked. Kiểm local handler/mocks không được gọi là authenticated staging proof. Không mua vendor.
- Admin: giữ hai workspace; không mở raw birth/chart trong admin. Content hiện được quản lý bằng versioned seed; không tự publish hay thay subscriptions/giá.
- Time: birth timezone theo nơi và ngày sinh; display timezone theo thiết bị hoặc lựa chọn người dùng. DST overlap/gap có UI xử lý, không dùng offset hiện tại để tính quá khứ.
- Monetization: thiết kế lớp đọc nhanh/đọc sâu và nội dung có giá trị; chưa dựng paywall thu tiền khi chưa có đánh giá chuyển đổi và entitlement đã duyệt.
- Rollback: vector/list và cached report vẫn dùng được khi artwork lỗi/offline; không dùng chart giả thay kết quả thất bại. Chart cũ giữ provenance, sửa input tạo revision.
- Không đổi Council/A2, Tarot, auth logic chung, credits, marketing, public Help hoặc store release.

## Các chặng và tiêu chí nghiệm thu

1. A4 UX: full-frame portal; chart explorer cố định với tap trực tiếp, pinch/zoom/pan/reset, controls một hàng, panel đúng mục, house/aspect/planet help, reading tách màn hình; Reduce Motion/font lớn. Không cần cuộn ra khỏi wheel để chọn và xem kết quả.
2. A3 time/contract: policy UTC/UT1/TT versioned, reference validation không hạ ngưỡng; timezone lịch sử và place resolution xác nhận; schema + duplicate/id/geometric validation; exact/approximate/unknown states.
3. A3 integration: form từ nơi sinh→timezone→precision→confirm→chart; loading/error/retry; versioned account storage, save/reopen/delete/export; protected backend contract/source và local test; release blockers ghi riêng.
4. A4 chiều sâu: 12 tranh theo direction hiện tại, 12 chương đọc nhiều lớp VI/EN, nguồn gốc/biến thể/biểu tượng/đối chiếu với chart/câu hỏi/đọc thêm; 10 thiên thể, 12 nhà, 5 aspects. Không gán tính cách/dự đoán thành sự thật khoa học.
5. QC: core tests + ít nhất 50 chart cases đa địa lý và bộ reference độc lập, mobile typecheck/Jest, validators, web/Android export; browser mô phỏng từ đầu tới cuối nhiều persona test, ghi thao tác/kết quả/thời điểm/lỗi/retest; tách review của agent khỏi nghiên cứu người dùng thật.

Files: feature astrology và UI primitives cần thiết, core package/schema/data, feature artwork/manifests, Astrology routes/client/storage tests, endpoint source nếu cần, scripts QA và handoff. Mọi mở rộng sang schema DB phải cập nhật plan và tuân thủ ledger.

Hoàn tất đợt phát triển chỉ khi chức năng đã nối và đường test chạy được; không gọi code skeleton hoặc unit-test pass là full A3/A4 nghiệm thu. Device profiling/installation và staging database release được báo trạng thái riêng theo yêu cầu người dùng.

## Quyết định triển khai trong đợt này

Calculator MIT chạy trực tiếp trên thiết bị, dùng cùng core có thể kiểm thử bằng Node; dữ liệu sinh không đi tới AI hoặc endpoint cũ. Đây là luồng cá nhân offline có tính năng lưu/xem lại/xuất/xóa theo account, không phải fake fallback. Luồng Astrology cũ có điểm yếu auth/timezone không được tiếp tục dùng để tạo report. Không thay đổi hay deploy endpoint cũ trong đợt này; cloud sync, backend authentication/quota và authenticated staging là chặng release backend riêng bị chặn bởi migration ledger. Giá trị lưu local và tình trạng chưa sync hiển thị trong sản phẩm. Không gọi việc này là hoàn thiện backend A3 hoặc sẵn sàng phát hành production. Profile xóa birth data phải xóa cả báo cáo local mới. Mục xuất Astrology thực hiện export thật dù màn export toàn app cũ còn là preview.

GeoNames cities15000 (34.146 nơi, CC BY 4.0) cung cấp tra cứu offline có quốc gia, vùng, tọa độ và IANA timezone; không có kết quả thì không tự đoán tọa độ. Chưa bao phủ mọi làng hoặc ranh giới địa lý; phải thông báo thay vì chọn sai âm thầm.
