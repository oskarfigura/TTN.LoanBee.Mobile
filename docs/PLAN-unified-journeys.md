# Plan — Unified journeys + one start-date-driven mortgage tracking flow

**Target worktree:** Codex's `codex/loanbee-journeys` (which already holds intent-first
realignment groundwork, Recent Calculations, and About-in-Settings). This plan supersedes
both `docs/PLAN-unified-add-tracking.md` and `docs/PLAN-realign-intent-first.md`.

---

## Context

The app has accreted multiple overlapping paths into the same saved-mortgage object:
intent-vs-type branching at the top, and — most recently — **two separate mortgage setup
screens**: `track.tsx` (today-anchored: current balance + remaining term) and Codex's new
`history.tsx` (origination-anchored: original balance + first-deal duration).

Investigation of the data model and detail surface shows the second screen is redundant.
A mortgage is just a chain of deals. The detail view already exposes **"Complete current
deal"** (`app/saved/[id]/complete-current.tsx`) for any `status: 'active'` deal and
**"Add next deal"** afterward (`MortgageDetailView.tsx:1211`, `:1227`). `getCurrentDeal`
(`src/mortgage/tracker.ts:421`) treats any active deal as current **regardless of whether
its end date is in the past**. And `buildTrackedMortgageFromForm`
(`src/mortgage/trackBuilder.ts:89`) already anchors the seeded deal at an arbitrary
`startDate` and runs the projection forward from it.

So the only thing separating "track from today" from "track an old mortgage" is **the deal
start date**. Enter today's balance dated today → current deal. Enter the original balance
dated at origination → the original deal, which the user then completes and chains forward
using the lifecycle that already exists. No second engine, no second screen.

**Outcome:** one Track form whose start date spans past/present/future; the historical
capability is *discovered* by setting an earlier date (with a gentle hint), not by a
separate flow. This realises the intent-first model and the "keep it simple" north star.

---

## User journeys (the target map)

```
[ + Add ]  ─►  Intent (the ONLY upfront branch)
               ├─ "Plan a new one"   → Calculator → Result (auto-saved to Recent)
               │                        → Save step  ── choose Loan | Mortgage
               │
               └─ "Track one I have" → ONE Track form ── choose Loan | Mortgage
                                         └─ Deal start date (defaults to today)
                                              • today    → current deal      (most users)
                                              • future   → upcoming deal
                                              • earlier  → original/earlier deal
                                                            → detail view nudges
                                                              "Complete current deal"
                                                              → "Add next deal" → … chain
```

1. **Plan a new one** — type-agnostic calculator → result (captured under Recent
   Calculations) → save, choosing Loan/Mortgage at the save step. Type is never asked up
   front.
2. **Track a current mortgage** (default) — start date = today, "current balance" +
   "remaining term". One active deal anchored today. Unchanged from today's behaviour.
3. **Track a future mortgage** — start date in the future; "starting balance". (Subsumes
   Codex's active/future toggle.)
4. **Track an old mortgage (historical)** — start date set earlier; "starting balance" +
   "term at that date". Produces one active deal anchored historically. The user discovers
   this by changing the date (hinted with mortgage-specific copy such as
   *"Tracking an older mortgage? Set the date your original deal started."*). They then
   walk the chain forward with the existing
   **Complete current deal → Add next deal** actions on the detail screen.
5. **Track a loan (current or historical)** — same form with the Loan toggle; single deal,
   no deal-end framing; start date works identically.

---

## The unified Track model

A single start-date field drives everything; labels adapt to the date relative to today.

| Start date | Balance label | Term label | Meaning |
|---|---|---|---|
| Today (default) | Current balance | Remaining term | Current deal, anchored now |
| Future | Starting balance | Term length | Upcoming deal |
| Earlier | Starting balance | Term length (original) | Original/earlier deal → chain forward |

Why this works with zero engine changes:
- `buildTrackedMortgageFromForm` already anchors the deal at `values.startDate` with
  `openingBalance = currentBalance` and runs `buildMortgageProjection` forward. For a past
  date, "today's balance" simply becomes a *derived* projection value rather than an input.
- `resolveDealDurationMonths` (`trackBuilder.ts:71`) already derives the fixed-period
  length from `startDate → dealEndDate`, which is valid when both are in the past.
- The progress bar uses `monthsBetween(startDate, today) / totalTermInMonths` — correct for
  a historic anchor.
- A past-dated deal stays `status: 'active'`, so the detail view's completion/add-next
  lifecycle lights up automatically.

Intended (acceptable) behaviour: a freshly-entered historic mortgage with one deal whose
end date has passed will *over-project* (it amortises the original deal's terms past its
real end) until the user completes it and adds the next deal. That is exactly the
"discover and build forward" model — surfaced by the existing reconciliation/complete-current
nudge.

---

## Implementation

### Phase A — Intent-first Home journey (`app/(tabs)/index.tsx`)
- Collapse `JourneyStep` to `'intent' | 'form'`. **Delete** the upfront `borrowingType`
  step and the `mortgageTrack` sub-step (track-from-today vs build-history).
- Intent options: **"Plan a new one"** → `form` (type-agnostic calculator); **"Track one
  I have"** → `router.push('/saved/track')`.
- Remove `category` state here and stop threading it into `buildDraftResultParams`
  (`src/results/loanResultRoute.ts`) → revert the `category` param + the
  `resultRoute.test.ts` expectations. Keep `getResultForFormValues` / Recent-calc capture
  (capture without a category — a raw calc has no type until saved).
- `LoanForm` returns to a single `calculator.subtitle` (drop the category-aware split).

### Phase B — Unify Track into one start-date flow (`app/saved/track.tsx`)
- **Replace** Codex's `setupTiming` active/future `SegmentedControl` with a single
  `DatePickerField` "Deal start date", defaulting to `today`, **no `minimumDate`** (past
  allowed). Add muted, category-aware hint copy under it (`dealStartDateHint` for
  mortgages, `dealStartDateHintLoan` for loans).
- Adaptive labels/hints for the balance and term fields keyed off `startDate` vs `today`
  (current vs starting; remaining vs original term).
- Thread `startDate` through `buildValues()` (builder already consumes it). Anchor the
  live `summary` payoff and lump-overpayment `minimumDate` on `startDate` (Codex already
  did both — keep).
- Validate `isValidIsoDate(startDate)` in `canSave`.
- **Add a `Loan | Mortgage` `SegmentedControl`** at the top (mirror `app/saved/new.tsx`),
  default `mortgage`. When `loan`: hide the deal-end section; frame overpayments as
  loan-level.

### Phase C — Builder: loan path (`src/mortgage/trackBuilder.ts`)
- Add a loan build branch (or `category` param): `category: 'loan'`, single active deal,
  no deal-end period; reuse the existing projection. Keep the mortgage path byte-for-byte.
- No `src/core/` changes. Confirm `resolveDealDurationMonths` + `buildMortgageProjection`
  behave for past anchors (they should; add tests in Phase E).

### Phase D — Remove the redundant history flow
- **Delete** `app/saved/history.tsx` and its route registration in `app/_layout.tsx`.
- Remove the `history.*` i18n keys and the journey keys for the deleted `borrowingType` /
  build-history steps from `src/i18n/locales/en.json` and `pl.json` (keep en/pl in lockstep).
- Keep Recent Calculations (`src/storage/recentCalculations.ts`, `recent_calculations_v1`)
  and About-in-Settings (`app/about.tsx`) — both are orthogonal and stay.

### Phase E — Tests
- `trackBuilder` tests: (1) today-anchored mortgage unchanged; (2) past-anchored mortgage
  produces one active deal with the historic `startDate`/`openingBalance` and a sane
  forward projection; (3) loan path yields `category: 'loan'`, single deal, no deal-end.
- Keep `src/core/` covered: run `npm test` before and after if core changes are ever made
  (AGENTS.md invariant). This journey work should not need core changes.

### Optional enhancement (note, not required)
- In `MortgageDetailView`, strengthen the nudge when an active deal's `endDate` is already
  in the past ("This deal has ended — complete it to add your next deal"), making the
  historic chain self-explanatory. Behaviour already works; this is copy/affordance only.

---

## Out of scope (hard boundary)

- **Overpayment engine/screen unification** (the `OverpaymentScope` adapter) belongs to the
  sibling worktree `refactor/unified-add-tracking`. Do **not** touch
  `app/saved/[id]/overpayments/*`, `app/saved/[id]/deals/[dealId]/overpayments.tsx`,
  `src/loans/loanOverpaymentCalc.ts`, or `src/mortgage/tracker.ts` overpayment functions.
- **Never modify `src/core/`.** No `LoanGroup`/`saved_loans_v2` shape change is needed; if
  one becomes unavoidable, bump `LOAN_GROUP_SCHEMA_VERSION` + add a migration in
  `src/storage/savedLoans.ts`. `recent_calculations_v1` is new and self-contained.
- Colours via `colours.*`, fonts via `fonts.*` / `fontWeights.*` — no inline literals.

---

## Verification

```bash
npm test           # all Jest projects green (core / storage / design-system)
npx tsc --noEmit   # no type errors from removed category params / deleted history
```

Manual smoke (build locally — Expo Go unsupported):
- Home, no pins → **one** chooser: "Plan a new one" | "Track one I have". No
  mortgage-vs-loan screen before it.
- Plan → calculator → result appears under Recent → Save → choose Loan/Mortgage there.
- Track, start date = today → "current balance"; saves a current-deal mortgage as before.
- Track, start date set to the future → "starting balance"; future-dated deal.
- Track, start date set ~5 years back with the original balance/term → saved mortgage opens
  to the detail view; **"Complete current deal"** is offered; completing it then **"Add
  next deal"** chains forward — full history built through the existing lifecycle, no
  separate screen.
- Track with Loan toggle → no deal-end section; single-deal loan, start date works the same.
- About opens from Settings; `history.tsx` route is gone.
