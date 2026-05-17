# LoanBee Mobile — Product & UX Review

_Reviewed: May 2026 · Reviewer perspective: product owner + UX_

Scope reviewed: navigation/tab IA, calculator, results (summary/charts/schedule/CSV/share),
saved list + dashboard, mortgage tracker, overpayments flows, settings, and the i18n surface.

---

## Verdict

The core calculator and the results experience (summary / charts / schedule / CSV / share)
are genuinely strong — clear, fast, well-designed. The product gets into trouble in two
places: **information architecture of the 4 tabs**, and an **over-built mortgage-tracking
layer** sitting on top of a calculator, with **redundant overpayment flows** and a
**data-durability gap** that is serious for a finance app.

---

## P0 — Address before next release

### 1. Two overlapping overpayment features; one is dead code

Two overpayment screens exist with separate i18n namespaces:

- `app/saved/[id]/overpayments/index.tsx` — modern: monthly + lump sums + before/after
  balance chart. **This is the one actually used.**
- `app/saved/[id]/recalculate.tsx` (`recalculate.*` i18n) — older: monthly-only, no lump
  sums, no chart. Registered in `app/_layout.tsx:73` but **nothing navigates to it**. Dead UI.

The live "Try Overpayments" nudge in `LoanSummaryPanel.tsx:210` borrows its label from the
*dead* screen's namespace (`recalculate.ctaButton`) while routing to the *new* screen.

**Action:** delete `recalculate.tsx`, its Stack entry, and the `recalculate.*` keys; move
`ctaButton` into the `overpayments` namespace.

### 2. Local-only storage with no backup/restore

MMKV is device-local. A user tracking a mortgage for years across multiple deals and bank
checkpoints loses **everything** on phone loss/reset/reinstall. Acceptable for a throwaway
calculator; not for a multi-year tracker. No export, import, or cloud backup exists. This is
the single biggest risk to perceived trustworthiness — which DESIGN.md makes the brand promise.

**Action:** at minimum a manual "Export my data / Import" in Settings (JSON via the existing
sharing sheet). Cloud sync is the proper fix later.

### 3. Non-localised hardcoded string

`app/(tabs)/saved.tsx:43` ships an English sentence with no `t()`. Polish users see English
while the rest of the screen is translated. Visible defect.

---

## P1 — Information architecture & core flows

### 4. The 4-tab model is muddled

- "Home" tab is two different screens depending on state (dashboard carousel vs calculator
  form). Icon, screen title, and tab label imply three different mental models.
- The calculator loses its home as the user succeeds: once anything is pinned, the calculator
  is buried behind a "New calculation" button. Engagement reduces discoverability — backwards.
- "Saved" and the dashboard overlap (pinned-subset vs full list, unclear division).
- "About" wastes a permanent tab slot on a static formula + FAQ + disclaimer page.
- Leftover IA churn: `tabs.calculator` is defined in i18n but **unused**.

**Recommended structure:** `Calculate` (always the form, stable home) · `Tracked`
(dashboard + saved merged into one searchable list, pinned on top) · `Tools/Compare` ·
`Settings` (About nested inside).

### 5. Missing the highest-value job: scenario comparison

No side-by-side of two ad-hoc calculations (term vs term, rate vs rate, lender vs lender).
The only comparison today is baseline-vs-overpayment inside a saved loan. Biggest missing
feature for usefulness; natural occupant of the freed tab slot.

### 6. The unsaved-result guard is too aggressive

Every calculation arms a "Leave without saving" modal. Most calculator use is throwaway
exploration; forcing a save/discard decision on the most-used path is friction. Drop the
guard for fresh, trivially-reproducible calculations; keep it only when meaningful edits exist.

### 7. Store-review prompt fires too early

`result.tsx:90-97` requests a review on viewing the first result and again on first save.
Asking on the user's first-ever calculation is the classic anti-pattern. Gate behind
demonstrated repeat value.

---

## P1 — Mortgage tracker: powerful but over-scoped

Stated north star: keep the tracker simple — auto-input + per-deal overpayment value
visibility. It has drifted: deals, drafts, publish/complete lifecycles, bank checkpoints,
completion reconciliation, additional borrowing, fees-added, interest-only, "recalculate
later deals," locked deals. The `mortgage.*` namespace (~250 strings) is larger than the rest
of the app combined. Cognitive load + many destructive-confirm modals + multiple near-duplicate
"add overpayment" entry points.

**Action:** decide who the tracker is for. If mass market, demote the deal lifecycle behind an
"Advanced / plan a remortgage" disclosure; default path = saved estimate + overpayment
what-if. Consolidate the 3–4 overpayment entry points to one.

---

## P2 — Polish, scalability, accessibility

- No search / sort / filter on Saved (`saved.tsx` is a bare `FlatList`; relevant icons exist
  unused). Fine at 3 items, breaks at 15.
- No onboarding; pin-to-dashboard is undiscoverable.
- Settings thin / missing: theme/dark mode, rate-app, contact/feedback, GDPR consent
  re-management (consent fires once on first launch with no way to revisit — EU compliance
  gap), data management.
- Calculator is generic but assumes a mortgage (Down Payment always shown; save defaults to
  `mortgage`).
- Consistency: `app/saved/[id].tsx` uses raw `<Text>` with ad-hoc styles vs the `AppText`
  design system elsewhere.
- Accessibility: dashboard values rely on `adjustsFontSizeToFit` (shrinks financial figures);
  uppercase `xs` tab labels are small. Needs a dynamic-type pass.

---

## What's working well (keep)

- Results IA (Summary/Charts/Schedule, sticky tabs, fullscreen + landscape chart preview,
  CSV export) is excellent.
- Share flow (web URL for non-users + `loanbee://` deep link) is correctly designed.
- Theme/typography token discipline; coherent, on-brand design language.
- Per-loan currency with a locale-defaulted global is the right model.
- Overpayment what-if with before/after balance chart is the strongest engagement feature —
  lean into this, not the deal lifecycle.

---

## Suggested priority order

1. Fix the non-localised string; delete the dead `recalculate` screen + namespace.
2. Add data export/import (closes the durability risk).
3. Rework the 4-tab IA so the calculator has a permanent home; move About under Settings.
4. Soften the unsaved-result guard and delay the review prompt.
5. Decide the mortgage tracker's audience; collapse duplicate overpayment entry points; gate
   the deal lifecycle behind progressive disclosure.
6. Add scenario comparison as the new headline feature.
7. Saved-list search/sort + a lightweight first-run explainer.
