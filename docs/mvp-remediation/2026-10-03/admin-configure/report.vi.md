# Nilaza — Audit Admin Configure và sửa lỗi local

Ngày kiểm tra: 03/10/2026. Đối tượng: Owner/Admin không chuyên kỹ thuật của Nilaza. Phạm vi: AI Studio Configure, phụ thuộc backend, điều hướng shell và hồi quy Content/Growth. Kết quả này bổ sung [audit Oracle 02/10](/D:/nilaza/docs/mvp-remediation/2026-10-02/oracle-audit/report.vi.md).

## Kết luận nghiệm thu

**Configure chưa sẵn sàng để nghiệm thu MVP như một công cụ quản trị AI đầy đủ.** Có backend thật ở Model Router, cặp prompt Astrology và observability; nhiều màn hình còn là preview. Owner hiện chưa hoàn thành được chuỗi sửa prompt Oracle → thử câu trả lời → publish một bundle → xác nhận đúng version trong app → khôi phục cấu hình bằng Admin.

Đã sửa các lỗi local có thể publish nhầm, mất draft và tạo kỳ vọng sai. Council publish được khóa để tránh gửi mẫu lên backend; đây là biện pháp chặn rủi ro, chưa phải hoàn thiện Council. Nền tảng prompt Core + Feature + Locale được chuẩn bị local, chưa thay prompt LLM đang chạy.

**Không publish, apply SQL, deploy hoặc gọi provider trong đợt audit này.** QA cũ `akgrokwnkfqnfjqrildi` được giữ làm bằng chứng theo quyết định của chủ sản phẩm. Migration AI Studio đã áp dụng ngày 26/09; toàn ledger vẫn blocked vì divergence riêng. Không suy diễn tất cả backend là mock chỉ vì ledger blocked. Xem [ledger](/D:/nilaza/docs/SUPABASE_MIGRATION_LEDGER.md).

## Bằng chứng và giới hạn

- Mã Admin trước sửa được lưu tại [pre-edit](/D:/nilaza/docs/mvp-remediation/2026-10-03/admin-configure/pre-edit). Đã đối chiếu source local, migration/RPC, feature consumers và ba Admin Edge Functions đã triển khai. [Deployment metadata](/D:/nilaza/docs/mvp-remediation/2026-10-03/admin-configure/deployment-evidence.json) và các bản source `deployed-admin-*.ts` là bằng chứng chỉ đọc, không phải file thực thi/migration.
- Browser tích hợp, tài khoản QA Owner đăng nhập qua giao diện; viewport mặc định 1280×720, thêm breakpoint 1024×768. Có 16 ảnh gốc trong `screenshots`; đã mở kiểm tra ảnh sau khi chụp. Đây là ảnh current-run, chủ yếu của bản local sau khi sửa. Không có ảnh baseline trước sửa AI Studio; lỗi trước sửa dựa vào bản source đã lưu và regression test.
- GET Model Router, Council, Astrology thực sự thành công. Audit RPC trả **0 events** cho lần tải; không kết luận không tồn tại lịch sử audit. Trace Explorer trả **11 Astrology traces**, gồm completed/fallback, staging/development; chỉ đọc metadata/redacted view, không bật hoặc reveal raw QA payload. Các traces này có ngày cũ và không phải kết quả generation mới của đợt audit.
- Modal prompt và route được mở, kiểm tra rồi Cancel; không bấm xác nhận publish. Kiểm tra Escape của modal route: modal vẫn mở. Không kiểm chứng screen reader, zoom 200%, mọi browser/thiết bị hoặc tính atomic/CAS trên cloud bằng thao tác ghi.
- Kiểm thử local đã đạt `admin:check`, `admin:test` **98/98** (gồm 39 AI Studio cases), composer **18/18**, `validate:data` và `validate:governance`. Test có mock transport/jsdom: chứng minh hành vi local, không chứng minh cloud publisher/LLM thành công. Kết quả và preflight cuối cùng ghi trong [validation.json](/D:/nilaza/docs/mvp-remediation/2026-10-03/admin-configure/validation.json).

## Ma trận cấu hình: đang chạy thật hay preview?

| Khu vực | Lưu/tải/publish | Consumer thực tế | Đánh giá |
| --- | --- | --- | --- |
| Auth và quyền | Supabase Auth, `get_admin_access`, capability refresh trước request | Guard shell/iframe và backend capability | Có cơ chế thật; Owner đã mở các workspace. Chưa chạy UI bằng mọi role. |
| Workflow 7 bước | Sơ đồ/inspector trong browser | Mỗi endpoint có implementation riêng | Sơ đồ không phải workflow engine; chỉnh preview không đổi luồng thực thi. |
| Context Builder/Data mindmap | Draft trình duyệt, checkbox/mapping mẫu | Allowlist/context/consent trong từng endpoint | Preview; chưa publish được chính sách context hay ngân sách history. |
| Safety Gate | Policy reference cố định | Detector/validator trong backend | Read-only reference; badge không chứng minh safety vừa được kiểm tra. |
| Oracle Prompt Composer | Local preview/draft | Oracle backend hardcode system prompt | Chỉnh Admin chưa đổi prompt LLM. Prompt active trong DB không được Oracle consumer đọc. |
| Daily Prompt Composer | Local preview | Backend hardcode prompt | Chưa có publisher prompt thực từ màn này. |
| Persona/Tarot Prompt Composer | Local preview | Backend có đọc `prompt_versions` | Có nguồn prompt backend, nhưng AI Studio chưa nối publisher cho chúng. |
| Astrology Prompt Composer | GET thật; source POST/RPC publish cặp VI/EN atomic + expected-version | Backend đọc active theo locale và thêm safety/schema instructions | GET đã thấy cả VI/EN `2026-09-25-ai-insight-v1`. POST/CAS chưa thử live đợt này. |
| Persona Prompt Studio | Ba persona mẫu/layer preview hardcode | Runtime dùng resolver/assembler và method packs riêng | Preview không tương đương prompt thật, chưa quản lý toàn bộ persona. |
| Council Builder | GET thật trả một active config và bốn templates | Runtime đọc một phần config/template | Form mẫu không hydrate response; publisher cloud chưa atomic. Local đã khóa POST. |
| Model Router | GET thật; source POST→RPC atomic+audit | Các endpoint đọc route thật | Oracle GET đúng `2026-09-14-oracle-pinned-v2`, OpenRouter `nex-agi/nex-n2.5-mini:free`, 300 output, không fallback. Chưa test model trong đợt này. |
| Test Run/Optimizer | Chỉ báo trạng thái/hướng dẫn | Không gọi provider/eval | Không có measured quality, tokens, cost, latency, A/B hay promote. |
| Versions | History model route và Astrology prompt | Records backend | Chưa có compare, clone, rollback hoặc snapshot đầy đủ; coverage chưa thống nhất. |
| Audit | RPC thật, quyền thật | Route/Astrology/QA-reveal audit | GET thành công nhưng trả 0 events; Council publish chưa có cùng audit stream. |
| Trace Explorer | RPC thật, metadata/redacted | Provider/validation/save trace theo feature | 11 Astrology traces tải được. Chưa gắn config bundle thống nhất cho mọi AI flow. |
| Face Reading | Seed/preview deferred | Không thuộc MVP release | Local không cho chỉnh/publish LLM route; preview context vẫn cần thu gọn. |
| Notifications | Operations reference | Expo Push/inbox | Không phải tính năng LLM; local không cho publish model route. |

## Luồng quản trị đã chạy

| Bước | Công việc đã kiểm tra | Sức khỏe/giới hạn | Ảnh |
| --- | --- | --- | --- |
| 1 | Đăng nhập QA → Content Personas | Truy cập bảo vệ hoạt động; danh sách còn ghi seed. Không chỉnh/publish nội dung. | 01 |
| 2 | AI Studio → Workflow/Context | Preview có nhãn; editor chính nằm dưới sơ đồ dài. | 02 |
| 3 | Oracle → Prompt Composer | Có nhãn local preview và active route; không phải prompt runtime. | 03 |
| 4 | Model Router → Check connection/Model Call | GET thật; secret presence khác health/model test; có fallback None. | 04 |
| 5 | Council Builder → Load active config | GET thành công, editor vẫn mẫu; publish đã khóa và giải thích rõ. | 05 |
| 6 | Test Run/Test output | Chỉ thông báo no provider call; ảnh 06 nằm ở header, nội dung panel xem ảnh 16 và DOM. | 06, 16 |
| 7 | Astrology → Prompt Composer | Tải active VI/EN thật; không publish. | 07 |
| 8 | Versions | Tải history; chưa đủ settings để tự khôi phục. | 08 |
| 9 | Audit → Load | RPC thành công, 0 events trả về; không giả lập lịch sử. | 09 |
| 10 | Trace → Load | 11 metadata traces; tự chọn run đầu, không reveal raw payload. | 10 |
| 11 | Persona Prompt Studio | Ba persona mẫu; prompt assembly preview không dùng chung consumer. | 11 |
| 12 | Face → Model Router | Hiện lý do deferred, không còn publish route. | 12 |
| 13 | Model node → Prompt tab → CTA | Đúng modal lưu browser draft, không publish route nhầm; Cancel. | 13 |
| 14 | Model Router → Review | Modal nêu đúng feature/host/model/fallback/token/schema; Cancel. Escape chưa đóng. | 14 |
| 15 | Breakpoint 1024×768 | Sidebar chuyển thành danh sách full-width, đẩy editor khỏi viewport đầu. Đã reset viewport. | 15 |
| 16 | Reload shell, chuyển lại workspace | Session phục hồi; có login flash trong thời gian kiểm tra. Growth/Content cần dùng cùng shell, không bị thay thế. | DOM/hồi quy |

## Danh mục vấn đề, giải pháp và nghiệm thu

Trạng thái **Sửa local** nghĩa là đã có code và regression test; chưa phát hành cloud. **Chặn local** nghĩa là ngăn thao tác nguy hiểm nhưng tính năng còn thiếu. **Còn mở** là việc phải triển khai tiếp. P1 chặn MVP vận hành đầy đủ; P2 cần giải quyết trước beta cho manager; P3 cải thiện độ rõ và tính nhất quán. P0 dưới đây kế thừa audit Oracle trước, chưa được sửa trong slice này.

### Tính đúng đắn của cấu hình và backend

| ID / mức / trạng thái | Vấn đề và ảnh hưởng | Giải pháp cụ thể | Nghiệm thu |
| --- | --- | --- | --- |
| C01 P1 — Chặn local | Council GET không hydrate editor. Backend thật có copy/roster khác mẫu; publish trước sửa có thể ghi đè bằng mẫu. Source `loadCouncilAdminConfig`, `councilPublishPayload`; ảnh 05. | Đã khóa mọi POST từ UI. Tiếp theo hydrate schema đúng, snapshot active ID/hash, draft riêng và diff toàn bundle. | Load config A → editor hiển thị đúng A; sửa không thay phần khác; chưa load hoặc schema lỗi không publish được. |
| C02 P1 — Còn mở | Council cloud publisher tách insert config, insert templates, archive, promote. Lỗi/concurrency có thể tạo orphan hoặc mất active. Deployed [Council:153](/D:/nilaza/docs/mvp-remediation/2026-10-03/admin-configure/deployed-admin-council.ts:153). | RPC transaction, lock, expected-active CAS, idempotency, unique active invariant, audit/readback. | Failure injection tại mỗi bước giữ active cũ; retry cùng key trả cùng revision; hai operator không ghi đè im lặng. |
| C03 P1 — Còn mở | Council lưu nhiều field nhưng runtime không đọc: context/turn/safety/runtime policies, transcript limit, flow, roster purpose/role; status template chưa lọc. [Consumer](/D:/nilaza/supabase/functions/ai-council/index.ts:238). | Một contract/version; mỗi field có consumer hoặc read-only unsupported. Active template thiếu/sai phải fail rõ; bỏ provenance giả `supabase_active_config`. | Sửa một field supported làm đổi fixture đúng; unsupported không có editor live; draft/inactive không xuất hiện trên traffic thường. |
| C04 P1 — Sửa local | UI từng duyệt các routes newest→oldest rồi để old ghi đè; detail dùng row đầu, tạo editor/header/runtime khác nhau. | Giữ một row eligible đầu tiên/feature theo API ordering, cùng nguồn cho header/editor. | Fixture nhiều active/experimental: editor/header cùng row đầu; prompt/context draft không ngăn hydrate route. Vẫn cần xử lý C05. |
| C05 P1 — Còn mở | Runtime chọn cả active và experimental; chưa có explicit QA allowlist/traffic split. `published_at` null/order cũng cần chuẩn hóa. [Router](/D:/nilaza/supabase/functions/_shared/model-router.ts:152). | Traffic thường chỉ active; experimental dùng explicit policy/QA; ordering deterministic và gate provider/schema. | Publish experimental không đổi câu trả lời user thường; QA route có provenance rõ; nhiều active là lỗi, không chọn ngầm. |
| C06 P1 — Còn mở | Draft key chung, không project/operator/base-version; tồn tại sau logout, có thể áp dụng nhầm target hoặc bỏ qua config mới. | Namespace project+operator+module+locale, snapshot base version và stale warning/rebase; lưu storage lỗi phải hiện. | Đổi tài khoản/host không thấy draft của phiên khác; A publish, B draft cũ phải bị chặn/so sánh. |
| C07 P1 — Sửa local | Publish model từng xóa cả prompt/context draft dù chưa publish chúng. | Tách route fields và clear đúng phần route, giữ preview. | Sửa cả model/prompt/context → mock publish route → reload vẫn còn prompt/context. Chưa có exact cloud readback, xem C10. |
| C08 P2 — Sửa thông báo, còn thiếu lưu | Council thay Mode/Guides/Synthesis chỉ trong RAM nhưng từng báo saved. | Copy hiện ghi memory-only; sau C01 triển khai durable draft/base-version và release ID mới. | Reload giữ bản nháp khi tính năng được mở; không báo đã lưu nếu storage lỗi. Hiện reload mất preview là hành vi đã nêu rõ. |
| C09 P1 — Sửa local | Publish từng phụ thuộc node cũ; mở Prompt sau Model có thể publish route; Astrology gặp chiều ngược lại. | CTA theo section hiện tại, node clicks đồng bộ detail, review guard chặn đổi feature/section. | Model→Prompt mở modal draft; Astrology Prompt→Model mở route modal; đổi section sau review không POST. Ảnh 13–14. |
| C10 P1 — Còn mở | Model RPC atomic nhưng thiếu expected-active CAS/idempotency; active records vẫn có đường update trực tiếp cho người có quyền; readback chưa exact. | Immutable revision, publisher-only status transition, CAS/idempotency/audit, compare ID/version/hash sau POST. | Race không overwrite; retry không tạo revision thừa; người có quyền cũng không sửa nội dung active tại chỗ; draft chỉ clear khi readback khớp. Không có bằng chứng non-admin bypass. |
| C11 P1 — Còn mở | Oracle/Daily prompt hardcode; DB active và browser editor không ảnh hưởng Oracle LLM. [Oracle](/D:/nilaza/supabase/functions/ai-oracle-turn/index.ts:189). | Shared compiler + atomic pinned bundle, backend resolver đúng feature/locale, trace module versions/hash; preserve old IDs/history. | Sửa câu hướng dẫn candidate → preview và staging request cùng exact prompt/version; chưa publish không đổi live. |
| C12 P1 — Còn mở | Context preview khác actual payload: Oracle không dùng history/profile như UI; Daily nhận recentEntries dù checkbox Journal tắt. | Allowlist/consent enforced backend; context typed và budget; Admin dùng chính assembler với fixture giả. | Chưa consent thì không có field đó trong provider payload; toggle preview không giả claim enforcement; history dùng được ở câu hỏi tiếp. |
| C13 P1 — Còn mở | Persona đưa free-text tone/goals vào system instructions; preview khác backend assembler. [Assembler](/D:/nilaza/supabase/functions/_shared/persona-prompt-assembler.ts:256). | Enum tone/approved persona pack; user goals/history ở role/data boundary riêng; escape/validate resource inputs. | Payload injection trong goal/history không trở thành system rule; preview/consumer cùng compiler. Prompt test không thay thế moderation/runtime enforcement. |
| C14 P1 — Còn mở | Test Run/Optimize không chạy eval/provider; publish chưa bị ràng buộc quality/safety/locale/cost. | Candidate staging test runner, fixture suites VI/EN, measurable score rubric, safety cases, provider receipt, publish gate gắn bundle. | Mỗi candidate có test request/trace/version, latency/token/cost thực; provider lỗi là lỗi, không pass bằng safe_mock. |
| C15 P0 — Còn mở từ Oracle audit | Crisis phrase tiếng Việt trong audit trước vẫn rơi vào reflection/handoff Tarot/Council. Safety badge không ngăn lỗi đó. | Detector chung VI/EN + crisis response tĩnh, tắt spiritual handoff khi crisis; regression paraphrase/ngữ cảnh. | Bộ fixture khủng hoảng đạt toàn bộ; hướng hỗ trợ tức thời, không đoán/chẩn đoán, không trừ quota; kiểm chứng app và backend. |
| C16 P1 — Còn mở | Schema string trong UI không chứng minh provider enforce structured output; OpenRouter strict format hiện chỉ đúng Astrology path. | Provider capability validation + parser/schema validator mọi feature; controlled fallback cho malformed response. | Model incompatible bị chặn trước dispatch/publish; malformed output không vào Journal/UI; fallback có trace nguyên nhân. |
| C17 P1 — Còn mở | Quota/ngân sách đã chốt chỉ mới foundation local, chưa bảo vệ Oracle live; Admin chưa có measured cost gates. | Nối reservation/receipt/idempotency/refund theo R10 vào runtime; dashboard unavailable khác zero. | Chat+Oracle dùng chung 5/ngày, Tarot 1 lá/ngày; QA 5 USD/ngày và campaign 50 USD/14 ngày/eval 10 USD trong trần; request lỗi không mất lượt. |
| C18 P2 — Còn mở | Model GET thiếu ID/fallback_when/safety_policy; UI POST safety `{}`/fallback list cố định. Không roundtrip nguyên settings. | Contract snapshot đầy đủ, field supported editable; locked policy có chú thích; giữ nguyên chưa sửa. | Load→review→publish không làm mất policy/unknown supported fields; diff hiển thị mọi thay đổi. |
| C19 P2 — Còn mở | Council helper gán cùng English vào `vi` và `en`; mẫu có copy khác config bilingual thật. | Locale overlay riêng có reviewer/fixture; ngôn ngữ chưa duyệt phải blocked. | VI có dấu đúng và copy tự nhiên; EN không mang VI; thêm locale không copy cả core/feature. |
| C20 P2 — Còn mở | Astrology có main editor publish thật và prompt inspector local preview khác nguồn. | Một editor/nguồn thật; inspector chỉ shortcut tới editor hoặc read-only exact compiled preview. | Ở mọi entry point, owner thấy cùng version/text/locale; không chỉnh nhầm preview khi muốn đổi runtime. |
| C21 P2 — Còn mở | Persona Studio chỉ ba mẫu trong khi Content có nhiều persona, không liên kết bản đã quản lý. | Lấy approved persona profile/revision cùng Content source, chọn đủ persona; shared assembler. | Persona vừa tạo/active xuất hiện đúng; snapshot method/IP/source note trùng consumer; inactive không dùng. |
| C22 P1 — Còn mở | Versions chưa đủ fallback/temperature/token limit cũ; không compare/clone/rollback, thiếu Council/Persona/Tarot; Astrology row hiện ở feature khác. | Full immutable snapshot, filter feature, clone-to-draft, structured diff và restore bằng revision mới. | Manager khôi phục một config known-good chỉ bằng Admin, đủ fields; audit ghi restore; traffic dùng đúng revision sau readback. |
| C23 P2 — Còn mở | Council chỉ ghi usage_events, không vào audit stream chung; UI audit thiếu actor/feature-filter/link release/trace. | Audit schema chung có actor/target/version/hash/action, read-only filter; không raw prompt/chat. | Trả lời được ai sửa gì, lúc nào, host nào; Council publish/rollback/retry có event; private content không xuất hiện. |
| C24 P2 — Sửa một phần local | Seed version từng nhìn như active; route draft/prompt draft trộn trạng thái. Risk/safety vẫn tĩnh. | Đã đổi Backend version/route draft/no active loaded. Tiếp theo status card riêng cho loaded/published/runtime verified và sample risk. | Trước GET không báo active; preview không có live-success badge; model test lỗi không hiển thị healthy chỉ vì có secret. |
| C42 P1 — Sửa local | Review→confirm còn có khoảng chờ kiểm tra quyền; publisher đọc lại feature sau await, có thể POST Oracle trong khi manager vừa review Tarot. Tái hiện bằng delayed capability mock, không cloud write. | Đã pin immutable feature/section/payload/version/backend/endpoint đã review, kiểm tra lại sau capability awaits và tại điểm transport đọc body trước fetch; tương tự cặp prompt Astrology. Giữ sửa đổi mới khi response về. | Regression đạt: 8 cases đổi selection/payload trong capability checks của route/prompt và 1 case đổi trong transport refresh đều không POST. Luồng giữ nguyên gửi đúng snapshot đã review. |
| C43 P2 — Sửa local | Workflow node chưa clear retained QA payload; quay Trace có thể hiện lại mà không reveal/audit mới. Response reveal đang chờ cũng có thể về sau khi rời rồi quay lại cùng trace. Tái hiện bằng payload giả trong jsdom. | Đã dùng epoch chung khi clear: rời Trace qua node/tab, đổi feature/trace/filter, Hide và clear session. Vô hiệu hóa cả permission/response đang chờ, không tự reveal lại. | Regression đạt: reveal fixture → Context node → Trace không còn payload; response cũ sau leave/re-enter không khôi phục nội dung; lần reveal mới phải qua guard/audit. Đợt browser audit không reveal raw payload. |
| C40 P1 — Gate còn mở | Raw QA payload capture cần opt-in, staging, Owner, TTL và purge; ledger ghi purge schedule chưa xác nhận. | Giữ capture off; xác minh scheduler/retention trước mở trên QA sạch, audit mọi reveal và delete. | TTL hết không reveal được, purge thật chạy, storage encrypted, không xuất nội dung người dùng qua audit. Đợt này không bật/reveal. |
| C41 P2 — Còn mở | Catalog model tĩnh/Custom ID không xác nhận model tồn tại, parameters, schema, privacy/cost compatibility; key presence khác health. | Registry backend có checkedAt/capabilities/pricing metadata, bounded authenticated probe; route candidate compatible gate. | ID unsupported không publish; error cụ thể; không gọi provider ngoài budget; không đoán model bị gỡ chỉ vì một request 404. |

### UI/UX cho quản trị viên

| ID / mức / trạng thái | Vấn đề quan sát được | Giải pháp cụ thể | Nghiệm thu |
| --- | --- | --- | --- |
| C25 P2 — Còn mở | Prompt/Model/Versions/Trace nằm dưới canvas và inspector rất dài. Phía trên editor có khối trống lớn; phải scroll mới thấy công việc chính. Ảnh 03, 08, 11. | Khi chọn section, render editor ngay đầu main; Workflow thành section riêng/collapsible. Sticky header gồm feature/target/base-version/save. | Prompt và action chính thấy trong viewport 1280×720; không phải cuộn qua workflow để sửa. |
| C26 P2 — Còn mở | Điều hướng lặp ở shell route bar, sidebar Studio và detail tabs. Chọn tab trong iframe không đổi route ngoài; shell vẫn sáng Workflow khi đang Prompt/Versions. | Một điều hướng chính, URL lưu feature+section+locale; history/back/reload đồng bộ. | Deep link Oracle/Prompt/VI mở đúng, Back đúng, mọi selected state khớp. |
| C27 P2 — Còn mở | Model connector dồn một cột hẹp, bên cạnh bỏ trống; endpoint/version bị cắt trong input; Council config thật là JSON scroll nhỏ. Ảnh 04–05. | Route form full-width có nhóm primary/fallback/limits; read-only target có wrap/copy; Council active/draft structured form thay raw JSON mặc định. | Đọc được host/version đầy đủ, so sánh config không đọc JSON dài; không nested-scroll không cần thiết. |
| C28 P2 — Còn mở | 1024×768 sidebar thành toàn trang, tám feature và Studio đẩy editor khỏi viewport đầu; hover và active gần giống nhau. Ảnh 15. | Collapsible narrow sidebar/drawer; feature selector compact; active indicator riêng, preserve editor width. | Laptop/tablet width 1024 mở thẳng editor/CTA; không phải scroll qua menu; selection không chỉ dựa màu. |
| C29 P2 — Còn mở | Escape không đóng publish modal trong browser test; source chưa trap/restore focus/inert background. | Shared accessible dialog: Escape, initial focus, Tab trap, return focus, disabled background; bind frozen reviewed snapshot. | Hoàn thành/cancel review bằng keyboard, focus không ra ngoài và quay đúng CTA; có screen-reader acceptance riêng. |
| C30 P2 — Còn mở | Source có outline bị bỏ, textarea/search/endpoint không đủ label liên kết; re-render checkbox/select có thể mất focus. Đây là source risk, chưa full a11y test. | Form primitives có label/helper/error/focus-visible, stable focus keys, announce async statuses. | Keyboard đi qua mọi control, label đọc đúng; lưu lỗi có live region; 200% zoom/reflow và screen reader được kiểm tra. |
| C31 P2 — Còn mở | Controls edit/publish vẫn render cho role không có quyền, đến action mới denied. | Capability-aware read-only/disabled state và lý do; request review CTA khi cần. Backend guard giữ nguyên. | Editor/reviewer không thấy action khả thi giả; owner thấy đúng publish; revocation vẫn chặn ngay trước request. |
| C32 P1 — Sửa tài liệu local | Owner guide từng nói tất cả prompt quản trị tập trung, migration chưa apply; Quick Reference chỉ tới Rollback không tồn tại. | Đã sửa current-state, Council read-only, đúng migration ID/roles, quy trình khôi phục có snapshot và môi trường được phép. Bundle guide sinh lại local. | `admin:check` đạt; manager không được hướng dẫn tới action không có. Guide cloud vẫn là bản cũ cho tới deployment có gate. |
| C33 P2 — Sửa local | Save draft/Approved variables từng không có handler; @ chèn chỉ RAM. | Nối handlers tới đúng buffer và draft persistence, status nói preview/browser. | Chèn biến rồi reload vẫn còn; button Save lưu actual buffer; backend không bị POST. Regression đạt. |
| C34 P2 — Sửa local | Route null fallback không có lựa chọn rõ; có thể hiện provider mẫu. | `None · no fallback`, disable model field khi None, giữ null roundtrip. | GET null → form None → draft/reload vẫn None; không tự chọn provider. |
| C35 P2 — Chặn local, UI còn mở | Face Disabled vẫn từng có route publish; Notifications không LLM. Face preview vẫn có high-risk fields enabled tạo kỳ vọng feature ready. Ảnh 12. | Đã khóa model editor/POST; tiếp theo Face chỉ roadmap/read-only, không sample upload/consent enabled-looking. | Không có LLM publish cho deferred/non-AI; không gợi owner bật ảnh cá nhân trước phạm vi đã duyệt. |
| C36 P2 — Sửa local | Trace empty/not-loaded từng khuyên apply migration dù chưa query và migration có thật. | Copy mới phân biệt load/empty/error, giữ lỗi protected backend hiển thị. | Not loaded không gợi SQL apply; 0 rows khác RPC lỗi; không chế trace. |
| C37 P3 — Còn mở | Studio English/VI trộn trong một UI; content locale VI/EN khác UI locale; chữ Nilaza/font riêng khác shell official brand. Ảnh 02–07. | UI locale switch, technical IDs giữ nguyên; approved brand asset/Hanken, shared form/status/dialog components. | Một ngôn ngữ UI nhất quán; content locale rõ riêng; font tiếng Việt và focus/contrast đạt chuẩn. |
| C38 P3 — Còn mở | Modal review là một đoạn settings dày; body sát mép, warning chiếm lớn nhưng không có before/after. Ảnh 13–14. | Padding/token thống nhất; bảng diff active→candidate, changed fields nhấn rõ, impact target/feature/locale. | Owner chỉ ra đúng điều sẽ đổi trước confirm, đọc đầy đủ ở 1024/1280 và zoom; không phải dò string. |
| C39 P3 — Còn mở | Role badge fallback Admin khi session đang refresh trong khi shell ghi owner; dot xanh gắn nhiều message, login flash khi reload. | Checking-access state riêng, giữ role đã xác minh chỉ để hiển thị; action vẫn fail closed; status icons theo loading/error/draft thật. | Reload có màn verifying, không giả signed-out/sync success; badge nhất quán; không khôi phục quyền stale. |

## Hướng triển khai prompt chung đã được chốt

Một request dùng **Core + Feature + Locale overlay + persona/tone đã duyệt**, không tải mọi ngôn ngữ. User question/history/context đặt riêng khỏi system instructions. Các module nằm trong một bundle pin version/hash; publisher tạo revision atomic rồi runtime resolver đọc đúng revision. Không dùng “latest” độc lập từng module.

Nền tảng local tại [prompt-composition](/D:/nilaza/packages/agent-config/prompt-composition/README.md) dành cho Oracle VI/EN đã đạt **18/18 kiểm thử** và review an toàn độc lập. Nó chưa có editor backend/publisher, chưa thay thế old prompt_versions và không đổi Oracle cloud. Hỗ trợ ngôn ngữ mới cần locale overlay + UI/content dịch + fixture/eval + release gate; không nhân bản Core/Feature. Bundle pin nguồn, version và SHA của chính sách G1 `maxInputTokensPerAttempt=2000`; test chặn total envelope 2001 trên cả VI/EN. Token budget phải tính bằng tokenizer phù hợp model, gồm system/history/context và framing; số ký tự không phải số token. Kiểm thử dùng counter giả để kiểm tra cơ chế, chưa đo token thực. Khi chưa có tokenizer phù hợp, trạng thái là `not-assessed`; `providerReady` luôn là false cho API preview này.

Admin mục tiêu: **Chung / Tính năng / Ngôn ngữ / Xem prompt hợp nhất / Kiểm thử / Phiên bản**. Mỗi mục hiện source, revision, locale, feature ảnh hưởng, draft status, quyền; chỉ bật Publish khi candidate bundle đã qua eval và có target sạch được duyệt.

## Lộ trình tiếp và tiêu chí MVP

| Thứ tự | Slice cụ thể | Agent/khả năng triển khai | Gate nghiệm thu |
| --- | --- | --- | --- |
| 1 — đã thực hiện local | Các chặn publish, draft/route fixes, variable handlers và runbook thật | Admin operator agent hiện có; QA/Backend agent review độc lập | Tests + current UI evidence, không cloud writes. |
| 2 | Hoàn thiện bundle schema/compiler/shared effective preview, draft provenance và Oracle consumer | Backend/Prompt + Admin agents hiện có, không cần lập agent sản phẩm mới chỉ để ghép prompt | Core/Feature/VI/EN pinned; preview=provider input; injection/context/token tests; giữ history. |
| 3 | QA sạch: reviewed migrations, atomic publisher/RLS/CAS/idempotency/audit/readback | Backend/data agent hiện có; database-owner gate | Đúng target; không MCY; old QA giữ; fail/race/retry tests và account isolation. |
| 4 | Council hydrate/consumer parity, supported field matrix; Persona/Tarot/Daily theo cùng bundle | Backend + Admin + content/safety agents hiện có | Mỗi editable field có consumer; template active đúng; copy VI/EN approved. |
| 5 | Layout editor-first, URL state, capability-aware controls, responsive/a11y primitives | Admin/frontend + operator review agent hiện có | Ba operator jobs làm được, 1024/1280/1440, keyboard/zoom/screen reader; không mất draft. |
| 6 | Test runner, measured safety/quality/locale/cost, versions compare/clone/restore | QA + customer-quality + safety agents hiện có | Request/trace cùng bundle hash; no fake pass; limits R10 hoạt động; restore có audit. |

**Nghiệm thu MVP Configure chỉ đạt khi:** manager hoàn thành đổi prompt Oracle, đổi model và khôi phục revision bằng Admin; mỗi field được sửa có tác dụng thật hoặc nhãn preview rõ; draft không lẫn tài khoản/host và không mất; concurrency/retry không phá active; VI/EN đều qua eval; crisis/consent/quota enforced backend; cost/latency/error đo thật; trace/audit chứng minh đúng bundle; không phát hành khi các P0/P1 liên quan còn mở.

Phần layout có shared renderer ở một số khu vực nhưng `app.js` vẫn tập trung feature samples, handlers, preview/publisher và runtime-like assembly trong một file. Tách theo domain (`draft-store`, `release-review`, `model-route-editor`, `prompt-bundle-editor`, `observability`) và dùng chung status/form/dialog. A2UI mobile không tự giải quyết bất nhất Admin/backend; phải dùng chung contract/compiler, không thêm một assembler UI riêng nữa.

## Ảnh tiêu biểu

Ảnh 03 cho thấy prompt bị đặt sâu dưới workflow; ảnh 05 xác nhận GET Council thật nhưng publish bị khóa; ảnh 13 cho thấy prompt-save không còn publish route nhầm. Ảnh 15 là breakpoint 1024 cần sửa. Các ảnh có thông tin tài khoản QA quản trị; giữ trong tài liệu nội bộ, không đưa vào Help/public corpus.

![Oracle Prompt Composer — preview nằm dưới canvas](/D:/nilaza/docs/mvp-remediation/2026-10-03/admin-configure/screenshots/03-oracle-prompt-preview.png)

![Council — backend load thật và publish bị chặn](/D:/nilaza/docs/mvp-remediation/2026-10-03/admin-configure/screenshots/05-council-read-only.png)

![Prompt-save review đúng phạm vi](/D:/nilaza/docs/mvp-remediation/2026-10-03/admin-configure/screenshots/13-prompt-draft-review.png)

![Admin 1024 — menu đẩy editor khỏi viewport](/D:/nilaza/docs/mvp-remediation/2026-10-03/admin-configure/screenshots/15-admin-1024.png)
