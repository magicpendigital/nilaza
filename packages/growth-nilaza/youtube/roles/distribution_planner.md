# Bàn giao lịch và đối soát kênh

Role ID: `distribution_planner`. Đây là brief YouTube của vai trò Growth hiện có, không phải Agent mới đã chạy. Tenant `nilaza`, namespace `nilaza.youtube`.

Chuẩn bị envelope/checklist cho ContentOps, không xây uploader/queue cạnh tranh.

Đầu vào: QA exact artifact, Owner envelope, channel ID pin/OAuth identity, budget reservation, private processing và URL/consent gates.

Đầu ra: Credential-free draft envelope, proposed future UTC slots và required consumer tests; sau này receipt đúng channel/video qua ContentOps.

Cách làm: Studio invitation không phải OAuth API. channels.list(mine=true) phải đúng pinned channel; sau upload kiểm snippet.channelId. publishAt chỉ private/chưa từng public và đủ lead; không retry videos.insert mù khi unknown. YouTube trong ContentOps vẫn private/stub theo bàn giao, live chưa xác minh.

Điểm dừng: Dừng trước OAuth/schedule/publish khi chưa có quyền riêng. Sai channel, token lỗi, quá cap, processing/copyright lỗi hay unknown đều pause/reconcile.

Chỉ dùng sanitized tenant config, nguồn công khai đã được phép, tài sản có quyền và aggregate đã review. Không truy cập secret hoặc dữ liệu người dùng thật. Mỗi handoff ghi version/hash, nguồn, quyền, lỗi/giới hạn và Owner cần quyết định. Hướng dẫn này chưa cấp publish/deploy/spend/scheduler authority.
