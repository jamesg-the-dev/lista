# Audit & fix: casual loading calculation logic across Modern Awards

## Context

This is a legal compliance issue, not a cosmetic bug — getting this wrong means the app calculates underpayments or overpayments under Australian Modern Awards, which is a wage-theft/compliance risk for every venue using it. Treat this as high priority and do not guess or assume anything you haven't verified against the official award text.

We have a pluggable `IAwardRateCalculator` interface (per the domain architecture in this repo) currently backing four awards:

- MA000003 — Fast Food Industry Award
- MA000009 — Hospitality Industry (General) Award
- MA000058 — Registered and Licensed Clubs Award
- MA000119 — Restaurant Industry Award

The seed/reference data currently has `minimumCasualLoadingPercent: 25` set only for MA000009, with `null` for the other three. Preliminary research (not yet verified against the primary source) suggests all four awards actually carry a 25% casual loading — the `null`s look wrong — **but more importantly, the four awards appear to apply that loading in structurally different ways**, and that's the part most likely to cause real payroll errors:

- **MA000003 (Fast Food)** and **MA000119 (Restaurant)**: casual loading appears to be *baked into* the casual penalty rate percentages themselves (e.g. Saturday is 125% for full-time/part-time vs 150% for casual — the loading is the gap between them, not an addition on top).
- **MA000058 (Clubs)**: casual loading appears to be *additive* — the award states weekend/public holiday loadings apply to "all employees" at flat percentages, with the 25% casual loading then stacked on top separately.
- **MA000009 (Hospitality)**: not yet verified at all — needs the same scrutiny as the others, don't assume the current `25` value or its stacking behavior is correct just because it's already populated.

## What I need you to do

### 1. Verify against the primary source
Pull the actual award text from the Fair Work Commission / Fair Work Ombudsman (awards.fairwork.gov.au or fwc.gov.au) for all four awards — MA000003, MA000009, MA000058, MA000119. Do not rely on payroll-vendor blog summaries as the source of truth; use them at most as a cross-check. For each award, find and cite the specific clause number(s) that establish:
- the casual loading percentage
- whether that loading is expressed as a flat addition to the base rate that then has penalty multipliers applied on top, or whether it's already folded into a separate casual penalty rate table

### 2. Audit the current implementation
Find every place `minimumCasualLoadingPercent` (or equivalent) is consumed in `IAwardRateCalculator` and its implementations. Trace through how a casual employee's pay is actually calculated for a shift that falls on a penalty-rate period (weekend, public holiday, evening/night loading). Determine whether the current logic would double-count, under-count, or correctly apply the loading for each award, based on what you find in step 1.

### 3. Fix whatever is wrong
If the calculation logic is incorrect for any award, fix it. If the seed data (`null` values, or the MA000009 figure) is wrong, fix that too.

### 4. Architecture — think, don't just execute
Don't assume the fix is "add a field and branch on it." Actually reason about the right shape given that:
- We'll likely add more awards over time
- Each award's rules (loading stacking behavior, penalty rate structure, junior rates, allowances) can differ in ways we haven't fully mapped yet
- This needs to stay auditable — someone should be able to open the code and verify it against the award clause without archaeology

Consider whether per-award strategy classes (one implementation of `IAwardRateCalculator` per award, in separate files) is cleaner than a single calculator with a growing pile of conditional flags — or whether a shared base calculator with an injected, per-award "stacking rule" object is better. Use your judgement on OOP best practices and maintainability; separate files per award/rule are completely fine if that's the right call, but don't over-engineer if a simpler shared structure handles it just as clearly. Whatever you land on, make the stacking behavior an explicit, named concept in the code (e.g. a `CasualLoadingStackingMode` enum or a small strategy interface) rather than an implicit assumption buried in arithmetic.

### 5. Tests
Add test cases with concrete worked examples per award (base rate → expected casual Saturday/Sunday/public holiday rate), sourced from the clause numbers you cited in step 1, so the tests double as documentation of *why* the numbers are what they are.

### 6. Flag uncertainty explicitly
If you can't fully verify a clause, or an award's wording is genuinely ambiguous about stacking behavior, don't silently pick an interpretation — flag it clearly in your output so we can get it checked before it ships. Also note in comments/docs that award percentages and dollar figures are reviewed annually (effective first full pay period on or after 1 July each year) so this isn't a "set and forget" dataset.

## Deliverable
A short summary of: what was wrong (if anything), what you changed, the clause citations backing each award's stacking behavior, and any items you're not fully confident in and want a human to double check.