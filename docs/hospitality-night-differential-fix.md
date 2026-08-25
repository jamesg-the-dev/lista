# Fix: MA000009 (Hospitality) evening/night loading — percentage vs flat-dollar

## What was wrong

**MA000009's weekday evening/night loading was modelled as a percentage
multiplier when the award actually specifies a flat dollar addition per
hour.** This was flagged (not fixed) during the public-holiday audit — see
`public-holiday-and-night-differential-fix.md` "Flagged for human review"
§1 — as the same class of bug just fixed for MA000119 (Restaurant), but out
of that fix's scope. `HospitalityGeneralAwardRateCalculator` priced any
weekday shift ending after 7pm at `baseRate × 1.10` (a 10% loading) for the
whole post-7pm portion, and had no concept of a separate midnight-7am night
window at all — a shift starting at, say, 2am priced as plain ordinary
hours. Both of these were wrong on the primary source, and unlike public
holidays (a handful of days a year), a weeknight evening/early-morning
shift is one of the most common shift patterns in this app's target market
(small cafes/restaurants) — this was very likely the single largest,
highest-frequency underpayment bug in the codebase to date, present since
this calculator was first built.

## What changed

### Calculator: percentage multiplier → flat-dollar, single window → three windows

`HospitalityGeneralAwardRateCalculator` now follows the exact pattern
`RestaurantIndustryAwardRateCalculator` established for MA000119's night
differential:

- `BuildWeekdayLines` splits a weekday shift's paid minutes across three
  windows in chronological order from the shift's start (same greedy
  clock-time-first-then-cap-to-remaining-paid-minutes approach as the other
  two calculators' three-window splits):
  - **Night work**: midnight–7am, flat dollar (`PenaltyType.EarlyMorningBefore7am`)
  - **Ordinary hours**: 7am–7pm, no loading
  - **Weekday evening**: 7pm–midnight, flat dollar (`PenaltyType.EveningAfter7pm`)
- The two night windows are priced via the existing `BuildFlatDollarLine`
  helper (new to this calculator, ported unchanged from
  `RestaurantIndustryAwardRateCalculator`): `ratePerHour = (casual-loaded
  or plain base rate) + flatDollarPerHour`. The flat addition applies
  identically to casual and permanent employees, sitting on top of
  whichever base rate already applies — confirmed against the Pay Guide's
  casual table, which shows the same "plus $X/hour" figure added on top of
  the already-loaded casual hourly rate, not further loaded itself.
- The old single `EveningBoundary = 19:00` / two-window
  (ordinary-then-evening) structure and its percentage-multiplier call
  (`rates.GetMultiplier(PenaltyType.EveningAfter7pm)`) are gone entirely —
  this was a structural fix, not a numeric-only one, per the scope note in
  the original "Flagged" entry.
- Boundary handling: a shift can't cross midnight
  (`CreateShiftCommandValidator` requires `End > Start` same calendar
  day), so a shift hits at most one adjacent window pair (night+ordinary,
  or ordinary+evening), never a genuine wraparound. Covered by boundary-
  straddle tests for both crossings.

**Note MA000009's window boundaries differ from MA000119's**: evening is
7pm–midnight and night is midnight–7am for MA000009, vs 10pm–midnight and
midnight–6am for MA000119. The boundary constants were set independently
per award rather than reused, per the primary-source citation below.

**Citation** (Fair Work Ombudsman official Pay Guide, Award Code
MA000009, Effective 01/07/2026, Published 24/06/2026,
portal.fairwork.gov.au — cross-checked by fetching the PDF directly):

| Column | Time window | Figure |
|---|---|---|
| Evening — Monday to Friday | 7pm to midnight | base rate **plus $2.95/hour** |
| Night work — Monday to Friday | midnight to 7am | base rate **plus $4.42/hour** |

Confirmed as a flat-dollar addition, not a percentage, by checking the
figure against multiple classification rows (e.g. Level 1 food and
beverage attendant: base $26.44/hr → evening "$26.44 per hour plus
$2.95 per hour" — an identical $2.95 addition regardless of the
classification's base rate, which a percentage multiplier could not
produce). Identical dollar figures to MA000119's own night differential
(same allowance schedule shared across the hospitality-family awards),
but MA000009's own time windows are distinct from MA000119's — see table
above. Applies identically to casual and permanent employees, confirmed
against the Pay Guide's separate casual table showing the same "plus
$X/hour" wording on top of the already-loaded casual hourly rate.

### Numeric values flow through the existing effective-dated mechanism

`AwardReferenceDataSeed.CalculationRateVersions`'s MA000009 row: removed
`(PenaltyType.EveningAfter7pm, 1.10m)` from its `PenaltyMultipliers` list
and added a `FlatDollarLoadings` list —
`(PenaltyType.EveningAfter7pm, 2.95m)`,
`(PenaltyType.EarlyMorningBefore7am, 4.42m)` — using the same optional
`flatDollarLoadings` constructor parameter on `CalculationRateVersionSeed`
that MA000119's row already used. No new mechanism was introduced; a
future wage-review update to these figures is a new seeded
`AwardCalculationRateVersion`, not a code change, exactly like every other
award figure in this codebase.

### Settings UI decorative reference data corrected too

`AwardReferenceDataSeed.HospitalityGeneralPenaltyMultipliers` — a separate,
decorative structure (backing `AwardRate`/`PenaltyMultiplier`) used only to
display reference figures in the Settings UI, not consumed by the
calculator — also carried the same wrong `EveningAfter7pm = 1.10m` /
`EarlyMorningBefore7am = 1.15m` figures. These are now removed from that
list entirely rather than corrected to a flat-dollar figure, because
`AwardRate`/`PenaltyMultiplier` has no flat-dollar concept to express them
correctly — see "Flagged for human review" below.

### Frontend shift-editor preview corrected to match

`frontend/app/routes/roster/types.ts`'s `getRateInfo` — the client-side,
pre-save shift-cost preview used by `ShiftEditorPanel.tsx` — had
independently hardcoded the identical bug (`multiplier = 1.1`, "Weekday
evening loading +10%") specifically so the preview wouldn't visibly
diverge from what the server computes on save. Left unfixed, this fix
would have made that comment false and produced a real UI regression: a
manager would see one (now-wrong) figure while building a shift and a
different (now-correct) figure once saved. Updated `RateInfo` to carry a
`flatDollarPerHour` field alongside the existing `multiplier` (kept
structurally separate, mirroring the backend's own separate
`PenaltyMultipliers`/`FlatDollarLoadings` dictionaries so the two figure
types can't be silently conflated here either), added the missing
midnight-7am night-work case, and updated `ShiftEditorPanel.tsx`'s
breakdown line to render `+$2.95/hr` instead of `×1.10` when a flat-dollar
loading applies. This preview remains a deliberate single-heuristic
simplification (picks one loading type from the shift's start/end time
rather than itemising a multi-window split, and doesn't apply casual
loading at all) — that pre-existing limitation is unchanged by this fix,
only the loading-type bug it independently duplicated.

### Regression safety

All 56 `RosterApp.Infrastructure.Tests` AwardCalculator tests pass (11 of
them new or rewritten for this fix — see below), and the full backend
suite (123 tests across `RosterApp.Domain.Tests`/
`RosterApp.Application.Tests`/`RosterApp.Infrastructure.Tests`) passes
with 0 failures. No schema change was needed — the
`AwardCalculationRateFlatDollarLoadings` table already exists from the
MA000119 fix, so this is a data-only change plus the calculator rewrite.

## Tests

`HospitalityGeneralAwardRateCalculatorTests.cs`: the `Rates` fixture moved
`EveningAfter7pm` out of `PenaltyMultipliers` into a new
`FlatDollarLoadings` dictionary (adding `EarlyMorningBefore7am` there too).
The one existing test asserting the old percentage-based evening behavior
(`Calculate_WeekdayEveningSplit_Casual_AppliesLoadingToBothOrdinaryAndEveningPortions`,
asserting `$20 × (1.10 + 0.25) = $27.00`) was replaced — it was locked to
the wrong answer. New/replacement tests, mirroring
`RestaurantIndustryAwardRateCalculatorTests.cs`'s pattern:

- `Calculate_WeekdayEveningHours_FullTime_AddsFlatDollarLoading_NotAPercentage`
  — asserts `$22.95` (`$20.00 + $2.95`), not a multiplier result.
- `Calculate_WeekdayEveningHours_Casual_FlatLoadingSitsOnTopOfTheLoadedBaseRate`
  — asserts `$27.95` (`$20 × 1.25 + $2.95`).
- `Calculate_WeekdayNightWorkHours_FullTime_AddsFlatDollarLoading` —
  asserts `$24.42` (`$20.00 + $4.42`) for a 2am-4am shift, proving the
  previously-missing night window now exists.
- `Calculate_ShiftStraddlesEveningBoundary_FullTime_SplitsOrdinaryAndEveningPortions`
  and `Calculate_ShiftStraddlesNightWorkIntoOrdinaryBoundary_FullTime_SplitsBothPortions`
  — boundary-crossing coverage for both window pairs.
- `Calculate_PublicHoliday_OverridesEveningDifferential` — a shift starting
  at 7pm on a public holiday prices at the public holiday rate for the
  whole shift, not the flat-dollar evening addition, confirming the two
  penalty types don't stack.

## Scope check: MA000003 (Fast Food) re-verified, confirmed correct as-is

Given the same percentage-vs-flat-dollar pattern has now been found in two
of three implemented awards (MA000119, then MA000009), MA000003's own
evening/night loading was independently re-checked against its own FWO Pay
Guide (Award Code MA000003, Effective 01/07/2026), even though it wasn't
flagged.

**Result: MA000003 is genuinely percentage-based and does NOT need
changing.** Unlike MA000009/MA000119's Pay Guide tables (which show
"$X per hour plus $Y per hour", a base-plus-addition wording), MA000003's
Pay Guide shows plain full dollar figures for its evening/night columns —
e.g. Level 1 full-time: base $27.81/hr, "Evening work — Monday to Friday —
10pm to midnight" $30.59/hr, "Evening work — Monday to Friday — midnight
to 6am" $31.98/hr. Dividing out: $30.59 / $27.81 = 1.10 (110%) and
$31.98 / $27.81 = 1.15 (115%) — consistent multipliers across every
classification row checked, exactly matching
`FastFoodIndustryAwardRateCalculator`'s existing `PenaltyMultipliers`
figures (`EarlyMorningBefore7am` = 1.15, `EveningAfter7pm` = 1.10). No
further audit of this award's night differential should be needed unless
a future wage review changes its structure, not just its numbers.

## Flagged for human review

1. **`AwardRate`/`PenaltyMultiplier` has no flat-dollar concept.** The
   Settings UI's decorative reference-data structure (distinct from the
   `AwardCalculationRateVersion`/`FlatDollarLoadings` the calculator
   actually consumes) can only express percentage multipliers. This fix
   removed the now-provably-wrong `EveningAfter7pm`/`EarlyMorningBefore7am`
   percentage entries from `HospitalityGeneralPenaltyMultipliers` rather
   than "fixing" them to a wrong figure type, but that leaves Settings
   silently omitting these two loadings from its display rather than
   showing them correctly. Closing this gap needs a flat-dollar
   counterpart on `AwardRate`, mirroring
   `AwardCalculationRates.FlatDollarLoadings` — out of scope for this fix,
   flagged as a follow-up UI/reference-data enhancement, not a pay-
   compliance risk (the Settings UI is display-only; it doesn't feed the
   calculator).
2. **Frontend preview (`getRateInfo`) remains a deliberate
   simplification, now numerically closer but still not itemised.** This
   fix corrected the loading *type* (flat-dollar vs percentage) and added
   the missing night-work case, but the preview still picks a single
   loading for the whole shift from a start/end-time heuristic rather than
   splitting a shift that spans multiple windows (e.g. 5pm–9pm) the way
   the real backend calculator now does, and still doesn't apply casual
   loading at all (a pre-existing simplification unrelated to this fix).
   A manager building a shift that straddles the 7pm or 7am boundary will
   see a preview total that doesn't exactly match the saved shift's real
   `awardBreakdown` — same category of gap as before this fix, just no
   longer compounded by the wrong loading type. Worth a dedicated pass if
   preview-accuracy for split shifts becomes a support issue.
3. Everything already flagged in `CLAUDE.md` § Award compliance and
   `public-holiday-and-night-differential-fix.md` remains true and
   unaffected by this fix: MA000058 (Clubs) is still unimplemented/
   blocked, MA000003/MA000119 Sunday still doesn't split by
   classification, `AwardConfiguration`'s venue-level overrides are still
   unconsumed by any calculator, and public holiday jurisdiction still
   falls back to national-only detection for a venue with no Address.
