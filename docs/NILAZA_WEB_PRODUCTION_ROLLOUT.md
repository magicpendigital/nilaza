# Nilaza Public Web & Help Center — Production Rollout

Last updated: 2026-10-04 (official domain decision; historical staging evidence below is unchanged).

Organization domain: `magicpendigital.com`. Nilaza official website: `https://nilaza.magicpendigital.com`. This updates the local rollout target; it does not establish a live DNS, TLS or production deployment result.

## Implemented architecture

- `apps/web`: one Astro static site for marketing and public Help Center.
- `nilaza.magicpendigital.com/{vi,en}`: product story and conversion pages.
- `nilaza.magicpendigital.com/{vi,en}/help`: curated end-user documentation with Pagefind full-text index.
- Help uses the same official hostname and locale paths; no separate Help hostname is required.
- Mobile Profile: opens the localized Help Center in the system/in-app browser. No WebView package is bundled.
- Admin Content Operations: adds an Owner Guide route that fetches the document only through a JWT- and capability-protected Edge Function.
- Supabase: private waitlist PII table, audited owner-document reads, and two new Edge Functions.

Repository engineering and owner documents are not copied into `apps/web` or its static output.

## Current staging deployment

- Cloudflare Pages project: `nilaza-web-staging`.
- Stable preview URL: `https://nilaza-web-staging.pages.dev`.
- Supabase project: `Nilaza Staging QA` (`akgrokwnkfqnfjqrildi`).
- Database tables and both Edge Functions are deployed; RLS and function authentication smoke checks pass.
- The public waitlist endpoint and the staging Turnstile widget are connected. Automated checks confirm the widget assets load, missing tokens return `challenge_failed`, disallowed origins return `403`, and rejected requests create no database rows.
- Human Turnstile acceptance passed on 2026-09-10: the localized success message appeared, the `subscribed` row and consent metadata were verified in staging, and the synthetic acceptance-test row was removed afterward.
- Cloudflare Web Analytics is enabled for the staging Pages project. The beacon injection was verified after the next Direct Upload deployment; privacy-filtered custom events remain inert until Zaraz is configured in a later domain rollout.
- A bilingual public corpus pipeline is prepared from Help and Legal Markdown. No chatbot, model call, or retrieval index is active.
- Open Reflection v1 was deployed to staging on 2026-09-13. Browser review confirmed the approved lockup, VI tagline, Hanken Grotesk body type, desktop and 390 px hero layout, the VI/EN waitlist Help article, and the Markdown-backed Privacy route. Immutable deployment: https://403d0646.nilaza-web-staging.pages.dev
- Consent/suppression foundation migration `20260913143958` and marketing-waitlist Function version 13 were deployed on 2026-09-14. Remote pgTAP exercised 19 schema, privilege, pending-confirmation, and suppression-preservation assertions inside a rollback transaction. No sender, queue, Cron schedule, or delivery provider is active.
- The website now presents one-to-one persona chat and AI Council together as “Người dẫn đường AI & Council” / “AI Guides & Council,” including inspired-AI transparency. Browser and console review passed. Immutable deployment: https://29f4350e.nilaza-web-staging.pages.dev
- Landing-page conversion navigation was refined on 2026-09-14: desktop keeps the existing sticky-header CTA; mobile gains one compact waitlist dock after the first viewport and hides it when the form is visible; a separate back-to-top control appears only after deeper scrolling. The full form remains in-page with consent and Turnstile instead of becoming a persistent overlay. Browser review passed at 1440×900 and 390×884 with no horizontal overflow or console errors. Immutable deployment: https://6b1cbd1a.nilaza-web-staging.pages.dev
- Growth Operations now reads capability-gated live aggregate waitlist metrics through migration `20260913184421`; the staging rollback test confirmed Owner access, ordinary-user denial, locale segmentation, unavailable engagement, and the no-PII boundary. Historical migration timestamps were normalized to repository versions without re-running schema SQL. `20260907120000_generation_activity_contract.sql` remains a genuine, intentionally un-applied migration because it belongs to the separate AI job/Realtime rollout.
- Production should use a separate Git-integrated Cloudflare project after review. The staging project is Direct Upload only.

## Product truth reflected in public content

| Area | Public status |
| --- | --- |
| Onboarding, Home/Today Pulse, Oracle, persona chat, AI Council, Tarot, Journal | Available in the beta build |
| Astrology reports | Being refined / beta |
| Premium pricing, payment, restore, and final limits | Not promised until shown in a production build/store |
| Authentication, recovery, sync, and notifications | Beta wording; exact behavior follows the active build |
| Waitlist and beta invitations | Signup records interest; no invitation date or active automated email sequence is promised |
| Face reading | Not in the current release; privacy-sensitive future exploration only |

Public copy frames tarot and astrology as symbolic reflection, avoids deterministic predictions, and does not claim absolute security or unlimited use.

The future Nilaza Guide knowledge boundary and generation workflow are defined in docs/NILAZA_PUBLIC_HELP_CORPUS.md. Waitlist follow-up architecture and activation gates are defined in docs/NILAZA_WAITLIST_MARKETING_AUTOMATION_PLAN.md.

## Required environment

Cloudflare Pages:

```text
PUBLIC_SITE_URL=https://nilaza.magicpendigital.com
PUBLIC_WAITLIST_ENDPOINT=https://<project-ref>.supabase.co/functions/v1/marketing-waitlist
PUBLIC_TURNSTILE_SITE_KEY=<cloudflare-turnstile-site-key>
```

Supabase Function secrets:

```text
TURNSTILE_SECRET_KEY=<cloudflare-turnstile-secret>
WAITLIST_ALLOWED_ORIGINS=https://nilaza.magicpendigital.com
```

For staging, use a separate Turnstile widget restricted to `nilaza-web-staging.pages.dev`, and include that origin in `WAITLIST_ALLOWED_ORIGINS`. Do not reuse the staging widget or secret in production.

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions. Never place the service role or AI provider keys in Astro or Expo public environment variables.

Mobile/EAS:

```text
EXPO_PUBLIC_NILAZA_HELP_URL=https://nilaza.magicpendigital.com/{locale}/help
```

## Deployment order

1. Apply `20260909020528_marketing_waitlist_and_admin_documentation.sql` to staging and run database/RLS checks.
2. Deploy `marketing-waitlist` with JWT verification disabled and `admin-documentation` with JWT verification enabled.
3. Configure Turnstile and allowed origins, then test new and duplicate waitlist submissions. A duplicate should return the same generic accepted response.
4. Deploy `apps/web` to Cloudflare Pages using `npm run web:build` and output directory `apps/web/dist`.
5. Attach `nilaza.magicpendigital.com` after owner-reviewed DNS/TLS and environment configuration; keep Help at `/{vi,en}/help` on the same host.
6. Configure the mobile Help URL in EAS and verify Profile → Help & support on Android and iOS.
7. Promote from staging only after the manager test path below passes.

## Manager test path

1. Open `/vi` and `/en`; switch languages and confirm the canonical navigation remains in the selected locale.
2. On desktop and a 390 px phone, check the hero, feature rows, intention demo, and waitlist form without horizontal scrolling.
   - Desktop: confirm the header CTA remains the only persistent waitlist CTA.
   - Mobile: scroll past the hero, confirm the waitlist dock appears; scroll deeper, confirm Back to top appears; open the waitlist and confirm the dock hides while the form remains unobstructed.
3. Open one feature page and one `/for/...` campaign page from each locale.
4. Search Help for a word that appears inside an article, not only its title; open the result.
5. Submit a real test email after Turnstile is configured. Confirm a row exists in `marketing_waitlist` while direct `anon` and `authenticated` table reads/writes remain denied.
6. Sign in to Admin as an owner/admin, open Content Operations → Owner Guide, and confirm the content loads. Sign in as a regular mobile user and confirm access is denied.
7. In the mobile Profile, open Help & support and confirm the correct VI/EN route. Other current app locales intentionally fall back to VI until their public guide set exists.
8. Confirm no owner guide, prompt, provider route, service key, chat text, journal text, birth details, or other private payload appears in the public build or analytics.

## Analytics posture

Use Cloudflare Web Analytics and campaign UTM fields for the initial waitlist funnel. Enable Web Analytics from the Cloudflare Pages project's Metrics tab. The public site instruments `help_search`, `help_no_result`, `help_article_open`, `waitlist_cta_click`, and `waitlist_success` through a privacy-filtered wrapper that calls `window.zaraz.track` only when Zaraz is configured; otherwise it safely does nothing. Search events include only a query-length bucket, result type, and result count—not the raw query, email, URL query string, or private content.

Cloudflare Web Analytics itself does not accept custom events, so use Zaraz only for these allow-listed product events. Do not connect ad-network pixels or third-party analytics tools until a consent design, retention policy, and data map are approved. Initial conversion is a successful waitlist response; app-store and subscription events remain separate future funnel steps.

## Rollback

- Web copy/layout: roll Cloudflare Pages back to the previous static deployment.
- Waitlist: remove `PUBLIC_WAITLIST_ENDPOINT` to fail closed with a visible unavailable message while keeping all informational pages online.
- Mobile: change the public Help URL remotely for future builds; documentation updates never require a store release.
- Owner Guide: undeploy/disable `admin-documentation`; the Admin route shows a retryable unavailable state and exposes no static copy.
- Database: retain waitlist rows and audit records during application rollback. Schema/data deletion requires a separate reviewed retention decision.

## Local verification

```text
npm run validate:public-content
npm run web:check
npm run web:build
npm run admin:check
npm run admin:test
npm run mobile:check
npm run validate:backend
npm run supabase:check
npx deno test supabase/functions/marketing-waitlist/helpers.test.ts
npx deno check supabase/functions/marketing-waitlist/index.ts supabase/functions/admin-documentation/index.ts
```
