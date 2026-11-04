---
name: ai-feature-runtime
description: Build, change or debug features that call an LLM - prompts and their versions, model routes, providers and fallback chains, the context sent to the model, quotas, kill switches, output validation, cost and privacy, and live-QA trace diagnosis. Use with plan-qc for any AI feature or AI admin setting.
---

# AI feature runtime

Apply `plan-qc` first. Record in the feature plan which model call changes, what context it sends, and its cost and privacy effect.

## Non-negotiables for every model call
- Runs on the backend only; provider keys live in the backend secret store, never in the client or the database.
- Requires sign-in, a per-user quota, and a kill switch the admin can flip.
- Has a timeout per attempt and a total budget below the platform's request limit.
- Has a fallback chain: primary model, fallback model(s), then a canned reply **labelled as fallback** in the UI, never presented as AI.
- A safety refusal or crisis classification never falls through to another model; it returns the safe/crisis response.
- Sends only the context the prompt uses. Sensitive data (journals, health, birth data, minors) goes only to providers or routes configured for zero data retention and no training.
- Every prompt is versioned with one canonical source; generated copies are never edited by hand.

## Fallback design
Classify errors before choosing to fall back: transient (5xx, timeout, network) → next step and count toward a circuit breaker; rate limit or credits (429/402) → next step and cool the model down using `retry-after`; auth/config (401/403, unknown model) → next step and alert the admin; context too long → only to a larger-context step; malformed output (empty, truncated, invalid structure) → next step once — so output validation must run **inside** the router, not after it; other 400s → fail fast. Keep circuit-breaker state where all server instances see it (database), cached briefly per instance. No hedged duplicate requests for paid models. Make the fallback step the same price or cheaper unless the Owner approves otherwise.

## Debugging a live failure
Trace one failing request end to end before changing code: request body → assembled prompt → route and model → provider response (finish reason, output tokens, hidden reasoning tokens, latency) → output validation (name the failing field) → what the user saw. Reading production traces or user content needs Owner approval each time. Common causes: reasoning models spending the whole token budget on hidden reasoning; forced JSON mode degrading output; timeouts sized for fast models; validation outside the fallback path; optional auth leaving a cost leak.

## Admin configuration
Every admin field (prompt, route, temperature, tokens, timeout, quota, switch, safety rule) must have a runtime consumer, show its live value read back from the server, publish with a confirmation that summarizes the change, keep version history with restore, and run a sample set before publishing.

## Checks
Unit tests for prompt assembly and output validation; contract checks for generated prompt consumers; an authenticated staging run when an endpoint's behavior changes; a sample-set comparison when a model or prompt changes. Deploying functions, publishing routes or prompts to a live environment, and setting provider keys are Owner-approved actions.
