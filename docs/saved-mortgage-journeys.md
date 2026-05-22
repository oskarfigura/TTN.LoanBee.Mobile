# Saved Mortgage — User Journeys

This document is the source of truth for how a saved mortgage behaves end-to-end: the entity model, every user journey, what is deliberately *out* of scope, and the validation and storage rules that underpin the experience. For the broader app-shell route map, pair this with [developer-action-map.md](./developer-action-map.md).

## Product principles

- **Keep it lean.** Resist feature drift toward LTV/ERC/property/tracker-product complexity. The product is a tracker for a single mortgage account, not a full financial dashboard.
- **Auto-populate from the calculator.** The user types figures once; the saved mortgage is fully populated and tracked from the first save with no re-entry.
- **Show the value of overpaying.** "Interest saved" and "extra principal repaid" are surfaced per-deal so the user can see what their overpayments are doing.
- **Drafts are planning aids only.** A draft is excluded from every live figure (balance, charts, totals, payoff date, savings) until it is activated.
- **Trust the bank.** Lender-confirmed closing balances and balance checkpoints override projections. The projection fills the gaps.

## Entity model

| Entity | Purpose |
|---|---|
| `LoanGroup` (aka `SavedLoan`) | The stored mortgage account. One per saved mortgage. |
| `LoanDeal` | A fixed-rate / interest period within the mortgage. Status: `active`, `completed`, or `draft`. |
| `MortgageEvent` | Activity recorded against an active deal: `lumpOverpayment`, `balanceCheckpoint`, `missedPayment`, `paymentHoliday`, `note`. |
| `formSnapshot` / `resultSnapshot` | The original calculator seed. Used to bootstrap the initial deal; no longer the live source of truth once deals exist. |

**Balance trust order** (highest first):
1. Completed lender closing balance
2. Bank-confirmed balance checkpoint event
3. Projection from the active deal terms + events
4. Original calculation seed (only while no deals exist — legacy state)

**Editing constraint:** only the **latest chronological deal** can be edited or deleted. Earlier completed deals and their events are read-only. To correct an earlier deal, later deals must be deleted first.

**Draft rule:** at most one draft deal per mortgage. A draft cannot be activated until the previous deal is completed.

## Journeys

### J1. Save a mortgage from the calculator

- **Entry:** Calculator → Calculate → Result screen → **Save**
- **Form:** nickname (required), category (mortgage / loan), lender (free text), currency.
- **What happens behind the scenes:**
  - A `LoanGroup` is created.
  - **One initial deal is auto-built** from the form snapshot (rate, opening balance, monthly payment, regular overpayment, term — all pre-filled). Status `active`.
  - The mortgage is **auto-pinned** to the home dashboard with `dashboardOrder = max(existing) + 1`.
- **Exit:** lands on the mortgage detail screen with one active deal and the home dashboard updated.
- **Edge case — legacy data:** mortgages saved before the deal model existed are migrated on load: a single migrated `active` deal is built from `formSnapshot` so the user lands in the same state as a fresh save.

### J2. Update opening balance for an already-running mortgage

- **Entry:** detail screen → **"Update opening balance?"** hint banner, *or* timeline → **Edit deal**.
- **Hint visibility:** the banner appears only when:
  - exactly one deal exists,
  - that deal is `active`,
  - no events are logged yet,
  - `createdAt` is within the last 14 days.
- **Exit:** back to the detail screen with the corrected opening balance reflected in projections and per-deal savings.

### J3. Review the current state of a mortgage

- **Entry:** home dashboard carousel, or Saved tab → tap a mortgage.
- **Detail screen, Overview tab:**
  - Hero: current balance (with source label — "Bank checkpoint", "Closed by lender", "Projected from current deal", or "Saved mortgage estimate").
  - Balance-paid % progress.
  - Estimated interest paid, estimated interest remaining, estimated savings (when overpayments apply).
  - Active deal driver: lender, end date, monthly payment, regular overpayment, **"Saved so far"** (interest saved this deal, when overpayments apply).
  - Timeline preview + recent activity.
- **Projection tab:** repayment bar chart, cumulative area chart, full amortisation schedule. All charts exclude drafts.
- **Timeline tab:** chronological list (drafts on top, current deal highlighted, completed deals below). Each card shows duration, rate, monthly payment, and a green **"Interest saved" / "Extra principal repaid"** row when overpayments exist.

### J4. Log a one-off lump overpayment

- **Entry:** detail → Quick actions → **Add overpayment**, or timeline → Add activity → Lump overpayment.
- **Constraints:** there must be an active deal; the event date must fall within `currentDeal.startDate..endDate`.
- **Effect:** the projection immediately reflects the lump sum, the per-deal "Saved" and "Extra principal" figures update, the home-dashboard balance updates.

### J5. Log a missed payment or payment holiday

- **Entry:** detail → Add activity → Missed payment / Payment holiday.
- **Constraints:** active deal required; date within the deal range.
- **Effect on projection (same logic for both):**
  - The scheduled monthly payment is suppressed for that month.
  - Regular overpayment is also suppressed for that month.
  - Interest still accrues on the unpaid balance.
- **Effect on figures:** the skipped month is excluded from `totalOverpayments` so reported overpayments match real cash flow.

### J6. Record a bank-confirmed balance checkpoint

- **Entry:** detail → Add activity → Bank balance checkpoint.
- **Effect:** the projection rebases to the supplied balance at that date. The detail screen's source label switches to "Bank checkpoint {date}".
- **Use case:** the user has a fresh statement and wants the app to trust the lender's figure over the model.

### J7. Adjust regular monthly overpayment

- **Entry:** timeline → Edit deal → **Additional Monthly Payment** field.
- This is a *correction* of the deal's standing instruction, not an event. The change applies retroactively to the projection of the current deal.
- **Save constraint:** disabled if any deal field is invalid.

### J8. Draft the next deal (plan ahead)

- **Entry:** timeline → **Add next deal** (only available while the current deal is not yet completed and no other draft exists).
- **Form behaviour:**
  - Start date is locked to `previous.endDate + 1 day`.
  - Opening balance is read-only: `projectedPrevious.balance + additionalBorrowing` (with `additionalBorrowing` editable).
  - Rate, term, repayment type, regular overpayment default from the previous deal.
  - Monthly payment is auto-derived.
- **Visibility:** appears as "Future" on the timeline with a dashed border and an **Inactive** badge.
- **Excluded from all live figures** (balances, charts, totals, payoff date, savings).
- **Cannot be published** until the previous deal is completed; the editor surfaces a warning banner and disables the Publish button.

### J9. Complete the current deal

- **Entry:** timeline → **Complete current deal**, or the warning banner on the draft editor.
- **Form:** completion date (defaults to scheduled end date), closing balance (auto-prefilled by projecting to that date), fees added, notes.
- **Effect:**
  - The deal flips to `completed` with the supplied figures.
  - Any draft is **rebased**: its start date moves to `completion + 1 day`, its opening balance is recalculated from the lender-confirmed closing balance plus its `additionalBorrowing`.
  - Fees added grow the closing balance but are **not** counted as interest paid in totals.

### J10. Publish (activate) a draft deal

- **Entry:** timeline → Edit draft → **Publish deal** (or "Save as draft" if the previous deal isn't completed yet).
- **Guard:** blocked until the previous deal is completed. The "Cannot publish" alert explains why.
- **Effect:** the draft becomes `active` and is included in all live figures from that point.

### J11. Correct a completed deal (latest only)

- **Entry:** timeline → Edit on the latest completed deal (correction mode via `?correct=1`).
- **What can change:** any field. Closing balance is editable so the user can fix lender reconciliation errors.
- **Effect:** the deal stays completed; later drafts get their opening balances recalculated through `normaliseDealChain`.
- **Read-only path:** earlier completed deals show the read-only card with per-deal savings stats but no edit button.

### J12. Delete a deal

- **Latest deal only.** Sole initial deals cannot be deleted (the mortgage would lose its only context).
- **Effect:** removes the deal *and* every event attached to it. Confirmation alert before destructive action.

### J13. Pin / unpin from the dashboard

- **Entry:** detail screen → pin button on the top card.
- **Effect:** flips `pinnedToDashboard`; sets `dashboardOrder = max + 1` when pinning (newest at the end of the carousel). New saves are auto-pinned via the same rule (J1).

### J14. Rename a mortgage

- **Entry:** detail screen → menu → **Rename mortgage**.
- **Effect:** updates `nickname` only. Lender, currency, deal figures untouched.

### J15. Delete a mortgage

- **Entry:** detail screen → menu → **Delete mortgage**.
- **Effect:** removes the `LoanGroup` entirely (deals + events). Routes back to Saved tab. Confirmation alert.

## Out of scope (deliberate)

To keep the product lean, the following are intentionally **not** modelled:

- Property valuation, LTV, equity tracking
- ERC tapering schedules, product fees beyond `feesAdded`, broker / valuation / legal fees
- Tracker rate margins, SVR reversion, stepped intro rates
- Joint borrowers, ownership shares, port to new property
- Tax reports, annual statements, HMRC-aligned exports
- Insurance reminders, document attachments
- Multiple drafts, scenario comparison

If a user asks for these, the answer is "by design — the calculator + saved tracker pair stays simple."

## Validation rules

The deal editor enforces these inline. Save buttons disable when any field has an error.

- **Monetary fields** (opening balance, additional borrowing, regular overpayment, closing balance, fees added): valid numbers. Required ones must be > 0.
- **Year and month inputs** (deal duration, total mortgage term): non-negative integers; decimals rejected.
- **Combined deal duration**: years × 12 + months must be > 0.
- **Combined total mortgage term**: same rule when the field is editable (initial deal only).
- **Interest rate**: required, > 0.
- **Empty fields**: counted as invalid for the disable-save check, but the inline red error only shows once the user has typed something invalid (avoids hostile blank-form errors on first paint).
- **Event date**: must fall within `currentDeal.startDate..currentDeal.endDate`. Lump overpayment must be ≤ projected balance at that point.

## Date semantics

- All persisted date strings are local-time `YYYY-MM-DD`.
- `dateToIso` converts in local time (no UTC round-trip) so BST/DST midnight transitions do not produce off-by-one drift.
- "Today" in the projection is `new Date()` formatted as local ISO.

## Calculation precision

The projection uses **monthly interest**, the standard model for amortization calculators. Real lenders typically compute interest daily, so figures here are estimates — bank-confirmed values always override.

**What this means concretely:**

- Interest is applied once per month at `monthlyRate = annualRate / 12 / 100` on the start-of-month balance.
- Events keep their full `YYYY-MM-DD` date in storage, but the projection buckets them by `YYYY-MM` (month key). Two overpayments in the same month land in the same bucket regardless of their day.
- A lump overpayment reduces the balance at the **end** of its month, so it does not reduce that same month's interest charge. The reduction begins the following month.
- Order of operations within a single month: `balanceCheckpoint` → interest accrual → scheduled payment → regular overpayment → `lumpOverpayment` events. A checkpoint and an overpayment in the same month compose (checkpoint sets the opening balance, overpayment then deducts from the post-payment balance).

**Where the full date still matters:**

- Validation: an event's date must fall within `[deal.startDate, deal.endDate]`.
- Cross-month assignment: an event dated 31 March goes into March's bucket; 1 April goes into April's.
- Display: friendly date formatting for activity logs, completion summaries, and timeline.

**Source-of-truth override:** whenever the user supplies a bank-confirmed figure (a `balanceCheckpoint` event or a deal `completion.closingBalance`), the projection rebases to that figure. Drift from the monthly approximation is therefore self-correcting as long as the user logs occasional checkpoints.

## Storage

- **MMKV key:** `saved_loans_v2` (JSON array of `LoanGroup`).
- **Legacy key:** `saved_loans_v1` — the loader migrates legacy records into a one-active-deal `LoanGroup` and removes the legacy key.
- **`dashboardOrder`** uses the `max + 1` pattern for both auto-pin on save (J1) and toggle-pin from detail (J13). Helper: `savedLoansStorage.getMaxDashboardOrder()`.

## Acceptance criteria (regression tests)

These are the invariants tests must keep guarding:

- Saving a calculation produces a mortgage with one auto-built `active` deal and `pinnedToDashboard: true`.
- A draft never contributes to balance, principal paid, interest paid, savings, payoff date, charts, or the amortisation table.
- A draft's events do not appear in `recentEvents` on the detail screen.
- `getDealOverpaymentImpact` returns 0 for a deal with no overpayments.
- `getDealOverpaymentImpact` excludes regular overpayment for months that have a `missedPayment` or `paymentHoliday` event.
- `feesAdded` does not inflate the projection's `totalInterestPaid`.
- The latest deal is the only deal that can be edited or deleted.
- A draft cannot be activated while its predecessor is not `completed`.
- Completing a deal rebases any pending draft's opening balance from the lender-confirmed closing balance.
- All date arithmetic uses local time.

## Mapping journeys to files

| Journey | Primary screen / component |
|---|---|
| J1 Save | `app/saved/new.tsx`, `src/loans/loanGroupFactory.ts` |
| J2 Update opening balance | `OpeningBalanceHint` in `MortgageDetailView.tsx`, deal editor route |
| J3 Review state | `MortgageDetailView.tsx`, `MortgageDashboard.tsx`, `MortgageTimelineView.tsx` |
| J4 Lump overpayment | `app/saved/[id]/events/new.tsx`, `MortgageEventForm.tsx` |
| J5 Missed / holiday | same as J4 with `initialType` |
| J6 Balance checkpoint | same as J4 |
| J7 Regular overpayment | `DealEditorForm.tsx` |
| J8 Draft next deal | `app/saved/[id]/deals/new.tsx`, `buildNextDealDraft` in `tracker.ts` |
| J9 Complete current | `app/saved/[id]/complete-current.tsx` |
| J10 Publish draft | `DealEditorForm.tsx` (publish button), `canActivateDeal` in `tracker.ts` |
| J11 Correct completed | `app/saved/[id]/deals/[dealId].tsx?correct=1` |
| J12 Delete deal | `MortgageTimelineView.tsx`, `canDeleteDeal` + `removeLatestDealAndEvents` |
| J13 Pin / unpin | `DashboardPinButton`, `savedLoansStorage.togglePinned` |
| J14 Rename | rename modal in `app/saved/[id].tsx` |
| J15 Delete mortgage | menu in `app/saved/[id].tsx`, `savedLoansStorage.remove` |
