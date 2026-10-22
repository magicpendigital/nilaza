# Nilaza Brand Guidelines — Open Reflection v1

Phiên bản 1.0.0 · thiết kế được chốt 2026-09-11 · chủ sở hữu: Nilaza.

Đây là chuẩn nhận diện cho app, website, Admin, hướng dẫn và truyền thông. [DESIGN](../DESIGN.md) quy định bố cục sản phẩm. [Theo dõi triển khai](BRAND_ROLLOUT_2026-09-11.md) ghi bằng chứng tích hợp/nghiệm thu. Các bảng concept và logo Stitch trước đây là lịch sử, không phải nguồn xuất asset.

## Domain chính thức

Chủ sản phẩm chốt ngày 04/10/2026:

- Domain tổ chức dùng chung cho các dự án: `magicpendigital.com`.
- Website Nilaza: `https://nilaza.magicpendigital.com`.
- Trang giới thiệu VI/EN: `https://nilaza.magicpendigital.com/vi` và `https://nilaza.magicpendigital.com/en`.
- Trợ giúp VI/EN: `https://nilaza.magicpendigital.com/vi/help` và `https://nilaza.magicpendigital.com/en/help`.

Dùng các địa chỉ này trong hướng dẫn, slide, social/OG, store metadata và tài liệu truyền thông; giữ nguyên đường dẫn ngôn ngữ và bài Help. Manifest `brand-identity.json` ghi quyết định domain. Domain website không tự xác lập địa chỉ email hỗ trợ hoặc sender. Cấu hình DNS/TLS, email và phát hành website được kiểm chứng riêng.

## Định vị và lời nói

Nilaza là bạn đồng hành AI giúp Gen Z và phụ nữ quan tâm tarot, chiêm tinh, quan hệ và phát triển bản thân có một khoảng riêng để phản chiếu. Cảm giác: thân mật, trưởng thành, ấm, có chiều sâu huyền học và dễ đọc. Giữ quyền tự quyết của người dùng; hình ảnh và ngôn từ không khẳng định định mệnh.

| Vai trò | Tiếng Việt | English |
| --- | --- | --- |
| Thông điệp chính | Một khoảng mở để lắng nghe mình. | A space to listen to yourself. |
| Giới thiệu ngắn | Bạn đồng hành AI cho những câu hỏi, cảm xúc và khám phá bản thân. | An AI companion for your questions, feelings, and self-discovery. |
| Ranh giới | Nội dung để giải trí và tự phản chiếu; không thay thế hỗ trợ chuyên môn. | For entertainment and self-reflection; not a substitute for professional support. |
| CTA công khai trước store | Tham gia danh sách chờ | Join the waitlist |

Giọng văn ấm, ngắn, cụ thể; dùng “bạn”, mời suy ngẫm thay vì ra lệnh. Ví dụ đúng: “Điều gì đang cần được bạn lắng nghe hôm nay?” / “What needs your attention today?” Tránh “Biết chính xác tương lai”, “chữa lành mọi tổn thương”, “bảo mật tuyệt đối”, “không giới hạn” nếu chưa có bằng chứng. Không tự thêm giá, ngày ra mắt, chứng thực hoặc hiệu quả sức khỏe. Persona phải được mô tả là AI lấy cảm hứng, không phải nhân vật thật.

## Nguồn và vai trò tài sản

- Thư viện được phép sử dụng: `assets/brand/open-reflection/v1/`.
- Manifest có đường dẫn, vai trò, phiên bản, SHA-256: `packages/content/data/brand-identity.json`.
- Bản xuất ứng dụng/web/Admin được tạo bằng `npm run assets:generate`; kiểm tra sai lệch bằng `npm run assets:generate -- --check` và `npm run validate:brand`.
- Bản gốc lịch sử: `design/brand-experience/2026-09-10/master-v1/`, gồm provenance và giấy phép font. Không sửa hình học v1 để đổi thiết kế: tạo phiên bản mới, cập nhật manifest và quyết định của chủ sản phẩm.
- Bảng concept `concepts/01…04` không được cắt làm logo, artwork hoặc screenshot sản phẩm.

| Loại | Cách dùng |
| --- | --- |
| Logo thương hiệu | Open Reflection: hai đường cong và điểm sáng; dùng symbol/horizontal/stacked xuất từ master. |
| Icon chức năng | Thư viện icon đang dùng, có ý nghĩa hành động và nhãn truy cập. Không thay icon nút bằng logo. |
| Artwork tính năng | Nguồn trong `assets/features`, khai báo `feature-visuals.json`; hình phản chiếu riêng cho welcome/Home. |
| Tarot | Chỉ hình bộ bài/thẻ tương ứng trên bề mặt Tarot, giữ nguyên nội dung lá bài. |
| Persona | Chân dung đúng guide/persona, không dùng làm logo hoặc ảnh nhận diện chung. |
| Screenshot | Ảnh từ app đã kiểm chứng, tài khoản kiểm thử; ghi build, thiết bị, locale, ngày và trạng thái bằng chứng. |

## Logo và khoảng trống

Biểu tượng diễn đạt một khoảng mở và sự lắng nghe: hai đường cong không khép kín, một điểm sáng. Giữ nguyên tương quan ba phần và chiều dày. Không thay bằng ∞, chữ N, vòng tròn gần giống hoặc ký tự Unicode.

- Khoảng trống tối thiểu quanh phần nhìn thấy bằng một đường kính điểm sáng (xấp xỉ 22% chiều cao biểu tượng). Canvas xuất đã có padding; không crop sát nét.
- Symbol: tối thiểu 24 px, ưu tiên 32 px trở lên. Kiểm tra thực tế ở kích thước sử dụng.
- Horizontal compact: tối thiểu 180 px chiều rộng canvas. Wordmark riêng: tối thiểu 112 px. Dùng symbol ở không gian hẹp hơn.
- Wordmark luôn là **NILAZA**, EB Garamond Regular 400, tracking 0.18 em; bản compact 0.12 em. Dùng vector/PNG outline trong thư viện để giữ chính xác hình học. Không tự đánh lại bằng serif khác, font đậm hoặc kéo giãn.
- Nền charcoal/teal dùng bản ivory/white; nền ivory dùng charcoal/teal. Gold dùng làm điểm nhấn với độ tương phản đủ. Ảnh nhiều chi tiết cần một vùng nền yên tĩnh.

Đúng: logo ivory trên charcoal, giữ tỷ lệ và khoảng trống; symbol nhỏ cho app chrome, lockup ngang cho website. Sai: kéo rộng logo, đổ bóng/glow lên nét, xoay/lật hai cánh, tô từng phần nhiều màu, thay điểm sáng bằng sao, đặt trên chữ/ảnh rối, dùng gif chuyển động liên tục ở header.

## Màu và typography

| Token | Giá trị | Vai trò |
| --- | --- | --- |
| charcoal | #151416 | Launch, app shell, nền tối web |
| ivory | #F7F1E6 | Chữ trên nền tối, nền tài liệu |
| teal | #0E5A5A | Nhận diện và CTA phù hợp độ tương phản |
| gold | #C9A45C | Điểm nhấn nhỏ |
| rose | #C9828D | Điểm nhấn cảm xúc |
| moonGray | #A8A3A0 | Chữ phụ trên nền tối |

Hanken Grotesk cho nội dung, nhãn và nút; EB Garamond cho tiêu đề biên tập và wordmark. Font đầy đủ dấu tiếng Việt; không dùng bản Latin-only cho đoạn văn VI. Bản WOFF Latin trong master chỉ là nguồn outline wordmark NILAZA. Khi tải font lỗi, nội dung vẫn đọc được qua font hệ thống; logo dùng outline nên không đổi hình.

Nội dung nhỏ cần tương phản ít nhất 4.5:1, chữ lớn 3:1; không dùng gold/rose làm chữ nhỏ trên ivory. Nút mới có vùng chạm tối thiểu 48 px; hỗ trợ font lớn và xuống dòng. Không dùng màu làm tín hiệu duy nhất. Bố cục giữ khoảng thở, góc bo tối đa 8 px theo DESIGN.

## Motion và khả năng tiếp cận

Reveal dài 800 ms: điểm sáng hiện trước, hai đường cong mở nhẹ bằng opacity/transform rồi dừng. Ba lớp có cùng canvas, vị trí cuối khớp symbol tĩnh. Chỉ chạy một lần trên welcome; CTA sử dụng được ngay. Người quay lại đi thẳng vào app. Không giữ native splash để chờ chuyển động hoặc nội dung mạng.

Reduce Motion: hiện frame cuối ngay, dừng chuyển động đang chạy khi hệ điều hành đổi tùy chọn. Không lặp tự động, nhấp nháy hoặc haptic bắt buộc. Logo mang nhãn “Nilaza” khi cung cấp nhận diện; hình trang trí ẩn khỏi screen reader. Nút và chọn ngôn ngữ có nhãn riêng.

## Trải nghiệm đầu tiên được chốt

Launch → welcome (Tạo tài khoản / Đăng nhập / ngôn ngữ) → auth và xác nhận hiện có → chọn 1–3 mục tiêu hoặc bỏ qua → Home. Dùng tên tài khoản; giữ giọng đã chọn, mới dùng dịu dàng. Ngày sinh và chỉnh giọng ở Profile/chiêm tinh. Không onboarding lại người đã hoàn tất; lỗi lưu phải có thông báo/thử lại.

Home: lời chào → artwork/gợi ý → một CTA “Bắt đầu phút phản chiếu” / “Xem lại phút phản chiếu”, dùng Today Pulse. Hai hành động phụ: Trò chuyện, Mở Nhật ký. Gần đây/tiếp tục nằm dưới. Explore/Chat giữ lối vào bộ bài, thư viện, guide, Council và chiêm tinh. Không đổi hợp đồng credits hoặc thêm phiên AI.

## Xuất bản và trạng thái

| Trạng thái | Bằng chứng cần có |
| --- | --- |
| Đã chốt thiết kế / design-approved | Chủ sản phẩm chọn hình học, màu, font và copy; manifest có version/checksum. |
| Đã tích hợp / integrated | App/web/tài liệu dùng đúng bản xuất; đường dẫn và generator check đạt. |
| Đã kiểm chứng / verified | Test tương ứng đạt, ảnh/bản xem có build và môi trường; native cần kiểm chứng native. |
| Đã phát hành / released | Có phê duyệt cuối cùng và định danh bản phát hành thực tế. |

Mỗi sản phẩm bàn giao ghi brandVersion, ngôn ngữ, appReference, source, exports và evidenceStatus. Chỉ dùng nội dung Help/legal đã duyệt cho tài liệu công khai. Không đặt owner guide, AGENTS, prompts hoặc bản ghi riêng tư trong public hay corpus. `docs/NILAZA_PUBLIC_HELP_CORPUS.md` quy định allowlist.

Phát hành website/ấn phẩm sau khi app RC đạt nghiệm thu. Chuẩn bị file không phải là cho phép đăng bài, gửi email, mua quảng cáo hoặc phát hành store. Xem [kế hoạch và nghiệm thu](BRAND_ROLLOUT_2026-09-11.md).
