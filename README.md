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
| Framework | Expo SDK 54, React Native 0.81 |
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

```bash
npm install
npm test          # run all 63 tests
npm run android   # build & run on connected Android device or emulator (expo run:android)
npm run ios       # build & run on connected iOS device or simulator (expo run:ios)
```

Requires Android Studio + SDK (for Android) or Xcode (for iOS). The app uses native modules
(`react-native-mmkv`, `react-native-google-mobile-ads`) that are incompatible with Expo Go —
always use a local build or an EAS development build.

## Environment Variables

Set these before an EAS production build — test IDs are used automatically when unset or in dev mode.

| Variable | Purpose |
|---|---|
| `ADMOB_ANDROID_ID` | AdMob Android app ID |
| `ADMOB_IOS_ID` | AdMob iOS app ID |
| `ADMOB_BANNER_ANDROID_ID` | Android banner ad unit ID |
| `ADMOB_BANNER_IOS_ID` | iOS banner ad unit ID |

## EAS Builds

Used for preview and production releases only. Local development runs via `npm run android` / `npm run ios`.

```bash
# Install EAS CLI once
npm install --global eas-cli

# Preview APK (internal distribution / QA)
eas build --profile preview --platform android

# Production AAB (Play Store / App Store)
eas build --profile production
```

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
