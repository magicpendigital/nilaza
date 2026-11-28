# Thử bản Android mới trên điện thoại thật — Trò chuyện với tri thức (28/11/2026)

## Mục tiêu

Owner yêu cầu dựng bản Android mới từ `main`, cài lên điện thoại đang cắm máy và chạy các kịch bản thử để đánh giá. Trọng tâm là phần đã lên production ngày 26/11: Trò chuyện với tri thức, gồm 2 sách mới Kinh Pháp Cú và Kinh Dịch, chữ hiện dần và “Đào sâu” ([biên nhận](../docs/release/chat-knowledge-2026-11-25/rollout-2026-11-26.json)).

## Đã làm

- Dựng bản EAS `preview` số `82b4f0f3-eace-47f0-b813-7be27423551c` từ `main` `78ce965`:
  - Tệp APK khoảng 190 MB.
  - Biến môi trường trỏ về Singapore.
  - Riêng khâu tải mã nguồn lên EAS mất 43 phút, vì gói mã nặng 441 MB. Nên thêm `.easignore` để rút ngắn.
- Cài đè lên app cũ trên điện thoại:
  - Máy Air1 Ultra, Android 13.
  - Gói `app.nilaza.mobile`, số phiên bản vẫn là **0.1.3**.
  - App vẫn giữ đăng nhập tài khoản “Test”.
- Điều khiển máy qua `adb` và đọc màn hình bằng `uiautomator` để chạy kịch bản.
  - Câu hỏi thử gõ bằng tiếng Anh, vì bàn phím Gboard tự sửa tiếng Việt không dấu.

## Đã kiểm chứng trên máy thật

| Kịch bản | Kết quả |
|---|---|
| Trang chủ | Tải bình thường; “Một câu cho hôm nay” hiện câu Đạo Đức Kinh. |
| Trò chuyện, chip “Sách” | Hiện đủ 7 sách, mỗi thẻ có nhãn sách và tên đúng: Thấu cảm & Kết nối, Bình an, Binh pháp Tôn Tử, Đạo Đức Kinh, Suy tưởng, Kinh Pháp Cú, Kinh Dịch. Tìm “Kinh” ra đúng các sách liên quan. |
| Kinh Pháp Cú, hỏi chuyện giận | Trang chi tiết ghi “TỪ SÁCH KINH PHÁP CÚ”; lời chào và câu gợi ý đúng sách. Trả lời trong khoảng 12 giây, diễn ý thay vì chép nguyên văn (“Trong sách có ý rằng…”), dẫn đúng phẩm Phẫn Nộ. |
| Kinh Pháp Cú, “Đào sâu” | Trả lời trong khoảng 13 giây, thêm dẫn chứng: phẩm Song Yếu, kệ 223 và phẩm Tâm. Có đoạn “Minh bạch” nói rõ đây là AI. Chữ in đậm hiển thị đẹp; có đủ nút Lưu, Báo cáo và phản hồi. |
| Kinh Dịch, “gieo quẻ xem năm sau đổi việc có thành không” | **Từ chối bói đúng cách**: nói rõ không gieo quẻ và không dự đoán, rằng quẻ là tấm gương để soi chứ không phải lời tiên tri. Sau đó mời người dùng tự chọn quẻ để suy ngẫm (Truân, Cách, Hằng) và kết bằng một câu hỏi. Hỏi bằng tiếng Anh nhưng app trả lời tiếng Việt, đúng ngôn ngữ tài khoản. Trả lời xong trong khoảng 9 giây. |
| Oracle, câu gợi ý “Mình cần quyết định một việc lớn.” | Trả lời ngay, lời ân cần, hỏi lại điều đang làm người dùng lưỡng lự; gợi ý “Hội đồng 3 góc nhìn”, “Soi tiếp ở đây” và “Oracle mới”. |
| Bản đồ số | Màn nhập ngày sinh và tên mở bình thường; nút Oracle nổi không che chữ. |
| Đồng bộ lịch sử trò chuyện | Lần đầu mở báo “Chưa đồng bộ được lịch sử trò chuyện…”; bấm “Thử đồng bộ lại” thì hết. Đây là lỗi tạm thời. |

## Phát hiện (đều nhỏ, không chặn dùng app)

1. Sau khi cài đè bản mới, màn chào “BƯỚC 2/2” (sở thích, ngày sinh) hiện lại dù tài khoản đã dùng từ trước.
2. Tên người dẫn trên đầu trang chi tiết bị cắt (“Người Dẫn Đư…”).
3. Câu gợi ý vẫn hiện sau khi đã bấm, và bị cắt chữ ở mép phải.
4. Ảnh Kinh Dịch và Kinh Pháp Cú vẫn mượn tạm ảnh sách khác. Việc này đã có trong danh sách chờ Owner.
5. “Một câu cho hôm nay” trên Trang chủ trích nguyên văn một câu Đạo Đức Kinh. Nên rà lại với quy tắc diễn ý của Lô 0; nội dung 303 câu đã được Owner duyệt riêng ngày 27/11.
6. Thẻ “Một câu cho hôm nay” ở Khám phá ghi “năm cuốn sách xưa”, trong khi Trò chuyện nay có 7 sách. Có thể đúng ý, vì bộ câu chỉ lấy từ 5 sách, nhưng dễ gây hiểu lầm.
7. Bộ lọc “Sách” bị xóa khi chuyển sang tab khác rồi quay lại.
8. Tìm “Kinh” ra thêm Suy tưởng.

## Chưa kiểm chứng

- Dòng “Đang suy nghĩ kỹ · N giây” và nút “Xem phần mới nhất”: câu trả lời về nhanh hơn khoảng 3 giây cần để đọc màn hình, nên chưa bắt được.
- Oracle gợi ý **một người dẫn cụ thể**: lần thử này Oracle chỉ gợi ý Hội đồng.
- Các sách Binh pháp, Đạo Đức Kinh, Suy tưởng, Thấu cảm, Bình an.
- Hạng model suy luận sâu trên OpenRouter, trang Admin “Hạng model người dẫn”, và Supabase security advisor.
- Chữ lớn và TalkBack.
- Các tính năng khác cần bản build mới (Bản đồ số đã chỉnh, “Lời nhắn riêng”, công tắc Miễn phí/Premium): chưa thử sâu trong lần này.

## Việc tiếp theo và chờ ai

- Sửa các lỗi nhỏ 1, 2, 3 và 7 là việc của agent, làm khi Owner muốn.
- Owner quyết:
  - ảnh riêng cho 2 sách mới (phát hiện 4);
  - có đổi câu chữ cho phát hiện 5 và 6 không.
- Trước khi gửi bản này lên Google Play phải tăng số phiên bản, vì vẫn là 0.1.3 (versionCode do EAS quản lý từ xa).
