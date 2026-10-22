# Nilaza project skills

Versioned sources: nilaza-plan-qc, nilaza-brand-experience, nilaza-tarot-deck-production, nilaza-tarot-content-qc, and nilaza-tarot-art-qc. Canonical version and SHA-256 entries live in skills/manifest.json. Keep unrelated metadata and invocation policy intact. Packaged plugin skills are never sync targets.

Run npm run skills:sync to install reviewed source files into CODEX_HOME/skills (or the user .codex/skills folder); npm run skills:check reports missing/drifted files without writing. A changed installed file must be reconciled explicitly, not silently overwritten. Run system Skill Creator quick_validate.py for each changed source. For Tarot, validate a new-deck and a single-card repair route plus the incomplete-review rejection gate.

Before each new feature or material expansion, review routed source files and actual dependency/config versions, identify affected skills, and pass `npm run feature:preflight -- --record docs/feature-plans/<task>.json`. Check volatile API and security claims against current official primary documentation. Mark each affected skill `updated` or `verified-current` with evidence. Manifest hashes and `skills:check` establish byte identity and installation state, not semantic freshness.

Start supported feature development or generation commands through `npm run feature:run -- --record docs/feature-plans/<task>.json --script mobile:dev` with the appropriate allowlisted script. The runner repeats preflight and checks planned outputs, dirty known inputs, and local entry-script source hashes. Direct commands can bypass it; CI verifies committed changes, not local command order.

After feature validation, update affected repository skill sources when implementation reveals durable guidance; refresh reviewed manifest entries, run `npm run skills:validate` and Skill Creator validation, then `npm run skills:sync` and `npm run skills:check`. Retain the recorded verified-current decision when no skill change is needed. Packaged plugin skills are never Nilaza sync targets.

Skill sync establishes repository-to-installed file parity on the current machine only. It does not deploy Admin/mobile/backend, publish AI configuration, move browser drafts across origins, or install skills in online agent environments. For local/online implementation requests, use `nilaza-plan-qc/references/admin-runtime-parity.md` and report each synchronization layer with its own evidence and any remaining differences. Keep these internal skill sources outside public hosting and Help/search exports.
