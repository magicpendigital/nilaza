# Nilaza Public Help Corpus

Last updated: 2026-09-10

## Purpose

This document defines the approved public knowledge boundary for the future Nilaza Guide assistant and other Help Center search experiences. It prepares a reviewable corpus; it does not enable a chatbot, call an AI model, or publish private product documents.

## Source allowlist

Only these bilingual Markdown collections may enter the generated corpus:

- apps/web/src/content/help/vi and apps/web/src/content/help/en
- apps/web/src/content/legal/vi and apps/web/src/content/legal/en

The following are excluded even when they contain useful product information:

- owner and admin guides
- engineering plans, architecture notes, prompts, provider routes, and secrets
- Supabase rows, user profiles, emails, chat messages, journals, birth details, analytics payloads, and support tickets
- draft pricing, limits, release dates, and features not stated in approved public content

## Official website

Owner decision 2026-10-04: organization `magicpendigital.com`; Nilaza website `https://nilaza.magicpendigital.com`. Corpus records keep relative VI/EN routes. Resolve public links against the official website; do not infer an email sender, support mailbox or live deployment from this domain decision.

## Generated artifacts

Run npm run public-help-corpus:build to generate:

- packages/content/generated/public-help-corpus/manifest.json
- packages/content/generated/public-help-corpus/corpus.jsonl

The manifest records the source policy, excluded categories, document and chunk counts, locale coverage, generation format version, and a checksum. Each corpus record has a stable content-derived ID, locale, public URL, heading, text, and checksum. Repository source paths are not exposed in the JSONL records.

The generator is deterministic. npm run validate:public-content fails when committed artifacts drift from their approved Markdown sources.

## Current coverage

The approved corpus covers:

- Nilaza positioning and the reflective companion experience
- AI guides and AI Council
- Tarot and Journal
- account, product availability, waitlist, and beta expectations
- privacy, terms, and safety boundaries

The assistant must say that information is not yet public when the corpus does not establish an answer. This currently includes:

- exact subscription prices, credit limits, trials, billing restoration, and refunds
- final App Store or Google Play download URLs
- a guaranteed beta invitation date or acceptance order
- a production support email address (the official website hostname is owner-selected; DNS/live deployment is a separate check)
- retention and deletion promises not stated in the public privacy notice

## Answer contract for a future assistant

Allowed:

- answer from retrieved public chunks and link to the matching public page
- summarize Nilaza features using tentative beta wording where the source does
- explain tarot and astrology as symbolic reflection
- say that a detail is not yet publicly confirmed
- direct account-specific or safety-sensitive matters to an approved support route once one exists

Not allowed:

- use owner documents, private database data, user content, or internal prompts as retrieval sources
- invent prices, dates, entitlements, chart placements, predictions, policies, or support contacts
- diagnose medical or mental health conditions or provide legal or financial advice
- present historical or book-inspired personas as the real person or an official representative
- collect email, birth data, journal text, or other sensitive details inside public help chat

## Editorial workflow

1. Edit the relevant VI and EN Markdown pair.
2. Confirm that public claims match the active product build and product guardrails.
3. Run npm run public-help-corpus:build.
4. Review the manifest diff and sampled JSONL chunks.
5. Run npm run validate:public-content, npm run web:check, and npm run web:build.
6. Publish only after the manager test path passes.

## Manager test path

1. Open Help in both languages and confirm every topic has a matching VI/EN article.
2. Open Privacy, Terms, and Safety and confirm their existing public URLs still work.
3. Open the waitlist article and confirm it does not promise an invitation date, price, or active email sequence.
4. Search generated corpus.jsonl for owner, service_role, prompt-library, raw email addresses, chat text, journal text, and birth details; none should appear as private material.
5. Change one approved article without rebuilding and confirm npm run public-help-corpus:check reports drift.
6. Rebuild and confirm the check passes.

## Rollback

The corpus is a generated artifact. Remove it from any future retrieval index and restore the previous reviewed files if a public-content issue is found. Removing the corpus does not affect the marketing site, mobile application, Supabase data, or owner documentation.
