# Astrology AI insight contract

Status: **Edge Function v6 is active on Staging QA; authenticated calls reached OpenRouter and received model responses, but the two latest app calls were rejected by the response validator (HTTP 502). A complete user-visible AI answer is not yet verified**. The route is active with JWT verification and uses `qwen/qwen3-235b-a22b-2507`. The temporary `manual_qa` entitlement expires at `2026-09-26T17:33:47Z`. Migration-ledger clearance is complete.

`contract.json` is the canonical contract index for the premium Astrology AI layer. It binds one request schema, one response schema, the deterministic chart versions it can interpret, the server entitlement boundary, and the privacy/safety policies. The JSON schemas are executable allowlists; unknown properties fail validation.

## Product boundary

The free experience can calculate and explain a deterministic chart without this contract. The premium AI guide may combine selected chart facts into a personalized reflection and answer a current question. It may interpret only facts supplied by the calculator and may never create or correct a placement itself.

Every interpretation block carries `evidenceFactIds`. Those IDs must resolve to facts in the request and must be included in `selectedFactIds`. This lets the UI highlight the exact placements, aspect, or house behind an AI statement and lets the server reject unsupported output.

Confidence describes the stability of a calculated fact under the supplied inputs. It is not scientific confidence in astrology and must not be presented as such.

## Privacy boundary

The request is built from an allowlist. Do not serialize the canonical chart object directly. In particular, never copy its `time` block, location provenance, coordinates, timezone, account identifiers, journal entries, or private chat history into this request.

Allowed runtime context is limited to:

- opaque request and report IDs;
- chart and calculation versions;
- selected placements, aspects, and houses with confidence and caveat codes;
- one sanitized current-focus question with `current_focus_only` consent.

`userFocus.sanitizedQuestion` must be scrubbed before the contract is created. The validator catches obvious birth dates, clock times, coordinates, timezone strings, journal references, and forbidden property names. That lint is a backstop, not a substitute for a server-side allowlist mapper and redaction.

## Authenticated invocation and required server sequence

1. The mobile invocation sends only a canonical chart projection, selected fact IDs, current focus, and consent version. Raw birth date/time/place, coordinates, timezone, journal, and chat are excluded by the invocation schema.
2. Authenticate the user and enforce `premium_astrology_ai` plus the per-user daily attempt limit on the server. Owner tier preview never authorizes this endpoint.
3. Store the sanitized chart projection as an `astrology_reports` row whose `user_id` comes from the authenticated JWT, then reload it with both report ID and user ID filters. Never trust client-supplied ownership.
4. Moderate and sanitize the current question. Keep it in memory for this generation only; do not write it to the report, usage event, or trace. Do not add Journal or private chat context.
5. Select only requested fact IDs from the owned report and send them with a published locale prompt and a model route whose response schema is `astrology_ai_insight_v1`.
6. Parse output and validate the response schema plus every evidence and caveat reference. Reject local fallbacks and malformed output as failed AI requests.
7. Store the response on the owned report and return calculation, prompt, route, moderation, and disclaimer metadata. Users can delete Astrology AI reports through chart deletion and the birth-data clear action.

The response contract deliberately separates `patterns`, `tensions`, and focus-specific sections. All language must remain reflective, avoid fixed predictions, and preserve calculation caveats. A blocked moderation result should use a separate safe error envelope rather than fabricating a successful insight response.

The Edge Function adds output bounds derived from the canonical response schema to the system instructions. If parsing or response validation rejects model output, a `usage_events` row records only the request ID and a coarse stage (`json_parse` or `response_validation`); it never stores the prompt, chart facts, generated text, or validator details.

## Validation

From the repository root:

```powershell
npm run astrology:ai-contract:check
npm run astrology:ai-contract:test
```

The check compiles both JSON schemas, validates the canonical fixtures, enforces privacy field names, and verifies semantic references and version parity. The tests cover raw birth/journal rejection, invented evidence, unknown selected facts, unsafe current-focus text, and version mismatch.

## Whole-app impact and rollback

- **Entry point:** premium action from the unified chart story with explicit consent; Owner tier preview remains local and never calls the endpoint.
- **Data writes:** the authenticated function stores selected chart facts and the validated interpretation in a user-owned `astrology_reports` row, and writes an attempt counter to `usage_events`. The current question is omitted from both.
- **Backend:** `/ai/astrology-insight` and the mobile client are implemented; the JWT-verified function, v3 OpenRouter route, and bilingual prompts are active on Staging QA. Provider invocation succeeds, but the current end-to-end response still fails application validation. A `manual_qa` entitlement is active for the supplied test account until `2026-09-26T17:33:47Z`.
- **Admin/observability:** Admin Studio identifies the current route and schema and offers a local contract preflight. Provider traces force redaction; rejection telemetry stores only the parse/validation stage, not the question, fact values, model output, or validator details.
- **Safety/privacy:** allowlist-only request, evidence-bound output, calculation caveats, symbolic-reflection disclaimer.
- **Rollback:** disable the premium action and retain the deterministic chart story.
- **Intentionally untouched:** production configuration, provider secret values, and migration push/repair. The only entitlement change is a temporary `manual_qa` grant for the UI test account; the endpoint stops accepting it after the recorded expiry.
