# LoanBee Mobile

Loan amortisation calculator for iOS and Android. Mobile companion to [TTN.loan-amortisation-calculator.web](https://github.com/oskarfigura/TTN.loan-amortisation-calculator.web).

## Production Deployment

Production releases for both operating systems are built with the EAS `production` profile, but
their store submission flows differ.

### iOS

Build the production iOS app, selecting iOS if EAS prompts for a platform:

```bash
eas build --profile production
```

After the build succeeds, submit the latest iOS build to App Store Connect:

```bash
eas submit -p ios --latest
```

### Android

Before building, verify that the Android `versionCode` is higher than the current Play Store
production release. Build the production Android app, selecting Android if EAS prompts for a
platform:

```bash
eas build --profile production
```

EAS produces an Android App Bundle (`.aab`). Download it from the EAS build page and manually
upload it to the appropriate release in Google Play Console. Android store submission is not
performed with `eas submit`.

## Most Common Jobs

Most developers will want one of these first:

- Deploy / release build:
  [Android local release](#building-android-locally-without-eas),
  [iOS local archive](#building-ios-locally-without-eas),
  [EAS builds](#eas-builds),
  [Environment variables](#environment-variables),
  [Store configuration](#store-configuration)
- Run locally:
  [Native project layout](#native-project-layout),
  [Running locally](#running-locally)
- Add or update packages:
  [Installing and updating packages](#installing-and-updating-packages)
- Change Expo/native config:
  [Updating Expo and native config](#updating-expo-and-native-config)
- Clear stale state:
  [Native build quirks and cache reset](#native-build-quirks-and-cache-reset)
- Trace product actions:
  [docs/developer-action-map.md](./docs/developer-action-map.md)

## Features

- **Two calculation modes** — by term (fixed years/months) or by desired monthly payment
- **Amortisation schedule** — full month-by-month table with pagination
- **Three charts** — yearly stacked bar (principal vs interest), donut breakdown, cumulative area
- **Four currencies** — GBP, PLN, EUR, USD; per-loan selection, language-defaulted global setting
- **Tracked borrowing** — MMKV-backed saved loans and mortgages, dashboard pinning, deal chains, events, and progress views
- **Recent calculations** — automatic calculation history kept separate from tracked borrowing until the user saves it
- **Pinned home dashboard** — carousel of pinned loans and mortgages on the Home tab when the user has tracked borrowing
- **Shareable calculations** — Results and saved-detail views share the same web URL format, with native deep link entry through `/calculator/share`
- **Bilingual** — English and Polish, device-detected with manual override
- **AdMob** — adaptive banner ads with GDPR consent flow; isolated in `src/ads/`

## Key Docs

- [`docs/developer-action-map.md`](./docs/developer-action-map.md) — route inventory, home-tab modes, and screen ownership for major actions
- [`docs/saved-mortgage-journeys.md`](./docs/saved-mortgage-journeys.md) — end-to-end mortgage tracker rules, journeys, and validation
- [`AGENTS.md`](./AGENTS.md) — repo invariants, release identifiers, and implementation constraints

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 55, React Native 0.83 |
| Navigation | Expo Router 55 (file-based, bottom tabs) |
| Forms | react-hook-form + zod |
| Storage | react-native-mmkv (synchronous, encrypted at rest) |
| Charts | react-native-gifted-charts (bar, donut, area) |
| i18n | i18next + react-i18next + expo-localization |
| Ads | react-native-google-mobile-ads (AdMob) |
| Fonts | Manrope for both body and headings via `@expo-google-fonts/manrope` |
| Tests | ts-jest across three isolated Jest projects (`core`, `storage`, `design-system`) |

## Navigation Overview

The app shell is file-based Expo Router, but the current action surface is broader than the visible tabs:

| Area | Primary routes | Notes |
|---|---|---|
| Visible tabs | `/(tabs)/index`, `/(tabs)/saved`, `/(tabs)/settings` | Bottom-nav destinations |
| Hidden tab route | `/(tabs)/result` | Results screen is inside the tab navigator but hidden from the tab bar |
| Onboarding / deep link / about | `/guide`, `/calculator/share`, `/about` | First-run flow, shared-calculation entrypoint, and Settings-entered formula/about content |
| Saved loan routes | `/saved/new`, `/saved/track`, `/saved/[id]`, `/saved/[id]/edit`, `/saved/[id]/overpayments` | Save, start tracking, review, edit, and overpayment flows |
| Mortgage tracking routes | `/saved/[id]/deals/new`, `/saved/[id]/deals/[dealId]`, `/saved/[id]/events/new`, `/saved/[id]/events/[eventId]`, `/saved/[id]/complete-current` | Deal lifecycle, event logging, and completion flows |

## Home Tab Modes

The Home tab is stateful:

- If the guide has not been seen yet, the app waits for the consent gate and pushes `/guide?firstRun=1`.
- If at least one saved loan is pinned and `calculator=1` is not present, Home shows the pinned borrowing dashboard.
- Otherwise Home shows the unified intent chooser: **Plan a new one** opens the type-agnostic calculator, while **Track one I have** opens the start-date-driven Track form.
- Loan/Mortgage is not chosen up front. It is selected later in `/saved/new` for saved calculations, or inside `/saved/track` for tracked borrowing.
- Pressing the Home tab again intentionally returns the user to dashboard mode via a route param reset.

## Project Structure

```
app/
  _layout.tsx              # Root stack: fonts, i18n, AdProvider, hidden/detail routes
  about.tsx                # Formula/about content entered from Settings
  (tabs)/
    index.tsx              # Home tab: guide gate, dashboard mode, intent chooser, calculator mode
    result.tsx             # Hidden results route with save/share + leave guard
    saved.tsx              # Tracked borrowing list plus Recent calculations
    settings.tsx           # Language, currency, guide/about, version
  guide.tsx                # First-run guide
  calculator/share.tsx     # Deep link / shared calculation entrypoint
  saved/
    new.tsx                # Save a calculation as a named profile
    track.tsx              # Track loan/mortgage from a past, current, or future deal start date
    [id].tsx               # View saved loan detail
    [id]/edit.tsx          # Edit nickname / lender / category / currency
    [id]/overpayments/     # Simple saved-loan overpayment editor
    [id]/deals/            # Mortgage deal creation/editing/correction
    [id]/events/           # Mortgage event creation/editing
    [id]/complete-current.tsx # Close current mortgage deal

src/
  core/                    # Pure-TS maths engine (copied from web app, no RN deps)
  mortgage/                # Deal tracking, projection, event rules
  loans/                   # Loan-group factories and dashboard summaries
  results/                 # Draft result transport + saved result reconstruction
  share/                   # Share/deep-link encoding and parsing
  types/                   # SavedLoan, LoanDeal, MortgageEvent, snapshots
  storage/                 # MMKV singleton, savedLoans CRUD, migration, key constants
  i18n/                    # i18next init + en.json + pl.json
  ads/                     # AdProvider (GDPR consent), BannerAd wrapper, adUnits
  theme/                   # colours.ts, typography.ts — single source of truth
  currency/                # CURRENCIES array, formatCurrency(), languageToCurrency()
  components/
    ui/                    # Button, Card, SummaryCard, Disclaimer, EmptyState
    calculator/            # LoanForm, ResultsSummary, AmortisationTable, CurrencyPicker, DownPaymentToggle
    charts/                # RepaymentBarChart, LoanBreakdownDonut, CumulativeAreaChart
    loans/                 # Dashboard, timeline, detail, deal, and event components
  hooks/                   # useLoanCalculatorForm, useSavedLoans, useLocale
  constants/               # lenders.ts, loanCategories.ts

__tests__/
  core/                    # amortisation.test.ts, loanHelper.test.ts
  storage/                 # storage, route, sharing, mortgage tracker, utility tests
  design-system/           # typography/design-token tests
```

## Getting Started

This app cannot run in Expo Go because it uses native modules (`react-native-mmkv` and
`react-native-google-mobile-ads`). Use local native builds from this machine.

### Step 1 — authenticate with GitHub Packages (required before `npm install`)

`@oskarfigura/amortisation` is hosted on GitHub Packages. **Run this before every `npm install`:**

```bash
export NODE_AUTH_TOKEN=$(gh auth token)
```

If that fails, your `gh` token is missing the `read:packages` scope. Fix it once with:

```bash
gh auth refresh -h github.com -s read:packages
```

Then re-run `export NODE_AUTH_TOKEN=$(gh auth token)`. Without this env var set, `npm install` will 401.

### Step 2 — install and run

```bash
npm install
npm test          # run all Jest projects
npm run android   # build & run on connected Android device or emulator (expo run:android)
npm run ios       # build & run on connected iOS device or simulator (expo run:ios)
```

## Using a local TTN.UI native package

Use this when you need LoanBee Mobile to run against unpublished changes from the local `TTN.UI`
checkout instead of the published GitHub Packages version of `@oskarfigura/ui-native`.

Build the native package from the design-system repo first:

```bash
cd /Users/oskarfigura/Documents/repos/TTN.UI
npm install
npm run build --workspace @oskarfigura/ui-native
```

Then install that local package into this app:

```bash
cd /Users/oskarfigura/Documents/repos/LoanBee.Mobile
npm install /Users/oskarfigura/Documents/repos/TTN.UI/packages/ui-native
npm run android   # or npm run ios
```

`@oskarfigura/ui-native` is consumed from its built `dist` folder. After changing code in
`TTN.UI`, rebuild the package and restart the Expo/Metro process. If the app still sees old files,
run the local `npm install .../packages/ui-native` command again and restart with a cleared Metro
cache:

```bash
cd /Users/oskarfigura/Documents/repos/TTN.UI
npm run build --workspace @oskarfigura/ui-native

cd /Users/oskarfigura/Documents/repos/LoanBee.Mobile
npm install /Users/oskarfigura/Documents/repos/TTN.UI/packages/ui-native
npm run start -- --clear
```

To return to the published package, authenticate with GitHub Packages and reinstall the registry
version:

```bash
export NODE_AUTH_TOKEN=$(gh auth token)
npm install @oskarfigura/ui-native@^0.2.1
```

Prefer this local-path install over `npm link`; it keeps package exports and React peer
dependencies closer to the production install shape.

## Native Project Layout

- `android/` is currently present in this checkout and can be used directly with Gradle.
- `ios/` is currently **not** checked in. It is generated locally by Expo tooling and is ignored by git.
- If `ios/` is missing, `npm run ios` or `npx expo prebuild --platform ios` will generate it.
- If you need to inspect or edit generated native config, generate the project first and then open the resulting Xcode workspace.

## Local Development Prerequisites

You do not need a paid Expo plan or EAS cloud build to develop, run, or create native builds locally.
You do need the normal platform toolchains:

| Platform | Required locally |
|---|---|
| Both | Node.js, npm, Git |
| Android | Android Studio, Android SDK, Android emulator or USB debugging device, JDK compatible with Android Gradle |
| iOS | macOS, Xcode, Xcode Command Line Tools, CocoaPods, iOS simulator or signed physical device |

Recommended first-time setup:

```bash
export NODE_AUTH_TOKEN=$(gh auth token)   # must be set before npm install
npm install
npm run typecheck
npm test
npm run android                  # Android local build from checked-in native project
npm run ios                      # Generates ios/ if needed, then builds for simulator/device
```

If you prefer to create the iOS project before the first run:

```bash
npx expo prebuild --platform ios
cd ios && pod install && cd ..
```

## Installing And Updating Packages

Use the package command that matches the type of dependency:

- `npm install` — bootstrap the repo from `package-lock.json` or add pure JavaScript packages that do not affect Expo-native version alignment.
- `npx expo install <package>` — add or update Expo SDK packages, React Native packages, and most native modules so versions stay compatible with the current Expo SDK.
- `npm install <package>` or `npm install -D <package>` — add non-Expo JS/dev packages after confirming they do not need Expo-managed version pinning.

Typical workflows:

```bash
npx expo install expo-file-system
npx expo install react-native-google-mobile-ads
npm install zod
npm install -D typescript
```

After adding or updating any native dependency, plugin, or Expo package that changes native code:

1. Regenerate or sync the native project if needed.
2. Reinstall CocoaPods for iOS once `ios/` exists.
3. Re-run the full platform build instead of relying on hot reload.

For iOS:

```bash
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npm run ios
```

For Android:

```bash
npm run android
```

Be deliberate with `npx expo prebuild --clean`:

- `--clean --platform ios` is the safest reset when the generated `ios/` project has drifted or you changed Expo plugins/native config.
- Avoid using `--clean --platform android` casually because this repo already has a tracked `android/` project and a clean prebuild can overwrite local/native edits.

## Running Locally

Start from local native builds, not Expo Go:

```bash
npm run android   # Gradle build, install, and start on Android emulator/device
npm run ios       # Xcode build, install, and start on iOS simulator/device
```

To choose a specific iOS simulator, such as an iPad, run:

```bash
npm run ios -- --device
```

Select the desired iPad simulator from the interactive device list.

### Running On A Physical Android Device Over USB

1. On the phone, enable **Developer options** and turn on **USB debugging**.
2. Connect the phone by USB and accept the RSA debugging prompt on the device if Android shows one.
3. Verify that `adb` can see the device:

```bash
adb devices
```

You should see a line ending in `device`. If it shows `unauthorized`, unlock the phone and accept
the debugging prompt. If it shows nothing, check the USB cable, USB mode, and that Android SDK
platform-tools are installed locally.

4. Install and launch the app:

```bash
npm run android
```

Expo/Gradle will build the native debug app, install it on the connected device, and start Metro.
If more than one Android device/emulator is connected, target the phone explicitly:

```bash
adb devices
npx expo run:android --device
```

Useful `adb` commands while developing:

```bash
adb reverse tcp:8081 tcp:8081   # make Metro reachable from the USB-connected device
adb logcat                      # Android device logs
adb shell am force-stop com.cactus.loancalculator.free
```

If the install succeeds but the app cannot load the JavaScript bundle, re-run `adb reverse` and
restart Metro with `npx expo start -c`.

Metro will hot-reload most JavaScript-only changes after the app is installed. Re-run the full
platform command after native changes, app config changes, dependency changes, icon/splash updates,
or anything inside `ios/` or `android/`.

If Metro is already running and the app is installed, you can also run:

```bash
npm start
```

Use `npm start -- --clear` or `npx expo start -c` when Metro appears stale.

## Building Android Locally Without EAS

For a debug install:

```bash
npm run android
```

For local Android build artifacts:

```bash
cd android
./gradlew assembleRelease   # APK: android/app/build/outputs/apk/release/
./gradlew bundleRelease     # AAB: android/app/build/outputs/bundle/release/
```

Important Android notes:

- `app.config.js` and `android/app/build.gradle` both currently use package/application ID
  `com.cactus.loancalculator.free`; do not change it for Play Store updates.
- `versionCode` is currently `24`; increment it before a production Play Store upload.
- The checked-in Gradle release config currently signs `release` with the debug keystore. That is
  fine for local smoke testing, but Play Store production builds need a real release keystore/signing
  configuration before upload.
- Production AdMob IDs come from environment variables. If unset, Google test IDs are used.

## Building iOS Locally Without EAS

If `ios/` is not present yet, generate it first:

```bash
npx expo prebuild --platform ios
cd ios && pod install && cd ..
```

For a simulator run:

```bash
npm run ios
```

For a local archive/IPA workflow:

1. Install pods:
   ```bash
   cd ios && pod install && cd ..
   ```
2. Open `ios/LoanBee.xcworkspace` in Xcode.
3. Select the `LoanBee` scheme.
4. Choose a simulator for local testing, or a real device/team for signed device builds.
5. Use **Product > Archive** for a distributable archive.

Important iOS notes:

- Local simulator builds do not require paying Expo.
- Device, TestFlight, and App Store distribution require Apple signing and the usual Apple Developer
  Program access; that cost is Apple’s, not Expo’s.
- The bundle ID is `com.thetechnarrative.loanbee`.
- In this repo, `ios/` is generated locally and ignored by git. Regenerate it with `npx expo prebuild --platform ios` if it has been removed.
- Re-run `pod install` after native dependency changes or after regenerating native project files.

## Updating Expo And Native Config

`app.config.js` drives package IDs, bundle IDs, app IDs, splash config, plugin wiring, and runtime `extra` values.

Common changes that require a native rebuild or regeneration:

- changing Expo plugins in `app.config.js`
- changing bundle/package identifiers
- changing app icons, splash assets, permissions, or scheme/deep-link config
- changing AdMob app IDs or ad-unit env vars
- adding or removing native modules

Recommended workflow for config changes:

1. Update `app.config.js`.
2. If the change affects iOS native config and `ios/` is absent or stale, run `npx expo prebuild --platform ios` or `npx expo prebuild --clean --platform ios`.
3. Run `cd ios && pod install && cd ..` after regenerating iOS files.
4. Rebuild with `npm run ios` and/or `npm run android`.

For Android, most config changes are picked up by re-running `npm run android` against the checked-in native project. Use a clean Gradle rebuild if Android resources or generated config look stale.

## Native Build Quirks and Cache Reset

When local builds behave strangely, clear the narrowest stale layer first:

```bash
npx expo start -c
```

If Android is stale:

```bash
cd android
./gradlew clean
cd ..
npm run android
```

If iOS is stale:

```bash
npx expo prebuild --clean --platform ios
cd ios
pod install
cd ..
npm run ios
```

If Xcode still seems stuck, use **Product > Clean Build Folder** in Xcode and delete this app’s
DerivedData folder from Xcode settings or Finder. Avoid deleting tracked files unless you intend to
regenerate them.

Common situations that require a full native rebuild:

- Adding/removing native dependencies
- Changing `app.config.js`, bundle IDs, package IDs, permissions, icons, or splash assets
- Updating pods or Gradle files
- Changing AdMob native app IDs
- Pulling changes that modify `ios/`, `android/`, `package-lock.json`, or native assets

Additional resets that are sometimes helpful:

```bash
rm -rf .expo
```

If the generated iOS project itself looks wrong, remove it and regenerate:

```bash
rm -rf ios
npx expo prebuild --platform ios
cd ios && pod install && cd ..
```

## Environment Variables

Set these before any production-style build, whether local or EAS. Test IDs are used automatically
when unset or in dev mode.

| Variable | Purpose |
|---|---|
| `ADMOB_ANDROID_ID` | AdMob Android app ID |
| `ADMOB_IOS_ID` | AdMob iOS app ID |
| `ADMOB_BANNER_ANDROID_ID` | Android banner ad unit ID |
| `ADMOB_BANNER_IOS_ID` | iOS banner ad unit ID |
| `ADMOB_INTERSTITIAL_ANDROID_ID` | Android interstitial ad unit ID |
| `ADMOB_INTERSTITIAL_IOS_ID` | iOS interstitial ad unit ID |

## EAS Builds

EAS is optional and used here for preview/production cloud builds only. Local development and local
native artifacts do not require EAS or a paid Expo plan.

```bash
# Install EAS CLI once
npm install --global eas-cli

# Preview APK (internal distribution / QA)
eas build --profile preview --platform android

# Production build (select iOS or Android when prompted)
eas build --profile production
```

Before production, verify Android `versionCode` is higher than the Play Store production release.
Submit the latest iOS build with `eas submit -p ios --latest`. Download Android's generated `.aab`
and upload it manually through Google Play Console.
For local production-style builds, use the Gradle/Xcode workflows above instead of EAS.

## Store Configuration

| Platform | Identifier | Status |
|---|---|---|
| Android | `com.cactus.loancalculator.free` | Updates existing Play Store listing (versionCode 24+) |
| iOS | `com.thetechnarrative.loanbee` | New App Store submission |

## Removing Ads

Delete `src/ads/` and remove `<AdProvider>` from `app/_layout.tsx`. No other files are affected.

## Running Tests

```bash
npm test
```

Tests use ts-jest across three isolated projects declared in `package.json`:

- `core` — pure amortisation / loan maths
- `storage` — saved loans, route params, sharing, utilities, mortgage tracker logic
- `design-system` — typography and token-level checks

`jest-expo` is intentionally not used because `react-native-mmkv` relies on a manual mock and the current native dependency set is happier under the ts-jest setup.

## Testing Shared Calculation Links

Shared calculations use web-first URLs for people who do not have the app installed, and `loanbee://calculator/share` deep links for opening the same inputs in the native app.

Example app deep link:

```text
loanbee://calculator/share?amount=180000&interest=6.1&years=0&months=0&downPayment=25000&downPaymentType=cash&startDate=2027-11-09&mode=payment&payment=1750&currency=GBP&source=mobile&share=1
```

After installing a local development build with `npm run ios` or `npm run android`, open the link on a simulator/device:

```bash
xcrun simctl openurl booted "loanbee://calculator/share?amount=180000&interest=6.1&years=0&months=0&downPayment=25000&downPaymentType=cash&startDate=2027-11-09&mode=payment&payment=1750&currency=GBP&source=mobile&share=1"
```

```bash
adb shell 'am start -W -a android.intent.action.VIEW -d "loanbee://calculator/share?amount=180000&interest=6.1&years=0&months=0&downPayment=25000&downPaymentType=cash&startDate=2027-11-09&mode=payment&payment=1750&currency=GBP&source=mobile&share=1" -p com.cactus.loancalculator.free'
```

Expected behaviour: the app opens the shared calculation, recomputes the result locally, and lands on the Results tab where the loan can be saved or reshared.

## Feature Ownership

When you need to trace where an action lives:

- Start with [`docs/developer-action-map.md`](./docs/developer-action-map.md) for route ownership and app-shell behaviour.
- Use [`docs/saved-mortgage-journeys.md`](./docs/saved-mortgage-journeys.md) for mortgage-specific lifecycle rules.
