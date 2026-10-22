# Nilaza Waitlist Marketing Automation Plan

Last updated: 2026-09-14

Growth workspace update (2026-09-30, local source): the default Overview now shows product/workflow readiness. The existing aggregate funnel moves to `#/growth/waitlist`; Campaign Map and Delivery Health retain their routes. See [current handoff](GROWTH_OPERATIONS_HANDOFF_2026-09-30.vi.md). Repository snapshots and protected live counts have separate provenance and failure states. Counts represent stored unique contacts, campaign nodes show contact/confirmed pools rather than send eligibility, and suppression reason records must not be summed into unique audience totals. No sender activation is implied by this UI update; the rollout gates below remain separate.

Status: consent/suppression schema, the updated waitlist Edge Function, and the capability-gated aggregate Growth Operations read model are deployed to the linked Supabase staging project. A synthetic fixture remains available only as an explicit review mode. No automated marketing email, queue, Cron schedule, or delivery provider is active.

## Decision

Keep Supabase as the canonical system for waitlist consent, subscription state, suppressions, invite state, and audit history. Use a transactional email provider only for delivery. A future worker should read durable jobs from Supabase Queues and be invoked on a schedule by Supabase Cron through a protected Edge Function.

Do not send marketing directly from a database webhook on the PII table. Database webhook payloads contain the changed row, which would unnecessarily copy email and campaign metadata into another processing path. Queue only an internal waitlist ID and event metadata; resolve the address inside the protected worker immediately before delivery.

## Current baseline

Already available:

- private marketing_waitlist table protected from anon and authenticated access
- normalized email hash for duplicate handling
- locale, interest, UTM attribution, consent version and consent timestamp
- Turnstile, origin allowlist, bounded input, and a generic accepted response
- pending-confirmation registration through one atomic service-only RPC
- append-only consent events, active suppression records, hashed one-time token storage, delivery ledger, and beta-invite foundation
- a read-only Growth Operations workspace that requests protected live aggregates and exposes no subscriber PII
- a visibly labeled synthetic review fixture that is loaded only after an explicit Owner action when the live source is unavailable

Missing before activation:

- verified sending domain with SPF, DKIM, and DMARC
- provider account and production API secret
- address confirmation and unsubscribe endpoints
- durable outbox or queue, delivery attempts, provider webhook ingestion, and dead-letter review
- versioned bilingual templates and an owner-approved campaign

Corrected on staging: the waitlist Edge Function now calls an atomic registration RPC. A new request starts at pending_confirmation, while a repeat request from an unsubscribed, bounced, complained, or otherwise suppressed address records resubscribe_requested without lifting suppression. Migration `20260913143958` and marketing-waitlist Function version 13 were verified on 2026-09-14. Migration `20260913184421` adds `get_growth_waitlist_overview()`: an `overview.read`-gated RPC returning locale-segmented counts, delivery state, campaign steps, and suppression totals without emails, hashes, tokens, UTM payloads, or message bodies. A rollback SQL test passed on staging.

## Target flow

    Public form
        -> marketing-waitlist Edge Function
        -> pending_confirmation
        -> queue address_confirmation using waitlist_id only
        -> protected sender worker
        -> delivery provider
        -> signed provider event webhook
        -> delivery and suppression records

    Confirmation link
        -> one-time hashed token
        -> consent event
        -> confirmed
        -> queue welcome sequence

    Unsubscribe link, hard bounce, or complaint
        -> suppression
        -> cancel all future jobs
        -> never silently reactivate

## Implemented local data foundation

marketing_waitlist:

- statuses: pending_confirmation, confirmed, invited, unsubscribed, bounced, complained; subscribed remains temporarily accepted only for zero-downtime rollout compatibility
- confirmed_at, unsubscribed_at, invite_sent_at, last_email_at
- active consent version and source

Append-only tables:

- marketing_consent_events: signup_requested, confirmation_requested, confirmed, resubscribe_requested, unsubscribed, suppressed
- marketing_email_tokens: hashed one-time confirmation and unsubscribe tokens with expiry
- marketing_deliveries: campaign, template version, provider message ID, attempt, status, timestamps
- marketing_suppressions: internal waitlist reference, reason, active/released state, timestamp
- beta_invites: cohort, invite state, expiry, redemption reference

Queue payloads should contain only waitlist_id, event_type, campaign_version, locale, and scheduled_at. They must not contain the email address, UTM strings, token values, template bodies, or user content.

## Recommended sequence

The first production sequence should be short and intent-based:

1. Immediately: confirm the email address and explain what consent covers.
2. After confirmation: welcome and set expectations for the beta.
3. Day 2: show one useful Nilaza experience based on the selected interest.
4. Day 5: explain a second relevant feature and link to its public guide.
5. Day 10: explain privacy, reflective-use boundaries, and what Nilaza will not claim.
6. Cohort event: send a capacity-controlled beta invitation.

Stop the sequence immediately on unsubscribe, hard bounce, complaint, invitation acceptance, or a manual suppression. Do not send countdown scarcity, deterministic spiritual claims, or unverified pricing.

## Reliability and privacy controls

- Give every logical send an idempotency key based on subscriber, campaign, step, and template version.
- Claim a queue message, write the delivery attempt, send once, and archive only after a durable result.
- Retry only transient failures with bounded exponential backoff; move exhausted jobs to a reviewable dead-letter state.
- Verify provider webhook signatures and process provider event IDs idempotently.
- Keep email addresses out of logs, analytics, queue payloads, AI traces, and admin aggregate views.
- Retain only the minimum delivery metadata required for consent, suppression, troubleshooting, and compliance.
- Use explicit rate and cohort caps so an error cannot mail the full list.

## Admin and measurement

The first owner dashboard should show aggregates rather than a browsable address list:

- signups, confirmations, unsubscribes, bounces, complaints, and invitations
- conversion by locale, interest, and allow-listed campaign dimensions
- delivery backlog, retry count, dead-letter count, and last successful worker run
- campaign version and template version

Never send raw email, help search text, chat content, journal content, or birth data to analytics or an AI evaluation trace.

## Owner Campaign Map

Yes, campaign automation should be visualized for the Owner, but the visualization must be an operational map rather than a decorative flow builder. It should answer four questions within one screen: what is scheduled, where subscribers stop, whether delivery is healthy, and how to stop the campaign safely.

Recommended desktop layout:

    Campaign: Beta waitlist VI/EN              Draft | Paused | Live
    Audience: confirmed waitlist only          [Pause all sends]

    [Confirm address] -> [Welcome] -> [Day 2: interest] -> [Day 5: feature]
           |                 |              |                    |
        sent 120          sent 92        sent 84              sent 71
        77% confirm       4 bounced      6 stopped            2 complaints

                         -> [Day 10: trust] -> [Beta invitation]

    Health: queue 12 | retry 1 | dead letter 0 | last run 2 min ago

The Owner view should have three coordinated modes:

1. Map: nodes for trigger, delay, condition, message, invitation, and stop; edges show the eligible count between steps.
2. Funnel: requested, confirmed, engaged, invited, accepted, unsubscribed, bounced, and complained by locale and interest.
3. Operations: queue age, retry/dead-letter status, provider health, template versions, audit trail, and global kill switch.

Node colors must carry both a label and icon: moon gray for draft or disabled, champagne for scheduled or running, teal for healthy, and muted rose for blocked, bounced, complained, or failed. Do not use color as the only signal.

Version 1 is implemented as read-only modes for overview, campaign map, and delivery health. The primary source is the protected Supabase aggregate read model; engagement remains explicitly unavailable until consented provider events exist. The repository fixture is never substituted silently and requires an explicit, visibly labeled review action. Neither source can send email. Safe controls such as pause/resume, cohort cap, schedule window, template preview, and test-send to an allow-listed internal address belong to the next phase after sender, provider-event, and audit contracts are ready. Do not begin with a free-form drag-and-drop builder. Editing graph topology before consent, idempotency, suppression, and audit contracts are stable would make high-risk mistakes easier.

Every publish action should require an explicit readiness panel:

- sending domain verified
- bilingual templates approved
- confirmation and unsubscribe links tested
- suppression query healthy
- estimated eligible audience and send cap shown
- selected campaign and template versions immutable for that launch
- owner confirmation recorded in the admin audit log

The canvas receives aggregate IDs and counts only. Opening a delivery detail should show a hashed subscriber reference and sanitized provider status; access to a raw address, when support genuinely requires it, belongs in a separately permissioned and audited PII workflow.

## Rollout gates

Do not activate sending until all gates pass:

1. Use the owner-selected organization domain `magicpendigital.com` and Nilaza website `https://nilaza.magicpendigital.com`; review ownership, DNS/TLS and the exact environment before attaching the hostname. Select and verify the sending subdomain separately.
2. Create a dedicated sending subdomain and verify SPF, DKIM, and DMARC.
3. Select the provider and save its key only as a Supabase Function secret.
4. Approve bilingual confirmation, welcome, education, invitation, and unsubscribe copy.
5. Apply the reviewed consent, suppression, delivery, and queue migration.
6. Deploy sender and webhook functions with authentication, signature, origin, and rate-limit checks.
7. Pass seed-list tests for confirmation, duplicate signup, unsubscribe, resubscribe, bounce, complaint, retry, and dead-letter handling.
8. Start with a small internal cohort, review provider reputation metrics, then raise the cap.

## Manager acceptance criteria

- A new address receives only a confirmation message until it confirms.
- Duplicate submissions do not create duplicate sends.
- An unsubscribed, bounced, or complained address never receives another campaign without explicit reconfirmation.
- Every sent message has the correct VI/EN template, an unsubscribe link, and a recorded template version.
- Provider retries cannot produce a second logical send.
- The owner can see aggregate funnel and delivery health without opening raw PII.
- Pausing Cron or disabling the worker stops all outbound mail while leaving the public waitlist available.

## Rollback

Pause the Cron schedule first, then disable the sender worker. Preserve consent, suppression, and delivery records. The public signup can continue in collection-only mode with copy that accurately says email automation is not yet active.

## Official implementation references

- Supabase Queues: https://supabase.com/docs/guides/queues
- Supabase Cron: https://supabase.com/docs/guides/cron
- Schedule Edge Functions: https://supabase.com/docs/guides/functions/schedule-functions
- Sending emails from Edge Functions: https://supabase.com/docs/guides/functions/examples/send-emails
- Database Webhooks: https://supabase.com/docs/guides/database/webhooks
