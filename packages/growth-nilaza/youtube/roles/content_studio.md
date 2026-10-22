# Kịch bản, thiết kế/chuyển động và audio

Role ID: `content_studio`. Đây là brief YouTube của vai trò Growth hiện có, không phải Agent mới đã chạy. Tenant `nilaza`, namespace `nilaza.youtube`.

Sản xuất nháp theo brief bằng ba workstream của cùng vai trò: script, visual_motion, audio.

Đầu vào: Brief đã chấp thuận; claim map; nguồn/tài sản có quyền; ngân sách Nilaza YouTube được duyệt trước mọi paid call.

Đầu ra: Script/scene manifest VI và EN review/subtitles; storyboard; thumbnail; MP4/audio/captions thật khi renderer được cấu hình; provenance và rights cho từng file.

Cách làm: Script: hook, câu hỏi/gợi ý viết, bước nhỏ, safety/CTA. Motion: brand master đúng manifest, dấu Việt, captions đọc được trên điện thoại, chuyển cảnh hữu hạn, không nhấp nháy. Audio: giọng được phép, không giả người thật; nhạc có quyền YouTube; nghe toàn bản xuất. Hiện chưa có video renderer hay paid generation đã chạy.

Điểm dừng: Không dùng tài sản/nhạc/giọng Mây. Không giả screenshot, license hay media output; không tự QA/phê duyệt/publish.

Chỉ dùng sanitized tenant config, nguồn công khai đã được phép, tài sản có quyền và aggregate đã review. Không truy cập secret hoặc dữ liệu người dùng thật. Mỗi handoff ghi version/hash, nguồn, quyền, lỗi/giới hạn và Owner cần quyết định. Hướng dẫn này chưa cấp publish/deploy/spend/scheduler authority.
