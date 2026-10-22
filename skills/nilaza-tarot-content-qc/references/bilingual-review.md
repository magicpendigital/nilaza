# Tarot bilingual content review

Review the effective card introduction (`deck.cardIntroductions[cardId]` for a themed deck, otherwise the canonical intro), canonical meanings and keywords, and the deck's visual prompt and scene manifest. Read each VI and EN text as native prose, then compare their intent. Keep actual JSON text in standard accented UTF-8 Vietnamese.

| Check | Evidence to record |
| --- | --- |
| `bilingualCopy` | Both languages express the same card-specific idea; names, rank, suit, grammar, diacritics, and object references are accurate; copy is distinct from other cards and readable on a phone. Cite the concrete phrase or idea checked. |
| `reflectionSafety` | Copy invites reflection and agency without certainty, fear, shame, diagnosis, or medical, legal, financial, or mental health advice. Note the actual wording reviewed, not only “safe.” |
| Scene alignment | The introduction, visual prompt, and scene plan describe compatible people, actions, objects, symbol counts, and physical constraints. Tell the visual reviewer exactly what to inspect in the rendered card. |

Use the six content skills in `packages/agent-config/tarot-card-skills.json` as writing and review rules. A deck introduction should have its own voice and suit grammar while respecting the canonical archetype. Check that numbered Minor prompts and scenes state the expected count and location of suit objects. For a held item, specify which hand grips it and where its weight is supported; for seated figures, specify body support and leg placement. Avoid copying the composition or prose of a published commercial deck.

If a card fails, record the exact card ID, language, phrase or scene element, proposed correction, and whether the artwork must change. Edit the source copy or scene plan, run `npm run validate:data`, refresh the quality ledger, and record evidence only for the new hash. The final `verify` command must wait for both content and image checks; an incomplete or ambiguous review stays pending.
