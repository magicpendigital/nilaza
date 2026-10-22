# Kế hoạch triển khai từng lát: bậc Owner, giá thử nghiệm và Astrology AI

Ngày lập kế hoạch: 25/09/2026. Trạng thái cập nhật 27/09/2026: **UI Owner preview đã tích hợp; Astrology AI đang hoạt động trên Staging với route DeepSeek active, nhưng chưa xác nhận E2E trả lời và render trên app. Chưa cấu hình SKU hoặc giao dịch.**

## Mục tiêu và tiêu chí nghiệm thu

- Owner có thể chuyển giữa “Quyền tài khoản”, “Xem Free” và “Xem Premium” để kiểm tra nội dung/khóa trên các màn hình app.
- Bộ chọn chỉ hiện sau khi backend xác nhận role `owner`; capability `hub.read`, dữ liệu `user_metadata`, hay profile do app tự lưu không đủ.
- Chế độ giả lập chỉ tác động hiển thị: không đổi subscription, không phát sinh charge, không tăng credits, không gọi model tốn phí, không ghi event paid. Khi logout/account đổi, trở về “Quyền tài khoản”.
- Xóa claim `Yearly -40%` chưa có SKU. Giá 99.000đ/tháng và 799.000đ/năm chỉ được trình bày trong Owner review dưới nhãn “giả thuyết, chưa thu tiền”. Không hiển thị như offer đang bán cho người dùng.
- Câu chữ Astrology AI không hứa hội thoại nhiều lượt; nói rõ runtime mới chưa kết nối và lúc bật sẽ chỉ dùng fact đã chọn + câu hỏi hiện tại theo consent.
- AI runtime Staging chỉ bật sau khi forward migration riêng đã được Owner review/apply, report được gắn đúng auth user, entitlement/quota kiểm server-side và Admin route/prompt dùng contract v1. Migration ledger hiện vẫn chặn thao tác push/repair chung do một migration remote-only không liên quan; không gọi route legacy `ai-astrology-report` từ UI mới và chưa coi Staging là phát hành.

## Whole-App Impact Brief

| Vùng | Phạm vi tác động trong lát này |
| --- | --- |
| Entry/navigation | Profile → “Gói Premium & lượt dùng” chứa bộ chọn Owner; các tab Chat, Tarot và Astrology đọc cùng một tier view state. Không đổi bottom tabs hay deep links. |
| Data write | Tier view chỉ là state trong bộ nhớ của phiên account. Không ghi AsyncStorage, `subscriptions`, `credit_ledger`, report, Journal hay migration. |
| Backend contract | Chỉ đọc `get_admin_access()` hiện có để lấy `roles`; không thêm API, query user metadata hoặc tự cấp entitlement. Tạo hàm pure để phân giải tier UI. |
| Admin visibility | Không đổi Content Operations hoặc AI Studio ở lát 1. Admin không nhận raw question/birth data. |
| Privacy/safety | Mô phỏng không cấp quyền server và không mở model call; AI copy giữ ranh giới câu hiện tại, chart facts, caveat và self-reflection. |
| Analytics/observability | Không ghi event giả lập vào funnel/usage. Các thao tác xem UI không mang birth/chart/question fields. |
| Rollback/fallback | Mặc định về quyền account hiện tại là Free; không có backend thì Owner selector ẩn; revert UI state giữ logic Free hiện hữu. |
| Để nguyên | Không sửa schema/migration, db push/repair, RevenueCat/store SKU, provider secret, model route production, AI endpoint legacy, share/viral card, Tarot content, chart calculation. |

## File scope dự kiến

- `apps/mobile/src/features/owner/tierPreview.ts` và test: kiểu view state, fail-closed role check và quy tắc hiển thị Premium.
- `apps/mobile/App.tsx`: lấy role `owner` từ contract admin, đặt state theo account boundary, truyền view tier tới Profile/Chat/Tarot/astrology entry, chặn generation/deduction trong giả lập, sửa giá/copy preview.
- `apps/mobile/src/features/astrology/AstrologyAiGuidePanel.tsx` và `AstrologyChartStory.tsx`: thay lời hứa continuity và thông điệp runtime chưa live.
- `docs/NILAZA_PRICING_AI_QUALITY_STRATEGY_2026-09-25.vi.md`: cập nhật phần triển khai theo bằng chứng vừa đạt và gate còn lại.

## Kết quả lát UI Owner preview — 25/09/2026

- Đã thêm resolver UI thuần với test: role không phải `owner` luôn dùng tier của tài khoản; quyền xem nội dung Premium chỉ đổi trong bộ nhớ phiên Owner.
- Profile có ba chế độ “Quyền ứng dụng / Xem Free / Xem Premium”; banner luôn hiện khi giả lập và có nút thoát. AccountApp được remount theo account scope nên preview không chuyển sang user khác.
- Persona và Tarot dùng cùng resolver để đổi trạng thái khóa. Daily Insight, Zodiac Pulse, AI chat, Oracle, Council và tạo Tarot bị tạm dừng trong preview trước điểm gọi model/ghi lượt. Astrology Premium mở được form để xem giao diện; submit chỉ hiện notice, không gửi request.
- Khi bật preview, request đã gửi trước đó không bị huỷ và có thể hoàn tất theo quyền thật; banner/selector nêu rõ giới hạn này.
- Profile thường không còn hiển thị `Yearly -40%`, nút mua hoặc khôi phục chưa hoạt động. Hai mức 99.000đ/tháng và 799.000đ/năm chỉ hiện với Owner dưới nhãn giả thuyết. Tính lại theo 12 tháng cho kết quả tiết kiệm 389.000đ, tương đương 32,744% (hiển thị làm tròn 33%), không phải 40%.
- Copy Astrology không hứa tiếp nối hội thoại; giới hạn input về 500 ký tự theo request schema. Notice phân biệt tính năng chưa live, fact do người dùng chọn, câu hỏi hiện tại và dữ liệu không gửi tới model.

### Trạng thái tại thời điểm 25/09 (đã được cập nhật bởi tiến độ Chặng 2 bên dưới)

- `AstrologyExperience` mới lưu chart cục bộ; chưa có report trên server để xác minh đúng `auth.uid()`, revision và calculation version. UI Premium preview không tạo report hoặc entitlement.
- Migration ledger đã được hòa giải: hai nguồn SQL remote được khôi phục, hai bản local trùng logic được lưu archive, và `generation_activity_contract_forward` được áp dụng staging-only dưới version `20260925155619`. Local và remote khớp 24/24; không dùng `db push` hay `migration repair`.
- Code AI Studio local đã được nối vào contract Astrology v1; route đang active trên staging vẫn khai báo schema cũ và prompt VI/EN còn ở draft. Không gọi route legacy `ai-astrology-report` từ UI mới.
- Chưa có RevenueCat/store SKU, entitlement/quota thật hoặc giá được duyệt; mọi giá trong Owner view chỉ để review giả thuyết.
- Do các gate trên, lát này là UI/UX review được, chưa phải gói test AI hoàn chỉnh hay build cho người dùng ngoài nhóm Owner.

Chỉ mở rộng file scope nếu code path chứng minh bắt buộc; mọi mở rộng phải đi kèm cùng test và update impact map.

## Chặng 2: chuẩn bị luồng Astrology AI v1 cho staging — 25/09/2026

### Whole-App Impact Brief

| Vùng | Phạm vi chặng 2 |
| --- | --- |
| Entry/navigation | Astrology chart → AI Guide. Free giữ Chart Story phản chiếu local; chỉ quyền thật của server mới mở generation. Owner tier preview tiếp tục chặn mọi model call. |
| Data write | Sau consent, chỉ đồng bộ chart facts đã tính (placements/aspects/houses, phiên bản, caveat) vào report do server gắn với `auth.uid()`. Không lưu birth date/time/place/coordinates, câu hỏi hiện tại, Journal hay lịch sử chat trong report. Có xóa report AI đã đồng bộ gắn với chart. |
| Backend contract | Endpoint authenticated v1 đọc report theo user + revision/version; server kiểm Premium entitlement và quota staging, tải prompt active theo locale, route `astrology_report` phải khai báo `astrology_ai_insight_v1`; kiểm schema, selected evidence IDs và caveats trước khi trả response. |
| Admin visibility | AI Studio Astrology được đổi từ route `/ai/astrology-report` / `astrology_report_v1` sang AI Insight v1; loại raw birth fields khỏi payload; giữ workflow AI Studio tách biệt Content Operations. Publish vẫn là thao tác remote riêng. |
| Privacy/safety | Consent riêng trước khi chart facts rời máy; birth data không gửi model. Trace chỉ có version/count/route và status đã khử danh tính; không log question, chart facts hay raw response. Safety prompts giữ astrology là tự phản tư, không dự đoán/chẩn đoán. |
| Analytics/observability | Chỉ ghi tên event, route/prompt version, số fact, thời lượng và status; không ghi question/fact values. Quota kiểm tra server-side trước provider. |
| Rollback/fallback | Disable route hoặc rollback Edge Function; local chart/story tiếp tục hoạt động. Nếu thiếu prompt/route, entitlement, quota hoặc provider thì trả trạng thái an toàn và giữ chart local. |
| Để nguyên | Không sửa bảng/schema/migration, không cấp QA subscription, không publish model route/prompt, không đặt secrets, không deploy, không đổi giá/SKU, chart engine, Tarot, Face Reading hay Content Operations. |

### Phạm vi sửa mã và tiêu chí nghiệm thu

- Thêm handler Edge Function `/ai/astrology-insight` cùng kiểm tra authenticated user, sở hữu report, subscription, quota, contract, schema/evidence và privacy-safe trace.
- Thêm request helper/schema mapping ở mobile; nối nút hỏi của AI Guide với generation thật khi có entitlement server và consent; xử lý loading/retry/expired/unauthorized/provider errors; không để Owner preview gọi network.
- Dùng bảng `astrology_reports` và `usage_events` hiện có nếu kiểm tra contract chứng minh đủ cột/policy; nếu phát hiện cần DDL hoặc RPC nguyên tử thì dừng ở local code và xin mở migration gate trước.
- Cập nhật Admin AI Studio và prompt seed để hiển thị đúng endpoint, response schema, fact allowlist, consent, entitlement/quota và model route hiện tại; không hiển thị birth fields như payload gửi model.
- Acceptance local: contract v1 pass; test quyền/ownership/version/consent/limit/schema/evidence/provider lỗi; mobile Free, Owner preview và Premium có trạng thái đúng; Admin giữ đủ hai workspace và check/test pass.
- Acceptance live còn mở: Staging đã có route/prompt active và Edge Function mới, nhưng chưa có E2E trên UI điện thoại với model DeepSeek hiện tại. Các trace model thành công gần nhất được xác nhận dùng Qwen; cần kiểm tra response mới đi hết tới giao diện và ghi nhận route/model đúng. Đồng thời xác minh entitlement đang hoạt động gắn với đúng tài khoản QA, thử VI/EN và quyền bị hết/thu hồi. Không mở raw trace capture khi chưa có lịch purge được kiểm chứng.

### Trạng thái staging đã kiểm tra và đối chiếu

- `astrology_reports`, `subscriptions`, `usage_events`, `prompt_versions` và `model_route_versions` tồn tại; report có `chart_data`, `interpretation`, `input_summary` JSON cùng `user_id`/`calculation_version`.
- Trạng thái đọc-only xác nhận ngày 27/09: route active `astrology_report` dùng schema `astrology_ai_insight_v1`, OpenRouter và model `deepseek/deepseek-chat`; phiên bản route hiện tại đã được publish. Hai prompt `2026-09-25-ai-insight-v1` cho VI/EN đang có status `active`, nhưng chưa có actor `published_by`, nên cần Owner xác nhận trạng thái hiển thị/audit trong AI Studio. Có một record entitlement `premium_astrology_ai` active; truy vấn kiểm tra không đọc user ID, vì vậy phải xác nhận tài khoản QA ngay trong luồng đăng nhập trước khi thử.
- Trace Staging redacted có ba generation spans `llm.openrouter.primary` trạng thái `ok`, model `qwen/qwen3-235b-a22b-2507`, gần nhất ngày 26/09. Điều này xác nhận provider call và pipeline từng chạy với Qwen, **không** xác nhận DeepSeek hiện tại hoặc việc app đã render câu trả lời. Edge Function `ai-astrology-insight` đang `ACTIVE`, version 7, `verify_jwt=true`; các function Admin mới cũng đang active. `pg_cron` chưa cài, vì vậy raw QA capture vẫn phải tắt. Trace redacted ghi môi trường `staging`; điều đó không thay thế kiểm tra secret/readiness hiện tại.
- Migration `20260926152118_ai_studio_operations` đã được áp dụng Staging sau Owner review. Lịch sử hiện có remote-only `20260925160325_initial_mcy_schema`; ledger vẫn chặn `db push`/migration repair chung. Chi tiết ở [migration ledger](SUPABASE_MIGRATION_LEDGER.md) và [AI Studio SQL review](SUPABASE_MIGRATION_REVIEW_2026-09-26_AI_STUDIO.vi.md).

### Tiến độ runtime Astrology AI cục bộ

- Đã hoàn tất endpoint `ai-astrology-insight`, wrapper mobile có consent, prompt bilingual, route/schema metadata trong Admin và contract validator. Đây là mã local; Admin preflight không gọi provider và không ghi staging.
- Function xác thực JWT trước khi đọc payload, kiểm `premium_astrology_ai`, quota ngày, route/prompt đúng version, schema/evidence; lưu report thuộc user đã xác thực và ép trace sang redacted. Tài khoản Owner preview không thể gọi endpoint.
- Đây là QA cho chất lượng diễn giải, chưa phải chứng nhận độ chính xác thiên văn: server kiểm schema và liên kết evidence ID nhưng chưa tính lại chart từ dữ liệu sinh. Trước khi mời người dùng bên ngoài review, cần bộ đối chiếu placements/aspects độc lập và đánh giá các câu diễn giải có thực sự khớp giá trị fact hay không.
- Function, route và prompt v1 đã hiện diện trên Staging. Chưa ghi nhận actor publish của cặp prompt; Owner cần đối chiếu Versions/Audit trên AI Studio. Ba provider spans Qwen thành công cho thấy backend không còn chỉ là mock, nhưng model DeepSeek đang active cần một lượt kiểm thử mới từ UI. `supabase:check` đã được sửa để đối chiếu đúng tên migration hiện hành; các cảnh báo secret từ máy local chỉ nói về biến môi trường local, không chứng minh tình trạng secret trên project.
- Database owner đã duyệt migration staging-only. Ledger vẫn chặn thao tác migration chung vì một schema yoga/editorial remote-only. Hiện có một entitlement Astrology AI active trong Staging, nhưng chưa xác nhận tài khoản QA nào sở hữu record đó. `pg_cron` chưa cài; giữ `AI_TRACE_QA_CAPTURE_ENABLED=false` và chỉ dùng trace đã redact.

## Chặng sau và điều kiện tiếp tục

1. Đã hoàn tất đối chiếu migration ledger và staging schema qua catalog read-only; hai SQL gốc được khôi phục, forward migration `20260925155619_generation_activity_contract_forward` đã áp dụng và verify.
2. Owner đăng nhập tài khoản QA trên bản Android hiện hành, kiểm tra entitlement thực và xác nhận prompt/route trong AI Studio; không dùng Owner Premium preview để gọi AI.
3. Sau khi điện thoại sẵn sàng, chạy một lượt DeepSeek có consent mới trong app; xác nhận answer render, trace redacted ghi đúng model/route, không lộ câu hỏi/chart facts, retry không tạo lượt kép. Tiếp theo mới thử VI/EN và expired/revoked bằng tài khoản QA phù hợp.
4. Raw QA payload chỉ được bật sau khi cấu hình và kiểm thử được purge theo giờ; nếu không, tiếp tục dùng Trace Explorer redacted. Nếu E2E đạt, ghi build version/checksum/CI/thiết bị trước khi Owner review; chưa phát hành OTA/store hoặc mời người dùng thực.

## Validation và đường Owner tự kiểm

- Chạy mobile check/tests theo scripts của workspace, các contract/data checks liên quan và so sánh cả luồng Free lẫn Premium view trên Home/Explore → Guide detail/Chat, Explore → Tarot deck/detail/draw, Profile → Premium, Astrology → chart → AI panel.
- Kiểm tra account thường không thấy selector; admin không phải owner cũng không thấy; Owner thấy 3 lựa chọn; đổi tier không đổi state backend; logout/login reset view; Premium view mở màn nội dung local nhưng AI/paid action hiện preview rõ, không gọi provider/charge.
- Màn Premium cho user thường không nói giá thử nghiệm đã bán. Owner thấy cả giá tháng/năm, tổng kỳ hạn, mức quy đổi và nhãn “chưa thu tiền”.
- Không phát hành build/OTA. Device test hoặc bản đưa người dùng thực là bước riêng sau các gate iOS/Android, cloud AI và quyền thật.
