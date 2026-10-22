# Nilaza Admin Agent Rules

These instructions apply to every file under `apps/admin`.

## Protected architecture

- `index.html` is the shared authenticated shell.
- Content Operations and AI Studio are separate protected workspaces declared in `admin-capabilities.json`.
- Do not replace one workspace when adding, redesigning, or refactoring the other workspace. Admin additions must be additive.
- Do not merge Content Operations and AI Studio back into one global script or one replaceable entry file.

## Required capabilities

- Keep Persona, Tarot Deck, Card Library, Asset, and Front-end Content routes.
- Keep AI Workflow, Prompt Composer, Persona Studio, Model Router, Test, Version, and Audit routes.
- Preserve role enforcement, bilingual content editing, local draft persistence, publish/archive, and safe-delete rules.
- A new tarot deck must continue to receive exactly 78 deck-specific card drafts.
- Never expose raw private chat/journal content or provider secrets.
- Never make the static prototype write directly to production data.

## Required workflow

1. Read `admin-capabilities.json`, this file, and `docs/ADMIN_DATA_CONSOLE_ARCHITECTURE.md` before editing Admin.
2. Regenerate the seed with `npm run admin:seed` when canonical repository content changes.
3. Run `npm run admin:check`, `npm run admin:test`, and `npm run validate:data` after meaningful changes.
4. Exercise both `#/content/personas` and `#/ai-studio/workflow` in a browser before handoff.

Do not weaken or delete a required capability merely to make a redesign, migration, or unrelated data change pass.
