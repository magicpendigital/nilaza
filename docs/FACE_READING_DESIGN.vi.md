# Xem tướng mặt — thiết kế sản phẩm (12/11/2026)

**Trạng thái:** thiết kế để Owner duyệt. **Chưa có mã, chưa có backend, chưa có quyền camera.** Bản Play đầu vẫn giữ "Xem tướng mặt — Sắp có" ở Khám phá. Bản vẽ màn hình nằm trong Artifact "Nilaza — Thiết kế lại Tarot & Astrology", hàng 5.

Tài liệu này bổ sung mục 6.6 của `docs/FEATURE_PRD.md` (phase 3) và không thay đổi các quy tắc an toàn ở `AGENTS.md`.

## 1. Tính năng này là gì, và không là gì

- **Là:** một trải nghiệm giải trí – tự phản chiếu. Dùng khung "nhân tướng học" truyền thống của Việt Nam (khuôn mặt theo **ngũ hành**, **tam đình** thượng – trung – hạ) như *ẩn dụ* để người dùng nghĩ về cách mình suy nghĩ, hành động và giữ nền tảng.
- **Không là:** đánh giá nhan sắc, sức khỏe, tính cách cố định, trí tuệ, độ đáng tin, tương lai, vận may; không đoán chủng tộc, giới tính, tuổi, cảm xúc; không nhận diện người; không dùng để tuyển dụng, hẹn hò hay quyết định về người khác.
- **Câu chốt của tính năng (đưa lên màn hình):** "Khuôn mặt là một bản đồ biểu tượng để bạn soi mình, không phải bản án."

## 2. Nghiên cứu ngắn và hệ quả cho thiết kế

| Điều tra được | Nguồn | Hệ quả thiết kế |
|---|---|---|
| Ảnh người dùng là dữ liệu cá nhân và nhạy cảm theo chính sách User Data của Google Play; ứng dụng chỉ nên truy cập ảnh cho mục đích gắn trực tiếp với chức năng, và nên dùng bộ chọn ảnh hệ thống khi chỉ cần một lần. | Trợ giúp Google Play (chính sách nội dung do AI tạo; tổng hợp chính sách ảnh/video, 2023). *Kết quả tìm kiếm không nêu điều khoản riêng cho "phân tích khuôn mặt giải trí"; cần đọc nguyên văn khi khai Data safety.* | Dùng **bộ chọn ảnh hệ thống** và chụp một lần; **không** xin quyền đọc thư viện ảnh; khai Data safety trung thực. |
| Nghị định 13/2023/NĐ-CP coi dữ liệu sinh trắc học là **dữ liệu cá nhân nhạy cảm**: phải báo rõ đây là dữ liệu nhạy cảm, có sự đồng ý tường minh (im lặng không phải đồng ý), bên xử lý phải chứng minh được đã có đồng ý. | Tóm tắt của KPMG Việt Nam, Allens và các hãng luật khác (kết quả tìm kiếm, **không phải văn bản gốc**). | Màn đồng ý **riêng**, có ô tích chủ động; lưu bằng chứng đồng ý (thời điểm, phiên bản nội dung). **Cần luật sư xác nhận trước khi dựng** (xem mục 8). |
| Nilaza đã chốt: 18+, mục 6.6 PRD cấm suy ra thuộc tính được bảo vệ, chấm nhan sắc, chẩn đoán, nhận diện. | `AGENTS.md`, `docs/FEATURE_PRD.md` | Quy tắc ở mục 5 là **cổng cứng**, kiểm tự động trên đầu ra AI. |
| Các khung tam đình, ngũ hành hình mặt là tri thức truyền thống, nhiều bản diễn giải khác nhau, **không có cơ sở khoa học**. | Kiến thức chung, **chưa thẩm định học thuật**. | Chỉ trình bày như ẩn dụ; mỗi màn kết quả có dòng "để giải trí và tự phản chiếu". Nội dung mô tả 5 dạng mặt cần chuyên gia nội dung duyệt. |

## 3. Quyết định thiết kế chính: ảnh không rời điện thoại

Đề xuất hai chế độ, làm **chế độ 1 trước**:

1. **Chọn hình dạng (không ảnh).** Người dùng chọn 1 trong 5 hình mặt minh họa (Kim, Mộc, Thủy, Hỏa, Thổ) gần giống mình nhất, kèm gợi ý cách tự xem bằng gương. **Không camera, không dữ liệu sinh trắc học.** Ra mắt được ngay khi nội dung được duyệt, rủi ro cửa hàng và pháp lý thấp nhất.
2. **Quét bằng camera, xử lý trên máy (sau).** Một mô hình nhận điểm mốc khuôn mặt chạy *trên điện thoại* đo vài tỉ lệ (dài/rộng, ba phần thượng – trung – hạ đình), chuyển thành *mã dạng mặt* rồi **bỏ ảnh và số đo ngay**. Chỉ mã dạng mặt (ví dụ `thuy`) và câu hỏi của người dùng được gửi lên backend để AI viết lời diễn giải. **AI không bao giờ nhìn thấy ảnh.**

Vì sao: tránh gửi ảnh mặt lên OpenRouter hay nhà cung cấp mô hình khác; AI không thể suy ra tuổi, chủng tộc, cảm xúc từ ảnh vì không có ảnh; dễ khai Data safety ("không thu thập ảnh"); xóa dữ liệu đơn giản (chỉ có văn bản báo cáo).

*Chưa kiểm chứng:* thư viện nhận điểm mốc nào chạy ổn trong Expo SDK 54 trên Android tầm trung, dung lượng AAB tăng bao nhiêu, độ chính xác với ánh sáng yếu. Cần một buổi thử kỹ thuật riêng trước khi cam kết chế độ 2. Cả hai chế độ đều cho người dùng **sửa lại kết quả** ("Đúng chưa? Bạn có thể đổi") để tránh áp đặt.

## 4. Luồng màn hình (khớp bản vẽ Artifact)

| # | Màn | Mục đích | Ghi chú chính |
|---|---|---|---|
| 1 | **Giới thiệu** | Nói rõ tính năng là gì/không là gì | 3 dòng: "Đọc biểu tượng, không phán xét", "Ảnh ở lại trên máy bạn", "Bạn xóa được bất cứ lúc nào". Nút chính "Bắt đầu". Có chữ 18+. |
| 2 | **Đồng ý** | Đồng ý tường minh, riêng biệt | Giải thích dữ liệu nào được xử lý, ở đâu, giữ bao lâu. Ô tích "Tôi từ 18 tuổi và đồng ý…" (chưa tích thì nút xám). Liên kết Chính sách riêng tư. Nút "Để sau". |
| 3 | **Chụp / chọn** | Lấy dữ liệu đầu vào | Khung oval hướng dẫn: nhìn thẳng, đủ sáng, không kính. Lối thay thế rõ: "Không muốn dùng ảnh? Chọn hình dạng". Đây cũng là màn đầu tiên của chế độ 1. |
| 4 | **Xác nhận dạng mặt** | Người dùng làm chủ kết quả | "Mình thấy gần với dạng Thủy. Đúng chưa?" + 5 hình để đổi. Không có phần trăm giả chính xác. |
| 5 | **Kết quả** | Diễn giải phản chiếu | "Bạn trong một câu" → ba đình (Thượng: cách bạn nghĩ; Trung: cách bạn hành động; Hạ: nền tảng bạn dựng) → "Điều có thể tận dụng" → "Điều để cân bằng" → một lời nhắn → câu hỏi để viết nhật ký. Đáy: Lưu · Hỏi tiếp · Xóa. |
| 6 | **Quản lý & xóa** (trong Hồ sơ → Riêng tư) | Quyền kiểm soát | Danh sách báo cáo đã lưu, "Xóa tất cả dữ liệu tướng mặt", hiển thị ngày đồng ý và nút thu hồi. |

Điểm vào: dòng "Xem tướng mặt" ở Khám phá (hiện "Sắp có") trở thành thẻ bấm được khi mở tính năng. Không thêm tab, không đặt lên Home.

Thiết kế hình ảnh: nền than `#151416`, chữ ngà `#F7F1E6`, vàng sâm panh `#C9A45C` cho trạng thái chọn và nhấn, xanh teal `#0E5A5A` cho khối "bước nhỏ". **Không dùng hồng cho trạng thái chọn.** Hình mặt là nét vẽ đường viền mảnh, không dùng ảnh người thật. Nút pill, thẻ bo 8 như phần còn lại của app.

## 5. Quy tắc nội dung và an toàn (cổng cứng)

Đầu ra AI và nội dung tĩnh **không được**:

- nhắc nhan sắc, đẹp/xấu, hấp dẫn, "ưa nhìn", "phúc tướng/hung tướng";
- nói về sức khỏe, bệnh, thai sản/con cái, tuổi thọ, tài chính cụ thể, hôn nhân thành bại, tội phạm, trí thông minh, độ đáng tin;
- đoán tuổi, giới, dân tộc/chủng tộc, tôn giáo, khuyết tật, xu hướng;
- khẳng định chắc chắn ("chắc chắn", "nhất định", "bạn sẽ"); dùng "có thể", "gợi ý", "một cách nhìn";
- diễn giải khuôn mặt người khác (mọi luồng chỉ đọc **ảnh/hình dạng của chính người dùng**; không có chức năng "xem mặt người ấy").

Bắt buộc: 18+; dòng "để giải trí và tự phản chiếu" ở màn kết quả; nút Báo cáo nội dung AI như các tính năng AI khác; khi người dùng có dấu hiệu khủng hoảng thì dùng luồng 115 hiện có; chặn ảnh có người dưới 18, ảnh khiêu dâm hoặc nhiều khuôn mặt (chỉ áp cho chế độ 2).

Kiểm thử bắt buộc trước khi mở: bộ câu mẫu "bẫy" (xin chấm điểm đẹp, hỏi bệnh, hỏi 'người này có đáng tin không') phải bị từ chối nhẹ nhàng; kiểm 100% đầu ra bằng bộ lọc từ khóa cấm trước khi hiển thị.

## 6. Dữ liệu và quyền riêng tư

| Mục | Chế độ 1 (chọn hình) | Chế độ 2 (quét trên máy) |
|---|---|---|
| Ảnh | Không có | Chỉ ở bộ nhớ tạm trên máy; hủy ngay sau khi tính mã dạng mặt; không ghi ra đĩa, không đưa vào bản sao lưu (Auto Backup đã tắt) |
| Gửi lên backend | Mã dạng mặt + câu hỏi tùy chọn | Như chế độ 1 |
| Lưu lâu dài | Báo cáo văn bản + mã dạng mặt + bằng chứng đồng ý (thời điểm, phiên bản) | Như chế độ 1 |
| Xóa | Người dùng xóa từng báo cáo hoặc tất cả; xóa tài khoản xóa luôn | Như chế độ 1 |
| Quyền Android | Không | `CAMERA` chỉ khi mở chụp; thư viện dùng bộ chọn ảnh hệ thống (không xin `READ_MEDIA_IMAGES`) |
| Bảng dữ liệu | Mở rộng `face_readings`: `archetype_code`, `consent_version`, `consented_at`, `deleted_at`; **không** có cột ảnh | Như chế độ 1 |

Việc backend, SQL, Edge Function, quyền camera và cập nhật Data safety đều cần Owner duyệt riêng, theo `CLAUDE.md`.

## 7. Hợp đồng AI đề xuất (chưa viết mã)

- Vào: `archetype_code` (5 giá trị), `language`, `intent` tùy chọn (ví dụ "công việc", "mối quan hệ", "bản thân"), không có bất kỳ dữ liệu ảnh nào.
- Ra: `one_liner`, `three_courts` (thuong/trung/ha, mỗi phần ≤ 2 câu), `strengths[]`, `balance[]`, `affirmation`, `journal_prompt`, `disclaimer`. Có sơ đồ JSON và bộ kiểm đầu ra giống Tarot AI/Astrology AI; kết quả bị chặn thì hiện bản dự phòng tĩnh theo từng dạng mặt, nên tính năng vẫn chạy khi AI tắt.
- Có công tắc tắt trong Admin như các tính năng AI khác; hạn mức đề xuất 1 lượt/ngày (chờ Owner duyệt cùng Astrology AI và Council).

## 8. Việc cần Owner quyết

1. Duyệt hướng "ảnh không rời điện thoại" và thứ tự: **chế độ 1 trước**, chế độ 2 sau một buổi thử kỹ thuật.
2. Có đưa vào bản Play đầu không? **Khuyến nghị: không.** Giữ "Sắp có", ra ở bản cập nhật sau khi có closed test ổn định, để không làm chậm hồ sơ Play và Data safety.
3. Nhờ luật sư xác nhận cách áp Nghị định 13/2023 cho chế độ 2 (đồng ý bằng văn bản điện tử, đánh giá tác động xử lý dữ liệu nhạy cảm) và cho nội dung "nhân tướng học" tại Việt Nam.
4. Chuyên gia nội dung (hoặc Owner) duyệt mô tả 5 dạng mặt và ba đình; chưa có ai duyệt.
5. Hạn mức 1 lượt/ngày và việc có cho phép lưu báo cáo hay không.

## 9. Tiêu chí nghiệm thu khi làm thật

- Không thể quét hay chụp trước khi tích đồng ý; thu hồi đồng ý xóa dữ liệu liên quan.
- Chế độ 1 hoạt động hoàn toàn không cần quyền camera và không có yêu cầu mạng ngoài lời gọi AI (hoặc bản dự phòng).
- Kiểm tự động: không có đường mã nào ghi ảnh ra đĩa hoặc gửi ảnh qua mạng; đầu ra AI qua bộ lọc từ khóa cấm.
- Người không chuyên kỹ thuật làm được: đồng ý → chọn dạng mặt → đọc kết quả → lưu → xóa, trong dưới 2 phút.
