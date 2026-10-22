# R10 — Credits đọc đúng schema, debit cũ bị khóa

Ngày01/10/2026. Root xác minh catalog chỉ córeason/delta/balance_after, khôngamount. Schema initial và migration thứhaiCREATEIFNOTEXISTS mâu thuẫn; endpoint cũ SELECT/INSERTamount không khớp. Client functionmap còn bỏsuffix/deduct. **Không đọc số dư thực hoặc deploy**.

Đã sửa local GET đọcdelta bằng anon+verifiedJWT/RLS ownuser; bỏservice_role. Exactcount/rows mismatch, DBerror, thiếu/malformeddelta, unsafeinteger, negativebalance hoặc >1000rows trả503 thayfalsebalance/zero. Configmissing503, authmissing/anonymous/unknownclass401, unsupported405, lỗi generic không SQL/token.

POST cảmappedroot vàlegacy/deduct trả503`credit_reservation_unavailable`,successfalse, không đọc/parsebody/INSERT. Không khôi phục kiểmbalance→insert thiếuatomic. Đây là fail-closed interim, **không phải debit đã chạy**, không bảo vệ nhữngAIhandlers chưa có reservationboundary. FullR10 cầnquota/budgetpolicy, atomicrequestid/reserve/settle/refund cùnggeneration, liveconcurrency/replay tests. Bounded1000-read chỉ là tạm; cầnaggregate/RPC thật đểscale.

9Deno purehandler tests PASS vàindexDeno check PASS: totals/zero/authclass/ownfilter/errors/truncation/overflow/POSTnocharge. No livepositivebalance, SQLmutation/providercall. Adapter nhậnauth.is_anonymous!==false thànhunknown/anonymous; failclosed nếu runtimeauthkhông trảclass, không đoánsigned-in.

Manager fixturepath đọc test3credits=5-2, failedcountkhông trảbalance, POST khôngsuccess. Sau QA sạch, deploychỉ trongexactscopeapproved và testauth/role/ledger contract; chưa gọicreditsfoundationMVPdone. Rollback giữdebitdisabled, không quay về racefulfallback. NilazaPlan-QC verified-current.
