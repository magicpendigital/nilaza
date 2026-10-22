# Nilaza Admin Git and Preview Workflow

This workflow keeps Admin code changes reviewable while content changes remain versioned in the shared Supabase staging project.

## Working agreement

1. Start from the latest `main` and create a scoped branch such as `codex/admin-content-sync` or `codex/admin-model-routing`.
2. Make one reviewable Admin change per branch. Do not commit unrelated mobile, public-help, or generated content changes into an Admin PR.
3. Before opening a PR, run:

   ```powershell
   npm run admin:check
   npm run admin:test
   npm run validate:backend
   npm run supabase:check
   git diff --check
   ```

4. Open a PR against `main`. The `Admin quality` GitHub check must pass.
5. If the Vercel project is connected to the GitHub repository, Vercel creates the preview deployment from the PR. Use the preview URL for the signed-in Admin smoke test before promoting the deployment to the stable staging alias.
6. The current `nilaza-admin-staging` project is CLI-linked and has not yet exposed a Git integration in project metadata. Until the owner connects the repository in Vercel, create a preview from the reviewed branch with the pinned CLI:

   ```powershell
   cd apps/admin
   npx.cmd vercel@59.20.0 deploy --yes
   ```

   Promote only the verified preview deployment; do not promote automatically from CI.

## What is deployed where

- Vercel deploys the static Admin application code. Git-connected projects can deploy previews automatically; this project currently uses the pinned CLI fallback above.
- Supabase staging stores shared Admin drafts and published content bundles.
- Publishing a content bundle in Admin does not require a code deployment.
- A code deployment does not publish a content bundle; the owner must still review and publish content in Content Operations.
- Mobile/runtime clients read the published Supabase bundle only. Local Admin storage is an offline cache/outbox, not the shared source of truth.

## Manager smoke test

1. Open the Vercel preview while signed in as the owner.
2. Confirm both protected workspaces are present: `Content Operations` and `AI Studio`.
3. In Content Operations, click `Sync online` and confirm the published version and counts load.
4. In AI Studio, open `Model Call`, confirm the backend route is loaded, and verify that provider/model changes are marked as a local draft until the route publish action succeeds.
5. If content was changed, publish the content version separately and confirm the new version appears after refresh.
6. If the deployment is wrong, roll back the Vercel deployment. If content is wrong, publish the previous Supabase bundle version.

## Secrets and access

- Provider keys stay in Supabase Edge Function secrets; never commit them or add them to GitHub Actions.
- The CI workflow uses repository checks only and does not need Supabase or Vercel secrets.
- Vercel preview/production environment variables are managed in the Vercel project settings.


## Release evidence workflow - 2026-10-04

Commands above describe historical deployment mechanisms, not current authorization. First use docs/release/RELEASE_RUNBOOK.md, verify current CLI/source configuration, allowlisted target and remote enforcement, and obtain the exact owner-approved manifest. No deploy/promote command runs from ordinary PR CI or an agent session with production credentials. Code deployment and content/config publication stay separate. On bad content publish a reviewed forward revision; do not overwrite intervening drafts or assume republishing an old bundle is safe without version/conflict checks.
