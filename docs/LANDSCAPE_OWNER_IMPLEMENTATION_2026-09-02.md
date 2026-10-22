# Sửa UI màn ngang và owner hub/capability

## Kế hoạch / Whole-App Impact Brief trước sửa

- Mục tiêu: mọi màn có nội dung dài cuộn tới cuối ở phone ngang, tablet và desktop QA; thumbnail không bị biến thành dải crop quá hẹp; giữ luồng và state khi xoay. Sau đó đưa owner vào hub có capability xác thực và kiểm thử allow/deny ở môi trường riêng.
- Phạm vi UI: shell dùng chung, Home/Explore, danh sách và chi tiết guide/deck, Tarot, Journal/Profile, chat và navigation. Dùng palette/font/radius và assets hiện có; không redesign toàn app hoặc đổi nội dung AI.
- Điểm vào: giữ 5 tab và Tarot subflow; mục Quản trị trong Profile mở hub riêng, không mở prototype nội bộ như thể đã là production.
- Dữ liệu: UI không đổi cache/auth C1–C3, Journal hoặc thuật toán Tarot. Owner chỉ dùng dữ liệu tổng hợp/metadata và capability, không chuyển raw Journal/chat vào admin.
- Backend/admin: giữ hai workspace Content Operations và AI Studio. Capability được kiểm tra phía server, active role không lấy từ user_metadata. Nếu cần SQL, tạo migration mới forward-only; không sửa migration cũ, không áp dụng lên production.
- Riêng tư/an toàn: dùng fixture synthetic trên môi trường riêng; không copy dữ liệu production. Không log bearer token/câu hỏi, không đưa token lên URL liên kết admin. Giữ consent/disclaimer hiện tại.
- Analytics: không thêm nội dung nhạy cảm; chỉ metadata trạng thái/quyền và các event hiện hữu.
- Rollback: responsive flag hiện hữu; giữ account-first. Owner hub fail closed khi chưa có backend/capability. Không rollback bằng cách mở RLS hoặc bỏ gate.
- Không sửa: provider/model/credits, seed, nội dung Tarot, Astrology/Face Reading, auth namespace đã kiểm chứng.
- Nghiệm thu quản lý: Home → Explore → deck/guide → quay lại; cuộn đầu/cuối ở 844×390, 1024×768, 1180×820, 1366×1024 và desktop rộng. Xoay giữ bài/draft; ảnh artwork xem toàn bộ được. Owner thấy hub, người thường/revoked không mở được; editor không đọc raw dữ liệu cá nhân hoặc tự cấp quyền.
- Validation: TypeScript, toàn bộ Jest, data/assets/backend/admin checks, export; browser screenshot + đo vùng cuộn + thao tác bàn phím/cuộn. Kiểm thử SQL/API staging phải ghi rõ môi trường, fixture và allow/deny; không suy từ UI hidden thành quyền server.

## Audit trước sửa (bằng chứng hiện tại)

1. Profile 1180×820: khung ScrollView có clientHeight = scrollHeight = 4814, top ≈ -1997; bị căn giữa quá chiều cao màn và không có nội dung overflow bên trong để cuộn. Screenshot `01-profile-before.png`.
2. Home 1180×820: đầu/cuối nội dung bị cắt; rail còn thao tác được. Screenshot `02-home-before.png`. Khung chung bị `alignSelf: center` khi parent chuyển sang row; chiều cao cross-axis không stretch.
3. Explore: chụp và đo tỷ lệ ảnh trước sửa. Sẽ kiểm tra chi tiết ảnh sau khi khôi phục khả năng đi tới từng phần của trang.

Artifacts hiện tại: `artifacts/landscape-owner-qa-2026-09-02/`. Screenshot được lưu và mở kiểm tra trước khi dùng trong báo cáo; không dùng ảnh audit cũ làm bằng chứng cho bản sửa này.

## Trình tự

1. Sửa ràng buộc chiều cao/chiều rộng shell, thêm regression stretch khi rail.
2. Kiểm tra toàn bộ nhóm màn, sửa tỷ lệ ảnh, cột đọc, grid và vùng chạm/cuộn liên quan; không reset state theo orientation.
3. Đọc contract admin/RLS hiện hành; triển khai owner hub/capability cùng tests.
4. Tạo môi trường thử riêng theo xác nhận của người dùng và chi phí nếu có; áp dụng/test chỉ trên môi trường đó. Chốt báo cáo các gate đạt/chưa đạt.

## Kết quả triển khai

### Responsive shell và UI ngang

- `AdaptiveScaffold` đã stretch đúng cross-axis khi chuyển sang navigation rail; ScrollView giữ `flex: 1`, `minHeight: 0`, `minWidth: 0`, nên nội dung dài cuộn được ở cả tablet ngang và desktop QA.
- `ResponsiveGrid` đo chiều rộng khả dụng thay vì dùng card width cố định. Explore, guide/deck library, feature cards và Tarot editorial cards dùng grid theo `minItemWidth`; ảnh dùng `contain`/aspect ratio để giữ toàn bộ artwork, không cắt thành dải hẹp.
- Header và các horizontal chip rail đã được giới hạn theo gutter thực tế. Lỗi cuối ở 320 px (dư 4 px do scrollbar web + margin âm 20 px) đã được sửa về gutter 16 px; rail vẫn cuộn ngang có chủ đích nhưng không làm tràn root ScrollView.
- Chat có khung cuộn riêng; composer và sticky action bar giữ khoảng đệm safe-area/keyboard. Nút icon góc màn hình có hitSlop và accessibility label; Tarot hỗ trợ haptic trên iOS/Android và chạm giữ/semantic preview để xem artwork toàn màn hình.
- Profile/Onboarding copy tiếng Việt ở các vùng vừa kiểm tra đã bỏ các nhãn gây trộn như `Free Seeker`, `Streak`, `Birth profile`, `Push status`, `Inbox`; tên sản phẩm/thuật ngữ kỹ thuật cần thiết vẫn được giữ có chủ đích.

### Owner hub và capability boundary

- Mobile thêm `OwnerHub` fail-closed: gọi `get_admin_access()` mới nhất khi mở/foreground/retry, kiểm tra capability trước khi mở từng workspace, không đưa bearer token vào URL, và chỉ hiển thị số liệu tổng hợp allowlist.
- Admin static console đã bỏ việc ngầm dùng local Supabase trên hosted domain: `apps/admin/config.js` chỉ dùng local demo fallback ở localhost; production/staging phải inject `window.__NILAZA_ENV__` với URL + publishable key riêng. README đã ghi rõ không đưa service-role/provider key vào bundle.
- AI Studio/Model Router connector đã hỗ trợ session transport: workspace guard lấy session Supabase mới nhất và recheck capability trước từng request, tự gắn `Authorization`/`apikey`; các ô dán JWT chỉ còn fallback cho test local và được ẩn khi transport này có sẵn. Test render mới xác nhận owner publish không cần pasted token.
- Admin console dùng cùng vocabulary `owner | admin | editor | safety_reviewer`; đọc/ghi/publish/delete được gate ở UI và kiểm tra lại ở backend. Editor chỉ sửa bản nháp; reviewer chỉ đọc/xử lý safety; viewer/revoked không thể publish.
- Migration forward-only `supabase/migrations/20260902131408_owner_capability_boundary.sql` tạo capability RPC, multi-role union, role-change guard giữ owner cuối cùng, audit role change, owner overview/safety queue đã làm sạch dữ liệu riêng tư, và loại bỏ các nhánh `is_admin()` khỏi policy dữ liệu cá nhân.
- Notification dispatcher/receipts dùng service-role client phía server sau khi xác thực capability; client/admin không đọc token push của người dùng khác.
- `supabase/functions/README.md` và readiness validator đã cập nhật đủ admin model-router, notification functions và migration mới.

## Môi trường staging và kiểm thử quyền

- Đã tạo project độc lập `Nilaza Staging QA`, ref `akgrokwnkfqnfjqrildi`, cùng organization Nilaza, region `ap-southeast-2`, plan Free, trạng thái `ACTIVE_HEALTHY`. Không copy dữ liệu production (`uannkrywhxzrulufgqvx`) và không tạo branch có tính phí.
- Đã áp dụng toàn bộ baseline migrations và migration capability mới lên staging. Bài kiểm thử `supabase/tests/owner_capability_boundary.sql` dùng 6 identity synthetic trong transaction rollback; kết quả:

  `PASS: 6 identities; isolation, escalation, draft/publish, ownership, review, ops capability, last owner, audit, revocation, RPC ACL`

- Bằng chứng hồi quy trước migration: editor có thể tự nâng thành owner (`editor_self_promoted: true`) và đọc một hàng Journal của người khác (`foreign_journal_rows: 1`). Sau migration, cả hai đường đều bị từ chối; editor vẫn sửa được draft hợp lệ, không publish/sửa bản active.
- Staging advisor security không ghi nhận lỗi mới ngoài cảnh báo có sẵn về extension vector trong schema public. Performance advisor còn INFO/WARN về foreign-key index và nhiều permissive policy; đây là backlog tối ưu truy vấn, không phải quyền đọc dữ liệu mới.

## Danh sách xung đột cũ/mới và quyết định xử lý

| Xung đột | Đánh giá code cũ | Đánh giá code mới / xử lý tối ưu | Trạng thái |
| --- | --- | --- | --- |
| Shell landscape `alignSelf: center` và ScrollView dài | Parent chuyển sang row nhưng content không stretch theo cross-axis; Profile có `clientHeight = scrollHeight`, Home/Explore bị cắt | `AdaptiveScaffold` dùng stretch + `flex/minHeight/minWidth: 0`; state không reset khi xoay | Đã xử lý |
| Card/thumbnail width cố định và ảnh cover | Tablet làm ảnh thành dải crop, card không theo chiều rộng thực tế | `ResponsiveGrid` đo width, `minItemWidth`; artwork dùng `contain` và aspect ratio | Đã xử lý |
| Margin âm 20 px ở header/chip rail | Scrollbar web trên 320 px làm root dư 4 px, gây horizontal overflow | Gutter compact 16 px, rail con vẫn scroll ngang nhưng root không tràn | Đã xử lý |
| `is_admin()` cũ cấp quyền cho mọi role | Editor/reviewer có thể đọc dữ liệu riêng, tự nâng owner; không biểu diễn multi-role | Canonical capabilities + SECURITY DEFINER role lookup + RLS `TO authenticated`; `is_admin()` chỉ còn compatibility cho `ai.manage` | Đã xử lý và staging PASS |
| Admin desktop role names + `maybeSingle()` | Vocabulary lệch (`content_admin`, `reviewer`, `viewer`) và multi-role có thể fail | `NilazaAccess` parse union role/capability, fail closed; UI và Edge Function đều recheck | Đã xử lý |
| UI admin localStorage vs quyền backend | Viewer/revoked/editor có thể thao tác local hoặc publish nếu chỉ dựa UI | Gate fresh trước action; editor chỉ draft; publish/delete/audit do capability + RLS | Đã xử lý; 12 admin tests PASS |
| Notification worker dùng bearer context đọc token người khác | Nếu bỏ admin bypass thì worker hỏng; nếu giữ bypass thì lộ token | Capability check bằng JWT, sau đó server-only service-role client; client không nhận raw token | Đã xử lý, chưa deploy do quota |
| Card/source tables không có draft status | Cho editor generic write sẽ không thể giới hạn bản nháp | Chỉ `content.publish` được ghi; owner có delete boundary riêng | Đã xử lý |
| Static owner link có nguy cơ chuyển token | Mở console từ mobile dễ nhầm là đã được xác thực | URL allowlist HTTPS/local-dev, hash route, không truyền token; console đăng nhập riêng | Đã xử lý |
| Seed/migration cũ và capability migration | Sửa migration cũ sẽ làm production drift; áp dụng branch có phí | Capability nằm trong migration forward-only; staging project độc lập, production untouched | Đã xử lý |

## Validation cuối

- `npm run mobile:check`: đạt.
- `npm --workspace apps/mobile test -- --runInBand`: **18 suites / 144 tests đạt**.
- `npm run admin:check`: đạt; contract **2 workspaces / 26 capabilities**.
- `npm run admin:test`: **13 tests đạt**, gồm cả session transport của AI Studio không cần dán JWT.
- `npm run validate:data`: đạt; 6 decks / 78 cards, không legacy ASCII tiếng Việt/mojibake.
- `npm run validate:backend`: đạt; **12 gateway paths / 17 Edge Functions**.
- `npm run supabase:check`: **53 pass / 9 warn / 0 fail**; warning chỉ là env staging/provider chưa cấu hình trong máy QA.
- `npm run validate:visual-assets`: đạt; **524 runtime files / 45.90 MB**.
- `npm run validate:mobile-export`: đạt; **55.05 MB**, thấp hơn baseline 400.5 MB **86.3%** và dưới mục tiêu 120 MB.
- Deno type check 5 Edge Functions quản trị/thông báo và `node --check` các script admin: đạt.
- Browser QA matrix sau patch: **55 viewport × tab/flow rows**, gồm 320×568, 360×800, 390×884, 430×932, phone ngang 844×390, tablet dọc 768×1024/820×1180, tablet ngang 1024×768/1180×820/1366×1024 và split-like 600×820. **0 root horizontal overflow**; các ScrollView dài có `scrollHeight > clientHeight`. Chat có khung scroll riêng; chip rail là overflow ngang được thiết kế có chủ đích.
- Screenshot cuối: `14-explore-320-final.png`, `15-profile-1180-final.png`, `16-tarot-1024-final.png`, `17-tarot-spread-1024-final.png`, `scroll-matrix-final.json` trong `artifacts/landscape-owner-qa-2026-09-02/`.

### Bổ sung audit Khám phá và trạng thái production

- Audit lại bằng QA local sau phản hồi mới: ở 1024×768, các feature card của Khám phá đang nhận chiều cao intrinsic 640 px của PNG dù khung đặt aspect ratio 16:10. Hậu quả là mỗi card cao khoảng 762 px, section bị kéo dài và thumbnail nhìn như bị mất tỉ lệ; đây là lỗi React Native Web wrapper, không phải lỗi asset.
- Đã sửa `VisualFeatureCard` để tính chiều rộng card theo layout/nav/gutter và truyền chiều cao frame 16:10 tường minh (card full dùng frame 104×65). Kết quả đo: card feature tại 1024×768 từ **762 px xuống 382 px**, ảnh từ **640 px xuống 260 px**; tại 390×884 card còn **341 px**, ảnh **219 px**. Scroll root vẫn không tràn ngang (`scrollWidth = clientWidth`).
- CTA Tarot trong hero cũng được chỉnh: vùng nội dung compact dùng đủ chiều rộng và khoảng cách nút 6 px, nên hai nút 44×44 giữ cùng một hàng ở cả 320 px và 390 px (trước đó nút thứ hai bị đẩy xuống dưới vùng tab bar trên 390 px). Đã đo lại `buttonsShareRow = true`, root không overflow ở cả hai viewport.
- Screenshot bằng chứng mới: `18-explore-390-current.png`, `19-explore-1024-current.png`, `21-explore-1024-fixed.png`, `22-explore-390-fixed.png`, `23-explore-390-cards-fixed.png`, `25-explore-390-cta-final.png`.
- Đã đối soát production project `Nilaza` (`uannkrywhxzrulufgqvx`): project đang `ACTIVE_HEALTHY`, region `ap-southeast-2`; organization plan hiện là **Free**. Production vẫn chỉ có 8 migration baseline và chưa có `20260902131408_owner_capability_boundary`; các Edge Functions đang hoạt động đều là phiên bản cũ/capability chưa đồng bộ.
- Lượt kiểm tra/triển khai production và truy vấn user `magicpendigital@gmail.com` bị Supabase connector chặn bởi **usage limit của phiên Codex** trước khi chạy SQL/deploy. Không thử workaround, không ghi dữ liệu production và chưa thể xác nhận email hoặc gán owner. Cần chạy lại khi quota mở (hoặc người quản trị tự chạy các bước được nêu trong phần handoff), sau đó mới deploy migration/functions và kiểm tra `get_admin_access()`.

## Giới hạn còn lại / cách phát hành an toàn

- Chưa có tài khoản JWT staging thật do project mới chưa có user vận hành; test SQL synthetic đã xác nhận RLS/RPC nhưng chưa thay thế hoàn toàn E2E PostgREST bằng tài khoản thật.
- Năm Edge Functions capability-aware chưa deploy được lên staging vì công cụ Supabase bị giới hạn usage trong phiên này. Migration và source đã type-check; cần deploy/re-probe khi quota mở lại, không dùng workaround và không deploy production.
- `EXPO_PUBLIC_NILAZA_ADMIN_URL` cố ý để trống trong local QA nên OwnerHub chỉ hiển thị trạng thái chưa cấu hình, không mở prototype như thể đã production. Khi staging console sẵn sàng, cấu hình URL HTTPS riêng và kiểm tra đăng nhập workspace lại.
- Native screen reader, font scale 200% và haptic cần một vòng QA trên iOS/Android thật; browser QA hiện mới xác nhận geometry, keyboard scroll và state không mất khi đổi orientation.
- Một số copy English còn lại thuộc admin console/thuật ngữ sản phẩm hoặc các flow chưa nằm trong viewport audit; nên gom vào catalog i18n ở đợt ngôn ngữ tiếp theo thay vì sửa rải rác.

## Handoff production và tư vấn gói

- Không bật production flag hoặc trỏ build mobile vào production trước khi migration capability, Edge Functions mới và admin console HTTPS đã được triển khai/kiểm thử cùng nhau. Bản QA local vẫn dùng được để duyệt UI nhưng không chứng minh backend production.
- Với project hiện tại, Free phù hợp cho QA/closed beta nhỏ. Tuy nhiên tổ chức đã dùng đúng hai project (production + staging), Free có giới hạn 2 project active, database 500 MB/project, 1 GB Storage, 5 GB egress, 500.000 Edge Function invocations, không có automatic backups và có thể pause sau một tuần không hoạt động. Pro bắt đầu từ 25 USD/tháng, thêm project từ 10 USD/tháng, có 8 GB database/project, 250 GB egress, backups và không pause project; nên nâng tổ chức Nilaza lên Pro trước MVP production công khai, bật Spend Cap để kiểm soát chi phí. Tham chiếu: Supabase billing/pricing docs.
- Khi quota connector mở lại, thứ tự thao tác bắt buộc: (1) apply migration `20260902131408_owner_capability_boundary` vào `uannkrywhxzrulufgqvx`; (2) truy vấn đúng `auth.users` theo email `magicpendigital@gmail.com`; (3) nếu chỉ có một user, upsert assignment `(user_id, 'owner', 'active')`; (4) deploy các function capability-aware với `verify_jwt=true`; (5) gọi `get_admin_access()` bằng session của tài khoản và mở AI Studio; (6) cấu hình LLM secret trong Supabase Edge Function secrets, tuyệt đối không đặt vào `EXPO_PUBLIC_*` hoặc URL. Nếu email không tồn tại/không duy nhất thì dừng, không tự tạo tài khoản.
