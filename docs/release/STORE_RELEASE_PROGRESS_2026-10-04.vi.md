# Tiến độ chuẩn bị store release — 04/10/2026

Đây là hồ sơ tiến độ local và metadata chỉ đọc, chưa phải phiếu phê duyệt hay release manifest. Nguồn hiện tại còn dirty; không lấy bản APK debug-signed ngày 30/09 làm bằng chứng cho bản store mới.

**Cập nhật hiện tại 09/10/2026:** owner duyệt bước 1–2 và chọn Singapore Free làm backend chính dự kiến, QA đóng trước promotion production. Policy và gói chuẩn bị riêng đã cập nhật; app vẫn trỏ QA cũ. Xem [gói Free](SINGAPORE_FREE_PREPARATION_2026-10-09.vi.md). Gate bỏ yêu cầu Micro cố định, kiểm policy Free/Nano theo exact target cùng settings/quota/recovery. Settings thực tế chưa được xác minh qua browser do kết nối Chrome lỗi; không gán Nano/add-on thành fact. Allowlist rỗng, legacy ledger blocked, chưa chạy SQL hoặc signed release.

**Lịch sử 05/10/2026:** owner đã yêu cầu xóa project Sydney và thay bằng Singapore; lúc tạo đã xác nhận MagicpenDigital Pro, một Micro và mức cơ bản khoảng USD25/tháng. Resource lifecycle đã thực hiện; các bằng chứng local ngày 04/10 giữ nguyên phạm vi lịch sử, không tự trở thành bằng chứng cho target mới.

## Thứ tự và trạng thái

| Bước | Trạng thái | Bằng chứng hoặc điều kiện còn thiếu |
|---|---|---|
| 1A — Chuẩn hóa Android local | PASS | Tools 22.0/checksum/JDK 17 đạt; native release configuration thành công, 43 tasks thực thi, không còn SDK XML warning trong log mới. |
| 1B — QA sạch / ledger | BLOCKED | Native local rehearsal ngày 05/10 đạt 28 migrations/18 checks gồm quyền A/B/restore; managed acceptance và reconciliation chưa hoàn tất. Chuyển organization không xóa blocker ledger. |
| 2 — Chốt nguồn và cấu hình | BLOCKED | Singapore đã xác minh thuộc Nilaza Free; canonical Singapore đã chốt; còn dirty inputs, backend/EAS/schema và quota/features/recovery phù hợp Free. |
| 3 — Mobile Quality CI | BLOCKED | GitHub CLI đã đăng nhập; CI của HEAD baseline đạt, chưa kiểm các thay đổi workspace hiện tại trên candidate sạch. |
| 4 — Production signing build | BLOCKED | Chưa tạo signed candidate. Phải build từ commit/cấu hình đã chốt qua release job/provider được bảo vệ. |
| 5 — Native và manager acceptance | BLOCKED | Chưa có bản đã ký để cài và nghiệm thu đúng build. |
| 6 — Duyệt và submit store | BLOCKED | Chưa có manifest/packet/target/hash hoàn chỉnh hoặc quyết định submit chính xác. |

## Android local

- Gói chính thức: `commandlinetools-win-15859902_latest.zip`; phiên bản tools `22.0`.
- SHA-256 kiểm với nguồn Google: `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`.
- Vị trí tools: `.brand-work/android-sdk/cmdline-tools/22.0`.
- JDK dùng cho Gradle: Microsoft OpenJDK `17.0.19`; PATH máy trước đó trỏ Java 21.
- SDK prerequisites giữ nguyên: API/build-tools 36, NDK `27.1.12297006`, CMake `3.22.1`, licenses có sẵn.
- Script mới: `scripts/android-release-environment.ps1`; chỉ đặt môi trường trong process đang chạy rồi khôi phục giá trị cũ. Không sửa biến môi trường toàn máy, không nâng dependency app hoặc tự chấp nhận licenses mới.
- Có thể chạy trong PowerShell 7: `./scripts/android-release-environment.ps1 -Action Inspect` hoặc `-Action NativeConfigure`. Native configuration dùng project cache riêng để tránh lỗi Windows ACL trước đây.
- SDK Manager 22.0 có thông báo deprecated; đây là thông báo khác với cảnh báo SDK XML cần xác minh.
- `:app:configureCMakeRelWithDebInfo[arm64-v8a]`: **BUILD SUCCESSFUL**, 15 phút 17 giây, 43 tasks thực thi; Reanimated/Worklets và app native configuration đều được chạy. Đây là configure gate, chưa phải assemble/sign APK/AAB mới.
- Log mới không có `SDK XML` hoặc XML version mismatch. Còn Gradle/Kotlin deprecation và cảnh báo Expo `kspVersion` fallback; không chặn configure gate.
- Native evidence: `artifacts/store-release-readiness-2026-10-04/native-environment.json` và `native-configure.log`.

Nguồn chính thức đã đối chiếu: [Android download/checksum](https://developer.android.com/studio), [SDK Manager](https://developer.android.com/tools/sdkmanager). Đồng bộ SDK local không tự chứng minh image CI/EAS đã đồng bộ; cần kiểm versions/log ở môi trường tạo signed artifact.

## Kiểm tra local đã hoàn tất

| Kiểm tra | Kết quả |
|---|---|
| Mobile TypeScript | PASS |
| Mobile Jest | PASS — 46 suites / 281 tests |
| Release evidence + database target gate unit tests | PASS — 68 tests; không phải rehearsal DB |
| Data VI/EN | PASS — 7 decks, 78 cards, 0 mojibake/safety lint |
| Visual/runtime assets | PASS — 684 files, 62,36 MB |
| Governance | PASS — 22 agents, 6 lanes |
| Release source config | PASS — 0.1.3 / Android 4 / iOS 4; version của build EAS cuối cần kiểm riêng |
| Astrology contracts/content/core | PASS — 14 core tests |
| Astrology regression | PASS — 500 longitude cases và 50 full-chart grid cases; không chứng nhận đầy đủ độ chính xác vendor |
| Council/prompt consumers | PASS — canonical contract và 6 generated consumers |
| Metro web export + validator | PASS — 69,82 MB, 1 bundle không rỗng |
| Android embedded bundle | PASS — 10.066.389 bytes, 639 assets được copy |
| Legacy migration ledger | BLOCKED — checker exit 0 chỉ xác nhận metadata hợp lệ |

Bằng chứng local: `artifacts/store-release-readiness-2026-10-04/local-validation.json`. Đây là inventory sau kiểm tra trên workspace còn thay đổi, không đủ chứng minh immutable source/testedBundleSha256 hay remote CI.

Các export local dùng `.env.local` hiện có. Không lấy chúng làm bản production trỏ project mới. Lỗi EPERM khi ghi Gradle cache/Metro output dưới sandbox đã được xử lý bằng chạy đúng lệnh local với quyền được duyệt, không sửa ACL hoặc bỏ check.

## Target Sydney do owner cung cấp — lịch sử ngày 04/10

- URL: `https://supabase.com/dashboard/project/eorvoncndvfspdsodzfn`.
- Metadata chỉ đọc xác minh ngày 04/10: name `Nilaza`, organization `rzbpjfrndhrtxagpgdre`, region `ap-southeast-2` (Sydney), status `ACTIVE_HEALTHY`, PostgreSQL `17.11`.
- `list_migrations`: 0 migration. Catalog: 0 bảng public, 0 public function không thuộc extension. Điều này không chứng minh Auth/config/side effects hoàn toàn trống.
- Có pgcrypto; chưa thấy vector trong extension đã cài. Bootstrap phải kiểm prerequisite vector và các managed Auth/role contract.
- Owner cần chốt đây là production chạy QA trước launch hay staging lâu dài. Release runbook hiện đặt staging trong Free organization và end-user production trong Pro; không tự sửa target allowlist hoặc region expectations để checker xanh.
- Ledger QA cũ `akgrokwnkfqnfjqrildi` tiếp tục `blocked_pending_reconciliation`. Project mới cần hồ sơ/ledger riêng, đọc lại history, target allowlist, rehearsal chính xác, backup/restore và quyết định execution; không repair history QA cũ.
- 25 base migration + 2 forward migration trong bootstrap candidate đều khớp raw SHA-256. Kiểm hash không thay replay, grant/RLS acceptance hoặc provider/cost gate.

Nguồn: `docs/mvp-remediation/2026-10-01/R02-clean-qa-bootstrap.json`, `docs/SUPABASE_MIGRATION_LEDGER.md`, `docs/release/RELEASE_RUNBOOK.md`. R10 runtime/cost wiring, approved-source retrieval, Auth bootstrap và retention vẫn cần nghiệm thu riêng.

## GitHub và EAS

- EAS CLI 23.2.0 có phiên đăng nhập hiện có. Không đọc/copy/đổi signing credentials.
- EAS production ở cả project/account scope không có tên ba biến cần thiết: `EXPO_PUBLIC_NILAZA_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Chỉ ghi tên/status, không lưu giá trị.
- GitHub CLI đã đăng nhập `magicpendigital`; không lưu token vào hồ sơ này. Mobile Quality [run 37116039006](https://github.com/magicpendigital/nilaza/actions/runs/37116039006) đạt trên commit `235f03acb5ab2ad5a598691f25dedb18e2013448`. Run này không bao gồm các thay đổi dirty hiện tại và không chứng minh signing.
- Đọc protection của `main` trả HTTP 403 với yêu cầu GitHub Pro hoặc repository public. Chưa xác minh được branch protection; cần phương án bảo vệ release phù hợp trước khi chạy job có quyền production. Không tự đổi repository visibility hoặc gói trả phí.
- Gradle release hiện dùng debug signing. Build cuối phải chứng minh production signing từ output/provider; chỉ đặt profile tên production không đủ.
- Cloud target allowlist hiện trống. Lượt chuẩn bị ngày 04/10 không có cloud mutation. Lượt 05/10 chỉ thực hiện resource replacement được owner yêu cầu; chưa có SQL writes, runtime retarget, production signed build hoặc store submission.

## Việc tiếp theo — cập nhật 09/10

1. Đóng readback compute/add-ons, quota sử dụng, backup/recovery và side effects của Singapore Free; chuẩn bị protected operator/enforcement.
2. Hoàn thiện target-specific SQL execution packet, ledger/readback trong 24 giờ và duyệt đúng target/operation/hash. Không dùng packet Pro cũ hoặc repair QA cũ.
3. Chạy bootstrap sau khi execution gates đạt; nghiệm thu managed Auth/Storage/API/A-B/revoked và dữ liệu giả.
4. Review dirty inputs, tích hợp core/backend và retarget cấu hình theo scope được duyệt; tạo candidate source sạch.
5. CI trên đúng commit, protected production signing build, kiểm package/version/signature/hash và SDK environment.
6. QA trực tiếp trên đúng artifact đã ký: Tarot78 VI/EN/offline/error/timeout, auth/account isolation, Journal/credits/cold start; customer roles, manager/UAT, cleanup/promotion và submit riêng.

## Phương án region và QA trước launch — đã chốt 05/10

Phần tư vấn dưới đây ghi lại đề xuất ngày 04/10. Ngày 05/10 owner đồng ý thứ tự đề xuất, yêu cầu xóa Sydney/thay Singapore và chọn MagicpenDigital Pro, một Micro, mức cơ bản khoảng USD25/tháng. Quyết định resource replacement không đồng nghĩa nghiệm thu schema/ứng dụng hoặc submit store.

- Supabase [đổi region bằng project mới](https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z), sau đó cập nhật endpoint, keys và cấu hình Auth. Với thị trường chính Việt Nam/Đông Nam Á, đề xuất specific region Singapore `ap-southeast-1` trong [danh sách chính thức](https://supabase.com/docs/guides/platform/regions); lợi ích độ trễ là kỳ vọng địa lý, cần đo trên thiết bị. Project Sydney hiện 0 migration/0 bảng public nên chưa cần chuyển schema Nilaza, nhưng phải kiểm Auth, Storage, Functions và integrations trước mọi thao tác xóa.
- Phương án ưu tiên: QA riêng bằng dữ liệu giả, production Singapore khởi tạo từ cùng bộ migration đã nghiệm thu và seed nội dung chính thức. Không sao chép tài khoản/journal/credits thử vào production. Long-term QA phải chốt lại organization/cost theo runbook; không mặc định thêm một project Free còn slot.
- Phương án tiết kiệm trước launch: dùng một project Singapore làm production candidate, QA bằng tài khoản và dữ liệu giả; sau QA dọn dữ liệu thử theo inventory, giữ schema, nội dung chính thức và migration history. Cần dọn cả Auth users, Storage objects, readings/journals, credits/subscriptions, jobs/queues và dữ liệu quan sát liên quan; tắt outbound/integrations trong rehearsal và đối soát trước khi bật cấu hình thật. Không dùng reset/repair history để vượt ledger blocker.
- Sau khi dọn dữ liệu hoặc đổi endpoint/config, chạy lại smoke, quyền A/B/revoked, Auth/Storage và manager acceptance ở trạng thái production cuối. Nếu tạo lại project, endpoint/keys đổi nên phải cấu hình và build lại artifact. Đóng gói signed build khi target/config đã chốt.
- Thứ tự đề xuất: chốt Singapore và lifecycle QA → rehearsal migration/roles/restore → execution packet với target/cost cụ thể → QA dữ liệu giả → dọn fixtures hoặc khởi tạo production riêng → CI/signing → acceptance đúng artifact → duyệt submit. Sydney được giữ đến khi có quyết định riêng và kiểm inventory đầy đủ.

## Kết quả thay project — 05/10/2026

- **PASS:** `supabase projects delete eorvoncndvfspdsodzfn --yes` qua CLI đăng nhập hiện có, exit 0, trả `Deleted project`. CLI inventory sau thao tác không còn ref này. `get_project` cũ trả no-permission; riêng lỗi đó không chứng minh xóa.
- Trước khi xóa: 0 Auth users/identities, 0 Storage buckets/objects, 0 public relations/custom functions, 0 migrations/Edge Functions/branches/Vault secrets. Chỉ có bảng managed Auth/Storage/Realtime/Vault; không sao chép dữ liệu. Project settings không được export; xóa là không thể phục hồi.
- **PASS:** tạo đúng một project [Nilaza Singapore](https://supabase.com/dashboard/project/etfajmrwyywokgafzxsb), ref `etfajmrwyywokgafzxsb`, org `rzbpjfrndhrtxagpgdre`, region `ap-southeast-1`, `ACTIVE_HEALTHY`, Postgres GA `17.11.0.002`. CreatedAt UTC `2026-10-04T17:39:22.367486Z` tương ứng 00:39 ngày 05/10 giờ Bangkok.
- API URL: `https://etfajmrwyywokgafzxsb.supabase.co`. Recheck: 0 bảng public, 0 tài khoản Auth, 0 Storage buckets/objects, 0 migrations/Edge Functions. CLI list xác minh chỉ có một project trong Pro org.
- Chi phí: [pricing](https://supabase.com/pricing) và [compute](https://supabase.com/docs/guides/platform/compute-and-disk) không liệt kê phụ phí riêng Sydney/Singapore cho cùng cấu hình. Pro từ USD25/tháng, USD10 compute credit; Micro khoảng USD10/tháng. Xóa trước rồi tạo tránh compute chạy song song. Phí đã phát sinh ở Sydney vẫn tính trong kỳ; thuế, vượt quota, add-on và AI provider tách riêng. `get_cost` trả USD0/tháng không được ghi thành tổng hóa đơn bằng 0.
- **BLOCKED:** kiểm instance-size/Billing trên Dashboard. Project Pro mới dự kiến Micro theo mặc định chính thức, nhưng API metadata không trả compute size; browser đang không đọc được Dashboard nên chưa có chứng cứ instance-size thực tế hoặc hóa đơn cuối.
- Receipt: `artifacts/supabase-singapore-replacement-2026-10-05/lifecycle.json`; plan/preflight: `docs/feature-plans/supabase-singapore-replacement-2026-10-05.json`. Plan QC vẫn current, vì resource lifecycle và schema/release đã được tách bằng phạm vi thực tế và evidence.

## Khôi phục và skill review

Tools/cache/export nằm trong workspace và có thể bỏ qua khi chuyển về môi trường trước. Script khôi phục process environment; APK cũ và dữ liệu thiết bị được giữ. Lượt chuẩn bị 04/10 không mutate cloud. Lượt 05/10 đã xóa project Sydney theo yêu cầu trực tiếp, không thể rollback project đã xóa; new resource và settings sẽ được cấu hình qua các gate tiếp theo. Chưa đổi endpoint trong app.

Nilaza Plan-QC skill còn current: đã áp dụng preflight, impact, migration stop và immutable release gate. Supabase skill được dùng cho metadata/rehearsal boundary; [migration docs](https://supabase.com/docs/guides/deployment/database-migrations) và changelog được đối chiếu. Không có phát hiện làm thay đổi skill source trong task này.

## Rehearsal SQL, quyền A/B và restore — 05/10/2026

- **PASS local:** cả 27 candidate migration khớp raw hash và replay được trên PostgreSQL nhúng 17.5/pgvector 0.8.0. Seed 78 lá VI/EN đạt.
- **FAIL baseline, đã sửa local:** 32/46 bảng public vẫn cấp client TRUNCATE. Lệnh thử dưới authenticated thực sự được phép xóa toàn bảng Journal trong transaction đã rollback. Không chạy lệnh này trên cloud; chưa chứng minh đường khai thác HTTP Data API.
- Chuẩn bị một forward SQL `20261004183447_client_table_privilege_boundary.sql` bằng CLI: thu hồi quyền table-wide nguy hiểm cho PUBLIC/anon/authenticated trên inventory Nilaza, ngăn postgres public defaults cấp lại; giữ CRUD, RLS/service_role/rows/history. Chưa apply remote.
- **PASS local sau sửa:** 28 migration dựng sạch, 18 kiểm tra; forward upgrade giữ fixture counts và chặn hai client roles; archive nhúng khôi phục rows/schema/indexes/policies/grants/RPC/default grants, A/B và revoked role.
- **BLOCKED:** Docker LinuxEngine không chạy sau bounded startup; Start-Service không mở được com.docker.service. PGlite archive không thay native pg_dump/Supabase restore. Target vẫn PG17.11/vector0.8.2 available; cần kiểm lại bản native và managed stack.
- **BLOCKED:** Auth/Storage/API live acceptance, Micro/add-ons thực tế, side effects config, protected execution, exact owner approval. Manifest/ledger riêng Singapore giữ draft/pending; global allowlist và ledger QA cũ không đổi. Remote recheck vẫn 0 public tables/Auth users/Storage/migrations.
- `validate:backend` PASS; `supabase:check` 72 pass/9 warn/0 fail là source/env-name readiness local; `supabase:migration-ledger:check` exit 0 nhưng giữ BLOCKED. Target gate trả BLOCKED với 0 lỗi hash/cấu trúc.
- Owner review: [rehearsal packet](../../artifacts/singapore-migration-rehearsal-2026-10-05/OWNER_REVIEW.vi.md). Evidence gồm baseline FAIL, embedded PASS, native/managed BLOCKED; không chứng nhận UI/UX điện thoại hoặc release signing.
- Skill review: release-control đã có yêu cầu TRUNCATE/default grants, ordinary roles và separate restore coverage; Nilaza Plan-QC giữ current. Bản cài local PGlite không đổi dependencies ứng dụng.

## Native PostgreSQL/pg_dump hoàn tất sau khi owner mở Docker — 05/10/2026

- Docker Engine29.5.3 Linux/amd64 đã được xác minh. Không dùng hoặc reset các container `supabase_*_nilaza` hiện có; chúng vẫn chạy sau QA.
- **PASS:** official cached Supabase Postgres image ghim digest, PostgreSQL17.6/pgvector0.8.2. 28 migration dựng sạch và 18 checks đều đạt: ordinary A/B/staff/revoked, forged JWT claim, Journal/Chat/Tarot, raw source, quota RPC, table/default grants, restore.
- Native baseline 27 migration tái hiện lỗi client TRUNCATE. Forward upgrade trên archive baseline giữ 2 Journal/78 cards/1 owner và từ chối client TRUNCATE. Không sửa thêm SQL sau lần chuẩn bị.
- **PASS:** pg_dump custom archive 460.886 bytes; restore giữ ACL/owners và so sánh invariants trên cluster độc lập trong 3.791 ms ở lượt cuối. Cluster roles fixture được bootstrap riêng, không giả rằng pg_dump đã chứa roles. Các container riêng network none/0 ports/0 bind mounts đã dừng; dumps/logs/receipts được lưu.
- **Giới hạn:** local executor là superuser và patch17.6, target managed postgres không superuser/patch17.11; managed Auth/Storage/API/operator privilege acceptance chưa chạy. Native PASS là rehearsal SQL bằng dữ liệu giả, không release hoặc native mobile acceptance.
- Fresh get_project/list_migrations và public-table aggregate xác minh Singapore ACTIVE_HEALTHY, 0 history/0 public tables. Cloud không có SQL writes. Target gate tiếp tục BLOCKED, 0 lỗi hash/cấu trúc; replay/RLS/restore gate local đã PASS, các blocker target/ledger/allowlist/side effects/compute/approval còn giữ.
- Browser đến Dashboard yêu cầu sign-in. Cơ chế duyệt tự động từ chối `Authorize Supabase` OAuth (GitHub `user:email`, read-only) vì consent GitHub CLI trước đó không bao gồm grant này; chưa cấp quyền. Cần human authorization riêng để kiểm Micro/Billing trên Dashboard, không đổi billing hay cấp repo scopes.
- Receipt cuối: `artifacts/singapore-migration-rehearsal-2026-10-05/native-rehearsal.json`; owner packet đã cập nhật. Hai lỗi adapter local được sửa (JSON nhiều dòng và lệnh utility); receipts thất bại được giữ, native retest PASS. Historical SQL/legacy ledger/global allowlist và dirty source độc lập không đổi.
