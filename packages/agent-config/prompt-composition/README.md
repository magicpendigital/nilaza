# Local prompt composition preview

Status: **packaged preview and provider-gated backend source candidate** (2026-10-03). Admin's fictional Oracle preview and the local Oracle Edge source candidate now consume byte-identical generated copies of this canonical compiler. No provider activation or bundle publish API is added. The existing full VI/EN Oracle records in `../prompt-library.json` retain their IDs/history; the older deployed QA function is unchanged. Passing local tests does not establish deployed parity, model behavior or production readiness.

Use the reviewed preflight runner with `--script prompt:consumers:generate` to package both consumers, then `npm run prompt:consumers:check`. Outputs are fixed under `apps/admin/generated/prompt-composition/` and `supabase/functions/_shared/prompt-composition/`; never edit them independently. Hosted Admin verifies the manifest and checksums. Browser copies contain generic non-confidential seed rules, are statically downloadable and must never contain private operator prompts or user records. Private configuration requires protected backend resources.

`bundle.mjs` is the single canonical atomic bundle: a pinned manifest plus the exact common core, Oracle feature, locale overlays, and bounded tone presets. `bundle.schema.json` describes that complete artifact. Objects and returned previews are deeply frozen. Each module has an ID, independent version, and pinned SHA-256 of its exact UTF-8 content; the test suite verifies digests and every manifest reference. A bundle-wide digest covers `serializeBundlePayload()` (recursively sorted object keys, preserved array order, UTF-8 JSON without a final newline; the digest field is excluded). `version-locks.json` is an append-only review ledger binding each bundle version to that payload digest. These hashes provide local provenance and change detection, not runtime authentication of downloaded artifacts.

Core and feature content are authored once in English and are identical for VI and EN; the locale overlay controls the response language. The order is always **core → feature → locale → tone**. Locale selection is an exact registry match: only `vi` and `en` are enabled. `th` is a disabled registry example with no translation or promised rollout. `VI`, `vi-VN`, `en-US`, disabled `th`, missing locales, and unknown locales fail explicitly; nothing falls back silently. Tone is limited to `balanced`, `gentle`, or `direct` and expands only to reviewed static content.

```js
import { composePromptPreview, PROMPT_BUNDLE } from "./compose.mjs";

const preview = composePromptPreview({
  bundleVersion: PROMPT_BUNDLE.manifest.version,
  feature: "oracle_router",
  locale: "vi",
  tone: "gentle",
  question: "Mình muốn nhìn lại điều đã giúp mình bình tĩnh hôm nay."
});
// preview.system: reviewed modules only
// preview.messages: separate role/content objects
// preview.provenance: pinned bundle and all module versions/digests
// preview.budget.tokens.status: "not-assessed"
// preview.providerReady: false (always; this API is a local preview)
```

Both ESM files use only standard JavaScript and web `TextEncoder`; they have no Node imports, package dependencies, I/O, retrieval, logging, storage, or provider calls. Node and a browser can import the same source. The test runner uses Node built-ins separately.

## Input and privacy boundary

Every request must identify its bundle version, feature, locale, and non-empty question. Optional `bundleId` and `bundleSha256` must match. Optional `expectedModuleVersions` must name **all four** `core`, `feature`, `locale`, `tone` versions exactly; mismatches fail. Unknown fields, getters, non-data lists, arbitrary system/developer/tool history, and free-text tone selection are rejected.

`question`, `history`, and `context` never become system instructions. History accepts only `{ role: "user" | "assistant", content: string }`, preserves supplied order, and requires `consent.history === true` when non-empty. An optional context message uses a user role and a deterministic JSON envelope. The whitelist is `currentScreen` (`home`, `explore`, `chat`, `journal`, `profile`, `oracle`) and `profile` (`nickname`, up to five `goals`). Profile fields require `consent.profile === true`. Context keys use fixed output order regardless of input key order. Text stays unchanged as data; this boundary reduces instruction mixing but does not prove that a model resists prompt injection.

Consent flags are explicit per-request caller assertions, **not verified user permission**. A future authenticated caller must verify scope and consent and supply only the current conversation's authorized history. This composer cannot retrieve anything. Journal memory, birth profiles, raw other-conversation chat, uploads, retrieval summaries, and arbitrary memory fields are unsupported and rejected even when someone tries to attach a consent flag. A Journal suggestion does not imply memory consent or a save. Fixtures are fictional and contain no user records.

## Size guard and token acceptance

Manifest limits bound each module, system, question, history message/count, context fields/message, combined input messages, and complete request. **`chars` counts Unicode code points; `utf8Bytes` measures encoded bytes. Neither is a token count.** Conservative character/byte guards run before tokenization and reject oversized input instead of silently truncating it. Reported request size sums content only; token framing overhead is checked separately.

The complete envelope is capped at **2,000 input tokens per attempt**, following approved G1 (`../ai-usage-policy.json`, version `g1-2026-10-02`). The manifest pins that source, byte-level SHA-256, schema/version and cap; tests compare the canonical policy and reject a 2,001-token envelope in every enabled locale. Combined inputs are also capped at 2,000, and module/system limits remain subordinate to the complete envelope cap. This does not activate G1 runtime accounting or show that any actual request fits; a real matched tokenizer is still required. The canonical policy's activation remains separately gated.

Token status stays `not-assessed` unless a tokenizer is injected. Supply a real tokenizer matched to the target provider/model, with version identity and synchronous counters:

```js
const tokenizer = {
  id: "<reviewed-tokenizer-and-version>",
  model: "<exact-provider-model>",
  countText: text => realTokenizer.countText(text),
  countMessages: messages => realTokenizer.countCompleteEnvelope(messages)
};
const preview = composePromptPreview(input, { tokenizer });
```

`countMessages` receives the full frozen envelope, including system role and all messages, and must account for that model's role/framing overhead. Async, negative, non-integer, or failing counters are rejected; accidental rejected async results/throws are drained and replaced by static errors to avoid raw-error leaks. Budget failures stop composition. The composer trusts the injected implementation and cannot verify its model match or accuracy. Tests inject clearly labeled synthetic counters to verify mechanics, **not to measure real tokens**. No tokenizer or model is installed. A token-passed preview still has `providerReady: false`; endpoint output budget, response schema, tool overhead, moderation, and real model evaluation are future integration gates.

## Review and future integration gates

Run from the repository root:

```powershell
node --test scripts/prompt-composition.test.mjs
node --check packages/agent-config/prompt-composition/compose.mjs
node --check packages/agent-config/prompt-composition/bundle.mjs
```

Tests cover pinned digests and the atomic schema, enabled languages sharing common content, deterministic ordering/provenance, unsupported and disabled locales, version/enum mismatch, consent and field/role rejection, untrusted text staying in message roles, size limits before token counters, and token limits with an injected counter. They do not call providers or measure translation/response quality.

Before any runtime or publish integration, prepare a separate reviewed plan and require all of these gates:

1. **Atomic schema and provenance:** validate the complete bundle, unique IDs, exact module pins, digests, compatible request/response contracts, provider/model tokenizer, input/output budgets, consent enforcement, and rollback. Publish the entire validated bundle/version transactionally; never promote individual language or core fragments independently.
2. **Evaluation:** use fictional/synthetic safety, self-harm support, professional-advice refusal, identity/IP transparency, context consent, injection, and routing cases; assess real outputs and schemas. Static content checks are insufficient.
3. **Every enabled language:** evaluate each language, tone, and relevant feature after a common-core or feature edit. A new language stays disabled until native-language review, typography, safety and token/response checks pass. Keep earlier immutable bundle versions available; create new versions rather than changing content under existing IDs/versions.
4. **Clean QA:** use a clean reviewed source state and isolated preview/staging environment, reset stale drafts/caches, record exact bundle and module digests plus real evaluation evidence, and keep old screenshots apart from current evidence. Then validate both protected Admin workspaces, local fallback, and authorized app/backend requests. Database migration and production publishing remain separate owner gates.

Rollback for this foundation is removal of these isolated files; no live consumer changes. Nilaza Plan & QC remains current for this work: the existing protocol already requires versioned canonical prompt sources, explicit trust/consent boundaries, scoped validation, and distinct integration/release gates.
