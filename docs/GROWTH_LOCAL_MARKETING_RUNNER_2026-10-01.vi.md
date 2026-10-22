# Phòng marketing AI Nilaza — runner nội bộ cục bộ

Ngày: 01/10/2026. Phạm vi: research → strategy → creative → QA độc lập → Owner review. Module bổ sung cho Growth Operations hiện có; không triển khai Admin, Supabase, email hoặc kênh marketing bên ngoài.

## Mô hình vận hành

Giữ tám role canonical tại `packages/growth-core/config/growth-agent-catalog.json`:

| Nhóm công việc | Role | Đầu ra và trách nhiệm |
| --- | --- | --- |
| Điều phối | `growth_orchestrator` | Job có input hash, key idempotency, nhật ký trạng thái, giới hạn retry và human gate |
| Nghiên cứu/chiến lược | `research_jtbd`, `product_truth_claim_guard`, `positioning_experiment` | Facts/hypotheses tách riêng; claim từ ProductTruth, evidence và đích hợp lệ; phương án thử nghiệm chưa có kết quả |
| Content studio | `content_studio` | Copy VI/EN, ba slide, caption/alt text; bản nháp nội bộ |
| Chất lượng | `independent_qa` | Reviewer khác tác giả; kiểm copy/brand/privacy/IP/accessibility, bind candidate, creative bytes và nguồn/rubric |
| Journey/learning | `distribution_planner`, `journey_measurement` | Gói nội dung để review; định nghĩa KPI và khoảng trống đo lường, không gửi/đăng hoặc tạo số liệu |

Pilot dùng một phiên AI thực cho research → strategy → content; QA dùng phiên khác. Runtime tiếp nhận handback do operator chứng thực, render cục bộ và lưu bằng chứng. Đây không phải adapter tự gọi model theo lịch. Danh tính ghi là `operator_attested_local_session_provenance`, không phải xác thực phía server. Provider, model/cost chính xác và unattended dispatch chưa được cấu hình; không khai chi phí bằng 0 khi không biết.

## Phạm vi kỹ thuật

- Module: `packages/growth-runtime/`; CLI: `scripts/growth-local-run.mjs`.
- Claims/briefs/config chỉ được đọc qua builder hiện có; không sửa 6 briefs/12 concepts hoặc snapshot Admin.
- Store mặc định: `.local/growth-runtime/store`, ngoài đường dẫn static Admin; không commit store.
- Candidate giữ `draft_internal` bất biến. Job state, QA và review nằm trong sidecar; không đổi bytes đã được chấm.
- Receipt cục bộ không phải receipt thực thi kênh. Không có action publish/send/deploy/spend, credential access, database mutation hoặc quota/billing/ads integration.
- Same key + same inputs trả lại job; input thay đổi không reuse kết quả cũ. Output/nguồn/rubric thay đổi làm QA mất hiệu lực. Retry render bị giới hạn; crash cần reconciliation, không bịa model call hoặc QA.
- Intake/packet có giới hạn kích thước và schema; loại dữ liệu nhạy cảm, contact, secret, foreign tenant và command/URL/path injection trước khi lưu. Lỗi dùng mã an toàn.

## Hướng kinh doanh mới

Freemium với ví dụ **1 Tarot + 3 AI Guide/ngày**, **99.000đ hoặc 129.000đ/tháng**, ads trong Free sau khi app hoạt động và paid có thể ad-free là **phương án tương lai do Owner đưa ra**. Chưa phải offer, entitlement, quota server, SKU hoặc tính năng tích hợp. Các lựa chọn nằm trong strategy nội bộ, không thành lời hứa creative hay sửa ProductTruth.

## Manager test path

Từ `D:\nilaza`:

```powershell
node scripts/growth-local-run.mjs help
node scripts/growth-local-run.mjs prepare --job nilaza-pilot-20261001 --brief B01_open_question --key nilaza-b01-pilot-20261001
node scripts/growth-local-run.mjs import-author --job nilaza-pilot-20261001 --packet <author-packet.json> --agent <author-agent-id> --session <author-run-ref> --root-thread <root-thread-id>
node scripts/growth-local-run.mjs render --job nilaza-pilot-20261001
node scripts/growth-local-run.mjs inspect --job nilaza-pilot-20261001
```

Reviewer phải đọc artifact thực sau render, cả VI/EN và nguồn/rubric. Verdict dùng schema canonical `qa-verdict`; operator nhập verdict cùng provenance độc lập và hash:

```powershell
node scripts/growth-local-run.mjs submit-qa --job nilaza-pilot-20261001 --packet <qa-verdict.json> --agent <independent-reviewer-id> --session <qa-run-ref> --root-thread <root-thread-id> --bundle-hash <creativeBundleHash> --input-hash <inputFingerprint>
node scripts/growth-local-run.mjs inspect --job nilaza-pilot-20261001
```

Mở `review.html` trong bundle job ghi nhận; xem sáu PNG 1080×1350, caption, alt text, research/strategy và receipts. Kiểm tra QA đúng version/hash, source mode actual handback và trạng thái chờ Owner. Preview tự nó không chứng minh job/QA đạt; dùng `inspect` kiểm trạng thái hiện tại. Không ghi quyết định Owner thay người dùng.

## KPI và quality gate

Gate canonical: 0 hard fail; đủ 9 soft dimensions, mỗi điểm ≥3, trung bình ≥3,25; tối đa 2 repair cycles. QA không cấp quyền xuất bản. Chấp nhận nội bộ của Owner vẫn không tạo channel authority.

Số job/render/retry/QA chỉ đo vận hành. Activation, retention, attribution, meaningful value day và hiệu quả doanh thu chưa có baseline live đáng tin; `definition_only`/`not_collected`/`synthetic_only` không chuyển thành số 0 hoặc learning thật.

## Validation và rollback

Chạy preflight `docs/feature-plans/growth-local-marketing-runtime-2026-10-01.json`, behavioral tests riêng, Growth, governance và brand validation. Fixtures vẫn là fixture, không chứng minh AI pilot thực. Không gọi Admin generator/dev server thuộc tác vụ deploy khác.

Rollback bằng cách ngừng CLI và gỡ riêng module/new scripts/store sau review. Không có database/account/published campaign/app release cần hoàn nguyên. Admin mounting và unattended adapter là bước phối hợp riêng sau khi writer hiện tại bàn giao.

Skill review: `nilaza-plan-qc` và `nilaza-brand-experience` vẫn áp dụng: preflight, nguồn đã chọn lọc, brand manifest/hash, kiểm render và human gate. Không đổi skill hay chính sách repo trong slice này.
