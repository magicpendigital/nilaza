# Nhánh Nilaza YouTube — cấu hình và kiểm tra khô

Đội gồm tám vai trò Growth hiện có; content_studio nhận kịch bản, motion và audio. Không tạo đội, queue hoặc publisher thứ hai. studio.json pin các nguồn canonical hiện tại; source drift chặn CLI cho tới khi review lại.

Chạy từ root app: `node scripts/nilaza-youtube-dry-run.mjs --week 2026-10-05`. Output là hai đề xuất slot tối đa, bỏ slot đã lỡ/gần giờ, ghi media/QA chưa tạo/chưa chạy và blockers. CLI chỉ đọc và in JSON: không ghi queue/ledger/output, không dùng mạng, không gọi model/API/OAuth và không kích hoạt lịch.

weekly-policy.json đề xuất thận trọng một video dài và tối đa một Short mỗi tuần; hai slot minh họa 20:00 Asia/Ho_Chi_Minh thứ Năm/Chủ nhật đều chưa được Owner duyệt và không phải lịch active. EN là subtitle/review copy, không tự tăng số upload. content-ledger.json trống là editorial seed, không phải execution ledger authoritative.

Consumer adapter ContentOps chưa bind hoặc kiểm live; adapter-contract.json chỉ là hợp đồng đề xuất. Chưa có channel ID/URL, OAuth/audit/token lifecycle, ngân sách API, video renderer/provider dispatch hoặc live URL/consent/channel/device/accessibility/measurement nghiệm thu. Tests synthetic chỉ kiểm guard, không xác minh quyền/licence/auth thật. Dù lint pass, externalExecutionAllowed luôn false.

Xem docs/NILAZA_YOUTUBE_STUDIO_2026-10-05.vi.md để đọc quyết định repo, mapping vai trò, nguồn và đường nghiệm thu.

Mystic Art (@mysticartrealm) chỉ là lựa chọn người dùng đang cân nhắc đổi thành Nilaza. Pending candidate nằm riêng trong studio.json; channel ID và URL được chọn vẫn null. Không pin từ handle, không đổi tên kênh hoặc tự kế thừa OAuth/rights/metrics của video cũ.
