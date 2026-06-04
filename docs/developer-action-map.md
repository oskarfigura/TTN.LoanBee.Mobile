# Developer Action Map

This document is the quickest way for a future developer to answer two questions:

1. Which screen owns a given user action?
2. Which stored entities and route transitions does that action affect?

For detailed mortgage-tracker behaviour, validation, and edge cases, also read [saved-mortgage-journeys.md](./saved-mortgage-journeys.md).

## Top-level routes

| Route | Purpose | Main actions |
|---|---|---|
| `/(tabs)/index` | Home tab | Show the pinned borrowing dashboard, or open the guided calculator/tracking setup |
| `/(tabs)/result` | Hidden result tab | Review calculation, save/track, share, leave with unsaved-result guard |
| `/(tabs)/saved` | Tracked and recent list | Open tracked loan/mortgage, manage recent calculations, toggle pin, jump back into the Home calculation journey |
| `/(tabs)/settings` | Settings tab | Change language/currency, reopen guide/about, manage data |
| `/about` | Formula/about route | Read product explanation, FAQ, and disclaimer from Settings |
| `/guide` | Onboarding walkthrough | Mark guide seen, jump into calculator |
| `/calculator/share` | Shared-calculation entrypoint | Parse deep link / share URL and route into Result |
| `/saved/new` | Save flow | Name a calculation, choose category/currency, create initial deal |
| `/saved/track` | Loan/mortgage tracking setup | Track borrowing from a past, current, or future deal start date |
| `/saved/[id]` | Saved loan detail | Review loan or mortgage, share, rename, delete, pin, open child flows |
| `/saved/[id]/edit` | Saved loan editor | Edit metadata and jump back to calculator for recalculation |
| `/saved/[id]/overpayments` | Loan overpayment editor | Adjust simple saved-loan overpayment inputs |
| `/saved/[id]/deals/new` | Mortgage deal creator | Start first/current/next deal draft |
| `/saved/[id]/deals/[dealId]` | Mortgage deal editor | View, edit, correct, publish, or delete latest deal |
| `/saved/[id]/events/new` | Mortgage event creator | Add overpayment, checkpoint, missed payment, holiday, note |
| `/saved/[id]/events/[eventId]` | Mortgage event editor | Edit or delete an existing mortgage event |
| `/saved/[id]/complete-current` | Mortgage completion flow | Close the active deal and rebase later drafts |

## Root navigation wiring

`app/_layout.tsx` owns the root stack and registers the non-tab routes. The current stack shape matters because several actions rely on modal presentation or hidden routes:

- `saved/new`, `saved/track`, `saved/[id]/deals/new`, `saved/[id]/events/new`, and `saved/[id]/complete-current` open as modals.
- The Results screen lives inside the tab navigator as `/(tabs)/result`, but it is hidden from the tab bar with `href: null`.
- `/about` sits above the tab shell and is entered from Settings.
- `guide` and all `saved/*` detail routes sit above the tab shell and can be entered from multiple tabs.

## Home tab modes

The first tab is Home. `app/(tabs)/index.tsx` restores the pinned dashboard as the default logged-in surface, then opens the guided calculator when requested:

| Mode | Trigger | What the user sees |
|---|---|---|
| First-run onboarding | `guide_seen_v1` not set and the consent gate has completed | `/guide?firstRun=1` is pushed |
| Dashboard mode | One or more loans are pinned and no calculator override is active | Home dashboard carousel with pinned tracked loans/mortgages |
| Intent step | No pinned loans, dashboard CTA, or `calculator=1` param | Plan a new one vs Track one I have, with no Loan/Mortgage choice up front |
| Plan mode | User chooses "Plan a new one" | Type-agnostic calculator form; Loan/Mortgage is chosen later in `/saved/new` |
| Track mode | User chooses "Track one I have" | `/saved/track`, where Loan/Mortgage and the deal start date are chosen |

Related behaviours:

- Tapping the Home tab sends a fresh `dashboard` param so the calculator collapses back to the pinned dashboard when one exists.
- Leaving the hidden Result route is guarded while the result is unsaved.
- Returning from Tracked/Settings with `fromDashboard=1` should route back to `/`, not deeper into the navigation stack.

## Core action flows

### 1. First launch

- Entry: app open
- Files: `app/(tabs)/index.tsx`, `app/guide.tsx`, `src/onboarding/guideState.ts`, `src/onboarding/firstRunGate.ts`
- State changes:
  - waits for the consent flow to finish
  - pushes `/guide?firstRun=1` if the guide has not been seen
  - sets `guide_seen_v1` when the guide screen mounts

### 2. Plan a new one -> review result -> save/share

- Entry: Home tab → Plan a new one
- Files: `app/(tabs)/index.tsx`, `app/(tabs)/result.tsx`, `app/(tabs)/saved.tsx`, `app/saved/new.tsx`
- State changes:
  - calculator submits pure-TS `getLoanCalculations(...)`
  - draft result params are passed into the hidden Result route and a `RecentCalculation` is persisted
  - Result can share the calculation URL, reopen from Tracked → Recent calculations, or open `/saved/new`
  - unsaved results set a leave guard until the user saves or discards

### 3. Save a calculation

- Entry: Result -> Save
- Files: `app/saved/new.tsx`, `src/loans/loanGroupFactory.ts`, `src/storage/savedLoans.ts`
- State changes:
  - user chooses Loan or Mortgage at this step
  - creates a `SavedLoan` / `LoanGroup`
  - normalises `formSnapshot` and `resultSnapshot`
  - creates the initial `LoanDeal`
  - auto-pins the new loan with `dashboardOrder = getMaxDashboardOrder() + 1`
  - routes to `/saved/[id]?fromSave=1`

### 4. Track borrowing from one start-date-driven form

- Entry: Home → Track one I have
- Files: `app/saved/track.tsx`, `src/mortgage/trackBuilder.ts`, `src/storage/savedLoans.ts`
- State changes:
  - user chooses Loan or Mortgage inside the Track form
  - creates a `LoanGroup` with one active deal anchored at the chosen deal start date
  - today means current balance / remaining term; future or past means starting balance / term length
  - a past mortgage start date seeds the first historic deal; the existing Complete current deal → Add next deal lifecycle builds the chain forward
  - loans are single-deal tracked items with no fixed-deal end section
  - auto-pins tracked borrowing with `dashboardOrder = getMaxDashboardOrder() + 1`
  - routes to `/saved/[id]?fromSave=1`

### 5. Review and manage a saved loan

- Entry: Tracked tab, or post-save redirect
- Files: `app/saved/[id].tsx`, `src/components/loans/MortgageDetailView.tsx`
- Shared actions:
  - share the original calculation URL with loan/mortgage-specific share copy
  - rename
  - delete
  - edit metadata
  - pin / unpin from dashboard
- Mortgage-only actions:
  - open Overview / Projection / Timeline tabs
  - add next deal
  - complete current deal
  - add and edit mortgage events
  - correct the latest completed deal

### 6. Shared link / deep link

- Entry: `/calculator/share`
- Files: `app/calculator/share.tsx`, `src/share/calculationShareLink.ts`
- State changes:
  - parses search params from a web URL or `loanbee://calculator/share` deep link
  - recomputes the result locally
  - replaces into the hidden Result route

## Persisted entities

| Entity | Stored in | Purpose |
|---|---|---|
| `LoanGroup` / `SavedLoan` | `saved_loans_v2` | Root saved record for a loan or mortgage |
| `LoanDeal` | nested in `SavedLoan.deals` | Current, completed, or draft mortgage period |
| `MortgageEvent` | nested in `SavedLoan.events` | One-off overpayment, checkpoint, holiday, note, missed payment |
| `formSnapshot` | nested in `SavedLoan` | Original calculator inputs |
| `resultSnapshot` | nested in `SavedLoan` | Original calculation summary and baseline-interest values |
| `RecentCalculation` | `recent_calculations_v1` | User-visible automatic calculation history, separate from tracked borrowing |

Important persistence rules:

- `saved_loans_v2` is the current MMKV key.
- `recent_calculations_v1` stores the capped newest-first recent-calculation list.
- `saved_loans_v1` is the legacy key still migrated by `savedLoansStorage`.
- Legacy records are upgraded into the deal-based model on read.
- `pinnedToDashboard` plus `dashboardOrder` controls the home dashboard carousel.
- Each saved loan keeps its own `currency`; result and chart UI should format with the loan currency, not the global default.

## Where to look for mortgage-specific business rules

Use these files together:

- [saved-mortgage-journeys.md](./saved-mortgage-journeys.md): user journeys, validation rules, deliberate scope boundaries
- `src/mortgage/tracker.ts`: deal sequencing, correction rules, activation/completion logic
- `src/mortgage/projection.ts`: projected balance and chart data
- `src/storage/savedLoans.ts`: migration and persistence wiring
- `src/types/SavedLoan.ts`: entity model

## Test map

`npm test` runs three ts-jest projects declared in `package.json`:

- `core`: pure maths engine tests
- `storage`: saved-loan, route-param, utility, and mortgage-tracker tests
- `design-system`: typography/design-token tests
