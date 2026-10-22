# Nilaza public help corpus

Generated retrieval corpus for the future public Nilaza Guide assistant.

- `manifest.json`: source allowlist, assistant boundaries, document metadata, public URLs, and checksums.
- `corpus.jsonl`: one retrieval-ready public chunk per line.
- Source of truth: `apps/web/src/content/help` and `apps/web/src/content/legal` only.

Regenerate with `npm run public-help-corpus:build` and verify drift with `npm run public-help-corpus:check`. Do not edit generated JSON/JSONL by hand.
