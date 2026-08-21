namespace RosterApp.Domain.Rostering;

/// <summary>
/// The reduced, primitive-only shape of RosterComplianceConfiguration
/// (RosterApp.Domain.RosterCompliance) that IRosterComplianceValidator
/// actually needs. Kept as its own type in this context rather than passing
/// the RosterCompliance aggregate/DTO directly, so the validator (like
/// AwardConfiguration.CreateNewVersion's minimum-percent parameters) stays a
/// pure function over caller-resolved inputs with no cross-context
/// dependency of its own — see IRosterComplianceThresholdsLookup, the port
/// the caller uses to resolve this.
/// </summary>
public sealed record RosterComplianceThresholds(
    int MinShiftLengthMinutes,
    int MaxShiftLengthMinutes,
    int MinRestBetweenShiftsMinutes,
    IReadOnlyList<MealBreakThreshold> MealBreakRules)
{
    /// <summary>Used when a venue hasn't configured RosterComplianceConfiguration yet — same MVP figures HospitalityGeneralAwardComplianceValidator hardcoded before this configuration existed.</summary>
    public static readonly RosterComplianceThresholds Default = new(
        MinShiftLengthMinutes: 180,
        MaxShiftLengthMinutes: 720,
        MinRestBetweenShiftsMinutes: 600,
        MealBreakRules: [new MealBreakThreshold(AfterHoursWorked: 5m, BreakDurationMinutes: 30)]);
}

/// <summary>"After this many hours worked, a break of this length is required" — IsPaid is dropped from RosterCompliance.MealBreakRule since it's irrelevant to whether a break was taken.</summary>
public sealed record MealBreakThreshold(decimal AfterHoursWorked, int BreakDurationMinutes);
