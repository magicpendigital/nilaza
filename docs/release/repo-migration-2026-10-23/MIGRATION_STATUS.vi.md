# Nilaza — chuyển sang repo sạch (phương án B): tiến độ và bước cloud chờ duyệt

Ngày 23/10/2026, Asia/Bangkok. Owner đã đồng ý **phương án B** (repo mới sạch, repo cũ đổi tên làm kho lưu trữ). Hồ sơ Plan & QC: [`repo-migration-clean-source-2026-10-23.json`](../../feature-plans/repo-migration-clean-source-2026-10-23.json) — Feature Preflight **PASS**. Danh sách dữ liệu cũ để Owner xóa: [STALE_DATA_REPORT.vi.md](STALE_DATA_REPORT.vi.md).

**Trạng thái (cập nhật sau khi Owner duyệt): các bước GitHub đã thực hiện và kiểm lại bằng API — xem mục 0. Còn lại cho Owner: nối lại Vercel (mục 4, bước 5) và chọn nơi lưu PNG gốc Tarot.** Chưa có thay đổi nào về Vercel, Actions, quyền truy cập hay cloud khác.

## 0. Kết quả thực thi trên GitHub (23/10/2026)

| Bước | Kết quả |
|---|---|
| Kiểm trước | Repo `magicpendigital/nilaza` (node ID `R_kgDOS4jMTQ`) private, tên `nilaza-legacy` còn trống, cây sạch có commit `2b91794`, không còn thay đổi chờ commit |
| 1. Đổi tên repo cũ | `magicpendigital/nilaza-legacy`, **cùng node ID `R_kgDOS4jMTQ`**, vẫn private; 29 nhánh và 21 PR mở còn nguyên |
| 2. Trỏ lại remote của `D:\nilaza` | `origin` = `https://github.com/magicpendigital/nilaza-legacy.git`; `ls-remote` trả đúng `main` = `bdde549` và `codex/admin-shared-content-sync` = `235f03a` |
| 3. Tạo repo mới | `magicpendigital/nilaza`, node ID **`R_kgDOVUUTSQ`** (khác repo cũ), private, 0 fork |
| 4. Đẩy commit gốc | `main` = **`2b91794`** (khớp commit local); nhánh duy nhất `main`, 1 commit |
| Kiểm lại bằng API | Cây `main`: **2.576 tệp, 280,3 MB, tệp lớn nhất 6 MB, không bị cắt (`truncated=false`), 0 đường dẫn** khớp `.codex*`, `Login Data`, `Cookies`, `.env*`, `.keystore/.jks/.pem`, `.apk/.aab`, `node_modules`. Thư mục gốc chỉ gồm: `.easignore`, `.github`, `.gitignore`, `AGENTS.md`, `DESIGN.md`, `README.md`, `apps`, `assets`, `deno.lock`, `docs`, `package*.json`, `packages`, `scripts`, `skills`, `supabase`, `tsconfig.json`. 0 PR, 0 issue. |

### Vercel (24/10/2026) — đã nối lại

Thực hiện trong trình duyệt tích hợp sau khi Owner tự đăng nhập Vercel (token Vercel của agent không có quyền vào team `magicpens-projects`, Chrome thật không kết nối).

| Mục | Trước | Sau |
|---|---|---|
| Repo nối với `nilaza-admin-staging` | `magicpendigital/nilaza-legacy` (nối từ 19/09, đi theo repo đã đổi tên) | **`magicpendigital/nilaza`** — thông báo “Git repository connected”, trang Git hiển thị “Connected just now” |
| Cách thực hiện | — | Disconnect (hộp thoại xác nhận: cấu hình project được giữ nguyên) → GitHub → chọn `nilaza` trong danh sách repo của `magicpendigital` (Vercel GitHub App đã thấy cả `nilaza` và `nilaza-legacy`) → Connect |
| Root Directory | `apps/admin` | `apps/admin` (không đổi) |
| Node.js | 24.x | 24.x (không đổi) |
| Ignored Build Step | lệnh Custom đã lưu 21/10 | giữ nguyên, đọc lại đúng nội dung (`codex/android-release-unblock-2026-10-19` hoặc rỗng → bỏ qua; nhánh khác như `main` → build) |
| Production branch | `main` | `main` (không đổi) |
| Deployment mới do thao tác nối | — | Không có: bản mới nhất vẫn là Production `235f03a` ngày 04/10 |

**Build thử từ repo mới (24/10/2026, sau khi Owner duyệt đẩy `bd86926`):** deployment `4tGCiLZos…` — **Production, Ready, 8 giây**, nguồn `main` @ `bd86926`, build do Git kích hoạt tự động (`createdBy` magicpendigital). Log build: `Cloning github.com/magicpendigital/nilaza (Branch: main…)` (5,4 giây), lệnh Ignored Build Step chạy và trả 1 (nhánh `main` → tiếp tục build), `vercel build`, `Wrote hosted Admin runtime config`, `Build Completed [247ms]`, `Deployment completed`. Bản này đã gán domain `nilaza-admin-staging.vercel.app` (Current). Kiểm HTTP: trang chủ và `ai-studio.html` trả 200 (`<title>Nilaza Admin`, `Nilaza AI Configuration Studio`; `data-admin-authorized="false"` khi chưa đăng nhập). Cấu hình runtime nhúng trong trang chỉ có `SUPABASE_URL` và khóa **publishable** (46 ký tự); **không có** tên biến kiểu service/secret/private. URL Supabase vẫn là project **QA cũ** (`akgrokwnkfqnfjqrildi`), đúng với trạng thái “chưa retarget sang Singapore”.

### CI online trên repo mới (GitHub Actions, Linux, Node 24.19.0) — kết quả thực tế

| Commit | Workflow | Kết quả |
|---|---|---|
| `2b91794` (commit gốc) | Mobile quality | **SUCCESS** — CI online đầu tiên cho mã nguồn sạch |
| `2b91794` | Admin quality | **FAILURE** ở bước `skills:validate`: 4 tệp (`nilaza-tarot-deck-production/SKILL.md`, `nilaza-tarot-content-qc/SKILL.md` và `agents/openai.yaml`, `nilaza-tarot-art-qc/SKILL.md`) “không khớp hash manifest” |
| `55831c0` (sau khi sửa) | Admin quality | **SUCCESS** |

**Nguyên nhân gốc của lỗi skills (cũng giải thích các lỗi skills ở các lượt CI lịch sử):** `skills/manifest.json` ghim SHA-256 của **byte gốc**; 4 tệp này dùng xuống dòng CRLF trong thư mục làm việc, nhưng Git trên Windows (`core.autocrlf=true`) chuẩn hóa sang LF khi commit, nên bản trên GitHub (và cả repo cũ) có hash khác manifest. Kiểm: hash tệp `art-qc/SKILL.md` trên máy = manifest (`7aea84a2…`), trong blob Git cũ/GitHub = `acda5a20…`. **Cách sửa:** thêm `.gitattributes` với `skills/** -text` và lưu lại đúng byte đã duyệt; **không đổi hash nào trong manifest, không sửa nội dung skill**. Đã mô phỏng CI trên một bản clone `core.autocrlf=false` trước khi đẩy: `admin:check`, `admin:test`, `validate:backend`, `validate:governance`, `skills:validate`, `supabase:check`, `supabase:migration-ledger:check` đều đạt, rồi CI thật xác nhận.

Mobile quality không chạy lại ở `55831c0` vì bộ lọc đường dẫn của workflow (lần đẩy chỉ đổi `skills/`, `.gitattributes`, docs). Feature governance chỉ chạy trên Pull Request và Staging AI Council E2E chỉ chạy thủ công, nên chưa chạy lần nào trên repo mới. Vercel deploy `55831c0` cũng Production, Ready, 8 giây.

Chưa kiểm: đăng nhập Admin và thao tác CMS/AI Studio trên bản mới (cần phiên Owner); Feature governance (cần mở một Pull Request) và Staging AI Council E2E. **Mỗi push lên `main` của `nilaza` sẽ tự build và deploy Admin staging (Production)** (đã xác nhận hành vi này); nhánh CI cũ `codex/android-release-unblock-2026-10-19` không còn tồn tại trong repo mới nên quy tắc bỏ qua build không còn tác dụng cho nhánh đó — nếu muốn CI chạy trên nhánh khác mà không deploy Admin, cần cập nhật lệnh bỏ qua theo tên nhánh mới. Chưa đổi cài đặt Vercel nào khác. Chưa kiểm project Vercel nào khác trong team có gắn repo cũ hay không.

Lưu ý sau khi đổi tên: đường chuyển hướng cũ từ `nilaza` sang repo cũ đã **không còn** (repo mới dùng lại tên); mọi clone cũ phải dùng URL `nilaza-legacy`. Thư mục `D:\nilaza` giữ nguyên toàn bộ công việc chưa commit và vẫn trỏ về repo cũ; cây sạch `D:\nilaza_clean_staging\repo` là bản clone làm việc của repo mới.

## 1. Đã làm (local)

| Bước | Kết quả | Bằng chứng |
|---|---|---|
| Sao lưu cây làm việc ngoài repo | `D:\nilaza_backup_2026-10-23\workspace`: **28.444 tệp, 7,48 GB, 0 lỗi**. Loại `node_modules`, `.git`, cache, hồ sơ trình duyệt, `.env*`, khóa. Mẫu 300 tệp băm SHA-256 khớp 100%; mọi mã nguồn chưa được Git theo dõi đều có trong bản sao (trừ các thư mục bản xuất cố ý loại). | `robocopy.log`, kiểm lại bằng băm |
| Hợp nhất nguồn chuẩn | Hai cây (workspace root `235f03a` + 726 thay đổi và ứng viên `ab597f4`) cùng allowlist: root 3.986 tệp/1.549 MB, ứng viên 3.992 tệp/1.556 MB. **Mã ứng dụng, Supabase, Admin, web giống hệt nhau.** Khác biệt chỉ gồm: 3 workflow CI dùng Node 24.19.0 (ứng viên) thay Node 20 (root); 56 hồ sơ Plan & QC lịch sử đã được chuyển sang `docs/archive/feature-plans/2026-10-19` kèm 5 hồ sơ tích hợp (ứng viên); 2 biến thể hồ sơ cũ; 3 tài liệu release chỉ có ở root. | `inv.json`, so sánh theo băm từng tệp |
| Nền chuẩn | **Cây ứng viên `ab597f4` làm nền** (đã qua 34/34 kiểm tra local 20/10) **+ 3 tài liệu release từ root** (Android unblock, Vercel CI isolation, báo cáo Google Play). Không có tệp nào của root bị bỏ rơi ngoài các hồ sơ Plan & QC đã chuyển vào archive. | `stage-manifest.json` |
| Cây phát hành sạch | `D:\nilaza_clean_staging\repo`: **2.572 tệp, ~293 MB** (so với 1,63 GB của ứng viên). Mọi tệp được kiểm SHA-256 trước và sau khi chép; không có tệp nào có tên hồ sơ trình duyệt/khóa/`.env`; không có chuỗi giống bí mật; tệp lớn nhất 6 MB. | quét tên + mẫu bí mật |
| `.gitignore` | Mở rộng chặn `.codex*`, `.ci*`, `.gradle*`, `.npm-cache*`, `.expo*`, `.local`, `artifacts/`, `documents/`, `tmp/`, `design/`, `output/`, tệp `device-*`/`qa-device-*`/`window-*`, `.env*`, khóa, `*.apk/*.aab`, PNG gốc Tarot (trừ deck-backs/deck-covers). | `.gitignore` trong cây sạch |
| Dependency | `npm ci --ignore-scripts` trong cây sạch: 1.505 gói, 8 phút, đúng lockfile. | `npm-ci.log` |

## 2. Kiểm chứng trên cây sạch (bộ lệnh giống workflow Mobile Quality)

Môi trường: Windows, Node 25.9.0 (CI cấu hình Node 24.19.0; chưa chạy trên Linux/GitHub Actions).

| Lệnh | Kết quả |
|---|---|
| `mobile:check` (tsc) | PASS |
| Mobile Jest | PASS — **53/53 suites, 327/327 tests** |
| `validate:data` | PASS (**sau khi giữ lại** 16 PNG deck-backs/deck-covers, 27,7 MB; lần đầu FAIL vì validator đọc kích thước PNG ở 8 lưng bài) |
| `validate:astrology`, `astrology:contract/core/accuracy/grid` | PASS |
| `validate:visual-assets` | PASS — 764 tệp runtime, 74,59 MB |
| `council:contract:check`, `validate:governance`, `supabase:migration-ledger:check` | PASS (ledger vẫn blocked đúng quy tắc) |
| `admin:check`, `admin:test`, `validate:brand`, `skills:validate`, `validate:backend`, `web:check` | PASS |
| `ai-operations:test` | **18/20 PASS, 2 FAIL — lỗi đã biết**: `ai-feedback-sql.test.mjs` và `model-route-publish-sql.test.mjs` import PGlite từ đường dẫn lịch sử `output/mvp-20261002/quota-runtime/node_modules` (đã ghi là nợ portability ở báo cáo 19/10). Không nằm trong workflow CI hiện có. Chưa sửa test hay thêm dependency trong lượt này. |

Đây là kết quả **local trên cây sạch**, không phải CI online.

## 3. Quyết định về kích thước

- Repo mới chứa runtime (74,6 MB) + JSON/Markdown mô tả + mã nguồn + 16 PNG deck-backs/covers. **Không chứa** 1.420 PNG gốc Tarot (1,37 GB).
- PNG gốc vẫn nằm: (a) trong repo cũ (phần đã được theo dõi, ~610 MB); (b) trong `D:\nilaza_backup_2026-10-23` (kể cả phần chưa từng vào Git: celestial-reverie 440 MB và revisions của classic-arcana). **Owner cần chọn nơi lưu lâu dài** (đề xuất Drive private hoặc ổ ngoài) trước khi xóa khỏi thư mục dự án.
- Hệ quả: các công cụ sản xuất Tarot (`tarot-deck-quality-gate`, `prepare_tarot_artwork_batch.py`, `build_*`) cần thư mục PNG gốc; chúng chạy được khi bạn đặt lại PNG vào `assets/tarot/` cục bộ (đã được `.gitignore` bỏ qua). CI hiện tại không cần chúng.

## 4. Bước cloud — đã được Owner duyệt và thực hiện (bước 1–4); bước 5–6 còn lại

Owner đã xác nhận (23/10): chấp nhận PNG gốc Tarot nằm ngoài repo và cho chạy các lệnh GitHub dưới đây. Ngoài các lệnh này, agent không đổi cài đặt Vercel, Actions, branch protection hay quyền truy cập. Bước 1–4 đã chạy xong (kết quả ở mục 0).

1. Đổi tên repo cũ (giữ private, giữ nguyên 29 nhánh và 27 PR):
   `gh repo rename nilaza-legacy --repo magicpendigital/nilaza --yes`
2. Trỏ lại remote của thư mục làm việc cũ để không vô tình đẩy vào repo mới:
   `git remote set-url origin https://github.com/magicpendigital/nilaza-legacy.git` (trong `D:\nilaza`).
3. Tạo repo mới private cùng tên (không template, không README tự sinh):
   `gh repo create magicpendigital/nilaza --private --description "Nilaza clean source baseline (2026-10-23)"`
4. Trong cây sạch: một commit khởi đầu duy nhất, rồi `git push -u origin main` lên `https://github.com/magicpendigital/nilaza.git`. Sau đó đọc lại API GitHub để xác nhận: repo private, nhánh `main` có đúng 1 commit, không có đường dẫn `.codex*`/`Login Data`/`Cookies`.
5. **Vercel — đã xong 24/10:** project `nilaza-admin-staging` đúng là đi theo repo đã đổi tên (hiển thị `nilaza-legacy`); đã ngắt kết nối và nối lại với `magicpendigital/nilaza`, các cài đặt Root Directory/Node/Ignored Build Step/Production branch giữ nguyên (xem phần “Vercel” ở mục 0).
6. Sau đó: chạy workflow CI online đúng commit mới; kiểm EAS archive (chưa đo).

**Quay lại nếu cần:** đổi tên ngược `nilaza` → xóa repo mới (cần Owner; công cụ agent không có quyền xóa repo) → `nilaza-legacy` → `nilaza`; không viết lại hay xóa lịch sử nào.

## 5. Rủi ro còn lại

- GitHub: tạo repo mới **dùng lại tên `nilaza`** sẽ làm đường chuyển hướng cũ ngừng hoạt động; mọi bản clone cũ phải trỏ lại (bước 2). GitHub Actions gọi trực tiếp repo cũ (nếu có) sẽ lỗi — hiện không phát hiện.
- Hồ sơ Chrome vẫn nằm trong lịch sử của repo cũ (private, 1 collaborator). Owner nên thu hồi phiên các tài khoản liên quan.
- 21 PR mở của các nhánh tự sinh ở lại repo cũ; không chuyển sang repo mới.
- Chưa chạy trên Linux/Node 24.19.0/CI; EAS có thể có giới hạn riêng về kích thước archive — chưa đo.
- Hai test SQL của AI Operations cần sửa đường import PGlite trước khi đưa vào CI.
