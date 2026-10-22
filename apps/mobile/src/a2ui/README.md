# Nilaza A2UI Component Library

Identity: read `docs/BRAND_GUIDELINES.md` before UI changes. Use the shared `Brand` component for symbol/horizontal/stacked variants, generated PNG assets on mobile and accessibility labels. Brand motion belongs only to welcome and respects Reduce Motion. Feature artwork remains in feature modules; no tarot/persona imagery in shared brand components.

A2UI is the reusable UI layer for the Nilaza mobile app. It exists so every coding agent can build screens with the same visual language, avoid duplicate UI, and migrate large MVP screens into maintainable feature modules without breaking the app shell.

Keep A2UI small, stable, and independent from tarot, persona, journal, admin, storage, backend, prompt, or seed-data logic.

## Required Reading For Mobile UI Agents

Before editing mobile UI, read:

1. `AGENTS.md` for product guardrails.
2. `docs/AGENT_TASK_ROUTER.md` for scoped paths and validation.
3. `DESIGN.md` for Nilaza's visual direction.
4. This file for reusable components and contribution rules.

## Layer Contract

| Layer | Purpose | May import | Must not import |
| --- | --- | --- | --- |
| `src/theme.ts` | Design tokens for color, spacing, radius, typography, motion | Nothing app-specific | Components, feature logic, storage |
| `src/a2ui` | Reusable primitives and cross-feature patterns | `theme.ts`, React Native, icon library, generic types | Seed/config data, AsyncStorage, backend clients, feature-specific types |
| `src/features/<feature>` | Feature-owned screens, containers, adapters | A2UI, feature data hooks, feature types | Unrelated feature internals |
| `App.tsx` | App shell, routing state, temporary MVP orchestration | Features, A2UI, storage bridge | New large screen logic when a feature module can own it |

If a component needs tarot cards, personas, journal entries, auth state, prompt IDs, or local storage, it belongs in `src/features/<feature>`, not A2UI. A feature adapter can translate feature data into generic A2UI props.

## Component Maturity Levels

Use the smallest level that solves the problem.

| Level | Description | Examples |
| --- | --- | --- |
| Primitive | Small reusable building block with minimal props | `PrimaryButton`, `Chip`, `StatusChip`, `IconButton` |
| Pattern | Cross-feature composition for repeated interaction models | `ChatSurface`, `ChatComposer`, `ChatMessageBubble`, `CalendarDatePicker` |
| Feature adapter | Feature-specific wrapper that maps business data to A2UI | `CouncilChatThread`, `TarotCardPicker`, `JournalInsightList` |

Only Primitive and Pattern components belong in A2UI. Feature adapters belong under `src/features/<feature>`.

## Current Inventory

### Shell And Navigation

- `ScreenShell`
- `TopBar`
- `GlassTopBar`
- `SubflowTopBar`
- `FadeInView`

### Typography And Section Structure

- `Header`
- `EditorialHeader`
- `SectionLabel`
- `ContentBlock`
- `ReadingDetails`: summary-adjacent expand/collapse control for validated, feature-supplied sections, questions, notes and evidence actions. Preserve the complete result in feature/storage adapters; do not truncate prose in this presentation layer.

### Buttons, Chips, And Actions

- `IconButton`
- `IconText`
- `PrimaryButton`
- `RitualButton`
- `SecondaryButton`
- `Chip`
- `ChoiceTile`
- `ActionTile`
- `FeatureWide`
- `FeatureTile`

### Status And Utility UI

- `MiniStat`
- `StatusChip`
- `StatusLine`
- `LanguageSelector`
- `CalendarDatePicker`
- `OnboardingProgress`
- `RitualLoading`

### Chat Patterns

- `ChatSurface`
- `ChatParticipantStrip`
- `ChatMessageBubble`
- `ChatComposer`
- `QuickReplyRail`

Use the chat patterns for new persona chat, AI Council, guided reflection, and future community-style conversation UI. Existing screens can migrate to these components in small slices.

## Rules For Adding Components

Add to A2UI only when all checks are true:

- The component can serve at least two features or is a generic app pattern.
- Props are feature-neutral and explicit.
- Styling uses `colors`, `spacing`, `radius`, and `typography` from `theme.ts`.
- Cards and controls stay at `radius.card` or `radius.control` unless `DESIGN.md` changes.
- The component has accessible press targets and `accessibilityRole` for buttons.
- Dynamic text can wrap or truncate without shifting fixed UI.
- The component does not fetch, save, mutate, or know where data came from.

Keep in the feature when any check is true:

- The component needs product config, seed data, prompt IDs, storage, auth, backend, or feature-specific enums.
- The component exists for only one screen and is not likely to repeat.
- The component encodes business rules such as tarot spreads, persona selection, safety states, or premium entitlement logic.

## Naming And File Structure

Prefer grouping new cross-feature patterns by domain:

```text
src/a2ui/
  index.tsx          # legacy exports and small primitives
  chat.tsx           # reusable chat patterns
  README.md          # component library contract
```

Future groups can be added as `forms.tsx`, `cards.tsx`, or `navigation.tsx` when enough related components exist. Re-export them from `index.tsx` so feature code can import from `./src/a2ui`.

Use clear names:

- `ChatMessageBubble`, not `Bubble`.
- `FeatureTile`, not `Card`.
- `CalendarDatePicker`, not `DatePicker2`.

## Prop Design

Prefer stable, generic props:

```tsx
<ChatMessageBubble tone="guide" author="Marcus" meta="Reflective view">
  Notice what this question is asking you to protect.
</ChatMessageBubble>
```

Avoid feature-specific props in A2UI:

```tsx
// Do not add this to A2UI.
<ChatMessageBubble persona={marcusPersona} councilTemplate={template} />
```

Instead, map feature data before rendering:

```tsx
<ChatMessageBubble
  author={persona.displayName}
  avatar={persona.avatar}
  meta={persona.archetype}
  tone="guide"
>
  {message.text}
</ChatMessageBubble>
```

## Chat UI Guidance

For conversation-like features, use a group-chat mental model:

- Keep the message thread as the main screen area.
- Keep the composer visible near the bottom of the feature surface.
- Hide or collapse onboarding/explainer content once the conversation starts.
- Put participants in `ChatParticipantStrip`.
- Use one obvious add-participant affordance near the participant strip.
- Use `QuickReplyRail` for optional prompts, not as the only way to ask.

Persona chat and AI Council should use A2UI chat patterns through feature adapters. A2UI owns generic thread, bubble, quick reply, participant, and composer patterns; each feature still owns its own orchestration, safety/reporting, save behavior, and business state.

## Migration Strategy

Do not rewrite the full app in one pass. Use this sequence:

1. When touching a screen, identify duplicated UI already available in A2UI.
2. Replace only the local UI piece needed for the current task.
3. Keep behavior and storage unchanged.
4. Run `npm --workspace apps/mobile run check`.
5. If the same local style appears in two or more features, promote it into A2UI with this README updated.

Good next migrations:

- Move guide/council participant rows to `ChatParticipantStrip`.
- Split feature-owned screens from `App.tsx` into `src/features/<feature>` adapters.

Current migrated feature adapters:

- `src/features/council/AiCouncilRoom.tsx`: AI Council room presentation. It consumes A2UI chat patterns while keeping Council-specific template, guide, transcript, and invite behavior inside the feature layer.
- `src/features/council/useAiCouncilRoom.ts`: AI Council state, template selection, invite logic, backend/fallback generation, follow-up prompts, and Journal transcript saving.
- `src/features/persona/PersonaChatRoom.tsx`: Persona 1:1 chat room presentation. It consumes A2UI chat patterns while keeping Persona-specific messages, handoff context, save/report actions, and generation orchestration outside A2UI.

## Validation

After meaningful A2UI changes, run:

```powershell
npm --workspace apps/mobile run check
```

When adding behavior-heavy components, add or update tests under `src/a2ui/__tests__`. For visual changes, also review the mobile viewport around `390 x 884`.
