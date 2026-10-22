# Hợp nhất UI đa thiết bị và Supabase/owner — 02/09/2026

## Kết luận và phạm vi

Không nên phục hồi toàn bộ App cũ hoặc giữ nguyên toàn bộ App mới. Giữ hướng auth/server của bản mới, ghép lại lớp trình bày độc lập, sau đó hợp nhất lớp phiên/dữ liệu theo hợp đồng rõ ràng. Chưa đủ điều kiện phát hành chỉ vì TypeScript đạt.

**Cập nhật sau khi được duyệt triển khai:** C1–C3 đã được sửa và kiểm chứng bằng regression + QA local; xem [báo cáo triển khai theo tài khoản](ACCOUNT_ISOLATION_IMPLEMENTATION_2026-09-02.md). Các phần “bản mới / vấn đề” và kết quả ban đầu dưới đây ghi nhận baseline trước sửa, không phải trạng thái hiện tại. C4–C8 mới được xử lý một phần phục vụ C1–C3, chưa hoàn tất toàn bộ.

Đã so sánh HEAD `9f7db54`, staged + working tree, và bản responsive trước lần sửa mã hóa trong `artifacts/responsive-qa-2026-09-02/App-before-utf8-repair.txt`. Bản dự phòng phục hồi được UTF-8 trong bộ nhớ, không dùng để ghi đè App. Các file khôi phục, log lệnh và export cũ không phải source hiện hành. Không thực thi chúng, không kiểm toán từng dòng thư viện đã minify. Chưa xác minh môi trường Supabase đã triển khai, dữ liệu thật hoặc thiết bị iOS/Android.

## Whole-App Impact Brief / kế hoạch phần không xung đột

- Mục tiêu: mở lại app với ảnh runtime đúng, bottom tabs/rail thích ứng, vùng chạm dễ dùng và xem tranh Tarot bằng chạm giữ; không thay đổi kết quả rút bài.
- Lane: mobile UI + regression; review liên quan backend, admin và riêng tư.
- Điểm vào: 5 tab hiện có; thư viện bộ bài, lá đã lật và trang ý nghĩa. Giữ lối vào quản trị hiện tại cho owner trong khi chờ quyết định hợp đồng quyền.
- Dữ liệu: chỉ thêm state UI/tương tác. Không đổi ghi Journal, migration, seed, auth/session, credits hoặc dữ liệu server trong đợt này.
- Backend/admin: không đổi API, provider, phân quyền hay deployment. Nút owner hiện tại không được xem là kiểm soát quyền phía server.
- An toàn: giữ disclaimer, không lật trước lá chưa rút, không gửi câu hỏi/chat vào analytics. Không thêm permission cho haptics.
- Analytics: không thêm event nội dung; metadata responsive đầy đủ sẽ ghép cùng session lifecycle sau.
- File sửa dự kiến: App.tsx phần shell/Tarot và đường dẫn ảnh; A2UI; component navigation/Tarot interaction; tests; validator ảnh. Không sửa index/staged state bằng git.
- Rollback: responsive shell có cờ độc lập; luồng account-first hiện tại giữ nguyên. Không bật guest cho tới khi giải quyết C1–C5. Có thể bỏ riêng patch UI mà không rollback Supabase.
- Nghiệm thu: 320 px không cắt navigation/CTA; tablet ngang có rail, dọc có bottom tabs; xoay không remount màn hình đang làm; giữ để xem ảnh rồi đóng quay đúng màn; mỗi lần lật chỉ rung nhẹ một lần trên native, lỗi haptic không chặn rút bài.
- Validation: TypeScript, Jest, data/backend/admin/visual validation, Expo web export mới, kiểm tra browser theo khả năng. Thiết bị thật và full matrix/font 200% là gate riêng, không suy ra từ test mock.

## Danh sách xung đột và phương án tối ưu

Mức P0/P1 dưới đây là ưu tiên sản phẩm/phát hành, không phải xếp hạng lỗ hổng đã khai thác trên production.

| ID / ưu tiên | Bản trước | Bản mới / vấn đề | Phương án đề xuất |
|---|---|---|---|
| C1 / P0 | Có helper namespace theo user/guest; App responsive cũ nối cache theo phiên | App hiện tại dùng helper DB singleton giữ Authorization đầu tiên. Các GET mới được gọi lúc đổi tài khoản nhưng không đổi client. Probe synthetic xác nhận lần B vẫn dùng token A | Dùng một nguồn session/token; client dữ liệu không giữ header cũ, không tạo kho auth thứ hai. GET nhận `userId` đã xác thực, request có epoch và bị bỏ khi đổi phiên |
| C2 / P0 | Local-first hỗ trợ offline nhưng cần migration an toàn | App khởi động xóa state riêng tư rồi đọc server, vẫn ghi vào `nilaza.messages`, `nilaza.journal`… dùng chung. Logout không xóa hết state. Không hủy response cũ. Lỗi GET trả `[]` dễ biến lỗi thành xóa cache | Cache riêng `account:<id>`, trạng thái `hydrating/ready/error`, chỉ persist sau hydration. Không thay cache bằng rỗng khi lỗi. Logout xóa token/state/role và chặn stale response; chuyển A→B không hiện A dù một khung hình |
| C3 / P0 | Admin tách khỏi consumer, dữ liệu cá nhân dự kiến tối thiểu | GET không lọc `user_id`, dựa vào RLS; owner có `is_admin()` nên có thể đưa Journal/chat của mọi người vào trải nghiệm cá nhân và memory | Mọi personal query luôn lọc chủ sở hữu kể cả owner; `deleted_at IS NULL`; admin dùng endpoint tổng hợp/redaction riêng, không reuse getter cá nhân để quản trị |
| C4 / P1 | Kế hoạch ẩn operator tools khỏi production | Bản mới thêm `isAdmin` nhưng chỉ ẩn nút; màn bên trong vẫn là AdminScreen prototype cục bộ. `getAdminRole` không lọc active, `maybeSingle` lỗi nếu có nhiều role | Owner thấy mục “Quản trị”; production dẫn tới hai workspace được bảo vệ hoặc owner hub tổng hợp. Giữ prototype sau dev flag. Chặn cả route, xác minh quyền server cho mỗi thao tác; không đưa bearer token vào URL |
| C5 / P1 | Guest v2 + consent nhập kết quả đang triển khai | AuthFlow có callback guest nhưng App không nối. App đọc v2, không nối legacy v1 migration. Chép lại App cũ sẽ làm mất hydration/credits/owner mới | Giữ account-first tạm thời. Ghép v1→v2 một lần, cache theo owner xác định; không gán dữ liệu legacy mơ hồ cho tài khoản kế tiếp. Guest chỉ mẫu trong RAM; auth thành công hỏi xác nhận nhập kết quả, thất bại giữ kết quả |
| C6 / P1 | DB: owner/admin/editor/safety_reviewer; quyền cũ quá rộng | Desktop: owner/content_admin/reviewer/viewer. Chỉ owner trùng. Grant ALL TABLES mới không bypass RLS nhưng kích hoạt chính sách `is_admin` rộng, kể cả sửa role | Chốt taxonomy/capability chung. Owner quản lý role; content editor không đọc raw private/billing. Áp dụng migration mới forward-only + test ma trận allow/deny; không chỉ sửa migration đầu đã chạy |
| C7 / P1 | Local DTO hợp kiểu dữ liệu màn hình | Daily `content` là JSONB, App đưa trực tiếp vào `text`; title/reflection_prompt/reroll_count lấy từ cột không có. Persona UUID/slug và session id chưa ánh xạ. Migration 20260706000000 đã cho phép Oracle, nhưng endpoint chưa persist turns | Adapter DTO có runtime validation, mapper slug↔UUID/session; xác nhận shape mỗi endpoint. Trước khi có Oracle persistence, giữ cache theo tài khoản, không xóa lịch sử local bằng kết quả server rỗng |
| C8 / P1 | Credit local chỉ là preview | Số dư server lấy một lần, lỗi fallback thành 3. `deductUserCredit` không được App dùng; không có bảo đảm cập nhật balance sau tác vụ | Backend là nguồn entitlement/ledger, trừ atomic/idempotent ở generation boundary. Offline hiển thị “Chưa cập nhật”, không giả thành có 3 lượt. Không tự đổi giá/quyền premium trong patch UI |
| C9 / P1 | Responsive shell, padding và JPG runtime đã làm ở nhánh UI | App mới trở về shell maxWidth 520/tab absolute; 78 import PNG không tồn tại, context PNG không khớp JPG. Validator chỉ đo bytes vẫn báo đạt | Ghép UI tách biệt auth; sửa đúng import/context và kiểm tra file tồn tại, đủ 78 lá/bộ. Export mới là bằng chứng build, không dùng export trước đó |
| C10 / P1 | Provider OpenAI Responses | Bản mới dùng Chat Completions và parser usage tương ứng; nhưng truyền `temperature/max_tokens` chung cho cả model reasoning trong catalog. Catalog/custom model lưu local chưa đồng nghĩa publish backend | Giữ adapter mới để review; thêm capability theo provider/model, contract test request/response/error/usage; chỉ cho model đã kiểm chứng. UI phân biệt bản nháp, đã publish và runtime đang dùng |
| C11 / P1 | Trang admin có cơ chế role gate | content.js nay await session promise: cải thiện đúng. config.js trỏ `127.0.0.1:54321`, chỉ chạy khi Supabase local ở cùng máy; trên điện thoại/hosted web là đích sai | Giữ sửa race; cấu hình rõ local/staging/production, dùng HTTPS và public anon key tương ứng. Không commit service-role key; không bỏ gate để khắc phục lỗi kết nối |
| C12 / P2 | State nội bộ Tarot và kết quả App được quản lý tách nhau | QA thấy quay từ kết quả về draw: nhãn 3/3 lấy từ reading nhưng slot rỗng do ritual state đã reset | Chuẩn hóa trạng thái `not_started/drawing/complete`, khôi phục slot từ reading khi quay lại, chỉ reset khi người dùng chủ động bắt đầu trải mới. Không đổi thuật toán chọn bài |

### Bằng chứng chính

- `apps/mobile/src/backendClient.ts`: `getSupabase`, nhóm GET mới, `getAdminRole`.
- `apps/mobile/App.tsx`: load ban đầu, `loadBackendData`, effects `saveJson`, `signOutLocally`, render Profile/Admin.
- `apps/mobile/src/auth/sessionStorage.ts`, `localAuth.ts`, `supabaseAuth.ts`: helper mới và nguồn session hiện tại.
- `supabase/migrations/202606120001_mvp_schema.sql`: `is_admin`, policy role, private-table policies, grants cuối file.
- `supabase/migrations/202606120002_add_missing_tables.sql`: daily_insights JSONB; `20260626000000_ai_council_contract.sql`: session_kind.
- `supabase/functions/ai-oracle-turn/index.ts`: chưa ghi turns vào chat history.
- `apps/admin/workspace-guard.js`, `content.js`, `shell.js`, `config.js`, `content-model.mjs`: role vocab, promise gate và môi trường.
- `supabase/functions/_shared/providers/openai.ts`: protocol/parameter switch.
- Probe không có mạng/credential thật: `node artifacts/responsive-qa-2026-09-02/probe-account-client.cjs`.

## Thứ tự hợp nhất sau khi chốt xung đột

### Quyết định kiến trúc khuyến nghị

Giữ server làm nguồn dữ liệu đã đồng bộ, nhưng không bỏ cache local theo tài khoản. Đây không phải lựa chọn “server hoặc local”: server cung cấp sự nhất quán/đa thiết bị, cache tách tài khoản cung cấp offline và tránh mất bản nháp. Bản cũ cũng chưa đủ để phục hồi nguyên khối vì migration legacy và thứ tự hydrate/persist cần test đối kháng.

Giữ tên role DB hiện có ở vòng hợp nhất đầu để giảm rủi ro migration; quyền chức năng được khai báo bằng capability chung, ví dụ `roles.manage`, `content.edit`, `content.publish`, `safety.review_redacted`, `metrics.read`. Chỉ owner có `roles.manage`; cấp khả năng tối thiểu cho các role khác và kiểm tra lại phía server. Không tự map `reviewer` sang `safety_reviewer`: review nội dung và xem safety events là hai quyền khác nhau. Role bị revoked phải mất quyền ngay ở request tiếp theo; nhiều role được hợp nhất theo capability, không dùng `maybeSingle`.

Trên app production, owner vẫn là người dùng cá nhân khi ở Home/Chat/Journal. Mục Quản trị là điểm vào riêng của hai workspace được bảo vệ, không biến cache cá nhân thành kho dữ liệu của mọi người. Bản local AdminScreen phải ghi rõ là bản mô phỏng, không hiển thị như đã publish production.

Grants và RLS là hai lớp khác nhau; grant rộng không thay thế chính sách hàng. Hướng sửa cần test cả quyền SQL lẫn RLS, theo [hướng dẫn chính thức của Supabase](https://supabase.com/docs/guides/api/securing-your-api).

1. Khóa contract role/session và test hai tài khoản trước; không bật guest trong bước này.
2. Sửa client identity, DTO, account cache, hydration epoch, signout và xử lý offline. Test A→B, token refresh, logout giữa request, cache cũ, soft delete, nhiều role/revoked role.
3. Tách owner hub khỏi dữ liệu cá nhân, bảo vệ backend theo capability. Migration mới kiểm thử local/staging trước; không reset DB.
4. Hoàn thiện responsive Home/Explore/Journal/Profile và font/keyboard/accessibility matrix trên shell ổn định.
5. Bật guest sau: preview không gọi AI xác thực, consent nhập Journal sau auth, retry không rút lại.
6. Contract test provider/credits; kiểm thử native rồi mới bật production flags.

## Feedback trải nghiệm được nhận

- Rung nhẹ: một impact nhẹ lúc lá thực sự lật; không rung nặng rồi selection trùng. Web không gọi haptic; haptic không khả dụng không được làm hỏng flow.
- Vùng chạm: tối thiểu 44×44 cộng hitSlop cho icon nhỏ. Không tăng kích thước tranh/icon nếu không cần.
- Xem tranh: chạm giữ trong thư viện 78 lá để mở ảnh toàn màn hình; giữ tap thường để xem ý nghĩa. Có action thay thế cho screen reader; không bắt người dùng phải biết gesture. Lá chưa rút vẫn úp.

## Kiểm chứng ban đầu (trước patch UI)

- Mobile TypeScript đạt; admin test 9/9; admin check/backend validator đạt.
- Runtime asset validator cũ báo 524 file / 45,90 MiB nhưng không bắt 78 import bị thiếu: cần tăng độ bao phủ, không coi đây là build đạt.
- Security review dùng snapshot cố định, không production writes. Lỗi token có probe xác nhận; quyền/grant triển khai vẫn chưa xác minh. Phân loại security không thay thế ưu tiên sửa riêng tư/sản phẩm trong bảng trên.

## Phần đã ghép trong lượt này

- Giữ nguyên thay đổi auth/server/credits/owner đang có; không sửa schema, provider hoặc admin mới, không đổi staged diff của App (119 dòng thêm / 17 dòng bỏ).
- Nối lại AdaptiveScaffold và tách AdaptiveNavigation; cùng 5 tab, có label/selected state, rail 96 px, navigation là sibling trong bố cục. State màn không phụ thuộc orientation key.
- Khôi phục riêng Home presentation đã đối chiếu: daily insight và 3 quick actions lên trên, thu gọn streak, không mời push cố định, thiếu ngày sinh dùng prompt ngắn. Không khôi phục App/guest/cache cũ.
- Sửa 78 import JPG, regex/context và bóc ID ảnh. Validator kiểm tra file thật, context không rỗng, đủ 78 ID mỗi bộ và static map Moon Garden, bên cạnh ngân sách byte.
- Nút Tarot/deck và CTA persona nằm trong flow, thay SafeAreaView deprecated ở App bằng safe-area context.
- Haptic native một impact nhẹ khi lật lá (cả lá ngày ở Home), web không gọi; lỗi haptic được bỏ qua an toàn.
- Thư viện có chạm giữ + action screen-reader mở tranh, tap thường giữ ý nghĩa; ảnh toàn màn hình giữ nút đóng và đường xem ý nghĩa. Icon nhỏ có hitSlop 8, top icon Tarot 44×44, nút chia sẻ có nhãn.

## Gate chưa đạt / không được suy diễn từ kết quả test

- Tại thời điểm kết thúc patch UI, C1–C8 chưa sửa. Lượt triển khai tiếp theo đã xử lý C1–C3 (báo cáo liên kết đầu trang); vẫn chưa bật guest hoặc coi toàn bộ owner/backend đã sẵn sàng production.
- Chưa hoàn tất Explore grid, Journal/Profile master-detail, catalog dịch toàn app, context panel tablet hoặc 200% font/native keyboard. Không tuyên bố hoàn thành toàn bộ Đợt 0–5.
- Native haptic, TalkBack/VoiceOver, tablet Retina và iOS/Android thật chưa kiểm thử; test haptic/long-press hiện là component/unit test, không phải xác nhận cảm giác rung phần cứng.
- Browser QA dùng `EXPO_NO_DOTENV=1` và xóa ba biến URL/key backend trong process; không tạo account/server data thật. Người dùng tự hoàn tất bước đăng nhập/điều khoản của bản local.
- Còn warning web đã quan sát: expo-notifications web, shadow props, tintColor và native-driver fallback. Không còn warning SafeAreaView trong phiên đã xem; không có console error quan sát được ở các flow đã thử.
- Security review cố định snapshot: các trường hợp shared-session/owner-only không được nâng thành lỗ hổng remote theo severity policy; grant delta còn deferred. Điều này không hạ ưu tiên P0 về dữ liệu trong tài liệu này.

## Kết quả kiểm tra sau ghép

| Kiểm tra | Kết quả / giới hạn |
|---|---|
| Mobile TypeScript | Đạt sau patch cuối |
| Mobile Jest | 11 suites, 108 tests đạt; có regression rotation giữ child draft, tab semantics, hitSlop, haptic và long press |
| Seed/data + visual assets | Đạt; runtime 524 file / 45,90 MiB, đủ card ID và import tồn tại |
| Backend/admin validation | Đạt; admin 9/9 tests. Đây là kiểm tra source/contracts, không thay live RLS tests |
| Export mới | `.codex-expo-export-reconciled`: 55,04 MiB, giảm 86,3%; JS bundle khoảng 2,73 MB. Đạt ngưỡng 120 MiB |
| Shell/Home | Đã đo 12 viewport: 320×568, 360×800, 390×884, 430×932, 844×390, 768×1024, 820×1180, 1024×768, 1180×820, 1366×1024, 500×800, 700×900. Không document overflow hoặc button/tab ra ngoài chiều ngang ở Home |
| Home 390×884 | 3 quick actions từ y=595 đến y=729; tab bar bắt đầu y=815, đều trong viewport đầu |
| Tablet navigation | Rail 96 px ở 1024/1180/1366 ngang; bottom tabs ở tablet dọc và split view |
| Oracle | Draft thử nghiệm giữ khi xoay 768×1024 → 1024×768 → 320×568. Composer ở 320 px nằm trong viewport, chưa kiểm tra bàn phím native |
| Tarot | Rút 1 lá, xoay phone ngang/tablet, mở/đóng tranh vẫn giữ 1/3; rút đủ 3 → kết quả → lưu → thấy entry trong Journal local |
| Persistence | **Baseline patch UI: không đạt.** Sau reload, Home báo 0 thay cho entry test. **Sau patch C1–C3: đạt QA local** — rút ba lá → lưu → reload → Home vẫn có 1 chiêm nghiệm và Journal khôi phục entry. Không suy ra đã đồng bộ server |
| Bản thân hình tranh | Xem được ảnh tablet có nút đóng/ý nghĩa; chạm giữ được unit/component-test. Chưa giả lập được gesture hold native bằng browser API hiện có |
| Whitespace diff | `git diff --check` trên file App/A2UI đã sửa: đạt |

Artifacts: `artifacts/responsive-qa-2026-09-02/reconciled-viewport-matrix.json`, `home-reconciled-390.png`, `tarot-artwork-tablet.png`, `probe-account-client.cjs`.

![Home sau ghép, 390×884](D:/nilaza/artifacts/responsive-qa-2026-09-02/home-reconciled-390.png)

![Xem tranh Tarot trên tablet](D:/nilaza/artifacts/responsive-qa-2026-09-02/tarot-artwork-tablet.png)

### Đường kiểm tra dành cho quản lý

1. Mở bản local `http://localhost:8084` (server QA không bật biến backend). Xem 3 quick actions trên Home.
2. Xoay tablet: 5 tab chuyển thành rail và ngược lại; vào Trò chuyện, gõ bản nháp rồi xoay.
3. Vào Tarot bằng Rút nhanh; rút lần lượt, chạm lá đã lật để xem tranh. Trong thư viện, giữ một lá để xem ảnh, tap thường mở ý nghĩa.
4. Lưu kết quả, tải lại rồi xem Journal. Persistence local đã đạt sau patch C1–C3; **không dùng reload thành công để suy ra đã đồng bộ server**.
5. Trước phát hành: chốt C1–C8; test tài khoản A/B/owner/revoked trên staging; hoàn thành native/large-font/full screen matrix.

Security Diff Scan `7e811629-c99e-483c-a284-4d8f062be199` đã hoàn tất trên snapshot trước patch UI. Coverage được ghi rõ là partial (loại trừ export sinh tự động và file khôi phục); có một candidate grant/role cần theo dõi. Công cụ báo working tree đã đổi trong lúc chạy vì patch UI trong chính lượt này; không coi kết quả scan là chứng nhận cho mọi dòng source sau đó. Không có deploy, push, commit, stage hoặc migration nào được thực hiện.
