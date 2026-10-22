---
name: nilaza-brand-experience
description: Apply Nilaza Open Reflection identity to UI, website, user guides and launch communications; find approved masters, copy and validation paths. Use for Nilaza brand or public-facing design/content work, not backend-only maintenance.
---

# Nilaza Brand Experience

Find the Nilaza repository (AGENTS.md identifies it); resolve repository paths below from that root, not the installed skill folder. Read AGENTS, docs/AGENT_TASK_ROUTER.md and the applicable Plan-QC gate, then docs/BRAND_GUIDELINES.md. The guidelines and packages/content/data/brand-identity.json are authoritative; this skill intentionally does not duplicate the visual specification.

- Home/welcome/UI: read DESIGN.md and the relevant PRD section. Use existing feature logic, A2UI and shared Brand components. Read docs/BRAND_ROLLOUT_2026-09-11.md to distinguish targets from verified behavior.
- Website/header: follow the brand row and apps/web/README.md; preserve VI/EN URLs, Help/search and waitlist.
- PDF/DOCX/slides/social/store: read the public-content boundary in docs/NILAZA_PUBLIC_HELP_CORPUS.md. Use the document/PDF/presentation tools available for the requested format; render and inspect every exported page. Store images require real release-candidate device captures.

Resolve each asset by role in the manifest. Use generated exports, not concept-board crops, old Stitch logos, the ∞ character, letter N or machine-specific asset paths. Feature imagery belongs in assets/features and feature-visuals.json. Keep fonts, copy, locale, brand version and app reference with each artifact.

Run npm run validate:brand and the router's touched-surface checks. After public Help/legal edits rebuild the corpus and check it. Report evidence separately for integration, browser verification, native verification and release. Never present mockups as app screenshots or verified behavior. Keep owner/Agent/prompt materials protected.

Backend-only requests use the backend route without loading design assets. Do not alter plugin-packaged skills. Official publishing is a separate authorized action after manager acceptance; do not send messages or activate marketing as a side effect of preparing assets.
