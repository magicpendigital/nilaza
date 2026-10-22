# R13 — Tarot prompt, locale và provenance

Ngày 01/10/2026. Chỉ source và local tests; không publish/deploy/DB/provider. Agent chuẩn bị patch, root áp sau preflight PASS; writer child bị treo nên không claim child đã chạy tests.

Trước sửa: system English hardcoded, language chỉ user JSON, promptVersionId tên cố định. Hiện đọc existing prompt_versions global/null owner/active/exact VI hoặcEN; latest timestamp tie/invalid/missing/query lỗi có local canonical fallback và lý do rõ. Active ID/FK là actualUUID, version làlabel; local ref cóFKnull. Không tạo purpose schema/publisher hoặc deck-specific assembler.

Ngữ cảnh giữ selected IDs/order/orientation, meanings/names/questions từ canonical public78cards; bỏ client card/deck prose. Vị trí do spread/index xác định, card.spread giữ nghĩa nhãn vị trí, top-levelspread làID. Không cho positionKey mâu thuẫn; kiểm unknown/duplicate/count/conflictingorientation. Đây không phải attestation sự kiện rút bài.

System đặt editable prose trước immutable safety/selected-card/orientation/VI-EN/JSON-output boundaries. Hướng dẫn ấm, ngắn, gắn câu hỏi/lá, một thử nghiệm phản chiếu nhỏ tùy chọn; agency không dự đoán chắc chắn. Lint chỉ defense-in-depth, không immunity. Raw question vẫn user JSON data; không raw prompt/question trong trace metadata. UUID/version/source/status/reason/assembly đi response/interpretation/usage/trace.

Local: fresh preflight PASS; **9 grouped Deno tests PASS** (bao phủ các fixture query/UUID/FK/locale/invalid/hostile/tie/canonical/card/position/trace); Deno entry check --deny-import --no-config --no-lock PASS, không download/provider. Backend14paths/21functions PASS; supabase checker72pass/9warn/0fail. Ledger checker exit0 vẫnblocked.

Review độc lập phát hiện đổi nghĩa card.spread và contradictory positionKey; root sửa canonicalposition và thêm assertions. Runtime contract giữ existing summary/reflection/sections/model route/auth/moderation. Sections parser vẫn rộng, chưa kiểm ngôn ngữ/content thực bằng provider. Body byte cap/accepted auth class/atomic cost nằmR10/R03, chưa đóng bởiR13.

Canonical JSON bundle theo deployment; sourceR20 và Admin content edit không tự cập nhật deployed function. Active prompt query có thể thay prose sau publish hợp lệ, nhưng đường publisher/purpose/CAS/readback toàn bộR13 vẫn chưa đạt. R12 provenance mới có slice Tarot; chưa app-wide.

Manager path sau đúng environment/approved deploy: fictional samequestion, Six ofSwordsupright/Three ofSwordsupright/Page ofWandsreversed VI rồiEN; summary/reflection/sections đúnglocale/cardpositions, trace/FK đúngversionUUID/null, save/reopen ổn định. Sau đó rubric/holdout so sánh model thật; không gán điểm cải thiện từ unit tests.

Rollback riêng helper/tests/index delta; không migration/seed/route repair. Plan-QC/Tarot Content QC vẫn phù hợp; canonical sources/Admin/App untouched bởi slicebackend.
