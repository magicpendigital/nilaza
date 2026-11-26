/* Reviewed, immutable display metadata. No workflow execution/publication. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NilazaWorkflowCatalog = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const t = (vi, en) => ({ vi, en });
  const r = (path, symbol) => ({ path, ...(symbol ? { symbol } : {}) });
  const f = (name) => "supabase/functions/" + name + "/index.ts";
  const s = (name) => "supabase/functions/_shared/" + name;
  const providers = ["openai", "openrouter", "gemini", "anthropic"];
  const providerSpans = providers.flatMap((provider) => ["llm." + provider + ".primary", "llm." + provider + ".fallback"]);
  const p = (name, type, source, usage, privacy = "metadata") => ({ name, type, source, usage, privacy });
  const o = (name, type, destination, usage, privacy = "metadata") => ({ name, type, destination, usage, privacy });
  const n = (id, label, kind, x, y, description, refs, inputs = [], outputs = [], state = "implemented-source", model = false) => ({
    id, label, kind, x: 30 + x * 300, y: 30 + y * 190,
    description: model ? t(description.vi + " Recorded span: writer origin chưa xác minh; authenticated client có thể ghi trace nên record không chứng minh provider thực thi.",
      description.en + " Recorded span: writer origin unverified; authenticated clients can write traces, so the record does not prove provider execution.") : description,
    sourceState: state, sourceRefs: refs, inputs, outputs, traceSpanNames: model ? providerSpans.slice() : []
  });
  const after = t("Sau bước trước trong source; chưa quan sát execution.", "After the prior source step; execution is unobserved.");
  const e = (id, from, to, label, refs, mapping, condition = after) => ({
    id, from, to, kind: mapping ? "data" : "control", label, condition, sourceRefs: refs,
    mappings: mapping ? [{ from: mapping[0], to: mapping[1], usage: mapping[2] || label }] : []
  });
  const sourceNote = t("Sơ đồ source đã review; phiên bản đang deploy trên cloud chưa xác minh. Đọc route/config không chứng minh execution.", "Reviewed source graph; the deployed cloud version is unverified. Route/config reads do not prove execution.");
  const traceNote = t("Recorded span · writer origin chưa xác minh. llm.* chỉ là record mô tả Model Call; authenticated client có quyền ghi trace riêng nên không chứng minh provider thực thi. Root completed không chứng minh auth/prompt/retrieval/parse/chất lượng/lưu/cloud deploy.", "Recorded span · writer origin unverified. llm.* is a Model Call record; authenticated clients can write their own traces, so it does not prove provider execution. A completed root proves neither auth/prompt/retrieval/parsing/quality/persistence nor cloud deployment.");
  const g = (id, title, refs, nodes, edges, caveats, traceFeatures = [], sourceState = "implemented-source") => ({
    id, title, sourceState, caveats: [sourceNote, ...caveats],
    sourceRefs: traceFeatures.length ? [...refs, r(s("ai-trace.ts")), r(s("model-provider.ts")), r("supabase/migrations/20260909014614_ai_trace_observability.sql", "nilaza_private.ai_trace_detail")] : refs,
    nodes, edges, traceFeatures
  });
  const pass = t("Chuyển dữ liệu đã chuẩn bị", "Pass prepared data");
  const exchangeIn = (origin) => p("exchange", "ModelExchange", origin, t("System và user/assistant messages", "System and user/assistant messages"), "sensitive");
  const generationOut = (target) => o("generation", "ModelGeneration", target, t("Text + model/safety metadata", "Text and model/safety metadata"), "sensitive");

  const tr = [r(f("ai-tarot-reading")), r(s("tarot-prompt.ts")), r(s("ai-request-guard.ts")), r(s("model-router.ts")), r("packages/content/data/tarot-cards.json"), r("packages/agent-config/prompt-library.json")];
  const tarot = g("tarot_reading", t("Diễn giải Tarot", "Tarot interpretation"), tr, [
    n("request_guard", t("Auth + bounded JSON", "Auth + bounded JSON"), "guard", 0, 0, t("Auth trước body có giới hạn. Máy chủ rút lá bằng CSPRNG và khoá theo (tài khoản, kiểu trải, chủ đề, ngày UTC+7); app chỉ gửi drawId để diễn giải, lá khác bản đã lưu bị từ chối. Bài đã lưu được trả lại không gọi mô hình. LLM không rút lá.", "Authenticate before bounded body reading. The server draws cards with a CSPRNG and locks them per (account, spread, topic, UTC+7 day); the app sends only a drawId to interpret and cards that differ from the stored draw are refused. A stored reading is replayed without a model call. The LLM does not draw cards."), [tr[0], r("supabase/functions/ai-tarot-reading/handler.ts", "createTarotHandler"), r("supabase/functions/ai-tarot-reading/draw.ts", "drawServerCards"), tr[2]], [p("request", "TarotInput", "POST ai-tarot-reading", pass, "personal")], [o("input", "TarotInput", "canonical_cards.input", pass, "personal"), o("userId", "UserId", "reading_save.userId", t("Owner đã xác thực", "Verified owner"))]),
    n("canonical_cards", t("Đối chiếu lá bài chuẩn", "Canonical card enrichment"), "context", 1, 0, t("Kiểm spread/count, ID duy nhất và orientation theo 78 lá chuẩn; nghĩa lá và phong cách bộ bài lấy từ gói nội dung đã phát hành (get_published_content_bundle) khi hợp lệ, không thì từ tarot-cards.json (E4). Sai input kết thúc 400.", "Check spread/count, unique IDs and orientations against the 78 canonical cards; card meanings and the deck reading style come from the published content bundle (get_published_content_bundle) when valid, else from tarot-cards.json (E4). Invalid input ends with 400."), [r(s("tarot-prompt.ts"), "prepareTarotContext"), r(s("tarot-content.ts"), "readPublishedTarotContent"), tr[4]], [p("input", "TarotInput", "request_guard.input", pass, "personal")], [o("context", "CanonicalTarotContext", "prompt_messages.context", t("Lá chuẩn + câu hỏi", "Canonical cards and question"), "personal"), o("language", "Locale", "prompt_lookup.language", t("EN hoặc VI mặc định", "EN or default VI"))]),
    n("prompt_lookup", t("Đọc global prompt active", "Read active global prompt"), "prompt", 2, 0, t("Theo locale/published_at; thiếu, sai, lỗi hoặc timestamp cạnh tranh chuyển local degraded, giữ lý do.", "Select by locale/published_at; missing/invalid/unavailable or competing timestamps use local degraded mode with a reason."), [r(s("tarot-prompt.ts"), "resolveTarotPrompt")], [p("language", "Locale", "canonical_cards.language", pass)], [o("prompt", "PromptSelection", "prompt_messages.prompt", t("Prompt + provenance", "Prompt and provenance"))]),
    n("local_prompt", t("Prompt chuẩn local", "Canonical local prompt"), "prompt", 2, 1, t("Fallback pinned prompt-library; không phải bản cloud vừa publish.", "Pinned prompt-library fallback; not a newly published cloud version."), [tr[1], tr[5]], [], [o("prompt", "PromptSelection", "prompt_messages.prompt", t("Fallback + lý do", "Fallback and reason"))]),
    n("prompt_messages", t("System + user JSON", "System + user JSON"), "prompt", 3, 0, t("System thêm bounds Tarot bất biến; nghĩa lá/câu hỏi trong user JSON. Không retrieval/vector.", "System adds immutable Tarot bounds; meanings/question remain in user JSON. No retrieval/vector search."), [tr[0]], [p("context", "CanonicalTarotContext", "canonical_cards.context", pass, "personal"), p("prompt", "PromptSelection", "prompt_lookup or local_prompt", pass)], [o("exchange", "ModelExchange", "model_call.exchange", pass, "sensitive")]),
    n("model_call", t("Safety + Model Call", "Safety + Model Call"), "model", 4, 0, t("Shared active route; input safety trước provider. Route không có steps: primary/fallback theo lỗi được phép như cũ. Route có steps (A7, ≤ 4 bước): đi theo thứ tự, bỏ qua nhà cung cấp tắt/thiếu khóa/không được nhận loại dữ liệu/cầu dao mở, chuyển bước khi lỗi tạm thời, 429, 402, 401/403, 404, quá ngữ cảnh, sai định dạng (1 lần), không bao giờ khi bị chặn an toàn; trong tổng thời gian và trần chi phí. Output safety có thể thay bằng local fallback.", "Shared active route; input safety precedes providers. Routes without steps: allowed errors trigger primary/fallback as before. Routes with steps (A7, up to 4): walked in order, skipping providers that are off, lack a key, may not receive the data class or have an open circuit; move on for transient, 429, 402, 401/403, 404, context length and one format failure, never after a safety block; inside the total deadline and cost cap. Output safety can replace output with local fallback."), [tr[3]], [exchangeIn("prompt_messages.exchange")], [generationOut("parse_output.generation")], "implemented-source", true),
    n("parse_output", t("Parse có fallback", "Parse with fallback"), "output", 5, 0, t("JSON bắt buộc theo hợp đồng: giới hạn độ dài, locale, section key duy nhất và cardIds thuộc lá đã chọn. Từ chối output bị cắt; lỗi dùng fallback có nhãn. Không xác nhận chất lượng ngữ nghĩa.", "Strict JSON contract validates bounds, locale, unique section keys and selected cardIds. Truncated output is rejected; errors use labelled fallback. Structural validation does not certify semantic quality."), [r(f("ai-tarot-reading"), "parseTarotOutput"), r("packages/ai-contracts/tarot-output.ts")], [p("generation", "ModelGeneration", "model_call.generation", pass, "sensitive")], [o("reading", "TarotResult", "reading_save.reading", pass, "sensitive")]),
    n("reading_save", t("Lưu reading + usage/safety", "Save reading + usage/safety"), "storage", 6, 0, t("Ghi diễn giải vào đúng lượt rút đang giữ quyền (claim) kèm provenance và phiên bản prompt/route/nội dung; trigger cấm sửa diễn giải đã ghi. Lưu lỗi thì trả 503 có thể thử lại (không hiện bài chưa lưu) và nhả quyền giữ; câu trả lời dự phòng không tốn lượt. Finalize trace sau validation/lưu; biên nhận lỗi không làm mất bài.", "Write the interpretation into the claimed draw with provenance and prompt/route/content versions; a trigger forbids changing a written interpretation. A save failure returns a retryable 503 (no unsaved answer is shown) and releases the claim; a fallback answer does not use up the day. Finalize trace after validation/save; receipt failure does not discard the answer."), [tr[0], r("supabase/functions/ai-tarot-reading/handler.ts", "createTarotHandler"), r("supabase/functions/ai-tarot-reading/store.ts", "createSupabaseTarotStore"), r(s("answer-receipt.ts"))], [p("reading", "TarotResult", "parse_output.reading", pass, "sensitive"), p("userId", "UserId", "request_guard.userId", pass)], [o("response", "TarotResponse", "response.response", t("Reading + remoteId/status", "Reading and remoteId/status"), "sensitive")]),
    n("response", t("Trả reading + trạng thái", "Return reading + state"), "output", 7, 0, t("Trả interaction/attempt/request, phiên bản prompt/assembly/route/content, nguồn và trạng thái. Feedback chỉ category/IDs; server kiểm quyền sở hữu biên nhận. Trace cũ vẫn chưa xác minh nguồn ghi.", "Return interaction/attempt/request IDs, prompt/assembly/route/content versions, source and status. Feedback sends categories/IDs only; the server checks receipt ownership. Legacy trace writer origin remains unverified."), [tr[0], r("packages/ai-contracts/answer-provenance.ts"), r(f("ai-feedback")), r("supabase/functions/ai-feedback/handler.ts")], [p("response", "TarotResponse", "reading_save.response", pass, "sensitive")])
  ], [
    e("request_cards", "request_guard", "canonical_cards", t("Payload bounded", "Bounded payload"), [tr[0]], ["input", "input"]),
    e("locale_prompt", "canonical_cards", "prompt_lookup", t("Locale", "Locale"), [tr[1]], ["language", "language"]),
    e("active_prompt", "prompt_lookup", "prompt_messages", t("Prompt active hợp lệ", "Valid active prompt"), [tr[1]], ["prompt", "prompt"], t("Chọn được một global/locale prompt hợp lệ.", "One valid global/locale prompt can be selected.")),
    e("degraded_prompt", "prompt_lookup", "local_prompt", t("Thiếu / lỗi / cạnh tranh", "Missing / invalid / competing"), [tr[1]], null, t("Không chọn được active prompt tin cậy.", "A reliable active prompt cannot be selected.")),
    e("local_to_prompt", "local_prompt", "prompt_messages", t("Local degraded", "Local degraded"), [tr[1]], ["prompt", "prompt"]),
    e("cards_to_prompt", "canonical_cards", "prompt_messages", t("Nghĩa chuẩn", "Canonical meanings"), [tr[0]], ["context", "context"]),
    e("prompt_to_model", "prompt_messages", "model_call", t("System + messages", "System and messages"), [tr[0]], ["exchange", "exchange"]),
    e("model_to_parse", "model_call", "parse_output", t("Passed / blocked / fallback", "Passed / blocked / fallback"), [tr[0]], ["generation", "generation"]),
    e("parse_to_save", "parse_output", "reading_save", t("Reading đã parse", "Parsed reading"), [tr[0]], ["reading", "reading"]),
    e("owner_to_save", "request_guard", "reading_save", t("Owner", "Owner"), [tr[0]], ["userId", "userId"]),
    e("save_to_response", "reading_save", "response", t("Stored / reading_error", "Stored / reading_error"), [tr[0]], ["response", "response"])
  ], [traceNote, t("Công tắc tạm nghỉ và hạn mức lượt/ngày (claimDailyAttempt; mặc định 1 bài giải, hoặc cấu hình Admin đang chạy, kèm tổng thời gian chờ model) chạy trước Model Call, không vẽ thành node. Không có node thu phí giả.", "The pause switch and the daily limit (claimDailyAttempt; 1 delivered reading by default, or the active Admin config, which may also set a total model deadline) run before the Model Call and are not drawn as nodes. No billing node is invented.")], ["tarot_reading"]);

  const or = [r(f("ai-oracle-turn")), r("supabase/functions/ai-oracle-turn/handler.ts"), r(s("oracle-runtime.mjs")), r(s("ai-request-guard.ts")), r(s("prompt-composition/compose.mjs"))];
  const oracle = g("oracle_router", t("Oracle — candidate local", "Oracle — local candidate"), or, [
    n("request_guard", t("Auth + body giới hạn", "Auth + bounded body"), "guard", 0, 0, t("GetUser trước JSON; 32 KiB và body deadline. Auth vẫn cần backend connectivity.", "GetUser precedes JSON; 32 KiB cap and body deadline. Authentication still requires backend connectivity."), [or[1], or[3]], [p("request", "OracleInput", "POST ai-oracle-turn", pass, "personal")], [o("input", "OracleInput", "locale_question.input", pass, "personal")]),
    n("locale_question", t("Câu hỏi + VI/EN exact", "Question + exact VI/EN"), "context", 1, 0, t("Chỉ vi/en, không đổi locale âm thầm; đọc/kiểm câu hỏi trước context sâu.", "Only exact vi/en, no silent locale switching; read/validate the question before deeper context."), [r(s("oracle-runtime.mjs"), "readOracleQuestion")], [p("input", "OracleInput", "request_guard.input", pass, "personal")], [o("question", "OracleQuestion", "safety_signal.question", pass, "personal"), o("input", "OracleInput", "context_compile.input", pass, "personal")]),
    n("safety_signal", t("Safety branch bounded", "Bounded safety branch"), "branch", 2, 0, t("Heuristic tự hại/regulated advice, không phải full moderation. Support bypass compiler/model/quota.", "Self-harm/regulated-advice heuristics, not full moderation. Support bypasses compiler/model/quota."), [or[1], r(s("oracle-runtime.mjs"), "oracleSafetySignal")], [p("question", "OracleQuestion", "locale_question.question", pass, "personal")], [o("question", "OracleQuestion", "static_support.question", pass, "personal")]),
    n("static_support", t("Hỗ trợ VI/EN tĩnh", "Static VI/EN support"), "output", 3, 1, t("Lời hỗ trợ authored; không action/handoff/provider. Safety và usage ACK chạy song song, timeout 250 ms.", "Authored support; no actions/handoff/provider. Safety and usage ACK run in parallel with a 250 ms timeout."), [or[1], r(s("oracle-runtime.mjs"), "oracleSafetyReply")], [p("question", "OracleQuestion", "safety_signal.question", pass, "personal")], [o("reply", "OracleReply", "usage_ack.reply", pass, "sensitive")]),
    n("context_compile", t("Consent + shared prompt", "Consent + shared prompt"), "prompt", 3, 0, t("Core→Feature→Locale→Tone; profile/history chỉ nếu flag riêng true, max8 history. Journal/birth không hỗ trợ; tone legacy mapping rõ. Real tokenizer chưa nối. Khi gọi model, tin nhắn JSON profile của bundle được thay bằng khối dữ liệu giới hạn (tên gọi ≤ 40, mục tiêu 5 × 60, giờ địa phương; A5).", "Core→Feature→Locale→Tone; profile/history require separate true flags, max8 history. Journal/birth unsupported; explicit legacy tone mapping. Real tokenizer is not wired. On the model path the bundle's profile JSON message is replaced by the bounded data block (nickname ≤ 40, goals 5 × 60, local time; A5)."), [or[2], or[4]], [p("input", "OracleInput", "locale_question.input", pass, "personal")], [o("compiled", "OracleCompiled", "intent_actions.compiled", t("Messages + hashes/provenance", "Messages and hashes/provenance"), "sensitive")]),
    n("intent_actions", t("Ý định + action/handoff", "Intent + actions/handoff"), "context", 4, 0, t("Keyword mapping, tạo context cho UI; không thực thi các tính năng đích. Reply thường là authored fallback.", "Keyword mapping produces UI context; it does not execute destination features. Normal reply is authored fallback."), [or[1], r(s("oracle-runtime.mjs"), "oracleIntent")], [p("compiled", "OracleCompiled", "context_compile.compiled", pass, "sensitive")], [o("reply", "OracleReply", "provider_gate.reply", pass, "sensitive")]),
    n("provider_gate", t("Provider gate đang đóng", "Provider gate closed"), "gate", 5, 0, t("providerReady=false; local_fallback/provider_gate_pending. Không Model Call, DB bundle consumer active hoặc LLM trace trong candidate.", "providerReady=false; local_fallback/provider_gate_pending. The candidate has no Model Call, active DB bundle consumer or LLM trace."), [or[1], r(s("oracle-runtime.mjs"), "ORACLE_RUNTIME_READINESS")], [p("reply", "OracleReply", "intent_actions.reply", pass, "sensitive")], [o("reply", "OracleReply", "usage_ack.reply", pass, "sensitive")], "candidate-disabled"),
    n("usage_ack", t("Usage / safety ACK", "Usage / safety ACK"), "storage", 6, 0, t("Metadata tối thiểu, không raw câu hỏi/profile/history; stored/skipped/error/unconfirmed là event ACK. conversationPersisted=false; timeout không tự retry.", "Minimal metadata, no raw question/profile/history; stored/skipped/error/unconfirmed is event ACK. conversationPersisted=false; timeout does not trigger retries."), [or[0], or[1]], [p("reply", "OracleReply", "provider_gate or static_support", pass, "sensitive")], [o("response", "OracleResponse", "response.response", pass, "sensitive")]),
    n("response", t("Trả support / fallback thật", "Return actual support / fallback"), "output", 7, 0, t("Reply/reason/hashes không chứng minh cloud deploy. Mobile flags/provenance/offline crisis chưa nghiệm thu đồng bộ.", "Reply/reason/hashes do not prove cloud deployment. Mobile flags/provenance/offline crisis parity remains unaccepted."), [or[1]], [p("response", "OracleResponse", "usage_ack.response", pass, "sensitive")])
  ], [
    e("guard_question", "request_guard", "locale_question", t("Input bounded", "Bounded input"), [or[1]], ["input", "input"]),
    e("question_safety", "locale_question", "safety_signal", t("Câu hỏi/locale", "Question/locale"), [or[1]], ["question", "question"]),
    e("safety_support", "safety_signal", "static_support", t("Có tín hiệu", "Signal detected"), [or[1]], ["question", "question"], t("self_harm_signal hoặc regulated_advice.", "self_harm_signal or regulated_advice.")),
    e("safety_continue", "safety_signal", "context_compile", t("Không nhận diện tín hiệu", "No detected signal"), [or[1]], null, t("Heuristic không phát hiện; không phải guarantee an toàn đầy đủ.", "No heuristic signal; not a complete safety guarantee.")),
    e("question_context", "locale_question", "context_compile", t("Context có consent", "Consented context"), [or[1]], ["input", "input"], t("Chỉ ngoài nhánh support; profile/history có flags riêng.", "Only outside support; profile/history have separate flags.")),
    e("context_intent", "context_compile", "intent_actions", t("Bundle candidate", "Candidate bundle"), [or[1]], ["compiled", "compiled"]),
    e("intent_gate", "intent_actions", "provider_gate", t("Action preview", "Action preview"), [or[1]], ["reply", "reply"]),
    e("gate_usage", "provider_gate", "usage_ack", t("Local fallback", "Local fallback"), [or[1]], ["reply", "reply"], t("Provider gate luôn đóng trong source candidate này.", "The provider gate is always closed in this source candidate.")),
    e("support_usage", "static_support", "usage_ack", t("Support + event ACK", "Support and event ACK"), [or[1]], ["reply", "reply"]),
    e("usage_response", "usage_ack", "response", t("ACK ≠ conversation save", "ACK ≠ conversation save"), [or[1]], ["response", "response"])
  ], [t("Provider/tokenizer/durable quota chưa activation; usage ACK không phải lưu conversation. Admin preview không phải prompt cloud active. Candidate source và cloud cũ có thể khác nhau.", "Provider/tokenizer/durable quota are not activated; usage ACK is not conversation persistence. Admin preview is not an active cloud prompt. Candidate source and older cloud runtime may differ.")], [], "candidate-disabled");

  const pr = [r(f("ai-persona-chat")), r(s("persona-prompt-assembler.ts")), r(s("ai-request-guard.ts")), r(s("model-router.ts"))];
  const persona = g("persona_chat", t("Chat với guide", "Guide chat"), pr, [
    n("request_guard", t("Auth + bounded JSON", "Auth + bounded JSON"), "guard", 0, 0, t("Shared guard rồi kiểm text không rỗng.", "Shared guard, then require nonempty text."), [pr[0], pr[2]], [p("request", "PersonaInput", "POST ai-persona-chat", pass, "personal")], [o("input", "PersonaInput", "history.input", pass, "personal")]),
    n("history", t("History bounded", "Bounded history"), "context", 1, 0, t("Hạng Thường: 8 lượt cuối × 800 ký tự; hạng Tri thức sâu: tới 12 lượt × 2.500 ký tự (Admin › Hạng model người dẫn). Compact, guide→assistant, bỏ duplicate hiện tại. Chưa xác minh context consent như Oracle.", "Standard tier: last 8 turns × 800 chars; Deep knowledge tier: up to 12 turns × 2,500 chars (Admin › Persona model tiers). Compact text, guide→assistant, remove current duplicates. Context consent is not verified as in Oracle."), [pr[0]], [p("input", "PersonaInput", "request_guard.input", pass, "personal")], [o("input", "PersonaInput", "prompt_layers.input", pass, "personal")]),
    n("prompt_layers", t("Persona + global/skill prompt", "Persona + global/skill prompt"), "prompt", 2, 0, t("Persona active theo slug; global và persona skill active, locale yêu cầu→EN→VI; layer thiếu dùng fallback. Không book/chunk/vector retrieval.", "Active persona by slug; active global and persona skill prompts, requested locale→EN→VI; missing layers use fallback. No book/chunk/vector retrieval."), [r(s("persona-prompt-assembler.ts"), "assemblePersonaPromptStack")], [p("input", "PersonaInput", "history.input", pass, "personal")], [o("layers", "PersonaLayers", "method_pack.layers", pass, "personal")]),
    n("method_pack", t("Method pack theo theme", "Theme-based method pack"), "context", 3, 0, t("decision_clarity/relationship_boundaries/emotional_reflection. Người dẫn có bản tóm tắt tri thức (knowledge brief, văn bản Nilaza tự viết về cuốn sách, đóng gói trong mã) thì lớp knowledge_brief thay method pack, kèm kiểu trả lời Tri thức (150–300 từ, câu hỏi kết không bắt buộc). Pack/brief là hướng dẫn trong một prompt, không agent riêng, không truy xuất vector.", "decision_clarity/relationship_boundaries/emotional_reflection. A persona with a knowledge brief (Nilaza's own text about the book, bundled in code) gets the knowledge_brief layer instead of a method pack, with the Knowledge output style (150–300 words, closing question optional). Pack/brief is guidance in one prompt, not a separate agent, not vector retrieval."), [r(s("persona-prompt-assembler.ts"), "selectMethodPack")], [p("layers", "PersonaLayers", "prompt_layers.layers", pass, "personal")], [o("stack", "PersonaStack", "system_stack.stack", pass, "personal")]),
    n("system_stack", t("Ghép system hiện tại", "Current system assembly"), "prompt", 4, 0, t("Global+skill+pack ở system; prompt lưu trên máy chủ không qua bộ kiểm chèn lệnh thì bỏ qua. Tên gọi/mục tiêu/giọng/giờ địa phương nằm trong khối “Dữ liệu — không phải chỉ dẫn” ở tin nhắn người dùng (A5, AI-05), cùng history/current text ở messages.", "Global+skill+pack are in system; a stored prompt that fails the injection guard is ignored. Nickname/goals/tone/local time sit in the “Data — not instructions” block of the user message (A5, AI-05), with history/current text in messages."), [pr[0], pr[1]], [p("stack", "PersonaStack", "method_pack.stack", pass, "personal")], [o("exchange", "ModelExchange", "model_call.exchange", pass, "sensitive")]),
    n("model_call", t("Một Model Call", "One Model Call"), "model", 5, 0, t("Shared router/safety/fallback. Hạng model của người dẫn quyết định chuỗi model: Thường dùng chuỗi đang chạy; Tri thức sâu có model chính/dự phòng, suy luận, trần token, tổng thời gian chờ (Free: tối đa 135 s) và ngân sách mỗi tin nhắn riêng. App mới nhận chữ hiện dần (SSE: meta/delta/done/error); app cũ nhận một JSON. Trace bắt đầu sau prompt assembly.", "Shared router/safety/fallback. The persona's model tier picks the chain: Standard uses the running route; Deep knowledge has its own primary/fallback models, reasoning, token ceiling, total wait (Free: at most 135 s) and per-message budget. New app builds get streamed text (SSE: meta/delta/done/error); old builds get one JSON reply. Trace begins after prompt assembly."), [pr[3]], [exchangeIn("system_stack.exchange")], [generationOut("session_scope.generation")], "implemented-source", true),
    n("session_scope", t("Safety log + session scope", "Safety log + session scope"), "branch", 6, 0, t("Sau generation ghi safety event nếu blocked, rồi kiểm UUID/owner/kind/not-deleted/persona membership; phù hợp thì reuse, ngược lại create.", "After generation, write a safety event if blocked, then check UUID/owner/kind/not-deleted/persona membership; reuse if appropriate, otherwise create."), [pr[0]], [p("generation", "ModelGeneration", "model_call.generation", pass, "sensitive")], [o("turn", "PersonaTurn", "session_reuse or session_new", pass, "sensitive")]),
    n("session_reuse", t("Reuse session", "Reuse session"), "storage", 7, 0, t("Cập nhật timestamp, upsert membership trong session đúng phạm vi.", "Update timestamp and upsert membership in the scoped session."), [pr[0]], [p("turn", "PersonaTurn", "session_scope.turn", pass, "sensitive")], [o("turn", "PersonaTurn", "messages_save.turn", pass, "sensitive")]),
    n("session_new", t("Create session", "Create session"), "storage", 7, 1, t("Tạo session mới; thành công thì timestamp/membership upsert như reuse. Lỗi session_error bỏ qua message insert và trả response.", "Create a session; success uses the same timestamp/membership upsert as reuse. session_error skips message insertion and returns a response."), [pr[0]], [p("turn", "PersonaTurn", "session_scope.turn", pass, "sensitive")], [o("turn", "PersonaTurn", "messages_save.turn", pass, "sensitive")]),
    n("messages_save", t("Lưu user + guide messages", "Save user + guide messages"), "storage", 8, 0, t("Chỉ khi session hợp lệ: insert hai messages và usage. Safety event đã ghi trước session scope. Guide row not_reviewed; message_error khác stored; span không chứng minh save.", "Only with a valid session: insert two messages and usage. Safety was recorded before session scope. Guide row is not_reviewed; message_error differs from stored; spans do not prove save."), [pr[0]], [p("turn", "PersonaTurn", "session_reuse or session_new", pass, "sensitive")], [o("response", "PersonaResponse", "response.response", pass, "sensitive")]),
    n("response", t("Reply + remoteSessionId", "Reply + remoteSessionId"), "output", 9, 0, t("Trả stack/model/persistence. Công tắc và hạn mức chung Chat+Oracle (5/ngày hoặc cấu hình Admin đang chạy) kiểm trước Model Call, không vẽ thành node.", "Return stack/model/persistence. The switch and the shared Chat+Oracle daily limit (5 or the active Admin config) are checked before the Model Call and are not drawn as nodes."), [pr[0]], [p("response", "PersonaResponse", "messages_save.response", pass, "sensitive")])
  ], [
    e("guard_history", "request_guard", "history", t("Input", "Input"), [pr[0]], ["input", "input"]),
    e("history_layers", "history", "prompt_layers", t("Persona/context", "Persona/context"), [pr[0]], ["input", "input"]),
    e("layers_method", "prompt_layers", "method_pack", t("Layers/themes", "Layers/themes"), [pr[1]], ["layers", "layers"]),
    e("method_system", "method_pack", "system_stack", t("Method pack", "Method pack"), [pr[1]], ["stack", "stack"]),
    e("system_model", "system_stack", "model_call", t("System/messages", "System/messages"), [pr[0]], ["exchange", "exchange"]),
    e("model_session", "model_call", "session_scope", t("Generation đã trả", "Generation returned"), [pr[0]], ["generation", "generation"]),
    e("session_valid", "session_scope", "session_reuse", t("Scope phù hợp", "Scope matches"), [pr[0]], ["turn", "turn"], t("UUID/owner/kind/status/persona phù hợp.", "UUID/owner/kind/status/persona match.")),
    e("session_missing", "session_scope", "session_new", t("Không reuse được", "Cannot reuse"), [pr[0]], ["turn", "turn"], t("Session thiếu hoặc không phù hợp.", "Session missing or inappropriate.")),
    e("reuse_save", "session_reuse", "messages_save", t("Session cũ", "Existing session"), [pr[0]], ["turn", "turn"]),
    e("new_save", "session_new", "messages_save", t("Session mới thành công", "New session succeeds"), [pr[0]], ["turn", "turn"], t("Không sessionError và session.id có giá trị; timestamp/membership chuẩn bị trước messages.", "No sessionError and a session.id exists; timestamp/membership preparation precedes messages.")),
    e("new_session_error", "session_new", "response", t("session_error, không insert messages", "session_error, no message insert"), [pr[0]], null, t("Create lỗi hoặc không có session.id: bỏ qua message insert, trả persistenceStatus=session_error.", "Create fails or no session.id: skip message insertion and return persistenceStatus=session_error.")),
    e("save_response", "messages_save", "response", t("Stored / lỗi", "Stored / error"), [pr[0]], ["response", "response"])
  ], [traceNote, t("Chưa retrieval nguồn được cấp phép hoặc consent context theo từng lượt như Oracle; dữ liệu người dùng đã ra khỏi system (A5). Knowledge brief là tóm tắt do Nilaza viết, không phải truy xuất sách. Hạng model và streaming chỉ chạy khi ai-persona-chat bản mới đã deploy và migration 20261125100000 đã áp.", "Licensed-source retrieval and Oracle-style per-request context consent are absent; user data is out of the system prompt (A5). A knowledge brief is a Nilaza-written summary, not book retrieval. Model tiers and streaming run only once the new ai-persona-chat is deployed and migration 20261125100000 is applied.")], ["persona_chat"]);

  const cr = [r(f("ai-council")), r(s("model-router.ts")), r("packages/agent-config/council-contract.json")];
  const council = g("ai_council", t("Council — một lần sinh nhiều voice", "Council — one generation, multiple voices"), cr, [
    n("request", t("Request + contract version", "Request + contract version"), "trigger", 0, 0, t("req.json trước auth; kiểm councilId/version, message và ít nhất2 personas. Chưa dùng bounded guard.", "req.json precedes auth; check councilId/version, message and at least2 personas. No bounded guard."), [cr[0], cr[2]], [p("request", "CouncilInput", "POST ai-council", pass, "sensitive")], [o("input", "CouncilInput", "optional_auth.input", pass, "sensitive")]),
    n("optional_auth", t("Auth tùy cấu hình", "Optional auth"), "guard", 1, 0, t("Env/token thì getUser; auth_error vẫn generation. Không fail-closed auth.", "With env/token, getUser; auth_error still permits generation. Not fail-closed auth."), [cr[0]], [p("input", "CouncilInput", "request.input", pass, "sensitive")], [o("input", "CouncilInput", "config_read or payload_template", pass, "sensitive")]),
    n("config_read", t("Đọc config/template active", "Read active config/template"), "context", 2, 0, t("Dùng mode/maxGuides/synthesis/roster/outputContract. Template thiếu có thể dùng payload mà source vẫn supabase_active_config: provenance chưa đủ chính xác.", "Consume mode/maxGuides/synthesis/roster/outputContract. Missing templates may use payload while source remains supabase_active_config: provenance is imprecise."), [r(f("ai-council"), "readPublishedCouncilConfig")], [p("input", "CouncilInput", "optional_auth.input", pass, "sensitive")], [o("context", "CouncilContext", "roster.context", pass, "sensitive")]),
    n("payload_template", t("Template mobile fallback", "Mobile template fallback"), "context", 2, 1, t("Thiếu user/config đọc được thì inputTemplate từ payload; không chứng minh Admin config thực thi.", "Missing user/readable config uses payload inputTemplate; this does not prove Admin config execution."), [cr[0]], [p("input", "CouncilInput", "optional_auth.input", pass, "sensitive")], [o("context", "CouncilContext", "roster.context", pass, "sensitive")]),
    n("roster", t("Roster 2–4 guide", "2–4 guide roster"), "context", 3, 0, t("Query roster slugs không lọc active; thiếu thì selectedPersonas. Cap2–4, tạo fallback turns. Không retrieval.", "Roster slug query has no active filter; missing rows use selectedPersonas. Cap2–4, prepare fallback turns. No retrieval."), [r(f("ai-council"), "runtimePersonasFromTemplate")], [p("context", "CouncilContext", "config_read or payload_template", pass, "sensitive")], [o("exchange", "ModelExchange", "model_call.exchange", pass, "sensitive")]),
    n("model_call", t("Một Model Call cho toàn Council", "One Model Call for the whole Council"), "model", 4, 0, t("Một generateWithModelRoute sinh turns+synthesis. System = prompt ai_council đang chạy trong prompt_versions (thiếu thì prompt-library) + luật an toàn/JSON khóa trong mã; mục tiêu/giọng/tên gọi/giờ ở khối dữ liệu, lịch sử ≤ 12 × 800 ký tự (A5). Không spawn/parallel model per guide hay nhiều vòng backend.", "One generateWithModelRoute produces turns+synthesis. System = the active ai_council prompt in prompt_versions (else prompt-library) + safety/JSON rules locked in code; goals/tone/nickname/time in the data block, history ≤ 12 × 800 characters (A5). No spawned/parallel per-guide models or multi-round backend execution."), [cr[0], cr[1]], [exchangeIn("roster.exchange")], [generationOut("parse_turns.generation")], "implemented-source", true),
    n("parse_turns", t("Parse selected turns/synthesis", "Parse selected turns/synthesis"), "output", 5, 0, t("Giữ selected persona IDs; JSON lỗi hoặc ít turns dùng fallback. Chưa full canonical schema validator.", "Retain selected persona IDs; invalid JSON or too few turns use fallback. Not a full canonical schema validator."), [r(f("ai-council"), "parseCouncilOutput")], [p("generation", "ModelGeneration", "model_call.generation", pass, "sensitive")], [o("round", "CouncilRound", "new_session.round", pass, "sensitive")]),
    n("new_session", t("Session mới mỗi request", "New session per request"), "storage", 6, 0, t("User xác thực thì create session/roster/messages/usage; không resume session cũ. Không user thì skip lưu.", "Authenticated user creates session/roster/messages/usage; existing sessions are not resumed. No user means persistence is skipped."), [cr[0]], [p("round", "CouncilRound", "parse_turns.round", pass, "sensitive")], [o("response", "CouncilResponse", "response.response", pass, "sensitive")]),
    n("response", t("Trả round + trạng thái", "Return round + state"), "output", 7, 0, t("Turns/synthesis/configSource/model/persistence. Không có execution receipt từng guide.", "Turns/synthesis/configSource/model/persistence. No per-guide execution receipt exists."), [cr[0]], [p("response", "CouncilResponse", "new_session.response", pass, "sensitive")])
  ], [
    e("request_auth", "request", "optional_auth", t("Request", "Request"), [cr[0]], ["input", "input"]),
    e("auth_config", "optional_auth", "config_read", t("User xác thực", "Authenticated user"), [cr[0]], ["input", "input"], t("Env/token và getUser thành công.", "Env/token exist and getUser succeeds.")),
    e("auth_payload", "optional_auth", "payload_template", t("Không user/config", "No user/config"), [cr[0]], ["input", "input"], t("Thiếu phiên/env hoặc config tin cậy; vẫn generation.", "Missing session/env or reliable config; generation continues.")),
    e("config_roster", "config_read", "roster", t("Config hoặc mixed fallback", "Config or mixed fallback"), [cr[0]], ["context", "context"]),
    e("payload_roster", "payload_template", "roster", t("Payload fallback", "Payload fallback"), [cr[0]], ["context", "context"]),
    e("roster_model", "roster", "model_call", t("Toàn roster trong một prompt", "Entire roster in one prompt"), [cr[0]], ["exchange", "exchange"]),
    e("model_parse", "model_call", "parse_turns", t("Generation / fallback", "Generation / fallback"), [cr[0]], ["generation", "generation"]),
    e("round_session", "parse_turns", "new_session", t("Round đã parse", "Parsed round"), [cr[0]], ["round", "round"]),
    e("session_response", "new_session", "response", t("Stored / skipped / lỗi", "Stored / skipped / error"), [cr[0]], ["response", "response"])
  ], [traceNote, t("Policy/flow/quality fields không được endpoint đọc không có node execution. Số Hội đồng/ngày và câu hỏi tiếp (policy hoặc cấu hình Admin đang chạy) kiểm trước Model Call; chưa có retrieval/orchestration song song.", "Policy/flow/quality fields not read by the endpoint have no execution node. Councils per day and follow-ups (policy or the active Admin config) are checked before the Model Call; retrieval and parallel orchestration are absent.")], ["ai_council"]);

  const dr = [r(f("ai-daily-insight")), r(f("ai-daily-zodiac-pulse")), r(s("model-router.ts"))];
  const daily = g("daily_insight", t("Daily Insight + Zodiac Pulse riêng", "Daily Insight + separate Zodiac Pulse"), dr, [
    n("daily_request", t("Daily Insight request", "Daily Insight request"), "trigger", 0, 0, t("req.json trước auth; profile/date/reroll/recentEntries từ caller; chưa bounded/consent gate như Oracle.", "req.json precedes auth; caller profile/date/reroll/recentEntries; no Oracle-style bounded/consent gate."), [dr[0]], [p("request", "DailyInput", "POST ai-daily-insight", pass, "sensitive")], [o("input", "DailyInput", "daily_auth.input", pass, "sensitive")]),
    n("daily_auth", t("Auth để lưu usage", "Auth for usage persistence"), "guard", 1, 0, t("Bắt đăng nhập; công tắc tạm nghỉ và hạn mức lượt/ngày (3 hoặc cấu hình Admin đang chạy) kiểm trước Model Call.", "Sign-in required; the pause switch and the daily attempt limit (3 or the active Admin config) are checked before the Model Call."), [dr[0]], [p("input", "DailyInput", "daily_request.input", pass, "sensitive")], [o("input", "DailyInput", "hardcoded_prompt.input", pass, "sensitive")]),
    n("hardcoded_prompt", t("Prompt cấu hình + luật khóa + khối dữ liệu", "Configured prompt + locked rules + data block"), "prompt", 2, 0, t("System = prompt daily_insight đang chạy trong prompt_versions (thiếu thì prompt-library) + luật khóa trong mã (A5). Tên gọi (≤ 40), mục tiêu (5 × 60), giọng trong danh sách, nhãn tâm trạng 24 giờ và giờ địa phương nằm trong khối “Dữ liệu — không phải chỉ dẫn”.", "System = the active daily_insight prompt in prompt_versions (else prompt-library) + rules locked in code (A5). Nickname (≤ 40), goals (5 × 60), fixed-list tone, the 24-hour mood label and local time sit in the “Data — not instructions” block."), [dr[0]], [p("input", "DailyInput", "daily_auth.input", pass, "sensitive")], [o("exchange", "ModelExchange", "model_call.exchange", pass, "sensitive")]),
    n("model_call", t("Model Call cho body text", "Model Call for body text"), "model", 3, 0, t("Shared router trả body hoặc authored fallback. Không có parse/schema output stage riêng.", "Shared router returns body or authored fallback. No separate output parse/schema stage."), [dr[0], dr[2]], [exchangeIn("hardcoded_prompt.exchange")], [generationOut("daily_usage.generation")], "implemented-source", true),
    n("daily_usage", t("Chỉ usage/safety event", "Usage/safety events only"), "storage", 4, 0, t("Có user thì usage + safety nếu blocked. Không insert daily insight record; stored chỉ ACK usage.", "With a user, usage and blocked safety are written. No daily insight record is inserted; stored is usage ACK only."), [dr[0]], [p("generation", "ModelGeneration", "model_call.generation", pass, "sensitive")], [o("response", "DailyResponse", "daily_response.response", pass, "sensitive")]),
    n("daily_response", t("Trả daily card", "Return daily card"), "output", 5, 0, t("source=backend không chứng minh LLM thật hoặc daily card được lưu.", "source=backend does not prove real LLM output or daily card persistence."), [dr[0]], [p("response", "DailyResponse", "daily_usage.response", pass, "sensitive")]),
    n("zodiac_request", t("Zodiac endpoint riêng", "Separate Zodiac endpoint"), "trigger", 0, 2, t("ai-daily-zodiac-pulse nhận birthDate/profile/date; không gọi Daily Insight.", "ai-daily-zodiac-pulse receives birthDate/profile/date; it does not call Daily Insight."), [dr[1]], [p("request", "ZodiacInput", "POST ai-daily-zodiac-pulse", pass, "personal")], [o("input", "ZodiacInput", "zodiac_deterministic.input", pass, "personal")]),
    n("zodiac_deterministic", t("Sun sign + seed deterministic", "Sun sign + deterministic seed"), "context", 1, 2, t("Mốc ngày→sun sign; seed date/sign/tone/goal→mood/cue/caveats. Không LLM, không full birth chart.", "Date windows→sun sign; date/sign/tone/goal seed→mood/cue/caveats. No LLM; not a full birth chart."), [dr[1]], [p("input", "ZodiacInput", "zodiac_request.input", pass, "personal")], [o("pulse", "ZodiacPulse", "zodiac_usage.pulse", pass, "personal")]),
    n("zodiac_usage", t("Optional auth + usage", "Optional auth + usage"), "storage", 2, 2, t("Tính pulse trước getUser; ghi usage khi có user. Không AI trace.", "Calculate pulse before getUser; write usage when a user exists. No AI trace."), [dr[1]], [p("pulse", "ZodiacPulse", "zodiac_deterministic.pulse", pass, "personal")], [o("response", "ZodiacResponse", "zodiac_response.response", pass, "personal")]),
    n("zodiac_response", t("Trả deterministic pulse", "Return deterministic pulse"), "output", 3, 2, t("daily_zodiac_pulse_mvp_v1 và caveats; source backend không phải LLM evidence.", "daily_zodiac_pulse_mvp_v1 and caveats; backend source is not LLM evidence."), [dr[1]], [p("response", "ZodiacResponse", "zodiac_usage.response", pass, "personal")])
  ], [
    e("daily_auth", "daily_request", "daily_auth", t("Daily context", "Daily context"), [dr[0]], ["input", "input"]),
    e("daily_prompt", "daily_auth", "hardcoded_prompt", t("Context trực tiếp", "Direct context"), [dr[0]], ["input", "input"]),
    e("daily_model", "hardcoded_prompt", "model_call", t("System + khối dữ liệu", "System + data block"), [dr[0]], ["exchange", "exchange"]),
    e("daily_usage", "model_call", "daily_usage", t("Text / fallback", "Text / fallback"), [dr[0]], ["generation", "generation"]),
    e("daily_response", "daily_usage", "daily_response", t("Usage ACK", "Usage ACK"), [dr[0]], ["response", "response"]),
    e("zodiac_calculate", "zodiac_request", "zodiac_deterministic", t("Ngày/profile", "Date/profile"), [dr[1]], ["input", "input"]),
    e("zodiac_usage", "zodiac_deterministic", "zodiac_usage", t("Pulse đã tính", "Calculated pulse"), [dr[1]], ["pulse", "pulse"]),
    e("zodiac_response", "zodiac_usage", "zodiac_response", t("Pulse + ACK", "Pulse and ACK"), [dr[1]], ["response", "response"])
  ], [traceNote, t("Hai subflow độc lập; không nối Zodiac vào LLM. Trace daily_insight không tô sáng Zodiac. Chưa lưu daily-card.", "Two independent subflows; Zodiac is not connected to an LLM. daily_insight traces cannot highlight Zodiac. Daily-card persistence is absent.")], ["daily_insight"]);

  const ar = [r(f("ai-astrology-insight")), r("supabase/functions/ai-astrology-insight/handler.ts"), r(s("astrology-lock.ts")), r(s("astrology-ai-insight.ts")), r(s("astrology-ai-insight-contract.ts")), r(s("model-router.ts")), r("packages/astrology-core/calculator.mjs"), r("packages/agent-config/astrology-ai-insight/invocation.schema.json"), r("packages/agent-config/astrology-ai-insight/response.schema.json")];
  const astrology = g("astrology", t("Astrology AI — facts đã tính", "Astrology AI — calculated facts"), ar, [
    n("chart_dependency", t("Chart deterministic từ app", "App deterministic chart"), "context", 0, 0, t("App/core tính chart; AI Insight nhận facts/contracts/revision, không tính lại hay bịa placement.", "App/core calculates the chart; AI Insight receives facts/contracts/revision without recalculating/inventing placements."), [ar[4], ar[5]], [p("birthInput", "BirthInput", "app birth profile", t("Tính deterministic chart", "Calculate deterministic chart"), "sensitive")], [o("invocation", "AstrologyInvocation", "auth_contract.invocation", pass, "sensitive")]),
    n("auth_contract", t("Auth + invocation schema", "Auth + invocation schema"), "guard", 1, 0, t("GetUser trước body; contract/schema/question và environment gate. Body length kiểm sau full text, không streaming guard Oracle.", "GetUser precedes body; contract/schema/question and environment gate. Body length is checked after full text, not Oracle's streaming guard."), [ar[0], ar[1], ar[5]], [p("invocation", "AstrologyInvocation", "chart_dependency.invocation", pass, "sensitive")], [o("invocation", "AstrologyInvocation", "access_usage.invocation", pass, "sensitive")]),
    n("access_usage", t("Premium + daily attempts", "Premium + daily attempts"), "gate", 2, 0, t("Subscription active/trialing chưa hết hạn hoặc chế độ tài khoản; đếm lượt từ đầu ngày giờ VN; hạn mức theo policy hoặc cấu hình Admin đang chạy. Chưa phải hạn mức atomic.", "Require an unexpired active/trialing subscription or the account tier policy; count attempts since the local day start (UTC+7); limit from policy or the active Admin config. Not an atomic quota."), [ar[0]], [p("invocation", "AstrologyInvocation", "auth_contract.invocation", pass, "sensitive")], [o("invocation", "AstrologyInvocation", "active_config.invocation", pass, "sensitive")]),
    n("active_config", t("Active route/prompt đúng schema", "Active route/prompt matches schema"), "prompt", 3, 0, t("Route astrology_report phải active cóID/schema đúng; global prompt active exact locale. Thiếu trả503. Raw QA capture chỉ staging Owner opt-in+encryption.", "astrology_report route requires active ID/correct schema; global prompt uses exact locale. Missing config returns503. Raw QA capture needs staging Owner opt-in+encryption."), [ar[0], ar[3]], [p("invocation", "AstrologyInvocation", "access_usage.invocation", pass, "sensitive")], [o("prepared", "AstrologyPrepared", "private_report.prepared", pass, "sensitive")]),
    n("private_report", t("Attempt + owned private report", "Attempt + owned private report"), "storage", 4, 0, t("Ghi attempted usage, report queued, đọc lại bằng reportId+userId trước provider. Write/read lỗi kết thúc; question chỉ trong memory.", "Record attempted usage, queued report, reload by reportId+userId before provider. Write/read errors end the request; question stays in memory."), [ar[0]], [p("prepared", "AstrologyPrepared", "active_config.prepared", pass, "sensitive")], [o("request", "OwnedAstrologyRequest", "selected_facts.request", pass, "sensitive")]),
    n("selected_facts", t("Chỉ allowed fact IDs", "Only allowed fact IDs"), "context", 5, 0, t("Select facts từ owned row + question memory; gửi facts/caveats/focus cần thiết, không raw birth/Journal/image retrieval.", "Select facts from the owned row and in-memory question; send required facts/caveats/focus, no raw birth/Journal/image retrieval."), [ar[0], ar[1]], [p("request", "OwnedAstrologyRequest", "private_report.request", pass, "sensitive")], [o("exchange", "ModelExchange", "model_call.exchange", pass, "sensitive")]),
    n("model_call", t("Shared Astrology Model Call", "Shared Astrology Model Call"), "model", 6, 0, t("AI Insight explicit route, strict redaction/deferred flush. Trace astrology_report cũ (trước 15/11) có thể đến từ ai-astrology-report đã gỡ; span không xác định upstream endpoint/pipeline.", "AI Insight uses explicit route and strict redaction/deferred flush. Older astrology_report traces (before 15/11) may come from the retired ai-astrology-report; spans cannot identify the upstream endpoint/pipeline."), [ar[0], ar[3]], [exchangeIn("selected_facts.exchange")], [generationOut("strict_output.generation")], "implemented-source", true),
    n("strict_output", t("Parse + schema/evidence validation", "Parse + schema/evidence validation"), "output", 7, 0, t("Chặn blocked/fallback và output bị cắt; kiểm JSON schema, fact evidence và semantics. Sai thì report failed và safe error; không trả mock answer.", "Reject blocked/fallback and truncated output; validate JSON schema, fact evidence and semantics. Failures mark the report failed and return a safe error, not a mock answer."), [ar[0], ar[1], ar[6]], [p("generation", "ModelGeneration", "model_call.generation", pass, "sensitive")], [o("insight", "ValidatedAstrologyInsight", "report_complete.insight", pass, "sensitive")]),
    n("failed_report", t("Report failed + safe error", "Failed report + safe error"), "storage", 7, 1, t("Provider/safety/parse/validation/save lỗi→safeFailure và telemetry/finalization. Stage text redacted không là node proof.", "Provider/safety/parse/validation/save failures→safeFailure and telemetry/finalization. Redacted stage text is not node proof."), [ar[0]]),
    n("report_complete", t("Lưu report completed", "Save completed report"), "storage", 8, 0, t("Lưu validated output và provenance trong input_summary của owned report. Flush trace sau validation/lưu; ghi biên nhận server sau đó, không coi root status là bằng chứng từng node.", "Save validated output and provenance in the owned report input_summary. Flush trace after validation/save, then write the server receipt; root status does not prove individual nodes."), [ar[0], r(s("answer-receipt.ts"))], [p("insight", "ValidatedAstrologyInsight", "strict_output.insight", pass, "sensitive")], [o("response", "AstrologyAiResponse", "response.response", pass, "sensitive")]),
    n("response", t("Trả validated AI Insight", "Return validated AI Insight"), "output", 9, 0, t("Trả report đã lưu và provenance ngoài schema report. App giữ đầy đủ bài và ngôn ngữ khi lưu; feedback liên kết đúng request/section, Admin phân biệt biên nhận server và nguồn client chưa xác minh.", "Return saved report with provenance outside the report schema. The app preserves the full saved answer and locale; feedback binds request/section, and Admin distinguishes server receipts from unverified client claims."), [ar[0], r("packages/ai-contracts/answer-provenance.ts"), r(f("ai-feedback")), r("supabase/functions/ai-feedback/handler.ts")], [p("response", "AstrologyAiResponse", "report_complete.response", pass, "sensitive")])
  ], [
    e("chart_auth", "chart_dependency", "auth_contract", t("Calculated invocation", "Calculated invocation"), [ar[0]], ["invocation", "invocation"]),
    e("auth_access", "auth_contract", "access_usage", t("Auth/schema đạt", "Auth/schema pass"), [ar[0]], ["invocation", "invocation"]),
    e("access_config", "access_usage", "active_config", t("Entitled + dưới limit", "Entitled + below limit"), [ar[0]], ["invocation", "invocation"], t("Subscription hợp lệ và count dưới daily limit.", "Valid subscription and count below daily limit.")),
    e("config_report", "active_config", "private_report", t("Active config đúng contract", "Active config matches contract"), [ar[0]], ["prepared", "prepared"]),
    e("report_facts", "private_report", "selected_facts", t("Owned row readback", "Owned row readback"), [ar[0]], ["request", "request"], t("Insert và owner readback thành công.", "Insert and owner readback succeed.")),
    e("facts_model", "selected_facts", "model_call", t("Selected facts + focus", "Selected facts + focus"), [ar[0]], ["exchange", "exchange"]),
    e("model_validator", "model_call", "strict_output", t("Generation", "Generation"), [ar[0]], ["generation", "generation"]),
    e("validation_fail", "strict_output", "failed_report", t("Blocked/fallback/invalid", "Blocked/fallback/invalid"), [ar[0]], null, t("Safety/provider/JSON/schema/evidence không đạt.", "Safety/provider/JSON/schema/evidence fails.")),
    e("validation_save", "strict_output", "report_complete", t("Schema + evidence đạt", "Schema + evidence pass"), [ar[0]], ["insight", "insight"], t("Output qua toàn bộ AI Insight validators.", "Output passes all AI Insight validators.")),
    e("save_fail", "report_complete", "failed_report", t("Lỗi save", "Save failure"), [ar[0]], null, t("Update owned report lỗi.", "Owned report update fails.")),
    e("save_response", "report_complete", "response", t("Completed save", "Completed save"), [ar[0]], ["response", "response"])
  ], [traceNote, t("Graph chính là ai-astrology-insight. Legacy ai-astrology-report đã gỡ khỏi app và repo (Owner quyết định 15/11); trace astrology_report cũ có thể đến từ nó: chỉ shared Model Call được overlay, không suy đường upstream.", "Main graph is ai-astrology-insight. Legacy ai-astrology-report was retired from the app and repository (Owner decision 15/11); older astrology_report traces may come from it. Both trace as astrology_report: overlay only the shared Model Call, without inferring the upstream path.")], ["astrology_report"]);

  const nr = [r(f("notification-preferences")), r(f("notification-register-device")), r(f("notification-send-test")), r(f("notification-dispatch")), r(f("notification-receipts")), r(s("notification-provider.ts"))];
  const notifications = g("notifications", t("Thông báo — inbox/push/receipts", "Notifications — inbox/push/receipts"), nr, [
    n("preferences", t("Preference của user", "User preferences"), "storage", 0, 0, t("Đọc/upsert theo user. Dispatch không đọc preference/quiet hours: không nối cạnh giả vào eligibility.", "Read/upsert for the user. Dispatch does not read preferences/quiet hours: no fake eligibility edge."), [nr[0]], [p("preference", "NotificationPreference", "user settings", pass, "personal")], [o("preference", "NotificationPreference", "user settings", pass, "personal")]),
    n("device_register", t("Register / revoke device", "Register / revoke device"), "storage", 0, 1, t("User auth; granted+token→upsert, thiếu quyền/token→revoke own device. Không hiển thị token thật.", "User auth; granted+token→upsert, missing permission/token→revoke own device. Actual tokens are never displayed."), [nr[1]], [p("device", "DeviceRegistration", "device permission/token reference", pass, "credential-reference")], [o("deviceRef", "DeviceTokenReference", "device_push_tokens", pass, "credential-reference")]),
    n("inbox_test", t("Admin in-app test riêng", "Separate Admin in-app test"), "storage", 0, 2, t("getUser+notifications.dispatch; event in_app_created+inbox+audit. Không push, không pending nên dispatch không tự lấy.", "getUser+notifications.dispatch; in_app_created event+inbox+audit. No push; not pending, so dispatch does not select it."), [nr[2]], [p("request", "NotificationTestInput", "Admin test endpoint", pass)], [o("inbox", "InboxReference", "in_app_notifications", pass)]),
    n("worker_auth", t("Admin capability + worker", "Admin capability + worker"), "guard", 1, 1, t("GetUser+notifications.dispatch rồi server service-role client. Keys/private rows không trả caller.", "GetUser+notifications.dispatch, then a server service-role client. Keys/private rows are not returned."), [nr[3]], [p("request", "DispatchRequest", "POST notification-dispatch", pass)], [o("worker", "NotificationWorker", "pending_events.worker", pass, "credential-reference")]),
    n("pending_events", t("Đọc tối đa100 pending", "Read up to100 pending"), "context", 2, 1, t("status=pending limit100. Chưa atomic claim/lease/concurrent dedupe trong source này.", "status=pending limit100. No atomic claim/lease/concurrent dedupe in this source."), [nr[3]], [p("worker", "NotificationWorker", "worker_auth.worker", pass, "credential-reference")], [o("events", "NotificationEvents", "active_tokens.events", pass, "personal")]),
    n("active_tokens", t("Active tokens + safe copy", "Active tokens + safe copy"), "context", 3, 1, t("Token active theo event.userId, locale VI hoặcEN. Chỉ token presence; không preference/quiet-hours gate.", "Active tokens by event.userId, VI or EN locale. Token presence only; no preference/quiet-hours gate."), [nr[3]], [p("events", "NotificationEvents", "pending_events.events", pass, "personal")], [o("messages", "PushMessageBatch", "expo_send.messages", t("Safe copy và token references", "Safe copy and token references"), "credential-reference")]),
    n("no_tokens", t("Không token → canceled", "No tokens → canceled"), "storage", 4, 2, t("messages rỗng thì canceled, skipped++, không gọi Expo.", "Empty messages cancel the event, increment skipped and skip Expo."), [nr[3]]),
    n("expo_send", t("Expo Push API", "Expo Push API"), "transport", 4, 1, t("sendBatch qua Expo API, không LLM/AI trace. Network lỗi đánh failed event.", "sendBatch through Expo API, no LLM/AI trace. Network errors fail the event."), [nr[3], nr[5]], [p("messages", "PushMessageBatch", "active_tokens.messages", pass, "credential-reference")], [o("tickets", "ExpoTickets", "delivery_rows.tickets", pass)]),
    n("delivery_rows", t("Lưu tickets/delivery/event", "Store tickets/delivery/event"), "storage", 5, 1, t("ok→sent, DeviceNotRegistered→invalid_token, khác→failed; event sent/partial. sent là ticket accepted, không device displayed.", "ok→sent, DeviceNotRegistered→invalid_token, otherwise failed; event sent/partial. sent means ticket accepted, not device displayed."), [nr[3]], [p("tickets", "ExpoTickets", "expo_send.tickets", pass)], [o("deliveries", "DeliveryReferences", "notification_deliveries", pass)]),
    n("receipt_worker", t("Receipt worker endpoint riêng", "Separate receipt worker endpoint"), "guard", 1, 3, t("Auth/admin worker riêng; read sent+ticket+unchecked limit100. Không tự chạy ngay sau dispatch.", "Separate auth/admin worker; read sent+ticket+unchecked limit100. Not automatically run after dispatch."), [nr[4]], [p("request", "ReceiptRequest", "POST notification-receipts", pass)], [o("ids", "ExpoTicketIds", "expo_receipts.ids", pass)]),
    n("expo_receipts", t("Đọc Expo receipts", "Read Expo receipts"), "transport", 2, 3, t("getReceipts; receipt chưa có thì bỏ qua, chờ lần gọi khác.", "getReceipts; absent receipts are skipped until another invocation."), [nr[4], nr[5]], [p("ids", "ExpoTicketIds", "receipt_worker.ids", pass)], [o("receipts", "ExpoReceipts", "receipt_updates.receipts", pass)]),
    n("receipt_updates", t("Receipt update / invalidate token", "Receipt update / invalidate token"), "storage", 3, 3, t("DeviceNotRegistered→delivery invalid_token + token invalid; ok vẫn sent, lỗi→failed; receipt_checked_at. Không delivered/displayed proof.", "DeviceNotRegistered→delivery invalid_token + token invalid; ok remains sent, errors fail; receipt_checked_at. No delivered/displayed proof."), [nr[4]], [p("receipts", "ExpoReceipts", "expo_receipts.receipts", pass)], [o("summary", "ReceiptSummary", "Admin receipt response", pass)])
  ], [
    e("worker_events", "worker_auth", "pending_events", t("Authorized worker", "Authorized worker"), [nr[3]], ["worker", "worker"], t("Auth/capability/server env đầy đủ.", "Auth/capability/server env available.")),
    e("events_tokens", "pending_events", "active_tokens", t("Mỗi pending event", "Each pending event"), [nr[3]], ["events", "events"]),
    e("tokens_absent", "active_tokens", "no_tokens", t("Không có messages", "No messages"), [nr[3]], null, t("Không active token cho user.", "No active token for the user.")),
    e("tokens_send", "active_tokens", "expo_send", t("Có active token", "Active token exists"), [nr[3]], ["messages", "messages"], t("messages.length>0; không check preference/quiet hours.", "messages.length>0; no preference/quiet-hours check.")),
    e("send_tickets", "expo_send", "delivery_rows", t("Expo tickets", "Expo tickets"), [nr[3]], ["tickets", "tickets"], t("sendBatch trả tickets; network lỗi fail event.", "sendBatch returns tickets; network errors fail the event.")),
    e("receipt_ids", "receipt_worker", "expo_receipts", t("Sent+unchecked tickets", "Sent+unchecked tickets"), [nr[4]], ["ids", "ids"]),
    e("receipt_status", "expo_receipts", "receipt_updates", t("Có receipt", "Receipt available"), [nr[4]], ["receipts", "receipts"], t("Provider có receipt; vắng thì chưa update.", "Provider receipt exists; absent receipts are not updated."))
  ], [t("Không prompt/LLM/AI trace. Preference/device/in-app test/dispatch/receipts là endpoint riêng, không giả đường execution xuyên suốt. Operational rows/audit cần kiểm riêng.", "No prompt/LLM/AI trace. Preferences/device/in-app test/dispatch/receipts are separate endpoints, not one end-to-end execution. Operational rows/audit need separate checks."), t("Dispatch chưa enforce preference/quiet hours/atomic claim; sent ticket/receipt không phải delivery/display proof.", "Dispatch does not enforce preferences/quiet hours/atomic claim; a sent ticket/receipt is not delivery/display proof.")]);

  const fr = [r("apps/mobile/App.tsx", "disabled Face Reading feature card"), r("docs/FEATURE_PRD.md", "6.6 Face Reading / Physiognomy")];
  const face = g("face_reading", t("Face Reading — Phase3", "Face Reading — Phase3"), fr, [
    n("disabled_preview", t("Card preview đang khóa", "Disabled preview card"), "trigger", 0, 0, t("Mobile card disabled, Phase3/consent; không upload hoặc gửi ảnh.", "Mobile card is disabled, Phase3/consent; no upload/image submission."), [fr[0]]),
    n("phase_three_gate", t("Chưa có backend execution", "No execution backend"), "gate", 1, 0, t("Consent/upload/image safety/vision/deletion là yêu cầu PRD chưa làm ở flow này. Không có ai-face-reading endpoint hoặc trace đã review.", "Consent/upload/image safety/vision/deletion are unimplemented PRD requirements in this flow. No reviewed ai-face-reading endpoint/trace exists."), [fr[1]], [], [], "deferred")
  ], [e("deferred_only", "disabled_preview", "phase_three_gate", t("Scope Phase3, không execution", "Phase3 scope, not execution"), fr, null, t("Card disabled; không phải executable path.", "Disabled card; not an executable path."))], [t("Không node provider hoặc kết quả giả; chỉ yêu cầu Phase3. Ngoài nghiệm thu MVP hiện tại.", "No provider node or fabricated result; Phase3 requirements only. Outside current MVP acceptance.")], [], "deferred");

  // Batch C (2026-11-24): the free daily private note and the AI tier of the reader suggestion. Both read the stored
  // draw only; neither sends the account id, nickname, history, Journal or birth data to a provider.
  const hr = r("supabase/functions/ai-tarot-reading/handler.ts");
  const nr2 = [r(f("ai-tarot-reading")), hr, r("supabase/functions/ai-tarot-reading/store.ts", "noteClaim"), r(s("tarot-note-prompt.ts")), r(s("model-router.ts"))];
  const tarotNote = g("tarot_note", t("Ghi chú riêng Tarot — 1 lần/ngày", "Private Tarot note — once a day"), nr2, [
    n("request_guard", t("Đăng nhập + drawId + công tắc", "Sign-in + drawId + switch"), "guard", 0, 0, t("Cần đăng nhập; app chỉ gửi drawId. Nghỉ khi công tắc Giải bài Tarot hoặc Ghi chú riêng Tarot tắt (503).", "Sign-in required; the app sends only drawId. Paused when the Tarot reading or private note switch is off (503)."), [nr2[0], nr2[1]],
      [p("request", "TarotNoteRequest", "POST ai-tarot-reading {action: note, drawId}", t("Chỉ drawId của lượt rút đã lưu", "Only the drawId of a stored draw"), "metadata")],
      [o("drawId", "uuid", "note_claim.drawId", t("Lượt rút của chính tài khoản", "The account's own draw"), "metadata")]),
    n("note_claim", t("Giữ lượt ghi chú (RPC)", "Note claim (RPC)"), "gate", 1, 0, t("tarot_note_claim (service role): 1 ghi chú đã giao mỗi ngày giờ Việt Nam, tính riêng với bài giải; lỗi không tốn lượt nhưng tối đa 3 lần thử/ngày; đã có ghi chú thì trả lại miễn phí.", "tarot_note_claim (service role): 1 delivered note per Vietnam day, counted apart from the reading; a failure does not use it but attempts stop at 3 a day; an existing note is replayed for free."), [nr2[2]],
      [p("drawId", "uuid", "request_guard.drawId", t("Khóa theo tài khoản", "Locked per account"), "metadata")],
      [o("draw", "StoredTarotDraw", "safety_branch.draw", t("Câu hỏi, chủ đề, kiểu trải bài, lá đã rút", "Question, topic, spread, drawn cards"), "personal")]),
    n("safety_branch", t("Nhánh an toàn", "Safety branch"), "branch", 2, 0, t("Câu hỏi khủng hoảng hoặc ngoài phạm vi: không gọi model, trả hướng dẫn hỗ trợ (115) và ghi safety event.", "Crisis or out-of-scope question: no model call; returns support guidance (115) and records a safety event."), [nr2[1]],
      [p("draw", "StoredTarotDraw", "note_claim.draw", t("Kiểm câu hỏi trước khi gọi model", "Question checked before any model call"), "personal")],
      [o("draw", "StoredTarotDraw", "note_prompt.draw", t("Chỉ khi an toàn", "Only when safe"), "personal"), o("redirect", "SafetyRedirect", "safety_reply.redirect", t("Khủng hoảng / ngoài phạm vi", "Crisis / out of scope"), "metadata")]),
    n("safety_reply", t("Trả hỗ trợ, không ghi chú", "Support reply, no note"), "output", 2, 1, t("note: null, moderationStatus blocked; không tốn lượt.", "note: null, moderationStatus blocked; does not use the note."), [nr2[1]],
      [p("redirect", "SafetyRedirect", "safety_branch.redirect", t("Cờ khủng hoảng", "Crisis flag"), "metadata")]),
    n("note_prompt", t("Prompt ghi chú ngắn", "Short note prompt"), "prompt", 3, 0, t("System cố định trong mã (VI/EN) + JSON người dùng: câu hỏi, chủ đề, kiểu trải bài, tên và vị trí lá. Không có biệt danh, lịch sử, Nhật ký, ngày sinh.", "Code-pinned system (VI/EN) + user JSON: question, topic, spread, card names and positions. No nickname, history, Journal or birth data."), [nr2[3]],
      [p("draw", "StoredTarotDraw", "safety_branch.draw", t("Dữ liệu lượt rút", "Draw data"), "personal")],
      [o("exchange", "ModelExchange", "model_call.exchange", t("System + câu hỏi và lá bài", "System + question and cards"), "personal")]),
    n("model_call", t("Model ghi chú", "Note model"), "model", 4, 0, t("Route tarot_note: OpenRouter DeepSeek v4.1 Flash, dự phòng MiMo v2.6 Flash, JSON, 700 token, 20 giây/bước. Kiểm định dạng {text, need, askThem} ngay trong router để lỗi định dạng chuyển model dự phòng; bị chặn vì an toàn thì không chuyển.", "tarot_note route: OpenRouter DeepSeek v4.1 Flash, MiMo v2.6 Flash fallback, JSON, 700 tokens, 20 s per step. The {text, need, askThem} check runs inside the router so a format failure tries the fallback; a safety block never falls through."), [nr2[4], nr2[3]],
      [p("exchange", "ModelExchange", "note_prompt.exchange", t("Không gửi mã tài khoản", "No account id sent"), "personal")],
      [o("generation", "ModelGeneration", "note_save.generation", t("Ghi chú đã kiểm hoặc lỗi", "Checked note or failure"), "personal")]),
    n("note_save", t("Lưu một lần + usage", "Write once + usage"), "storage", 5, 0, t("noteFinalize ghi note + note_created_at một lần (trigger cấm sửa); usage tarot_note_generated không có nội dung câu hỏi. Lỗi model: nhả lượt, 503 note_unavailable, không có chữ soạn sẵn.", "noteFinalize writes note + note_created_at once (the trigger forbids edits); usage tarot_note_generated holds no question text. Model failure: claim released, 503 note_unavailable, never canned text."), [nr2[2], nr2[1]],
      [p("generation", "ModelGeneration", "model_call.generation", t("Ghi chú đã qua kiểm", "Checked note"), "personal")],
      [o("response", "TarotNoteResponse", "response.response", t("Ghi chú + nextNoteAt", "Note + nextNoteAt"), "personal")]),
    n("response", t("Trả ghi chú", "Return the note"), "output", 6, 0, t("noteStatus created/replayed; 429 daily_limit_reached kèm nextNoteAt; 409 khi đang tạo.", "noteStatus created/replayed; 429 daily_limit_reached with nextNoteAt; 409 while in progress."), [nr2[1]],
      [p("response", "TarotNoteResponse", "note_save.response", t("Trả cho app", "Returned to the app"), "personal")])
  ], [
    e("guard_claim", "request_guard", "note_claim", t("drawId", "drawId"), [nr2[1]], ["drawId", "drawId"]),
    e("claim_safety", "note_claim", "safety_branch", t("Lượt rút đã giữ", "Claimed draw"), [nr2[2]], ["draw", "draw"], t("Đã giữ lượt; chưa có ghi chú hôm nay.", "Claimed; no note yet today.")),
    e("safety_prompt", "safety_branch", "note_prompt", t("An toàn", "Safe"), [nr2[1]], ["draw", "draw"]),
    e("safety_redirect", "safety_branch", "safety_reply", t("Khủng hoảng / ngoài phạm vi", "Crisis / out of scope"), [nr2[1]], ["redirect", "redirect"], t("Câu hỏi bị chặn trước model.", "Question blocked before the model.")),
    e("prompt_model", "note_prompt", "model_call", t("System + JSON", "System + JSON"), [nr2[1]], ["exchange", "exchange"]),
    e("model_save", "model_call", "note_save", t("Đạt / lỗi / bị chặn", "Passed / failed / blocked"), [nr2[1]], ["generation", "generation"]),
    e("save_response", "note_save", "response", t("Đã lưu", "Stored"), [nr2[1]], ["response", "response"])
  ], [t("Chưa nối ai trace riêng cho ghi chú; số liệu chỉ ở usage_events. Migration 20261124090000 cần Owner áp trước khi chạy.", "No dedicated AI trace for the note yet; numbers live in usage_events only. Migration 20261124090000 must be applied by the Owner first.")]);

  const rr = [r(f("ai-tarot-reading")), hr, r(s("reader-router.ts")), r(s("providers/decisions.ts")), r("packages/content/data/personas-archetypes.json")];
  const readerRouter = g("reader_router", t("Gợi ý người đọc — tầng AI", "Reader suggestion — AI tier"), rr, [
    n("request_guard", t("Đăng nhập + ứng viên + hạn mức", "Sign-in + candidates + quota"), "guard", 0, 0, t("Cần đăng nhập; drawId + 1–7 slug người đọc miễn phí trong danh sách cho phép (khác: 400). Công tắc reader_router; 20 lần/ngày.", "Sign-in required; drawId + 1–7 free reader slugs from the allowlist (otherwise 400). reader_router switch; 20 a day."), [rr[0], rr[1]],
      [p("request", "ReaderSuggestRequest", "POST ai-tarot-reading {action: suggest_reader, drawId, candidates}", t("drawId và slug ứng viên", "drawId and candidate slugs"), "metadata")],
      [o("draw", "StoredTarotDraw", "reader_state.draw", t("Lượt rút đã lưu", "Stored draw"), "personal")]),
    n("reader_state", t("Trạng thái gửi đi (tối thiểu)", "Outgoing state (minimal)"), "context", 1, 0, t("Chỉ câu hỏi, chủ đề, kiểu trải bài, tên lá (tiếng Anh) và mô tả người đọc ứng viên. Không mã tài khoản, biệt danh, lịch sử, Nhật ký hay ngày sinh. Câu hỏi khủng hoảng: dừng, slug null.", "Only question, topic, spread, card names (English) and candidate reader descriptions. No account id, nickname, history, Journal or birth data. Crisis question: stop, slug null."), [rr[2], rr[4]],
      [p("draw", "StoredTarotDraw", "request_guard.draw", t("Dữ liệu lượt rút", "Draw data"), "personal")],
      [o("state", "ReaderState", "decision_call.state", t("Câu hỏi + lá + ứng viên", "Question + cards + candidates"), "personal"), o("fallbackState", "ReaderState", "chat_fallback.state", t("Cùng dữ liệu cho bước chat", "Same data for the chat step"), "personal")]),
    n("decision_call", t("API quyết định (jev)", "Decision API (jev)"), "model", 2, 0, t("Bước 1: OpenRouter Decisions typesafe/jev-1.14, 3 giây; chỉ trả một lựa chọn, không có văn bản. Hình dạng API theo tài liệu, chưa gọi thật; chính sách dữ liệu của jev chưa được kiểm chứng.", "Step 1: OpenRouter Decisions typesafe/jev-1.14, 3 s; returns one choice, no text. API shape from the docs, not yet called live; jev's data policy is unverified."), [rr[3], rr[2]],
      [p("state", "ReaderState", "reader_state.state", t("Gửi tới nhà cung cấp quyết định", "Sent to the decision provider"), "personal")],
      [o("choice", "ReaderChoice", "choice_check.choice", t("slug + độ tin cậy", "slug + confidence"), "metadata")]),
    n("chat_fallback", t("Model chat dự phòng", "Chat fallback"), "model", 2, 1, t("Bước 2 khi bước 1 lỗi: OpenRouter DeepSeek v4.1 Flash, JSON {slug, intent, confidence}, 3 giây.", "Step 2 when step 1 fails: OpenRouter DeepSeek v4.1 Flash, JSON {slug, intent, confidence}, 3 s."), [rr[2]],
      [p("state", "ReaderState", "reader_state.fallbackState", t("Cùng dữ liệu tối thiểu", "Same minimal data"), "personal")],
      [o("choice", "ReaderChoice", "choice_check.fallbackChoice", t("slug + ý định", "slug + intent"), "metadata")]),
    n("choice_check", t("Kiểm lựa chọn + 4 giây", "Choice check + 4 s"), "branch", 3, 0, t("slug phải nằm trong danh sách ứng viên; tổng ngân sách 4 giây (áp trong mã). Sai, hết giờ hoặc lỗi: slug null, source none — app dùng gợi ý theo luật.", "The slug must be one of the candidates; total budget 4 s (enforced in code). Wrong, late or failed: slug null, source none — the app keeps its rule-based suggestion."), [rr[2]],
      [p("choice", "ReaderChoice", "decision_call.choice", t("Lựa chọn bước 1", "Step 1 choice"), "metadata"), p("fallbackChoice", "ReaderChoice", "chat_fallback.choice", t("Lựa chọn bước 2", "Step 2 choice"), "metadata")],
      [o("suggestion", "ReaderSuggestion", "usage_log.suggestion", t("slug/null + nguồn", "slug/null + source"), "metadata")]),
    n("usage_log", t("Ghi usage", "Usage record"), "storage", 4, 0, t("usage reader_router_suggested: nguồn, model, slug, độ trễ; không có nội dung câu hỏi.", "usage reader_router_suggested: source, model, slug, latency; no question text."), [rr[1]],
      [p("suggestion", "ReaderSuggestion", "choice_check.suggestion", t("Kết quả", "Result"), "metadata")],
      [o("response", "ReaderSuggestion", "response.response", t("Trả cho app", "Returned to the app"), "metadata")]),
    n("response", t("Trả gợi ý", "Return suggestion"), "output", 5, 0, t("{slug, confidence, intent, source}; 429 reader_router_daily; 503 khi tạm nghỉ.", "{slug, confidence, intent, source}; 429 reader_router_daily; 503 when paused."), [rr[1]],
      [p("response", "ReaderSuggestion", "usage_log.response", t("Gợi ý", "Suggestion"), "metadata")])
  ], [
    e("guard_state", "request_guard", "reader_state", t("Lượt rút", "Draw"), [rr[1]], ["draw", "draw"]),
    e("state_decision", "reader_state", "decision_call", t("Trạng thái tối thiểu", "Minimal state"), [rr[2]], ["state", "state"]),
    e("state_chat", "reader_state", "chat_fallback", t("Khi bước 1 lỗi", "When step 1 fails"), [rr[2]], ["fallbackState", "state"], t("Bước quyết định lỗi hoặc hết giờ.", "Decision step failed or timed out.")),
    e("decision_check", "decision_call", "choice_check", t("Lựa chọn", "Choice"), [rr[2]], ["choice", "choice"]),
    e("chat_check", "chat_fallback", "choice_check", t("Lựa chọn dự phòng", "Fallback choice"), [rr[2]], ["choice", "fallbackChoice"]),
    e("check_usage", "choice_check", "usage_log", t("Gợi ý hoặc null", "Suggestion or null"), [rr[1]], ["suggestion", "suggestion"]),
    e("usage_response", "usage_log", "response", t("Trả về", "Return"), [rr[1]], ["response", "response"])
  ], [t("Chi phí API quyết định chỉ ghi trong usage metadata, chưa có trong bảng giá hay ai trace. Khóa OPENAI_API_KEY / GEMINI_API_KEY cần Owner đặt nếu dùng hai nhà cung cấp đó.", "Decision API cost is only in usage metadata, not in the price book or AI traces. OPENAI_API_KEY / GEMINI_API_KEY must be set by the Owner to use those providers.")]);

  // 2026-11-25 (B1-B8): Numerology "Lời nhắn riêng". Premium, signed-in, one delivered message a Vietnam day (3 attempts).
  // The app sends computed numbers and block ids only; the name and birth date never leave the phone. Switch seeded off.
  const nm = [r(f("ai-numerology-message")), r("supabase/functions/ai-numerology-message/handler.ts", "createNumerologyMessageHandler"),
    r(s("feature-switch.ts"), "featureEnabledStrict"), r(s("daily-attempts.ts"), "claimDeliveredAttempt"), r(s("numerology-blocks.ts"), "resolveNumerologyBlocks"),
    r(s("numerology-message-prompt.ts"), "checkNumerologyMessageText"), r(s("model-router.ts")), r("packages/content/data/numerology-blocks.json")];
  const numerologyMessage = g("numerology_private_message", t("Lời nhắn riêng Thần số học — Premium, 1 lần/ngày", "Numerology private message — Premium, once a day"), nm, [
    n("request_guard", t("Đăng nhập (không ẩn danh)", "Sign-in (not anonymous)"), "guard", 0, 0, t("Cần tài khoản đã đăng nhập, không ẩn danh (401). Thân yêu cầu chưa được đọc ở bước này.", "A signed-in, non-anonymous account is required (401). The body is not read yet."), [nm[0], nm[1]],
      [p("request", "NumerologyMessageRequest", "POST ai-numerology-message", t("Chỉ con số đã tính + mã khối nội dung, sau hộp đồng ý trên app", "Computed numbers + content block ids only, after the in-app consent box"), "personal")],
      [o("userId", "UserId", "access_gate.userId", t("Tài khoản đã xác thực", "Verified account"))]),
    n("access_gate", t("Công tắc + duyệt nội dung + Premium", "Switch + content review + Premium"), "gate", 1, 0, t("Đọc công tắc kiểu nghiêm (thiếu dòng hoặc lỗi = tắt): 503 feature_paused. Nội dung numerology-blocks chưa duyệt (review khác approved hoặc chưa có người duyệt): 503 content_not_approved. Không phải Premium: 403 premium_required. Không tốn lượt.", "Strict switch read (missing row or error = off): 503 feature_paused. Numerology blocks not approved (review not approved or no reviewer): 503 content_not_approved. Not Premium: 403 premium_required. No attempt is used."), [nm[1], nm[2], nm[4]],
      [p("userId", "UserId", "request_guard.userId", t("Tài khoản", "Account"))],
      [o("userId", "UserId", "attempt_claim.userId", t("Chỉ khi được phép", "Only when allowed"))]),
    n("attempt_claim", t("Giữ lượt trong ngày", "Daily attempt claim"), "gate", 2, 0, t("usage_events numerology_message_attempted bằng JWT của chính người dùng: 1 lời nhắn đã giao + tối đa 3 lần thử mỗi ngày giờ Việt Nam; hết lượt: 429 daily_limit_reached kèm nextMessageAt.", "usage_events numerology_message_attempted with the caller's own JWT: 1 delivered message + at most 3 attempts per Vietnam day; otherwise 429 daily_limit_reached with nextMessageAt."), [nm[3]],
      [p("userId", "UserId", "access_gate.userId", t("Tài khoản", "Account"))],
      [o("userId", "UserId", "block_resolve.userId", t("Đã ghi một lần thử", "One attempt recorded"))]),
    n("block_resolve", t("Kiểm yêu cầu + lấy khối nội dung", "Request check + block lookup"), "context", 3, 0, t("Đọc thân có giới hạn rồi kiểm hợp đồng chặt: version 1, chỉ khóa cho phép, con số đúng dạng, tối đa 16 mã khối không lặp (sai: 400, lần thử đã tính). Chữ của từng khối lấy từ numerology-blocks.json theo ngôn ngữ; không có họ tên, ngày sinh hay tuổi.", "Bounded body read, then a strict contract: version 1, allowed keys only, well-formed numbers, at most 16 distinct block ids (otherwise 400, attempt counted). Each block's text comes from numerology-blocks.json in the chosen language; no name, birth date or age."), [nm[1], nm[4], nm[7]],
      [p("userId", "UserId", "attempt_claim.userId", t("Tài khoản", "Account"))],
      [o("blocks", "ResolvedBlock[]", "message_prompt.blocks", t("Con số + chữ của các khối đã gửi", "Numbers + text of the sent blocks"), "personal")]),
    n("message_prompt", t("Prompt lời nhắn", "Message prompt"), "prompt", 4, 0, t("Hướng dẫn trong prompt-library (numerology_private_message_system, chưa sửa được ở Admin) + luật khóa trong mã. Dữ liệu người dùng là một khối JSON ghi rõ không phải chỉ dẫn.", "Guide from prompt-library (numerology_private_message_system, not Admin-editable yet) + code-locked rules. User data is one JSON block labelled as not instructions."), [nm[5], r("packages/agent-config/prompt-library.json")],
      [p("blocks", "ResolvedBlock[]", "block_resolve.blocks", t("Khối đã duyệt", "Approved blocks"), "personal")],
      [o("exchange", "ModelExchange", "model_call.exchange", t("System + JSON dữ liệu", "System + data JSON"), "personal")]),
    n("model_call", t("Model lời nhắn", "Message model"), "model", 5, 0, t("Route numerology_private_message: OpenRouter DeepSeek v4.1 Flash, dự phòng MiMo v2.6 Flash, JSON, 600 token, 20 giây/bước, tổng 40 giây. Không thuộc chiến dịch model. Kiểm đầu ra chạy trong router để lỗi định dạng thử model dự phòng.", "numerology_private_message route: OpenRouter DeepSeek v4.1 Flash, MiMo v2.6 Flash fallback, JSON, 600 tokens, 20 s per step, 40 s total. Not part of model campaigns. The output check runs inside the router so a format failure tries the fallback."), [nm[6], nm[1]],
      [p("exchange", "ModelExchange", "message_prompt.exchange", t("Không gửi mã tài khoản", "No account id sent"), "personal")],
      [o("generation", "ModelGeneration", "output_check.generation", t("Văn bản + metadata", "Text + metadata"), "personal")]),
    n("output_check", t("Kiểm lời nhắn", "Message check"), "branch", 6, 0, t("JSON {message, blockIds}: 3–5 mã trong số đã gửi, 20–140 từ, không từ cấm (tiền, bệnh, định mệnh, hợp, sẽ…). Không đạt: 503 message_unavailable, không có chữ soạn sẵn. Bị chặn an toàn: ghi safety event, không thử lại.", "JSON {message, blockIds}: 3–5 ids from those sent, 20–140 words, no banned words (money, illness, destiny, compatible, will…). Failure: 503 message_unavailable, never canned text. Safety block: safety event, no retry."), [nm[5], nm[1]],
      [p("generation", "ModelGeneration", "model_call.generation", t("Đầu ra model", "Model output"), "personal")],
      [o("message", "NumerologyMessage", "usage_log.message", t("Lời nhắn đã kiểm", "Checked message"), "personal"), o("blocked", "SafetyBlock", "safety_event.blocked", t("Bị chặn an toàn", "Safety block"))]),
    n("safety_event", t("Ghi safety event", "Safety event"), "storage", 6, 1, t("safety_events (feature chat, blocked_topic) với tóm tắt không có nội dung; 503 retryable false.", "safety_events (feature chat, blocked_topic) with a content-free summary; 503 retryable false."), [nm[1]],
      [p("blocked", "SafetyBlock", "output_check.blocked", t("Lý do chặn", "Block reason"))]),
    n("usage_log", t("Ghi usage, không lưu lời nhắn", "Usage record, message not stored"), "storage", 7, 0, t("usage numerology_message_generated: phiên bản prompt, ngôn ngữ, số khối, model. Không lưu lời nhắn, con số hay mã khối; không có bảng lưu lời nhắn.", "usage numerology_message_generated: prompt version, language, block count, model. No message, numbers or block ids are stored; there is no message table."), [nm[1]],
      [p("message", "NumerologyMessage", "output_check.message", t("Chỉ đếm", "Counts only"), "personal")],
      [o("response", "NumerologyMessageResponse", "response.response", t("Lời nhắn + nextMessageAt", "Message + nextMessageAt"), "personal")]),
    n("response", t("Trả lời nhắn", "Return the message"), "output", 8, 0, t("{message, blockIds, language, model, nextMessageAt}; app hiện một lần, không lưu.", "{message, blockIds, language, model, nextMessageAt}; the app shows it once and keeps nothing."), [nm[1]],
      [p("response", "NumerologyMessageResponse", "usage_log.response", t("Trả cho app", "Returned to the app"), "personal")])
  ], [
    e("guard_access", "request_guard", "access_gate", t("Tài khoản", "Account"), [nm[1]], ["userId", "userId"]),
    e("access_claim", "access_gate", "attempt_claim", t("Được phép", "Allowed"), [nm[1]], ["userId", "userId"], t("Công tắc bật, nội dung đã duyệt, Premium.", "Switch on, content approved, Premium.")),
    e("claim_blocks", "attempt_claim", "block_resolve", t("Đã giữ lượt", "Attempt claimed"), [nm[3]], ["userId", "userId"]),
    e("blocks_prompt", "block_resolve", "message_prompt", t("Khối đã duyệt", "Approved blocks"), [nm[4]], ["blocks", "blocks"]),
    e("prompt_model", "message_prompt", "model_call", t("System + JSON", "System + JSON"), [nm[1]], ["exchange", "exchange"]),
    e("model_check", "model_call", "output_check", t("Đầu ra", "Output"), [nm[1]], ["generation", "generation"]),
    e("check_safety", "output_check", "safety_event", t("Bị chặn", "Blocked"), [nm[1]], ["blocked", "blocked"], t("moderationStatus blocked.", "moderationStatus blocked.")),
    e("check_usage", "output_check", "usage_log", t("Đạt", "Passed"), [nm[1]], ["message", "message"]),
    e("usage_response", "usage_log", "response", t("Trả về", "Return"), [nm[1]], ["response", "response"])
  ], [t("Công tắc numerology_private_message tắt sẵn; migration 20261125090000 và việc deploy ai-numerology-message cần Owner duyệt. Nội dung numerology-blocks còn bản nháp nên hàm trả content_not_approved. Trace ghi theo feature numerology_private_message nhưng chưa gắn vào sơ đồ này.", "The numerology_private_message switch is seeded off; migration 20261125090000 and deploying ai-numerology-message need Owner approval. The numerology blocks are still a draft, so the function answers content_not_approved. Traces are written under numerology_private_message but are not bound to this graph.")]);

  // Field-level ports supplement aggregates; these names describe data use only,
  // never expose example private values or turn the graph into an executor.
  const fieldNode = (feature, id) => feature.nodes.find((item) => item.id === id);
  const tarotGuard = fieldNode(tarot, "request_guard");
  const tarotCards = fieldNode(tarot, "canonical_cards");
  const tarotPrompt = fieldNode(tarot, "prompt_messages");
  for (const [name, type, usage, privacy] of [
    ["selectedCards", "TarotSelection[]", t("ID/order/reversed/orientation đã được app chọn; validate trước enrichment", "App-selected ID/order/reversed/orientation; validate before enrichment"), "personal"],
    ["spread", "TarotSpread", t("Spread quyết định count/position labels; không để LLM chọn", "Spread determines count/position labels; the LLM does not choose it"), "metadata"],
    ["question", "string|null", t("Câu hỏi bounded trong user data, không system instruction", "Bounded question as user data, not a system instruction"), "personal"],
    ["language", "Locale", t("EN hoặc VI mặc định sau normalization", "EN or default VI after normalization"), "metadata"],
    ["deck", "DeckIdentifiers|null", t("Chỉ deck ID/slug, không tự fetch art hoặc nội dung ngoài", "Deck ID/slug only, no art or external-content fetch"), "metadata"],
    ["topic", "string", t("Topic bounded, mặc định open", "Bounded topic, default open"), "personal"]
  ]) {
    tarotGuard.outputs.push(o(name, type, "canonical_cards." + name, usage, privacy));
    tarotCards.inputs.push(p(name, type, "request." + name, usage, privacy));
    if (name !== "selectedCards") {
      if (!tarotCards.outputs.some((port) => port.name === name)) tarotCards.outputs.push(o(name, type, "prompt_messages." + name, usage, privacy));
      tarotPrompt.inputs.push(p(name, type, "canonical_cards." + name, usage, privacy));
    }
  }
  tarotCards.outputs.push(o("selectedCards", "CanonicalTarotCard[]", "prompt_messages.selectedCards", t("ID/name/uprightMeaning/reversedMeaning/reflectionQuestion/orientation/position từ dataset chuẩn", "Canonical ID/name/uprightMeaning/reversedMeaning/reflectionQuestion/orientation/position"), "personal"));
  tarotPrompt.inputs.push(p("selectedCards", "CanonicalTarotCard[]", "canonical_cards.selectedCards", t("Giữ đúng nghĩa theo orientation; LLM không thêm/đổi/rút lá", "Use meanings for the given orientation; the LLM cannot add/change/draw cards"), "personal"));
  const requestCardsEdge = tarot.edges.find((item) => item.id === "request_cards");
  for (const name of ["selectedCards", "spread", "question", "language", "deck", "topic"]) requestCardsEdge.mappings.push({ from: name, to: name, usage: tarotCards.inputs.find((port) => port.name === name).usage });
  // Batch C1 (22/11): server-built reading guide, derived from the drawn cards and bundled content only.
  tarotCards.outputs.push(o("readingGuide", "TarotReadingGuide", "prompt_messages.readingGuide", t("Máy chủ tự dựng từ lá đã rút: spreadGuide (mỗi vị trí hỏi gì, quan hệ giữa các vị trí, hai lá đáng chú ý nhất), cardFacts (đếm lá Ẩn chính, lá ngược, bộ, nguyên tố, số lặp, lá cung đình, lá Át), topicMeanings (nghĩa theo chủ đề Tình cảm/Công việc/Bản thân của từng lá theo chiều đã rút). Không có lịch sử, nhật ký hay ngày sinh", "Built by the server from the drawn cards: spreadGuide (what each position asks, how positions relate, the two cards that matter most), cardFacts (counts of Major Arcana, reversed cards, suits, elements, repeated numbers, court cards, aces), topicMeanings (each card's love/career/self meaning in its drawn orientation). No history, journal or birth data")));
  tarotPrompt.inputs.push(p("readingGuide", "TarotReadingGuide", "canonical_cards.readingGuide", t("Giúp AI đọc các lá thành một câu chuyện và trả lời thẳng câu hỏi; không đổi lá hay nghĩa lá", "Helps the model read the cards as one story and answer the question directly; never changes cards or meanings")));
  const cardsPromptEdge = tarot.edges.find((item) => item.id === "cards_to_prompt");
  for (const name of ["selectedCards", "spread", "question", "language", "deck", "topic", "readingGuide"]) cardsPromptEdge.mappings.push({ from: name, to: name, usage: tarotPrompt.inputs.find((port) => port.name === name).usage });
  for (const [feature, composerId, edgeId] of [[tarot, "prompt_messages", "prompt_to_model"], [persona, "system_stack", "system_model"], [council, "roster", "roster_model"], [daily, "hardcoded_prompt", "daily_model"], [astrology, "selected_facts", "facts_model"]]) {
    const composer = fieldNode(feature, composerId), model = fieldNode(feature, "model_call"), link = feature.edges.find((item) => item.id === edgeId);
    for (const [name, type, usage] of [
      ["system", "string", t("System prose theo feature và guardrails đã mô tả; không hiển thị raw prompt runtime", "Feature system prose and described guardrails; raw runtime prompts are not displayed")],
      ["messages", "ModelMessage[]", t("User/assistant data theo context boundary của feature, không copy raw payload vào graph", "User/assistant data following the feature context boundary; no raw payload copied into the graph")]
    ]) {
      composer.outputs.push(o(name, type, "model_call." + name, usage, "sensitive"));
      model.inputs.push(p(name, type, composerId + "." + name, usage, "sensitive"));
      link.mappings.push({ from: name, to: name, usage });
    }
    model.inputs.push(
      p("primaryRoute", "ProviderModelReference", "readActiveModelRoute.primaryProvider/primaryModel", t("Lần gọi primary nếu input safety cho phép", "Primary attempt when input safety permits")),
      p("fallbackRoute", "ProviderModelReference|null", "readActiveModelRoute.fallbackProvider/fallbackModel", t("Chỉ thử fallback khi route có cấu hình và shouldFallback cho phép lỗi; không song song. Route có steps dùng model_route_versions.steps thay cho cặp này (cột vẫn bằng 2 bước đầu)", "Try fallback only when configured and shouldFallback permits the error; never in parallel. Routes with steps use model_route_versions.steps instead (the columns still equal the first two steps)")),
      p("fallbackWhen", "string[]", "ModelRoute.fallbackWhen", t("Allowlist lỗi provider quyết định nhánh fallback", "Allowed provider errors decide the fallback branch"))
    );
    model.outputs.push(o("attempts", "ModelAttempt[]", "generation.attempts; ai_trace_spans llm.<provider>.primary/fallback", t("Metadata các lần thử; fallback có thể sau primary lỗi. ok không chứng minh schema/persistence/quality", "Attempt metadata; fallback may follow a failed primary. ok does not prove schema/persistence/quality")));
  }
  fieldNode(oracle, "context_compile").inputs.push(
    p("question", "string", "request.userMessage", t("Câu hỏi hiện tại bounded, user role", "Bounded current question, user role"), "personal"),
    p("historyConsent", "boolean", "request.consentFlags.history", t("Phải true mới dùng sanitizedHistory; false không silently grant consent", "Must be true to use sanitizedHistory; false does not silently grant consent")),
    p("profileConsent", "boolean", "request.consentFlags.profile", t("Phải true mới dùng profile; Journal/birth flags không thay thế", "Must be true to use profile; Journal/birth flags cannot substitute")),
    p("history", "OracleHistory[]", "request.sanitizedHistory", t("Tối đa8 khi consent; không truncate âm thầm", "At most8 with consent; no silent truncation"), "sensitive"),
    p("profile", "OracleProfile", "request.profile", t("Nickname/goals/tone chỉ nếu profile consent; không Journal/birth data", "Nickname/goals/tone only with profile consent; no Journal/birth data"), "personal")
  );
  fieldNode(oracle, "context_compile").outputs.push(
    o("system", "string", "compiled.preview.system", t("Core→Feature→Locale→Tone pinned candidate; provider vẫn đóng", "Pinned candidate Core→Feature→Locale→Tone; provider remains closed")),
    o("messages", "ModelMessage[]", "compiled.preview.messages; no provider dispatch", t("Chỉ context được cho phép và current question; không có Model Call", "Only permitted context and current question; no Model Call"), "sensitive")
  );
  const catalog = {
    schemaVersion: 1, version: "nilaza-admin-workflow-source-v1", reviewedAt: "2026-11-25",
    features: [oracle, persona, council, tarot, daily, notifications, astrology, face, tarotNote, readerRouter, numerologyMessage],
    sourceDigests: [
  {
    "path": "supabase/migrations/20260909014614_ai_trace_observability.sql",
    "sha256": "8794f35ab9724c18e2dda617f5bc3b1031bd16af067dff70a9cf1ef321e769bc"
  },
  {
    "path": "apps/mobile/App.tsx",
    "sha256": "ec1c19cc2718f10e58c294411c45ecc2c25b1bd419f008c749e19aae1e255da3"
  },
  {
    "path": "docs/FEATURE_PRD.md",
    "sha256": "10a40762e2716facb1e8d823d1cb1bac389e9bf2d2ce3a97c1e6c6791dd6bc39"
  },
  {
    "path": "packages/agent-config/astrology-ai-insight/invocation.schema.json",
    "sha256": "0f38beaff4a00ca7930591478ace37503a4aa6e41290a5dba200d4a1e2b42f7a"
  },
  {
    "path": "packages/agent-config/astrology-ai-insight/response.schema.json",
    "sha256": "9d5351426e95d8f51e9995e04922c6ea0d11ec02e4a00d37a46bf7525b096d79"
  },
  {
    "path": "packages/agent-config/council-contract.json",
    "sha256": "8b568a077d9f9988721970679405eb3e641739cd542c6d70c37a6323438b77f8"
  },
  {
    "path": "packages/agent-config/prompt-library.json",
    "sha256": "eb64e7ae297c122c119dc24f879217e986f80463a25c4113cf263e5885e5daa6"
  },
  {
    "path": "packages/astrology-core/calculator.mjs",
    "sha256": "3adb482e0adaf91b36ea29285ffa5325c0ed63ed0b1050cef7a28ef17aee459b"
  },
  {
    "path": "packages/content/data/tarot-cards.json",
    "sha256": "dadfbeb7b9bc11d27d95534897f55b76ed3914d7b1657febf2c26a90f3560dfd"
  },
  {
    "path": "supabase/functions/_shared/ai-request-guard.ts",
    "sha256": "cf1204cae48dac9cfc718dd93f5b4d2a93efffefef03b12fae0f73f680dae056"
  },
  {
    "path": "supabase/functions/_shared/ai-trace.ts",
    "sha256": "1a251f9d6ce09b12d87313e1af353d90a9d69f495908e14b564765cc48c96fdc"
  },
  {
    "path": "supabase/functions/_shared/astrology-ai-insight-contract.ts",
    "sha256": "1f92e788cb4027d2c1b2d76b29a690a68160e10f8a0634b20a380b91435d9eda"
  },
  {
    "path": "supabase/functions/_shared/astrology-lock.ts",
    "sha256": "7173a2c2fe5aa4841c64dea77f4c981e104b4ce800adc3559e069ec46a94d59d"
  },
  {
    "path": "supabase/functions/_shared/astrology-ai-insight.ts",
    "sha256": "26bb18c88c9287168bda279a9218fd6bdc50f97ee5f43aa90b2fc857cca2b5f6"
  },
  {
    "path": "supabase/functions/_shared/model-provider.ts",
    "sha256": "94c4ccb76841da405d0d596b2345617ad74ef3c559fe1b44e3ed10ce595f84cf"
  },
  {
    "path": "supabase/functions/_shared/model-router.ts",
    "sha256": "6df41b89af38cf2622aed394a02e3c8b401af2e720ee68964aab04785c790140"
  },
  {
    "path": "supabase/functions/_shared/notification-provider.ts",
    "sha256": "509d961c7b34ed91ece8f4c9572fdfc2283855953d0ef46374add93ccf406134"
  },
  {
    "path": "supabase/functions/_shared/oracle-runtime.mjs",
    "sha256": "2cb113ce48f9d4d2241fc08d30f1fce01970beef409a38a68741da980f8555a8"
  },
  {
    "path": "supabase/functions/_shared/persona-prompt-assembler.ts",
    "sha256": "d49e0f7eb32844619c1db0bf73db44ace3bf1419006782d62b19347dc1af4f06"
  },
  {
    "path": "supabase/functions/_shared/prompt-composition/compose.mjs",
    "sha256": "0f9a08609a0861fb37dd81ce0fd6969a938c8adab2cc7284b9ef4fd8e742b215"
  },
  {
    "path": "supabase/functions/_shared/tarot-content.ts",
    "sha256": "89ada11b0c1fa8a8442c22615cbca83f6b3277d984a21065042f8a7f3e19672e"
  },
  {
    "path": "supabase/functions/_shared/tarot-prompt.ts",
    "sha256": "42572eadba66265c51e3780c974152609cd5a7402f4a37f8321898eff9719d80"
  },
  {
    "path": "supabase/functions/ai-astrology-insight/handler.ts",
    "sha256": "5e61a25a019758269508560a2222b27c40216c549a496c6b698c57e6c5e7a0a8"
  },
  {
    "path": "supabase/functions/ai-astrology-insight/index.ts",
    "sha256": "23a5851267a3e11ed6d693ed063ba61c097263567ca62ef8c85dbf9208cfaa6c"
  },
  {
    "path": "supabase/functions/ai-council/index.ts",
    "sha256": "a5801ab92f199972dae11ad1b04f919f510f9be3f58367b85358609d947877b7"
  },
  {
    "path": "supabase/functions/ai-daily-insight/index.ts",
    "sha256": "178061f80041b4516ae7813d2d7e04815bc09feb5ea319230ebff5aa849a91cd"
  },
  {
    "path": "supabase/functions/ai-daily-zodiac-pulse/index.ts",
    "sha256": "ca5ed58f95fba71f083c82259a3e5d6f36c68048c8d0fda97251f4a8aded4bfa"
  },
  {
    "path": "supabase/functions/ai-oracle-turn/handler.ts",
    "sha256": "6c5788da0f0bb0cff37f9315ba24d520aa08ef22e0516697f47458f71525c0fc"
  },
  {
    "path": "supabase/functions/ai-oracle-turn/index.ts",
    "sha256": "63db8a1730e896597dd830e0cf93fd23128d6ae1c9cf9dfccae72948f9a16805"
  },
  {
    "path": "supabase/functions/ai-persona-chat/index.ts",
    "sha256": "1d43b4b2c299a007d786cfc1153a10187029428b816c803e57f9b0fab7e3f180"
  },
  {
    "path": "supabase/functions/ai-tarot-reading/draw.ts",
    "sha256": "82a5e91a377a382842a967d1af13d7cfa7bd4656312043db916b4f084e601abd"
  },
  {
    "path": "supabase/functions/ai-tarot-reading/handler.ts",
    "sha256": "eb9d33b8c69f57a74018136b616ad27231569a41a502353eb55411477b276f75"
  },
  {
    "path": "supabase/functions/ai-tarot-reading/index.ts",
    "sha256": "6fb84138cd806b64830509ccc94e817a8e0d2fbb4466638d547bad7359cbd3ac"
  },
  {
    "path": "supabase/functions/ai-tarot-reading/store.ts",
    "sha256": "67402a934c6bc406d392a5917e86f3964f44a2406cd1dd3684b2811b8054d391"
  },
  {
    "path": "supabase/functions/notification-dispatch/index.ts",
    "sha256": "743cde8e146955f637f805cd85fa4284e16dce6e154116df916912c0c99fcb83"
  },
  {
    "path": "supabase/functions/notification-preferences/index.ts",
    "sha256": "9f9ab87b20274fe24e09619b0a03d79b3ea66b652fbc1a3a5f3bb112d85b841b"
  },
  {
    "path": "supabase/functions/notification-receipts/index.ts",
    "sha256": "22577867b54c2b381cc2e21b1424dd74f9e7797bbc5d5390f866fc8cf61a0a93"
  },
  {
    "path": "supabase/functions/notification-register-device/index.ts",
    "sha256": "be077a5244c28883343f5450eebde58dba8b248d9850c2b16b46b87e53e05c7e"
  },
  {
    "path": "supabase/functions/notification-send-test/index.ts",
    "sha256": "11c62ebd86bddb4b413761050b7e6d6891777d356b3d6d3ee0882e3732106d6a"
  },
  {
    "path": "packages/ai-contracts/tarot-output.ts",
    "sha256": "564186f7c367604d4edc52a102839d3435a21770fb332086ebd752112495dd0e"
  },
  {
    "path": "packages/ai-contracts/answer-provenance.ts",
    "sha256": "389edb7786d339f364d23fb571902543393a5ae34af183d2287b755a6cf906d2"
  },
  {
    "path": "supabase/functions/_shared/answer-receipt.ts",
    "sha256": "129e17e3c19b8492728b5c851698cba8952363ff7e3c3201f77d25ea3c72ea85"
  },
  {
    "path": "supabase/functions/ai-feedback/index.ts",
    "sha256": "0099accdad5e74b3038a76dee8467c81deeb6a8ede6b72bcb59f5009fa3fbf88"
  },
  {
    "path": "supabase/functions/ai-feedback/handler.ts",
    "sha256": "76a4bb3c3f7e4e5662fe1b4a6ddd9aa70f8d3750f5d5db226da394b78cdcd9e1"
  },
  {
    "path": "supabase/functions/_shared/tarot-note-prompt.ts",
    "sha256": "dbc1e65625887629d9be95a9d657736b2ab0058e14405e919cb78623037aae6a"
  },
  {
    "path": "supabase/functions/_shared/reader-router.ts",
    "sha256": "f2831ee724126991cb28bdacd55ec8f5c87deb81aba552509f142a1293307291"
  },
  {
    "path": "supabase/functions/_shared/providers/decisions.ts",
    "sha256": "0979ea6db0bb25eb89af171c4d44a2a947a93cd71131408e487a5d5e91bb538a"
  },
  {
    "path": "packages/content/data/personas-archetypes.json",
    "sha256": "8dc12fdcf91b5e7ad889adc6d66742945e0c4e7d4a10375f95dee24e6bf06e9e"
  },
  {
    "path": "supabase/functions/ai-numerology-message/index.ts",
    "sha256": "e66d9d11438aa696d30af4b0ec4f022ecb6f53961f2d4fec517f9b118c1fcf5a"
  },
  {
    "path": "supabase/functions/ai-numerology-message/handler.ts",
    "sha256": "6f27c82c6a8545618fc7ca5558ff873617b1d47d8bf76a48084ab209e3ddeb52"
  },
  {
    "path": "supabase/functions/_shared/feature-switch.ts",
    "sha256": "45b6f6c4a320b9cf1fa95091e346418860b6bc47406822288eb8f16a53569731"
  },
  {
    "path": "supabase/functions/_shared/daily-attempts.ts",
    "sha256": "1f9473c14d8b165750f0a12f06466f7a2517127c00a5f7b4e10dd265fbccef7d"
  },
  {
    "path": "supabase/functions/_shared/numerology-blocks.ts",
    "sha256": "afa58748e822b7b27a0fa94d639f154324f696bf5d70008c07ed2973ce71b059"
  },
  {
    "path": "supabase/functions/_shared/numerology-message-prompt.ts",
    "sha256": "7363accc84bd37c274bbfc0bbb3f2be7541c8b455b42f97b40be487160abfe6b"
  },
  {
    "path": "packages/content/data/numerology-blocks.json",
    "sha256": "918d9cea12a8c34a18edd969c0a45f2b76507bf6c77206a5c929ba243f3d84a8"
  }
]
  };
  const freeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  const getGraph = (id) => typeof id === "string" ? catalog.features.find((feature) => feature.id === id) || null : null;
  const scopeKeys = ["accountId", "target", "traceId", "featureId"];
  const validScope = (scope) => scope && typeof scope === "object" && !Array.isArray(scope)
    && scopeKeys.every((key) => typeof scope[key] === "string" && scope[key].length > 0 && scope[key].length <= 2048 && scope[key].trim() === scope[key]);
  const spanStatuses = ["running", "ok", "error", "blocked", "fallback"];
  function projectTraceEvidence(featureId, detail, scopes) {
    const feature = getGraph(featureId);
    const result = {
      status: "not-observed", traceId: null,
      nodes: feature ? Object.fromEntries(feature.nodes.map((item) => [item.id, { status: "not-observed", spans: [] }])) : {},
      edges: feature ? Object.fromEntries(feature.edges.map((item) => [item.id, "not-observed"])) : {},
      note: t("Source review; chưa có matching span. Tất cả cạnh và các bước khác chưa quan sát được.", "Source review; no matching span. All edges and other stages remain unobserved.")
    };
    const reject = () => { result.status = "rejected"; result.note = t("Từ chối evidence: scope/feature/trace/redaction không khớp hoặc dữ liệu sai.", "Evidence rejected: scope/feature/trace/redaction mismatch or invalid data."); return freeze(result); };
    if (!feature || !validScope(scopes?.observed) || !validScope(scopes?.current)
      || !scopeKeys.every((key) => scopes.observed[key] === scopes.current[key])
      || scopes.current.featureId !== featureId) return reject();
    const run = detail?.run;
    if (!run || typeof run !== "object" || Array.isArray(run) || run.trace_id !== scopes.current.traceId
      || !feature.traceFeatures.includes(run.feature) || run.redaction_mode !== "redacted"
      || !Array.isArray(detail.spans) || detail.spans.length > 256) return reject();
    result.traceId = run.trace_id;
    // Root output/status, attributes, arbitrary stage strings, metrics and payloads
    // never become execution proof. Only matching names/statuses are copied.
    const safeSpans = [];
    for (const span of detail.spans) {
      if (!span || typeof span !== "object" || Array.isArray(span)) continue;
      // Canonical protected RPC filters by trace_id_input but omits trace_id in
      // each returned span. A supplied conflicting trace_id is never accepted.
      if (span.trace_id !== undefined && span.trace_id !== run.trace_id) return reject();
      if (!providerSpans.includes(span.span_name) || !spanStatuses.includes(span.status)) continue;
      safeSpans.push({ name: span.span_name, status: span.status });
    }
    for (const item of feature.nodes) {
      if (!item.traceSpanNames.length) continue;
      const spans = safeSpans.filter((span) => item.traceSpanNames.includes(span.name));
      if (!spans.length) continue;
      const statuses = [...new Set(spans.map((span) => span.status))];
      result.nodes[item.id] = { status: statuses.length === 1 ? statuses[0] : "mixed", spans };
      result.status = "observed";
    }
    if (result.status === "observed") result.note = t("Recorded span · writer origin chưa xác minh. Chỉ Model Call có record llm.* phù hợp. Authenticated client có thể ghi trace; ok là trạng thái do writer ghi, không chứng minh provider thực thi/output hợp lệ/chất lượng/lưu/cloud deploy. Tất cả cạnh chưa quan sát được.", "Recorded span · writer origin unverified. Only Model Call has matching llm.* records. Authenticated clients can write traces; ok is a writer-recorded status, not proof of provider execution/valid output/quality/persistence/cloud deployment. All edges remain unobserved.");
    return freeze(result);
  }
  freeze(catalog);
  return Object.freeze({ catalog, getGraph, projectTraceEvidence });
});
