# Xin duyệt và nhật ký duyệt

Mỗi thao tác chạm môi trường thật hoặc tài sản của Owner cần **một** lời duyệt gắn với đích cụ thể. Agent chuẩn bị, Owner quyết; mật khẩu và khóa do Owner tự nhập.

## Mẫu phiếu (copy cho mỗi lần xin)

> **Quyết định:** "Tôi duyệt {{thao tác}} trên {{đích: môi trường/id project}} với {{gói/hash/phiên bản}}."
>
> - **Vì sao cần:** {{1–2 câu}}
> - **Bằng chứng:** {{chạy thử/test, ngày, kết quả, hạn dùng của bằng chứng}}
> - **Rủi ro:** {{điều có thể hỏng, ai bị ảnh hưởng}}
> - **Hoàn tác:** {{cách quay lại; nếu không quay lại được thì nói rõ}}
> - **Owner cần tự làm:** {{đăng nhập, nhập mật khẩu, đọc dashboard…}}
> - **Điều kiện dừng:** {{khi nào Agent dừng giữa chừng}}

Quy tắc: lời duyệt chỉ có hiệu lực cho đúng đích và hash đã nêu; gói thay đổi thì hết hiệu lực. Duyệt ở lần trước không mở rộng sang lần sau.

## Nhật ký
| Ngày | Quyết định | Đích / hash | Người duyệt | Kết quả |
|---|---|---|---|---|
| {{YYYY-MM-DD}} | {{…}} | {{…}} | Owner | {{đã chạy / rút lại / hết hạn}} |
