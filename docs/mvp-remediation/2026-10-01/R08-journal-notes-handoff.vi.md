# R08 — Ghi chú độc lập và mở lại nguồn

Ngày 2026-10-01. Đã triển khai một phần local và kiểm tra browser; toàn bộ R08 chưa nghiệm thu.

Plan: `docs/feature-plans/mvp-R08-journal-notes-2026-10-01.json`. Root tích hợp App; không đổi schema, provider hoặc publish. Giữ owner changes có sẵn.

Đã đổi:

- Nhật ký có “Viết ghi chú”: tiêu đề tùy chọn, nội dung và cảm xúc, dùng cùng repository có ACK local của R07. Form dùng A2UI, giữ nội dung khi lưu lỗi và khóa submit khi đang lưu.
- Ghi chú độc lập thuộc sourceType manual, hiện trong bộ lọc Ghi chú, được tính vào memory count; sửa nội dung cập nhật card preview. Không đặt nút mở nguồn Tarot trên ghi chú riêng.
- Mở lại Tarot dùng snapshot đã lưu. Chat/Oracle chỉ mở đúng cuộc trò chuyện còn tồn tại; nguồn không có thì báo rõ, không mở một trải bài mới không liên quan.

Manager path: Nhật ký → Viết ghi chú → nhập nội dung giả lập và mood → Lưu → Ghi chú → mở/sửa → reload → mở lại. Với Tarot: mở insight đã lưu → mở nguồn → đối chiếu đúng cards/positions; thử nguồn mất trên fixture.

Checks: 2/2 Composer tests đạt (save failure giữ draft/retry; empty/double submit). Bộ repository/Composer/backendClient 45/45 và full mobile 248/248 đạt; TypeScript đạt. Browser đã tạo `QA R08 · Mười phút vẽ`, reload và mở lại đúng nội dung. Lần cuối bộ lọc có cả note độc lập và insight có userNote; memory ghi 2 ghi chú là đúng phạm vi. Existing UI đã upsert dữ liệu giả lập qua backend trước khi phát hiện gate môi trường; chưa có kiểm tra ownership hai account.

Cập nhật: bản nháp có store durable riêng theo account, ordered autosave/ACK, retry lỗi disk và khóa submit qua remount; xem [R08 draft](R08-draft-handoff.vi.md). Full mobile hiện44suites/269tests PASS; kết quả248tests bên trên là checkpoint trước tích hợp draft. Source mới chưa đạt browser/native acceptance vì CDP timeout sau khởi động Metro mới.

Còn lại: native keyboard/back/font/reader; đầy đủ reopen Astrology/daily theo structured source; cloud edit/delete hai client phụ thuộc R02/R07 server. Note save và draft clear chưa atomic qua process death. Không coi việc đọc snapshot là nghiệm thu toàn bộ reopen.

Rollback: hoàn tác riêng UI/handler R08 theo baseline, giữ envelope R07 và manual entries; downgrade cần kiểm tương thích, không xoá dữ liệu. Skills Plan-QC/Brand verified-current: vẫn yêu cầu state/error, A2UI, bilingual và proof native riêng.
