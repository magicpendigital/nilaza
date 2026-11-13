---
name: nilaza-ai-runtime
description: Change or debug Nilaza AI features end to end - prompts, model routes, providers and fallback, the context each Edge Function sends to a model, quotas and switches, output checks, and live QA trace diagnosis. Use for persona chat, Oracle, Tarot AI, Astrology AI, Council, daily insight, or any Admin AI Studio setting; pair with nilaza-plan-qc.
---

# Nilaza AI Runtime

Apply `$nilaza-plan-qc` first (session start, preflight, approval boundary). Then read, as the task needs:
- `docs/proposals/ADMIN_REDESIGN_2026-11-03.vi.md` sections 3–4: which Admin fields reach a model and which context each function drops.
- `docs/proposals/LLM_PROVIDERS_FALLBACK_2026-11-03.vi.md`: current router behavior, error classes, provider privacy, approved rollout. Owner decisions 2026-11-04: phase 0 (OpenRouter only) approved; direct-provider order Anthropic → Gemini (paid key only) → OpenAI → DeepSeek; nickname may be sent to persona chat; Tarot 1 AI reading per day.
- `docs/AI_TRACE_OBSERVABILITY.md` for traces.

## Where things live

- Router and providers: `supabase/functions/_shared/model-router.ts` (`readActiveModelRoute`, `generateWithModelRoute`, `defaultModelRoutes`), `_shared/model-provider.ts` (timeouts, error mapping), `_shared/providers/*.ts`. Code defaults mirror `packages/agent-config/model-routing.json`.
- Prompts: `prompt_versions` in the database with `packages/agent-config/prompt-library.json` as fallback; generated consumers via `npm run prompt:consumers:generate` (never edit generated copies). Persona assembly: `_shared/persona-prompt-assembler.ts`; Tarot: `_shared/tarot-prompt.ts`; Astrology insight: Admin-published VI+EN prompt.
- Switches and quotas: `_shared/feature-switch.ts` (`ai_feature_switches`), `packages/agent-config/account-tier-policy.json`, `ai-usage-policy.json`, `_shared/ai-usage-operation.ts`.
- Mobile callers: `apps/mobile/src/backendClient.ts`; request bodies are built in `apps/mobile/App.tsx` and feature hooks.

## Rules learned in live QA (2026-10-31 .. 11-03)

- Trace one failing request end to end before changing anything: request body → assembled prompt → route and model → provider response (finish reason, tokens, reasoning tokens) → output check → what the app showed. Reading a production or QA trace needs the Owner's approval each time.
- Validate output inside the router path so a format failure can try the fallback model; a check that runs after the router only falls back to canned text.
- Reasoning models can spend the whole token budget on hidden reasoning: set reasoning per feature and size `maxOutputTokens` and timeouts together; total attempts must stay under the 150 s Edge limit.
- Do not force JSON mode on models that degrade with it; prefer tolerant parsing plus a validator that names the failing field.
- A safety block never falls through to another model. Crisis replies show the 115 card.
- Every model call needs sign-in, a quota and a switch; a function with optional auth is a cost leak.
- Send only context the prompt uses; never send journals or birth data a function ignores. Sensitive features use providers or OpenRouter routes with `zdr` and `data_collection: "deny"`.
- Canned fallback text is always labelled as fallback in the app; never present it as AI.
- A field Admin can edit must have a runtime consumer; otherwise hide it or mark it "not applied".

## Checks

`npm run validate:backend`, `npm run ai-operations:test`, `npx --yes deno@2 test supabase/functions/<function>`, `npm run prompt:consumers:check`, `npm run council:contract:check`, `npm run astrology:ai-contract:check`, `npm run admin:check` and `npm run admin:test` when Admin changes, mobile type check and tests when request bodies change. Deploying a function, publishing a route or prompt to a live project, and setting provider keys are Owner-approved actions. Report what was verified locally, what needs a deployed QA run, and the cost and privacy effect.
