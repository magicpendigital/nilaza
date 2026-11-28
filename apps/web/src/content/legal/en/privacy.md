---
title: "Privacy"
description: "We only promise data controls verified in the version you are using."
locale: en
slug: privacy
updatedAt: 2026-11-25
---

## Information you choose to provide

Depending on the feature, data may include profile details, birth profile, questions, conversations, readings, saved insights, and journal entries. Local or synced storage depends on the version and is shown in the app.

## Sensitive data

Do not enter information you do not want processed. Nilaza does not request AI-provider API keys in the mobile app.

## Waitlist

When the form is ready and you actively consent, Nilaza stores your email, language, interest, campaign information in UTM parameters and the consent time/version to record a prelaunch signup request. Data is processed through the Supabase backend; the browser cannot read the email list. Only a successful recorded response confirms the request was saved; a connection-unavailable notice does not collect email.

Email is used for launch news and early access opportunities according to your consent. Confirmation/update delivery is a separate step; app accounts are not automatically added to marketing. Once campaigns are active, update emails will include an unsubscribe method and unsubscribe/bounce/complaint states are preserved. Raw emails and form content are not included in analytics events.

## Numerology private message (when the feature is switched on)

This section applies only once Nilaza switches on the "Private message" feature for Premium accounts. Until then, the app sends nothing for this feature.

- **You choose to send:** the app sends only after you tap "Send" in the explanation box.
- **Data sent:** the Numerology numbers computed on your phone (for example your life path, personal year and month), the codes of the content blocks and the language. Your name, birth date, birth year and age are **not** sent.
- **Processing:** Nilaza's server joins the text of prepared content blocks and asks an AI model (through the provider OpenRouter) to write one short message. Your account ID is not sent to the model provider.
- **Storage:** Nilaza does **not** store the message, the numbers or the block codes. The server records only the day's attempts and technical details (time, language, number of blocks, model used) to keep the limit of one message a day and to monitor service quality.

## Buying Premium

- **Payment:** handled by Google Play. Nilaza never receives or stores your card number or payment details.
- **Subscription-management provider:** Nilaza uses **RevenueCat** (RevenueCat, Inc.) to confirm purchases with Google Play and track the plan's status. When you buy or restore, the app sends RevenueCat your Nilaza user ID (a random identifier, not your email or name). RevenueCat receives from Google Play and stores the purchase history for that ID: the plan bought, purchase time, period, renewal or cancellation status, plus the technical details a purchase needs to work. RevenueCat processes this data on Nilaza's behalf.
- **On Nilaza's servers:** we store your account's plan status (whether Premium is active, its status, period end date, product ID, and test or live store environment) to unlock Premium features. We do not store the price, your email, or payment details in this record.
- **Encryption in transit:** data between the app, Google Play, RevenueCat, and Nilaza's servers travels over HTTPS.

## Deleting your account

When you delete your account, Nilaza removes the plan status from its servers and asks RevenueCat to delete the customer record and purchase history linked to your user ID. Google Play keeps its own transaction records under Google's policies, and **the subscription is not cancelled automatically**: cancel it in Google Play.

How to delete your account and what is deleted: see [Delete your account and data](/en/account-deletion).
