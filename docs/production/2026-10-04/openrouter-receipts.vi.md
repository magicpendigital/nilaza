# OpenRouter receipt — W08a

Ngày 04-10-2026. Đã tích hợp source local, chưa deploy và chưa nghiệm thu live. Phần này chuẩn bị dữ liệu chi phí; chưa hoàn thành toàn bộ operation/quota/ledger của W08.

## Đã thay đổi

- Adapter giữ `usage.cost` thành `costUsd`, tách `upstreamInferenceCostUsd`, generation ID, HTTP request ID, resolved model, input/output/total tokens, cached/cache-write/reasoning tokens.
- Mỗi attempt có receipt riêng, kể cả lỗi HTTP, output không hợp lệ hoặc output bị safety chặn. Router giữ configured model và `resolvedModel` riêng; receipt không bị thay bằng receipt của lần fallback.
- Thiếu/invalid cost có `costUsd=null`; có generation ID thì `pending_reconciliation`, không có ID thì `unavailable`. Chỉ số0 được nhà cung cấp trả rõ mới là cost0. Đã báo chi phí nhưng thiếu generation ID vẫn không được dùng để settle operation.
- Lỗi response trace hook sau dispatch giữ receipt, trả lỗi an toàn và không kích hoạt paid fallback, kể cả route khai báo mã lỗi đó. Không lưu nguyên message exception của hook vào metadata.
- Helper lookup dùng GET cố định `/generation?id=...`, kiểm tra đúng ID trả về, nhận `total_cost`, model, upstream provider/request và token metadata. Timeout mặc định2,5giây, tối đa5giây, không follow redirect, không retry hay gọi completion. Lookup lỗi giữ receipt đã biết cùng mã lỗi; không đổi thành0.
- Bridge `openRouterReceiptCostMicro` chỉ nhận receipt reported đúng schema/source/provider có generation ID và cost hợp lệ; làm tròn lên micro-USD để giữ reservation thận trọng. Giá trị USD gốc còn nguyên. Không dùng bridge với JSON do client gửi lên.

Theo [OpenRouter usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting), charge tài khoản và upstream inference cost khác nhau; usage hiện được trả tự động. Tra cứu metadata theo generation ID có thể dùng để đối soát sau request. [Generation API](https://openrouter.ai/docs/api/api-reference/generations/get-generation) cung cấp `total_cost` và metadata provider/model; upstream cost0/null không chứng minh tài khoản được miễn phí. Tài liệu primary được kiểm tra ngày04-10-2026; không thêm parameter usage deprecated.

OpenRouter mô tả credit được định giá theo USD trong [billing support](https://openrouter.ai/support/), và xác nhận `usage.cost` là USD trong [cost/quality framework](https://openrouter.ai/blog/insights/cost-vs-quality-tradeoff-framework-for-agent-models/). Receipt ghi USD của inference request; phí nạp credit và các khoản invoice khác phải đối chiếu riêng, không cộng nhầm thành token cost. Hướng dẫn usage chuyên biệt được dùng cho parameter hiện hành; không lấy parameter include deprecated trong FAQ cũ.

## Dữ liệu đi đâu

```text
Completion response (server)
  -> OpenRouterBillingReceipt v1
  -> ModelProviderResponse hoặc ModelProviderError
  -> ModelGenerationResult.attempts[n].billingReceipt
  -> existing sanitizeProviderMetadata
  -> existing usage_events/result metadata và API metadata nơi endpoint sử dụng

Trace generation span
  -> generation_id, billing_status, billing_source, charged_usd,
     upstream_inference_cost_usd, resolved_model và numeric counts

Explicit server lookup (chưa có worker gọi)
  -> receipt cập nhật hoặc reconciliationError
  -> cần ledger/worker của slice tiếp theo để lưu và settle bền vững
```

Không dùng `requestId` thay generation ID khi header thiếu. `upstreamRequestId` là identity phía provider upstream, không phải generation ID. Các trường receipt chỉ được chọn từ metadata billing, không chứa prompt/chat/journal/birth data hoặc API key. Raw QA capture không được bật thêm; policy retention và quyền cũ giữ nguyên.

Việc giữ optional fields trong server response tương thích với consumer hiện tại, nhưng bản online chưa có code này. Existing endpoint có thể ghi receipt trong metadata theo luồng cũ; persistence đó vẫn best-effort và một số RLS còn cho client tạo metadata. Vì vậy nó **chưa phải ledger server-owned đáng tin cậy** cho billing/quota.

## Chưa hoàn thành, điều kiện mở tiếp

| Hạng mục | Trạng thái và lý do | Phương án tiếp theo |
|---|---|---|
| Receipt bền vững, unique generation ID, settle atomic | Chưa có bảng/transaction tích hợp production; không thể tin metadata client ghi hoặc trace sampled | Backend authority/operation + receipt table private, service-only writes, unique provider/generation ID, CAS/lease, result link |
| Reconciliation worker | Helper đã có, không có scheduler/lease/retry/backoff/TTL/audit đang chạy | Worker theo operation, không retry generation khi ACK chưa rõ; lookup idempotent, phát hiện receipt cost conflict |
| Primary/fallback đều OpenRouter | Published/default routes vẫn trộn direct vendors, free/auto chưa có bounds production | Chọn model/upstream allowlist, enforce price/token/privacy bounds và đổi route qua đúng Admin publish sau QA |
| Admin actual cost dashboard | UI/aggregation hiện tại chưa đọc ledger mới; không đổi nhãn estimate thành actual | Hiển thị known charge, unresolved count/reservation, missing generation ID, tất cả attempts và kỳ đối soát |
| Production ngân sách tổng | Chưa benchmark actual cost theo feature/locale, chưa có hard cap production riêng | Benchmark synthetic trong cap test đã duyệt, chốt daily/monthly cap; QA5USD/50USD không tự trở thành production cap |
| Authenticated staging E2E và deployment | Chưa deploy source này; QA ledger cũ vẫn blocked, target mới chưa có | Release candidate/hash + target/gates; test success, malformed/safety/fallback, unknown bill và lost ACK trên backend thật |

Không cộng chỉ final attempt để báo tổng chi phí. Không settle cùng generation ID hai lần. `reported` có nghĩa đã có số charge từ provider, không tự có nghĩa đã đối soát, persist thành công hoặc khách hàng đã đọc câu trả lời. Các route trực tiếp không có OpenRouter receipt; chưa migrate routes thì không coi tổng receipt là toàn bộ AI spend.

## Kiểm thử và rollback

```powershell
node_modules/.bin/deno test --no-lock --cached-only --allow-env supabase/functions/_shared/model-provider.test.ts supabase/functions/_shared/providers/openrouter-billing.test.ts
```

Dùng mock fetch và nội dung fictional, không quyền network, không key thật. Có test malformed output đã tính phí, HTTP failure, safety block, fallback hai receipt, transport unknown, lookup mismatched/invalid/missing ID/key/timeout và trace failure sau dispatch. Contract cũ của bốn adapter, active route lookup và deferred trace cũng được chạy.

Default Deno run vướng quyền ghi lockfile; `--frozen` phát hiện root lock lệch do dependencies mobile Expo ngoài scope. Lệnh trên dùng cache có sẵn và không dùng/ghi lockfile, không tải/install dependency; Deno2.9.0, TypeScript6.0.3. Đây là bằng chứng test code local, không phải chứng nhận dependency lock hoặc build production.

Rollback revert optional type/adapter/router/helper trong scope W08a; không revert SQL hoặc dữ liệu cloud. Giữ receipt đã lưu nếu lần triển khai sau cần revert code; quyền, retention và công cụ đối soát của ledger phải có trong slice triển khai ledger riêng.
