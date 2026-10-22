# Mobile CI Owner Guide

Last updated: 2026-09-20

## What it does for you

**Mobile quality** is an automatic checklist that runs after a developer/agent pushes a branch or opens a pull request that changes the mobile app. You do not need to run commands locally.

It checks that:

- the app code and automated tests pass;
- app/config data is valid;
- the web preview can build; and
- Android can embed the JavaScript and assets used by the installed app.

It does **not** publish an app or approve a release. It tells you whether the technical baseline is safe to start device review.

## How to use it

1. Open the pull request on GitHub after the branch is pushed.
2. Scroll to **Checks**. Wait for **Mobile quality / Mobile type, tests and embedded bundles**.
3. If it is green, install the supplied test build and follow the manager test path in its handoff.
4. If it is red, do not accept the build. Open the failed job and send the failing step name and the last error section back to the implementation owner; no secret or private chat history is needed.
5. In GitHub repository settings, ask the repository administrator to make this check required for `main`. Until that setting is made, a green result is still advisory.

## AI Council staging check

**Staging AI Council E2E** is intentionally manual. It signs into a dedicated staging-only account and verifies that a real authenticated Council request returns multiple guide turns with the approved contract version.

Before the first use, a technical owner must create the protected GitHub **staging** environment and add these secrets there:

- `NILAZA_E2E_SUPABASE_URL`
- `NILAZA_E2E_SUPABASE_ANON_KEY`
- `NILAZA_E2E_EMAIL`
- `NILAZA_E2E_PASSWORD`
- `NILAZA_E2E_COUNCIL_INPUT_JSON`

The JSON must use a non-personal test question and staging persona IDs only. Never use a real user's chat, journal, profile, password or API key. After setup, open **Actions → Staging AI Council E2E → Run workflow** whenever the protected Council endpoint changes.

## Release decision

Accept an internal Android test build only when all three are true:

1. Mobile quality is green.
2. The release manifest next to the APK has the expected version and SHA-256.
3. You completed the stated device test path without a blocker.

For this release line, OTA updates are off; a changed review candidate requires a new APK/IPA. This is deliberate until an EAS update-channel rollout has its own verified test.
