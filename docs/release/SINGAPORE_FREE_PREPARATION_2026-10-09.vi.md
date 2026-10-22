# Singapore Free — chuẩn bị backend theo bước 1–2

Ngày 09/10/2026. **Bước 1 hoàn tất; bước 2 đã chuẩn bị policy và packet, còn xác minh settings/recovery. Execution vẫn BLOCKED.**

## Quyết định và môi trường

Owner đã đồng ý chọn project `etfajmrwyywokgafzxsb`, organization Nilaza Free `drxbmvimiekeoeesgssp`, Singapore `ap-southeast-1` làm backend chính dự kiến. Dùng project cho QA đóng bằng tài khoản/dữ liệu giả trước; chỉ chuyển production sau nghiệm thu và quyết định promotion riêng.

- Target QA: `nilaza-singapore-prelaunch-qa`, kind `staging`.
- Target production tương lai: `nilaza-singapore-production-candidate`, kind `production`, cùng project; chưa promotion.
- Policy kỳ vọng: **Free / Nano / Singapore / PostgreSQL17 / không paid add-on**. Chrome đã quan sát Nano (`t3a.nano`) trên dashboard đúng project trong lượt trước; paid add-ons và usage vẫn chưa được đọc.
- App, Admin và CLI vẫn trỏ QA cũ `akgrokwnkfqnfjqrildi`. Giữ QA cũ và ledger blocked; không chuyển tài khoản/journal/credits thật hoặc sửa lịch sử MCY.
- `release-profile.json.targets` vẫn rỗng đến khi operator/enforcement thực tế được xác minh. Chọn backend không cấp quyền SQL/deploy/submit.

Readback mới: project ACTIVE_HEALTHY, PG17.11.0.002; history migration rỗng, không bảng public, không Edge Function. Auth users/identities và Storage buckets/objects có metadata row estimates bằng 0; không chạy SQL COUNT hoặc đọc private rows. Xem [receipt](../../artifacts/singapore-free-preparation-2026-10-09/readback.json).

## Quota, tính năng và ngân sách

| Mục | Giới hạn công bố cho Free | Tác động / việc cần kiểm |
|---|---|---|
| Database | 500 MB mỗi project | Đo dung lượng thật sau seed/rehearsal; đo trace/log growth và retention |
| Storage | 1 GB | Đo artwork/user-file delivery; không giả rằng DB backup chứa object bytes |
| Egress | 5 GB; cached egress 5 GB | Theo dõi hai loại riêng và phạm vi quota organization |
| Auth | 50.000 MAU | Kiểm SMTP/callback/recovery/abuse limits thực tế; email delivery chưa được chứng nhận |
| Edge Functions | 500.000 invocations | Kiểm AI retries, timeout và idempotency; chi phí AI/email nằm ngoài giá Free |
| Availability | Pause sau một tuần không hoạt động; hai active Free projects | Có phương án owner xử lý pause; không đề xuất keep-alive hay project thứ ba |

Căn cứ đọc ngày 09/10: [pricing](https://supabase.com/pricing), [billing và quota](https://supabase.com/docs/guides/platform/billing-on-supabase), [compute](https://supabase.com/docs/guides/platform/compute-and-disk). Đây là giới hạn công bố, không phải usage/settings/invoice đã xác minh. Đề xuất cảnh báo ở 80% quota và dừng mở cohort khi chạm quota hoặc access/AI-cost failures; ngưỡng rollout cần chốt trong packet execution.

## Backup và khôi phục

Free không gồm automatic backups/PITR như quyền lợi Pro. Chuẩn bị export/backup ngoài project và retention/access trước khi có dữ liệu thật. [Tài liệu backup](https://supabase.com/docs/guides/platform/backups) khuyến nghị Free export định kỳ; backup database không chứa Storage object bytes.

Phương án cần nghiệm thu ở bước backend:

1. Chỉ định operator/recovery custodian và nơi lưu mã hóa ngoài project; không đặt live dumps hoặc secrets trong repository.
2. Kiểm pre-change inventory và lưu schema/roles/grants/history/config cần thiết theo phạm vi được duyệt. Không đưa private rows vào staging/repository.
3. Backup Storage bytes/metadata riêng; Auth identities, cấu hình callback/SMTP, Edge versions và owner-held secrets có checklist phục hồi riêng.
4. Khôi phục trong môi trường tách biệt, jobs/webhooks/email/provider dispatch tắt; kiểm counts, ownership/RLS/ACL, A/B/revoked, Auth/Storage/API và khả năng client đọc lại.
5. Đo thời gian và mất dữ liệu thực tế. RPO/RTO/cadence/retention và custodian còn **BLOCKED**, chưa được owner chốt. Native fixture restore ngày 05/10 không thay proof managed recovery.

## Packet và kiểm soát

[Draft manifest](../../artifacts/singapore-free-preparation-2026-10-09/database-target.draft.json) bind target staging Free, profile hiện tại, ledger riêng, metadata mới và **28 SQL migrations đúng thứ tự/hash**. Bộ SQL được đối chiếu với native rehearsal ngày 05/10; không thêm SQL MCY. Replay evidence giữ nguyên thời gian/source cũ, không giả rằng đã chạy lại.

Gate mới đọc resource policy từ profile và bind exact org/ref/kind/id. Free/Nano và Pro/Micro được kiểm riêng; thiếu policy, compute/plan sai, paid add-on, settings/quota/recovery chưa xác minh hoặc đổi kind để bypass đều bị chặn. Approval phải bind profile mới; selection decision bước 1–2 không được dùng làm SQL approval.

**Chưa hoàn tất:** add-on/usage thực tế; Auth/settings/dispatch isolation; operator privileges và protected execution; managed acceptance/recovery; ledger/bootstrap review; exact SQL approval. Chrome từng lỗi request-header policy; lượt sau đã kết nối và đọc dashboard Free/Nano, nhưng trang Compute chi tiết timeout. Lượt tiếp tục ngày 10/10 không còn Chrome trong inventory. Chưa cấp OAuth hoặc thay cấu hình.

## Cập nhật kiểm settings — 10/10/2026

[Receipt tổng hợp](../../artifacts/singapore-free-preparation-2026-10-09/settings-followup-2026-10-10.json) tách nguồn và thời điểm: connector mới xác nhận đúng ref/org, Free, Singapore, PG17.11.0.002, ACTIVE_HEALTHY, migration history rỗng và 0 Edge Functions. Không làm mới kết quả schema/Auth/Storage ngày trước hoặc gán lại thời gian cho native rehearsal.

Dashboard Chrome lượt trước hiển thị Nano (`t3a.nano`), Singapore và Healthy. Ảnh Billing owner gửi hiển thị organization tên Nilaza, Free Plan, spend cap bật và 4 hóa đơn $0 đã thanh toán. Ảnh không chứa URL/org ID và không chứng minh danh sách add-ons, tổng chi phí chu kỳ hiện tại hay hóa đơn của organization khác.

Compute đã có bằng chứng quan sát; ba add-ons hiển thị đã được review từ ảnh bổ sung bên dưới. `resourceSettingsVerified` vẫn false đến khi bind exact target và kiểm đủ infrastructure. Execution `quotaReview`, `recoveryReview` giữ BLOCKED; phần quota snapshot hiện hành đã review riêng. Checklist tiếp theo nằm trong [phiếu settings và recovery](../../artifacts/singapore-free-preparation-2026-10-09/settings-recovery-checklist-2026-10-10.vi.md). Chưa chạy bootstrap, retarget hoặc promotion.

## Thứ tự bước 3

1. Đọc settings và inventory/ledger lại trong 24 giờ trước execution; xử lý các unknown ở trên.
2. Review chính xác migrations/seed và side effects, operator/enforcement, backup/recovery; cập nhật hồ sơ và allowlist chỉ khi đủ căn cứ.
3. Trình packet cụ thể đúng target/operation/hash để database owner duyệt; chạy bootstrap qua operator được xác minh.
4. Kiểm managed Auth/Storage/API, A/B/revoked/concurrency; sau đó mới retarget ứng dụng trong scope riêng.
5. QA dữ liệu giả; lập inventory cleanup giữ schema/content/history, chỉ xóa fixtures được duyệt. Chạy acceptance cuối và promotion riêng trước khách hàng thật.

Rollback phần chuẩn bị là reverse scoped policy/docs/checker delta sau review; không rollback bằng transfer/delete/pause/reset project. Không có thay đổi UI, dữ liệu người dùng, endpoint, credentials, SQL hoặc release signing trong task này.

## Ảnh Usage và Add-ons bổ sung — 10/10/2026

[Receipt ảnh owner](../../artifacts/singapore-free-preparation-2026-10-09/usage-addons-screenshots-2026-10-10.json) ghi scope **All projects**, Free, chu kỳ **14/09–14/10/2026**. DB 0,037/0,5 GB (~7%); egress 0,03/5 GB (<1%); Edge 710/500.000; MAU 8/50.000. Storage, cached egress và Realtime đều hiển thị 0. Dashboard báo chưa vượt quota hiện hành. Đây là tổng org, không gán 710 calls/8 users cho Singapore.

Ảnh Add-ons hiển thị **Dedicated IPv4, PITR, Custom domain đều DISABLED**. Ảnh gửi trong ngữ cảnh project Singapore nhưng không thấy URL/ref/org ID; giữ cần revalidation exact target trước execution. Nhãn main Production của Supabase không thay quyết định production promotion của Nilaza.

**Log Ingestion khoảng 4.994%** trên meter Upcoming: phải phân tích nguồn volume theo project, không tự tắt logging hoặc ghi thành chi phí hiện tại. Theo [changelog chính thức](https://supabase.com/changelog/logs-usage-based-pricing), meter Upcoming đang soft launch, cảnh báo trong grace period chỉ là thông tin, chưa billable/enforced. Không cam kết grace vô thời hạn; kiểm lại trước execution/production. Log Query hiển thị 16%.

Bước còn lại: hoàn tất target-bound Infrastructure/add-on/usage readback và logs breakdown; chốt kho backup mã hóa/operator/cadence, chạy managed restore và đo RPO/RTO; sau đó chuẩn bị exact SQL approval. Recovery chưa chạy.

## Quyết định kho backup và thử local — 11/10/2026

Owner chọn **repo private giữ script/checksum; backup mã hóa ở kho riêng ngoài repo**. Đã chuẩn bị kho local QA ngoài repository với AES-256-GCM, key bọc DPAPI CurrentUser và ACL owner Windows/SYSTEM. **21/21 kiểm tra PASS**: tiến trình backup kết thúc trước khi tiến trình mới lấy lại khóa và restore fixture; giữ 51 bảng/85 policies/194 functions/78 lá và quyền A/B/revoked. Xem [hồ sơ custody mới](../../artifacts/recovery-custody-2026-10-11/OWNER_REVIEW.vi.md).

Đây là dữ liệu giả local, không phải export hoặc nghiệm thu project Singapore. Chưa kiểm mất máy/reboot, chưa chốt kho ngoài máy, nơi giữ khóa độc lập, operator/cadence/retention; chưa tạo repo hoặc upload GitHub. Managed recovery, `recoveryReview`, target allowlist và exact SQL approval giữ nguyên trạng thái trước đó. Thời gian/hashes các receipt lịch sử không được cập nhật lại.
