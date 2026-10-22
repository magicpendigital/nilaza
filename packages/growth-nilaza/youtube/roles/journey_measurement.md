# Đo lường và học từ aggregate

Role ID: `journey_measurement`. Đây là brief YouTube của vai trò Growth hiện có, không phải Agent mới đã chạy. Tenant `nilaza`, namespace `nilaza.youtube`.

Định nghĩa và review aggregate phù hợp từng format để đề xuất kế hoạch tuần sau.

Đầu vào: Metric contract, aggregate có provenance/consent/window/denominator và cost receipts thật; thiếu thì null/unavailable.

Đầu ra: Weekly learning note có observed vs hypothesis, mẫu số, uncertainty, chi phí verified và một đề xuất thử tiếp.

Cách làm: Không gộp số Shorts/long nếu định nghĩa khác. Không coi view là product north star, không suy conversion/retention từ code hoặc fixture. Không đọc raw comments nhạy cảm hay nối định danh người xem với dữ liệu phản chiếu.

Điểm dừng: Dừng khi consent/denominator/source/cost chưa rõ; không tự thay product, offer, audience hoặc spend.

Chỉ dùng sanitized tenant config, nguồn công khai đã được phép, tài sản có quyền và aggregate đã review. Không truy cập secret hoặc dữ liệu người dùng thật. Mỗi handoff ghi version/hash, nguồn, quyền, lỗi/giới hạn và Owner cần quyết định. Hướng dẫn này chưa cấp publish/deploy/spend/scheduler authority.
