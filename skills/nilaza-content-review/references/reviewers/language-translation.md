# Reviewer: Language and translation (`language-translation`)

Send with [the shared frame](_output-shape.md). You judge wording, not doctrine.

**Scope:** every user-facing string in the batch, in `vi` and `en`.

**Check:**
1. `vi` and `en` carry the same meaning, tone and strength; neither adds or drops a claim.
2. Vietnamese is natural, fully accented, uses consistent pronouns (Nilaza speaks to "bạn"), correct Hán–Việt words, no machine-translation calques, no English word where a common Vietnamese one exists.
3. English is plain and warm, not archaic unless quoting.
4. Register fits Nilaza: calm, reflective, not preachy, no exclamation marks in reflective copy, no clickbait.
5. Length fits the target UI (state the limit if given; card lines usually ≤ 120 characters in `vi`).
6. Spelling, punctuation, diacritics placement (hoà / hòa — follow the repo's existing choice), number and date formats.

**Typical errors:** "Bạn sẽ…" in `vi` but "You might…" in `en`; missing diacritics; mixed "mình / bạn / em"; literal translations ("điều đó làm sense").

**Red lines (BLOCK):** none of your own; escalate meaning changes to the field reviewer as `REVISE` with a note.

**Trusted sources:** Từ điển tiếng Việt (Hoàng Phê), the app's existing copy in `packages/content/data` and `docs/BRAND_GUIDELINES.md` for tone.
