# Biên bản duyệt nội dung: "Hai hệ cùng nhìn bạn" (28/11/2026)

- **Tệp dữ liệu:** `packages/content/data/two-systems-blocks.json`, phiên bản `2026-11-28-draft1`, SHA-256 sau vòng 2 (28/11): `2432f84efb4c2014fc768de575c743fb522e368266522446c6b7c055b34fbc2a`.
- **Phạm vi:** 36 khối trục Mặt Trời (nguyên tố cung Mặt Trời × số chủ đạo gốc 1–9) + 36 khối trục Mặt Trăng (nguyên tố cung Mặt Trăng × số linh hồn gốc 1–9) + 4 khung nguyên tố (mỗi khung có `sunFrame`, `moonFrame`) + 16 chuỗi giao diện. Mỗi khối có `meet`, `differ`, `question`, song ngữ vi + en. Số 11/22 do app ánh xạ về 2/4, không có khối riêng.
- **Người soạn:** AI (phiên Claude Sonnet 5.5). **Người duyệt:** bốn reviewer độc lập (subagent chạy riêng, chỉ nhận brief và tệp): chiêm tinh, thần số học (cả hai theo brief `symbolic-systems`), ngôn ngữ, an toàn. Người soạn không tự chấm.
- **Trạng thái:** `draft`. Chờ Owner duyệt; mọi sửa sau đó cần Owner duyệt lại. Tệp không có ghi chú "chưa có chuyên gia ngoài" (Owner quyết 28/11, mục 3); validate chặn cả cụm này.
- **Chưa kiểm chứng:** không có chuyên gia con người; chưa đọc thử trên máy Android thật; chưa kiểm cách app ghép chuỗi `{number}`; chưa có Owner đọc.

## 1. Quy trình

1. Vòng 1: soạn 72 khối + khung + giao diện; `validate:data` bắt từ cấm ("nên", "phải", "khắc", "avoid", "never"... xuất hiện ở 18 chỗ) và câu trùng (4 khung `sunFrame` có chung câu cuối); sửa hết trước khi gửi duyệt.
2. Vòng 1 duyệt: bốn reviewer chạy song song trên toàn tệp.
3. Vòng 2: biên tập viên gộp phát hiện, sửa, chạy lại `validate:data` (đạt). Các sửa theo đúng đề xuất của reviewer; không có mục BLOCK.

## 2. Kết quả theo reviewer (vòng 1)

| Reviewer | Kết luận vòng 1 | Điểm chính |
|---|---|---|
| Chiêm tinh | PASS có sửa nhỏ | Danh sách cung trong 4 khung nguyên tố đúng; Mặt Trời nói về động lực/biểu đạt, Mặt Trăng nói về nhu cầu, tách trục tốt. REVISE nhẹ: vài dòng `differ` của sun.water/sun.earth trượt sang ngôn ngữ "nhu cầu" (giọng Mặt Trăng); vài `meet` của moon trượt sang giọng "làm"; hai câu hỏi giả định người dùng đang buồn. UNSURE: tên "Bọ Cạp" (khớp `contracts.ts` của app, Owner chọn có đổi "Thiên Yết" không). |
| Thần số học | PASS có sửa nhỏ | Ý nghĩa 1–9 khớp `numerology-blocks.json`; trục số chủ đạo (nhịp làm) và số linh hồn (mong muốn bên trong) tách rõ; không gán "số xấu". Sửa: sun.air.6 (lẫn với số 2), sun.water.2 (trùng góc với water.3), moon.earth.9 (thiếu màu của số 9). |
| Ngôn ngữ | REVISE nhẹ | Khuôn câu moon lặp ("còn mong muốn số N + muốn/cần": cứng, thừa); mở đầu "Ở chỗ gặp nhau" lặp ở cả 36 khối; khuôn "hai hệ cùng gợi một người" lặp ở sun; vài chỗ dịch sát chữ; vài lỗi tiếng Anh ("Whom", "see both systems look at you"). |
| An toàn | REVISE (11 mục) | Không có dự đoán, không "sẽ", không sức khỏe/tiền/quan hệ, không đặc điểm được bảo vệ, không tuổi/năm. Điểm yếu duy nhất: lời gọi tên cơ chế tâm lý như sự thật ("nén", "nuốt", "tránh", "che", "lý luận cho trôi") và câu hỏi giả định người dùng đang buồn hoặc đang giấu. UNSURE: câu "không gửi dữ liệu nào rời khỏi máy" trong `sourceNote`. |

## 3. Những gì đã sửa ở vòng 2

- **An toàn (đã xử lý đủ 11 mục):** sun.fire.2 và sun.water.4 (câu hỏi bớt dẫn dắt); moon.fire.2, fire.5, fire.6, air.3, air.5, air.6, air.8, air.9, water.9 (bỏ cách nói "nén/nuốt/tránh/che", thêm "có thể/có lúc", câu hỏi chuyển sang dạng "nếu có"). `sourceNote` đổi thành "Nội dung được ghép ngay trên máy bạn và không dùng AI" để không hứa điều mà app có thể không giữ (màn cần đăng nhập, nút Nhật ký).
- **Ngôn ngữ:** toàn trục moon đổi "còn mong muốn số N" thành "còn số linh hồn N" (en: "soul urge N"); bỏ "Ở chỗ gặp nhau" ở 18 khối (fire, earth), giữ ở 18 khối (air, water); đổi khuôn "hai hệ cùng gợi một người" ở sun.air và sun.water thành "cùng nhau, chúng gợi một người"; sửa các lỗi cụ thể reviewer nêu (moon.fire.5, fire.6, earth.9, air.4, fire.3 en, sun.water.6, sun.fire.9 en, ui.needSun, guestInvite, needBirthDate).
- **Thần số học / chiêm tinh:** viết lại phần số 6 của sun.air.6 (thêm trách nhiệm với người gần), differ của sun.water.2, meet của moon.earth.9; làm mềm câu "ai cũng dễ đến kể chuyện" thành "người khác có thể dễ tìm đến".

## 4. Phép thử "đổi số" và "đổi nguyên tố"

Phép thử: đổi số (hoặc đổi nguyên tố), câu còn đúng không? Còn đúng nghĩa là trượt.

| Nhóm | Đổi nguyên tố | Đổi số | Ghi chú |
|---|---|---|---|
| sun.fire (9) | 9/9 đạt | 9/9 đạt | |
| sun.earth (9) | 9/9 đạt | 9/9 đạt | earth.2 yếu nhất (sự có mặt có thể đọc như Nước), vẫn đạt |
| sun.air (9) | 9/9 đạt | 8/9 đạt, 1 sửa | air.6 lẫn với 2: đã sửa, đạt vòng 2 |
| sun.water (9) | 9/9 đạt | 8/9 đạt, 1 sửa | water.2 gần water.3: đã sửa |
| moon.fire (9) | 9/9 đạt | 9/9 đạt | fire.8 "được ghi nhận" gần số 3, neo bằng "sức nặng, đường dài" |
| moon.earth (9) | 9/9 đạt | 8/9 đạt, 1 sửa | earth.9 thiếu màu số 9: đã sửa |
| moon.air (9) | 9/9 đạt | 9/9 đạt | air.2 gần số 3, neo bằng "được hiểu/gần" |
| moon.water (9) | 9/9 đạt | 9/9 đạt | water.2 và water.6 cùng nghiêng sự gần gũi, tách bằng "hòa hợp" và "được ôm/quen là người ôm" |

Phép thử đổi nguyên tố ở reviewer chiêm tinh: Mặt Trời 36/36 và Mặt Trăng 36/36 đạt. Chồng lấn gần nhất: moon.fire.4 và moon.water.4 (cùng nói cảm xúc bất chợt), nhưng phần còn lại khác. Ghi nhận trung thực: một số khối hai hệ nói gần cùng một ý (ví dụ sun.earth.4, moon.earth.4); khi đó câu `differ` mang phần chính.

## 5. Kết luận theo nhóm (sau vòng 2)

Các mục đã sửa theo đúng đề xuất của reviewer chưa chạy lại vòng reviewer thứ hai; biên tập viên chỉ chạy `validate:data` (đạt: đủ 36 + 36 khóa, vi/en không rỗng, vi có dấu, từ cấm, không câu trùng, không số 4 chữ số, không nhắc tuổi/thế hệ). Nên coi các mục có sửa là "PASS chờ xác nhận vòng 2".

| Nhóm | Khối | PASS thẳng vòng 1 | Sửa rồi PASS chờ xác nhận | BLOCK |
|---|---|---|---|---|
| elements (4 khung) | 4 | 4 | 0 | 0 |
| ui (16 chuỗi) | 16 | 11 | 5 (needSun, needBirthDate, guestInvite, sourceNote, masterNote giữ nguyên) | 0 |
| sun.fire | 9 | 8 | 1 (fire.2 câu hỏi, fire.9 en) | 0 |
| sun.earth | 9 | 9 | 0 | 0 |
| sun.air | 9 | 8 | 1 (air.6) | 0 |
| sun.water | 9 | 5 | 4 (water.2, 4, 6, và ngôn ngữ) | 0 |
| moon.fire | 9 | 5 | 4 (fire.2, 3, 5, 6) | 0 |
| moon.earth | 9 | 8 | 1 (earth.9) | 0 |
| moon.air | 9 | 3 | 6 (air.3, 4, 5, 6, 8, 9) | 0 |
| moon.water | 9 | 8 | 1 (water.9) | 0 |

Tổng 72 khối: BLOCK 0. Khối cần sửa 18. Mục UNSURE: tên "Bọ Cạp"/"Thiên Yết" (Owner chọn, hiện khớp app); lời hứa riêng tư (đã làm mềm).

## 6. Chưa sửa có chủ ý (để Owner quyết)

- Vài câu hỏi gói hai ý trong một câu (sun.fire.4, sun.fire.7, moon.air.9, moon.water.9) và vài câu hỏi dạng chọn một trong hai (sun.air.2, moon.air.1, sun.water.7): chấp nhận được, yếu hơn câu hỏi mở thuần.
- `differ` của sun.water.7, sun.earth.8 còn dùng chữ "muốn/cần" (nghiêng giọng Mặt Trăng): lỗi nhẹ, không đổi nghĩa.
- `meet` của moon.fire.6, moon.water.8 còn nghiêng sang "làm": lỗi nhẹ.
- Khuôn mở đầu chung của moon ("Nhu cầu cảm xúc kiểu X là..., còn mong muốn bên trong của số linh hồn N là...") giữ có chủ ý để trục Mặt Trăng có nhận diện riêng; reviewer ngôn ngữ cho là chấp nhận được.
- Nội dung chỉ ở mức nguyên tố nên gộp 3 cung mỗi nguyên tố; khung nguyên tố đã có câu "để tự soi chứ không định nghĩa bạn".

## 7. Cần Owner đọc kiểm (spot check)

Ít nhất: moon.air.9, moon.water.9, moon.fire.6, sun.air.6, sun.water.2, moon.earth.9 (các khối viết lại), cùng 10% ngẫu nhiên còn lại; và ba chuỗi giao diện needSun, needMoon, sourceNote.

## 8. Vòng 2 (28/11)

Biên tập viên (AI) tự đọc lại toàn tệp theo từng lăng kính, ghi rõ từng lăng kính; chưa có reviewer độc lập thứ hai và chưa có chuyên gia người. Các mục "PASS chờ xác nhận vòng 2" ở mục 5 được xác nhận theo kết quả dưới đây.

### 8.1 Đã đổi

- **Khuôn câu lặp:** bỏ hẳn "Ở chỗ gặp nhau" (18 khối moon air và water; tiếng Anh "Where they meet"). Viết lại `meet` của cả 36 khối moon theo 8 kiểu câu mở khác nhau (mỗi kiểu 4 đến 5 khối), thay khuôn "Nhu cầu cảm xúc kiểu X là..., còn mong muốn bên trong của số linh hồn N là..." đang có ở 36/36. Mở `differ` của moon theo 5 kiểu (cảm xúc X ... còn số linh hồn N / trong khi / nhưng / đảo vế / một bên... bên kia / dấu chấm phẩy); mỗi kiểu 4 đến 9 khối. Thêm biến thể câu thứ hai ("Lòng bạn có thể", "Có thể bạn", "Đôi khi", "Thỉnh thoảng") để "Bạn có thể" không còn mở câu thứ hai ở mọi khối. Với sun: đổi nối "cùng nhau, chúng gợi một người" (16 khối) còn 6, "hai hệ cùng gợi một người" (8) còn 7; 13 câu thứ hai của `meet` mở bằng "Có thể bạn" hoặc "Lòng bạn có thể". Đếm sau sửa: không khuôn câu nào quá 7 khối ở cùng một trường; riêng "Bạn có thể" (đệm giảm nhẹ, không phải khuôn) còn 17 khối `meet` mỗi trục.
- **An toàn, đổi câu hỏi/diễn đạt (24 mục):** moon.fire.2 (q), fire.3, fire.4, fire.6, fire.9 (differ: thêm "có thể", "dễ cạn sức" thay "dễ kiệt"), earth.2, earth.4 (q + differ), earth.5 (bỏ "lo mất nền"), earth.6 (q + differ), earth.9 (q + differ), air.1 (q), air.3, air.6 ("có thể thấy có lỗi"), air.7 (q), air.8 (bỏ "gồng lên" và "lý lẽ đứng trước cảm giác"), water.1 (q), water.2 (q + differ), water.7 (q + differ), water.8 (q, "lặng lẽ" thay "kín đáo"), water.9 (q, differ "cảm xúc nặng" thay "nỗi buồn"); sun.fire.2 (q), sun.fire.9 (q), sun.air.9 (q), sun.water.9 (differ).
- **Tiếng Anh:** sửa "The Earth part of your feelings ..." cho đúng chia động từ; dịch song song mọi câu đã viết lại; không còn "Where they meet".
- Không đổi: `elements`, `ui`, các khối ngoài danh sách trên.

### 8.2 Lăng kính (a): an toàn và giọng

Đọc lại mọi khối từng có REVISE ở vòng 1 và 24 khối vừa sửa, cộng quét từ khóa toàn tệp:

- Không còn lời gọi tên cơ chế tâm lý như sự thật ("nén", "nuốt", "tránh", "che", "lý luận cho trôi", "gồng lên"); các chỗ nói về khuynh hướng đều có "có thể", "có lúc", "nếu có".
- Không giả định người dùng đang buồn hay đang giấu: mọi câu hỏi nhắc nỗi buồn, tan vào người khác, chờ người đoán, giữ kín nay ở dạng "nếu có lúc/nếu có điều". Còn 1 câu nhắc "đang buồn" (moon.air.9) nhưng là một người bạn giả định, giữ.
- Không "sẽ", "chắc chắn", "định mệnh", "số phận", "nên", "phải" (quét 0 kết quả; tiếng Anh: không "will/must/should/never/fate/destiny"). Không sức khỏe, tiền, kết quả. `validate:data`: 0 lỗi lint an toàn.

### 8.3 Lăng kính (b): phép thử đổi số và đổi nguyên tố

Đọc lại từng khối sửa: đổi số khác thì phần số (ví dụ "chứng kiến", "đứng không cần ai gật đầu", "nền vững có trật tự", "hoàn tất") không còn khớp; đổi nguyên tố thì phần nhu cầu cảm xúc ("xả bằng hành động", "mở lòng chậm", "đổi góc nhìn", "dâng không theo lịch") không còn khớp. Kết quả sau sửa: đổi nguyên tố 72/72 đạt; đổi số 72/72 đạt (sun.air.6, sun.water.2, moon.earth.9 giữ phần đã sửa ở vòng 1 và vẫn đạt). Lưu ý có chủ ý: moon.earth.4 (Đất 4) và sun.earth.4 vẫn nghiêng cùng ý "nền vững"; `differ` mang phần phân biệt.

### 8.4 Tiếng Anh

Đọc lại 72 khối: nghĩa khớp tiếng Việt, câu đủ tự nhiên, thay "Whom" và "see both systems look at you" từ vòng 1, các chuỗi mới viết lại đều có bản en riêng, không dịch sát chữ. "Soul urge", "life path" nhất quán.

### 8.5 Kết luận sau vòng 2

| Nhóm | Kết luận |
|---|---|
| elements (4), ui (16) | PASS (không đổi, đã xác nhận) |
| sun.fire / earth / air / water | PASS (các khối từng REVISE đã đọc lại, đạt cả hai lăng kính) |
| moon.fire / earth / air / water | PASS (viết lại `meet` 36/36, sửa an toàn và khuôn; đã đọc lại) |

BLOCK: 0. Còn mở (để Owner): tên "Bọ Cạp"/"Thiên Yết"; các mục ở mục 6 (câu hỏi gói hai ý, vài "muốn/cần" trong `differ` của sun); chưa có reviewer độc lập đọc lại các câu viết lại ở vòng 2 (đây là tự rà của biên tập viên, không phải duyệt độc lập); chưa kiểm cách app ghép chuỗi; chưa có Owner đọc. Mục spot-check (mục 7) nay thêm: 6 khối moon `meet` mẫu (fire.3, earth.4, air.2, air.6, water.1, water.5).

`validate:data` đạt sau vòng 2.

`ownerDecision`: pending.
