# LoanBee Mobile

Loan amortisation calculator for iOS and Android. Mobile companion to [TTN.loan-amortisation-calculator.web](https://github.com/oskarfigura/TTN.loan-amortisation-calculator.web).

## Features

- **Two calculation modes** — by term (fixed years/months) or by desired monthly payment
- **Amortisation schedule** — full month-by-month table with pagination
- **Three charts** — yearly stacked bar (principal vs interest), donut breakdown, cumulative area
- **Four currencies** — GBP, PLN, EUR, USD; per-loan selection, language-defaulted global setting
- **Saved loan profiles** — MMKV-backed CRUD with progress bar and overpayment savings badge
- **Bilingual** — English and Polish, device-detected with manual override
- **AdMob** — adaptive banner ads with GDPR consent flow; isolated in `src/ads/`

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
| Fonts | Inter (body) + Manrope (headings) via @expo-google-fonts |
| Tests | ts-jest (pure TS projects, no jest-expo) |

## Project Structure

```
app/
  _layout.tsx              # Root: fonts, i18n, MMKV, AdProvider, navigation stack
  (tabs)/
    index.tsx              # Calculator tab
    saved.tsx              # Saved loans list
    about.tsx              # Formula explanation
    settings.tsx           # Language, currency, version
  calculator/result.tsx    # Results: summary + charts + table + save CTA
  saved/
    new.tsx                # Save a calculation as a named profile
    [id].tsx               # View saved loan detail
    [id]/edit.tsx          # Edit nickname / lender / category / currency

src/
  core/                    # Pure-TS maths engine (copied from web app, no RN deps)
  types/                   # SavedLoan, LoanCalculationForm
  storage/                 # MMKV singleton, savedLoans CRUD, key constants
  i18n/                    # i18next init + en.json + pl.json
  ads/                     # AdProvider (GDPR consent), BannerAd wrapper, adUnits
  theme/                   # colours.ts, typography.ts — single source of truth
  currency/                # CURRENCIES array, formatCurrency(), languageToCurrency()
  components/
    ui/                    # Button, Card, SummaryCard, Disclaimer, EmptyState
    calculator/            # LoanForm, ResultsSummary, AmortisationTable, CurrencyPicker, DownPaymentToggle
    charts/                # RepaymentBarChart, LoanBreakdownDonut, CumulativeAreaChart
    loans/                 # LoanProfileCard
  hooks/                   # useLoanCalculatorForm, useSavedLoans, useLocale
  constants/               # lenders.ts, loanCategories.ts

__tests__/
  core/                    # amortisation.test.ts, loanHelper.test.ts
  storage/                 # savedLoans.test.ts
```

## Getting Started

This app cannot run in Expo Go because it uses native modules (`react-native-mmkv` and
`react-native-google-mobile-ads`). Use local native builds from this machine.

```bash
npm install
npm test          # run all 63 tests
npm run android   # build & run on connected Android device or emulator (expo run:android)
npm run ios       # build & run on connected iOS device or simulator (expo run:ios)
```

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
npm install
cd ios && pod install && cd ..   # iOS only, also re-run after native dependency changes
npm run typecheck
npm test
```

## Running Locally

Start from local native builds, not Expo Go:

```bash
npm run android   # Gradle build, install, and start on Android emulator/device
npm run ios       # Xcode build, install, and start on iOS simulator/device
```

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
- Re-run `pod install` after native dependency changes or after regenerating native project files.

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

## Environment Variables

Set these before any production-style build, whether local or EAS. Test IDs are used automatically
when unset or in dev mode.

| Variable | Purpose |
|---|---|
| `ADMOB_ANDROID_ID` | AdMob Android app ID |
| `ADMOB_IOS_ID` | AdMob iOS app ID |
| `ADMOB_BANNER_ANDROID_ID` | Android banner ad unit ID |
| `ADMOB_BANNER_IOS_ID` | iOS banner ad unit ID |

## EAS Builds

EAS is optional and used here for preview/production cloud builds only. Local development and local
native artifacts do not require EAS or a paid Expo plan.

```bash
# Install EAS CLI once
npm install --global eas-cli

# Preview APK (internal distribution / QA)
eas build --profile preview --platform android

# Production AAB (Play Store / App Store)
eas build --profile production
```

Before production, verify Android `versionCode` is higher than the Play Store production release.
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

Tests use ts-jest (two isolated projects: `core` and `storage`). jest-expo is not used because react-native-reanimated 4.x requires react-native-worklets which conflicts with the jest-expo Babel pipeline.

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
