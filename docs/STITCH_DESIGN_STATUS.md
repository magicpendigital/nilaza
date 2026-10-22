# Nilaza Stitch Design Status

**Current identity (2026-09-11): Open Reflection v1.** Read [Brand Guidelines](BRAND_GUIDELINES.md) before brand/UI/public-content changes. Implementation and verification status: [rollout record](BRAND_ROLLOUT_2026-09-11.md). Historical Stitch references do not authorize old logos or the superseded onboarding/Home layout.

The screen IDs below are preserved as historical source records. Welcome, intentions, birth/tone onboarding and Home are superseded for this release. Do not export logos from these images.

Last updated: 2026-06-07

## Stitch Project

- Project title: Nilaza Mobile App Design
- Project ID: `6769315093964858756`
- Project resource: `projects/6769315093964858756`
- Visibility: private

## Uploaded Design Brief

- Source file: `DESIGN.md`
- Device target: mobile
- Base screen size returned by Stitch: 390 x 884
- Screen instance ID: `7120525090939027158`
- Source screen: `projects/6769315093964858756/screens/7120525090939027158`

## Design System

- Design system asset ID: `1f2d01854e944a23a7f7d8a8a442745b`
- Created from: uploaded `DESIGN.md`

## Next Design Tasks

1. Review the generated MVP prototype screens in Stitch.
2. Review the generated Admin Operations screens in Stitch.
3. Refine any screen the product owner flags during review.
4. Keep Astrology and Face Reading screens as phase 2/3 design references unless the launch scope changes.
5. After screen designs are approved, export design tokens and implementation notes for the mobile app build.

## Generated MVP Prototype Screens

The following screens were generated in Stitch from the Nilaza design system. Some Stitch list views may paginate or only show a subset, so use these screen resource names as the working references.

| Flow | Screen | Screen resource |
| --- | --- | --- |
| Onboarding | Welcome to Nilaza | `projects/6769315093964858756/screens/95078cf81b1b448c89d4db76f9742a96` |
| Onboarding | Your Intentions | `projects/6769315093964858756/screens/6bdaefc903324353b248c644d1aa9d37` |
| Onboarding | Birth Profile | `projects/6769315093964858756/screens/c9cde5a1afcf4a3fa2c7d7190da7680c` |
| Onboarding | Set Your Tone | `projects/6769315093964858756/screens/daa97953f8a24e0888ab8550a8779d37` |
| Main App | Home | `projects/6769315093964858756/screens/f6a80eec6f6242d88dce0146732a61f0` |
| Main App | Explore | `projects/6769315093964858756/screens/d1388dc332c646678891da6ca7bd88b9` |
| Persona | Choose Your Guide | `projects/6769315093964858756/screens/f9ef7708737b423995a4e48140856f33` |
| Persona | Persona Detail | `projects/6769315093964858756/screens/1c2c9dff0a3145dbbd67f24691205a1f` |
| Persona | Chat Room | `projects/6769315093964858756/screens/db5a624c454545a1a2e5a06336c5885e` |
| Tarot | Tarot Topic | `projects/6769315093964858756/screens/a10acec6fde34904aa476d3792c0bc41` |
| Tarot | Tarot Spread Selection | `projects/6769315093964858756/screens/7606fc6e49264636b32788c82db65ed1` |
| Tarot | Select Your Deck | `projects/6769315093964858756/screens/82cceb2473df46b3bde58bac5dd10bd7` |
| Tarot | Draw Your Cards | `projects/6769315093964858756/screens/9c028e98e8c4408d8fc988a12712c37e` |
| Tarot | Your Reading | `projects/6769315093964858756/screens/2c73c9b674344c9c83e7b9589a53aeb2` |
| Journal | Journal | `projects/6769315093964858756/screens/317ad26645854294b240673964a0ab09` |
| Profile | Profile & Premium | `projects/6769315093964858756/screens/de69029dd51a4878b8db0b09db3c7cf3` |

## Generated Admin Operations Screens

These screens were generated in Stitch on 2026-06-07 using the Nilaza design system and the updated admin dashboard prompt from `DESIGN.md`.

| Flow | Screen | Screen resource |
| --- | --- | --- |
| Admin | Prompt Management | `projects/6769315093964858756/screens/64c68cc34e9c42f1b69e6846a1b15a6a` |
| Admin | Localization & Prompt Admin | `projects/6769315093964858756/screens/222a0558456a48b0a04039c80f58a5fe` |
| Admin | Job Status & Notifications Admin | `projects/6769315093964858756/screens/079a08fce70b40979b0d75bf7f2c5e5c` |

Stitch also reported successful generation of an Admin Dashboard screen and a Content Library Admin screen in the same generation session, but the first follow-up screen listing was truncated before their stable resource IDs could be captured. As of the 2026-06-07 MCP recheck, `Localization & Prompt Admin` and `Job Status & Notifications Admin` are visible and usable. Refresh Stitch authentication before regenerating or recapturing a separate dedicated Admin Dashboard screen.

## Review Notes

- The MVP prototype is ready for first product-owner review.
- The generated prototype covers the complete MVP flow: onboarding, home, exploration, persona chat, tarot reading, journal, profile, privacy, and premium.
- The Tarot flow is complete end-to-end: intention -> deck selection -> draw ritual -> reading result.
- A dedicated Tarot Spread Selection screen was added on 2026-06-12 so the implemented flow can support topic -> spread -> deck -> draw -> result while keeping quick draw available for returning users.
- The Persona flow is complete enough for review: persona list -> persona detail -> chat room.
- The Profile screen includes premium, restore purchases, privacy controls, and account settings in one MVP-friendly screen.
- Admin dashboard requirements are now captured in `DESIGN.md`, including backend status, queue health, provider health, usage KPIs, prompt edits, safety events, and notification delivery status.
- Astrology and Face Reading are intentionally not included as full MVP consumer screens yet because they are recommended for phase 2/3.
