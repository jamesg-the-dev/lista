# Fix: public holiday penalties (all awards) + MA000119 late-night flat-dollar loading

## What was wrong

1. **No public holiday handling anywhere.** `IAwardRateCalculator.Calculate`
   had no "is this shift on a public holiday" input at all. A shift worked
   on a public holiday priced at ordinary/weekend/night rate instead of the
   award's 225%/250% public holiday rate — a significant underpayment on
   any shift actually worked on one of the ~10 public holidays a year.
2. **MA000119 (Restaurant) Mon-Fri night differential unimplemented.**
   Table 8's 10pm-midnight/midnight-6am rows are a flat dollar addition per
   hour, not a percentage multiplier. `RestaurantIndustryAwardRateCalculator`
   priced those hours at plain ordinary rate — a smaller per-shift gap than
   public holidays but one that hits far more shifts (an ordinary Tuesday
   night close, not a handful of days a year).

## What changed

### Public holiday penalties (all three implemented awards)

- `IAwardRateCalculator.Calculate` gained an `isPublicHoliday` parameter,
  resolved by the caller (not the calculator — it stays a pure function
  with no calendar/repository dependency of its own, same rationale as
  resolving `EmploymentType` outside the calculator). All four call sites
  (`CreateShiftCommand`, `UpdateShiftCommand`, `DuplicateRosterCommand`,
  `ApproveSwapCommand`) now resolve it before calling `Calculate`.
- New `IPublicHolidayCalculationLookup` /
  `PublicHolidayCalculationLookup` (`RosterApp.Application`/
  `Infrastructure.AwardConfig`) resolves this from the venue and shift
  date, reusing the existing system-maintained `PublicHoliday` reference
  data (`RosterApp.Domain.RosterCompliance`) that already backs the
  Settings screen's calendar list — no second data source introduced.
- When `isPublicHoliday` is true, all three calculators short-circuit to a
  single public-holiday line for the whole shift, using
  `rates.GetMultiplier(PenaltyType.PublicHoliday)` via the same
  `AdditivePercentagePoints` casual-stacking `BuildLine` helper every other
  penalty period uses. This overrides Saturday/Sunday/evening routing
  entirely — public holiday is its own column in every award's published
  table, not a variant of the weekend/evening rate, and a public holiday
  can (rarely, via a gazetted substitute day) fall on a weekend.
- `PenaltyType.PublicHoliday` numeric figures flow through the existing
  effective-dated `AwardCalculationRateVersion` mechanism, same as every
  other multiplier — not hardcoded in the calculators. MA000003 and
  MA000119 already had a seeded `2.25m` row (unused until this fix wired a
  consumer for it); MA000009 was missing the row entirely and now has one.

**Citations** (Fair Work Ombudsman official Pay Guides, Award Codes
MA000009/MA000003/MA000119, Effective 01/07/2026, Published 24/06/2026 —
portal.fairwork.gov.au, cross-checked by computing the public-holiday
column as a percentage of the ordinary/casual hourly-rate column for
multiple classifications per award):

| Award | Ordinary → Public holiday (permanent) | Casual ordinary → Casual public holiday |
|---|---|---|
| MA000009 (Level 1 F&B attendant) | $26.44 → $59.49 = **225%** | $33.05 → $66.10 = 200% of casual rate = **250%** of permanent base |
| MA000003 (Level 1) | $27.81 → $62.57 = **225%** | $34.76 → $69.53 = **250%** of permanent base |
| MA000119 (Introductory) | $25.74 → $57.92 = **225%** | $32.18 → $64.35 = **250%** of permanent base |

All three: casual = permanent + 25 points (additive, not compounded),
consistent with `CasualLoadingStackingMode.AdditivePercentagePoints`
already established for Saturday/Sunday in this codebase.

### MA000119 late-night flat-dollar loading

- New `AwardCalculationRates.FlatDollarLoadings` — a dictionary
  **structurally separate** from `PenaltyMultipliers` (own EF table,
  `AwardCalculationRateFlatDollarLoadings`; own domain type,
  `FlatDollarLoading`; own accessor, `GetFlatDollarLoading`) so a
  shared/future helper can't accidentally treat a flat dollar figure as a
  percentage or vice versa — this was an explicit requirement given the
  bug this is fixing was exactly that kind of figure-type confusion
  (treating a dollar addition as if it didn't exist, rather than as if it
  were a multiplier, but the same class of mistake).
- `RestaurantIndustryAwardRateCalculator.BuildWeekdayLines` now splits a
  weekday shift across early-morning/ordinary/late-night windows (same
  greedy clock-time split as `FastFoodIndustryAwardRateCalculator`'s
  three-window approach) and calls a new `BuildFlatDollarLine` helper for
  the two night windows: `ratePerHour = (casual-loaded or plain base rate)
  + flatDollarPerHour`. The addition applies identically to casual and
  permanent employees — confirmed against the Pay Guide's casual table,
  which shows the same "plus $X/hour" figure added on top of the
  already-loaded casual hourly rate, not further loaded itself.
- Boundary handling: a shift can't cross midnight
  (`CreateShiftCommandValidator` requires `End > Start` same calendar day),
  so a shift hits at most one adjacent window pair (early-morning+ordinary,
  or ordinary+late-night), never a genuine wraparound. Covered by tests for
  both boundary crossings.

**Citation** (same FWO Pay Guide as above, MA000119): "Late night - Monday
to Friday - 10pm to midnight" = base rate **plus $2.95/hour**; "Early
morning - Monday to Friday - midnight to 6am" = base rate **plus
$4.42/hour**. This supersedes the prior citation in this codebase
("$2.62"/"$3.93") — those were correct at an earlier wage-review period but
are now stale; the current effective-dated seed row uses the current
figures. Identical dollar figures to MA000009's own evening/night
allowances (see "Flagged" below) — apparently a shared allowance schedule
across the hospitality-family awards.

### Effective-dating

Both the public holiday multiplier and the new flat-dollar figures flow
through `AwardCalculationRateVersion`/`IAwardCalculationRateLookup` exactly
like every existing multiplier — a future wage-review update is a new
seeded version, not a code change. `AwardCalculationRateVersion.Create` and
`AwardReferenceDataSeed.CalculationRateVersionSeed` both gained an optional
`flatDollarLoadings` parameter (defaults to none) so this didn't require
touching every existing call site.

### Regression safety

`IAwardRateCalculatorFactory` routing, the MA000058 Settings-level block,
and all previously-passing tests are untouched and still pass (118 tests
across `RosterApp.Domain.Tests`/`RosterApp.Application.Tests`/
`RosterApp.Infrastructure.Tests`, 0 failures). A new EF Core migration
(`AddPublicHolidayAndFlatDollarLoading`) adds only the new
`AwardCalculationRateFlatDollarLoadings` table — no existing schema
touched.

## Flagged for human review

1. **MA000009's evening/night loading is very likely also a flat-dollar
   figure, not a percentage — a separate, pre-existing bug found while
   verifying the public holiday figures, out of this fix's scope.** The
   same official FWO Pay Guide used above shows MA000009's "Evening -
   Monday to Friday - 7pm to midnight" and "Night work - Monday to Friday
   - midnight to 7am" as **+$2.95/hour** and **+$4.42/hour** flat additions
   — identical figures to MA000119's night differential, structurally the
   same issue this fix just corrected for MA000119. `HospitalityGeneralAwardRateCalculator`
   still models these as percentage multipliers (`EveningAfter7pm` =
   1.10, still marked "NOT verified... illustrative only" from the prior
   audit). This is very likely underpaying every casual/permanent
   employee working a weeknight evening shift under MA000009, which is
   probably the single most common shift pattern in this app's target
   market (small cafes/restaurants). Left unfixed here because it's a
   **structural** change to that calculator (day-window handling +
   flat-dollar wiring, mirroring what this fix just did for MA000119), not
   a numeric-only fix — recommend treating this as the next priority audit,
   same severity class as the two gaps this fix closed.
2. **Venue jurisdiction (state) for public holiday detection.** A venue's
   state comes from `Venue.Address.State`, which is optional — null until
   an owner completes the Venue Profile form. For a venue with no Address,
   `PublicHolidayCalculationLookup` falls back to matching only
   nationally-observed holiday dates (`PublicHoliday.IsNational`), never
   guessing a specific state — the alternative (defaulting to a state, the
   way `RosterRulesTab.tsx`'s own documented TODO already does for the
   Settings screen's calendar *display*) would silently mis-price actual
   pay for any venue really in a different state, which is worse than
   under-detecting a handful of state-only dates (e.g. VIC's Melbourne Cup
   Day) until the venue's Address is set. This is a considered fallback,
   not a guess — but it means a venue that hasn't completed its profile
   will underpay on a state-specific public holiday until it does. Worth
   deciding, as a product question, whether Venue Profile completion
   (specifically Address/State) should become a stronger nudge or
   requirement given it now has real pay-compliance consequences, not just
   a cosmetic Settings-screen gap.
3. **`VenueHolidayOverride` deliberately not consulted for pay pricing.**
   These are owner-added venue-specific closure days (e.g. a private
   event), not gazetted public holidays — award public holiday penalty
   rates apply to legislated public holidays regardless of a venue's own
   trading choices, so folding these into pay-penalty detection would have
   been wrong. Flagged only in case the original intent for
   `VenueHolidayOverride` was actually to affect pay (it currently doesn't
   affect anything except calendar display) — confirm this reading is
   correct if it becomes relevant.
4. Everything already flagged in `CLAUDE.md` § Award compliance and
   `award-calculator-routing-fix.md` remains true and unaffected by this
   fix: MA000058 (Clubs) is still unimplemented/blocked, MA000003/MA000119
   Sunday still doesn't split by classification, `AwardConfiguration`'s
   venue-level overrides are still unconsumed by any calculator.
