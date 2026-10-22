# Domain chính thức và bộ branding/truyền thông — 04/10/2026

Theo quyết định của chủ sản phẩm ngày 04/10/2026, domain tổ chức là `magicpendigital.com`; website Nilaza là `https://nilaza.magicpendigital.com`.

| Mục đích | Địa chỉ chính thức |
| --- | --- |
| Tổ chức | `magicpendigital.com` |
| Nilaza | `https://nilaza.magicpendigital.com` |
| Website tiếng Việt / tiếng Anh | `https://nilaza.magicpendigital.com/vi` / `https://nilaza.magicpendigital.com/en` |
| Help tiếng Việt / tiếng Anh | `https://nilaza.magicpendigital.com/vi/help` / `https://nilaza.magicpendigital.com/en/help` |

## Phạm vi đã cập nhật

- Ghi quyết định trong AGENTS, Brand Guidelines và `packages/content/data/brand-identity.json` để các tài liệu sau dùng cùng địa chỉ.
- Sửa tài liệu hướng dẫn người dùng VI/EN, nguồn guides/slides/HTML graphics và các generator. Xuất lại bốn DOCX, bảy PDF, hai PPTX r4 và 20 ảnh có domain; avatar giữ nguyên. Bộ hiện hành có 34 bản xuất, gồm 21 graphics.
- Đồng bộ hai ảnh OG từ bộ truyền thông vào nguồn brand chính thức, manifest checksum và bản xuất website. Logo, font, bảng màu và phiên bản nhận diện 1.0.0 được giữ nguyên.
- Cập nhật canonical URL mặc định của website, sitemap, robots, README và các ví dụ website/Help trong kế hoạch rollout, marketing, kiểm thử mobile và tích hợp email. Chưa tự đặt địa chỉ người gửi email hay subdomain gửi mail.
- Làm mới snapshot hướng dẫn từ tám bài Help đã duyệt ở mỗi ngôn ngữ vì bộ cũ không còn khớp nguồn. Không thêm nội dung owner/Agent/prompt vào tài liệu công khai hoặc corpus.
- Cập nhật mục lục bàn giao, manifest và ZIP. Slide r3 chuyển vào archive; ZIP hiện hành dùng r4.

## Kiểm chứng local

`validate:brand`, `validate:public-content`, `skills:check`, `web:check`, `web:build` và `validate:launch` đạt. Website build 43 trang; Help search gồm 16 trang VI/EN. Kiểm tra domain đọc nội dung, ghi chú và quan hệ hyperlink trong Office; đọc chữ và đích hyperlink của PDF; đối chiếu nguồn HTML và OG; kiểm tra canonical của cả 43 trang website. Bản xuất hiện hành không còn hostname Nilaza cũ.

Đã xem toàn bộ 36 trang PDF cuối, gồm 16 trang slide, cùng 18 ảnh social và hai OG. Domain mới hiển thị đầy đủ, dấu tiếng Việt và bố cục không bị tràn. DOCX/PPTX được render lại bằng Office renderer trước khi chốt checksum. ZIP được kiểm tra CRC và đối chiếu từng bản xuất với file hiện hành.

Bằng chứng: [kết quả domain](../design/launch/open-reflection-v1/review/domain-update-2026-10-04.json), [render cuối](../design/launch/open-reflection-v1/review/documents/render-results.json), [manifest](../design/launch/open-reflection-v1/manifest.json), [kế hoạch và impact](feature-plans/official-brand-domain-2026-10-04.json). Skill brand/Plan QC vẫn phù hợp vì lấy thông tin chính thức từ Brand Guidelines/manifest; `skills:check` xác nhận bản cài khớp nguồn repo.

## Chủ sản phẩm xem lại

Mở [mục lục bàn giao](../design/launch/open-reflection-v1/README.md) hoặc [bản xem](../design/launch/open-reflection-v1/index.html); xem trang domain trong Brand Guidelines, trang cuối hướng dẫn nhanh, slide 8 VI/EN và chân ảnh social/OG. [ZIP cập nhật](../design/launch/open-reflection-v1/Nilaza-Open-Reflection-v1-preview.zip) chứa cả file Office chỉnh sửa được và nguồn truyền thông.

## Trạng thái hạ tầng và lịch sử

Đây là cập nhật tài liệu/media và cấu hình website local. Chưa cấu hình hoặc xác nhận DNS, TLS, triển khai website, origin của backend/Turnstile, redirect đăng nhập hay SMTP/domain gửi mail. Khi triển khai thực tế, đối chiếu các cấu hình đó với hostname mới theo release runbook; quyết định domain không chứng nhận website hoặc email đã hoạt động.

Giữ nguyên lịch sử DNS/email audit, ảnh kiểm chứng browser/native theo ngày chụp, slide archive và địa chỉ tài khoản ví dụ trong hướng dẫn Admin. Các bản đó không thuộc bộ truyền thông hiện hành. Ảnh app trong ấn phẩm vẫn là web preview có nhãn dữ liệu kiểm thử; nghiệm thu RC và ảnh store native là cổng riêng. Không sửa dữ liệu người dùng, migration, mobile/Admin hay phát hành từ tác vụ này.

Rollback chỉ khôi phục các file thuộc tác vụ từ bản sao local trong `.brand-work/domain-update-20261004/before`, rồi sinh lại exports và chạy kiểm tra. Bảo toàn các thay đổi đang làm của tác vụ khác; không reset toàn repo.
