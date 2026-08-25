# Fix: public holiday penalties (all awards) + MA000119 late-night flat-dollar loading

## Context

Following the award routing/calculator fix, two gaps were flagged as live underpayment risks rather than theoretical ones — these are the next priority, before the lower-urgency items (Sunday classification splitting, unconsumed venue Settings overrides).

**Gap 1 — no public holiday handling at all, across every award.** There is currently no concept of "this shift falls on a public holiday" anywhere in the calculation path. Public holiday rates under these awards are typically 150–225%+ depending on award and employment type — any shift actually worked on a public holiday is currently priced at ordinary or weekend rate instead, which is a significant underpayment. This affects MA000003, MA000009, and MA000119 (MA000058 remains blocked from selection, so out of scope until it's unblocked).

**Gap 2 — MA000119 (Restaurant) Mon–Fri 10pm–6am loading.** The primary source expresses this as a flat dollar addition per hour, not a percentage multiplier. It's currently unimplemented, so those hours price at plain ordinary rate. This is a smaller per-shift gap than public holidays but likely hits more shifts, more often, since it's an ordinary weeknight scenario rather than a handful of days a year.

## What I need you to do

### 1. Public holiday penalties
- Verify each award's public holiday penalty rate (full-time/part-time and casual, where they differ) against the primary source (Fair Work Ombudsman/FWC published text), citing clause/table numbers, same standard as the existing calculators.
- Add whatever input is needed to determine "is this shift's date a public holiday" — likely a date-based lookup against a public holiday calendar (national + relevant state/territory, since these can vary by jurisdiction and this app spans multiple venues/locations). Check whether the codebase already has any public holiday data source or reference before building a new one from scratch.
- Wire this into `HospitalityGeneralAwardRateCalculator`, `FastFoodIndustryAwardRateCalculator`, and `RestaurantIndustryAwardRateCalculator` so a shift on a public holiday resolves to the correct penalty rate instead of falling through to ordinary/weekend rate.
- Numeric values (the percentages themselves) should go through the same effective-dated `AwardCalculationRateVersion` mechanism already built, not get hardcoded separately — keep this consistent with the pattern just established.
- Add worked-example tests per award, citing the clause, same pattern as the existing test suites.

### 2. MA000119 late-night flat-dollar loading
- Confirm the exact dollar figure and the precise window (Mon–Fri 10pm–6am, confirm start/end boundary handling for shifts that cross midnight or straddle the window) against the primary source.
- Implement it as a flat addition per hour worked in that window, not a percentage — make sure this is structurally distinct in the code from the percentage-based penalty multipliers so it can't accidentally get treated as a % by a future change or a shared helper.
- This is also a wage-review-sensitive figure, so it should go through the same effective-dated rate mechanism, not a hardcoded constant.
- Add worked-example tests, including a shift that straddles the window boundary and one that crosses midnight if that's a real scenario in this codebase.

### 3. Don't regress what's already fixed
Keep the existing routing (`IAwardRateCalculatorFactory`), the MA000058 Settings-level block, and all currently-passing tests intact. If either of these two fixes touches the calculator interface signature (e.g. adding a public-holiday flag or date-derived input), update all call sites and confirm nothing silently defaults to a wrong assumption.

### 4. Flag uncertainty explicitly
If the public holiday calendar/jurisdiction question turns out to be more involved than a simple lookup (e.g. this app needs to know which state/territory each venue is in and doesn't currently model that), stop and flag it rather than guessing at a simplification — don't ship a "national holidays only" version silently if state-specific holidays are actually relevant to real venues using this app. Same standard as before: cite what you verified, flag what you couldn't confirm, don't guess on ambiguous award wording.

## Deliverable
Summary of: what changed, clause citations for the public holiday rates and the late-night loading figure, how public holiday dates are being sourced/determined, confirmation that both flow through the effective-dated rate mechanism, and anything still flagged for human review (including whether venue jurisdiction/state needs to be modeled for this to be fully correct).