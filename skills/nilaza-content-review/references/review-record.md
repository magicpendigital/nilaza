# Review record format

One file per batch: `docs/content-reviews/<batch-id>.json`, LF line endings, UTF-8, accented Vietnamese.

```json
{
  "schemaVersion": 1,
  "batchId": "book-quotes-tao-te-ching-2026-12-01",
  "feature": "Một câu cho hôm nay",
  "dataFiles": ["packages/content/data/book-quotes.json"],
  "reviewedAt": "2026-12-01",
  "editor": "editor-in-chief agent (Claude Code)",
  "drafter": "AI (this session) | human | imported",
  "panel": [
    { "role": "east-asian-classics", "engine": "claude-subagent" },
    { "role": "east-asian-classics", "engine": "mca second_opinion" },
    { "role": "language-translation", "engine": "claude-subagent" },
    { "role": "safety-ethics", "engine": "claude-subagent" },
    { "role": "sources-rights", "engine": "claude-subagent" }
  ],
  "items": [
    {
      "id": "ddk-008",
      "contentSha256": "<sha256 of the item's JSON, LF, as reviewed>",
      "verdict": "PASS | REVISE | BLOCK",
      "round": 1,
      "findings": [
        { "role": "east-asian-classics", "result": "PASS | REVISE | BLOCK | UNSURE", "note": "…", "evidence": "chapter 8, Legge 1891" }
      ],
      "proposedFix": { "vi": "…", "en": "…" },
      "ownerSpotCheck": true
    }
  ],
  "summary": { "pass": 0, "revise": 0, "block": 0, "unsure": 0 },
  "notVerified": ["No human specialist review.", "…"],
  "ownerDecision": { "status": "pending | approved | changes-requested", "date": null, "note": null }
}
```

Rules:

- `contentSha256` is computed on the item exactly as reviewed. If the item changes, its verdict no longer applies: run the affected reviewers again and add a new `round`.
- `findings` keeps every reviewer's own result, including disagreements; the editor's `verdict` never hides a BLOCK.
- `ownerDecision` is only filled from the Owner's own words in chat, with the date.
- Keep reviewer notes short and concrete (what is wrong, why, the fix); do not paste long source passages.
