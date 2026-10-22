# R10 — Guard request chung cho Tarot và Persona

Ngày 01/10/2026. **Đã triển khai source và kiểm thử local; chưa deploy, gọi provider hoặc đóng toàn hạng mục R10.** Không thay policy số lượt, model route, quota SQL hoặc dữ liệu riêng của người dùng.

## Hành vi thay đổi

Hai endpoint `ai-tarot-reading` và `ai-persona-chat` dùng chung `_shared/ai-request-guard.ts`. Trước đó cả hai gọi `req.json()` trước xác thực; hiện kiểm config và Bearer có giới hạn, dùng `getUser(token)` thật, kiểm UUID/non-anonymous rõ ràng, rồi mới đọc body và làm prompt/provider/persistence. Client không được tự cung cấp identity có hiệu lực. Client Supabase dùng anon key + JWT caller, không service key; tắt persistence/auto-refresh ở server.

Body phải có `application/json`, là JSON object, UTF-8 hợp lệ và tối đa **32.768 byte thực tế**. Header Content-Length thiếu hoặc khai nhỏ không bỏ qua bộ đếm; declared oversize/malformed bị chặn. Stream bị treo trả timeout sau **5 giây**, dùng đồng hồ monotonic và kiểm cả trước/sau read; body được cancel khi lỗi. Không chờ một cancellation bị treo trước khi trả lỗi. UTF-8 tách giữa các chunks được ghép trước decode.

Lỗi trả code ổn định: auth missing/invalid/anonymous/unknown class 401; Auth service error không xác định/429/5xx hoặc exception 503; content type 415; body quá lớn 413; timeout 408; JSON/object sai 400. Mapper chỉ coi Auth status 400/401/403 là từ chối auth. Không trả raw JSON parser/Auth/stream/backend error hoặc thêm logging token/body. OPTIONS/method gate và successful response/persistence contracts giữ nguyên. Catch-all còn trả generic 400 cho lỗi ngoài guard; chưa đủ phân loại tất cả backend failures.

## Kiểm chứng và review

- **13 test guard + 9 test Tarot = 22 pass**, lệnh Deno có type-check, `--no-config --no-lock --deny-import`, dùng fixtures giả lập. Kiểm valid VI/EN, identity client không ghi đè user, auth fail không đọc body, exact byte cap, fake/missing length, multibyte/chunks, error/cancel/stalled stream, late EOF và returned Auth outage.
- Deno check **cả hai index pass**; backend contract checker **14 paths/21 functions pass**. Một lần gọi regression sai tên file đã lỗi; sửa sang `tarot-prompt.test.ts` và chạy lại đủ, không bỏ test hoặc dùng `--no-check`.
- Agent `security_review` review độc lập **exact payload**, không đọc filesystem/chạy tool/test. Root sửa hai finding: check deadline ngay sau await; phân loại lỗi Auth service. Agent xác nhận không còn material issue mới trong delta đó. Kết quả chạy test là của root, không tuyên bố hai lượt chạy độc lập.

## Giới hạn và bước tiếp

32 KiB là giới hạn incoming request, **không phải trần 2.000 token tổng system/history/retrieval** hoặc quota/cost guard. Các AI endpoint khác chưa được đưa vào helper này. Auth network call chưa có deadline/abort riêng; profile/consent/entitlement/account state, validation từng trường, output sections, provider retry và atomic reserve/settle còn mở. Không bật trả lời có phí từ việc guard pass.

[Đọc credit và debit fail-closed](R10-credits-read-guard.vi.md) là lát cắt khác; [policy/ngân sách](R00-quota-budget-proposal.vi.md) vẫn chờ quyết định số. Sau đó cần shared token/cost boundary, atomic concurrency/idempotency và test QA sạch. Không báo đã test live RLS/provider hoặc đã khắc phục mọi vấn đề bảo mật.

Manager có thể đọc fixtures không có secret/private text để kiểm hành vi từ chối trước continuation. Kiểm happy path trên app cần deploy đúng QA được duyệt rồi chạy Tarot/Persona VI/EN, anonymous/error/oversize, save/reopen và quota. Rollback chỉ delta guard/adapter; không quay lại debit cũ thiếu bảo vệ và không phát hành khi cost gate còn thiếu. Nilaza Plan-QC vẫn phù hợp với lát cắt shared contract, exact scope và cổng live; không cần sửa skill.
