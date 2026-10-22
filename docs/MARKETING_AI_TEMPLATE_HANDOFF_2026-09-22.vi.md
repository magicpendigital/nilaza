# Bàn giao Template Phòng Marketing AI

Phiên bản 1.0 · 22/09/2026 · Trạng thái: đã publish private tại `magicpendigital/ai-marketing-department`, tag `v0.1.0`

## Kết quả đã bàn giao

Template portable nằm tại `artifacts/growth-framework-template-v1`. Đây là một Git worktree độc lập với Nilaza; export chỉ dùng allow-list và không mang theo BrandPack, ProductTruth, creative, khách hàng, credentials, analytics, prompt hay lịch sử vận hành của Nilaza.

Template cung cấp cùng năng lực Sprint 01 cho mỗi business sau khi hoàn thành W0:

| Năng lực | Workflow | Kết quả nội bộ |
| --- | --- | --- |
| Thiết lập ranh giới vận hành | W0 Readiness | tenant config, ProductTruth, consent/data map, journey map, capability matrix, risk/owner record |
| Nghiên cứu và định vị | W1 Research to plan | nguồn đã duyệt, giả thuyết JTBD, brief và measurement plan |
| Sản xuất nội dung có kiểm soát | W2 Content factory | concept, copy/asset package, lint, QA độc lập gắn với tenant/asset/version/SHA-256 và human-review handoff |
| Rút kinh nghiệm | W6 Learning to product | LearningExport aggregate được kiểm tra riêng theo tenant, comparator hai tenant và learning note/product-ticket draft |

Nó cũng gồm 8 skills, topology cho agent/sub-agent, workflow/sub-workflow contracts, schemas, quality gates, 19-file tenant scaffold, GitHub Actions quality check, hướng dẫn mới cho Business B, artifact examples dương/từ chối, cùng công cụ khởi tạo/kiểm tra tenant.

## Ranh giới phiên bản 1.0

Template chỉ vận hành ở `draft-only`. Nó không tự gọi model provider, không giữ API key, không publish/schedule/send, không kết nối OAuth, không tạo ad account, không upload audience và không chi ngân sách. `tenant:job:prepare` chỉ tạo manifest nội bộ không chứa secret để một runtime do owner của tenant cấu hình riêng sử dụng sau này.

Đây là ranh giới chủ đích để hai business có thể cùng dùng framework mà không dùng chung dữ liệu hoặc có external action vượt qua human gate. E1, E2 và E3 vẫn là các giai đoạn sau: public-material approval, controlled publishing và paid media có budget/attribution/kill switch.

## Kiểm chứng đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run growth:validate:portable` | Pass |
| `npm run growth:test:portable` | 10/10 pass |
| `npm run growth:tenant:test` | 34/34 pass |
| `npm run growth:tenant:learning:demo` | Pass; chỉ so sánh aggregate, de-identified export của hai tenant synthetic |
| `npm run growth:validate` | Pass, 17 adversarial fixtures |
| `npm run growth:test` | 7/7 pass |
| `npm run validate:governance` | Pass |
| Clean-room `npm run validate` | Pass |
| Clean-room `npm test` | 43 pass; 1 source-boundary-only test skip đúng chủ đích |
| Clean-room `tenant:demo:validate`, `tenant:two:validate` và `tenant:learning:demo` | Pass |
| Fresh `tenant:init` + `tenant:validate --allow-incomplete` | Pass; scaffold chỉ tạo placeholder generic và giữ W0 blocked |

## Cách Business B bắt đầu

1. Clone đúng release/tag của repository template và chạy `npm install`, `npm run validate`, `npm test`.
2. Khởi tạo workspace private của Business B bằng `npm run tenant:init -- --tenant <slug> --output <private-directory>`.
3. Điền 19 artifact W0 từ facts, evidence và owner của chính Business B; không copy dữ liệu từ Nilaza.
4. Chạy `tenant:validate` đến khi trạng thái là `ready_for_internal_drafts`.
5. Chạy W1, W2, independent QA và W6 theo `docs/START_HERE.md`; dùng `tenant:artifact:validate` trước human editorial review và chỉ dùng `tenant:learning:compare` cho LearningExport aggregate đã qua privacy gate.

## Chuyển GitHub

Repository đã publish private: `https://github.com/magicpendigital/ai-marketing-department`.

- `main`: commit `56d77e4` — `feat: add draft-only AI marketing framework template`.
- `v0.1.0`: Sprint 01 draft-only baseline để tenant pin khi adopt.
- GitHub Actions `Framework Quality #1`: completed successfully.

Remote chỉ nhận artifact từ `artifacts/growth-framework-template-v1`; không nhận file A1/A2 hay bất kỳ dữ liệu Nilaza nào. `LICENSE_DECISION.md` vẫn mặc định all-rights-reserved cho đến khi owner chọn license, và `CODEOWNERS` cần được thay placeholder trước khi bật branch protection.
