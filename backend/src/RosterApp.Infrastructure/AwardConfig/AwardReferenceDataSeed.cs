using RosterApp.Domain.AwardConfig;

namespace RosterApp.Infrastructure.AwardConfig;

/// <summary>
/// The fixed ids and figures for MVP's system-maintained award reference
/// data, shared between the idempotent startup seeder
/// (AwardReferenceDataSeeder) and anything else that needs to know these ids
/// (e.g. tests). Kept as one source of truth rather than scattering literal
/// Guids across the seeder — see AwardDefinition for why this data is
/// system-maintained rather than owner-editable.
///
/// Classification names/rates for MA000009 mirror the levels already used
/// by RosterApp.Domain.Staffing.AwardClassification (Introductory..Level6)
/// but are illustrative only — not sourced from Fair Work's Pay Calculator
/// or verified against a licensed award-interpretation feed (see CLAUDE.md
/// § Award compliance). Only MA000009 gets real classification/rate data;
/// the other three awards in the minimum list (see
/// FEATURE_SETTINGS_AWARD_PAY_CONFIG.md §2 AC1) are seeded as
/// selectable entries only, since IAwardRateCalculator doesn't implement
/// them yet.
/// </summary>
public static class AwardReferenceDataSeed
{
    // These four ids are the single source of truth in RosterApp.Domain.AwardConfig.WellKnownAwards
    // (Application-layer code needs to reference them without depending on this Infrastructure project)
    // — aliased here so every existing usage in this file/the seeder keeps working unchanged.
    public static readonly Guid HospitalityGeneralAwardId = WellKnownAwards.HospitalityGeneralAwardId;
    public static readonly Guid RestaurantIndustryAwardId = WellKnownAwards.RestaurantIndustryAwardId;
    public static readonly Guid RegisteredClubsAwardId = WellKnownAwards.RegisteredClubsAwardId;
    public static readonly Guid FastFoodIndustryAwardId = WellKnownAwards.FastFoodIndustryAwardId;

    /// <summary>Effective-from date for every seeded MA000009 rate row — the most recent FWC annual wage review baked into this MVP's illustrative figures.</summary>
    public static readonly DateTime CurrentRatesEffectiveFromUtc = new(2025, 7, 1, 0, 0, 0, DateTimeKind.Utc);

    public sealed record ClassificationSeed(
        Guid ClassificationId,
        Guid RateId,
        string Name,
        decimal BaseHourlyRate);

    /// <summary>MA000009 classifications, ordered Introductory -> Level 6, each with a 25% minimum casual loading (MA000009's standard casual loading) and the MVP's illustrative penalty multipliers.</summary>
    public static readonly IReadOnlyList<ClassificationSeed> HospitalityGeneralClassifications =
    [
        new(new Guid("22222222-0000-0000-0000-000000000001"), new Guid("33333333-0000-0000-0000-000000000001"), "Introductory", 22.50m),
        new(new Guid("22222222-0000-0000-0000-000000000002"), new Guid("33333333-0000-0000-0000-000000000002"), "Level 1", 23.00m),
        new(new Guid("22222222-0000-0000-0000-000000000003"), new Guid("33333333-0000-0000-0000-000000000003"), "Level 2", 23.50m),
        new(new Guid("22222222-0000-0000-0000-000000000004"), new Guid("33333333-0000-0000-0000-000000000004"), "Level 3", 24.30m),
        new(new Guid("22222222-0000-0000-0000-000000000005"), new Guid("33333333-0000-0000-0000-000000000005"), "Level 4", 24.80m),
        new(new Guid("22222222-0000-0000-0000-000000000006"), new Guid("33333333-0000-0000-0000-000000000006"), "Level 5", 25.20m),
        new(new Guid("22222222-0000-0000-0000-000000000007"), new Guid("33333333-0000-0000-0000-000000000007"), "Level 6", 25.85m),
    ];

    public const decimal HospitalityGeneralCasualLoadingPercentMin = 25.00m;

    /// <summary>
    /// Matches HospitalityGeneralAwardRateCalculator's hardcoded MVP
    /// multipliers for Saturday/Sunday/public holiday; seeded here as
    /// reference data for the Settings UI to display via AwardRate (a
    /// separate, decorative structure from CalculationRateVersions above,
    /// not consumed by the calculator). Deliberately excludes
    /// EveningAfter7pm/EarlyMorningBefore7am: those are flat-dollar
    /// additions, not percentage multipliers (see
    /// docs/hospitality-night-differential-fix.md), and AwardRate/
    /// PenaltyMultiplier has no flat-dollar concept to display them
    /// correctly — showing the old 1.10/1.15 figures here would keep
    /// misrepresenting them in Settings even after the calculator fix.
    /// Flagged rather than silently worked around: closing this gap needs a
    /// flat-dollar counterpart on AwardRate, mirroring
    /// AwardCalculationRates.FlatDollarLoadings, which is out of scope for
    /// this fix.
    /// </summary>
    public static readonly IReadOnlyList<(PenaltyType Type, decimal Multiplier)> HospitalityGeneralPenaltyMultipliers =
    [
        (PenaltyType.Saturday, 1.25m),
        (PenaltyType.Sunday, 1.50m),
        (PenaltyType.PublicHoliday, 2.50m),
    ];

    public sealed record CalculationRateVersionSeed(
        Guid VersionId,
        Guid AwardId,
        DateTime EffectiveFromUtc,
        decimal CasualLoadingPercent,
        IReadOnlyList<(PenaltyType Type, decimal Multiplier)> PenaltyMultipliers,
        IReadOnlyList<(PenaltyType Type, decimal DollarPerHour)>? FlatDollarLoadings = null);

    /// <summary>
    /// Seeds AwardCalculationRateVersion — the effective-dated figures
    /// IAwardRateCalculator actually consumes at calculate-time (distinct
    /// from AwardRate.PenaltyMultipliers above, which is decorative
    /// reference data for the Settings UI, not consumed by any calculator).
    /// Every multiplier here is the PERMANENT (full-time/part-time)
    /// figure — casual pay is derived by each calculator via
    /// CasualLoadingStackingMode.AdditivePercentagePoints (permanent +
    /// CasualLoadingPercent points), never stored as a separate casual
    /// figure. See each calculator class's doc comment for the primary
    /// source citations these numbers come from, and
    /// docs/award-calculator-routing-fix.md for the architecture this
    /// enables (a wage-review update becomes a new seeded version, not a
    /// code change).
    /// </summary>
    public static readonly IReadOnlyList<CalculationRateVersionSeed> CalculationRateVersions =
    [
        new(
            new Guid("44444444-0000-0000-0000-000000000001"),
            HospitalityGeneralAwardId,
            CurrentRatesEffectiveFromUtc,
            HospitalityGeneralCasualLoadingPercentMin,
            [
                (PenaltyType.Saturday, 1.25m),
                (PenaltyType.Sunday, 1.50m),
                // Verified against the FWO Pay Guide - Hospitality Industry
                // (General) Award [MA000009], effective 01/07/2026: public
                // holiday $59.49/hr on a $26.44/hr base = 225% (permanent);
                // casual public holiday $66.10/hr on a $33.05/hr casual base
                // = 200% of the casual rate, i.e. 250% of the permanent base
                // (225% + 25 points), matching
                // CasualLoadingStackingMode.AdditivePercentagePoints.
                (PenaltyType.PublicHoliday, 2.25m),
                // No EveningAfter7pm/EarlyMorningBefore7am row here:
                // MA000009's evening/night differential is a flat dollar
                // addition, not a percentage multiplier — see
                // FlatDollarLoadings below. Seeding a percentage figure here
                // would misrepresent it as modelled that way (this is the
                // 2026-08-25 fix for a bug found during the MA000119 night-
                // differential audit — see
                // docs/hospitality-night-differential-fix.md).
            ],
            // Verified against the FWO Pay Guide - Hospitality Industry
            // (General) Award [MA000009], effective 01/07/2026: "Evening -
            // Monday to Friday - 7pm to midnight" = base rate plus
            // $2.95/hour; "Night work - Monday to Friday - midnight to 7am"
            // = base rate plus $4.42/hour. Identical dollar figures to
            // MA000119's night differential (same allowance schedule shared
            // across the hospitality-family awards), but MA000009's own
            // time windows (7pm-midnight / midnight-7am) differ from
            // MA000119's (10pm-midnight / midnight-6am) — see
            // HospitalityGeneralAwardRateCalculator's window boundaries.
            // Applies identically to casual and permanent employees; see
            // HospitalityGeneralAwardRateCalculator.BuildFlatDollarLine.
            [
                (PenaltyType.EveningAfter7pm, 2.95m), // Mon-Fri 7pm-midnight
                (PenaltyType.EarlyMorningBefore7am, 4.42m), // Mon-Fri midnight-7am
            ]),
        new(
            new Guid("44444444-0000-0000-0000-000000000002"),
            FastFoodIndustryAwardId,
            CurrentRatesEffectiveFromUtc,
            25.00m,
            [
                (PenaltyType.Saturday, 1.25m),
                // Level 2-3 figure applied universally — see
                // FastFoodIndustryAwardRateCalculator's "KNOWN APPROXIMATION".
                (PenaltyType.Sunday, 1.50m),
                // Reconfirmed against the FWO Pay Guide - Fast Food Industry
                // Award [MA000003], effective 01/07/2026: Level 1 public
                // holiday $62.57/hr on a $27.81/hr base = 225% (permanent);
                // casual public holiday $69.53/hr on a $34.76/hr casual base
                // = 200% of the casual rate = 250% of the permanent base
                // (225% + 25 points).
                (PenaltyType.PublicHoliday, 2.25m),
                (PenaltyType.EveningAfter7pm, 1.10m), // Mon-Fri 10pm-midnight
                (PenaltyType.EarlyMorningBefore7am, 1.15m), // Mon-Fri midnight-6am
            ]),
        new(
            new Guid("44444444-0000-0000-0000-000000000003"),
            RestaurantIndustryAwardId,
            CurrentRatesEffectiveFromUtc,
            25.00m,
            [
                (PenaltyType.Saturday, 1.25m),
                // Level 3-6 figure applied universally — see
                // RestaurantIndustryAwardRateCalculator's "KNOWN APPROXIMATION".
                (PenaltyType.Sunday, 1.50m),
                // Reconfirmed against the FWO Pay Guide - Restaurant
                // Industry Award [MA000119], effective 01/07/2026:
                // Introductory level public holiday $57.92/hr on a
                // $25.74/hr base = 225% (permanent); casual public holiday
                // $64.35/hr on a $32.18/hr casual base = 200% of the
                // casual rate = 250% of the permanent base (225% + 25
                // points).
                (PenaltyType.PublicHoliday, 2.25m),
                // No EveningAfter7pm/EarlyMorningBefore7am row here: MA000119's
                // night differential is a flat dollar addition, not a
                // percentage multiplier — see FlatDollarLoadings below.
                // Seeding a percentage figure here would misrepresent it as
                // modelled that way.
            ],
            // Verified against the FWO Pay Guide - Restaurant Industry
            // Award [MA000119], effective 01/07/2026: "Late night - Monday
            // to Friday - 10pm to midnight" = base rate plus $2.95/hour;
            // "Early morning - Monday to Friday - midnight to 6am" = base
            // rate plus $4.42/hour. Identical to MA000009's evening/night
            // flat-dollar figures (same allowance schedule shared across
            // the hospitality-family awards). Applies identically to
            // casual and permanent employees — the addition sits on top of
            // whichever base rate (loaded or not) already applies; see
            // RestaurantIndustryAwardRateCalculator.BuildFlatDollarLine.
            [
                (PenaltyType.EveningAfter7pm, 2.95m), // Mon-Fri 10pm-midnight
                (PenaltyType.EarlyMorningBefore7am, 4.42m), // Mon-Fri midnight-6am
            ]),
    ];
}
