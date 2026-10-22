# Nilaza Mobile EAS Testing

Last updated: 2026-09-28

## Project link

Expo/EAS project:

- Full name: `@magicpen/nilaza`
- Project ID: `8a6197d1-feaa-488b-90a3-12bb177ee005`
- App path: `apps/mobile`

The app is linked in `apps/mobile/app.json` under `expo.extra.eas.projectId`.

## Local prerequisites

Required on the test/build machine:

- Node.js and npm.
- EAS CLI: `npm install --global eas-cli`.
- Expo login: `eas login`.
- Git CLI in `PATH` before running cloud builds from a local checkout.

Check:

```powershell
cd D:\nilaza\apps\mobile
eas whoami
eas project:info
where.exe git
```

If `where.exe git` cannot find Git, install Git for Windows and reopen the terminal before running EAS cloud builds.

Temporary fallback when Git is not installed:

```powershell
cd D:\nilaza\apps\mobile
$env:EAS_NO_VCS='1'
eas build --platform android --profile preview --non-interactive --no-wait
```

This fallback is only for local test preparation. Prefer Git-backed EAS builds for regular release work.

## Validation before build

Run from repo root:

```powershell
cd D:\nilaza
npm run validate:data
npm run validate:backend
npm run supabase:check
npm run council:contract:check
npm run validate:governance
npm run supabase:migration-ledger:check
npm run mobile:release:config:check
npm --workspace apps/mobile run check
npm --workspace apps/mobile test -- --runInBand
```

These checks should pass before sharing a test build. `supabase:check` may report warnings for missing local `supabase`/`deno` CLI or staging env values on machines that are not used for deployment; FAIL items should be fixed before attempting a Supabase staging deploy.

For a review branch, GitHub also runs **Mobile quality** automatically. It checks TypeScript, mobile tests, data/config, a Metro web export and an Android embedded JavaScript bundle. A non-technical reviewer only needs to read its result next to the pull request: red means do not accept the build yet; green means the automated checks passed and the device test can begin. Repository owners should set `Mobile quality / Mobile type, tests and embedded bundles` as a required GitHub branch check after the workflow reaches GitHub.

## Fast local testing

Expo Go / local dev:

```powershell
cd D:\nilaza
npm run mobile:dev
```

Use this for quick UI review when the app only depends on Expo Go-compatible modules.

Web preview:

```powershell
cd D:\nilaza
npm run mobile:web
```

Open:

```text
http://localhost:8081/
```

The root script forwards Expo flags safely when another port is needed:

```powershell
npm run mobile:web -- --port 8082
```

## Open Reflection native verification (2026-09-13)

The current identity rollout is tracked in `docs/BRAND_ROLLOUT_2026-09-11.md`. Browser screenshots and a successful debug compile do not replace release-candidate device verification.

The installed Expo SDK 54 / React Native 0.81.5 stack uses `loadReactNative(this)` in `MainApplication`. Reanimated 4 requires New Architecture: keep `expo.newArchEnabled` in `app.json` and `newArchEnabled` in `android/gradle.properties` set to `true` together. Do not revert only this flag while retaining Reanimated 4. These changes reconcile older native configuration with the existing dependencies; they do not change profile storage or backend contracts.

For a local Android compile, use JDK 17, a writable Android SDK with the versions declared by Gradle, and the checked-in Gradle wrapper. A task-local SDK/cache is acceptable if the system SDK is read-only. Preserve accepted SDK licenses; do not regenerate the native project with `prebuild --clean`.

```powershell
# Set JAVA_HOME and ANDROID_HOME to the installed JDK and writable SDK first.
cd apps/mobile/android
./gradlew.bat :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain --no-daemon
```

The resulting debug APK needs the development runtime/Metro and is not a store candidate. Before accepting an RC, test cold start, icon/splash/notification appearance, auth/recovery/deep links, onboarding save/retry/skip, account switching, local data persistence, all five tabs and Reduce Motion on supported devices. Capture phone and tablet store screenshots from that same accepted RC. Keep signing and official distribution on the existing EAS release path below.

## EAS build profiles

Configured in `apps/mobile/eas.json`:

- `development`: internal dev client build. Android outputs APK. iOS is simulator-targeted.
- `preview`: internal test build. Android outputs APK.
- `production`: store-oriented build with version auto-increment and the explicit EAS `production` environment.

The current EAS `preview` environment is connected to **Nilaza Staging QA**. The EAS `production` environment is intentionally empty until the production-promotion gate; do not ship a production build until the three public variables below are configured there.

## Android test build

Recommended first cloud build for non-technical testers:

```powershell
cd D:\nilaza\apps\mobile
eas build --platform android --profile preview --non-interactive
```

This should create an internal APK build that can be installed on Android devices.

For development client:

```powershell
cd D:\nilaza\apps\mobile
eas build --platform android --profile development --non-interactive
```

Then start the dev server:

```powershell
cd D:\nilaza
npm run mobile:dev
```

## iOS test build

From Windows, use EAS cloud build. iOS device/TestFlight distribution requires Apple Developer credentials.

For iOS simulator development build:

```powershell
cd D:\nilaza\apps\mobile
eas build --platform ios --profile development
```

For real iPhone internal testing, update/create an iOS preview profile when Apple credentials and device registration are ready. The current `preview` profile is intentionally minimal and should be validated during the first iOS credentials setup.

## Backend URL for staging

When the Supabase/API staging backend is available, set:

```text
EXPO_PUBLIC_NILAZA_API_URL=https://<staging-api-domain>
```

For direct Supabase Edge Function staging, use the functions base URL:

```text
EXPO_PUBLIC_NILAZA_API_URL=https://<project-ref>.supabase.co/functions/v1
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
EXPO_PUBLIC_NILAZA_HELP_URL=https://nilaza.magicpendigital.com/{locale}/help
```

`EXPO_PUBLIC_NILAZA_HELP_URL` is public navigation only. The `{locale}` token is replaced with `vi` or `en`; other in-app locales currently fall back to the Vietnamese Help Center until equivalent public documentation exists.

The mobile backend client maps its API-style paths to Supabase function names such as `ai-persona-chat`, `ai-council`, `ai-tarot-reading`, `ai-daily-insight`, `profile-upsert`, and `journal-entries`.

When Supabase Auth env is present, the app uses Supabase email/password auth, stores the session with `@supabase/supabase-js`, and passes the user's access token to the backend client as an in-memory `authToken`. Do not store service-role keys or provider secrets in `EXPO_PUBLIC_*` variables.

Release builds fail closed when those online variables are missing instead of silently creating device-only local accounts. Development builds may still use the local-first preview path.

Do not put OpenAI, astrology provider, Supabase service role, or other secret keys in Expo public environment variables.

## Current notes

### Android Astrology UX follow-up QA — 2026-09-28

- Built the current mobile workspace as internal Android QA APK `0.1.3` / `versionCode 4`, including the Astrology and Guide UX updates from the referenced `Đánh giá UX Astrology và Người dẫn` task. The embedded bundle contains the chart story controls, contextual guide follow-ups, and Premium state.
- APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`; SHA-256: `a6d4e4d6642ba1ea39de791b465eca3d5e892590a657e9648e04f1ff9ee0e509`. See the adjacent `app-release.manifest.json` for source revision and dirty-state provenance.
- Installed with `adb install -r` on Air1 Ultra, preserving app data. Verified installed package version `0.1.3` / `versionCode 4` and successful cold launch. The tester still needs to review the Astrology screens and AI flow on-device; do not send a new AI request unless fresh in-app consent is accepted.
- This is a local, debug-signed internal QA build from an uncommitted workspace. It has not passed Mobile Quality CI or the full manual Astrology AI test and is not a store release.

### Android Astrology AI QA — 2026-09-26

- Built internal Android QA APK `0.1.2` / `versionCode 3` with the Astrology AI consent double-submit guard and the approved Staging QA backend configuration.
- APK: `artifacts/astrology-ai-android-qa-2026-09-26/nilaza-0.1.2-android3-ai-submit-qa.apk`; SHA-256: `f56bbe78443d040455264aae23d42447b1579ef329671be2eefdba499efa9b14`. See the adjacent `app-release.manifest.json` for source revision and dirty-state provenance.
- Installed with `adb install -r` on Air1 Ultra, preserving app data, then cold-started successfully. The full Astrology AI happy path still needs a new user test after the daily quota resets; two earlier requests reached the model but failed response validation.
- Local mobile tests, type check, release config, backend validation, Supabase readiness and migration ledger passed. This workspace has uncommitted changes and this candidate has not passed GitHub Mobile Quality CI or the full device happy path; it is an internal QA build, not a release candidate.

### Android standalone QA — 2026-09-20

- Local arm64 release-mode APK builds now succeed from `apps/mobile/android` using JDK 17 and the task SDK/cache in `.brand-work`. APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.
- This internal APK embeds JavaScript, fonts and runtime assets. It uses the existing debug signing configuration and is **not a store release**. Keep the same signing identity for `adb install -r`; never uninstall or clear data to update a tester's installation.
- Gradle `react.root` and Metro `server.unstable_serverRoot` point at `apps/mobile`; otherwise Expo native embed can resolve `index.js` from the monorepo root and fail.
- Build with `:app:assembleRelease -PreactNativeArchitectures=arm64-v8a`. Load the mobile `.env.local`; do not set `EXPO_NO_DOTENV=1`. Expo public variables must use static `process.env.EXPO_PUBLIC_...` references for build-time inlining. Never print keys or package provider/service-role secrets.
- Verification: install the APK, remove the device's `tcp:8081` reverse mapping, force-stop only `app.nilaza.mobile`, then open its launcher activity. Confirm Home, font/assets, preserved login and an online Oracle QA response. This was checked on Air1 Ultra; no Metro or computer connection is needed afterward. AI/sync still require Internet.
- Keep QA screenshots containing the tester's account/history out of launch artifacts. See [Android UX review](UX_REVIEW_ANDROID_2026-09-14.md) for build-specific evidence and remaining gates.
- Current verified internal binary: `0.1.1` / `versionCode 2`, SHA-256 `853BD59E2D0DCF1BB9BA02A86D8FB7B187519E07F1CE81357D3040BF1F4DD3B4`. It was built, installed and cold-started on Air1 Ultra after the conversation-history relation fix and the Metro web-entry fix. This is still Android-Debug-signed QA output, not a store artifact.

### Release evidence and update channel — 2026-09-20

- Current review build line is `0.1.1` / Android `versionCode 2` / iOS `buildNumber 2`. Every locally built Android candidate is accompanied by `app-release.manifest.json`, which records its SHA-256, source state and required evidence.
- The preferred non-technical release path is EAS `preview`: run the approved build command, install the received internal APK, and follow the manager test path. The local Gradle path is only a USB-connected QA fallback.
- Expo OTA updates remain disabled. Enabling them would require a separate, tested EAS update-channel and runtime-version rollout; until then a new internal build is the only accepted distribution mechanism for a changed review candidate.

### Historical setup notes (2026-06)

- Local workspace checked on 2026-06-22: `D:\Program Files\Nilaza`.
- GitHub sync is working from this machine; `main` matched `origin/main` at commit `870a13d5` after `git fetch origin --prune`.
- Local tool versions verified on 2026-06-22: Node.js `v24.11.1`, npm `11.6.2`, Expo CLI `54.0.25`, and EAS CLI `20.3.0` via `npx --yes eas-cli@latest`.
- Static gates passed on 2026-06-22: `npm run validate:data`, `npm --workspace apps/mobile run check`, and `npm --workspace apps/mobile test -- --runInBand`.
- EAS cloud builds still require Expo authentication on the machine (`eas login` or `EXPO_TOKEN`). iOS device/TestFlight builds also require Apple Developer credentials.
- Local Android emulator testing is not ready yet on this machine: `ANDROID_HOME` and `ANDROID_SDK_ROOT` are empty, and `adb`, `emulator`, `sdkmanager`, and `java` are not currently in `PATH`.
- Local iOS simulator testing is not available on Windows; use EAS cloud for iOS build preparation from this machine.
- `expo-dev-client` is installed so development builds can run outside Expo Go.
- `eas config --profile preview --platform android` and `eas config --profile development --platform android` resolve successfully.
- A first Android preview build was started on 2026-06-16:
  `https://expo.dev/accounts/magicpen/projects/nilaza/builds/d191439b-fd76-4258-8319-1f13f5639be8`
- The first build used `EAS_NO_VCS=1` because Git CLI was not available in `PATH`; install Git for Windows before routine builds.
- `npm audit` currently reports vulnerabilities in the dependency tree. Do not run `npm audit fix --force` without a separate dependency-upgrade task because it can introduce breaking changes.
