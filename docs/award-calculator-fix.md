# Fix: award calculator routing + missing calculator implementations

## Context

Following the casual-loading audit, two related bugs were flagged and need fixing together — this is legally/financially critical, treat it accordingly:

**Bug 1 — global calculator routing.** DI currently wires a single global `IAwardRateCalculator`, so every venue is priced under MA000009 (Hospitality) rules regardless of which award is actually configured for that venue in Settings. Any venue configured for Fast Food, Clubs, or Restaurant is currently being priced under the wrong award's rules in production. This needs to resolve the correct calculator per venue, per shift, based on the venue's configured `awardCode` — not a single injected instance.

**Bug 2 — missing calculators.** Fast Food (MA000003), Clubs (MA000058), and Restaurant (MA000119) are all selectable in Settings but have no calculator implementation behind them. This is only non-catastrophic today because of Bug 1 (everything silently falls through to Hospitality math). Fixing Bug 1 without fixing Bug 2 would make things worse — venues would move from "wrong award's rules" to "no calculator exists, likely a crash or a zero/garbage rate." These must ship together.

Known state from the prior audit:
- **MA000009 (Hospitality):** working calculator, casual loading verified against clause 11.1 and Table 14, evening/public holiday multipliers still unconfirmed against the award.
- **MA000003 (Fast Food):** casual loading stacking mode independently cross-checked as additive (matches MA000009's pattern), full calculator not yet built.
- **MA000119 (Restaurant):** high-confidence but not independently Note-confirmed.
- **MA000058 (Clubs):** stacking mode genuinely unresolved — sources conflicted. A `CasualLoadingStackingMode.Unverified` enum value exists specifically to block this from shipping until resolved.

## What I need you to do

### 1. Fix the routing bug
Replace the single global `IAwardRateCalculator` registration with per-award resolution — e.g. a factory/resolver (`IAwardRateCalculatorFactory` or keyed DI registration) that resolves the correct calculator from the venue's configured `awardCode` at the point of calculation, for every call site (`CreateShiftCommand`, `UpdateShiftCommand`, `DuplicateRosterCommand`, `ApproveSwapCommand`, and any others you find). Don't assume those four are the only call sites — search for every place `IAwardRateCalculator` is currently injected or resolved.

### 2. Implement the missing calculators — with a hard gate on unverified ones
Build calculators for MA000003 (Fast Food) and MA000119 (Restaurant), following the same standard as MA000009: primary-source verification against the Fair Work Ombudsman award text, clause/table citations in code, worked-example tests tied to those citations.

For MA000058 (Clubs): do **not** ship a calculator that guesses at the stacking mode. Either resolve the conflict against the primary source with enough confidence to cite a clause, or leave it unimplemented — but if it's left unimplemented, MA000058 must be **blocked from selection in venue Settings** (not just missing a calculator silently). A venue should never be able to select an award that has no verified calculator behind it. Same rule going forward for any award in this state.

### 3. Maintainability architecture — this is the part I most need you to think hard about
The current shape (rates and structure both hardcoded per calculator class) works but every award update means a code change + deploy. I want you to evaluate three options and pick one, with reasoning, rather than defaulting to the easiest:

- **(a) Pure DB config table** — rate percentages/thresholds editable directly in the database. Fast to edit, but loses compile-time safety, git review history on legally-sensitive numbers, and the tight coupling between a test citing a clause number and the logic it verifies. Consider whether this is acceptable given these are legal minimums, not preferences.
- **(b) Pure code constants per award** — safest and most reviewable, but every wage-review update (rates change annually, effective the first full pay period on or after 1 July) requires a code change and deploy timed exactly right, and back-dated/forward-dated rate lookups (a shift from before this year's 1 July change should price at last year's rate) get awkward.
- **(c) Hybrid** — calculation *structure* (stacking mode, which penalty table applies to which day/classification/employment type) stays in code, versioned and tested per award. The *numeric values* that change on the annual wage review (percentages, dollar figures) live in a small **effective-dated** store (this can still be a DB table, or a versioned config file — your call) keyed by award + effective date, so a shift is priced using whichever rate version was in force on the date it was worked, and updating this year's numbers doesn't touch calculation code.

Pick the option that best balances "a non-engineer or a future me can find and update a number without spelunking through calculator classes" against "we don't lose the audit trail and type safety this domain needs." Justify your choice in the summary. Whatever you choose, keep per-award logic in **separate, clearly named files** (one calculator class per award, not one giant switch statement) — this was explicitly requested and should not be compromised for the sake of the config approach.

### 4. Tests
Extend the existing worked-example test pattern (see `HospitalityGeneralAwardRateCalculatorTests.cs`) to the new calculators. If you land on effective-dated rates, add a test proving a shift worked before a rate change prices at the old rate and one after prices at the new rate.

### 5. Don't regress what's already fixed
Keep the `EmploymentType` resolution via `IStaffLookup` (server-side, not client-supplied) and the swap-approval fix (`ApproveSwapCommand` pricing under the incoming employee's classification) intact through this refactor.

### 6. Flag uncertainty explicitly
If you can't resolve MA000058's stacking mode with confidence, say so plainly and confirm it's blocked in Settings rather than silently shipping a guess. Same for MA000119 if the "not independently Note-confirmed" status can't be upgraded.

## Deliverable
Summary of: which architecture option you chose and why, what changed, clause citations for any newly-verified awards, confirmation that unverified awards are blocked at the Settings level, and anything still flagged for human review.