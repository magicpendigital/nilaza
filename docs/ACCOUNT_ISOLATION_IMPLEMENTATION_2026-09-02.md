# Hợp nhất dữ liệu theo tài khoản — C1–C3

## Phạm vi được duyệt và Whole-App Impact Brief

- Mục tiêu: sửa token bị giữ từ phiên trước, cache dùng chung và truy vấn cá nhân không giới hạn owner. Giữ Supabase đồng bộ và UI responsive hiện tại.
- Lane: mobile, auth, dữ liệu, riêng tư. Không triển khai lên production.
- Điểm vào: khôi phục phiên, đăng nhập/đăng xuất, Home, Journal, Persona, Oracle và AI Council; giữ 5 tab và luồng Tarot.
- Ranh giới: auth ở ngoài; vùng state cá nhân được thay thế khi đổi tài khoản/đăng xuất, không thay khi xoay hoặc refresh token. Request và callback lưu trữ thuộc vòng đời của vùng đó.
- Dữ liệu: cache theo user ID, chỉ ghi sau khi hydrate; tuần tự hóa ghi/xóa, không biến lỗi đọc thành dữ liệu rỗng. Không tự gán cache global cũ thiếu bằng chứng chủ sở hữu cho tài khoản mới. Giữ nguyên cache legacy để phục hồi có xác nhận sau.
- Backend: giữ API/migrations hiện tại; client đọc không sở hữu một kho auth thứ hai. Personal queries lọc user_id, loại bản ghi đã xóa; role chỉ đọc active và hỗ trợ nhiều role. RLS vẫn là lớp quyền server, không được thay thế bởi filter client.
- Admin: giữ lối vào owner hiện có; reset quyền khi đổi phiên, kiểm tra cả route. Không dùng dữ liệu mọi người trong consumer. Capability/owner hub và sửa RLS rộng là đợt riêng.
- Riêng tư: reset tất cả draft, consent, birth data, cache chat/council và ảnh kết quả khi đổi tài khoản. Không ghi token vào cache nội dung, không log nội dung hoặc credential.
- Analytics: chỉ giữ event metadata hiện có theo tài khoản; lỗi đồng bộ hiển thị thông báo chung, không log raw payload.
- Rollback: chưa bật guest; không cần rollback DB. Backend lỗi vẫn đọc cache của đúng tài khoản. Không rollback về client singleton/global cache không an toàn.
- Không sửa: thuật toán Tarot, prompts/provider, bảng giá/ledger, schema, admin web, assets và thiết kế responsive.

## Các bước

1. Chốt vòng đời identity/request/storage; bổ sung regression bằng token và dữ liệu synthetic.
2. Lọc personal queries và adapter DTO cần cho hydration; lỗi remote không xóa cache.
3. Ghép vùng state/cache theo tài khoản vào App và Council; migration auth v1, token refresh, logout và xóa local.
4. Kiểm tra diff, TypeScript, focused tests rồi toàn bộ Jest/data/backend/admin/visual checks; QA local save → reload và rotation.

## Nghiệm thu quản lý

- A lưu Journal rồi tải lại/offline: mục vẫn còn; B không thấy mục, chat, birth hay quyền của A.
- Đăng xuất trong lúc tải/gửi: phản hồi đến muộn không xuất hiện trong B và không khởi động request tiếp theo bằng phiên cũ.
- Owner mở Journal/Chat cá nhân: chỉ truy vấn user_id của mình; role revoked không mở route quản trị.
- Refresh token và xoay điện thoại/tablet: giữ input, màn và bài hiện tại.
- Lỗi mạng/permission: giữ cache và cho thử lại; không hiển thị JSONB như văn bản.

## Kiểm tra

`npm --workspace apps/mobile run check`; mobile Jest; `npm run validate:data`; `npm run validate:backend`; `npm run supabase:check`; `npm run admin:check`; `npm run admin:test`; `npm run validate:visual-assets`.

Kiểm thử query bằng mock và staging/local nếu có runtime; không suy ra quyền production từ test client. Không truy cập tài khoản thật khi chưa có fixture test được cho phép.

## Kết quả triển khai

Outcome: **fixed — ranh giới phiên/dữ liệu mobile C1–C3**, không phải xác nhận toàn bộ backend hay sẵn sàng production.

Đã giữ hướng Supabase/server của code mới và nối cache local bền vững theo tài khoản. Không phục hồi App cũ nguyên khối; lớp sửa nằm ở điểm dùng chung của identity → request → cache → UI.

| Ranh giới | Thay đổi và hành vi giữ lại |
|---|---|
| Identity / token | `AccountScope` sống theo một lần đăng nhập. Refresh token cập nhật cùng scope; đổi tài khoản đóng và abort scope cũ trước khi render tài khoản mới. Client dữ liệu đọc token hiện tại, không giữ Authorization lần đầu hoặc tạo thêm kho auth |
| Auth timeout / logout | Đăng nhập dùng SDK client tạm trong RAM; chỉ kết quả còn hiệu lực mới được nhập vào kho phiên chính. Đăng xuất vô hiệu hóa request ngay, chờ xóa phiên/ghi trạng thái signed-out; thất bại hiện thử lại, không tự khôi phục A |
| UI cá nhân | `App` giữ auth, `AccountApp` có key theo scope. Xoay/refresh token giữ state; A→B thay toàn bộ draft, role, consent và dữ liệu riêng. Guard đóng scope chặn callback của AuthFlow cũ |
| Cache | Khóa `nilaza.user.<encoded-user-id>.*`, kể cả dấu chấm trong ID email được escape. Đọc đủ trước khi bật ghi; lỗi đọc không bị biến thành mảng rỗng rồi ghi đè. Ghi/retry/xóa tuần tự, không đổi đích khi tài khoản thay đổi |
| Personal queries | Luôn lọc `user_id`, kể cả owner, cho profile/birth/Journal/chat/daily/usage/safety/Tarot/Astrology. Kiểm tra chủ sở hữu session trước khi đọc message; bỏ bản ghi đã xóa. Role chỉ lấy active và hỗ trợ nhiều role |
| Hydration / DTO | Tách lỗi từng nhóm, giữ cache khi remote lỗi. Đọc đúng JSONB daily, ánh xạ Persona slug và session, khôi phục cloud profile theo owner khi chưa có cache. Journal giữ bản chưa đồng bộ, không để GET cũ xóa mục vừa POST thành công |
| AI Council / Oracle | Council lưu cả transcript trong namespace của tài khoản; không ghi khi cache đọc lỗi, không nhận kết quả cũ sau đóng scope. Oracle giữ bản local vì endpoint chưa lưu chat turns; không xóa local bằng lịch sử server rỗng |
| Xóa local | Chỉ xóa namespace chính xác của tài khoản hiện tại sau các write đã chấp nhận. Không xóa tài khoản B có ID cùng tiền tố; lỗi xóa có trạng thái và nút thử lại |

### Files chính

- `apps/mobile/App.tsx`: ghép scope/hydration/error/retry, giữ các màn và shell responsive hiện hành.
- `apps/mobile/src/auth/{accountScope,accountStorage,useAccountSession,personalData}.ts`: ranh giới phiên, cache và adapters mới.
- `apps/mobile/src/auth/{sessionStorage,supabaseAuth}.ts`: namespace chuẩn, SDK listener và đăng nhập tạm.
- `apps/mobile/src/backendClient.ts`: token hiện tại, cancel, owner predicates, profile/role/DTO query contracts.
- `apps/mobile/src/features/council/useAiCouncilRoom.ts`, `apps/mobile/src/types.ts`: cache transcript và trạng thái đồng bộ Journal.
- Regression mới trong `src/auth/__tests__`, `src/__tests__/accountQueries.test.ts` và `src/features/council/__tests__/useAiCouncilRoom.test.tsx`; hai probe synthetic trong thư mục artifacts.

## Kiểm chứng theo thứ tự

1. **Syntax / type / build:** `npm --workspace apps/mobile run check` đạt; `git diff --check` trên các file sửa đạt (chỉ cảnh báo chuẩn hóa LF/CRLF). `expo export --platform web --output-dir .codex-expo-export-account` đạt; validator export đo **55,05 MiB**, giảm **86,3%** so với baseline 400,5 MiB.
2. **Trigger / trường hợp đối kháng:** `node artifacts/responsive-qa-2026-09-02/probe-account-client.cjs` đạt — query B dùng token B, lọc B, không auth store thứ hai. `probe-auth-timeout.cjs` dùng **SDK Supabase thực tế đang cài**, HTTP giả và storage RAM: A timeout → B đăng nhập/đăng xuất → A trả về muộn; không có phiên A tái xuất hiện. Không mạng hoặc credential thật.
3. **Control / regression:** `npm --workspace apps/mobile test -- --runInBand` đạt **17 suites / 139 tests**. Bao gồm v1→v2 identity, không hồi sinh JWT cũ, token refresh, stale bootstrap, lỗi signout/disk/retry, cache A/B, prefix có dấu chấm, clear khi write đang chờ, stale GET/POST Journal, DTO, Council reload/offline/late response và regression UI hiện có.
4. **Kiểm tra repo:** `validate:data`, `validate:backend`, `admin:check`, `admin:test`, `validate:visual-assets` đều đạt. Admin **9/9 tests**; backend validator 12 gateway schemas / 15 functions. `supabase:check`: **51 pass / 9 warn / 0 fail**, các warn cấu hình môi trường không phải kiểm chứng RLS runtime. Runtime assets **524 file / 45,90 MiB**. Không sửa schema, admin, provider, dependencies hoặc seed trong patch C1–C3.

Kiểm tra mẫu credential trên các helper auth/cache và backendClient đã sửa: không thấy private-key header, `sk-…` hoặc `sb_secret_…`; đây không phải quét secret toàn repo.

Vòng kiểm tra theo skill `codex-security:fix-finding` đã phát hiện thêm race ở durable logout, retry-write/clear, SDK đăng nhập timeout và Journal GET/POST. Đã tái hiện, sửa trong cùng ranh giới và thêm test. Checklist React được áp dụng vào lifecycle key/effect để token refresh và orientation không kích hoạt reset dữ liệu.

## QA qua giao diện trên bản code cuối

- Môi trường `http://localhost:8084`, `EXPO_NO_DOTENV=1`, không URL/key Supabase hoặc API backend trong process. Không đăng ký, sửa dữ liệu hoặc gọi AI thật.
- Onboarding local → Home → Rút nhanh → lá thứ nhất **King of Pentacles**, 1/3. Đổi **390×884 → 1180×820**, lá và bước giữ nguyên.
- Rút đủ ba lá (**King of Pentacles / The World / Seven of Cups**) → “Viết vào nhật ký” → reload app: Home còn **1 chiêm nghiệm**; mở Journal thấy đúng entry và tổng hợp của ba lá. Lỗi persistence baseline đã không còn tái hiện.
- Oracle: nhập bản nháp QA ở **1180×820** rồi chuyển về **390×884**; nội dung giữ nguyên khi rail đổi thành bottom tabs. Đã xóa bản nháp QA sau kiểm tra, không gửi tin và không bật consent truy cập Journal/birth.
- Test tự động chứng minh tách A/B và phục hồi Council; browser QA chỉ kiểm tra tài khoản local đang được người dùng cho phép, không giả lập truy cập tài khoản Supabase thật.

Bằng chứng trực quan: `artifacts/responsive-qa-2026-09-02/journal-account-reload-390.png`. Bản QA được giữ tại màn Nhật ký; draft kiểm thử đã dọn, entry Tarot QA được giữ để quản lý kiểm tra reload.

## Rủi ro còn lại và phần cố ý chưa làm

- **Legacy:** migrate identity v1→v2 nhưng không tự nhận cache global cũ thiếu chứng cứ chủ sở hữu. Cache legacy được giữ nguyên, không hiển thị cho tài khoản mới; nội dung local cũ có thể cần quy trình nhập lại có xác nhận. Xóa namespace mới không xóa các khóa legacy mơ hồ đó. Chưa có cloud profile và chưa có cache đúng namespace thì local có thể cần onboarding lại.
- **Staging/native:** chưa kiểm thử A/B/owner/revoked trên Supabase thật, RLS allow/deny, iOS/Android, bàn phím native, TalkBack/VoiceOver hoặc toàn matrix font 200%. Filter client không thay RLS. Changelog Supabase không tải được do lỗi TLS/định dạng ở môi trường; đã đối chiếu docs auth chính thức và SDK đang cài, không nâng phiên bản SDK.
- **Đồng bộ:** patch không bổ sung API sửa/xóa toàn bộ cloud history. Journal sửa/xóa local chưa đồng nghĩa sửa/xóa server; Persona có thể cần reconciliation ID để loại trùng logic local/remote. Oracle backend chưa lưu turns. Export dữ liệu và xóa tài khoản server vẫn là việc riêng.
- **Quyền/owner:** route mobile và active role được kiểm tra lại, nhưng owner hub, taxonomy/capability chung và migration RLS C4/C6 vẫn chưa hoàn tất. Không coi AdminScreen prototype là quản trị production.
- **Ngoài scope:** guest chưa bật; credits/ledger C8, provider C10, cấu hình admin hosted C11, Tarot back-state C12 và các đợt hoàn thiện dịch/master-detail/large-font vẫn theo báo cáo xung đột. Warning web notifications/shadow/tint/native-driver đã có từ QA trước không được coi là đã xử lý.
- Staged App được giữ nguyên **119 dòng thêm / 17 dòng bỏ**. Không commit, stage, deploy, push, migration hoặc xóa dữ liệu người dùng. Artifacts/export mới nằm riêng, không ghi đè export cũ.

## Đường kiểm tra quản lý / bước tiếp theo

1. Mở QA local, rút Tarot → lưu → reload → kiểm tra Journal còn đúng mục.
2. Gõ bản nháp Trò chuyện, xoay tablet dọc/ngang; màn và bản nháp phải còn.
3. Dùng fixture staging được cho phép: A có dữ liệu → logout trong lúc tải → B đăng nhập; B không thấy Journal/chat/birth/role của A. Owner trong tab cá nhân chỉ thấy dữ liệu của mình.
4. Bước tiếp theo nên là owner hub/capability và RLS allow/deny trên local/staging, rồi mới bật guest và hoàn thiện toàn bộ UI đa thiết bị.
