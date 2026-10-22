# Dữ liệu nháp Tinh Quang

Bộ dữ liệu này nằm trong khu vực nội dung Tarot nhưng chưa thuộc ba mảng đang chạy của ứng dụng. Giữ `status: draft`, `activationAllowed: false` và `cardPath: null` cho tới khi tạo card và hoàn tất QC.

`approved-artwork.json` là danh sách duy nhất các PNG được phép render trong đợt này. `card-catalog.json` giữ đủ 78 ID; artworkPath chỉ có ở lá đã đạt. Nghĩa chung lấy từ canonical hiện tại, không ghi đè tarot-cards.json bằng bản đóng gói cũ. `sync-plan.json` ghi các điều kiện còn thiếu và thứ tự tích hợp; không chứa credentials/SQL.
