# Tên lá bài tiếng Việt — bản nháp chờ Owner duyệt

Trạng thái: **bản nháp, chưa đưa vào dữ liệu app**. Sau khi Owner duyệt (hoặc sửa từng tên), tên sẽ được ghi vào `name.vi` trong `packages/content/data/tarot-cards.json`. Tên tiếng Anh vẫn hiện làm dòng phụ, ví dụ: **Ngôi Sao** — The Star · Ẩn chính XVII · Xuôi.

## Quy ước đề xuất

- Theo cách gọi phổ biến trong cộng đồng tarot Việt Nam.
- Bộ ẩn phụ: Gậy (Wands), Cốc (Cups), Kiếm (Swords), Tiền (Pentacles).
- Số: Át, Hai, Ba … Mười. Lá hoàng gia: Tiểu Đồng (Page), Hiệp Sĩ (Knight), Nữ Hoàng (Queen), Vua (King).
- Dùng **Nữ Hoàng** cho Queen để không trùng **Hoàng Hậu** (The Empress).

## Các tên cần Owner chú ý

| Lá | Đề xuất | Phương án khác | Ghi chú |
|---|---|---|---|
| Death | Cái Chết | Sự Chuyển Hóa | Tên phổ biến nhất là "Cái Chết"; lá này nói về kết thúc để bắt đầu, không phải cái chết thật. Có thể giữ tên phổ biến và để phần ý nghĩa giải thích. |
| The Devil | Ác Quỷ | Quỷ Dữ | Tên phổ biến. |
| The Lovers | Tình Nhân | Những Người Yêu Nhau | "Tình Nhân" ngắn, vừa thẻ. |
| The Hierophant | Giáo Hoàng | Người Truyền Đạo | "Giáo Hoàng" phổ biến; phương án khác trung tính tôn giáo hơn. |
| Pentacles | Tiền | Đồng Xu | "Tiền" ngắn và phổ biến; "Đồng Xu" sát hình ảnh lá bài hơn. |
| Page | Tiểu Đồng | Thị Đồng | Cả hai đều được dùng. |

## Bảng 78 lá

| # | Mã lá | Tên tiếng Anh | Tên tiếng Việt đề xuất | Nhóm |
|---|---|---|---|---|
| 1 | `major-00-fool` | The Fool | **Kẻ Khờ** | Ẩn chính 0 |
| 2 | `major-01-magician` | The Magician | **Nhà Ảo Thuật** | Ẩn chính I |
| 3 | `major-02-high-priestess` | The High Priestess | **Nữ Tư Tế** | Ẩn chính II |
| 4 | `major-03-empress` | The Empress | **Hoàng Hậu** | Ẩn chính III |
| 5 | `major-04-emperor` | The Emperor | **Hoàng Đế** | Ẩn chính IV |
| 6 | `major-05-hierophant` | The Hierophant | **Giáo Hoàng** | Ẩn chính V |
| 7 | `major-06-lovers` | The Lovers | **Tình Nhân** | Ẩn chính VI |
| 8 | `major-07-chariot` | The Chariot | **Cỗ Xe** | Ẩn chính VII |
| 9 | `major-08-strength` | Strength | **Sức Mạnh** | Ẩn chính VIII |
| 10 | `major-09-hermit` | The Hermit | **Ẩn Sĩ** | Ẩn chính IX |
| 11 | `major-10-wheel` | Wheel of Fortune | **Bánh Xe Số Phận** | Ẩn chính X |
| 12 | `major-11-justice` | Justice | **Công Lý** | Ẩn chính XI |
| 13 | `major-12-hanged-man` | The Hanged Man | **Người Treo Ngược** | Ẩn chính XII |
| 14 | `major-13-death` | Death | **Cái Chết** | Ẩn chính XIII |
| 15 | `major-14-temperance` | Temperance | **Tiết Chế** | Ẩn chính XIV |
| 16 | `major-15-devil` | The Devil | **Ác Quỷ** | Ẩn chính XV |
| 17 | `major-16-tower` | The Tower | **Tòa Tháp** | Ẩn chính XVI |
| 18 | `major-17-star` | The Star | **Ngôi Sao** | Ẩn chính XVII |
| 19 | `major-18-moon` | The Moon | **Mặt Trăng** | Ẩn chính XVIII |
| 20 | `major-19-sun` | The Sun | **Mặt Trời** | Ẩn chính XIX |
| 21 | `major-20-judgement` | Judgement | **Phán Xét** | Ẩn chính XX |
| 22 | `major-21-world` | The World | **Thế Giới** | Ẩn chính XXI |
| 23 | `minor-wands-ace` | Ace of Wands | **Át Gậy** | Bộ Gậy |
| 24 | `minor-wands-two` | Two of Wands | **Hai Gậy** | Bộ Gậy |
| 25 | `minor-wands-three` | Three of Wands | **Ba Gậy** | Bộ Gậy |
| 26 | `minor-wands-four` | Four of Wands | **Bốn Gậy** | Bộ Gậy |
| 27 | `minor-wands-five` | Five of Wands | **Năm Gậy** | Bộ Gậy |
| 28 | `minor-wands-six` | Six of Wands | **Sáu Gậy** | Bộ Gậy |
| 29 | `minor-wands-seven` | Seven of Wands | **Bảy Gậy** | Bộ Gậy |
| 30 | `minor-wands-eight` | Eight of Wands | **Tám Gậy** | Bộ Gậy |
| 31 | `minor-wands-nine` | Nine of Wands | **Chín Gậy** | Bộ Gậy |
| 32 | `minor-wands-ten` | Ten of Wands | **Mười Gậy** | Bộ Gậy |
| 33 | `minor-wands-page` | Page of Wands | **Tiểu Đồng Gậy** | Bộ Gậy |
| 34 | `minor-wands-knight` | Knight of Wands | **Hiệp Sĩ Gậy** | Bộ Gậy |
| 35 | `minor-wands-queen` | Queen of Wands | **Nữ Hoàng Gậy** | Bộ Gậy |
| 36 | `minor-wands-king` | King of Wands | **Vua Gậy** | Bộ Gậy |
| 37 | `minor-cups-ace` | Ace of Cups | **Át Cốc** | Bộ Cốc |
| 38 | `minor-cups-two` | Two of Cups | **Hai Cốc** | Bộ Cốc |
| 39 | `minor-cups-three` | Three of Cups | **Ba Cốc** | Bộ Cốc |
| 40 | `minor-cups-four` | Four of Cups | **Bốn Cốc** | Bộ Cốc |
| 41 | `minor-cups-five` | Five of Cups | **Năm Cốc** | Bộ Cốc |
| 42 | `minor-cups-six` | Six of Cups | **Sáu Cốc** | Bộ Cốc |
| 43 | `minor-cups-seven` | Seven of Cups | **Bảy Cốc** | Bộ Cốc |
| 44 | `minor-cups-eight` | Eight of Cups | **Tám Cốc** | Bộ Cốc |
| 45 | `minor-cups-nine` | Nine of Cups | **Chín Cốc** | Bộ Cốc |
| 46 | `minor-cups-ten` | Ten of Cups | **Mười Cốc** | Bộ Cốc |
| 47 | `minor-cups-page` | Page of Cups | **Tiểu Đồng Cốc** | Bộ Cốc |
| 48 | `minor-cups-knight` | Knight of Cups | **Hiệp Sĩ Cốc** | Bộ Cốc |
| 49 | `minor-cups-queen` | Queen of Cups | **Nữ Hoàng Cốc** | Bộ Cốc |
| 50 | `minor-cups-king` | King of Cups | **Vua Cốc** | Bộ Cốc |
| 51 | `minor-swords-ace` | Ace of Swords | **Át Kiếm** | Bộ Kiếm |
| 52 | `minor-swords-two` | Two of Swords | **Hai Kiếm** | Bộ Kiếm |
| 53 | `minor-swords-three` | Three of Swords | **Ba Kiếm** | Bộ Kiếm |
| 54 | `minor-swords-four` | Four of Swords | **Bốn Kiếm** | Bộ Kiếm |
| 55 | `minor-swords-five` | Five of Swords | **Năm Kiếm** | Bộ Kiếm |
| 56 | `minor-swords-six` | Six of Swords | **Sáu Kiếm** | Bộ Kiếm |
| 57 | `minor-swords-seven` | Seven of Swords | **Bảy Kiếm** | Bộ Kiếm |
| 58 | `minor-swords-eight` | Eight of Swords | **Tám Kiếm** | Bộ Kiếm |
| 59 | `minor-swords-nine` | Nine of Swords | **Chín Kiếm** | Bộ Kiếm |
| 60 | `minor-swords-ten` | Ten of Swords | **Mười Kiếm** | Bộ Kiếm |
| 61 | `minor-swords-page` | Page of Swords | **Tiểu Đồng Kiếm** | Bộ Kiếm |
| 62 | `minor-swords-knight` | Knight of Swords | **Hiệp Sĩ Kiếm** | Bộ Kiếm |
| 63 | `minor-swords-queen` | Queen of Swords | **Nữ Hoàng Kiếm** | Bộ Kiếm |
| 64 | `minor-swords-king` | King of Swords | **Vua Kiếm** | Bộ Kiếm |
| 65 | `minor-pentacles-ace` | Ace of Pentacles | **Át Tiền** | Bộ Tiền |
| 66 | `minor-pentacles-two` | Two of Pentacles | **Hai Tiền** | Bộ Tiền |
| 67 | `minor-pentacles-three` | Three of Pentacles | **Ba Tiền** | Bộ Tiền |
| 68 | `minor-pentacles-four` | Four of Pentacles | **Bốn Tiền** | Bộ Tiền |
| 69 | `minor-pentacles-five` | Five of Pentacles | **Năm Tiền** | Bộ Tiền |
| 70 | `minor-pentacles-six` | Six of Pentacles | **Sáu Tiền** | Bộ Tiền |
| 71 | `minor-pentacles-seven` | Seven of Pentacles | **Bảy Tiền** | Bộ Tiền |
| 72 | `minor-pentacles-eight` | Eight of Pentacles | **Tám Tiền** | Bộ Tiền |
| 73 | `minor-pentacles-nine` | Nine of Pentacles | **Chín Tiền** | Bộ Tiền |
| 74 | `minor-pentacles-ten` | Ten of Pentacles | **Mười Tiền** | Bộ Tiền |
| 75 | `minor-pentacles-page` | Page of Pentacles | **Tiểu Đồng Tiền** | Bộ Tiền |
| 76 | `minor-pentacles-knight` | Knight of Pentacles | **Hiệp Sĩ Tiền** | Bộ Tiền |
| 77 | `minor-pentacles-queen` | Queen of Pentacles | **Nữ Hoàng Tiền** | Bộ Tiền |
| 78 | `minor-pentacles-king` | King of Pentacles | **Vua Tiền** | Bộ Tiền |
