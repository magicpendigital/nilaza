# R02 — Chuẩn bị QA sạch cho Nilaza

Ngày01/10/2026. Owner đã chọn **chuẩn bị QA sạch, giữ QA cũ làm bằng chứng**. Hồ sơ này hoàn tất phần kiểm kê metadata và candidate bootstrap; **chưa tạo project, apply SQL, deploy hay cutover**. Candidate chưa đủ điều kiện thực thi/ra mắt. QA cũ `akgrokwnkfqnfjqrildi` và liên kết hiện tại giữ nguyên.

## Điều đã xác minh

Root dùng Supabase connector SELECT catalog/config metadata; security Agent đọc25SQL local và review semantic prerequisites. Query connector của child bị treo/abort và không trả kết quả; không tính nó vào coverage. Không đọc private business rows, function bodies, migration SQL text hoặc danh tính author trong lượt inventory này.

| Metadata live của QA cũ | Kết quả |
|---|---:|
| Public tables / bật RLS / force RLS | 92 /92 /0 |
| Public hoặc nilaza_private views | 0 |
| Bảng thuộc CREATE allowlist Nilaza local | 46/46; không thiếu tên bảng |
| Bảng ngoài CREATE allowlist | 46 |
| Columns / FK / noninternal triggers* | 862 /159 /13 |
| Function identities không thuộc extension, public+nilaza_private | 37 |
| Function helper ngoài nguồn Nilaza | private.set_updated_at() |
| Policy metadata / table grant groups | 143 /273 |
| Routine grant groups, gồm extensions | 424 |
| Storage buckets | 0 |
| Migration timestamps | 26 =25local +initial_mcy_schema |

*Trigger query gồm public/nilaza_private và auth.users. Hai trigger canonical ở admin_role_assignments;11trigger trên bảng ngoài allowlist gọi private.set_updated_at. Không có noninternal auth.users trigger trong kết quả này. nilaza_private tồn tại và chỉ có functions là phù hợp nguồn, không phải thiếu schema.

Postgres17.6; vector0.8.2, pgcrypto1.3; không pg_cron/pg_net trong extension list đã đọc. Realtime publication hiện chứa generation_jobs. SQL LIMITs200/2000/500/1000/100 đều cao hơn số hàng trả về; không lấy một danh sách bị cắt làm toàn bộ inventory. Fingerprints/signatures, bảng ngoài allowlist, trigger edges và metadata được lưu trong [bootstrap JSON](R02-clean-qa-bootstrap.json).

Nhóm ngoài allowlist có teachers/courses/practice_runs/profiles/user_consents, editorial_*, media/session/checkin/practice tables. Chúng phù hợp dấu vết MCY đã xác minh, nhưng tên/setdiff không chứng minh từng DDL có provenance giống statement MCY. Không copy nhóm này hoặc helperprivate sang QA sạch. Actor/lý do vẫn unknown; không cần suy danh tính để chọn đường tiến.

Không thấy FK public→public nối hai nhóm trong159FK đã đọc. Điều đó **không loại trừ** function/dynamic SQL/policy/auth-provider dependencies. 37function names/signatures khớp phạm vi nguồn không chứng minh bodies giống nhau. Provider Auth hooks/settings, security-definer effective grants, dynamic dependencies và actual A/B access vẫn là gate trước cutover. Giữ QA cũ nguyên trạng chưa phải tested forensic backup hoặc write freeze đối với actor khác.

## Candidate bootstrap cụ thể

[Manifest](R02-clean-qa-bootstrap.json) ràng buộc raw SHA256 của25migration Nilaza theo timestamp, thêm một forwardSQL chuẩn bị tại20261001000000, và hashes seed. Không đưa20260925160325_initial_mcy_schema, archive duplicates, old rows/authusers/secrets hoặc clonepublic/private schema vào baseline thực thi. Historical25SQL giữ nguyên.

Các vấn đề đã tìm và xử lý/đưa vào gate:

1. **Credits sai contract:** cả actualQA và fresh sequence dùngreason/delta/balance_after; endpoint cũ dùngamount/transaction_type. [R10 read guard](R10-credits-read-guard.vi.md) đã sửa local GET theo delta và khóa debit cũ. Vẫn thiếu atomic generation reservation/settle/refund và quota/budget policy; không thêmamount để che mâu thuẫn.
2. **Raw sources đọc rộng:** live metadata cóPUBLICSELECT USING(true) fingerprint vàanon/authenticatedSELECT grants. [ForwardSQL](R03-source-read-forward.vi.md) đã chuẩn bị để đóng customer rawread; **chưa apply/replay**. Staff read thực tế làcontent.read **hoặc** content.publish vì policyFORALL hiện hữu được giữ. Backend approved-source/licensing là R14 riêng.
3. **Cron/retention:** weekly cron mặc định off, chưa có active Edge wiring. Trace flag ban đầu off; AI Studio migration cuối có thể schedulehourlypurge nếu target đã cài pg_cron. Side effect cần duyệt rõ; rawQA capture giữoff đến khi consent/purge đạt.
4. **Seed không chỉ upsert:** seed.sql dùngpsqlinclude, không feed trực tiếpexecute_sql. Generated payload346,246bytes/7tables cóBEGIN/COMMIT, upsert vàDELETEprompt/Council templates. Chỉ seed payload R20 đã review trên target mới trống với scope riêng. Seed không tạo authuser/firstAdminowner.
5. **Infra khác:** vector public là prerequisite hiện tại; không tự move extension để advisor xanh. Storage buckets và realtime membership không được baseSQL khai báo đầy đủ; không clone QA cũ. Cần explicit allowlist nếu product cần.

## Lộ trình thực thi sau chuẩn bị

| Phase | Việc cụ thể | Cổng ra |
|---|---|---|
| P0 | Chốt exact project/region, schema allowlist, hashes, target-specific ledger/preflight | Owner duyệt scope cụ thể; oldledger vẫnblocked |
| P1 | Replay disposable PostgreSQL/Supabase riêng; duyệt target mới trống, auth/roles, pgcrypto/vector | SQL/prerequisites/replay đạt; chưa expose client |
| P2 | Atomic credits/quota forward +rawsource role tests | Auth/cost/source boundary đạt; không rewrite lịch sử |
| P3 | Seed reviewedR20; bootstrap firstQAowner riêng | Seed/hash/capability/readback đạt; không chép customer data |
| P4 | Edge/secrets/route/prompt publish từng scope | Verified versions/cost controls/purge; weekly vàcaptureoff |
| P5 | Hai userA/B, Journal/credits/Admin/input/trace; signednative; targetidentity app/Admin | Gates đạt rồi mới cutover |

Tạo project, apply/reconcile, role bootstrap, secrets, deploy và cutover là các action riêng. Quyết định “chuẩn bị QA sạch” chưa duyệt chúng. AGENTS.md/migration ledger yêu cầu reviewed forward path và database-owner approval; không push/repair trong trạng tháiblocked. Không đề nghị applycandidate trong khi atomiccost và actualreplay còn thiếu.

Rollback trướccutover: dừng targetphase, giữoldQA/currentlink; không xóa oldQA. Reset/delete target lỗi cần duyệt exacttarget riêng. Saucutover phải xử lý dữ liệu mới theo retention/export plan trước revert; không coi đổiURL là rollback dữ liệu.

Manager nghiệm thu phần chuẩn bị: mởmanifest, đối chiếu25hash+forward+seed, thấy46bảng canonical/46ngoài nguồn; nhìn rõcredit/rawsource/cron blockers, actualchecks và execution chưa duyệt. G1/MVP vẫn chưa nghiệm thu. Supabase skill và NilazaPlan-QC còn current: source/privilege gates, exactscope và approval cho live giữ nguyên, không sửa skill.
