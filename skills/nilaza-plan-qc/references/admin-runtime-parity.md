# Admin Runtime and Release Parity

Use this reference for Admin configuration, shared AI prompt consumers, or requests to synchronize local and online behavior. Resolve paths from the Nilaza repository root. Read the current task report and migration ledger for environment-specific status; the principles below do not declare a particular deployment ready.

## Trace Configuration to Its Consumer

For each editable setting, record the UI control, draft store, protected publish API/RPC, immutable active revision, runtime resolver, and observable effect. A successful GET proves a read path; a sample editor or localStorage save does not prove backend persistence. Confirm that fetched data actually hydrates the edited buffer and that the runtime consumes every supported field. Label unsupported controls as preview/read-only, with a reason, rather than implying that they affect live answers.

Keep evidence states distinct: browser draft, backend loaded, revision published, runtime verified. The workflow canvas is a description until an execution engine is demonstrated. Secret presence is not provider health; static test output is not a measured evaluation. An unavailable metric must not appear as zero or a pass.

Manager acceptance should include editing one supported setting, reviewing the diff and exact target, publishing where authorized, reading back the revision, verifying that a new app request used it, then restoring a known-good snapshot as a new revision. Record untested steps without inferring success from unit tests or older traces.

## Preserve Publish and Draft Boundaries

- Freeze the reviewed feature, section, locale, backend target, base revision and payload. After permission/session refresh awaits and immediately before dispatch, reject a changed selection, payload or target and require a fresh review. Tests should delay those awaits and mutate the selection; no incorrect request may be sent.
- Recheck authorization in the protected backend. Use atomic publication, expected-revision conflict checks, idempotency and audit/readback for shared configuration. A disabled UI alone does not enforce backend access or concurrency.
- Scope browser drafts by verified account and target as well as feature/locale. Keep draft fields separate from active records. On a response, retain edits created after the submitted snapshot instead of clearing them. Migration of older unscoped drafts must not silently attach private/operator work to a different account or environment.
- Preserve null/disabled values and supported policy fields through load/edit/publish. Do not replace a backend value with a sample default merely because the form lacks an option.
- Preserve Content Operations, AI Studio and Growth Operations when changing the shared shell. Review entry points, browser history and reload with the same feature/section/locale selection.

## Share the Effective Prompt

Use one canonical compiler for Admin preview and backend input. Package or generate consumers from that source and validate byte/version parity; do not maintain a second prompt assembler in the UI. Core, feature, one enabled locale overlay and approved persona/tone modules belong to one immutable bundle with exact version/hash pins. Publish the complete bundle atomically and keep previous revisions; do not combine independently selected latest fragments.

Bind each compiled preview and its errors to the exact feature, locale, approved tone, fictional question and bundle revision/hash. Invalidate them when any input changes through a control, URL, shell navigation or compiler reload, including a feature-away-and-back path. Require an explicit Compile action before showing a new result; rendering the editor must not silently compile or present an earlier assembly under a new selection. Keep the fictional sample in RAM only, outside URL, browser storage, publish payloads and backend requests. Regression-test EN compilation → Content workspace → Oracle URL with VI: the retained iframe may keep its RAM sample, but no EN result may appear under VI, and the next result must require Compile. Also test direct feature navigation, tone/question edits and a changed bundle revision.

User question, history and approved context remain separate from system instructions. The authenticated caller verifies consent and conversation ownership; a caller-provided consent flag alone is insufficient. Reject unsupported context and history roles. A new language needs its own reviewed overlay, UI/content support and safety/quality fixtures, while shared core/feature content remains single-source.

Read input/output limits and activation state from the canonical usage policy. Count the complete envelope with a tokenizer matched to the exact provider/model, including role/framing overhead. Character or byte guards are size checks, not token measurements. Without a matched tokenizer, report token status as unassessed and keep provider activation gated. Synthetic counters and static safety checks validate mechanics; they do not establish response quality, cost or prompt-injection resistance. A common-core change requires evaluation in every enabled locale.

## Read-Only Workflow Graphs

A per-feature graph is a reviewed display contract derived from source, not an execution engine. Keep typed input/output ports, source/use references and labeled data/control/conditional edges tied to a source revision or freshness hashes. Recheck references when implementation changes; a current local hash does not prove deployed-source parity. Keep candidate, source-wired, deferred and runtime-observed states separate. Face Reading remains deferred, Notifications is non-LLM, and deterministic card/chart computation must not be depicted as invented LLM output. An enabled-looking legacy inspector control does not establish that its field is consumed.

Runtime observations require explicit, sanitized stage/span events under a versioned mapping and a verified producer boundary. Check actual grants, RLS and write paths: an own-user insert policy identifies the row owner, not a trusted event producer, and a protected read RPC does not authenticate who wrote its records. Where clients can create trace rows or writer origin is unverified, label matching spans as recorded metadata with origin unverified; do not treat them as proof of provider execution. Only verified, trusted server-only provenance can substantiate the corresponding call, still without proving parsing, persistence or client rendering.

Accept only fixed known stage names/statuses and bounded correlation/duration metadata; ignore unknown or redacted values. Never project raw input/output/debug/QA payloads or private text into node details, labels, edge conditions, URLs or browser storage. A root success, active route, secret presence or successful GET cannot mark intermediate nodes/branches as executed. Missing instrumentation is an explicit evidence gap, not an inferred skipped/failed step. If the current sanitizer removes stage identities, keep the node unobserved; extending instrumentation or hardening trace write permissions needs a separate reviewed backend/database contract and privacy gate.

Scope evidence to the exact graph feature, selected trace, verified account and initialized transport target. Bind the target to verified transport identity rather than a mutable label or ENV value. If URL/key configuration changes, fail closed, clear sensitive state and require a fresh initialization or reload before further reads; recheck around authorization, token and request/response awaits. Test new reads after target mutation as well as late responses, including restoration of the old configuration without a reload.

Invalidate retained evidence and in-flight load responses through all feature/trace/account/target, URL/shell/workspace, session and capability changes; re-entering a screen must not restore observations from a different scope. Test delayed responses, cross-feature traces, unknown stage objects, redacted payloads and absent instrumentation with synthetic fixtures. Reuse existing protected metadata reads; graph navigation must not dispatch providers, publish configuration or trigger QA reveal.

## Keep QA Reveal Ephemeral

Raw QA payload access requires the environment, role, consent/capture and retention controls declared by the current trace contract. Default to metadata/redacted views. Do not persist raw payloads in browser drafts, shared snapshots or public evidence.

Invalidate retained reveals and in-flight permission/network responses when leaving the view through any navigation path, switching trace/filter/feature/account/target, hiding payloads or clearing the session. Returning to the same trace must require a new authorized reveal/audit. Use delayed-response fixtures to verify this lifetime; avoid exposing real private data merely to test navigation. Verify server TTL and actual purge scheduling before enabling capture; a UI hide is not deletion.

## Report Synchronization by Layer

| Layer | Evidence needed for synchronization | Common limit and required note |
| --- | --- | --- |
| Repository to installed development skills | Reviewed manifest hashes, source validation, sync result and installed drift check | This installs instructions on one machine. It does not upload skills, deploy code or enable them in another agent environment. Reconcile existing installed edits instead of silently overwriting them. |
| Local and hosted frontend | Exact reviewed artifact/version, deployment READY, stable alias verification, target configuration and browser happy paths | Build-time config, cache and origin differ. Compare artifact bytes where applicable and verify effective hosted config separately; a preview pass does not prove the stable alias was promoted. |
| Shared compiler/generated consumers | Canonical source pins plus generated-file byte/contract checks | A copied local consumer is not deployed. Record consumer packaging and deployed version separately. |
| Backend functions and AI configuration | Correct project/endpoint, deployed source/revision, authenticated readback and request trace provenance | Frontend deployment does not deploy Edge Functions, apply migrations, publish prompts or activate providers. |
| Database and user content | Reviewed migrations/RLS, explicitly approved target, account-isolation and save/load/delete acceptance | Ledger divergence blocks generic push/repair. Preserve old evidence and use the approved forward path; do not copy foreign schema or private records as a synchronization shortcut. |
| Browser drafts/session | Origin, account/target scope, persistence/migration policy and explicit import/export behavior if provided | localhost and hosted origins have separate storage and cookies. Do not promise automatic transfer; raw private state and tokens must not be put in URL parameters or deployment artifacts. |
| Native mobile | New build/runtime identity, artifact checksum and device acceptance | Web or Admin changes do not replace an installed APK/IPA. Follow the current release policy for binaries/OTA rather than assuming a live web refresh updates phones. |
| Public docs and internal operations docs | Source/export parity, approved corpus and access checks | Help/legal may be public; owner/Agent/prompt documents and QA evidence remain protected. A static hosting UI guard does not make shipped files private. |

For every unsynchronized layer, state what differs, why, user impact, evidence collected, the next concrete action and its gate. Record rollback for code, configuration and data independently. Deployment authority comes from the user's authorized scope and the current release gate, not from an agent role or a passing preflight.
