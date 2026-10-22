# Nilaza Admin Data Console Architecture

Last updated: 2026-06-11

This document defines the target structure for the desktop admin console that manages content and prompts for each persona and each tarot deck. The mobile app remains the end-user product; admin operations should live in a separate desktop web console.

## Product Decision

Use a dedicated admin web console for manager/operator work.

Reasons:

- Persona and tarot deck editing need tables, long text editors, version history, preview panes, and publish workflows.
- Mobile admin screens are useful for quick review only, not production operations.
- Admin auth, audit logs, and role-based access should be separated from the consumer app surface.

## Access Model

The admin console must require authentication and a separate admin role check before loading data. A normal consumer account can sign in to the mobile app but must not be able to open admin datasets, prompts, assets, app content blocks, audit logs, or release controls.

Recommended roles:

- `super_admin`: full access to edit, publish, delete safe drafts, manage assets, manage roles, and roll back releases.
- `content_admin`: edit and publish personas, tarot content, prompt versions, app content, and feature asset bindings.
- `reviewer`: view data, test prompts, add review decisions, but cannot publish or delete.
- `viewer`: read-only access for product review.
- `regular_user`: mobile app only, blocked from all `/admin/*` APIs.

Enforcement should happen in three places:

- UI route guard: hide the dashboard and show access denied for non-admin accounts.
- Backend middleware: reject `/admin/*` requests without an admin role.
- Supabase RLS: block direct table access unless the current user has an allowed admin role assignment.

## Admin Workspaces

### Personas

List view:

- Name
- Type: `historical_figure`, `book_inspired_guide`, or future mentor categories
- Status: `draft`, `review`, `published`, `archived`
- Access tier
- Active prompt version
- Locale coverage
- IP/safety review status

Detail tabs:

- `Profile`: canonical id, slug, status, tier, themes, tone, visual profile.
- `Localized Content`: name, display role, description, transparency note, suggested prompts per locale.
- `Persona Prompt`: entity-level system prompt for this persona.
- `Sources & IP`: public-domain/licensed/source notes and impersonation boundaries.
- `Test Chat`: sanitized preview input and generated preview output.
- `Safety`: checklist for professional-advice, self-harm, impersonation, and copyrighted text boundaries.
- `Publish`: request review, publish version, rollback version.
- `Analytics`: usage, report rate, save rate, estimated cost.

### Tarot Decks

List view:

- Deck name
- Slug
- Status
- Access tier
- Card content coverage
- Visual asset coverage
- Active prompt version
- Safety review status

Detail tabs:

- `Deck Profile`: canonical id, slug, theme, vibe, visual direction, reading style.
- `Cards`: 78-card table with card status, locale coverage, artwork status, and content status.
- `Card Content`: card intro, personality portrait, upright meaning, reversed meaning, reflection question.
- `Deck Prompt`: entity-level prompt for the selected deck's reading voice and safety boundaries.
- `Visual Assets`: card back prompt, artwork, rendered card PNG, validation status.
- `Test Reading`: one-card and three-card preview using app-selected card IDs.
- `Safety`: deterministic prediction, fear-language, and professional-advice boundaries.
- `Publish`: publish deck content and prompt version as a release bundle.
- `Analytics`: reading count, save rate, share rate, premium conversion.

Deck ownership rule:

- `tarot_decks` is the parent record.
- Every deck owns its own 78 `tarot_deck_card_content` records.
- A card's canonical identity can be shared, but deck-specific wording, visual prompt, artwork, and reading voice must not be stored only once globally because each deck has a different style.
- Creating a new deck should automatically seed 78 draft card records that admins can edit, hide, publish, or bind to deck-specific assets.

### Card Library

List view:

- Card name
- Canonical card ID
- Arcana, suit, and rank.
- Deck binding and deck filter.
- Content status.
- Linked asset status.
- Locale coverage.

Detail tabs:

- `Meaning`: keywords, intro, upright meaning, reversed meaning.
- `Reflection`: journal prompt and reading helper copy.
- `Asset`: linked artwork, card render, card back, validation status.
- `Safety`: no deterministic future claims, no fear language, no professional advice.
- `Publish`: publish, archive, or delete draft content when safe.

The admin UI should present cards inside the selected deck first. A global card search can exist, but the default manager workflow is:

```text
choose tarot deck
-> review that deck's 78 card records
-> edit card copy and artwork for that deck
-> publish the deck/card bundle
```

### Asset Library

The asset library manages:

- Tarot card artwork.
- Rendered tarot card PNGs.
- Deck backs.
- Persona portraits and thumbnails.
- Front-end UI content images.
- Generated share cards and marketing review assets when needed.

Asset operations:

- Upload new asset.
- Replace asset.
- Edit metadata.
- Validate size, ratio, safe area, and usage.
- Delete only when no published content depends on the asset.
- Roll back to previous published asset.

### AI Feature Assets

Feature-level asset management is separate from the generic asset library. The generic library stores the media object; the AI feature workspace controls where that asset is used in the app experience.

Examples of AI features that need asset slots:

- `daily_insight`: home card background and share image.
- `persona_chat`: persona portraits, chat header crops, and empty state media.
- `tarot_reading`: deck backs, 78-card artwork coverage, result header art, and share cards.
- `astrology_preview`: zodiac wheel and chart preview illustration.
- `journal_reflection`: empty state illustration and saved insight thumbnails.
- `premium_credits`: paywall hero and entitlement state media.

Each feature should define required and optional slots:

- `slot_id`
- `usage_role`: `background`, `thumbnail`, `persona_portrait`, `deck_back`, `card_art`, `empty_state`, `share_image`, `paywall_hero`
- `asset_id`
- `is_required`
- `status`: `draft`, `review`, `published`, `blocked`
- `validation_notes`
- `updated_by`
- `updated_at`

Publishing a feature asset bundle should validate that every required slot has a published or review-approved media asset.

### Front-end Content CMS

This workspace manages content displayed by the mobile app, without requiring a mobile app release for copy changes.

Examples:

- Home daily insight card copy.
- Explore feature titles and descriptions.
- Profile privacy copy.
- Paywall benefit copy.
- Empty states.
- Consent and disclaimer text.
- CTA labels.
- Feature flags for visible or hidden content blocks.

All front-end content blocks should be versioned, localized, and published through the same draft/review/publish flow as persona and tarot content.

## Prompt Stack

Do not store only one global prompt. Runtime prompts should be composed from stable layers.

Persona chat:

```text
global_safety_prompt
+ persona_chat_base_prompt
+ selected persona_prompt_version
+ user profile context
+ user message
```

Tarot reading:

```text
global_safety_prompt
+ tarot_reading_base_prompt
+ selected tarot_deck_prompt_version
+ app/backend-selected card IDs and orientations
+ user question
+ user language
```

Every generated chat message or tarot reading must store the exact prompt version IDs used.

## Supabase Tables

### Identity And Access

```text
admin_users
admin_roles
admin_role_assignments
admin_audit_logs
```

### Personas

```text
personas
persona_localizations
persona_prompt_versions
persona_sources
persona_media_assets
```

Recommended `personas` fields:

- `id`
- `slug`
- `type`
- `status`
- `access_tier`
- `default_locale`
- `active_prompt_version_id`
- `themes`
- `tone`
- `created_at`
- `updated_at`

Recommended `persona_prompt_versions` fields:

- `id`
- `persona_id`
- `version`
- `status`
- `locale`
- `prompt_text`
- `safety_notes`
- `reviewer_ids`
- `created_by`
- `published_by`
- `published_at`
- `supersedes_version_id`

### Tarot

```text
tarot_decks
tarot_deck_localizations
tarot_cards
tarot_card_localizations
tarot_deck_card_content
tarot_deck_prompt_versions
tarot_media_assets
```

Recommended `tarot_decks` fields:

- `id`
- `slug`
- `status`
- `access_tier`
- `default_locale`
- `active_prompt_version_id`
- `themes`
- `accent_color`
- `created_at`
- `updated_at`

Recommended `tarot_deck_prompt_versions` fields:

- `id`
- `deck_id`
- `version`
- `status`
- `locale`
- `prompt_text`
- `safety_notes`
- `reviewer_ids`
- `created_by`
- `published_by`
- `published_at`
- `supersedes_version_id`

Recommended `tarot_deck_card_content` fields:

- `id`
- `deck_id`
- `card_id`
- `base_card_id`
- `locale`
- `intro`
- `personality_portrait`
- `upright_meaning`
- `reversed_meaning`
- `reflection_question`
- `visual_prompt`
- `content_status`
- `artwork_status`

Recommended uniqueness:

```text
unique(deck_id, base_card_id, locale)
```

This keeps `moon-garden__major-00-fool`, `rose-mirror__major-00-fool`, and future deck variants separate while preserving the canonical tarot identity.

### Review, Test, Publish

```text
prompt_test_runs
content_reviews
publish_releases
safety_events
generation_jobs
```

### Assets And Front-end Content

```text
media_assets
media_asset_versions
ai_features
ai_feature_asset_slots
app_content_blocks
app_content_block_localizations
app_content_releases
content_asset_bindings
```

Recommended `media_assets` fields:

- `id`
- `asset_type`: `tarot_card`, `deck_back`, `persona_portrait`, `frontend_media`, `share_card`
- `owner_type`: `tarot_deck`, `tarot_card`, `persona`, `app_content`
- `owner_id`
- `status`
- `current_version_id`
- `created_by`
- `created_at`
- `updated_at`

Recommended `media_asset_versions` fields:

- `id`
- `asset_id`
- `storage_path`
- `mime_type`
- `width`
- `height`
- `size_bytes`
- `checksum`
- `validation_status`
- `validation_notes`
- `created_by`
- `created_at`

Recommended `ai_features` fields:

- `id`
- `slug`
- `app_surface`
- `status`
- `active_release_id`
- `prompt_owner_key`
- `default_locale`
- `created_at`
- `updated_at`

Recommended `ai_feature_asset_slots` fields:

- `id`
- `feature_id`
- `slot_id`
- `usage_role`
- `asset_id`
- `is_required`
- `status`
- `validation_notes`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

Recommended `app_content_blocks` fields:

- `id`
- `surface`: `home`, `explore`, `chat`, `tarot`, `journal`, `profile`, `paywall`, `onboarding`
- `slot`
- `status`
- `active_release_id`
- `feature_flag`
- `created_at`
- `updated_at`

Recommended `app_content_block_localizations` fields:

- `id`
- `block_id`
- `locale`
- `title`
- `body`
- `cta_label`
- `metadata`
- `status`
- `updated_by`
- `updated_at`

Recommended `content_asset_bindings` fields:

- `id`
- `content_type`
- `content_id`
- `asset_id`
- `usage_role`: `hero`, `thumbnail`, `card_art`, `background`, `share_image`
- `is_required`

Recommended `publish_releases` fields:

- `id`
- `release_type`: `persona`, `tarot_deck`, `global_prompt`, `bundle`
- `entity_id`
- `version_ids`
- `status`
- `created_by`
- `approved_by`
- `published_at`
- `rollback_release_id`

## API Surface

Admin API:

```text
GET    /admin/personas
GET    /admin/personas/:id
POST   /admin/personas
POST   /admin/personas/:id
POST   /admin/personas/:id/prompt-drafts
POST   /admin/personas/:id/test
POST   /admin/personas/:id/publish
POST   /admin/personas/:id/rollback
POST   /admin/personas/:id/archive
DELETE /admin/personas/:id

GET    /admin/tarot-decks
GET    /admin/tarot-decks/:id
GET    /admin/tarot-decks/:id/cards
POST   /admin/tarot-decks
POST   /admin/tarot-decks/:id
POST   /admin/tarot-decks/:id/prompt-drafts
POST   /admin/tarot-decks/:id/test-reading
POST   /admin/tarot-decks/:id/publish
POST   /admin/tarot-decks/:id/rollback
POST   /admin/tarot-decks/:id/archive
DELETE /admin/tarot-decks/:id

GET    /admin/tarot-cards
GET    /admin/tarot-cards?deck_id=:deck_id
GET    /admin/tarot-cards/:id
POST   /admin/tarot-cards/:id
POST   /admin/tarot-cards/:id/archive
DELETE /admin/tarot-cards/:id/draft

GET    /admin/assets
POST   /admin/assets
POST   /admin/assets/:id/versions
POST   /admin/assets/:id/validate
DELETE /admin/assets/:id

GET    /admin/ai-features
GET    /admin/ai-features/:id
POST   /admin/ai-features/:id
POST   /admin/ai-features/:id/assets
POST   /admin/ai-features/:id/assets/:slot_id/validate
POST   /admin/ai-features/:id/publish

GET    /admin/ai-council-config
POST   /admin/ai-council-config

GET    /admin/app-content
GET    /admin/app-content/:id
POST   /admin/app-content/:id
POST   /admin/app-content/:id/publish
POST   /admin/app-content/:id/archive
```

Runtime API:

```text
POST /ai/persona-chat
POST /ai/tarot-reading
GET  /runtime/app-content?locale=en
GET  /runtime/ai-features/:id/assets?locale=en
```

Runtime API must read only published prompt/content versions. Mobile clients should never call admin APIs and should never receive draft prompt text, unpublished asset paths, or admin notes.

## Publishing Rules

Require review before publish when:

- Persona prompt changes.
- Tarot deck prompt changes.
- Content touches safety disclaimers, health, finance, legal, self-harm, or relationship advice.
- Book-inspired guide source wording changes.
- A new locale is added.
- Tarot card meanings or reflection prompts change.
- A published asset is replaced or deleted.
- App-facing content blocks change copy, CTA, consent text, or visible status.

Do not display raw private chat or journal content in admin. Use IDs, summaries, status, risk labels, and sanitized samples.

## Migration Path

1. Keep `apps/admin` as the static prototype for manager review.
2. Add a real Next.js admin app once dependencies are approved.
3. Create Supabase schema and RLS.
4. Import current JSON seed data into Supabase.
5. Replace local arrays with backend queries.
6. Add auth, role checks, audit logs, and publish workflow.
7. Update mobile runtime to load published versions through backend endpoints.
8. Add cache invalidation for published app content and feature asset manifests.
