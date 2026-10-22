# Thế giới thần thoại và A3 — bản triển khai để review

> Bản ghi lịch sử trước lượt hoàn thiện. Trạng thái hiện tại, kết quả 500 mẫu và hướng dẫn review nằm trong [handoff A3/A4 mới](A3_A4_REVIEW_HANDOFF_2026-09-22.vi.md). Không dùng các mục “còn thiếu” hoặc 49/50 bên dưới làm trạng thái hiện tại.

Ngày 22/09/2026. Trạng thái: **prototype A4 tích hợp; core A3 chạy local, chưa đạt G-A3; chưa phát hành**.

## Những gì có thể xem ngay

Chạy `npm --workspace apps/mobile run web -- --port 8083`, mở `http://localhost:8083/__preview/mythology`. Đường preview chỉ tồn tại ở dev, chỉ có nội dung công khai, không gọi backend, không đọc tài khoản hay thông tin sinh. App chính có đường Explore → Astrology → Thế giới thần thoại.

- Cổng vào dùng artwork gốc: vòm đá cổ, nước phản chiếu và ánh vàng/teal. Asset runtime 201.208 bytes, được lưu cục bộ. Manifest có nguồn, prompt brief, SHA-256 bản gốc/bản dùng trong app và cấu hình xuất.
- Vòng 12 cung dùng nét SVG tự vẽ, tránh emoji khác màu giữa các hệ điều hành. Chọn cung bằng vòng hoặc danh sách; phóng 100–250%, kéo khi phóng to, đặt lại.
- 12 chương VI/EN, câu hỏi phản chiếu, chuyển chương trước/sau và dẫn nguồn. Đây là bản biên tập prototype, chưa phải 12 chương chuyên khảo hoàn chỉnh.
- Trong dev, “Xem bản đồ minh họa” mở fixture tổng hợp: chọn thiên thể/góc hợp, xem tọa độ và highlight. Nhãn được giãn trên vòng riêng; anchor tọa độ gốc không đổi khi giãn nhãn hoặc zoom. Fixture không phải kết quả thiên văn hoặc chart của người dùng.
- Chuyển chương có fade ngắn; cập nhật theo thiết lập Reduce Motion. Nút có vùng chạm tối thiểu 48px; danh sách giúp chọn các vị trí sát nhau.

Thuật ngữ: “bản đồ sao” cho natal chart; “cung hoàng đạo” cho 12 vùng chiêm tinh nhiệt đới; không gọi chúng là ranh giới chòm sao IAU. Hình nền không thể thay thế dữ liệu chart.

## Đánh giá chất lượng hiện tại

Đã có một hướng hình ảnh và tương tác cụ thể để review. Mức hoàn thiện phù hợp **prototype sản phẩm**, chưa đủ bằng chứng gọi là trải nghiệm “wow” đã nghiệm thu với người dùng mục tiêu.

Còn thiếu: 12 tranh riêng theo master direction; chiều sâu biên tập mỗi chương; pinch zoom; chọn nhà; trải nghiệm reveal gắn chart cá nhân; save/share cùng chart revision; profiling FPS/memory trên Android/iOS, font lớn và screen reader thiết bị thật. Bản hiện tại chưa kết nối calculator A3 vào personal chart.

Các lỗi đã phát hiện và sửa khi nhìn giao diện thật: ký hiệu cung thành emoji tím; hình nền tràn sang phần nội dung; preview vượt chiều cao viewport; nhãn thiên thể dày bị chồng; responder props của SVG gây lỗi console web. Đã xuất lại các icon/notification brand bị drift từ nguồn Open Reflection đã khóa; không đổi thiết kế logo.

## Kịch bản bạn review

1. Mở preview VI: xem cảm giác cổng vào, độ dễ đọc và mật độ nội dung.
2. Chọn lần lượt 12 cung, đọc câu hỏi, dùng chương trước/sau. Đánh giá mức hữu ích, tránh chỉ “đẹp nhưng đọc một lần”.
3. Chuyển EN bằng nút đầu trang; kiểm bố cục và ý nghĩa tương đương.
4. Mở bản đồ minh họa → Mặt Trăng: phải hiện Bạch Dương 15,90° của fixture; chọn góc hợp phải highlight đúng hai đầu.
5. Phóng to, kéo, đặt lại; nhãn và lựa chọn phải tương ứng cùng dữ kiện. Đây là zoom bằng nút, chưa có pinch hai ngón.
6. Trở lại → mở lại. App chính phải giữ report ở state cha khi ra/vào thư viện.

Android: lần này thêm native module `react-native-svg 15.12.1`. **Bản APK cũ chưa chứa module này cần build/cài lại**, không nên chỉ đẩy JS vào APK cũ. Chưa cài APK mới trong đợt này.

## A3: kết luận về độ phức tạp và phần đã làm

A3 **không phải task tính toán đơn giản để giao toàn bộ cho model thấp hơn**. Các điểm khó nằm ở thang thời gian, timezone lịch sử, quy ước tọa độ, độ bất định, kiểm chứng độc lập và ownership của dữ liệu lưu.

Đã triển khai trong `packages/astrology-core`, chưa nối endpoint production:

- Xác thực lịch Gregorian 1900–2100, revision, precision, tọa độ và thông tin nơi đã xác nhận; không tự chọn UTC hay 12h trưa.
- Temporal 0.5.1 xử lý DST gap/overlap, bắt buộc chọn lần giờ khi bị lặp; kiểm offset khai báo với IANA; giữ provenance phiên bản tzdata/ICU từ runtime. Chưa có catalog/resolver nơi sinh tin cậy: `place.confirmed` hiện là đầu vào của module, không phải bằng chứng server đã xác minh.
- Unknown time tạo khoảng ngày thật (có thể 23/25h). Approximate time đòi khoảng sai số. Trả miền **lấy mẫu 15 phút**, không giả đây là cận toán học được chứng minh; không xuất point placements, ASC, nhà hoặc aspects như facts cho các ca này.
- Adapter Astronomy Engine 2.1.19: 10 thiên thể, longitude giữ full precision, tốc độ sai phân đối xứng, dấu nghịch hành/gần station, ASC/MC từ giao tuyến hình học, Whole Sign và năm loại góc hợp. Có khai báo TypeScript cho candidate contract v0.2.0; chưa thay contract v0.1.0 của mobile/backend cũ, chưa có JSON Schema runtime hoàn chỉnh.
- Kết quả luôn `candidate`, chứa blocking uncertainty, không tự đặt `verified`. Không LLM, secrets, raw user data hay network trong calculator.

## Bằng chứng độ chính xác — đọc đúng phạm vi

Đã tải và lưu 50 **vị trí thiên thể** từ [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html#obsquan): 10 thiên thể × 5 thời điểm 1900, 1950, 2000, 2026, 2099. Có raw response, engine/EOP metadata và SHA-256. Đây **không phải 50 birth charts đa địa lý** của gate A3, cũng chưa có reference độc lập cho ASC/MC.

Ngưỡng dự kiến longitude ≤0,01° được giữ nguyên. Kết quả: **49/50 đạt, 1 không đạt; cổng accuracy trả exit code 1**. Mặt Trăng 2099-12-31 lệch 0,0218812062°.

Chẩn đoán cùng thời điểm: engine dùng ΔT ≈202,648 giây, Horizons TDB−UT ≈69,184 giây. Căn thang thời gian trong phép chẩn đoán cho sai lệch ≈0,000283743°. TDB được xấp xỉ TT chỉ cho chẩn đoán này; không dùng một số bù cố định cho toàn ứng dụng. Horizons giữ dự đoán EOP cuối cho thời điểm xa tương lai, trong khi engine dùng mô hình khác. [Quy ước Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html), [tài liệu Astronomy Engine](https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md).

Không hạ ngưỡng, không loại ca lỗi khỏi báo cáo để tuyên bố đạt. Chưa thể đóng G-A3 hoặc quảng cáo độ chính xác cao. Cần chốt chính sách UTC/UT1/TT/ΔT theo phiên bản và phạm vi ngày sinh được hỗ trợ.

## Kiểm tra đã chạy

- Mobile TypeScript: đạt.
- Jest toàn mobile: 29 suites, 179 tests đạt.
- Core A3: 11 tests đạt, gồm DST, lịch, khoảng giờ và 60 tổ hợp tọa độ/thời điểm kiểm hình học ASC/MC. Kiểm hình học cùng engine không phải chứng nhận accuracy độc lập.
- Visual/runtime assets, 12 chương mythology, fixture foundation, data và brand validators: đạt.
- Web export và Android embedded bundle: đạt. Embedded bundle không phải APK/device QA.
- Browser 390×844: cổng vào, 12 chương VI, EN, quay lại, bản đồ mẫu, Moon, zoom/reset đã thử; không còn responder error mới sau bản sửa. Chưa kiểm pinch (chưa xây), FPS, VoiceOver/TalkBack hoặc E2E signed-in trên điện thoại.
- `npm run astrology:accuracy:check`: **chưa đạt 49/50**, đúng với báo cáo ở trên.

Tệp bằng chứng: `packages/astrology-core/accuracy-report.json`, `packages/astrology-core/timescale-diagnostic.json`, `packages/astrology-core/fixtures/*`.

## Thứ tự triển khai tiếp A3

| Task | Nội dung và nghiệm thu | Mức độ |
| --- | --- | --- |
| A3-T1 | Chốt policy UTC/UT1/TT, leap seconds/ΔT và range; version nguồn thời gian; kiểm lại tất cả references, không global override ảnh hưởng request song song | Phức tạp, giữ model có năng lực lập luận/kiểm chứng cao |
| A3-T2 | Place resolver server: locality trùng tên, tọa độ, zone polygon/source/license; UI xác nhận IANA và DST occurrence; không dùng GPS hiện tại làm nơi sinh | Phức tạp |
| A3-T3 | JSON Schema executable + semantic validation cho candidate v0.2; supported version, duplicate body, degree/sign consistency, aspects endpoints, uncertainty và consumer migration | Phức tạp |
| A3-T4 | Ít nhất 50 birth chart fixtures đa địa lý, boundaries/stations/high latitude; reference độc lập ASC/MC; báo cáo sai số cùng convention, provenance và từ chối có lý do | Phức tạp ở thiết kế/đối chiếu; nhập fixture theo mẫu đã khóa có thể giao model thấp hơn |
| A3-T5 | Endpoint auth/quota trước compute, idempotency/cache theo user+revision+engine; chart tách interpretation; kiểm delete/export/ownership/staging E2E | Phức tạp, phụ thuộc migration ledger |
| A3-L1 | Sau khi T1–T4 khóa schema và kết quả mong đợi: bổ sung fixture đã được cung cấp, chạy validator, cập nhật bảng QA; không tự đổi thuật toán, ngưỡng hay trạng thái verified | Phù hợp model thấp hơn; hiện chưa đến bước giao |

Không deploy, `db push`, migration repair hoặc publish nội dung ngoài app ở đợt này. Quy tắc ledger là blocker thật của thay đổi persistence, không cản viết/test core local. Các sửa A2/Council và marketing đang có được giữ nguyên.
