# Tinh Quang — bộ miễn phí, ứng viên tích hợp local

Ngày 19/10/2026: ID/slug và thư mục chuẩn đổi thành `celestial-reverie`, theo tên EN Celestial Reverie. Tên VI “Tinh Quang”, hạng Free và mọi byte ảnh được giữ nguyên. Xem [biên bản đổi đường dẫn](../../../docs/CELESTIAL_REVERIE_PATH_RENAME_2026-10-19.vi.md).

Artwork chuẩn: `artwork/{cardId}.png`; mặt card chuẩn: `cards/{cardId}.png`; contact sheets: `contact-sheets/`. Tinh Quang dùng cùng cấu trúc `assets/tarot/<deckId>` như các bộ hiện có. Không trỏ renderer/runtime vào thư mục PART hoặc draft.

Ngày 18/10/2026: đã hoàn tất review nguồn, 78 mặt card, bìa, mặt lưng và tích hợp local với `accessTier: free`. Metadata hoạt động nằm trong ba mảng chuẩn `packages/content/data/tarot-decks.json`, `tarot-card-designs.json` và `tarot-deck-backs.json`. App có story, lời giới thiệu từng lá, câu hỏi và trải mẫu VI/EN riêng; Admin seed chiếu được 78 bản ghi Tinh Quang. Các gói nguồn và ZIP được giữ nguyên.

Ảnh bìa chuẩn: `assets/tarot/deck-covers/celestial-reverie.png`; mặt lưng: `assets/tarot/deck-backs/celestial-reverie.png`, có bản vector nguồn `deck-back.svg`. Runtime dùng 78 JPEG trong `apps/mobile/assets/runtime/tarot/celestial-reverie/cards/` và bìa/lưng tên `celestial-reverie.jpg` tại hai thư mục runtime `deck-covers/`, `deck-backs/`. Không có cấu hình bổ sung để đọc dữ liệu từ staging hoặc PART.

Ledger đầy đủ `quality-review.json` đã PASS 78 lá, bìa và lưng. Kết quả review mặt card cũ ở `rendered-card-review.json`; provenance ở `render-manifest.json`. Đánh giá từng lá trước đó được tái sử dụng sau khi đối chiếu hash ảnh, nội dung và dữ liệu cảnh; bìa/lưng mới được review độc lập. Hash hình/spec/content thay đổi thì phải review lại phần bị ảnh hưởng; validator không tự duyệt ảnh mới.

Kiểm lại bằng:

```text
node scripts/tarot-deck-quality-gate.mjs verify --deck celestial-reverie --require-deck-intros
npm run validate:data
npm run validate:visual-assets
```

Gói `packages/content/data/tarot-staging/celestial-reverie` là hồ sơ chuẩn bị lịch sử, được chuyển thư mục nhưng giữ nguyên nội dung/hash, không được app tiêu thụ và không cập nhật theo tiến độ hiện tại. Các ID/đường dẫn cũ bên trong gói và ba ledger lịch sử `artwork-review.json`, `rendered-card-review.json`, `render-manifest.json` mô tả đúng lần thực hiện trước đó; không sửa lại lịch sử để giả lập một lần render mới. Mapping chuyển vị trí nằm trong biên bản đổi đường dẫn. CLI `tinh-quang-intake.mjs` dành cho giai đoạn trước kích hoạt và từ chối cả ID cũ/mới đã active trước khi đọc đường dẫn cũ. Không chạy lại prepare hoặc sửa guard để vượt qua bước này.

Báo cáo tích hợp trước đổi tên: [tích hợp miễn phí](../../../docs/TINH_QUANG_FREE_INTEGRATION_2026-10-18.vi.md). [Gallery theo đường dẫn hiện tại](../../../artifacts/celestial-reverie-path-rename-2026-10-19/gallery.html) chỉ là công cụ xem tài sản. Còn nghiệm thu luồng Tarot/Admin đã đăng nhập, Android thật và publication/sync cloud theo target được phê duyệt. Chưa phát hành ứng dụng; iOS native hoãn theo quyết định Owner.
