# LoanBee Mobile — Claude Code Instructions

## Architecture

Expo Router app with a 4-tab bottom navigator. All navigation is file-based under `app/`. The core maths engine lives in the published package `@oskarfigura/amortisation` (pure TypeScript, zero runtime/React Native dependencies, shared with the web app). `src/shared/domain/core/` is now a thin re-export layer over that package — do not reimplement maths there.

### Source layout (feature-based)

`src/` is organised by feature, not by file type. The `@/` alias maps to `src/` (`@/* → ./src/*`).

```
src/
  features/                    # feature UI (screens compose these)
    calculator/components/     # loan form, result view, summary, amortisation table, UnsavedResultModal
    tracker/components/        # saved-loans / mortgage-tracker UI, sub-grouped:
                               #   dashboard/ overpayments/ editing/ detail/
    sharing/                   # share link / message / native share
  shared/                      # used by 2+ features or by infrastructure — 3 buckets:
    ui/                        # anything visual
      components/              #   primitives (Icon, ScreenHeader, DatePickerField, …)
      charts/                  #   chart components (used by both calculator & tracker)
      theme/                   #   colours, typography, spacing, shape, elevation
    domain/                    # loan / finance business logic + its types & constants
      loans/                   #   display contract, insights, overpayment calc, scenarios
      mortgage/                #   multi-deal tracking & projection
      results/                 #   calculator result snapshots / routing
      currency/                #   currency definitions & locale defaults
      core/                    #   maths re-export layer (@oskarfigura/amortisation)
      types/                   #   SavedLoan and related entity types
    lib/                       # generic technical plumbing, no business meaning
      hooks/  utils/  storage/  i18n/  dev/
      services/                #   onboarding, navigation, review, diagnostics
  ads/                         # AdMob — kept isolated (see invariant below)
  __mocks__/                   # jest mocks — path is hardcoded in jest moduleNameMapper, do not move
```

Decision rule for `shared/`: **visual → `ui`, loan/finance → `domain`, generic plumbing → `lib`.** Feature-specific *UI* lives under `features/<feature>/components/`; loan/mortgage *logic* is shared and lives under `shared/domain/` (the calculator and the tracker both consume it, and `shared/lib/storage` depends on it), so it is not split per-feature.

## Key Invariants

- **The maths engine is `@oskarfigura/amortisation`** (GitHub Packages, ESM). `src/shared/domain/core/*` only re-exports from it. To change calculation behaviour, change it in the `TTN.Amortisation` repo, publish a new version, and bump it here. Run `npm test` before and after any change touching `src/shared/domain/core/`.
- **Icon geometry is `@oskarfigura/icons`** (GitHub Packages, ESM, shared with the web app). Render icons via `<Icon icon={IconName.X} size color strokeWidth />` from `src/shared/ui/components/Icon.tsx`, which maps the package geometry onto `react-native-svg` primitives through the `Svg` wrapper. Do NOT hand-write per-icon component files — there is no `src/shared/ui/components/Icons/` directory anymore. To add or change an icon, edit the `TTN.Icons` repo, publish a new version, and bump it here. Two exceptions are kept local: `LiveDotIcon` (`src/shared/ui/components/LiveDotIcon.tsx`), a filled-circle primitive, and `BeeMark` (`src/features/tracker/components/dashboard/DashboardHeader.tsx`), the LoanBee brand mascot. Both are kept local because the package models single-colour geometry (stroke-only, or a single `filled` solid) and these need fills the package can't represent — `LiveDotIcon` is a solid circle, and `BeeMark` is a multi-colour mascot (honey body, soft-opacity wings, dark stripes/eyes) mixing filled and stroked paths. `BeeMark` is also LoanBee-specific brand art and does not belong in the cross-product shared set.
- **All colours must use `colours.*`** from `src/shared/ui/theme/colours.ts`. Never write a hex literal in a component or screen.
- **All font families must use `fonts.body` or `fonts.heading`** from `src/shared/ui/theme/typography.ts`. Never write `fontFamily: 'Inter'` inline.
- **All font weights must use `fontWeights.*`** from `src/shared/ui/theme/typography.ts`. Never write `fontWeight: '700'` inline.
- **Ads are fully isolated in `src/ads/`**. The `react-native-google-mobile-ads` SDK must never be imported outside `src/ads/`. Screens may only touch ads through the thin, SDK-free entry points: `<AdProvider>` in `app/_layout.tsx`, `<BannerAd>` placements, and imperative interstitial triggers via `presentInterstitial()` from `src/ads/interstitialController.ts` (e.g. before CSV export). All three keep the ad SDK behind `src/ads/`.
- **MMKV storage key names are versioned** (`saved_loans_v2`, `guide_seen_v1`, etc. in `src/shared/lib/storage/keys.ts`). If the `SavedLoan` schema changes in a breaking way, increment the key version and add a migration function in `src/shared/lib/storage/savedLoans.ts`.
- **Never pin a tappable header with `stickyHeaderIndices`.** On RN's new architecture the sticky header's touch target does not follow its visual translation, so once the user scrolls, taps on the pinned element fall through silently (this broke the tab strips in both `LoanCalculationView` and `MortgageDetailView`). Render interactive headers — tab strips, segmented controls — as a fixed sibling `View` ABOVE the `ScrollView`, not inside it with `stickyHeaderIndices`. The guard test `__tests__/design-system/sticky-tabs.test.ts` fails the build if `stickyHeaderIndices` reappears in `app/` or `src/`.

## Design Tokens

```
primary:       #002D72    primaryDark:   #003a8c
accent:        #38bdf8    teal:          #0d9488
secondary:     #046d40    error:         #ba1a1a
background:    #fcfdfe    surface:       #f8fafc
border:        #e2e8f0    textPrimary:   #0f172a
textSecondary: #64748b    successSurface:#f0fdf4
successBorder: #bbf7d0    successLight:  #dcfce7
shadow:        #000000
```

Border radii: cards `16`, inputs `12`, chips/tags `20+`, buttons `26` (pill).
Screen padding: `paddingHorizontal: 16` (content), `20` (headers).

## Store Identifiers

- **Android package**: `com.cactus.loancalculator.free` — matches the existing Play Store listing with 28+ installs. Do not change this.
- **iOS bundle ID**: `com.thetechnarrative.loanbee` — new App Store submission.
- **EAS project ID**: `06179207-8267-41ff-a5ed-dbb4cd7b439e`
- **App version**: `2.2.1` (set via the top-level `version` field in `app.config.js`; drives both iOS `CFBundleShortVersionString` and Android `versionName`). Must stay `> 2.2.0` — iOS App Store Connect already has approved/Complete `2.2.0` builds, and Apple **strictly** requires each new `CFBundleShortVersionString` to be higher than the previously approved one (a lower value fails upload with error 90062, and the 2.2.0 train is closed to new builds → 90478). The iOS history is the binding constraint here; Android (Play production versionName `1.0.12` / versionCode `21`) only enforces ordering on `versionCode`, not `versionName`, so it tolerates the jump.
- **Build numbers are EAS-remote-managed**: `eas.json` sets `appVersionSource: "remote"`, so iOS `buildNumber` and Android `versionCode` are auto-incremented on EAS's servers and the values in `app.config.js` are ignored (the fields have been removed). As of the last check the remote counters were iOS build `6` and Android versionCode `48` — both auto-increment on the next production build. Inspect or override with `eas build:version:get -p <platform>` / `eas build:version:set -p <platform>`.

## Test Setup

Tests use **ts-jest** in five isolated Jest projects (`core`, `storage`, `display`, `design-system`, `screens`). Do NOT switch to jest-expo — react-native-mmkv requires a manual mock that ts-jest handles cleanly without the jest-expo Babel pipeline.

```bash
npm test    # runs all Jest projects
```

Mocks live in `src/__mocks__/`: `react-native-mmkv.ts` (in-memory Map) and `react-native-reanimated.ts` (stubs). The storage project jest config maps `react-native-mmkv` to the mock.

`@oskarfigura/amortisation` ships ESM `dist/*.js` and its `exports` map declares only `import`/`types` conditions (no `require`), so jest's CommonJS resolver can't resolve it natively. Each jest project therefore maps the specifier straight to the package's `dist` via `moduleNameMapper`, transforms its `.js` with ts-jest (`allowJs: true`), and whitelists it in `transformIgnorePatterns` (`node_modules/(?!@oskarfigura/amortisation/)`).

## Currency System

`src/shared/domain/currency/currencies.ts` defines the four supported currencies. `languageToCurrency()` (in `src/shared/domain/currency/defaults.ts`) maps `pl` → PLN, anything else → GBP. The global default is stored in MMKV under `user_currency` and initialised from the device locale on first launch. Each `SavedLoan` carries its own `currency` field — always pass the loan's currency (not the global default) to `formatCurrency()` in result/chart/table components.

## Saved Loan Schema (`src/shared/domain/types/SavedLoan.ts`)

`resultSnapshot.totalInterestPaidBaseline` is computed at save time by running `getLoanCalculations()` a second time with `additionalMonthlyPayment = 0`. This avoids re-running the calculation on every list render. Overpayment savings = `totalInterestPaidBaseline - totalInterestPaid`. Only show the savings badge when `additionalMonthlyPayment > 0`.

`resultSnapshot.totalTermInMonths` = `tableItems.length` from the calculation result. The progress bar uses `monthsBetween(formSnapshot.startDate, today) / totalTermInMonths`.

`parentLoanId` is reserved for Phase 2 (UK remortgage chaining). Do not populate it in Phase 1.

## i18n

Locale detection order: MMKV `user_language` → `getLocales()[0].languageCode` → `'en'`. Supported codes: `en`, `pl`. To add a language: add a JSON file in `src/shared/lib/i18n/locales/`, extend the resources object in `src/shared/lib/i18n/index.ts`, and add the option to the Settings language toggle.

## AdMob

Production unit IDs flow via environment variables:
1. `ADMOB_ANDROID_ID` / `ADMOB_IOS_ID` → `app.config.js` plugins (app-level IDs)
2. `ADMOB_BANNER_ANDROID_ID` / `ADMOB_BANNER_IOS_ID` → `app.config.js` `extra` → `expo-constants` → `src/ads/adUnits.ts`
3. `ADMOB_INTERSTITIAL_ANDROID_ID` / `ADMOB_INTERSTITIAL_IOS_ID` → `app.config.js` `extra` → `expo-constants` → `src/ads/adUnits.ts`

Google test IDs are used automatically when env vars are unset or `__DEV__` is true. The GDPR consent check in `AdProvider.tsx` fires once on first launch for EU users.

For the full ad strategy — formats, platform gating, consent/personalisation, and the interstitial frequency policy (new-user grace period, action threshold, cooldown, daily cap) — see [docs/ads-strategy.md](docs/ads-strategy.md).

## Local Development

The project always runs via local builds — Expo Go is not supported due to native modules (`react-native-mmkv`, `react-native-google-mobile-ads`). Local builds do not require a paid Expo plan or EAS.

### GitHub Packages auth (required for `npm install`)

**Do this first, every time, before `npm install`:**

```bash
export NODE_AUTH_TOKEN=$(gh auth token)
npm install
```

That's it. If `gh auth token` fails (no token / missing scope), run this once:

```bash
gh auth refresh -h github.com -s read:packages
```

Then re-run the two lines above. `@oskarfigura/amortisation` lives on GitHub Packages and `.npmrc` pulls the token from `NODE_AUTH_TOKEN` — if it's not set, `npm install` will 401.

CI must provide `NODE_AUTH_TOKEN` (e.g. the workflow's `GITHUB_TOKEN` or a PAT with `read:packages`).

- `android/` is currently checked in and can be used directly with Gradle.
- `ios/` is currently generated locally and ignored by git. Create it with `npm run ios` or `npx expo prebuild --platform ios` before attempting Xcode/Pods work.

```bash
npm install
npm run android   # expo run:android — builds with Gradle and installs on connected device/emulator
npm run ios       # expo run:ios — builds with Xcode and installs on connected device/simulator
```

For Android artifacts without EAS, run `cd android && ./gradlew assembleRelease` for an APK or `./gradlew bundleRelease` for an AAB. For iOS archives without EAS, first generate `ios/` if needed, then open `ios/LoanBee.xcworkspace` and use Xcode Product → Archive. Store/device distribution still needs the normal Apple/Google signing/accounts.

After native dependency changes, use `npx expo install` for Expo/native packages where possible, regenerate iOS with `npx expo prebuild --platform ios` if needed, run `cd ios && pod install && cd ..`, and re-run the full platform build. For JS-only changes Metro hot-reloads automatically. If stale state appears, try `npx expo start -c`; for Android use `cd android && ./gradlew clean`; for iOS prefer `npx expo prebuild --clean --platform ios` plus `pod install`, then fall back to Xcode Clean Build Folder / DerivedData cleanup.

## Standalone Device Testing (No PC / No Metro)

To install the app permanently on a device without keeping a PC or Metro connection active, build a self-contained APK and sideload it.

### Android — Debug APK (quickest, no signing setup)

```bash
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

Transfer to the device (USB, Google Drive, email, etc.), enable **Install from unknown sources** in Android settings, and install. The app runs independently — no PC or Metro needed after installation.

### Android — Release APK (requires keystore configured in `android/app/build.gradle`)

```bash
cd android && ./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### Android — EAS Preview (no local toolchain needed)

```bash
eas build --profile preview --platform android
```

Builds on Expo's servers and returns a download link. Install the APK directly from the device browser.

### iOS

Requires a paid Apple Developer account and a provisioning profile (ad-hoc or development). Build via Xcode (`Product → Archive`) or `eas build --profile preview --platform ios`, then distribute via TestFlight or direct device registration. iOS apps cannot be sideloaded without developer signing.

## Worktree Setup (Android)

Never symlink `node_modules` in a worktree for this project. Gradle's autolinking step bakes absolute `node_modules` paths into `android/app/build/generated/autolinking/Android-autolinking.cmake`. If a symlink is present when any Gradle task runs, that cached file gets the wrong path — then both the build and `gradle clean` crash because cmake reads the stale file before it can clean anything.

Always run a full `npm install` inside the worktree. Before the first `npm run android` in any new worktree, delete the stale android caches:

```bash
rm -rf android/app/build/generated
rm -rf android/app/.cxx
rm -rf android/build
```

The first native build will be slow; subsequent builds use Gradle's cache normally.

## EAS Build Profiles

EAS is used for preview and production releases only, not local development.

- `preview` — internal APK (Android), no store submission
- `production` — AAB/IPA, `autoIncrement: true`

`autoIncrement` fires during `eas build` (not `eas submit`) and, because `appVersionSource: "remote"`, bumps the EAS-remote build number / versionCode — there is no `versionCode` in `app.config.js` to maintain. The remote counter is already above the current Play production release (versionCode `21`), so it supersedes cleanly; verify with `eas build:version:get -p android` if in doubt. Note `eas submit --latest` re-submits the most recently *built* binary — it does not create a new build, so re-running it after a submission fails with a duplicate-build-number error. Build first, then submit.

## Commits

Follow the existing commit style (Conventional Commits: `feat:`, `fix:`, `chore:`). Always include:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Never push directly to `master` without the user's explicit instruction.
