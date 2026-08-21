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
    public static readonly Guid HospitalityGeneralAwardId = new("11111111-0000-0000-0000-000000000001");
    public static readonly Guid RestaurantIndustryAwardId = new("11111111-0000-0000-0000-000000000002");
    public static readonly Guid RegisteredClubsAwardId = new("11111111-0000-0000-0000-000000000003");
    public static readonly Guid FastFoodIndustryAwardId = new("11111111-0000-0000-0000-000000000004");

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

    /// <summary>Matches HospitalityGeneralAwardRateCalculator's hardcoded MVP multipliers for Saturday/Sunday/evening; PublicHoliday and EarlyMorningBefore7am aren't implemented there yet but are seeded here as reference data for the settings UI to display.</summary>
    public static readonly IReadOnlyList<(PenaltyType Type, decimal Multiplier)> HospitalityGeneralPenaltyMultipliers =
    [
        (PenaltyType.Saturday, 1.25m),
        (PenaltyType.Sunday, 1.50m),
        (PenaltyType.PublicHoliday, 2.50m),
        (PenaltyType.EveningAfter7pm, 1.10m),
        (PenaltyType.EarlyMorningBefore7am, 1.15m),
    ];
}
