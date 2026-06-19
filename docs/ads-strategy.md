# Ad Strategy

How LoanBee serves ads, when each format appears, and the rules that protect the
user experience (and therefore retention/growth). The implementation lives in
`src/ads/` and is fully isolated there — see the invariant in `CLAUDE.md`.

The guiding principle: **monetise calm moments, never interrupt a user mid-task.**
New users and engaged tracker users are the cohorts that drive growth, so the
policy deliberately under-shows to them.

## TL;DR

- **Banners** — passive, bottom of the result screen. Show from launch (once
  consent resolves). No frequency limits.
- **Interstitials (organic)** — full-screen, shown only when you *land on a calm
  tab* (Home/Saved) after doing engagement work. Never mid-task. Gated by: past
  the new-user grace period (≥5 lifetime actions **and** ≥24h), ≥4 actions since
  the last one, a 10-min cooldown, and ≤5/day.
- **Interstitial (CSV export)** — CSV export is a **premium feature**, so it
  **always** shows an ad first, ignoring all the limits above. If no ad can load
  it proceeds anyway (never blocks the export).
- **Where ads never appear**: the result screen (interstitial), Settings,
  onboarding, share, and for brand-new users (organic interstitials only).
- **Personalisation** — off by default; only personalised with the user's consent
  (iOS ATT + GDPR/UMP). **iOS** ads are off entirely until `admobIosEnabled` is set.
- **Future**: a **PRO (ad-free) tier** will remove all ads, including the CSV gate.

## Ad formats

| Format | Where it renders | Intrusiveness | Gate |
|---|---|---|---|
| **Banner** | Bottom of the result screen (`app/(tabs)/result.tsx`) | Passive | Shows once the consent flow has resolved |
| **Interstitial** | Full-screen, on arrival at a calm tab after engagement | High | Frequency-capped policy (below) |
| **Interstitial (forced)** | Full-screen, before a CSV export (premium gate) | High | **Always shows** — bypasses the frequency policy |

A single shared interstitial instance lives in `interstitialController.ts` and is
used by every trigger, so only one ad is ever loaded/requested and the frequency
policy coordinates all triggers through the same persisted state.

There are no rewarded ads today. A future **PRO (ad-free) tier** is the planned
escape hatch for ad-averse users — it is intentionally **out of scope** for the
current work and not yet implemented.

## Platform gating

- **Android** — ads enabled.
- **iOS** — ads are **opt-in** via `admobIosEnabled` (`src/ads/adsConfig.ts`), so
  the first App Store submission can ship with no ATT/UMP/ad-request code paths
  active. Flip the flag to turn iOS ads on later.

Production unit IDs come from env vars; dev builds always use Google test IDs.
See the AdMob section in `CLAUDE.md` for the env-var wiring.

## Consent & personalisation

Resolved once on launch in `AdProvider.tsx`, then read by every ad request via
`consentState.ts`:

1. **Default is privacy-safe** — until the flow resolves (and on any error) ads
   are non-personalised.
2. **iOS ATT** — the system App Tracking Transparency prompt is held until the
   onboarding guide is dismissed on first run, so the priming rationale is shown
   first (higher opt-in, higher eCPM). Returning users go straight to the prompt.
3. **GDPR / UMP / TCF** — where GDPR applies, personalisation additionally
   requires the user's "select personalised ads" choice.
4. Personalised ads are served **only when every applicable gate permits it**
   (`attAllowsPersonalization && gdprAllowsPersonalization`).

Banner and interstitial requests both pass `requestNonPersonalizedAdsOnly` based
on this resolved state, and both wait for the flow to resolve before firing so no
request goes out under the wrong flag.

## Interstitial policy

Logic in `interstitialPolicy.ts`; trigger orchestration in `InterstitialGate.tsx`.
An interstitial may show only when **all** of the following hold. The constants
are the single source of truth — the values below track them.

| Rule | Constant | Value | Purpose |
|---|---|---|---|
| New-user grace | `INTERSTITIAL_GRACE_ACTIONS` + `INTERSTITIAL_GRACE_PERIOD_MS` | 5 actions **and** 24h since first action | Never interrupt brand-new users |
| Engagement threshold | `INTERSTITIAL_MIN_ACTIONS` | 4 actions since the last interstitial | Earn the interruption |
| Cooldown | `INTERSTITIAL_COOLDOWN_MS` | 10 minutes | Space out interstitials |
| Daily cap | `INTERSTITIAL_MAX_PER_DAY` | 5 per day | Bound a heavy session |

### What counts as an "action"

Active engagement that moves the user toward the next interstitial:

- A **fresh calculation** reaching the result screen (deduped by `draftId`, so the
  same calculation never counts twice across back/forward navigation).
- Entering any **tracker screen** — opening a saved loan, editing a deal,
  recording an overpayment (deduped per route).

Counting tracker activity means users who never run a fresh calculation still
progress, without increasing frequency for anyone (the cooldown and daily cap
still bound it).

### Premium-gated trigger (CSV export)

The amortisation **CSV export** (`handleExportCsv` in `LoanCalculationView.tsx`)
is treated as a premium feature: it **always** shows an interstitial first, via
`presentInterstitial({ force: true })`. The forced path **bypasses the entire
frequency policy** — grace period, action threshold, cooldown, and daily cap — so
the ad is the price of the feature, not an opportunistic interruption. The ad
still has to load: if it isn't ready, the controller waits briefly
(`FORCE_LOAD_TIMEOUT_MS`, 5s) and then proceeds *without* an ad rather than block
the export (offline / no-fill). A forced show is still recorded, so any later
route-based interstitial is spaced out by the normal cooldown.

> When **PRO mode** ships, PRO users will skip this ad (and all ads). Until then,
> the forced ad is the gate on CSV export.

### When a route-based interstitial actually shows

Routes are classified in `classifyRoute`:

- **`action`** — fresh result screen + tracker screens. Entering one records an
  action and pre-loads the next ad. Never shows an ad here (no mid-task interruption).
- **`break`** — Home and the Saved list. Arriving at a break *from* engagement is
  the natural pause where an eligible interstitial is shown.
- **`neutral`** — everything else: onboarding, share, the calculate entry, viewing
  a previously-saved result, the Recent list, and **Settings**. Does not count and
  does not trigger.

> **Settings is deliberately neutral**, not a break. Users open Settings to change
> language/currency, find the future "remove ads" option, or report a problem — a
> low-patience / high-intent moment where an ad would frustrate.

### New-user grace, in detail

Grace ends only when the user is "established": **both** ≥ `GRACE_ACTIONS` lifetime
actions **and** ≥ `GRACE_PERIOD_MS` since their first action. The conjunction
protects two cases at once:

- A **first-session power user** (many actions, minutes old) — blocked by the time gate.
- A **long-tenured but barely-active user** (old install, few actions) — blocked by
  the engagement gate.

Banners are unaffected by grace; only interstitials are suppressed.

## End-to-end example

A new user installs the app:

1. Runs 3 calculations and opens 2 saved loans on day one → 5 actions, but **no
   interstitial** (grace: < 24h since first action). Banners show on the result screen.
2. Returns the next day, opens a tracked mortgage, edits a deal, records an
   overpayment, runs a calculation (4 actions), then taps **Home** → grace is over,
   threshold met, cooldown clear → **interstitial shows**.
3. For the next 10 minutes no interstitial can show (cooldown), and never more than
   5 in a day (daily cap).
4. Tapping **Settings** at any point never triggers an interstitial.

## Tests

`__tests__/storage/interstitialPolicy.test.ts` covers the grace period (both
gates), the per-interstitial action threshold, the cooldown, and the daily cap
with next-day reset.
