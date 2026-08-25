# Fix: award calculator routing + missing calculator implementations

## What was wrong

1. **Routing bug.** `DependencyInjection.cs` registered a single global
   `IAwardRateCalculator` → `HospitalityGeneralAwardRateCalculator`. Every
   `CreateShiftCommand`, `UpdateShiftCommand`, `DuplicateRosterCommand`, and
   `ApproveSwapCommand` call priced every shift under MA000009 regardless of
   the venue's configured award.
2. **Missing calculators.** MA000003 (Fast Food) and MA000119 (Restaurant)
   were selectable in Settings (`GetAvailableAwardsQuery`) with no
   calculator behind them at all; MA000058 (Clubs) likewise, with its
   casual-loading stacking mode unresolved (`CasualLoadingStackingMode.Unverified`).

## What changed

### Routing

- `IAwardRateCalculatorFactory` (`RosterApp.Application.Rostering`) resolves
  the calculator from a venue's `AwardConfiguration.AwardId`
  (`AwardRateCalculatorFactory` in Infrastructure). Defaults to Hospitality
  when a venue has never configured an award (preserves prior behaviour for
  unconfigured venues) and throws `NotSupportedException` for an award with
  no verified calculator.
- All four call sites (`CreateShiftCommand`, `UpdateShiftCommand`,
  `DuplicateRosterCommand`, `ApproveSwapCommand`) now resolve
  `IAwardConfigurationLookup.GetActiveAsync(venueId)` → `AwardId` →
  `IAwardRateCalculatorFactory.GetCalculator(awardId)` instead of injecting
  a single calculator directly.

### Architecture: hybrid (structure in code, numbers in data)

Evaluated three options (per the brief): pure DB config, pure code
constants, or a hybrid. **Chose hybrid.** Rationale:

- Award **structure** — which day/time window maps to which `PenaltyType`,
  the evening/night boundaries, how casual loading stacks with a penalty
  multiplier (`CasualLoadingStackingMode`) — is a legally-structural fact
  about a specific Modern Award. It changes only if the award itself is
  restructured (rare), needs to be reviewable against the clause it
  implements, and benefits from compile-time typing and git blame/PR
  review on legally-sensitive logic. This stays hardcoded, one class per
  award, in `RosterApp.Infrastructure.AwardCalculator`.
- The **numbers** — casual loading percentage, penalty multipliers — change
  on the annual wage review (effective the first full pay period on or
  after 1 July) and need effective-dating so a shift worked before a
  change prices at the old rate. A pure-code-constants approach makes this
  a deploy-timed-exactly-right problem; a pure-DB-config approach loses the
  audit trail on legally-sensitive figures. The hybrid keeps the numbers in
  a small effective-dated table (`AwardCalculationRateVersion`), separate
  from the code that interprets them.
- This mirrors a decision the codebase had already half-made:
  `AwardConfiguration` (venue config) and `AwardRate` (classification base
  rates) are both already effective-dated tables. `AwardCalculationRateVersion`
  extends the same pattern to the figures `IAwardRateCalculator` actually
  consumes, which neither existing table covered — `AwardRate` is
  classification-scoped (base $ rates, a different subsystem not yet wired
  to shift pricing at all) and its `PenaltyMultipliers` are decorative
  reference data for the Settings UI, not consumed by any calculator.

New pieces:

- `RosterApp.Domain.AwardConfig.AwardCalculationRateVersion` — one row per
  award per effective period (casual loading %, `PenaltyMultipliers`).
  `SelectEffectiveAsOf` is a pure, unit-tested static resolver (no DB
  dependency) that a shift's date runs through.
- `RosterApp.Domain.AwardConfig.AwardCalculationRates` — the plain value
  object (`CasualLoadingPercent` + `PenaltyMultipliers` dictionary) an
  `IAwardRateCalculator` implementation actually consumes.
- `IAwardCalculationRateLookup` (Application) /
  `AwardCalculationRateLookup` (Infrastructure) — fetches the rows for an
  award and resolves the version in force on a shift's date.
- `IAwardRateCalculator.Calculate` gained a `rates` parameter. Each
  calculator stays a pure function (shift inputs + `EmploymentType` +
  `rates` → breakdown lines) with no repository dependency of its own,
  matching `IRosterComplianceValidator`'s existing pattern.
- Seeded via `AwardReferenceDataSeeder` alongside the existing
  `AwardDefinition`/`AwardRate` seed data, migration
  `AddAwardCalculationRateVersion`.

Per-award logic stays in **separate files**, as required:
`HospitalityGeneralAwardRateCalculator.cs`,
`FastFoodIndustryAwardRateCalculator.cs`,
`RestaurantIndustryAwardRateCalculator.cs`.

### New calculators

**MA000003 (Fast Food Industry Award) — `FastFoodIndustryAwardRateCalculator`.**
Verified against the Fair Work Ombudsman's published MA000003 text (this
confirms the prior casual-loading audit's citations):

- Clause 11.2(b): casual loading 25% of the minimum hourly rate.
- Table 6 (permanent → casual): Mon-Fri 6am-10pm 100%→125%; Mon-Fri
  10pm-midnight 110%→135%; Mon-Fri midnight-6am 115%→140%; Saturday (any
  time) 125%→150%; Public holiday (any time) 225%→250%. Note 1 under
  Table 6 confirms every casual figure = permanent + 25 points
  (`CasualLoadingStackingMode.AdditivePercentagePoints`).
- **Known approximation:** Table 6 splits Sunday by classification —
  Level 1 125%→150%, Level 2-3 150%→175%. `IAwardRateCalculator.Calculate`
  has no classification-level input (Shift/StaffMember don't carry
  `AwardClassificationDefinition` yet), so the calculator always applies
  the Level 2-3 (higher) figure. This overpays a Level 1 employee relative
  to the award minimum, never underpays — flagged for human review;
  resolving it precisely requires threading classification through Shift
  pricing, a larger change than this fix's scope.
- Public holiday penalty is cited but **not implemented** —
  `Calculate` has no "is this shift on a public holiday" input at all
  (same pre-existing gap `HospitalityGeneralAwardRateCalculator` has).

**MA000119 (Restaurant Industry Award) — `RestaurantIndustryAwardRateCalculator`.**
Verified against the Fair Work Commission's consolidated MA000119 text,
clause 24.2 and Table 8 (obtained via the FWC document library after the
Fair Work Ombudsman's own page truncated before Part 5 in automated
fetches — full Table 8 text confirmed directly). This **upgrades** the
"not independently Note-confirmed" status noted in CLAUDE.md:

- Clause 11.1: casual loading 25% of the minimum hourly rate, for each
  hour worked.
- Table 8: Mon-Fri 6am-10pm 100%→125% (both classification columns
  agree); Saturday 125%→150% (both columns agree); public holiday
  225%→250% (both columns agree, cited but not applied — same interface
  gap as above).
- **Known approximation:** Sunday is where MA000119 genuinely differs from
  MA000009/MA000003's pattern — Table 8's "Introductory to Level 2" casual
  column is 150% (**no additional loading** over the 150% permanent rate),
  while "Level 3 to Level 6" is 175% (permanent + 25 points, the usual
  additive pattern). The calculator derives casual Sunday pay via the same
  additive formula as every other period, which happens to equal the
  Level 3-6 column — i.e. it applies 175% universally. Same safe-direction
  reasoning and same flag for human review as MA000003's Sunday
  approximation above.
- **Not implemented:** the Mon-Fri 10pm-midnight and midnight-6am rows are
  a **flat dollar addition** ("100% plus $2.62/hour", "100% plus
  $3.93/hour" at time of citation) layered on top of the percentage — a
  structurally different figure type from every percentage multiplier
  this calculator (and `AwardCalculationRates`) models. Those hours are
  currently priced at the plain ordinary rate, which **understates** the
  award minimum for that window. Flagged for human review rather than
  guessed at; not shipped as a silent gap.

**MA000058 (Registered and Licensed Clubs Award).** Left unimplemented, as
instructed — its stacking mode remains genuinely unresolved
(`CasualLoadingStackingMode.Unverified`) and this fix did not attempt to
resolve it. It is now actively **blocked from selection**, not just
silently mispriced:
- `GetAvailableAwardsQueryHandler` filters the Settings dropdown to only
  awards `IAwardRateCalculatorFactory.IsSupported` returns true for.
- `UpdateAwardConfigurationCommandValidator` independently rejects it
  server-side (defense in depth against a client bypassing the UI).
- `AwardRateCalculatorFactory.GetCalculator` throws a clear
  `NotSupportedException` if ever reached anyway.

## Tests

- `AwardCalculationRateVersionTests` (Domain) — proves the effective-date
  resolver picks the old version before a rate change and the new version
  on/after it, using synthetic percentages (not real award figures, to
  avoid the test doubling as a false record of a historical rate that was
  never actually seeded).
- `HospitalityGeneralAwardRateCalculatorTests` — updated for the new
  `rates` parameter (all prior assertions unchanged), plus a new test
  proving the calculator is driven by the supplied rates rather than a
  compile-time constant.
- `FastFoodIndustryAwardRateCalculatorTests`,
  `RestaurantIndustryAwardRateCalculatorTests` — worked examples per the
  citations above, including explicit tests documenting both "known
  approximation" Sunday behaviours and the Restaurant night-differential
  gap.
- `AwardRateCalculatorFactoryTests` — routing per award id, null defaults
  to Hospitality, MA000058/unknown ids throw.

## Flagged for human review

1. **Sunday classification-level splits** (MA000003, MA000119): both
   awards' Sunday figures vary by classification, which this MVP can't
   represent (no classification on Shift/StaffMember yet). Currently
   resolved by always using the higher/safer figure — confirm this is an
   acceptable interim approximation, and prioritise threading
   classification through Shift pricing if not.
2. **MA000119 night differential** (10pm-6am): a flat-dollar addition, not
   implemented at all. Hours in this window are currently underpriced
   relative to the award minimum for any venue on this award working
   those hours.
3. **MA000058 (Clubs)**: still unresolved and blocked from selection, as
   before this fix — no change in status, still flagged.
4. **Public holiday penalties** (all three implemented awards): cited in
   each calculator's doc comment but not applied anywhere —
   `IAwardRateCalculator.Calculate` has no "is this a public holiday"
   input. Pre-existing gap, not introduced by this fix, but now confirmed
   to apply to all three awards rather than just MA000009.
5. **`AwardConfiguration.CasualLoadingPercent`/`PenaltyToggles` are still
   not consumed by any calculator.** Venues can already record a
   custom casual-loading percentage and per-penalty-type toggles in
   Settings, but every calculator prices using its own
   `AwardCalculationRateVersion` figures regardless of what a venue has
   configured. This is a pre-existing gap (not introduced by this fix,
   and out of this fix's stated scope), but worth flagging since it means
   the Settings screen currently captures data with no functional effect
   on pricing.
