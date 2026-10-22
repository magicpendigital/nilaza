# Admin focus/blank-page fix — Plan/QC

- Goal: Model Router interactions/focus checks retain scroll and never leave an unexplained blank iframe.
- Entry: shared workspace focus, visibility and capability refresh; impacts AI Studio and Content Operations.
- Root cause in code: refresh clears authorization on every focus; inline CSS sets body display:none, collapsing scroll geometry. Failed checks leave the body hidden with no recovery UI; overlapping checks invalidate each other.
- Plan: geometry-preserving visibility gate, visible checking/error/retry overlay; coalesce overlapping checks with bounded timeout and generation invalidation; keep fresh authorization for all actions. No retained access on failure.
- Data/backend: no writes, schema, tokens, API keys, roles or publish changes. Existing Auth/RPC contract unchanged.
- Privacy: protected content remains hidden/non-interactive while unverified; no auth error details/tokens logged. No new analytics.
- Rollback: revert shared guard and CSS changes; no migration.
- Untouched: mobile, model routes, LLM adapters, seed content, admin business actions.
- Acceptance: scroll does not collapse on refresh; concurrent focus/request shares one check; invalidated checks cannot restore access; failures show retry; owner can open both workspaces and use read-only Model Router check.
- Validation: admin tests/check, data validation; browser owner interaction and read-only connection check. No route publish or paid call.

Foreground refinement: hiding even with visibility:hidden cancels the click which focuses the iframe. Keep an already-authorized view visible while refreshing, but clear action authority immediately and require actions to await the fresh result. Initial load, hidden-tab invalidation and failed/denied verification still hide protected content. This is not cached permission for requests.

## Results

- Browser before fix: authenticated owner shell, empty AI Studio iframe reproduced.
- Browser after fix: Model Router renders; the Check connection click runs (not swallowed); backend returned connected for production project uannkrywhxzrulufgqvx. Focusing the endpoint input retained the content and input focus. Content Operations overview and Personas route also rendered as owner.
- Live read-only diagnostic: OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY and OPENROUTER_API_KEY all reported missing. No credentials, route configuration or private user data changed; no paid AI calls.
- 25 admin tests passed; admin contract/seed and data validation passed; scoped diff whitespace check passed. Tests include overlapping focus checks, visibility invalidation and geometry-preserving CSS. A screenshot capture timed out, so no pixel-level scroll-offset measurement is claimed.
