# Nilaza

Mobile AI companion for self-reflection (tarot, astrology, personas, journaling) built with Expo/React Native, Supabase and a protected Admin console. Start with [AGENTS.md](AGENTS.md) and [docs/AGENT_TASK_ROUTER.md](docs/AGENT_TASK_ROUTER.md).

## About this repository

This repository was created on 2026-10-23 as a clean source baseline for the Android / Google Play release. It starts from a reviewed, allowlisted source tree (see `docs/release/repo-migration-2026-10-23/`):

- The previous repository was renamed `magicpendigital/nilaza-legacy` and stays private as an archive of the old history and pull requests.
- Browser profiles, build caches, exported bundles, QA APKs, device screenshots, environment files and keys are not part of this repository; `.gitignore` and `.easignore` keep them out.
- Original tarot artwork masters (`assets/tarot/**/*.png`, about 1.4 GB) are stored outside Git. The app uses the optimized files under `apps/mobile/assets/runtime`. Deck back and cover PNGs stay here because the data validator reads them.

## Common commands

```bash
npm ci --ignore-scripts
npm run mobile:check
npm --workspace apps/mobile test -- --runInBand
npm run validate:data
npm run validate:visual-assets
```

Release work follows `docs/release/RELEASE_RUNBOOK.md`; nothing in this repository authorizes SQL changes, credential changes or store publication on its own.
