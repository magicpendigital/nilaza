# R02 — Schema MCY và đường tiến migration

Ngày 01/10/2026. Chỉ đọc/chuẩn bị; reconciliation, project mới, dọn schema và cloud acceptance **chưa thực hiện**.

Migration `20260925160325_initial_mcy_schema` thực sự nằm trong **Nilaza Staging QA** (`akgrokwnkfqnfjqrildi`) đang liên kết. SQL có các bảng yoga/editorial như teachers, courses, practice_runs, profiles, user_consents và editorial_*. `mcy-staging` (`mhumbczqrzutdnraafhs`) là project khác; project tên Nilaza (`uannkrywhxzrulufgqvx`) hiện inactive. Chưa xác định actor hoặc lý do đưa MCY vào Nilaza QA. Không tự đổi ref dựa vào tên project.

Root đã đọc metadata: statement_count=1, has_recorded_author=true, MD5 SQL `5ec18dcb5750592357022e31e4f1b9b9`. Không đọc danh tính tác giả/private rows. Fingerprint giúp đối chiếu statement, không chứng minh ý định hoặc an toàn. Phục hồi MCY SQL chỉ phục vụ forensic; **không đưa nó vào baseline mong muốn của Nilaza**.

## Nguồn và giới hạn

Ledger giữ blocked_pending_reconciliation, remoteOnly20260925160325 và projectRef cũ. Snapshot 26/09 có 25 timestamps ở cả hai phía; đây không phải full live comparison ngày 01/10. Hai SQL Admin phục hồi có byte SHA256 giống artifact và migrations:

- 20260917172721_admin_content_sync: `18b50345904d8d6074e56db3aa6400aa24392ea1d61a96e0672a2f8113833ac8`.
- 20260917174042_admin_content_sync_policy_tuning: `ac6ae8b06f49db4e6cc8ec464fc1ecaf67a3699500a07132433ed7ed78bdc5ab`.

Không tìm thấy initial_mcy_schema trong recovery/archive local. Approval AI Studio staging 26/09 không đồng nghĩa approval yoga/editorial baseline. Nhận định lịch sử “không chạm route/prompt/trace/audit” không loại trừ grants, triggers, FK, storage, auth hooks hay dependencies khác.

Whole-App scope hiện tại: chỉ docs/ledger metadata; không API, schema, mobile, Admin, auth, prompt, secrets, provider config. Không db push/repair/DROP/deploy/retarget/live write. Raw QA capture giữ tắt khi purge schedule chưa được xác minh. Ledger checker exit0 chỉ xác nhận cấu trúc hợp lệ, vẫn có thể blocked.

## Quyết định owner ngày 01/10

Owner chọn: **“Chuẩn bị QA sạch cho Nilaza; giữ môi trường cũ làm bằng chứng”**. Phương án A là hướng chuẩn bị đã được duyệt; phương án B giữ lại như lịch sử lựa chọn. Quyết định này chưa cho phép tạo project, apply SQL, đổi ref, chép secrets hoặc deploy. `akgrokwnkfqnfjqrildi` giữ nguyên. [R02-A inventory](R02-clean-qa-inventory.vi.md) và [candidate manifest](R02-clean-qa-bootstrap.json) đã có metadata/source/hash và các blocker; không xuất private rows, chưa replay/apply SQL.

## A — QA sạch cho Nilaza (đã chọn để chuẩn bị)

Giữ project hiện tại làm chứng cứ, dựng QA riêng từ source Nilaza đã review. Không copy MCY schema/rows. Đây là lựa chọn đề xuất, chưa cho phép tạo project, đổi ref, chép secrets hoặc apply SQL.

1. Inventory metadata: migrations/source; objects/ownership/extensions/grants/policies/security-definer/search_path/triggers/FK/functions/auth hooks/storage/realtime; phân loại Nilaza/MCY/shared/unknown; kiểm Edge/Admin/mobile references. Không dump private rows. Nếu lưu MCY statement, lưu forensic artifact có project/version/hash ngoài thư mục migrations thực thi.
2. Owner chốt target/region/dữ liệu phải giữ. Chuẩn bị exact bootstrap/migration set, schema allowlist, diff và preconditions. Dependencies Nilaza vào foreign/shared phải được giải quyết có mục đích, không đổi tên/bỏ file để history xanh.
3. Fresh preflight và approval cụ thể cho execution, snapshot/backup/rollback và secrets qua provider tooling. Apply/deploy/retarget là các hành động riêng trong scope được duyệt.
4. Trước cutover: inventory target đúng allowlist; RLS A/B, Admin capability, auth, Journal, credits và AI cost gate đạt. Xác nhận public target identity của app/Admin. Ledger target mới được ghi riêng; giữ nguyên history project cũ.

Rollback trước cutover: giữ liên kết cũ, dừng rollout. Sau cutover: revert config theo kế hoạch; dữ liệu mới cần xử lý riêng, không xóa hàng loạt. Không xóa project cũ trước retention/backup restore được review.

## B — Giữ QA hiện tại, cách ly/dọn MCY có review

Chọn khi owner xác nhận dữ liệu/tài nguyên tại akg cần giữ. Vẫn cần inventory và MCY source có provenance. Shared relationships chưa giải quyết thì không DROP/chuyển schema.

Chuẩn bị forward migration với explicit object allowlist và preconditions; kiểm FK/triggers/functions/grants/storage/realtime/auth hooks và tên shared/trùng. Quarantine/rename/drop từng object chỉ sau dependency analysis. Không mặc định DROP CASCADE, không migration repair để thay lịch sử. Owner duyệt exact diff, expected inventory trước/sau, dữ liệu giữ/dọn, snapshot restore test và rollback SQL. Chưa có exact cleanup SQL trong handoff vì source/dependency graph chưa đủ; không invent DROP.

Sau action: không còn foreign/shared ambiguity; Nilaza contracts đúng diff; history giữ nguyên + forward version tương ứng local; R22 A/B/security và app/Admin đạt. Chỉ sau approval + evidence mới xem xét reconcile ledger.

## Các cổng còn thiếu

| Công việc | Trách nhiệm | Nghiệm thu |
|---|---|---|
| Source/object dependency inventory | Agent chỉ đọc | Classification, fingerprints, dependency map |
| Chọn A/B và dữ liệu phải giữ | Database owner | A đã chọn; giữ toàn bộ QA cũ làm bằng chứng, target/region và execution cụ thể chưa duyệt |
| Apply/deploy/retarget/reconcile | Task riêng sau quyết định | Fresh preflight, SQL diff, backup/rollback, live acceptance |
| Retention/pg_cron/raw capture | Task retention riêng | Capture tắt đến khi purge được chạy/xác minh |

Actor có thể giữ unknown nếu không ảnh hưởng lựa chọn forward; không suy danh tính từ author-exists. Supabase CLI --version/help trước đó bị EPERM telemetry rồi escalation bị abort; không suy chúng đã PASS hoặc retry để che lỗi. Canonical deep security scan thất bại trước khởi tạo, tài liệu này không thay coverage.

Nguồn đã được security Agent kiểm ngày 01/10: [migrations](https://supabase.com/docs/guides/deployment/database-migrations), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [changelog](https://supabase.com/changelog). Compatibility notes là prerequisite kiểm server_version/extensions; chưa kết luận live project cần upgrade/reindex.

Manager test: đọc identity/MD5 và hai phương án; current ref/status không đổi, MCY không nhập baseline, không cloud action tự động. R02 preparation đã có bằng chứng; R02 reconciliation chưa đạt.
