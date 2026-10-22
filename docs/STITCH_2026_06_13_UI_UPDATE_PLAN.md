# Stitch 2026-06-13 UI Update Plan

Last updated: 2026-06-13

## Scope

This plan reviews the new Stitch export in `design/stitch/2026-06-13/stitch_nilaza_mobile_app_design`, compares it with the prior 2026-06-08 Stitch direction and the current Expo MVP, and proposes a full update path for UI, content data, and backend schema.

Primary sources:

- `design/stitch/2026-06-13/stitch_nilaza_mobile_app_design/readme_handover_v2.md`
- `design/stitch/2026-06-13/stitch_nilaza_mobile_app_design/*/screen.png`
- `design/stitch/2026-06-08/stitch_nilaza_mobile_app_design`
- `DESIGN.md`
- `docs/STITCH_DESIGN_STATUS.md`
- `docs/FEATURE_PRD.md`
- `docs/BACKEND_PROXY_ARCHITECTURE.md`
- `apps/mobile/App.tsx`
- `apps/mobile/src/types.ts`
- `supabase/migrations/202606120001_mvp_schema.sql`

## Executive Summary

The 2026-06-13 update is not just a visual refresh. It shifts Nilaza from a functional MVP prototype toward a stronger "Mystical Editorial V2" product experience:

- Tarot becomes a ritualized journey, not only a form plus result screen.
- Decks and cards become browsable editorial content, not only selection metadata.
- Persona detail becomes a richer profile with tabbed "Reflections" and "Chronicle" content.
- Chat becomes more atmospheric with clearer persona and user message contrast.
- Splash and loading states become branded ritual moments.
- Share cards become first-class generated artifacts.

The current app already has the right MVP flow structure: Home, Explore, Chat, Tarot, Journal, Profile, plus local fallback data and Supabase schema direction. The main gap is that current local types and schema are too flat for the new editorial content and generated asset surfaces.

## UI Delta Against 2026-06-08

### Design System

Keep the existing Nilaza palette and radius discipline, but adopt the new V2 token emphasis:

- Background moves from `#151416` to the slightly warmer `#151311` where practical.
- Warm Ink surfaces remain important: `#2A2525` or the V2 `#211f1d`/`#2c2927` surface levels.
- Editorial serif is now explicit: EB Garamond for large headings, deck names, card titles, and reading section titles.
- Body and labels should use a modern sans family such as Hanken Grotesk where available.
- Buttons should remain structured with 8px radius. Avoid pill-shaped controls.
- Glassy top and bottom bars are now part of the design language.
- New screens use wider, calmer margins around 20-24px and more vertical breathing room.

Current app impact:

- `apps/mobile/src/theme.ts` should grow from color-only tokens into color, typography, radius, spacing, surface, and motion tokens.
- `apps/mobile/App.tsx` should stop duplicating one-off card/header styles where V2 now has repeatable components.
- Font loading should be added through Expo before relying on EB Garamond/Hanken Grotesk in production UI.

### Splash And Loading

New screens:

- `nilaza_splash_screen`
- `shader`

Compared with old splash, V2 is quieter and more premium: logo, "Nilaza", small preparation copy, and a thin ritual progress line. The shader is intended as a branded loading or processing atmosphere.

Update path:

- Add a real Splash/RitualLoading component.
- Use the splash on cold start and as a short transition before Home only when it does not slow repeated app entry.
- Use the shader concept as a lightweight native-safe atmospheric layer. For Expo mobile, prefer React Native animated particles/gradient texture first; only use WebGL if it is stable across iOS and Android.
- Use this loading treatment for tarot generation, long async jobs, and future astrology or face-reading processing.

Data impact:

- No durable user data required.
- Add UI config fields for animation key, copy, and timing in a content/config layer if admin control is desired.

### Persona Experience

New screens:

- `persona_detail_origin_tab_redesign`
- `persona_detail_origin_tab_content`
- `animated_chat_experience`

Compared with 2026-06-08, the persona detail is no longer a single static profile. It now has:

- focused avatar framing
- share/save/menu icon actions
- tabs: Reflections and Chronicle
- reflection concepts such as Natural Flow, Inner Peace, Paradoxical Thinking, Effortless Action
- long-form origin/chronicle editorial content with drop-cap treatment
- source-like quote or wisdom block
- recent insights

Current app gap:

- `Persona` type has name, role, short description, tone, themes, suggested prompts, and transparency note.
- It does not model tabbed sections, long biography/origin content, reflection concepts, quote blocks, or persona detail media variants.

Update path:

- Keep Chat bottom tab as the entry point.
- Add `PersonaDetailTabs` with "Reflections" and "Chronicle".
- Keep transparency copy visible, because historical and book-inspired personas must remain clearly "inspired by".
- Improve chat bubbles to match V2: persona bubble is Warm Ink, user bubble is outlined/gold, suggested chips stagger in, typing indicator is subtle.
- Preserve the current premium soft gate pattern: premium guide detail can be browsed, but chat start is gated.

Data impact:

- Need persona content sections and persona assets, not only `personas.short_description`.
- Chat typing state is ephemeral; do not store it.
- Message-level actions such as saved/reported can remain in `journal_entries` and `safety_events`, but `chat_messages` should allow UI metadata later.

### Tarot Ritual

New screens:

- `set_your_intention`
- `select_your_deck`
- `deck_overview_moon_garden`
- `tarot_draw_ritual`
- `your_reading`
- `tarot_share_card`
- `card_meaning_the_empress`

Compared with 2026-06-08, the new Tarot flow is more coherent and higher value:

- Topic selection becomes "What do you want clarity on?"
- Deck selection becomes "Choose your energy" with larger visual cards.
- Deck overview gives each deck a product/content page.
- Draw screen is simplified into one strong ritual moment: centered card deck, spread slots, tap to draw.
- Result uses named interpretation sections such as Foundation, Current Challenge, and Oracle's Synthesis.
- Card meaning page makes each card an explorable content object.
- Share card is a social-ready generated artifact, not just a button.

Current app gap:

- The app already supports `topic -> spread -> deck -> deckDetail -> draw -> result`.
- Current `TarotDeck` has name, short description, vibe, visual direction, reading style.
- Current `TarotCard` has meanings, keywords, intro, personality portrait, and reflection question.
- Current reading result stores selected cards and a single summary/reflection shape.
- It does not model deck composition UI, per-deck card art assets, card symbolism blocks, reading result sections, share-card payloads, or generated image artifacts.

Update path:

- Keep the current learn-before-draw path for new users and quick-draw path for returning users.
- Upgrade deck selection cards to image-led editorial cards.
- Expand deck detail into a true Deck Overview screen with:
  - deck hero
  - deck description
  - reading style
  - deck composition
  - major arcana highlights
  - minor arcana suits
  - start reading CTA
- Add Card Meaning screen reachable from deck overview and reading result.
- Upgrade result to structured segments:
  - spread position label
  - card name and image
  - per-position interpretation
  - oracle synthesis
  - reflection prompt
  - save, share, ask follow-up
- Add share-card preview and generation/export path.

Data impact:

- Need `tarot_spreads` and spread position definitions as content, not only TypeScript constants.
- Need per-reading card rows or structured JSON that includes position keys, labels, orientation, card id, deck id, image asset, and interpretation section.
- Need per-card editorial blocks for Archetype, Symbolism, and Message.
- Need share artifact storage and snapshot payload so a shared card stays stable even if the reading or card copy changes later.

### Journal And Profile

The 2026-06-13 export did not primarily redesign Journal/Profile, but the new Tarot and Persona flows increase their requirements:

- Journal entries should preserve source context more richly.
- Tarot saved entries should link back to reading result and possibly to share artifact.
- Chat saved entries should link to persona, message, and prompt version.
- Profile should eventually expose privacy controls for generated/share artifacts.

Update path:

- Keep current Journal UI until Tarot/Persona V2 lands.
- Add richer source metadata behind the scenes first.
- Then update Journal detail to display content blocks based on source type.

Data impact:

- Extend `journal_entries` with `source_snapshot jsonb` or use a generic `content_snapshots` table.
- Keep personal notes/mood as first-class fields.

## Recommended Implementation Phases

### Phase 1 - Design System Foundation

Goal: make the app able to express V2 screens consistently.

Work:

- Update `apps/mobile/src/theme.ts` with V2 surface tokens, typography tokens, section spacing, glass surface, and motion duration constants.
- Add font loading for EB Garamond and Hanken Grotesk or closest available bundled fonts.
- Extract reusable components from `App.tsx`:
  - `ScreenShell`
  - `GlassTopBar`
  - `GlassTabBar`
  - `EditorialHeader`
  - `RitualButton`
  - `IconAction`
  - `SectionLabel`
  - `ContentBlock`
  - `TarotCardImage`
  - `RitualLoading`
- Do a phone-size visual check around 390 x 884.

Do before backend changes because it reduces UI churn.

### Phase 2 - Tarot V2 Vertical Slice

Goal: implement the new end-to-end Tarot journey.

Work:

- Update intention, deck selection, deck overview, draw ritual, result, share-card preview, and card meaning screens.
- Preserve current local fallback generation.
- Add structured result shape locally before backend migration.
- Add save/share/report states.
- Use current premium deck preview behavior.

Validation:

- New user can learn deck before drawing.
- Returning user can quick draw.
- Reading can be saved to Journal.
- Result stays stable after saving.
- Premium decks are visible but gated.

### Phase 3 - Persona Detail And Chat V2

Goal: add rich guide profile without weakening transparency.

Work:

- Add persona detail tabs.
- Add reflection/chronicle content sections.
- Improve chat contrast and typing state.
- Preserve save/report/new chat actions.
- Keep "inspired by" copy visible.

Validation:

- User understands what the guide is before chat.
- Premium guide browse path still works.
- Chat remains readable and emotionally warm.

### Phase 4 - Share Artifacts And Journal Upgrade

Goal: make saved and shared output durable.

Work:

- Add share-card preview for Tarot.
- Add share artifact payload.
- Upgrade Journal detail to show source-specific blocks and link back to reading/persona.
- Add privacy controls for generated artifacts when backend is live.

### Phase 5 - Backend Migration And Admin Readiness

Goal: support future design fields without repeated schema churn.

Work:

- Add flexible content sections and media asset tables.
- Move spread definitions out of hard-coded app constants.
- Normalize reading cards or at least standardize reading `interpretation` JSON schema.
- Add generated artifacts table.
- Update admin content model so product owner can edit decks, card meanings, persona sections, and share templates.

## Backend And Data Structure Proposal

The current schema has a strong base:

- `personas`
- `tarot_decks`
- `tarot_cards`
- `tarot_readings`
- `journal_entries`
- `generation_jobs`
- `usage_events`
- `safety_events`
- `prompt_versions`

But avoid adding one new column for every new design field. The safer long-term pattern is:

- Keep stable identity fields as columns.
- Store repeatable editorial UI as ordered section rows.
- Store design/media variants as asset rows.
- Store generated result snapshots as immutable JSON.
- Keep user-private content under user-owned tables with RLS.

### Add `content_sections`

Use for persona tabs, deck overview sections, card meaning sections, journal detail blocks, and future admin-managed editorial content.

Suggested shape:

```sql
create table public.content_sections (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('persona', 'tarot_deck', 'tarot_card', 'journal_template', 'share_template')),
  owner_id uuid not null,
  section_key text not null,
  locale text not null default 'vi',
  title text,
  subtitle text,
  body text,
  blocks jsonb not null default '[]'::jsonb,
  display_style text,
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Examples:

- Persona `reflections`: list of concepts.
- Persona `chronicle`: long biography/origin body with drop-cap display.
- Tarot card `archetype`, `symbolism`, `message`.
- Tarot deck `composition`, `major_arcana_highlights`, `minor_arcana_suits`.

Why this matters:

- Stitch can add more content blocks later without requiring a new table each time.
- Admin UI can edit sections uniformly.
- App can render sections by `owner_type`, `section_key`, and `display_style`.

### Add `media_assets`

Use for deck hero images, card faces, card backs, persona portraits, splash logo, share-card generated images, and future admin-uploaded assets.

Suggested shape:

```sql
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null,
  owner_id uuid,
  kind text not null,
  locale text,
  storage_path text,
  external_url text,
  alt_text jsonb,
  generation_prompt jsonb,
  width integer,
  height integer,
  dominant_colors text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft', 'active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Examples:

- `owner_type='tarot_deck'`, `kind='deck_hero'`
- `owner_type='tarot_deck'`, `kind='card_back'`
- `owner_type='tarot_card'`, `kind='card_face'`
- `owner_type='persona'`, `kind='portrait_primary'`
- `owner_type='reading'`, `kind='share_card'`

### Add `tarot_spreads`

Move spread definitions out of app constants.

Suggested shape:

```sql
create table public.tarot_spreads (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,
  description jsonb,
  access_tier text not null default 'free',
  positions jsonb not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Example `positions`:

```json
[
  { "key": "foundation", "label": { "en": "Foundation", "vi": "Nền tảng" }, "order": 1 },
  { "key": "current_challenge", "label": { "en": "Current Challenge", "vi": "Thử thách hiện tại" }, "order": 2 },
  { "key": "oracle_synthesis", "label": { "en": "Oracle's Synthesis", "vi": "Thông điệp tổng hợp" }, "order": 3 }
]
```

### Add `tarot_reading_cards`

The current `tarot_readings.selected_cards jsonb` is acceptable for MVP, but V2 result screens need stable, queryable card positions and per-card interpretation sections.

Suggested shape:

```sql
create table public.tarot_reading_cards (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.tarot_readings(id) on delete cascade,
  card_id uuid references public.tarot_cards(id),
  deck_id uuid references public.tarot_decks(id),
  position_key text not null,
  position_label jsonb,
  orientation text not null default 'upright' check (orientation in ('upright', 'reversed')),
  sort_order integer not null,
  interpretation jsonb not null default '{}'::jsonb,
  media_asset_id uuid references public.media_assets(id),
  created_at timestamptz not null default now()
);
```

Keep `tarot_readings.interpretation` for top-level summary, reflection prompt, safety metadata, and model output metadata.

### Add `generated_artifacts`

Use for share cards and future generated visual/text artifacts.

Suggested shape:

```sql
create table public.generated_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('tarot_reading', 'chat_message', 'astrology_report', 'journal_entry')),
  source_id uuid not null,
  artifact_type text not null check (artifact_type in ('share_card', 'export_image', 'summary_text')),
  template_key text,
  payload jsonb not null default '{}'::jsonb,
  media_asset_id uuid references public.media_assets(id),
  visibility text not null default 'private' check (visibility in ('private', 'shared', 'deleted')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

Why this matters:

- A shared Tarot card should not change if card meanings or deck design copy changes later.
- Users need delete/privacy controls for generated artifacts.
- Admin can track feature usage without exposing private message text.

### Extend Existing Tables Carefully

Minimal direct extensions:

- `personas`: add optional `metadata jsonb`, `version text`, maybe `primary_media_asset_id`.
- `tarot_decks`: add optional `metadata jsonb`, `version text`, maybe `primary_media_asset_id`.
- `tarot_cards`: add optional `metadata jsonb`, maybe `primary_media_asset_id`.
- `chat_messages`: add optional `ui_metadata jsonb` and `saved_at timestamptz` if message state becomes first-class.
- `journal_entries`: add optional `source_snapshot jsonb` for durable display without refetching every source.
- `usage_events`: already has `metadata jsonb`; use it for ritual steps, share preview, haptic events, and gate impressions.

Avoid:

- Adding fixed columns like `persona_chronicle_title`, `deck_major_arcana_copy`, `card_symbolism_1`, etc.
- Storing raw private chat text in admin-facing logs.
- Storing share images without delete controls.

## API Contract Changes

### Tarot Reading Request

Current request is close, but V2 should include:

- `spreadId` or `spreadSlug`
- spread positions
- deck version
- card asset version
- requested result style
- user language
- optional question

### Tarot Reading Response

Suggested response:

```ts
type TarotReadingV2 = {
  id: string;
  topic: string;
  question?: string;
  spread: {
    id: string;
    slug: string;
    name: LocalizedText;
  };
  deck: {
    id: string;
    slug: string;
    version?: string;
  };
  cards: Array<{
    cardId: string;
    deckId: string;
    positionKey: string;
    positionLabel: LocalizedText;
    orientation: "upright" | "reversed";
    imageAssetId?: string;
    interpretation: {
      title?: LocalizedText;
      body: LocalizedText;
      reflectionPrompt?: LocalizedText;
    };
  }>;
  synthesis: LocalizedText;
  reflectionPrompt: LocalizedText;
  promptVersionId?: string;
  moderationStatus: "passed" | "blocked" | "fallback";
};
```

### Persona Detail Response

Suggested response:

```ts
type PersonaDetailV2 = Persona & {
  mediaAssets: MediaAsset[];
  sections: Array<{
    sectionKey: "reflections" | "chronicle" | string;
    title?: LocalizedText;
    body?: LocalizedText;
    blocks: unknown[];
    displayStyle?: string;
  }>;
};
```

## Admin Implications

The new UI implies admin needs more than prompt editing:

- Manage persona sections and tab content.
- Manage deck overview copy and composition.
- Manage card meaning sections.
- Manage media assets and generation prompts.
- Manage share-card templates.
- Preview content in mobile rendering style before publishing.
- Version content and prompts separately.

Recommended admin content workflow:

1. Create/edit content section as draft.
2. Attach media assets or generation prompts.
3. Preview in mobile layout.
4. Run safety/IP/localization audit.
5. Publish version.
6. Write `admin_audit_logs` entry.

## Data Quality Notes

Current JSON seed files contain some Vietnamese mojibake in `packages/content/data`. Before expanding seed content for V2, normalize all user-facing Vietnamese to standard accented UTF-8. This aligns with `AGENTS.md` and avoids carrying corrupted copy into Supabase.

## Risks And Decisions Needed

- Font availability: confirm whether EB Garamond/Hanken Grotesk will be bundled locally or fetched at build time.
- Shader: confirm whether the WebGL shader is essential for native mobile, or whether a React Native animated approximation is acceptable for MVP.
- Share card: decide whether it is MVP phase 2 or pulled into MVP because the new design makes it a core social loop.
- Asset licensing: imported Stitch image URLs should be treated as references. Production needs owned, generated, licensed, or public-domain-safe assets.
- Backend timing: UI can simulate V2 data locally first, but schema should be added before real Supabase content editing begins.

## Recommended Next Step

Implement Phase 1 plus the Tarot V2 vertical slice first. This gives the product owner the most visible improvement while validating the new flexible content structure before Persona, Journal, and Admin are expanded.

