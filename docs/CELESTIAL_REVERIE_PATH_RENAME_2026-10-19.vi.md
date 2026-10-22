# Đổi đường dẫn Tinh Quang sang Celestial Reverie

Ngày 19/10/2026, theo yêu cầu Owner: ID/slug và thư mục chuẩn của bộ bài đổi từ `tinh-quang` thành **`celestial-reverie`**, cùng quy ước chữ thường, dấu gạch nối và thư mục trùng ID như các bộ khác. Tên hiển thị VI **Tinh Quang**, EN **Celestial Reverie** và hạng **Free** giữ nguyên.

## Các đường dẫn hiện tại

| Dữ liệu/tài sản | Đường dẫn |
| --- | --- |
| Thư mục nguồn | `assets/tarot/celestial-reverie/` |
| Artwork / mặt card | `assets/tarot/celestial-reverie/artwork/{cardId}.png` / `cards/{cardId}.png` |
| Spec / scene manifest | `assets/tarot/celestial-reverie/card-spec.json` / `celestial-reverie-full-deck-manifest.json` |
| Bìa / mặt lưng nguồn | `assets/tarot/deck-covers/celestial-reverie.png` / `deck-backs/celestial-reverie.png` |
| Runtime 78 lá | `apps/mobile/assets/runtime/tarot/celestial-reverie/cards/{cardId}.jpg` |
| Bìa / mặt lưng runtime | `apps/mobile/assets/runtime/tarot/deck-covers/celestial-reverie.jpg` / `deck-backs/celestial-reverie.jpg` |
| Hồ sơ staging lịch sử | `packages/content/data/tarot-staging/celestial-reverie/` |
| QC hiện tại | `assets/tarot/celestial-reverie/quality-review.json` |

Ba mảng dữ liệu chuẩn `tarot-decks.json`, `tarot-card-designs.json`, `tarot-deck-backs.json`, các mapping ảnh/story/sample trong App và seed Admin đã đồng bộ ID mới. Không thêm trường đường dẫn đặc biệt, alias thư mục hoặc ngoại lệ vào exporter/validator. Những thư mục/tệp hoạt động mang tên cũ đã được chuyển đi.

## Dữ liệu cũ và tính toàn vẹn

- Chuyển 391 tệp theo [inventory trước/sau](../artifacts/celestial-reverie-path-rename-2026-10-19/move-inventory.json). 387 tệp, gồm 336 PNG/JPEG và các archive, staging, ledger lịch sử giữ nguyên byte; bốn ngoại lệ được duyệt là spec, scene manifest, ledger QC hiện tại và README. Không render hoặc nén lại ảnh.
- Toàn bộ ba mảng metadata, spec và scene khớp bản trước sau khi chuẩn hóa đúng 167 trường ID/đường dẫn được cho phép. Nội dung VI/EN, 78 lời giới thiệu, prompt, ý nghĩa, hình học, 7 bộ khác và `tarot-cards.json` giữ nguyên.
- App đọc được saved selection và Journal mang ID cũ hoặc mới. Nếu chỉ có bộ cũ trong một published bundle, lookup vẫn nhận đúng bản ghi do bundle cung cấp; không tự bổ sung bộ local vào bundle remote. Ảnh/story/sample của cả hai ID dùng duy nhất tài sản chuẩn `celestial-reverie`.
- Admin chuyển định danh của cache/outbox và 78 composite card IDs khi đọc, giữ bản nháp, overrides, status, thời gian và versions. Nếu ID cũ/mới đụng nhau, giữ nguyên mọi bản ghi, hiện thông báo và chặn sync cho tới khi xử lý; không tự gộp, xóa hoặc reset cache. Các compact row chưa nhận diện và custom override cũng được giữ qua roundtrip.
- Công cụ intake lịch sử chặn cả hai ID đang active trước khi đọc đường dẫn cũ, tránh vô tình tạo lại thư mục cũ.

Các ZIP và thư mục package con giữ tên gốc để bảo toàn nguồn nhập. Nội dung staging và các ledger render/source cũ vẫn ghi đường dẫn lúc thực hiện; chúng là lịch sử, không phải nguồn runtime. Không sửa hash hay lệnh render cũ để giả lập đã tạo lại ảnh. Báo cáo/artifact ngày 18/10 giữ nguyên; khi tra cứu đường dẫn cũ, áp dụng mapping ở biên bản này và dùng gallery hiện tại bên dưới.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| QC chuẩn với ID mới | PASS 78 lá, bìa và mặt lưng |
| Chuyển bằng chứng QC | PASS: byte ảnh không đổi, metadata chỉ đổi ID/path; giữ reviewer, ngày và kết luận cũ. Không tuyên bố review ảnh mới. |
| Nguồn ảnh, dữ liệu, runtime và TypeScript | PASS; runtime toàn app vẫn 764 tệp, 74,59 MiB |
| Mobile | PASS 53 suites / 327 tests; thêm lượt cuối 4 kiểm thử resolver sau sửa alias hai chiều |
| Admin | PASS check và 176/176 tests, gồm kiểm bảo toàn 78 bản ghi, bản nháp, collision và compact overrides |
| Intake lịch sử | PASS 10/10 tests, gồm guard từ chối ID mới đã active |
| Đóng gói | Gói web và Android embedded được kiểm bằng `check-rename.mjs`; đủ 80 tài sản, không còn đường dẫn runtime cũ. Chi tiết/hash trong `rename-result.json`. |

Lượt test đầu chạy song song có timeout ở các test Astrology và điều hướng shell; chạy lại tuần tự đã PASS toàn bộ. Không tăng timeout, sửa bài test đó hoặc giảm điều kiện kiểm tra. Bản xuất web đầu được dừng để nhường tài nguyên; bản cuối dùng 2 worker theo tùy chọn CLI hiện có. Log gốc và các lượt sau đều được giữ.

Bằng chứng: [QC transfer](../artifacts/celestial-reverie-path-rename-2026-10-19/qc-transfer-evidence.json), [QC verify](../artifacts/celestial-reverie-path-rename-2026-10-19/qc-rebind-verification.json), [kết quả tổng hợp và hash bản dựng](../artifacts/celestial-reverie-path-rename-2026-10-19/rename-result.json), [gallery 78 lá cùng bìa/lưng](../artifacts/celestial-reverie-path-rename-2026-10-19/gallery.html), [plan và phạm vi](feature-plans/celestial-reverie-path-rename-2026-10-19.json). Gallery chỉ xem tài sản, không phải bằng chứng UI đã đăng nhập.

## Phạm vi còn lại và rollback

Lượt đổi tên không ghi cloud, đổi target, credentials, API/schema hoặc phát hành. Nghiệm thu Tarot/Admin đã đăng nhập và Android thật còn là gate riêng như [báo cáo tích hợp trước](TINH_QUANG_FREE_INTEGRATION_2026-10-18.vi.md). Khi publication/sync được phê duyệt, dùng slug `celestial-reverie`; nếu backend có bản ghi cũ thì giữ cùng UUID và thực hiện kế hoạch đổi slug riêng để tránh tạo trùng. Published bundle vẫn thay thế danh sách local theo hợp đồng hiện tại. iOS native tiếp tục hoãn theo quyết định Owner.

Nếu rollback local, đảo chiều mapping đường dẫn và chỉ hoàn tác các trường identity/path cùng mã tương thích liên quan, đối chiếu snapshots trong `artifacts/celestial-reverie-path-rename-2026-10-19/before/`; tạo lại Admin seed theo gate. Không restore toàn file đè các thay đổi ngoài tác vụ hoặc reset dữ liệu người dùng.

Kiểm QC hiện tại:

```text
node scripts/tarot-deck-quality-gate.mjs verify --deck celestial-reverie --require-deck-intros
npm run validate:data
npm run validate:visual-assets
```
