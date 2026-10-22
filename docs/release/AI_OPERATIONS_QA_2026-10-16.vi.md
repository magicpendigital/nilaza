# QA online và nghiệm thu iOS/Android — AI Operations

Ngày 16/10/2026, múi giờ Asia/Bangkok. **Readiness đã kiểm; nghiệm thu online và thiết bị thật còn BLOCKED.** Không triển khai cloud, đổi endpoint, publish cấu hình AI, tạo tài khoản thử, gửi email, gọi model hoặc tạo build EAS trong lượt này.

## Kết quả đã thực hiện

| Hạng mục | Kết quả và giới hạn |
|---|---|
| Release checker và coverage mới | **39/39 kiểm thử đạt**. Lần đầu sandbox chặn Git fixture; lần chạy lại trong fixture riêng đạt. Không sửa quyền repository chính. |
| Endpoint Tarot và Astrology | **18/18 kiểm thử endpoint đạt**, dùng provider/Auth/DB giả theo harness hiện có; không phải gọi endpoint cloud. |
| Toàn bộ SQL hiện tại | **30 migration** dựng sạch và nâng cấp từ 28 lên 30 đạt; 6 nhóm kiểm tra gồm giữ dữ liệu giả, so khớp schema/quyền/index/function, forced RLS, chặn ghi trực tiếp và restore archive. Chạy PGlite PostgreSQL 17.5; không thay native PostgreSQL hoặc managed acceptance. |
| Android embedded bundle | **Đạt**, 1.982 modules, copy 639 assets; 10.169.003 byte. Chưa phải APK đã ký/cài trên điện thoại. |
| iOS embedded bundle | **Đạt**, 1.982 modules, copy 639 assets; 10.162.011 byte. Chưa phải Xcode compile, IPA hoặc TestFlight. |
| Source/config | Release version `0.1.3`, Android 4/iOS 4 khớp; backend, governance, repository skills và 6 prompt consumers đạt. Supabase readiness **73 pass / 11 warn / 0 fail**, chỉ là kiểm tra local. |
| Kết quả lượt trước | Đối chiếu lại **39/39 checksum nguồn khớp** hồ sơ A1–A3. 323 mobile tests và 169 Admin tests của lượt trước được giữ nguyên thời gian/phạm vi, không ghi thành vừa chạy lại. |

Hai lỗi coverage đã sửa: `packages/ai-contracts/**` kích hoạt Mobile quality cho PR và push main; release inventory bao gồm bộ hợp đồng AI và `apps/admin/feedback-inbox.js`. Hai kiểm thử regression mới đi cùng thay đổi. Không thay logic sản phẩm hoặc mở target allowlist.

Bundle được kiểm với `EXPO_NO_DOTENV=1`, không có cấu hình backend live. Đây là kiểm tra đóng gói JavaScript/assets. Cần build lại với cấu hình Singapore đã duyệt trước khi phân phối. Lần Android đầu đứng ở khởi tạo Metro trong sandbox đã dừng; lần chạy lại hai worker đạt. Docker Linux Engine hiện không chạy nên không tái sử dụng kết quả native SQL cũ để chứng nhận 30 migration mới.

## Trạng thái online đã đọc thực tế

Đích đã được Owner chọn vẫn là **Singapore `etfajmrwyywokgafzxsb`, organization `drxbmvimiekeoeesgssp`**, QA đóng bằng dữ liệu giả trước, production duyệt riêng. Không cần chọn lại project.

| Điều kiện | Bằng chứng ngày 16/10 | Tác động |
|---|---|---|
| Project | ACTIVE_HEALTHY, Singapore, PostgreSQL 17.11.0.002 | Đích tồn tại và truy cập đọc được. |
| Compute/add-ons | Dashboard đúng ref: Free, `t3a.nano`, không read replica; Dedicated IPv4/PITR/Custom domain đều Disabled | Đã gỡ phần chưa rõ compute/ba add-on này. Không suy ra hóa đơn của dịch vụ khác. |
| Quota | Kỳ 14/10–14/11: Dashboard báo chưa vượt quota. Singapore DB khoảng 24,9 MB; 0 Edge invocations/MAU theo meter kỳ này | Meter có độ trễ; MAU 0 không chứng minh Auth không có tài khoản. |
| Logs | Singapore và tổng organization hiện hiển thị khoảng 0,01 GB ingestion; meter Upcoming | Không dùng cảnh báo 4.994% của kỳ trước làm số liệu kỳ hiện tại. Chưa phân tích nguyên nhân volume lịch sử. |
| Schema và runtime | **0 migration, 0 public tables, 0 Edge Functions** trên Singapore | Không có endpoint mới để nghiệm thu online. Advisor rỗng trên project trống không chứng nhận bảo mật khi đã triển khai. |
| Auth callback | Site URL `http://localhost:3000`; **không có Redirect URLs** | Chưa đáp ứng xác nhận email/recovery của app. Mã mobile hiện cần `nilaza://auth/confirm` và `nilaza://auth/recovery`; URL web/Admin QA cần bind đúng host đã chọn. |
| Email | Dashboard yêu cầu thiết lập custom SMTP; đang dùng template mặc định | Chưa nghiệm thu SMTP, sender, giới hạn và email thử đúng người nhận. Không gửi email trong lượt kiểm. |
| Kết nối ứng dụng | Mobile `.env.local`, Admin default, CLI và EAS preview vẫn trỏ **legacy QA `akgrokwnkfqnfjqrildi`** | Test ở QA cũ không thể chứng minh tính năng hoạt động trên Singapore. |

[Receipt connector](../../artifacts/ai-operations-qa-2026-10-16/cloud-readback.json) và [receipt Dashboard](../../artifacts/ai-operations-qa-2026-10-16/dashboard-readback.json) tách nguồn, scope và giới hạn. Quota toàn organization được đọc riêng: DB summary 0,037/0,5 GB là mức database lớn nhất mỗi project trên giao diện, không phải tổng dung lượng Singapore. Nội dung `main Production` của Supabase không phải quyết định promotion của Nilaza.

## Gate release còn thiếu

| Gate | Trạng thái | Việc cần hoàn tất |
|---|---|---|
| Phiên bản nguồn và CI | BLOCKED | Workspace có 198 tracked changes tại thời điểm kiểm, ngoài các file untracked. Cần tách/review phạm vi và commit ứng viên; giữ nguyên công việc hiện có. CI xanh Mobile ngày 03/10 thuộc commit cũ, không chứng nhận A1–A3. Admin/Feature governance cùng commit lỗi bước validate skills; local skills hiện đạt nhưng cần CI của ứng viên mới. |
| Chính sách thực thi | BLOCKED | GitHub chỉ có `Preview` và `Production`, không protection rules/branch policy; chưa có `staging`. API branch protection main trả 403 do giới hạn gói private repo. Cần cơ chế approval, giữ secret và khóa một release thực sự hoạt động; không tự nâng gói hoặc mở public repo. |
| Migration/target | BLOCKED | Allowlist vẫn rỗng, ledger QA cũ vẫn `blocked_pending_reconciliation`. Không dùng `db push`/repair hay sửa ledger cũ để mở gate. Packet Singapore 28 SQL trước đây đã cũ so với 30 SQL hiện tại và profile mới. Cần ledger/bootstrap riêng đúng target, evidence mới và duyệt chính xác SQL/hash. |
| Recovery | BLOCKED | Kho Drive riêng đã thiết lập ngày 13/10; file QA-SYNTHETIC upload/download khớp. Hồ sơ mới nhất vẫn ghi khóa Owner chưa tạo, chưa có restore mất máy/ngoại tuyến và chưa chứng nhận DB + Auth + Storage + config/jobs trên managed stack. Không yêu cầu chọn lại nơi lưu. |
| Runtime/Auth/secret | BLOCKED | Cần cấu hình callback/SMTP và danh mục secret theo đúng Singapore; deploy functions và retarget app/Admin/EAS qua operator sau khi đủ gate. Không đưa key vào chat hoặc public env. |
| AI cost/trace/feedback retention | BLOCKED | Chưa kiểm provider thực, version runtime, trace/receipt xuyên suốt hoặc lịch purge 30 ngày trên cloud. Giữ raw capture tắt. Cần đo chi phí từng attempt, retry/fallback, quota/kill switch, TTL/purge và log redaction. |
| Actor/security E2E | BLOCKED | Cần JWT thực A/B, Owner, staff bị thu hồi, token cũ; PostgREST/RPC và hai phiên publish đồng thời. Service-role và PGlite không thay các kiểm tra này. |
| Signed candidate/native | BLOCKED | ADB đã chạy nhưng danh sách thiết bị trống. EAS liệt kê hai Android preview cũ đều ERRORED, không có build iOS; bản APK local tìm thấy sửa lần cuối 09/10 giờ Bangkok, trước A1–A3. Chưa xác minh Apple team/cert/profile, thiết bị đăng ký hoặc IPA. |
| Nghiệm thu cuối | BLOCKED | Chưa có APK/IPA đúng source + config + hash để chạy cùng checklist hai nền tảng; chưa có cửa sổ theo dõi/smoke và owner acceptance. |

JDK 17.0.19 và các thành phần Android SDK 36/NDK 27.1/CMake 3.22.1 đã có. Helper Android Inspect lỗi cách xử lý stderr khi chạy bằng Windows PowerShell; đọc riêng Java và SDK xác minh thành phần có mặt. Không coi helper lỗi đó là thiếu SDK hoặc native build đạt.

Không coi nâng GitHub Pro/Team là tự giải quyết đủ approval cho private repo: tài liệu hiện hành phân biệt [branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) và [required reviewers của environment](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments). Cần chọn cơ chế thực thi có đủ quyền và nghiệm thu trước khi đề xuất chi phí.

## Quyết định cần Owner, tách khỏi công việc kỹ thuật

| Quyết định/hành động | Đề xuất cụ thể | Chưa cần quyết định lại |
|---|---|---|
| Người phụ trách và cơ chế phát hành | Chỉ định operator giữ quyền cloud và người duyệt; giữ repo private, dùng job/runner có bảo vệ và release lock được nghiệm thu. Đội kỹ thuật trình phương án phù hợp quyền/gói hiện tại trước khi phát sinh phí. | Chưa cần mua gói GitHub ngay; tạo tên environment không đủ bảo vệ. |
| Khóa và cam kết recovery | Owner hoàn tất bước nhập mật khẩu trong console riêng theo [phiếu 13/10](../../artifacts/drive-recovery-setup-2026-10-13/OWNER_SETUP_REVIEW.vi.md); chỉ định người giữ recovery. Đề xuất giữ bản ngoài máy/ngoại tuyến, mỗi ngày và trước đổi schema, retention 30 ngày, mục tiêu RPO 24 giờ/RTO 4 giờ; các mục tiêu phải được đo trước khi cam kết. | Kho Google Drive và kiến trúc mã hóa đã chọn; không cần gửi mật khẩu/key qua chat. |
| Thiết bị và quyền iOS | Bố trí Android/iPhone thật, người kiểm thử và Apple Developer team cho bản internal; team kiểm signing/profile trước khi tạo build. Android có thể nghiệm thu trước, iOS vẫn là gate riêng. | Không suy ra chưa có Apple account chỉ vì chưa có build iOS. |
| Phạm vi/chi phí QA | Chốt số tài khoản giả, ngân sách AI/email tối đa, thời gian quan sát và điều kiện dừng trong packet. Đề xuất cohort tối đa 5 tài khoản giả trong 7 ngày; không bật nạp tiền tự động. Trần tiền cần Owner chọn theo provider đã cấu hình. | Giữ Singapore Free/Nano theo quyết định hiện tại; chưa phát sinh cloud build/provider calls. |
| Duyệt thực thi cuối | Sau khi các việc kỹ thuật dưới đây đủ bằng chứng, duyệt đúng commit + 30 SQL + target + config + artifact + hash + chi phí + thời hạn. **Chưa xin duyệt SQL ngay bằng hồ sơ còn thiếu.** | Production/store submission vẫn là quyết định riêng sau QA. |

Yêu cầu “tiếp tục QA theo gate hiện có” đã đủ để chạy các bước kiểm tra và chuẩn bị trên. Việc chưa ghi SQL/retarget là do các điều kiện cụ thể của [release runbook](RELEASE_RUNBOOK.md), không phải cần xác nhận lại kế hoạch chung. [Nilaza Plan-QC](../../skills/nilaza-plan-qc/SKILL.md) yêu cầu “Exact manifest approval and an offline evidence PASS do not grant cloud authority or prove remote enforcement.” Skill vẫn phù hợp; không sửa skill hoặc nới gate.

## Kế hoạch thực thi tiếp theo

1. **Chuẩn bị ứng viên:** review phạm vi source hiện có, tạo commit sạch cho release; chạy Mobile/Admin/Feature governance CI đúng commit. Hồ sơ SQL 30 migration đã có checksum và rehearsal mới; thêm native PostgreSQL/pg_dump đúng bộ này khi Docker sẵn sàng, giữ evidence 28 SQL cũ nguyên trạng.
2. **Hoàn tất vận hành:** khóa Owner và recovery drill; operator/protected execution/release lock; đối chiếu target settings ngay trước thực thi. Review các tác vụ outbound, Auth, Storage và cấu hình cost/retention. Không copy dữ liệu legacy sang Singapore.
3. **Chuẩn bị packet cloud cụ thể:** ledger/bootstrap riêng, ordered SQL và seed/artwork, gói Edge Functions cùng dependency ngoài thư mục functions, cấu hình Auth/SMTP/secret names, rollback, giới hạn QA. Duyệt rồi mới bootstrap/deploy/retarget theo đúng phạm vi; tách việc đưa code lên với publish prompt/model route.
4. **QA online bằng dữ liệu giả:** thực hiện ma trận bên dưới qua API thực và Admin có quyền; ghi mã tương quan, model/route/prompt versions, cost và kết quả không chứa raw question/birth data. Không gọi model nếu consent, quota hoặc cost gate chưa đạt.
5. **Build và nghiệm thu thiết bị:** tạo APK/IPA internal cùng source/config đã nghiệm thu; pin checksum, install giữ dữ liệu, chạy Android và iOS; ảnh/video chỉ dùng tài khoản giả. Build cũ, browser screenshot và bundle export không thay acceptance.
6. **Handoff:** chốt lỗi còn lại, theo dõi theo cửa sổ được duyệt, inventory fixtures/cleanup và chuẩn bị promotion riêng. Không bật production tự động khi QA xanh.

## Phiếu kiểm thử dùng chung cho online, Android và iOS

Tất cả ca dưới đây hiện **CHƯA CHẠY trên Singapore/thiết bị thật**. Mỗi ca cần build SHA, OS/device, target, người chạy, thời điểm, interaction/attempt/request/receipt ID khi có; không ghi access token hoặc dữ liệu thật.

| Ca | Thao tác người nghiệm thu | Kết quả phải thấy |
|---|---|---|
| 01 — Đăng nhập và recovery | Cài ứng viên, mở lạnh, xác nhận email và mở link khôi phục; đổi tài khoản A → B | Link quay đúng app; dữ liệu A không hiện trong B; không mất dữ liệu cũ khi cập nhật. |
| 02 — Publish chuẩn | Owner sửa draft, review rồi publish và tải lại | Một revision chính xác, có audit; phân biệt đã publish với model thực sự đã dùng. |
| 03 — Xung đột và mất ACK | Hai phiên Admin publish cùng bản gốc; làm mất kết nối sau submit, retry | Một phiên bị báo stale; retry cùng request không tạo hai revision; UI không báo thành công sai. |
| 04 — Tarot | Chọn trải bài/câu hỏi giả, chấp nhận AI, đọc từng lá và tổng hợp | Đúng lá/vị trí, VI/EN đầy đủ; không cắt JSON hoặc trình bày fallback như AI thành công. |
| 05 — Astrology | Dùng ngày/giờ/nơi sinh giả, tính chart rồi yêu cầu AI | AI dùng placements đã tính; đủ section/facts/caveat; không bịa vị trí. |
| 06 — Lưu và mở lại | Lưu câu trả lời, đóng app, mở lại online/offline | Nội dung và locale cũ giữ nguyên; provenance/receipt không trỏ sang attempt khác. |
| 07 — Feedback offline | Ngắt mạng, chọn category/section, gửi, mở lại rồi nối mạng | Có trạng thái queued/failed/sent đúng; chỉ sent sau ACK; retry không nhân đôi. |
| 08 — Admin feedback | Mở inbox, đối chiếu response, cập nhật trạng thái từ hai phiên | Liên kết server verified khi có receipt; thiếu receipt ghi unverified rõ; triage CAS chặn ghi đè. |
| 09 — Quyền và tài khoản | Thử B đọc/xóa feedback A, thu hồi staff và dùng token cũ | Từ chối đúng; không có raw câu hỏi/journal/birth data trong inbox/log. |
| 10 — Xóa/TTL/purge | Xóa feedback của mình, mở lại app; kiểm receipt quá hạn và purge job | Không phát lại hàng đợi đã xóa; hết hạn không còn correlation hợp lệ; purge được chứng minh thực chạy. |
| 11 — Lỗi AI/cost | Thử provider timeout, output lỗi/truncated, retry/fallback và quota hết | Lỗi/fallback trung thực, không lưu AI sai; mỗi attempt truy nguyên và đo phí được; kill switch hoạt động. |
| 12 — UI/UX hai nền tảng | VI/EN, chữ lớn, màn nhỏ, bàn phím, Back, background/resume, Reduce Motion | Không che CTA/feedback, không mất nội dung dài, thao tác có loading/empty/error; không có crash native. |

[Evidence tổng hợp](../../artifacts/ai-operations-qa-2026-10-16/evidence.json) · [Release manifest nháp](../../artifacts/ai-operations-qa-2026-10-16/release-manifest.draft.json) · [Kết quả gate](../../artifacts/ai-operations-qa-2026-10-16/release-gate.json). Manifest là ảnh chụp hồ sơ hiện tại **BLOCKED**, chưa có artifact ký hoặc owner approval; thay đổi nguồn/config/hồ sơ cần tạo lại và review, không tái dùng để thực thi.
