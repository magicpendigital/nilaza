# Đánh giá bảo mật và performance — 30/09/2026

Phạm vi: nguồn Nilaza trong workspace hiện tại, lockfile npm và metadata/advisor **Nilaza Staging QA**. Đây là đánh giá bằng chứng cấu hình và mã được review; không phải kết quả Deep Security Scan hoàn tất, pentest hay chứng nhận an toàn production. Không thay credentials, RLS, DB, migration hoặc dependencies.

## Giới hạn của Deep Security Scan

Plugin Codex Security thất bại trước discovery, tại `workbench_db.py begin-deep-scan`. Không trả scan ID, thư mục scan, canonical findings hoặc coverage. Không retry hoặc tạo scan thay thế theo hướng dẫn skill. Coverage và token usage của scan chưa đo được. Tài khoản được advisory báo `not_granted` Daybreak; [đăng ký](https://chatgpt.com/cyber). Không có kết luận “không có lỗ hổng”.

[Deep Security Scan SKILL.md](C:/Users/Admin/.codex/plugins/cache/openai-curated-remote/codex-security/0.1.31/skills/deep-security-scan/SKILL.md) yêu cầu: “An invocation failure before a scan starts is still a blocker; do not create a replacement scan or infer results.” Vì lỗi xảy ra trước khởi tạo, không có canonical scan để hoàn tất hoặc suy ra findings. Đây là giới hạn của scan riêng; review source, dependency audit và advisors bên dưới vẫn được thực hiện và ghi rõ loại bằng chứng.

## Bằng chứng Staging hiện tại

Đã dùng connector Supabase đọc metadata/advisors, không đọc private user rows hay raw trace payload. Snapshot đầy đủ nằm trong [staging-observations.json](staging-observations.json). Project chính tên Nilaza đang `INACTIVE`; Nilaza Staging QA đang `ACTIVE_HEALTHY`. Hai môi trường không được coi là tương đương.

| Kiểm tra | Kết quả | Diễn giải |
| --- | --- | --- |
| Security advisor | 1 warning `private.set_updated_at` có search_path mutable | Cần review/set search_path rõ ràng trong forward migration được duyệt; chưa chứng minh khai thác |
| Security advisor | `vector` ở schema public | Cần review vị trí extension và grants; warning không tự chứng minh dữ liệu bị lộ |
| Auth | Leaked Password Protection disabled | [Chuẩn kiểm tra mật khẩu](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); cần bật qua quy trình cấu hình được phép |
| RLS | 28 bảng RLS enabled nhưng không có policy (INFO) | Thông thường deny-all với client, có thể chủ ý cho server-only. Không kết luận “28 bảng công khai”. Snapshot chứa cả schema yoga/editorial dùng chung Staging, không phải tất cả thuộc Nilaza |
| Performance | 96 foreign key không covering index, trong đó 39 tên bảng thuộc nhóm Nilaza | Cần ưu tiên theo query/cascade/delete thực tế, không thêm hàng loạt index vì advisor |
| Performance | 26 RLS initplan warnings, 24 thuộc nhóm tên Nilaza | Review `(select auth.uid())` và query plans; [hướng dẫn](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan) |
| Performance | 21 multiple permissive policies, 14 thuộc nhóm tên Nilaza | Có thể tăng số policy checks; [hướng dẫn](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies) |
| Performance | 43 unused indexes, 23 thuộc nhóm tên Nilaza | Staging tải nhỏ không đủ căn cứ xóa; cần usage window và workload |
| Retention | pg_cron không có trong pg_extension | Raw QA capture phải tiếp tục tắt cho tới khi purge được cấu hình và kiểm chứng |
| Migrations | Ledger blocked vì remote-only `initial_mcy_schema` | Không chạy generic db push/repair. Không được suy từ checker artifact pass sang an toàn migration live |

Phân loại “thuộc nhóm Nilaza” chỉ dựa trên prefix bảng và là phép lọc ưu tiên, không phải ownership audit toàn bộ DB. [Foreign-key advisor](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [extension](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).

## Dependency audit

Đã chạy `npm audit --omit=dev --json`; dữ liệu nguyên bản ở [dependency-audit.json](dependency-audit.json). Registry báo **218 package nodes bị ảnh hưởng: 1 critical, 184 high, 33 moderate**. Đây không phải 218 lỗ hổng độc lập hay 218 đường khai thác ứng dụng. Nhiều node bị đánh dấu qua cùng dependency chain; Expo/RN CLI và build tools còn nằm trong graph `prod` vì cách khai báo dependency. Cần triage phiên bản, advisory, node/path và reachability trước khi chốt mức rủi ro runtime. Không chạy `npm audit fix --force` hoặc nâng Expo/RN hàng loạt trong lần review này.

Lockfile có `node_modules/tar` phiên bản7.5.16. Advisory [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) mô tả DoS khi giải nén input không tin cậy; audit này không chạy payload hay chứng minh ứng dụng có archive-upload path. Cần triage cả tooling/CI, không chỉ mobile binary.

## Rủi ro sản phẩm và dữ liệu xác nhận từ source

| Mức | Vấn đề | Bằng chứng / bước chốt |
| --- | --- | --- |
| P1 | Journal edit/delete chỉ local; xóa mục không xóa bản cloud | [App.tsx](../../../apps/mobile/App.tsx) tại 4711–4723. Cần endpoint update/delete có ownership và test account A/B, retry/offline tombstone |
| P1 | Export chỉ đếm dữ liệu và toast; account deletion chỉ xóa namespace/sign-out | App.tsx 4764–4780 và copy 5594–5596. Tránh mô tả là export/cloud deletion hoàn chỉnh; cần export file và vòng đời xóa cloud |
| P1 | Credit/entitlement chưa authoritative trong consumer flow | App.tsx 3086–3087 forced free; deductUserCredit chưa được app sử dụng; backend route /deduct mapping cần kiểm chứng. Chưa chứng minh có thể abuse provider bill nhưng kiểm soát chi phí chưa đủ căn cứ nghiệm thu |
| P1 | Nhiều active global Persona prompts + selector chưa purpose-specific | `persona-prompt-assembler.ts` 174–197 và metadata Staging. Cần unique version/purpose/pointer rõ; tránh dùng context handoff template làm base system |
| Chưa xác minh | RLS allow/deny, session revocation, rate limit và quota under adversarial inputs | Type/source checks và advisors không thay được authenticated staging tests. Không dùng service role giả user để kết luận ownership an toàn |
| P2 | Generic local saveJson/removeJson nuốt lỗi AsyncStorage | storage.ts:23–39. Có nguy cơ UI tiếp tục báo lưu/xóa dù disk thất bại ở consumers không có wrapper riêng; cần injected-write-failure test cho Journal/auth/privacy, không suy ra Astrology repository cũng nuốt lỗi |

Điểm tích cực có bằng chứng: client không nhận provider key qua EXPO_PUBLIC; Admin có protected shell, capabilities và transport allowlist; 49 Admin tests đã đạt, bao gồm role revocation và credential destination; trace metadata được redacted và Owner reveal có endpoint riêng. Đây là cơ chế đã có, chưa phải một chứng nhận tổng thể. [Tài liệu RLS hiện hành](https://supabase.com/docs/guides/database/postgres/row-level-security) yêu cầu đồng thời grants và policy ownership; chưa có allow/deny live bằng hai tài khoản trong audit này.

## Performance mobile

| Phép đo source/file | Kết quả |
| --- | --- |
| Runtime assets | 684 file; 65.392.218 bytes ≈ 62,36 MiB |
| Tarot assets | 560 file; 54.443.775 bytes ≈ 51,92 MiB |
| Assets khác | Features ≈ 3,97 MiB; personas ≈ 4,88 MiB; brand ≈ 1,59 MiB |
| App.tsx | ≈ 660 KB và khoảng 16.000 dòng không rỗng; nhiều feature/styles còn chung một module |
| List lớn | Tarot 78 mục, Journal, chat dùng ScrollView + map; chưa thấy virtualization trong các routed surfaces |
| Scroll | root setContentScrollY mỗi event, throttle16; nguy cơ render rộng |
| Size gate | Có validator cap120MiB và CI web-export gọi validator ở mobile-quality.yml:89; cần gắn artifact RC với đúng CI/source state |

Các phép đo này **không phải** installed APK/AAB/IPA size, network transfer, startup, RAM hay FPS. Asset require đồng thời không có nghĩa tất cả pixel đã decode khi startup. Component trùng lặp tạo maintenance cost; phần lớn raw footprint hiện tại đến từ artwork đóng gói cả 7 bộ bài.

Ưu tiên: virtualize list dài; giảm state update trên scroll; tách màn và state; chỉ bundle core art cần offline, tải/caching phần tùy chọn với checksum/rollback; thiết lập ngân sách startup/RSS/jank/p95 AI ở RC. Đo trên release Android và iOS, font lớn, máy ít RAM, mất mạng và lịch sử dài. React Native mô tả ScrollView tạo tất cả children, còn FlatList tạo theo vùng hiển thị; profiling release cần thiết để kết luận tác động thực tế. [ScrollView](https://reactnative.dev/docs/scrollview), [Performance](https://reactnative.dev/docs/performance).

## Manager test path và thứ tự

1. Internal tester đăng nhập đúng Staging/current RC; ghi build và account class, không copy token.
2. Tạo Journal giả lập, sửa/xóa rồi mở trên client thứ hai; kiểm tra export file và xóa cloud riêng trong tài khoản disposable được duyệt.
3. Kiểm tra free/premium/server entitlement, quota và provider fallback/error; đối chiếu trace version/model/status.
4. Rà soát advisory/dependency reachability và chạy scan/pentest thành công trước public beta.
5. Đo release startup/list-memory/jank/AI latency; chốt performance budgets và alert thresholds trước scale.

Rollback: chưa có thay đổi runtime, DB hoặc dependency để rollback. Các finding source cần fix theo vertical slice riêng và retest. Scope read-only; không dùng report này để cấp deployment, migration hoặc destructive-action authority.
