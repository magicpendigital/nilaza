# Kết quả triển khai Configure, prompt và đồng bộ — 03/10/2026

Lát cắt local/Admin đã triển khai và phát hành lên [Admin staging](https://nilaza-admin-staging.vercel.app). Revision 2, deployment `dpl_BuWee6a83hqbPNCkpyMxnbuvT9xu`, READY và đã promote; domain ổn định trả đúng artifact đã duyệt. QA sạch do chủ sản phẩm tạo trên gói trả phí; chỉ tiếp tục backend/cutover khi chủ sản phẩm báo hoàn thành. **Chưa nghiệm thu Oracle hoặc toàn ứng dụng cho MVP.** Báo cáo này bổ sung [audit 43 vấn đề](../admin-configure/report.vi.md), không thay đổi bằng chứng lịch sử.

## Phần đã triển khai

- Prompt/Model editor lên đầu; Workflow thu gọn; sidebar laptop 1024 giữ cột hẹp. Model form dùng một nguồn; catalog/JSON nằm trong disclosure. Brand dùng nguồn Open Reflection và font đã duyệt.
- Modal giữ feature/section/locale/target/payload đã review, tiếp tục chặn thay đổi sau các bước await; hỗ trợ Tab trap, Escape, inert và trả focus. Không confirm publish trong lần kiểm thử này.
- URL giữ feature/section/locale giữa shell và iframe, hỗ trợ Back và Trace Explorer. Message chỉ nhận same-origin và đúng iframe, không đưa sample/prompt/token vào URL.
- Admin preview và Oracle backend source candidate dùng một compiler Core → Feature → Locale → Tone. Generator đóng gói sáu file; kiểm exact bytes, version lock và checksum. Hosted build dừng nếu compiler hoặc manifest lệch.
- Preview chỉ nhận ví dụ giả trong RAM; VI/EN thay locale overlay, core/feature dùng chung. Không gọi LLM, không lưu sample, không phát hành bundle. `providerReady=false`, token `not-assessed`; 2.000 là trần chính sách, không phải token đã đo.
- Nghiệm thu cuối phát hiện lỗi mới: compile EN → Content → mở URL Oracle VI vẫn giữ kết quả EN dưới control VI. Revision 2 gắn kết quả với feature/locale/tone/question, xóa kết quả và lỗi khi input thay đổi qua controls hoặc URL/shell. Render không tự compile; phải bấm Compile lại. Question giả vẫn chỉ ở RAM. Có regression và review độc lập; revision 1 được giữ làm bằng chứng, đã được thay thế trên staging.
- Oracle candidate xác thực trước bounded JSON, validate locale/shape/tone, tách question/history/context khỏi system. Chỉ dùng profile/history khi caller gửi opt-in tương ứng; không đưa Journal/birth vào compiler. Consent request chưa là quyền đã xác minh trên server.
- Crisis support tĩnh chạy trước compiler/provider/quota, không Tarot/Council handoff. Review độc lập đã bổ sung các câu imminent-action và thành ngữ. Detector vẫn có giới hạn; không phải moderation toàn diện. Telemetry chỉ có enum/count/version/hash, ACK giới hạn 250 ms và trả `unconfirmed` khi chưa rõ kết quả.
- Model Router source candidate chỉ chọn một active; experimental không đi vào traffic thường. Lookup thiếu/lỗi vẫn giữ fallback mặc định theo contract cũ; chưa hoàn thiện route/schema/cost activation gate.
- Skill `nilaza-plan-qc` 1.5.1 bổ sung truy vết configure→consumer, immutable snapshot/CAS, privacy epoch, tokenizer/locale và tám lớp đồng bộ; cập nhật thêm preview gắn đúng input/bundle revision, invalidation qua mọi navigation và explicit Compile. Nguồn repository đã cài trên máy và `skills:check` đạt; bốn skill khác được xác nhận còn phù hợp.

## Đối chiếu với audit

| Vấn đề | Kết quả trong lát cắt | Việc còn lại / nghiệm thu |
| --- | --- | --- |
| C25/C28: editor dưới fold, sidebar laptop rộng | Editor-first, Workflow disclosure và sidebar hẹp đã triển khai, kiểm trực tiếp 1024 | Các form dài vẫn cần cuộn; kiểm zoom/screen reader đầy đủ trước phát hành |
| C27: Model có nhiều form | Một form điều khiển; catalog/JSON chỉ tham chiếu | Astrology/Persona context chưa dùng chung assembler; không đóng toàn bộ C27 |
| C26: URL không giữ state | Feature/section/locale và Trace route, Back, source-frame guard đã có | Browser draft vẫn khác origin/account; không dùng URL để chuyển nội dung riêng |
| C29/C30: modal/bàn phím | Tab→Publish→Close, Escape và return focus kiểm trực tiếp; labels/focus regression đạt | Screen reader và reflow 200% chưa nghiệm thu toàn bộ; buttons của role không có quyền còn C31 |
| C38: modal khó đọc | Padding/min-height, wrap và nền đục sửa từ ảnh kiểm thử | Chưa có diff active→candidate theo từng field hoặc restore UI |
| C05: active/experimental | Backend candidate active-only + phát hiện cạnh tranh; Admin cần cùng baseline và chặn ambiguity | Cloud runtime cũ giữ nguyên; chưa có experimental QA lane chính thức |
| C11/C12: Oracle prompt/context không khớp | Admin và backend candidate dùng cùng compiler; có provenance/consent/count | Chưa publish bundle, tokenizer/quota/provider/eval; mobile chưa gửi consent profile/history |
| C15: crisis | Candidate có support tĩnh và regression VI/EN | **P0: offline/mobile vẫn detector cũ**; cần chung safety adapter và kiểm app thật |
| C06: draft nhầm target | UI nói rõ legacy/browser; route/prompt draft không bị clear lẫn | Còn namespace project+account+module+locale, base revision, migration/rebase và cảnh báo storage |
| C01/C02/C03/C08/C19: Council | Giữ GET/read-only và chặn POST từ UI để tránh ghi đè template | Hydrate đủ contract, bilingual overlay, atomic transaction/CAS/idempotency/audit và consumer cho từng field |
| C10/C18/C22/C23: publish/history/audit | Giữ snapshot safeguards, source/target rõ | Roundtrip full policy, immutable revisions, exact readback, structured diff, clone/restore và audit chung |
| C13/C20/C21: Persona/Astrology | Giữ contract hiện có; chưa tuyên bố chung prompt cho các feature khác | Persona enum tone/data-role boundary, approved-source retrieval, một editor Astrology, link Content revision |
| C14/C16/C17: eval/schema/quota | Candidate fail closed; preview/mock không thành quality pass | Tokenizer đúng model, durable quota/receipt/refund, schema mọi feature, real-model VI/EN eval, đo latency/cost |
| C24/C31/C35/C37/C39 | Nhãn candidate/health giới hạn, brand cập nhật | UI locale thống nhất, capability-aware controls, Face roadmap-only, checking-access, status icons đúng trạng thái |
| C32/C33/C34/C36 và publish/reveal races đã sửa trước | Regression giữ đạt; README bỏ demo password và migration ID cũ | Chỉ đóng cloud parity sau đối chiếu deployment; không suy từ unit tests |

Các vấn đề ngoài lát cắt giữ nguyên mức độ/giải pháp/tiêu chí trong audit. Không coi chúng là đã giải quyết bằng việc deploy giao diện.

## Tám lớp đồng bộ và lý do chưa đồng bộ

| Lớp | Trạng thái / khác biệt | Lý do, ảnh hưởng và bước tiếp |
| --- | --- | --- |
| Local ↔ Admin hosted | Bản nguồn được đóng gói riêng và kiểm checksum; deployment/alias/remote parity được ghi trong `admin-deployment.json` | Không upload cả working tree đang có nhiều thay đổi. Build-time config/HTML khác local; phải kiểm target và bytes JS/CSS/compiler riêng |
| Canonical ↔ packaged consumers | Sáu file Admin/Edge khớp exact bytes; immutable bundle `2026-10-03.preview.1` | Bản Edge chỉ mới ở source; đóng gói không đồng nghĩa deployed hoặc provider đang dùng |
| Backend functions/config | Oracle và active-only router đã sửa local; old QA functions/active rows chưa đổi | QA cũ giữ bằng chứng. Chờ QA sạch và bootstrap; cần deploy đúng revision, protected readback và request trace. Frontend deploy không thay Edge/config |
| Database/content | Admin đọc published Content v4 ở QA cũ; không apply schema/seed hoặc chuyển project | Lần create Free bị giới hạn hai active project. User tạo project trả phí; ledger foreign MCY vẫn blocked cho QA cũ. Không db push/repair/import MCY |
| Browser draft/session | Localhost và domain hosted có storage/cookies riêng; AI legacy key chưa scope theo project/account | Không có transfer tự động, không sao chép token. Cần draft namespace + base-version/rebase và import/export được review; Content versioned cloud path là cơ chế riêng |
| Native/mobile | Binary, offline detector và client payload/UI chưa đổi | Admin/web refresh không cập nhật APK/IPA. Mobile chưa gửi consent profile/history, tới12 turns thay cap8; chưa giữ readiness/provenance. Cần mobile slice + device acceptance |
| Development skills | Repository ↔ installed local đạt parity; online Admin không chứa skills | Skills là hướng dẫn của agent trên máy, không runtime của ứng dụng. Máy/agent environment khác cần cài từ nguồn reviewed và kiểm drift riêng |
| Public/internal docs và static seed | README/protocol local cập nhật; internal report/skills/QA evidence không upload vào Admin | UI auth không bảo vệ file static. Packaged prompt chỉ là generic non-confidential preview seed; private prompt/customer data cần endpoint bảo vệ. Owner Guide backend và website Help/legal có phát hành riêng |

## Kiểm thử và bằng chứng

Admin check đạt 3 workspaces/27 capabilities; Admin suite cuối **111/111**, gồm route ambiguity/nền modal và invalidation preview sau URL/shell; renderer/shell53/53 là subset. Compiler18/18; consumer/hosted integrity5/5; feature-run9/9; Oracle65/65; Deno handler/guard/router42/42 và factory/auth9/9. Review độc lập recheck70/70 (Oracle65 + consumer5), rồi recheck4/4 targeted cho revision 2. Governance22 agents/6lanes, repository skills5/5 và installed parity đạt. Không cộng các lần retest thành số test độc lập.

Supabase readiness72 pass/9warn/0fail là kiểm artifact, không phải cloud acceptance. Ledger checker exit0 nhưng trạng thái vẫn blocked. `skill-creator quick_validate.py` chưa chạy được vì runtime Python hiện có thiếu PyYAML; validator nguồn/manifest/drift của repository đã chạy, không tự cài dependency thay thế.

Browser Owner local: PreviewVI/EN có đúng locale module; Model giữ route/backend target thật; Tab trap/Escape/return focus đạt; Content đọc publishedv4 (17personas,7decks,546cards); Growth vẫn mở đúng snapshot. Ảnh01–05 tại `screenshots/`; ảnh06 là modal final đã reload, computed background `rgb(21,20,22)` đục; ảnh03 giữ làm bằng chứng trước sửa. Tab mở sẵn giữ stylesheet đã tải cho tới reload; thay source không tự cập nhật CSS trong document đang sống.

Online revision 2: artifact58file/1.543.836byte, SHA-256 `b24b84d1c0ca97fd36d78d742d267d7b59d817d3e7c76faa7e379e6e89c884de`. Đây là dung lượng source được đóng gói, không phải tải trang hay số đo performance. Trước và sau promote đã tải lại9path JS/CSS/compiler/content và kiểm exactSHA; path config thứ10 xác nhận đúng QA cũ và public key. Build kiểm manifest/provenance; domain ổn định resolve đúng deployment ID. Người dùng đăng nhập Owner trên domain này; ảnh07–08 giữ bằng chứng preview VI/EN và Content publishedv4 (17personas/7decks/546cards) của revision 1. History thao tác hiển thị khác local vì cache mỗi origin; bản content cloud cùng revision. Không reveal raw payload, không POST config, không gọi provider hoặc tính điểm chất lượng giả.

Browser revision 2 đã kiểm đúng chuỗi từng gây lỗi trên domain ổn định: bấm Compile EN thấy `nilaza-locale-en` → mở Content thấy publishedv4 và các counts trên → mở URL Oracle VI thấy selector VI, output cũ biến mất và trạng thái chưa compile (ảnh09) → bấm Compile mới thấy `nilaza-locale-vi` (ảnh10). Local cũng kiểm đổi URL EN→VI xóa output. Đây là nghiệm thu preview/điều hướng, chưa phải nghiệm thu câu trả lời LLM. Preflight cuối đạt sau khi sync reference skill1.5.1; lần kiểm trước đó báo drift đúng vì installed còn1.5.0, không bị bỏ qua hoặc thay đổi gate.

Bằng chứng revision 2: `admin-artifact-manifest-v2.json`, `admin-deployment-v2.json`, `admin-reviewed-parity-v2.json`, `admin-stable-parity-v2.json`; `admin-deployment.json` trỏ bản hiện hành. `validation.json`, `backend-validation.json`, `clean-qa-provision.json` mô tả gate và giới hạn. Các file revision 1 giữ nguyên. Vercel connector có lỗi wrapper parameter `projectId/idOrName`; dùng CLI chính thức đã cài/auth để hoàn tất, không đọc token hoặc giảm protection. Bản trước task: `dpl_9B7rPsmy3dbdSPSiNMVxm7kt86gy`; revision 1 `dpl_3tYRg3fr9HhYPnqpnTrxsni22am3` có lỗi preview nêu trên, không chọn rollback mà bỏ qua lỗi này.

## Điều kiện tiếp tục MVP

1. **Mobile/safety trước:** một detector/support contract cho offline và backend; crisis không action/handoff; lưu/load/hiển thị turn trạng thái thật, history đúng session và opt-in rõ. Test VI/EN cả online, timeout và offline trên thiết bị.
2. **QA sạch:** xác minh project user tạo, replay Nilaza-only bootstrap được duyệt; RLS hai account, owner capabilities, seed/readback, storage/retention; secrets server và public env tách biệt. Giữ QA cũ làm bằng chứng.
3. **AI chạy thật có kiểm soát:** tokenizer đúng model, reservation/idempotency/receipt/refund; Tarot1/ngày, Chat+Oracle5 chung/ngày, QA5USD/ngày, campaign50USD/14ngày và eval10USD trong campaign. Test lỗi không mất lượt, concurrency không vượt trần, crisis không quota.
4. **Configure publish tới runtime:** atomic pinned bundle, full hydrate/diff/CAS/audit/readback/restore; field unsupported read-only có lý do. Một thay đổi thật phải xuất hiện trong request trace đúng version/hash.
5. **Chất lượng/UI:** eval câu hỏi và follow-up của khách hàng mục tiêu VI/EN, an toàn/grounding/latency/cost thực; manager happy path mobile và Admin, keyboard/zoom/screen reader, lifecycle save/reopen/delete và bản native đúng artifact.

Agent hiện có đủ để tiếp tục các lane Admin, backend, mobile và PlanQC; chưa cần tạo agent mới chỉ để đổi tên công việc. Backend/DB acceptance cần project/owner-authority cụ thể, không suy từ tên agent. Website/public Help, paid beta, store/native release và các feature ngoài phạm vi có gate riêng.

Rollback: frontend có previous deployment ID trong evidence để promote lại khi cần; source rollback chỉ delta của task và giữ pre-edit backups. Database/config không bị ghi trong lần này. Không mở lại unmetered provider để vượt gate.
