# Persona Detail Content Review

Last updated: 2026-06-17

## Scope

Reviewed the current Persona Detail screen against the selected Stitch designs in:

- `design/stitch/2026-06-13/stitch_nilaza_mobile_app_design/persona_detail_origin_tab_redesign`
- `design/stitch/2026-06-13/stitch_nilaza_mobile_app_design/persona_detail_origin_tab_content`

The review covers the 10 seed personas in:

- `packages/content/data/personas-figures.json`
- `packages/content/data/personas-books.json`

## Current Fit

The current Persona Detail UI now matches the selected mobile design direction at the structure level:

- Top action row with circular back, favorite, bookmark, and share actions.
- Large portrait hero with title and subtitle overlay.
- Two-tab content model: `Reflections` and `Chronicle`.
- Editorial cards for wisdom domains, guide quote, recent insights, historical echoes, and bottom CTA.
- Mobile/web preview shell is width-constrained so desktop browser testing no longer stretches the mobile UI.

## Content Gap Fixed

Before this update, only Laozi had local detail sections, and those sections used `ownerId: "laozi"` while the app looks up persona sections by full ids such as `figure-laozi`. That meant the Persona Detail screen often fell back to generic prompts and short descriptions instead of showing designed editorial content.

This update adds `packages/content/data/persona-detail-content.json` with:

- `reflections` and `chronicle` sections for all 10 seed personas.
- A quote block and two insight blocks for every `reflections` section.
- Chronicle intro, subtitle, and two editorial highlight blocks for every persona.
- Bilingual `vi` and `en` content written for the UI's short, premium, reflective tone.

Validation now checks that every seed persona has both required detail sections.

## UI Design Assessment

Good enough for MVP mobile review:

- The content length now fits the card-based editorial rhythm better than raw prompts.
- The two-tab structure has enough meaningful material for every persona.
- Transparency remains visible and aligned with Nilaza's safety/IP guardrails.
- Premium personas stay visible but gated at the action layer.

Needs follow-up if targeting desktop as a real product surface:

- The current web behavior is still a centered mobile/tablet preview, not a purpose-built desktop layout.
- Desktop could use a two-column persona detail layout: portrait/CTA on the left, tabs/content on the right.
- The bottom tab bar should become a side rail or top navigation on wide screens if desktop becomes a supported surface.
- Persona hero art should define desktop crops separately to avoid awkward portrait framing on wide layouts.

## Recommended Next Adjustment

For MVP and manager testing, keep the current width-constrained mobile preview. It is faithful to the selected Stitch mobile design and avoids accidental stretched layouts.

For a later responsive pass, create a separate Stitch/design target for:

- `persona_detail_mobile`
- `persona_detail_tablet`
- `persona_detail_desktop`

Then implement breakpoint-specific structure instead of stretching the mobile design.
