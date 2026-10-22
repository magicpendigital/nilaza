# Hoàn thiện GitHub Template cho Phòng Marketing AI

Phiên bản 1.0 · 22/09/2026 · Trạng thái: đã publish private và xác nhận GitHub Actions

## Mục tiêu

Biến clean-room export hiện có thành một repository template mà một business AI mới có thể clone, chạy validation/test, khởi tạo tenant riêng và vận hành đúng năng lực Sprint 01 mà không kế thừa brand, ProductTruth, content, credentials hay dữ liệu của Nilaza.

“Năng lực tương đương” ở template này có nghĩa là: readiness, research planning, ProductTruth/claim control, content concept production, QA, journey measurement definitions, aggregate learning và extraction/isolation checks. Nó không có nghĩa business mới được tự publish, gửi lifecycle message, tạo ad account hay chi tiền.

## Acceptance criteria

1. Export có root README, setup/onboarding/operating/governance docs, GitHub hygiene files và license decision guide.
2. Có skills catalog, agent/sub-agent topology, workflows và subworkflows được liên kết với nhau và được validator kiểm tra.
3. `tenant:init` tạo tenant directory độc lập từ scaffold generic; không overwrite directory có dữ liệu.
4. `tenant:validate` phân biệt scaffold chưa hoàn thiện với một tenant demo đã hoàn thiện bằng config; chặn placeholder, PII/credential pattern, claim/evidence thiếu, identity-boundary leak và external action.
5. Export clean room chạy được `npm run validate`, `npm test`, `npm run tenant:init`, `tenant:demo:validate` và `tenant:two:validate` mà không chứa term Nilaza.
6. Có README hướng dẫn Business B đi từ clone tới draft-only W0/W1/W2/W6, nêu rõ human gate, data boundary và các điều kiện E1/E2/E3.
7. Không tạo OAuth/account, external publish, email, paid campaign, database write, customer data hoặc secret. GitHub transfer chỉ thực hiện vào repository do owner chỉ định.

## Task handoff

```text
taskId: marketing-ai-template-completion
lane: cross-cutting / skills / content / safety-privacy
ownerAgent: product_marketing_framework_agent
writeScope: docs/MARKETING_AI_TEMPLATE_COMPLETION_PLAN_2026-09-21.vi.md; packages/growth-core; packages/growth-contracts; packages/growth-fixtures; scripts/init-growth-tenant.mjs; scripts/validate-growth-tenant.mjs; scripts/*growth*test*.mjs; package.json
allowedDataClasses: generic_operating_guidance, synthetic_tenant_data, sanitized_contracts, aggregate_metric_definitions
validation: growth validation/tests; exported clean-room validation/tests; tenant init/validation test; skill quick validation; governance and diff check
stopCondition: stop before GitHub push, repository mutation, real tenant/customer configuration, external delivery, credentials, paid spend or remote data write
```

## Whole-App Impact Brief

| Khía cạnh | Quyết định |
| --- | --- |
| Entry point | Root README và `npm` commands trong export template; không thay mobile/web/Admin Nilaza. |
| Data write | Chỉ tạo JSON scaffold dưới output directory mà caller chỉ định; script fail nếu output đã tồn tại/không rỗng. Không có Supabase/analytics write. |
| Backend/channel | Không có endpoint, OAuth, sender, queue, scheduler hay ad adapter. Những năng lực này được mô tả là future gated. |
| Canonical contracts | `growth-contracts` và `growth-core/config` là nguồn chung; tenant chỉ điền config trong directory riêng của mình. |
| Admin visibility | Không thêm Admin UI. Root docs chỉ nêu manager review record cần có. |
| Privacy/safety | Không đưa PII, private content, raw UTM, prompt/trace, customer ID, secret hay brand của tenant khác vào template. |
| Analytics | Chỉ scaffold event definitions và aggregate LearningExport boundary; không khẳng định instrumentation đã chạy. |
| Rollback | Xóa local template export hoặc tenant scaffold chưa dùng; không có remote impact. |
| Surfaces không đụng | Nilaza mobile/web/Admin, Supabase, A2 contracts, production prompts, account/channel configuration và GitHub remote state. |

## Implementation lanes

1. **Portable operating model:** skills catalog, agent/sub-agent topology, workflows/subworkflows, readiness/approval policy.
2. **Tenant bootstrap:** safe initializer, scaffold, validator, synthetic completed demo and negative tests.
3. **Repository handoff:** root documents, `.gitignore`, CODEOWNERS placeholder, contribution and license-decision guide.
4. **Extraction proof:** export mapping, clean-room setup/test and source-tenant/PII scan.

## Manager test path

1. Run `npm run growth:export:dry-run` in Nilaza; it must remain source-tenant clean.
2. In the exported repository, run `npm run validate` and `npm test`.
3. Run `npm run tenant:init -- --tenant example-ai --output tenant-example`; confirm it creates only generic placeholders.
4. Run `npm run tenant:validate -- --tenant-root tenant-example`; it should explain which onboarding fields remain incomplete.
5. Review `docs/START_HERE.md`, complete a real Business B config in its private repo, then re-run `tenant:validate` before W0 begins.

## GitHub handoff state

Repository đích do owner cung cấp: `https://github.com/magicpendigital/ai-marketing-department`. Bản clean-room đã được chuyển bằng Git repository độc lập, không dùng working tree Nilaza: commit `56d77e4`, tag `v0.1.0`, private visibility. GitHub Actions `Framework Quality #1` đã completed successfully. `LICENSE_DECISION.md` trong template mặc định giữ quyền sở hữu cho đến khi owner chọn license.

Trước khi onboarding một Business B thực, owner của Business B phải cung cấp BrandPack, ProductTruth, market, activation definition, consent/data map và channel/incident ownership của chính business đó.
