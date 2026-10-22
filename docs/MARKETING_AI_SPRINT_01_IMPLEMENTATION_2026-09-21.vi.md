# Sprint Marketing AI 01 — nền ProductTruth, content QA và tenant isolation

> Phạm vi triển khai lịch sử ngày 21/09. Phần “No Admin UI change” mô tả Sprint 01 ban đầu; đã được tiếp nối bằng [Growth Operations sync 30/09](GROWTH_OPERATIONS_HANDOFF_2026-09-30.vi.md). ProductTruth và draft nay tham chiếu bằng chứng mới; trạng thái nội bộ/draft-only và các cổng thực thi vẫn được giữ.

Phiên bản 1.0 · 21/09/2026 · **Được owner phê duyệt triển khai B0/B1**

Kế hoạch thực thi này cụ thể hóa B0/B1 trong [kế hoạch vận hành pilot Marketing AI](B_PARALLEL_MARKETING_PILOT_EXECUTION_PLAN_2026-09-21.vi.md). Sprint không phát hành marketing ra ngoài; mục tiêu là tạo một vertical slice nội bộ có thể đánh giá bằng dữ liệu/config/validator thay vì bằng lời hứa.

## Mục tiêu và acceptance criteria

1. Có ba phân vùng rõ ràng: `packages/growth-contracts` và `packages/growth-core` trung lập; `packages/growth-fixtures` tổng hợp; `packages/growth-nilaza` chỉ dành cho Nilaza.
2. Core định nghĩa rõ 8 agent roles, bốn workflow đang triển khai là W0/W1/W2/W6, ProductTruth, claim gate, concept/copy contract, measurement boundary, quality gate và extraction manifest. W3/W4/W5 được khai báo là deferred.
3. Nilaza có 12 content package VI/EN ở trạng thái `draft_internal`, gắn ProductTruth/claim ID, evidence status, locale, CTA, QA status và điều kiện publish. Chúng không được coi là post/ad thật.
4. Có quality rubric cùng fixture đối kháng để chặn ít nhất: claim chưa có evidence, deterministic prediction, advice nhạy cảm, dữ liệu user nhạy cảm, locale thiếu, cross-tenant leakage và external readiness giả.
5. Có validator/test chạy cục bộ, tạo report minh bạch `framework_ready` khác với `external_marketing_ready`.
6. Có export manifest để sau này trích **core + tenant template** sang repository GitHub mới, mặc định loại trừ Nilaza tenant, artifact marketing thật, PII, secrets và mọi dữ liệu người dùng.

## Task lane, owner và handoff

```text
taskId: marketing-ai-sprint-01
ownerAgent: product_marketing_framework_agent
purpose: Build an internal, tenant-isolated marketing framework vertical slice for Nilaza.
writeScope: docs/MARKETING_AI_SPRINT_01_IMPLEMENTATION_2026-09-21.vi.md; docs/MARKETING_AI_SPRINT_01_QUALITY_GATE_2026-09-21.vi.md; packages/growth-contracts; packages/growth-core; packages/growth-fixtures; packages/growth-nilaza; scripts/validate-growth-pilot.mjs; scripts/growth-pilot-config.test.mjs; scripts/growth-framework-validator.mjs; scripts/validate-growth-framework.mjs; scripts/growth-framework.test.mjs; scripts/export-growth-framework.mjs; package.json
allowedDataClasses: public_brand_guidance, sanitized_product_claims, synthetic_test_data, aggregate_metric_definitions
validation: npm run growth:validate; npm run growth:test; npm run growth:validate:portable; npm run growth:test:portable; npm run growth:export:dry-run; npm run validate:governance; npm run validate:brand; git diff --check
stopCondition: Stop before external publication, messaging, account/OAuth setup, paid spend, provider secrets, raw user data, database migration, or GitHub repository creation/push.
```

## Whole-App Impact Brief

| Surface | Sprint 01 decision |
| --- | --- |
| Entry point | Internal package and manager-readable implementation handoff only. No mobile, web, social, email or ad entry point changes. |
| Data write | Versioned JSON/config and local test reports only. No AsyncStorage, Supabase, marketing waitlist, analytics event, migration or production write. |
| Backend contract | No endpoint, sender, queue, cron, OAuth or provider integration. Existing waitlist remains collection-only. |
| Canonical source | `packages/growth-contracts` owns portable data shapes; `packages/growth-core` owns generic agent/workflow/quality policy; each `packages/growth-<tenant>` owns only its own ProductTruth/content config. Existing Council contract and product-agent configs remain untouched. |
| Admin visibility | No Admin UI change. Sprint produces files suitable for a later read-only/review queue surface. |
| Privacy/safety | No personal data or secrets allowed. `birth_profile`, raw chart, raw chat/journal, face upload, email/phone and sensitive inference are forbidden by contract and test fixture. |
| Analytics | Defines metric/event boundaries only. It does not claim current event ingestion is live or alter the A1 draft event dictionary. |
| Rollback | Delete the new package/config files and root script entries; no remote or user data is affected. |
| Untouched surfaces | Mobile app, web app, Admin, Supabase schema/functions/secrets, public launch assets, active prompts, product agent contracts, email/push/social/ad accounts and GitHub remote state. |

## Implementation shape

```text
packages/growth-contracts/        # portable ProductTruth/asset/approval/learning shapes
packages/growth-core/             # portable agent/workflow/quality/KPI policy + export allow-list
packages/growth-fixtures/         # synthetic second-business onboarding template + adversarial fixtures
packages/growth-nilaza/           # Nilaza-only sanitized ProductTruth and internal drafts
scripts/
  validate-growth-pilot.mjs
  growth-pilot-config.test.mjs
  growth-framework-validator.mjs
  validate-growth-framework.mjs
  growth-framework.test.mjs
  export-growth-framework.mjs
```

## Quality gates for this sprint

| Gate | Pass condition | Does not prove |
| --- | --- | --- |
| Framework integrity | Contracts are applied to records, references resolve, clean-room export contains no Nilaza token, PII or credential-like data, and tenant-boundary negative tests pass | That any content is ready to publish |
| Content quality | Every draft is bilingual, follows brand/claim policy, has QA/review metadata and passes safe-copy lint | Product evidence or actual marketing conversion |
| Adversarial QA | Fixtures show deterministic, sensitive, missing-evidence and tenant-leak examples are blocked | Live platform-policy approval |
| Extraction safety | Export manifest excludes Nilaza config, private artifacts, credentials and data | Legal/license readiness for a public repository |
| External marketing readiness | Must be explicitly **blocked** until G-A2/G-A3/G-A4/G-A5/G-A6 and channel/consent gates provide evidence | Nothing in Sprint 01 can waive these dependencies |

## Manager test path

1. Run `npm run growth:validate` and see an integrity/quality report with external readiness blocked for the correct product gates.
2. Run `npm run growth:test`; verify it fails a deliberately altered claim, an injected sensitive term, a cross-tenant reference and a video without its storyboard/transcript.
3. Open `packages/growth-nilaza/content-drafts/sprint-01.json`; trace any draft to its ProductTruth claim and QA verdict.
4. Run `npm run growth:validate:portable`, `npm run growth:test:portable` and `npm run growth:export:dry-run`; confirm the clean-room output uses only the allow-list and has no tenant configuration.
5. Review the 12 draft packages against the Nilaza brand; approve/revise/block them as internal assets only.

## Validation and residual risk

Run: `npm run growth:validate`, `npm run growth:test`, `npm run validate:governance`, `npm run validate:brand`, and `git diff --check`.

Residual risks after a passing sprint: current ProductTruth is intentionally conservative while A2/A3/A4 evidence remains incomplete; no attribution ingestion, publishing adapter, lifecycle sender, paid account or real second business exists. A passing framework quality gate must never be reported as product launch or campaign readiness.

## GitHub extraction gate

GitHub creation/push remains a later action. It is eligible only after the validator reports framework quality pass, independent review has accepted the quality rubric, a real second-business onboarding conformance run is available, and the owner explicitly approves a concrete repository name, owner/organization, visibility, license and export manifest. The future repository must begin with generic core/template only. Nilaza tenant data and any real second-business tenant data stay in their respective private source repositories unless each owner separately approves export.
