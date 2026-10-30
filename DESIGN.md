# Nilaza Product Design

Last updated: 2026-09-11

## Project

Design a premium mystical AI mobile app named Nilaza for iOS and Android.

Nilaza helps Gen Z users and women explore self-discovery, tarot, astrology, emotional reflection, and wisdom conversations with AI personas inspired by sages, philosophers, mentors, and symbolic books.

Identity authority: [Open Reflection v1](docs/BRAND_GUIDELINES.md). This brief defines product layouts; archived Stitch prompts below describe historical exploration, not the current brand. The first signed-out screen is auth-first welcome; returning signed-in users enter the app.

## Product Feeling

Nilaza should feel:

- Mystical but not childish.
- Feminine but not overly pink.
- Premium but not cold.
- Calm, intimate, emotionally intelligent.
- Modern enough for Gen Z.
- Trustworthy enough for sensitive personal data.

Avoid:

- Generic purple gradient "AI app" look.
- Overly dark occult/horror styling.
- Fortune-telling visuals that feel cheap or scammy.
- Marketing landing-page layouts.
- Dense text blocks.
- Floating cards inside other cards.

## Target Users

Primary users:

- Gen Z users interested in astrology, tarot, personality exploration, journaling, and self-growth.
- Women who enjoy spiritual content, relationship reflection, emotional clarity, and daily guidance.

They want the app to feel beautiful, personal, safe, and shareable.

## Visual Direction

Use a refined mystical editorial style.

Suggested palette:

- Charcoal black: #151416
- Soft ivory: #F7F1E6
- Champagne gold: #C9A45C
- Deep teal: #0E5A5A
- Muted rose: #C9828D
- Moon gray: #A8A3A0
- Warm ink: #2A2525

Color use:

- Dark mode should be the primary visual identity.
- Ivory can be used for content-heavy screens.
- Champagne gold should be an accent, not a full background.
- Deep teal and muted rose should add contrast so the palette does not become one-note purple.

Typography:

- Use Hanken Grotesk for body text, labels and buttons.
- Use EB Garamond for editorial titles. NILAZA wordmark is the approved outlined EB Garamond Regular 400 asset (standard tracking .18 em, compact .12 em).
- Keep body text easy to read on mobile.
- Do not use negative letter spacing.

Shape:

- Cards and panels should use 8px radius or less.
- Buttons, single-line inputs and chips use a full pill radius (Owner decision 2026-10-30, `radius.pill`); multi-line inputs, panels and cards keep 8px or less.
- Use clear icon buttons for repeated actions such as save, share, close, back, search, and settings.

Imagery:

- Use high-quality mystical imagery:
  - Tarot cards.
  - Moon and star details.
  - Paper texture.
  - Subtle light reflections.
  - Illustrated persona portraits.
- Avoid stock-photo cliches and overly blurred backgrounds.

Motion ideas:

- Tarot card flip.
- Soft shimmer on daily insight.
- Gentle typing indicator for personas.
- Smooth tab transitions.

## Design System Components

Create components for:

- Bottom tab bar.
- Top app header.
- Icon button.
- Primary button.
- Secondary button.
- Text input.
- Search field.
- Segmented control.
- Feature tile.
- Persona card.
- Tarot card.
- Reading result section.
- Chat message bubble.
- Suggested prompt chip.
- Insight save button.
- Mood selector.
- Paywall plan card.
- Consent notice.
- Empty state.
- Loading state.
- Error state.

## Information Architecture

Bottom tabs:

- Home
- Explore
- Chat
- Journal
- Profile

Main flows:

- Onboarding
- Daily insight
- AI persona chat
- Tarot reading
- Astrology report
- Journal
- Profile and privacy
- Premium paywall
- Admin dashboard
- Prompt and content operations
- Backend job status and safety review

## Screens To Design

### 1. Welcome — Open Reflection v1

Logo, approved VI/EN message, brief AI introduction, primary Create account, secondary Log in and language choice. Use dedicated reflection artwork declared in feature visuals. Brand reveal lasts 800 ms once and never blocks a button; Reduce Motion shows final frame. Native splash ends when session/local state/fonts are ready or fallback is available, without waiting on network content.

### 2. Goals — one optional step after authentication

Choose 1–3 goals using existing IDs, or Skip. Use the account name and existing tone; new users default to gentle. Preserve old answers. Save before entering Home, show retry on failure. Existing completed accounts never repeat onboarding. Preserve auth confirmation, reset and deep links.

### 3. Birth profile — Profile/Astrology entry

Optional date/time/place and privacy explanation remain in existing Profile/Astrology surfaces. No extra onboarding step.

### 4. Tone preference — Profile

Keep the existing tone choice and editing controls. No extra onboarding step and no overwriting returning users' choice.

### 5. Home — “Hôm nay” (Owner-approved 2026-10-27)

Header with the wordmark and a round notification button → date and local moon phase → greeting and a time-of-day line → Today card hero on a solid surface with a gold hairline, two stacked card backs, the primary “Lật lá hôm nay” / “Xem lại lá hôm nay” and the streak dots inside the hero (design canvas, Owner-approved 2026-10-30). This reveals/reopens existing Today Pulse, with no new AI session or charge; after reveal the card screen ends in Save to Journal, Ask deeper (existing tarot-card guide chat) and Share (card and library meaning only). Below: a sky tile (moon phase) and a sign tile with the sign artwork that opens Astrology; an “Hỏi Nilaza” field that only prefills Oracle; “Dành cho bạn · {chủ đề}” with “Đổi chủ đề” cycling love, career and self locally (starting from the first onboarding goal) and a rail of a topic tarot reading, an ask card that only prefills Oracle, and a journal prompt that opens the composer; “Đọc tiếp” with the newest saved entry (card thumbnails for saved readings) and an Open Journal link. No compatibility card until that feature exists. Cards keep the 8 px radius. Continue/recent items use existing data. Discovery remains reachable through Explore/Chat: decks, library, guides, Council, astrology. Keep five tabs (Hôm nay, Khám phá, Trò chuyện, Nhật ký, Tôi) and Tarot as a subflow. Implementation/verification evidence lives in `docs/BRAND_ROLLOUT_2026-09-11.md`.

### 6. Explore

Goal:

Show all spiritual and wisdom experiences.

Layout:

- Search field.
- Category chips:
  - Love
  - Career
  - Self
  - Calm
  - Mystery
- Feature tiles:
  - Tarot
  - Astrology
  - Face reading
  - Wisdom library
  - Daily ritual
- Use visual assets for each tile.

### 7. Persona List

Goal:

Help users find a guide.

Layout:

- Header: Choose your guide.
- Category tabs:
  - Sages
  - Love
  - Career
  - Books
  - Healing
- Persona cards with portrait, name, short style, premium/free badge.
- Suggested prompt preview.

### 8. Persona Detail

Goal:

Set expectation before chat.

Layout:

- Large persona portrait.
- Persona name.
- "Inspired by" transparency note for historical/book-inspired personas.
- Short description.
- Conversation style badges.
- Suggested questions.
- Primary button: Start chat.

### 9. Chat Room

Goal:

Make AI feel like a designed persona experience.

Layout:

- Header with avatar, persona name, back button, menu.
- Message bubbles with distinct user/persona styling.
- Suggested follow-up chips above input.
- Text input at bottom.
- Icon actions:
  - Save insight.
  - Report.
  - New chat.

Keep the chat interface clean and emotionally warm.

### 10. Tarot Topic (step 1/2, design canvas TarotAsk)

Goal:

Let user set intention.

Layout (one screen, top bar “Trải bài · Bước 1/2”):

- Title “Bạn muốn hỏi điều gì?” and the question field (optional; example questions show while it is empty).
- A local suggestion card when the question asks the cards to read another person or to predict: a self-focused version with “Dùng câu này” / “Giữ câu của tôi” and an honest note. Nothing is sent to a server.
- Topic chips Tình yêu, Công việc, Bản thân, Quyết định that follow the question until the person picks one.
- Spread cards for the available spreads.
- The selected deck with “Đổi” (opens deck selection).
- Fixed button “Bắt đầu rút bài” goes straight to the draw.

### 11. Tarot Deck Selection

Goal:

Choose a tarot deck aesthetic.

Layout:

- Horizontal or grid deck cards.
- Each deck shows preview image, name, vibe, premium/free label.
- Continue button.

### 12. Tarot Draw (step 2/2, design canvas TarotDraw)

Goal:

Create a ritual moment.

Layout:

- The question at the top.
- One slot per spread position; the next one outlined in gold, drawn cards shown in place (reversed art rotated).
- “Hít một hơi chậm. Chọn lá cho vị trí …” and the remaining readings for today.
- A fan of card backs: tapping a card raises it, the main button becomes “Lật lá này”. Cards stay randomly drawn.
- “Lật cả N lá ngay” reveals the rest; “Đổi bộ bài”.

### 13. Tarot Result (design canvas TarotResult)

Goal:

Deliver a personal, beautiful, savable reading.

Layout:

- Top bar with topic, card count and deck; the question in quotes.
- Card images with position and Vietnamese name.
- “Tóm lại”: a short heading and the overall message, with the source line (AI, reference meanings or safety response).
- One collapsible section per card using the AI text for that card (reference meaning otherwise), keywords and “Học thêm về lá này”.
- Blocks the AI did not return stay hidden (cross-card notes and a small step need the approved prompt update).
- “Câu hỏi để viết” with “Viết vào Nhật ký”, then the guide choice.
- Fixed dock: Lưu trải bài, Hỏi tiếp, and a menu for share and report.

### 14. Astrology Birth Form

Goal:

Collect or edit birth details.

Layout:

- Date/time/place fields.
- Unknown birth time toggle.
- Privacy note.
- Generate report button.

### 15. Astrology Report

Goal:

Show chart insight in digestible sections.

Layout:

- Big 3 summary cards:
  - Sun
  - Moon
  - Rising
- Tabs:
  - Personality
  - Love
  - Career
  - Inner lesson
- Save report button.
- Premium expansion section.

### 16. Face Reading Consent

Goal:

Make privacy and limitations clear before image upload.

Layout:

- Calm consent copy.
- Bullet-style permissions:
  - For entertainment and reflection.
  - Not scientific or medical.
  - You can delete your photo/report.
- Primary button: Continue.
- Secondary button: Not now.

### 17. Face Reading Upload

Goal:

Upload or capture portrait.

Layout:

- Camera/gallery upload area.
- Photo quality tips.
- Delete/replace action.
- Generate reading button.

### 18. Journal

Goal:

Let users revisit saved insights.

Layout:

- Timeline list.
- Filter chips:
  - All
  - Tarot
  - Chat
  - Astrology
  - Notes
- Mood selector or mood tags.
- Empty state with action to draw tarot or chat.

### 19. Journal Detail

Goal:

Show one saved insight with context.

Layout:

- Source label.
- Date.
- Main insight.
- User note.
- Mood tag.
- Actions:
  - Edit note
  - Delete
  - Reopen source

### 20. Premium Paywall

Goal:

Explain upgrade clearly.

Layout:

- Premium title.
- Benefits:
  - More persona chat.
  - Deeper tarot readings.
  - Premium guides.
  - Full journal history.
  - Advanced reports.
- Monthly/yearly toggle.
- Plan cards.
- Restore purchase link.
- Privacy/terms links.

### 21. Profile

Goal:

Control account, birth profile, subscription, and privacy.

Layout:

- User display name/avatar.
- Birth profile.
- Preferences.
- Subscription status.
- Privacy controls.
- Delete account.
- Log out.

### 22. Admin Dashboard

Goal:

Give the product owner a manager-friendly operational view of app performance, content health, AI jobs, safety, and backend readiness.

Audience:

This screen is for admin/operator users, not normal consumers. It should feel quiet, utilitarian, and scan-friendly while still matching Nilaza's premium dark visual system.

Layout:

- Top header:
  - Title: Admin dashboard.
  - Environment badge: Local, Staging, or Production.
  - Last synced timestamp.
  - Settings icon.
- KPI row:
  - Active users.
  - Tarot readings.
  - Persona chats.
  - Astrology jobs.
  - Estimated AI cost.
  - Safety flags.
- Status strip:
  - Backend connection status.
  - Queue health.
  - Provider health:
    - Model API.
    - Astrology API.
    - Push notification service.
- Main chart area:
  - Usage trend line for the last 7 days.
  - Feature mix stacked bars:
    - Tarot.
    - Chat.
    - Astrology.
    - Journal.
    - Admin edits.
- Operational lists:
  - Recent generation jobs with status: queued, running, completed, failed.
  - Recent safety events.
  - Recent prompt edits.
  - Top personas and decks by usage.
- Quick actions:
  - Review safety events.
  - Edit prompts.
  - Manage content library.
  - View failed jobs.

Design notes:

- Use dense but readable dashboard composition.
- Avoid marketing cards or decorative hero sections.
- Use compact data cards, tables, status chips, and segmented controls.
- Cards should use 8px radius or less.
- Show empty/local states clearly when backend is not connected.
- Do not show sensitive user message contents by default; use summaries, IDs, counts, and status labels.

### 23. Prompt Management

Goal:

Let admins update system prompts and content presentation safely, with versioning and review.

Layout:

- Prompt list sidebar:
  - Persona chat.
  - Tarot reading.
  - Astrology interpretation.
  - Daily insight.
  - Safety fallback.
- Main editor:
  - Prompt name.
  - Version.
  - Status: draft, active, archived.
  - Language tabs: Vietnamese, English.
  - Text editor.
  - Required reviewers.
  - Change notes.
- Preview panel:
  - Test input.
  - Simulated response.
  - Safety warnings.
- Footer actions:
  - Save draft.
  - Run local audit.
  - Publish version.
  - Roll back.

Design notes:

- Treat this like an operational tool, not a creative writing page.
- Make version and publish status visually obvious.
- Include warning states when prompt copy weakens safety boundaries.

### 24. Content Library Admin

Goal:

Manage personas, book-inspired guides, tarot decks, astrology copy, and research candidates.

Layout:

- Tabs:
  - Personas.
  - Books.
  - Tarot decks.
  - Astrology.
  - Research queue.
- Table/list rows:
  - Name.
  - Category.
  - Access tier.
  - Status.
  - Risk level.
  - Last updated.
  - Usage count.
- Detail panel:
  - Bilingual name and description.
  - Prompt profile.
  - Visual direction.
  - Safety/IP notes.
  - Market signal.
  - Publish readiness checklist.

Design notes:

- Make risk level and status easy to scan.
- Use filters and search.
- Keep user-facing content separate from internal safety notes.

### 25. Job Status And Notifications Admin

Goal:

Track backend proxy jobs and notification delivery once backend is connected.

Layout:

- Summary cards:
  - Queued jobs.
  - Running jobs.
  - Failed jobs.
  - Average completion time.
  - Push notifications sent.
  - Push failures.
- Job table:
  - Job ID.
  - Feature.
  - User ID hash.
  - Provider.
  - Status.
  - Created time.
  - Completed time.
  - Retry count.
- Job detail drawer:
  - Sanitized input summary.
  - Provider response status.
  - Error message.
  - Result link.
  - Retry action.
- Notification section:
  - Expo Push Token status.
  - Delivery receipts.
  - Invalid tokens.
  - Opt-out count.

Design notes:

- Do not display raw private chat/journal content.
- Use status colors sparingly:
  - Green for completed.
  - Champagne/gold for queued/running.
  - Muted rose for failed or flagged.
  - Moon gray for disabled/local.

## Content Tone

Use language that is:

- Warm.
- Reflective.
- Slightly poetic.
- Clear and concise.
- Emotionally safe.

Avoid:

- Scary predictions.
- Absolute fate claims.
- Medical/legal/financial promises.
- Shame or judgment.
- "This will definitely happen" language.

Example tone:

"Today asks you to listen before you decide. A small pause may reveal which desire is truly yours."

## Product Disclaimers

Include subtle but clear disclaimers where relevant:

- Tarot and spiritual readings are for entertainment and self-reflection.
- AI persona guides are inspired simulations, not the real person, author, publisher, or official representative.
- Face reading is symbolic entertainment, not a scientific assessment.
- Nilaza does not provide medical, legal, financial, or mental health diagnosis/advice.

## Archived Stitch Generation Prompt — superseded for brand and first-run flow

Use this prompt when generating the first design set:

```text
Create a high-fidelity mobile UI design for Nilaza, a premium mystical AI companion app for Gen Z users and women interested in tarot, astrology, self-discovery, emotional reflection, and wisdom chat.

Design for iOS and Android mobile screens. Build the actual app experience, not a landing page.

Screens: onboarding welcome, goals selection, birth profile, tone preference, home, explore, persona list, persona detail, chat room, tarot topic, tarot deck selection, tarot draw, tarot result, astrology birth form, astrology report, face reading consent, face reading upload, journal, journal detail, premium paywall, profile, admin dashboard, prompt management, content library admin, job status and notifications admin.

Style: elegant mystical editorial, premium, calm, feminine but mature, high readability. Use charcoal black, soft ivory, champagne gold, deep teal, muted rose, moon gray. Avoid generic purple gradients and cheap occult visuals.

Use realistic mobile layouts with bottom tabs: Home, Explore, Chat, Journal, Profile. Use visual assets for tarot cards, persona portraits, moon/star details, and soft paper texture. Keep cards at 8px radius or less. Do not use nested cards. Use icon buttons for save, share, back, close, search, and settings.

The app should feel emotionally intelligent and personal. Copy should be short, warm, reflective, and safe. Avoid deterministic fortune-telling claims.
```

## Stitch Admin Dashboard Generation Prompt

Use this prompt to generate the admin dashboard design:

```text
Create high-fidelity mobile UI screens for Nilaza admin operations inside the existing Nilaza mobile design system.

Design screens: Admin Dashboard, Prompt Management, Content Library Admin, Job Status and Notifications Admin.

Audience: product owner/admin, not normal app users. The UI should be dense, calm, utilitarian, and scan-friendly while matching Nilaza's premium mystical dark style. Avoid marketing layout, hero sections, decorative nested cards, and oversized type.

Use charcoal black, soft ivory, champagne gold, deep teal, muted rose, moon gray. Keep cards at 8px radius or less. Use compact KPI tiles, status chips, segmented controls, tables/lists, search fields, tabs, and icon buttons for settings/filter/edit/retry.

Admin Dashboard should show local/staging/production environment, backend status, queue health, model API health, astrology API health, push notification status, active users, tarot readings, persona chats, astrology jobs, estimated AI cost, safety flags, usage trend, feature mix, recent jobs, recent prompt edits, recent safety events, and top personas/decks.

Prompt Management should show a prompt list, version/status, VI/EN editor tabs, test input, simulated response preview, reviewer checklist, safety warnings, save draft, run audit, publish version, and rollback.

Content Library Admin should show personas, books, tarot decks, astrology, research queue tabs; searchable rows with category, access tier, status, risk level, usage count; and a detail panel with bilingual copy, prompt profile, visual direction, safety/IP notes, market signal, publish checklist.

Job Status and Notifications Admin should show queued/running/failed jobs, average completion time, push sent/failures, job table, sanitized input summary, provider status, retry action, Expo Push Token status, delivery receipts, invalid tokens, and opt-out count.

Do not display raw private user messages or journal content. Use IDs, hashes, summaries, counts, and status labels.
```
