# Tinh Quang — tạo và QC mặt card

Ngày 18/10/2026. Đã tạo đủ **78 mặt card PNG 1024 × 1768 px**, bằng renderer chuẩn đang dùng cho các bộ bài khác, không dùng placeholder. Kết quả review độc lập: **78/78 đạt mặt card, 0 cần sửa, 0 chờ làm rõ**. Các ảnh nguồn và gói bàn giao được giữ nguyên.

[**Xem gallery 78 card**](../artifacts/tinh-quang-render-2026-10-18/gallery.html) · [Thư mục PNG chuẩn](../assets/tarot/tinh-quang/cards) · [7 contact sheets](../assets/tarot/tinh-quang/contact-sheets) · [Ledger từng lá](../assets/tarot/tinh-quang/rendered-card-review.json)

## Cấu trúc và đường dẫn

Đã đối chiếu với Moon Garden/Rose Mirror và kiểm tra hình học bằng spec Classic Arcana. Tinh Quang đang đúng cấu trúc; không cần di chuyển dữ liệu hoặc sửa cấu hình để hỗ trợ thư mục lồng trong gói nhập.

| Thành phần | Đường dẫn chuẩn |
| --- | --- |
| Artwork đã duyệt | `assets/tarot/tinh-quang/artwork/{cardId}.png` |
| Mặt card đã render | `assets/tarot/tinh-quang/cards/{cardId}.png` |
| Contact sheets | `assets/tarot/tinh-quang/contact-sheets/tinh-quang-review-01.png` … `07.png` |
| Card spec | `assets/tarot/tinh-quang/card-spec.json` |
| Kế hoạch cảnh | `assets/tarot/tinh-quang/tinh-quang-full-deck-manifest.json` |
| Hash/provenance của lượt render | `assets/tarot/tinh-quang/render-manifest.json` |
| QC mặt card | `assets/tarot/tinh-quang/rendered-card-review.json` |

**Không sửa renderer, validator, đường dẫn runtime, cấu hình ứng dụng hoặc dữ liệu của 7 bộ bài đang hoạt động.** Thư mục `packages/content/data/tarot-staging/tinh-quang` vẫn là gói chuẩn bị lịch sử; không được nối trực tiếp vào runtime. Khi bộ bài đủ điều kiện, metadata phải được hợp nhất vào các file chuẩn `tarot-decks.json`, `tarot-card-designs.json`, `tarot-deck-backs.json` trong `packages/content/data`.

## Kết quả kiểm tra

Các agent review độc lập đã kiểm tra ba nhóm 22 Major, 28 Wands/Cups và 28 Swords/Pentacles ở ảnh card mới, gồm bản gốc và kích thước nhỏ. Ledger giữ SHA-256 artwork/card, bằng chứng 7 tiêu chí và số lượng biểu tượng từng lá. Root xem lại toàn bộ 7 contact sheets và 4 lá có rủi ro về tiếp xúc vật/crop.

| Kiểm tra | Kết quả |
| --- | --- |
| Đúng roster 22 Major + 56 Minor, đúng tên file | 78/78 |
| Artwork khác nhau theo hash; không lặp ảnh nguồn chính xác | 78/78 |
| PNG giải mã được, đúng 1024 × 1768, góc alpha đúng mẫu | 78/78 |
| Artwork gốc và bản đã duyệt giữ nguyên checksum | 78/78 |
| Pixel vùng tranh hữu dụng giữ nguyên, chỉ áp mask/viền của template | 78/78 |
| Title/keywords/nhãn Arcana–rank vừa vùng chữ | 234/234 |
| Review trực quan riêng từng card | 78/78 đạt, 546 tiêu chí |
| Gallery: 78 link ảnh tồn tại và các bộ lọc hoạt động | Đạt kiểm tra DOM; không coi là screenshot app |
| Validator Tarot chuẩn | Đạt 78 card |
| `validate:data` | Đạt; vẫn 7 bộ bài hoạt động |
| `validate:visual-assets` | Đạt; runtime cũ 684 file, 62,36 MB |
| Feature preflight | Đạt trước khi render |

Dung lượng PNG nguồn mặt card khoảng **145.56 MiB**; đây chưa phải tài sản JPEG đưa vào gói ứng dụng. Renderer, card spec, canonical content, scene manifest và font thực tế đều được băm trong render manifest. Tiêu đề/từ khóa trên ảnh là tiếng Anh theo template hiện có; dữ liệu giải nghĩa và intro VI/EN vẫn được lưu riêng.

Thumbnail dùng để nhận diện lá và bố cục; dòng keywords nhỏ cần xem card lớn hoặc phần chữ của màn hình chi tiết. Chưa có bằng chứng hiển thị trên thiết bị Android cho Tinh Quang.

## Lá cần sửa/tạo lại

Không phát hiện lỗi mặt card buộc sửa hoặc artwork buộc tạo lại trong lượt này. Danh sách yêu cầu sửa hiện rỗng.

[Danh sách yêu cầu sửa](../artifacts/tinh-quang-render-2026-10-18/repair-requests.json). Ten of Wands giữ đủ 10 gậy và mép xe; Ten of Swords giữ 10 kiếm dựng ngoài người; Knight of Cups giữ khoảng nhìn chân ngựa như nguồn đã duyệt. Không chỉnh sửa hình minh họa hoặc nội dung VI/EN trong lượt render.

## Kết quả từng lá

| Lá | Kết quả | Biểu tượng suit quan sát |
| --- | --- | --- |
| The Fool | Đạt mặt card | Theo cảnh Major |
| The Magician | Đạt mặt card | Theo cảnh Major |
| The High Priestess | Đạt mặt card | Theo cảnh Major |
| The Empress | Đạt mặt card | Theo cảnh Major |
| The Emperor | Đạt mặt card | Theo cảnh Major |
| The Hierophant | Đạt mặt card | Theo cảnh Major |
| The Lovers | Đạt mặt card | Theo cảnh Major |
| The Chariot | Đạt mặt card | Theo cảnh Major |
| Strength | Đạt mặt card | Theo cảnh Major |
| The Hermit | Đạt mặt card | Theo cảnh Major |
| Wheel of Fortune | Đạt mặt card | Theo cảnh Major |
| Justice | Đạt mặt card | Theo cảnh Major |
| The Hanged Man | Đạt mặt card | Theo cảnh Major |
| Death | Đạt mặt card | Theo cảnh Major |
| Temperance | Đạt mặt card | Theo cảnh Major |
| The Devil | Đạt mặt card | Theo cảnh Major |
| The Tower | Đạt mặt card | Theo cảnh Major |
| The Star | Đạt mặt card | Theo cảnh Major |
| The Moon | Đạt mặt card | Theo cảnh Major |
| The Sun | Đạt mặt card | Theo cảnh Major |
| Judgement | Đạt mặt card | Theo cảnh Major |
| The World | Đạt mặt card | Theo cảnh Major |
| Ace of Wands | Đạt mặt card | 1 |
| Two of Wands | Đạt mặt card | 2 |
| Three of Wands | Đạt mặt card | 3 |
| Four of Wands | Đạt mặt card | 4 |
| Five of Wands | Đạt mặt card | 5 |
| Six of Wands | Đạt mặt card | 6 |
| Seven of Wands | Đạt mặt card | 7 |
| Eight of Wands | Đạt mặt card | 8 |
| Nine of Wands | Đạt mặt card | 9 |
| Ten of Wands | Đạt mặt card | 10 |
| Page of Wands | Đạt mặt card | 1 |
| Knight of Wands | Đạt mặt card | 1 |
| Queen of Wands | Đạt mặt card | 1 |
| King of Wands | Đạt mặt card | 1 |
| Ace of Cups | Đạt mặt card | 1 |
| Two of Cups | Đạt mặt card | 2 |
| Three of Cups | Đạt mặt card | 3 |
| Four of Cups | Đạt mặt card | 4 |
| Five of Cups | Đạt mặt card | 5 |
| Six of Cups | Đạt mặt card | 6 |
| Seven of Cups | Đạt mặt card | 7 |
| Eight of Cups | Đạt mặt card | 8 |
| Nine of Cups | Đạt mặt card | 9 |
| Ten of Cups | Đạt mặt card | 10 |
| Page of Cups | Đạt mặt card | 1 |
| Knight of Cups | Đạt mặt card | 1 |
| Queen of Cups | Đạt mặt card | 1 |
| King of Cups | Đạt mặt card | 1 |
| Ace of Swords | Đạt mặt card | 1 |
| Two of Swords | Đạt mặt card | 2 |
| Three of Swords | Đạt mặt card | 3 |
| Four of Swords | Đạt mặt card | 4 |
| Five of Swords | Đạt mặt card | 5 |
| Six of Swords | Đạt mặt card | 6 |
| Seven of Swords | Đạt mặt card | 7 |
| Eight of Swords | Đạt mặt card | 8 |
| Nine of Swords | Đạt mặt card | 9 |
| Ten of Swords | Đạt mặt card | 10 |
| Page of Swords | Đạt mặt card | 1 |
| Knight of Swords | Đạt mặt card | 1 |
| Queen of Swords | Đạt mặt card | 1 |
| King of Swords | Đạt mặt card | 1 |
| Ace of Pentacles | Đạt mặt card | 1 |
| Two of Pentacles | Đạt mặt card | 2 |
| Three of Pentacles | Đạt mặt card | 3 |
| Four of Pentacles | Đạt mặt card | 4 |
| Five of Pentacles | Đạt mặt card | 5 |
| Six of Pentacles | Đạt mặt card | 6 |
| Seven of Pentacles | Đạt mặt card | 7 |
| Eight of Pentacles | Đạt mặt card | 8 |
| Nine of Pentacles | Đạt mặt card | 9 |
| Ten of Pentacles | Đạt mặt card | 10 |
| Page of Pentacles | Đạt mặt card | 1 |
| Knight of Pentacles | Đạt mặt card | 1 |
| Queen of Pentacles | Đạt mặt card | 1 |
| King of Pentacles | Đạt mặt card | 1 |

## Việc cần triển khai tiếp

1. Hoàn thiện bìa tại `assets/tarot/deck-covers/tinh-quang.png` và mặt lưng tại `assets/tarot/deck-backs/tinh-quang.png`; review riêng bìa/crop, motif và tính đối xứng 180° của mặt lưng.
2. Owner chọn hạng truy cập của bộ bài; `accessTier` hiện chưa có quyết định.
3. Hợp nhất metadata VI/EN đã duyệt vào ba file dữ liệu chuẩn trong `packages/content/data`; chạy cổng đầy đủ `tarot-deck-quality-gate.mjs prepare/verify --deck tinh-quang --require-deck-intros` với đủ 78 card, bìa và mặt lưng. Ledger mặt card hiện tại là bằng chứng hỗ trợ, không thay thế gate này.
4. Xuất JPEG qua builder hiện có vào `apps/mobile/assets/runtime/tarot/tinh-quang/cards`, `deck-covers/tinh-quang.jpg`, `deck-backs/tinh-quang.jpg`; bổ sung khai báo bộ bài theo mẫu chuẩn và tạo Admin seed. Không trỏ cấu hình sang thư mục draft hay package nguồn.
5. Kiểm tra dữ liệu, visual budget, mobile typecheck/tests, web export và Android bundle; Owner nghiệm thu Explore → bộ bài → thư viện → rút bài → kết quả ở VI/EN. iOS native tiếp tục hoãn theo quyết định Android-first.
6. Đồng bộ backend chỉ sau khi có phê duyệt target/migration phù hợp. Lượt này không thực hiện cloud SQL, retarget, đồng bộ dữ liệu hay phát hành.

Cổng full-deck đã được chạy và trả về BLOCKED do thiếu metadata active và bìa/mặt lưng, không tạo chứng nhận hoàn tất khi thiếu bằng chứng. Thông báo thiếu intro trong gate xuất phát từ việc chưa hợp nhất metadata vào mảng active; 78 intro đã duyệt vẫn nằm trong gói nháp. [Log](../artifacts/tinh-quang-render-2026-10-18/full-deck-gate.log). Báo cáo này xác nhận hoàn tất bước tạo/QC mặt card; bộ bài chưa hoạt động trong ứng dụng.

[Feature plan](feature-plans/tinh-quang-render-cards-2026-10-18.json) · [Kết quả kiểm tra kỹ thuật](../artifacts/tinh-quang-render-2026-10-18/validation-results.json). Rollback chỉ loại bỏ các output mới liệt kê trong render manifest; giữ nguyên toàn bộ source và 7 bộ bài hiện có.
