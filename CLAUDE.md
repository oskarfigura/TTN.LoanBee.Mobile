# LoanBee Mobile — Claude Code Instructions

## Architecture

Expo Router app with a 4-tab bottom navigator. All navigation is file-based under `app/`. The core maths engine in `src/core/` is pure TypeScript with zero React Native dependencies — it is copied verbatim from the web repo and must stay that way.

## Key Invariants

- **Never modify `src/core/`** without running `npm test` first and after. These files are the authoritative maths engine shared with the web app.
- **All colours must use `colours.*`** from `src/theme/colours.ts`. Never write a hex literal in a component or screen.
- **All font families must use `fonts.body` or `fonts.heading`** from `src/theme/typography.ts`. Never write `fontFamily: 'Inter'` inline.
- **All font weights must use `fontWeights.*`** from `src/theme/typography.ts`. Never write `fontWeight: '700'` inline.
- **Ads are fully isolated in `src/ads/`**. No ad import should appear outside that directory except `<AdProvider>` in `app/_layout.tsx` and `<BannerAd>` placements in screens.
- **MMKV storage key names are versioned** (`saved_loans_v2`, `guide_seen_v1`, etc. in `src/storage/keys.ts`). If the `SavedLoan` schema changes in a breaking way, increment the key version and add a migration function in `src/storage/savedLoans.ts`.

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
- **Android versionCode**: currently `24` (supersedes production release 23 / v2.1). Always increment before a production build.

## Test Setup

Tests use **ts-jest** in five isolated Jest projects (`core`, `storage`, `display`, `design-system`, `screens`). Do NOT switch to jest-expo — react-native-mmkv requires a manual mock that ts-jest handles cleanly without the jest-expo Babel pipeline.

```bash
npm test    # runs all Jest projects
```

Mocks live in `src/__mocks__/`: `react-native-mmkv.ts` (in-memory Map) and `react-native-reanimated.ts` (stubs). The storage project jest config maps `react-native-mmkv` to the mock.

## Currency System

`src/currency/currencies.ts` defines the four supported currencies. `languageToCurrency()` (in `src/currency/defaults.ts`) maps `pl` → PLN, anything else → GBP. The global default is stored in MMKV under `user_currency` and initialised from the device locale on first launch. Each `SavedLoan` carries its own `currency` field — always pass the loan's currency (not the global default) to `formatCurrency()` in result/chart/table components.

## Saved Loan Schema (`src/types/SavedLoan.ts`)

`resultSnapshot.totalInterestPaidBaseline` is computed at save time by running `getLoanCalculations()` a second time with `additionalMonthlyPayment = 0`. This avoids re-running the calculation on every list render. Overpayment savings = `totalInterestPaidBaseline - totalInterestPaid`. Only show the savings badge when `additionalMonthlyPayment > 0`.

`resultSnapshot.totalTermInMonths` = `tableItems.length` from the calculation result. The progress bar uses `monthsBetween(formSnapshot.startDate, today) / totalTermInMonths`.

`parentLoanId` is reserved for Phase 2 (UK remortgage chaining). Do not populate it in Phase 1.

## i18n

Locale detection order: MMKV `user_language` → `getLocales()[0].languageCode` → `'en'`. Supported codes: `en`, `pl`. To add a language: add a JSON file in `src/i18n/locales/`, extend the resources object in `src/i18n/index.ts`, and add the option to the Settings language toggle.

## AdMob

Production unit IDs flow via environment variables:
1. `ADMOB_ANDROID_ID` / `ADMOB_IOS_ID` → `app.config.js` plugins (app-level IDs)
2. `ADMOB_BANNER_ANDROID_ID` / `ADMOB_BANNER_IOS_ID` → `app.config.js` `extra` → `expo-constants` → `src/ads/adUnits.ts`
3. `ADMOB_INTERSTITIAL_ANDROID_ID` / `ADMOB_INTERSTITIAL_IOS_ID` → `app.config.js` `extra` → `expo-constants` → `src/ads/adUnits.ts`

Google test IDs are used automatically when env vars are unset or `__DEV__` is true. The GDPR consent check in `AdProvider.tsx` fires once on first launch for EU users.

## Local Development

The project always runs via local builds — Expo Go is not supported due to native modules (`react-native-mmkv`, `react-native-google-mobile-ads`). Local builds do not require a paid Expo plan or EAS.

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

Before any production build, verify `versionCode` in `app.config.js` is higher than the current Play Store release. Check Play Console → Release → Production for the current code.

## Commits

Follow the existing commit style (Conventional Commits: `feat:`, `fix:`, `chore:`). Always include:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Never push directly to `master` without the user's explicit instruction.
