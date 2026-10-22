# Tinh Quang — kết quả tích hợp miễn phí ngày 18/10/2026

Tinh Quang / Celestial Reverie đã được tích hợp vào dữ liệu và bản dựng local của Nilaza với **hạng Free**. Bộ có đủ 78 lá, bìa, mặt lưng, nội dung VI/EN riêng và khai báo tài sản theo cấu trúc các bộ hiện có. Trạng thái hiện tại là **ứng viên tích hợp local**, chưa phải bản phát hành hoặc dữ liệu đã đồng bộ cloud.

## Kết quả và vị trí dữ liệu

| Hạng mục | Kết quả và đường dẫn chuẩn |
| --- | --- |
| Metadata bộ bài | `packages/content/data/tarot-decks.json`: thêm `tinh-quang`, `accessTier: free`, `status: active`, đủ 78 lời giới thiệu VI/EN. Toàn bộ catalog có 8 bộ: 4 Free và 4 Premium-preview. |
| Thiết kế từng lá | `packages/content/data/tarot-card-designs.json`: đủ 78 mô tả đã duyệt; dùng nội dung lá chuẩn trong `tarot-cards.json`. |
| Metadata mặt lưng | `packages/content/data/tarot-deck-backs.json`, cùng đường dẫn chuẩn của các bộ khác. |
| Nguồn / mặt card | `assets/tarot/tinh-quang/artwork/{cardId}.png` / `cards/{cardId}.png`. Cả 78 nguồn và 78 mặt card giữ nguyên hash so với hồ sơ render đã duyệt. |
| Bìa | `assets/tarot/deck-covers/tinh-quang.png`: minh họa cảnh hồ, núi và sao vàng theo phong cách Tinh Quang, tạo bằng công cụ image_gen; tranh Star chỉ làm tham chiếu phong cách. |
| Mặt lưng | `assets/tarot/deck-backs/tinh-quang.png`; nguồn vector ở `assets/tarot/tinh-quang/deck-back.svg`. Đối xứng pixel chính xác khi xoay 180°. |
| Tài sản mobile | 78 JPEG 720×1243 trong `apps/mobile/assets/runtime/tarot/tinh-quang/cards/`; thêm JPEG bìa và lưng trong hai thư mục runtime `deck-covers/`, `deck-backs/`. |
| Trải nghiệm nội dung | Đã khai báo story, cách dùng, đối tượng, 8 câu hỏi phản chiếu, trải mẫu và tên chủ đề VI/EN riêng cho Tinh Quang. |
| Admin | Seed chuẩn được tạo lại; mô hình dữ liệu gồm 8 bộ / 624 bản ghi lá theo bộ, trong đó 78 bản ghi Tinh Quang. Chưa publish. |

App dùng các đường dẫn source/runtime tiêu chuẩn. Không sửa cấu hình để đọc từ thư mục PART, gói lồng hoặc staging. Logic quyền truy cập và credits hiện có được giữ nguyên; Free là hạng của bộ bài, các quy tắc credits/provider chung vẫn áp dụng. Trong `workflow-catalog.js`, chỉ cập nhật digest nguồn App để bằng chứng parity khớp thay đổi này.

Các mục của 7 bộ trước giữ nguyên trong cả ba mảng metadata. Nội dung 78 lá dùng chung, spec, scene manifest, archive và gói staging lịch sử được giữ nguyên. Các thay đổi mô tả cảnh Devil, Ten of Pentacles và Nine of Cups đã được duyệt ở bước trước và được chuyển nguyên sang metadata hoạt động.

## Review và soát lỗi

[Ledger đầy đủ](../assets/tarot/tinh-quang/quality-review.json) đã PASS **78/78 lá, bìa và mặt lưng**, gồm 702 kiểm tra cho các lá. Không có artwork nào bị loại hoặc yêu cầu tạo lại trong bản nguồn đã chọn. Các gói nguồn và biến thể lịch sử vẫn được giữ lại.

78 lá đã có review ảnh riêng ở kích thước gốc và mobile trong [hồ sơ render](TINH_QUANG_RENDER_QC_2026-10-18.vi.md). Lượt này tái sử dụng bằng chứng đó sau khi reviewer độc lập đối chiếu hash từng ảnh nguồn, mặt card, nội dung, lời giới thiệu và dữ liệu cảnh; không tuyên bố đã mở lại toàn bộ 78 ảnh. Bìa và mặt lưng mới được review độc lập tại kích thước gốc, mobile và các crop liên quan. Bốn JPEG runtime được kiểm nhìn bổ sung; toàn bộ 78 JPEG được kiểm roster, kích thước và đóng gói.

Xem [đánh giá độc lập và phương pháp](../artifacts/tinh-quang-free-integration-2026-10-18/final-content-asset-review.json), [nguồn tạo bìa/lưng và prompt](../artifacts/tinh-quang-free-integration-2026-10-18/asset-production.json), [gallery 78 lá cùng bìa/lưng](../artifacts/tinh-quang-free-integration-2026-10-18/gallery.html). Gallery là công cụ xem tài sản, không phải ảnh chụp luồng ứng dụng.

## Kiểm chứng kỹ thuật

| Kiểm tra | Kết quả |
| --- | --- |
| Full-deck gate, có yêu cầu intro riêng | PASS 78 lá + bìa + lưng |
| Data và visual assets | PASS; 764 tài sản runtime toàn app, 74,59 MiB, trong giới hạn 90 MiB |
| Mobile typecheck | PASS |
| Mobile tests | PASS 52 suites / 323 tests |
| Kiểm thử runtime assets và intake | PASS 17/17 |
| Admin check và tests | PASS; 169/169 tests |
| Governance | PASS |
| Web export | PASS, 82,21 MiB; đủ 78 mặt Tinh Quang cùng bìa/lưng |
| Android embedded export | PASS; xác nhận đủ 80 tài sản Tinh Quang trong gói. Đây là JS bundle và assets, chưa phải APK hoặc nghiệm thu thiết bị. |
| Browser | Đã quan sát màn hình welcome và cổng đăng nhập. Luồng Tarot sau đăng nhập, Admin sau đăng nhập và Android thật chưa nghiệm thu. |

Lần chạy Jest đầu gặp lỗi quyền truy cập cache tạm trên Windows. Chạy lại với `--cacheDirectory` trong thư mục artifacts của tác vụ đã PASS toàn bộ; không sửa cấu hình ứng dụng hoặc giảm kiểm tra. Log lần đầu và lần chạy thành công đều được lưu.

Bằng chứng, hash và đường dẫn bản dựng ở [integration-manifest.json](../artifacts/tinh-quang-free-integration-2026-10-18/integration-manifest.json); audit phạm vi ở [implementation-audit.json](../artifacts/tinh-quang-free-integration-2026-10-18/implementation-audit.json). [Feature plan](feature-plans/tinh-quang-free-integration-2026-10-18.json) ghi impact, preflight, phạm vi và rollback.

## Việc tiếp theo để dùng trong ứng dụng

1. **Nghiệm thu Android bằng tài khoản QA do Owner kiểm soát.** Kiểm tìm bộ Free, xem đủ thư viện 78 lá, đổi VI/EN, rút 1/3 lá, kết quả, lưu/mở lại Journal, follow-up, trải thứ hai và phục hồi lỗi. Dùng [8 kịch bản có tiêu chí cụ thể](../artifacts/tinh-quang-free-integration-2026-10-18/owner-scenarios.vi.md). Hiện các kịch bản này vẫn là unverified.
2. **Nghiệm thu Admin đã đăng nhập.** Kiểm Tinh Quang Free, 78 bản ghi, preview bìa/lưng trong Content Operations và xác nhận AI Studio vẫn truy cập được. Audit mô hình dữ liệu đã PASS; chưa thay thế bước kiểm UI này.
3. **Chuẩn bị và phê duyệt publication/sync trên đúng backend.** Published bundle hiện thay thế danh sách local; nếu bundle remote chưa có Tinh Quang, bản đăng nhập có thể chưa hiển thị bộ này. Cần kiểm target, packet publication, metadata và tài sản remote rồi mới thực hiện thao tác đã được Owner phê duyệt. Không thay logic merge hoặc cấu hình để lách ranh giới này.
4. **Sau nghiệm thu, tiếp tục gate Android/Google Play theo runbook release.** Chưa có APK nghiệm thu, phát hành store hoặc phê duyệt production. iOS native hoãn theo quyết định Owner, không ghi PASS và không chặn ứng viên Android.

Lượt này có **0 thao tác ghi cloud**, không SQL, không retarget backend, không thay credentials và không phát hành. Đây là các bước riêng, không được suy ra từ `status: active` trong dữ liệu local.

## Kiểm lại và rollback

```text
node scripts/tarot-deck-quality-gate.mjs verify --deck tinh-quang --require-deck-intros
npm run validate:data
npm run validate:visual-assets
```

`tarot-staging/tinh-quang` là hồ sơ lịch sử, không phải nguồn runtime. Intake CLI chủ động từ chối bộ đã active; không chạy lại prepare hoặc sửa guard. Nếu artwork hoặc nội dung mang nghĩa thay đổi, cần mở lại QC phần bị ảnh hưởng trước khi tạo runtime mới.

Nếu cần rút ứng viên local, dùng [baseline manifest](../artifacts/tinh-quang-free-integration-2026-10-18/baseline-manifest.json) để đối chiếu và chỉ gỡ các mục/binding/tài sản Tinh Quang mới, sau đó tạo lại Admin seed theo gate. Không khôi phục toàn file một cách mù quáng vì workspace có các thay đổi khác. Giữ nguyên 78 ảnh nguồn/mặt card đã duyệt và các archive.
