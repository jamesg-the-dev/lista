namespace RosterApp.Domain.RosterCompliance;

/// <summary>
/// Owned value object on RosterComplianceConfiguration — "after this many
/// hours worked, a break of this length is required." A venue can configure
/// more than one (e.g. a second break after a longer shift), per
/// FEATURE_SETTINGS_ROSTER_RULES_COMPLIANCE.md §7's "+ Add another break
/// rule". IsPaid only matters for cost calculation (IAwardRateCalculator) —
/// IRosterComplianceValidator only cares whether a break of sufficient
/// length was taken, so it consumes the reduced RosterApp.Domain.Rostering.
/// MealBreakThreshold shape instead of this type directly.
/// </summary>
public sealed record MealBreakRule(decimal AfterHoursWorked, int BreakDurationMinutes, bool IsPaid)
{
    public static MealBreakRule Create(decimal afterHoursWorked, int breakDurationMinutes, bool isPaid) =>
        new(afterHoursWorked, breakDurationMinutes, isPaid);
}
