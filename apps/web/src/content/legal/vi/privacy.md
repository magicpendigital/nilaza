---
title: "Quyền riêng tư"
description: "Chúng tôi chỉ hứa những kiểm soát dữ liệu đã được kiểm chứng trong phiên bản bạn đang dùng."
locale: vi
slug: privacy
updatedAt: 2026-11-28
---

## Thông tin bạn chủ động cung cấp

Tùy tính năng, dữ liệu có thể gồm hồ sơ cá nhân, hồ sơ ngày sinh, câu hỏi, cuộc trò chuyện, trải bài, insight đã lưu và Nhật ký. Trạng thái lưu cục bộ hoặc đồng bộ phụ thuộc vào phiên bản và sẽ được hiển thị trong ứng dụng.

## Dữ liệu nhạy cảm

Không nhập thông tin mà bạn không muốn xử lý. Nilaza không yêu cầu khóa API của nhà cung cấp AI trong ứng dụng di động.

## Danh sách chờ

Khi biểu mẫu sẵn sàng và bạn chủ động đồng ý, Nilaza lưu email, ngôn ngữ, điều bạn quan tâm, thông tin chiến dịch trong các tham số UTM và thời điểm/phiên bản consent để ghi nhận yêu cầu đăng ký trước ra mắt. Dữ liệu được xử lý qua backend Supabase; trình duyệt không có quyền đọc danh sách email. Chỉ trạng thái ghi nhận thành công xác nhận yêu cầu đã lưu; thông báo kết nối chưa sẵn sàng không thu email.

Email dùng cho thông tin ra mắt và cơ hội trải nghiệm sớm theo consent của bạn. Việc gửi xác nhận/cập nhật là bước riêng; không tự đăng ký marketing từ tài khoản ứng dụng. Khi chiến dịch hoạt động, email cập nhật sẽ có cách hủy nhận tin và các trạng thái hủy/bounce/complaint được giữ. Raw email và nội dung biểu mẫu không được đưa vào sự kiện analytics.

## Lời nhắn riêng Thần số học (khi tính năng được bật)

Mục này chỉ áp dụng khi Nilaza bật tính năng "Lời nhắn riêng" cho tài khoản Premium. Trước khi bật, ứng dụng không gửi gì cho tính năng này.

- **Bạn chủ động gửi:** ứng dụng chỉ gửi sau khi bạn bấm "Gửi" trong hộp giải thích.
- **Dữ liệu được gửi:** các con số Thần số học đã tính trên điện thoại (ví dụ số chủ đạo, năm và tháng cá nhân), mã các khối nội dung và ngôn ngữ. **Không** gửi họ tên, ngày sinh, năm sinh hay tuổi của bạn.
- **Xử lý:** máy chủ Nilaza ghép chữ của các khối nội dung đã soạn sẵn rồi nhờ một mô hình AI (qua nhà cung cấp OpenRouter) viết thành một lời nhắn ngắn. Mã tài khoản của bạn không được gửi cho nhà cung cấp mô hình.
- **Lưu trữ:** Nilaza **không lưu** lời nhắn, các con số hay mã khối. Máy chủ chỉ ghi số lần thử trong ngày và thông tin kỹ thuật (thời điểm, ngôn ngữ, số khối, model đã dùng) để giới hạn một lời nhắn mỗi ngày và theo dõi chất lượng dịch vụ.

## Báo cáo tổng hợp Bản đồ số (khi tính năng được bật)

Mục này chỉ áp dụng khi Nilaza bật tính năng "Báo cáo tổng hợp" cho tài khoản Premium. Trước khi bật, ứng dụng không gửi gì cho tính năng này. Phần 1 của báo cáo được ghép ngay trên điện thoại và không gửi đi đâu.

- **Bạn chủ động gửi:** ứng dụng chỉ gửi sau khi bạn bấm "Gửi" trong hộp giải thích.
- **Dữ liệu được gửi:** các con số Thần số học đã tính trên điện thoại, những chữ số có mặt trong biểu đồ ngày sinh (không gửi số lần lặp lại), các đường đầy hoặc trống, mã các khối nội dung và ngôn ngữ. **Không** gửi họ tên, ngày sinh, năm sinh hay tuổi của bạn.
- **Xử lý:** máy chủ Nilaza ghép chữ của các khối nội dung đã soạn sẵn rồi nhờ một mô hình AI (qua nhà cung cấp OpenRouter) viết thành báo cáo. Mã tài khoản của bạn không được gửi cho nhà cung cấp mô hình.
- **Lưu trữ:** báo cáo được **lưu trên điện thoại của bạn**, có trong "Xuất dữ liệu" và xóa được ở mục "Báo cáo đã lưu". Nilaza **không lưu** chữ của báo cáo, các con số hay mã khối trên máy chủ; máy chủ chỉ ghi số lần thử trong ngày và thông tin kỹ thuật (thời điểm, ngôn ngữ, số phần, số khối, model đã dùng) để giới hạn số báo cáo mỗi ngày và theo dõi chất lượng dịch vụ.

## Mua gói Premium

- **Thanh toán:** do Google Play xử lý. Nilaza không nhận và không lưu số thẻ hay thông tin thanh toán của bạn.
- **Nhà cung cấp quản lý đăng ký:** Nilaza dùng **RevenueCat** (RevenueCat, Inc.) để xác nhận giao dịch với Google Play và theo dõi trạng thái gói. Khi bạn mua hoặc khôi phục, ứng dụng gửi cho RevenueCat mã người dùng Nilaza (một mã ngẫu nhiên, không phải email hay tên). RevenueCat nhận từ Google Play và lưu lịch sử mua của mã đó: gói đã mua, thời điểm mua, kỳ hạn, trạng thái gia hạn hoặc hủy, kèm thông tin kỹ thuật cần để giao dịch hoạt động. RevenueCat xử lý dữ liệu này thay cho Nilaza.
- **Trên máy chủ Nilaza:** chúng tôi lưu trạng thái gói của tài khoản (có Premium hay không, trạng thái, ngày hết kỳ, mã sản phẩm, môi trường thử nghiệm hay thật) để mở các tính năng Premium. Chúng tôi không lưu giá, email hay thông tin thanh toán trong bản ghi này.
- **Mã hóa khi truyền:** dữ liệu giữa ứng dụng, Google Play, RevenueCat và máy chủ Nilaza đi qua kết nối HTTPS.

## Xóa tài khoản

Khi bạn xóa tài khoản, Nilaza xóa trạng thái gói trên máy chủ và yêu cầu RevenueCat xóa hồ sơ khách hàng cùng lịch sử mua gắn với mã người dùng của bạn. Google Play vẫn giữ hồ sơ giao dịch theo chính sách của Google, và **gói đăng ký không tự hủy**: hãy hủy trong Google Play.

Cách xóa tài khoản và dữ liệu nào bị xóa: xem [Xóa tài khoản và dữ liệu](/vi/account-deletion).
