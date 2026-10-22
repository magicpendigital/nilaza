# Nilaza Feature PRD

Last updated: 2026-09-11

## 1. Product Summary

Nilaza is a mobile AI companion for Gen Z and women who enjoy tarot, astrology, self-discovery, personality exploration, and symbolic wisdom. The product should feel mystical, intimate, emotionally intelligent, and premium, while staying clear that all spiritual readings are for reflection and entertainment, not deterministic advice.

Core promise:

> Help users explore themselves, ask better questions, and receive emotionally resonant guidance through AI personas, tarot, astrology, and personal reflection.

## 2. Target Users

Primary users:

- Gen Z users who enjoy astrology, tarot, personality tests, self-discovery, and aesthetic mobile experiences.
- Women who like spiritual content, emotional advice, relationship reflection, and daily guidance.
- Users who want an AI that feels like a mentor, reader, or symbolic mirror instead of a generic chatbot.

Secondary users:

- Content creators who may share readings or insights.
- Spiritual/tarot communities.
- Users interested in wisdom from philosophers, books, and cultural archetypes.

## 3. Product Principles

- Reflective, not fatalistic: avoid "your destiny is fixed" language.
- Personal, but safe: use user context to tailor responses without making sensitive or unsupported claims.
- Magical, but usable: the app should feel mystical while remaining fast, clear, and easy to navigate.
- AI-visible, not AI-branded: users should feel they are speaking with a designed character/persona, but the app must not falsely claim to be the real person, author, book, or official representative.
- Privacy-first: birth data, chats, photos, and personal notes are sensitive and must be handled with explicit consent and deletion controls.
- Premium by depth: free users can experience the magic; paid users unlock deeper reports, more personas, and history.

## 4. MVP Scope

MVP should include:

- Onboarding and personal profile.
- Home with daily insight.
- Nilaza Oracle as the central companion/router that helps users choose Tarot, Persona Chat, AI Council, Astrology, or Journal without replacing those flows.
- AI persona chat.
- Tarot reading flow.
- Journal and saved insights.
- Account and privacy settings.
- Premium/credits foundation.
- Admin content console, at least internally.

Phase 2:

- Astrology reports.
- Push notifications.
- Shareable cards.
- More advanced personalization.

Phase 3:

- Face reading.
- Voice chat.
- Community features.
- Human reader marketplace.

## 5. Shared Data Concepts

Recommended entities:

- `users`: account identity.
- `user_profiles`: name, display preferences, goals, interests, tone preference, language.
- `birth_profiles`: birth date, birth time, birth place, timezone, consent status.
- `personas`: AI characters, mentors, book-inspired guides, system prompts, status, premium flag.
- `persona_sources`: licensed/public-domain/reference material for retrieval.
- `source_chunks`: chunked knowledge passages.
- `source_embeddings`: vector embeddings for retrieval.
- `chat_sessions`: persona conversations.
- `chat_messages`: messages and moderation metadata.
- `tarot_decks`: deck metadata, aesthetic category, premium flag.
- `tarot_cards`: card names, images, upright/reversed meanings, keywords.
- `tarot_readings`: question, spread, selected cards, generated interpretation.
- `astrology_reports`: calculated chart data and generated interpretation.
- `face_readings`: image metadata, consent, generated report, deletion status.
- `journal_entries`: saved insights, notes, mood tags, source feature.
- `subscriptions`: subscription status and entitlement.
- `credit_ledger`: credit usage and purchase records.
- `prompt_versions`: versioned prompts per feature.
- `safety_events`: moderation flags, user reports, blocked content.

## 6. Feature PRDs

### 6.1 Onboarding And Personal Profile

Approved Open Reflection requirements (integration and verification tracked in `docs/BRAND_ROLLOUT_2026-09-11.md`):

- Auth-first welcome: approved logo/message, AI introduction, Create account, Log in, language. Preserve confirmation/reset/deep links.
- After sign-in, a single optional goals step: choose 1–3 existing goal IDs or skip. No account-name question.
- Retain existing nickname/goals/tone and completed flag; default new tone to gentle. Birth data and tone editing remain in Profile/Astrology. No payment/photo/notification permission in onboarding.
- Persist completion before Home. Saving error keeps the form and selected answers, shows retry and does not report success. Returning completed users bypass this step.
- Existing user_profiles and birth_profiles contracts remain unchanged.

Acceptance: new account → confirmation → select or skip goals → Home; interrupted user resumes; completed user does not repeat; failed write is retryable; account switch does not leak another profile. App keeps vi/en/zh-Hans/ja/ko and translates every changed label.

### 6.2 Home And Daily Insight

Approved layout: greeting, reflection artwork/insight and one primary action “Bắt đầu phút phản chiếu”. After opening today's content, label becomes “Xem lại phút phản chiếu”. This uses existing Today Pulse and its event/date key, not a new AI session, daily quota or paid operation.

Android review update (2026-09-16): the first opening shows the card back and an intentional tap-to-reveal step. Mark the day as viewed only after the tap, not on modal open. Closing early preserves the unopened state; revisiting a revealed day opens its existing reflection. This ritual does not claim a new AI generation or create a new charge.

Two secondary actions: “Trò chuyện” and “Mở Nhật ký”. Do not promise independent note creation. Continue/recent items use existing history. Explore/Chat retain decks, library, guides, Council and astrology entry points. Five bottom tabs remain.

Keep existing daily cache, refresh/reroll entitlements, selected card, safety wording and persistence semantics. Offline/slow network uses cached/local fallback. The Home redesign does not authorize changing prices or refresh limits.

Acceptance: primary opens/reopens the same day's Today Pulse without duplicate charge; Chat/Journal and Explore remain reachable; existing history is visible; empty/loading/error states are readable at phone/tablet sizes and large font.

### 6.3 AI Persona Chat

Purpose:

Let users chat with wisdom-inspired characters, mentor archetypes, historical figures, and book-inspired guides in a way that feels distinct from a generic chatbot.

Important positioning:

- Use "inspired by" for public figures/books.
- Do not claim the app is the real person, author, estate, publisher, or official representative.
- Avoid using copyrighted book text unless licensed or public domain.

Initial persona categories:

- Philosophers and sages:
  - Aristotle-inspired guide.
  - Confucius-inspired guide.
  - Laozi-inspired guide.
- Emotional mentors:
  - Love mentor.
  - Career mentor.
  - Inner child guide.
- Book-inspired guides:
  - Communication mentor inspired by classic self-help principles.
  - Calm living mentor inspired by stress-management literature.

User stories:

- As a user facing a life question, I want to ask a guide who speaks in a distinct voice.
- As a user, I want to choose a persona by mood or problem.
- As a user, I want to save meaningful answers.

MVP requirements:

- Persona list with category filters.
- Persona detail page with:
  - Avatar/visual.
  - Short description.
  - Conversation style.
  - Suggested prompts.
  - Premium/free indicator.
- Chat room with:
  - Message list.
  - Persona header.
  - Suggested follow-up chips.
  - Save insight action.
  - Report unsafe/bad response action.
- Store chat history.
- Moderation on user input and AI output.

User flow:

1. User opens Chat tab.
2. User browses personas.
3. User selects persona.
4. User starts or resumes chat.
5. User saves an insight to Journal.

AI behavior:

- Each persona needs:
  - System prompt.
  - Tone guide.
  - Allowed topics.
  - Safety boundaries.
  - Retrieval sources if used.
- Persona must answer in first-person character voice only as a stylistic simulation.
- Persona should avoid claiming supernatural certainty.
- For mental health, medical, legal, or financial topics, answer supportively and recommend professional help when needed.
- If user asks "are you really X?", answer transparently: "I am an AI guide inspired by X's ideas/style."

Data needed:

- `personas`
- `persona_sources`
- `chat_sessions`
- `chat_messages`
- `journal_entries`
- `safety_events`

Acceptance criteria:

- Each persona feels meaningfully different.
- User can save any AI response to Journal.
- User can start a new session or continue previous session.
- Persona transparency is available in detail page and chat.
- Blocked or harmful inputs produce a safe fallback message.

Open questions:

- Which first 7 personas should ship?
- Should book-inspired personas be named after exact book titles or abstracted to avoid IP risk?
- Should chat be free with limits or premium-only after trial?

### 6.4 Tarot AI

Purpose:

Create a beautiful, ritual-like tarot experience that combines real card selection logic with AI interpretation.

User stories:

- As a user, I want to ask a question and draw cards.
- As a user, I want the reading to feel personal, not generic.
- As a user, I want to save readings and revisit them.

MVP requirements:

- Choose reading topic:
  - Love.
  - Career.
  - Self.
  - Decision.
  - Open question.
- Enter optional question.
- Choose spread:
  - One-card daily message.
  - Three-card past/present/future.
  - Three-card situation/challenge/advice.
- Choose deck, at least one free deck.
- Animated card draw.
- Reading result:
  - Card names and images.
  - Upright/reversed orientation if supported.
  - Card-by-card interpretation.
  - Overall message.
  - Practical reflection prompt.
  - Save/share actions.

User flow:

1. User taps Tarot.
2. User chooses topic.
3. User enters question or skips.
4. User chooses deck.
5. User chooses spread.
6. User draws cards.
7. App generates reading.
8. User saves to Journal or asks follow-up.

AI behavior:

- Card selection must happen in app/backend, not by AI.
- AI receives structured card data and user question.
- AI interprets symbolically and reflectively.
- AI must not say outcomes are guaranteed.
- AI must avoid medical/legal/financial determinism.

Data needed:

- `tarot_decks`
- `tarot_cards`
- `tarot_readings`
- `journal_entries`
- `subscriptions`
- `credit_ledger`

Acceptance criteria:

- Reading can be completed without account creation if anonymous trial is enabled.
- User can save a reading when logged in.
- The same reading result remains stable after saving.
- AI output references the actual selected cards.
- App handles AI failure by showing card meanings and a retry option.

Open questions:

- Should card reversals be included in MVP?
- Should share cards be generated in MVP or phase 2?
- Should users spend credits per reading or get a daily free reading?

### 6.5 Astrology / Birth Chart

Purpose:

Give users a personalized astrology profile based on birth data, beginning with simple Big 3 and expanding into deeper reports.

Phase:

Owner scope update 2026-09-22: A3/A4 local deterministic charts and the interactive mythology library are implemented as a device-review candidate. Read [current handoff](A3_A4_REVIEW_HANDOFF_2026-09-22.vi.md) for accepted scope, uncertainty rules, local persistence and the remaining native/cloud release gates. The detailed requirements below remain the longer-term product direction.

Content update 2026-09-24: the Astrology library now includes 12 concise bilingual Western-tropical sign guides. Each guide presents an element, modality, reflective interpretation and question, and sits beside its matching mythology chapter. The same symbolic guide appears with calculated sign placements in Chart Story. The content is local and read-only; it does not add an AI request, birth-data write or entitlement.

User stories:

- As a user, I want to understand my Sun, Moon, and Rising signs.
- As a user, I want relationship/career/self insights based on my birth chart.
- As a user without exact birth time, I still want a useful reading.

MVP-lite requirements:

- Birth info form.
- Big 3 summary:
  - Sun sign.
  - Moon sign.
  - Rising sign if birth time is available.
- Report tabs:
  - Personality.
  - Love.
  - Career.
  - Inner lesson.
- Save report.

AI behavior:

- Chart calculation should be deterministic using an astrology library/service.
- AI should interpret calculated placements, not invent chart data.
- If birth time is unknown, explain that Rising sign and house placements may be unavailable or approximate.

Data needed:

- `birth_profiles`
- `astrology_reports`
- `journal_entries`

Acceptance criteria:

- App handles unknown birth time gracefully.
- Users can explore all 12 bilingual sign guides without entering birth data, and continue into the matching mythology chapter.
- Chart Story shows the guide for the currently selected sign or placement using the calculated chart data; sign meanings remain clearly framed as symbolic reflection.
- User can update birth data and regenerate report.
- Result clearly separates calculated data from AI interpretation.
- Premium report can be locked behind subscription.

Open questions:

- Western astrology first or Vietnamese/Eastern astrology first?
- Which astrology calculation library/service will be used?
- Will place search need Google Places or another geocoding provider?

### 6.6 Face Reading / Physiognomy

Purpose:

Offer an image-based symbolic "face archetype" reading as entertainment and self-reflection, without making sensitive or harmful claims.

Phase:

Phase 3 recommended due to privacy, safety, and store review risk.

User stories:

- As a user, I want to upload a portrait and receive a fun symbolic reading.
- As a privacy-conscious user, I want control over my image and deletion.
- As a user, I do not want the app to judge beauty, health, race, or worth.

Requirements:

- Consent screen before upload.
- Clear explanation:
  - For entertainment and reflection.
  - Not a scientific, medical, psychological, or hiring assessment.
  - User can delete photo/report.
- Upload photo from gallery or camera.
- Run image safety check.
- Generate "archetype" style result:
  - First impression energy.
  - Communication style.
  - Strengths.
  - Growth reflection.
  - Suggested affirmation.
- Delete image/report action.

AI behavior:

- Do not infer protected attributes.
- Do not rate attractiveness.
- Do not diagnose health, personality disorder, fertility, criminality, intelligence, or trustworthiness.
- Do not identify the person.
- Avoid "your face proves..." phrasing.

Data needed:

- `face_readings`
- Storage bucket for temporary image.
- Deletion status and retention timestamp.
- `safety_events`

Acceptance criteria:

- User cannot upload image before accepting consent.
- User can delete photo/report.
- Report avoids sensitive traits.
- Minors and sexualized images must be blocked.
- App can run without this feature in MVP.

Open questions:

- Should uploaded images be stored at all, or processed transiently?
- What is the default retention period?
- Does this feature need additional legal review before launch?

### 6.7 Journal And Saved Insights

Purpose:

Create personal continuity by storing meaningful readings, chat excerpts, notes, and mood reflections.

User stories:

- As a user, I want to save insights that resonate with me.
- As a user, I want to see how my questions and mood change over time.
- As a user, I want my journal to feel private.

MVP requirements:

- Saved insight list.
- Reading history.
- Manual note entry.
- Mood tag:
  - Calm.
  - Confused.
  - Hopeful.
  - Sad.
  - Excited.
  - Stuck.
- Filter by source:
  - Tarot.
  - Chat.
  - Astrology.
  - Face reading.
- Delete journal entry.

User flow:

1. User saves an insight from Chat or Tarot.
2. Entry appears in Journal.
3. User adds note/mood.
4. User revisits later.

Data needed:

- `journal_entries`
- `chat_messages`
- `tarot_readings`
- `astrology_reports`

Acceptance criteria:

- Any saved insight links back to its source screen when possible.
- User can delete saved entries.
- Journal is private by default.
- Empty state suggests creating first reading or chat.

Open questions:

- Should Journal support search in MVP?
- Should users export their data?

### 6.8 Premium, Credits, And Monetization

Purpose:

Monetize deeper usage without blocking the first magical experience.

User stories:

- As a free user, I want to try the app before paying.
- As a power user, I want deeper readings and more chats.
- As an operator, I want AI cost to map to revenue.

MVP monetization model:

- Free:
  - Daily insight.
  - Limited chat messages/day.
  - One-card tarot/day.
  - Limited saved history.
- Premium subscription:
  - More chat messages.
  - Three-card readings.
  - Premium personas.
  - Full journal history.
  - Deeper reports.
- Credits:
  - Optional for expensive one-off reports.
  - Useful for face reading, deep astrology, long-form reports.

Requirements:

- Premium paywall.
- Subscription status screen.
- Credit balance.
- Entitlement checks before premium actions.
- Restore purchases.
- Receipt validation via RevenueCat or similar.

Data needed:

- `subscriptions`
- `credit_ledger`
- `users`
- RevenueCat customer ID.

Acceptance criteria:

- Free users can experience core value before paywall.
- Premium unlocks are clear and not deceptive.
- Restore purchase works.
- If subscription check fails, app shows graceful retry.
- AI usage limits prevent runaway cost.

Open questions:

- Subscription only, credits only, or hybrid?
- What are the initial price points by market?
- Should Vietnam pricing differ from US pricing?

### 6.9 Admin Console

Purpose:

Give the product owner a no-code/low-code way to manage personas, tarot content, prompts, feature flags, and AI cost.

User stories:

- As a manager, I want to add or edit personas without touching app code.
- As a manager, I want to update tarot meanings and prompt versions.
- As a manager, I want to see AI usage and costs.

MVP requirements:

- Admin login.
- Persona management:
  - Name.
  - Category.
  - Description.
  - Avatar.
  - System prompt.
  - Safety note.
  - Free/premium status.
  - Active/inactive status.
- Tarot management:
  - Decks.
  - Cards.
  - Meanings.
  - Images.
- Prompt version management.
- Usage dashboard:
  - AI requests.
  - Estimated cost.
  - Feature usage.
  - Error rate.
- Safety event review.

Acceptance criteria:

- Admin changes can be previewed before publishing.
- Prompt versions can roll back.
- Non-admin users cannot access admin routes.
- Every content change has updated timestamp and editor ID.

Open questions:

- Should admin be built as a web app from day one?
- Should persona prompts be edited in plain text or structured fields?

### 6.10 Safety, Privacy, And Compliance

Purpose:

Make safety and privacy part of the product design from the start.

User stories:

- As a user, I want to know how my data is used.
- As a user, I want to delete sensitive data.
- As a platform reviewer, I need to see content controls and reporting.

Requirements:

- In-app report button for AI responses.
- Text/image moderation for user inputs where appropriate.
- Privacy screen:
  - Export data.
  - Delete account.
  - Delete chats.
  - Delete photos/reports.
- Clear disclaimers:
  - Spiritual readings are for entertainment/reflection.
  - Not medical, legal, financial, or psychological advice.
- Crisis-safe handling:
  - If user expresses self-harm intent, respond supportively and suggest immediate local emergency/crisis resources.
- Store policy readiness:
  - Avoid impersonation.
  - Avoid hidden AI-generated content risks.
  - Use in-app purchases for digital content on iOS/Android.

Acceptance criteria:

- User can report any generated answer.
- User can delete account data.
- AI refuses or redirects unsafe requests.
- App has clear AI/persona transparency.
- Face reading is disabled until privacy and safety controls are complete.

### 6.11 Notifications And Communication Channels

Purpose:

Help users return to meaningful reflections without making Nilaza feel spammy or exposing private spiritual/journal content outside the app.

V1 channels:

- In-app inbox: always available, private to the signed-in/local user, and used as the durable notification history.
- Push notifications: opt-in only, delivered through Expo Push Service for result-ready and reminder use cases.
- Email: transactional only at first, such as auth confirmation, password reset, data export/delete, and payment/subscription messages.
- SMS, Zalo, WhatsApp: future channels, not part of v1 user communication.

Notification types:

- `daily_insight_ready`
- `tarot_reading_ready`
- `astrology_report_ready`
- `journal_reflection_reminder`
- `account_security`
- `payment_subscription`
- `admin_test`

Content rules:

- Push copy must be generic and safe, for example "Your reflection is ready."
- Push must not include raw chat text, journal notes, tarot questions, birth data, relationship details, or sensitive AI output.
- Detailed content appears only after the user opens the authenticated/local app.
- Marketing or promo notifications require a separate opt-in and opt-out.

Acceptance criteria:

- User can enable/disable push and individual notification types from Profile.
- User can view, read, and dismiss in-app notifications.
- App still works when push permission is denied, unavailable, or backend sync fails.
- Admin can see sanitized delivery status and test notifications without raw private content.

Open questions:

- Which markets will launch first?
- Does the app need age gating?
- Will community/user-generated public content exist? If yes, moderation needs to expand.

## 7. Recommended Build Order

1. Product docs and design system.
2. Mobile app scaffold.
3. Supabase schema and auth.
4. Onboarding.
5. Home.
6. Persona chat.
7. Tarot.
8. Journal.
9. Premium foundation.
10. Admin console.
11. Safety/reporting polish.
12. Closed beta.

## 8. Definition Of Done For Each Feature

A feature is done when:

- UI matches the approved design.
- Core happy path works.
- Empty/loading/error states exist.
- Data is saved in the expected table.
- AI prompt is versioned.
- Basic safety checks are included.
- Mobile screens work on common iOS and Android sizes.
- Feature can be tested by a non-technical manager.
