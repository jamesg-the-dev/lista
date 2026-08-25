namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// The numeric inputs an IAwardRateCalculator needs for one shift: the
/// casual loading percentage and the permanent (full-time/part-time)
/// penalty multiplier for every PenaltyType the calculator's award defines.
/// This is the "hybrid" half of the award-calculator architecture (see
/// docs/award-calculator-routing-fix.md) — calculation STRUCTURE (which day
/// of week maps to which PenaltyType, the evening/night boundaries, how
/// casual loading stacks with a penalty multiplier) stays hardcoded in each
/// award's IAwardRateCalculator class, versioned and tested per award; these
/// NUMBERS are resolved by IAwardCalculationRateLookup from
/// AwardCalculationRateVersion, effective-dated so a wage-review update is a
/// data change, not a deploy, and a shift is always priced at the rate in
/// force on the date it was worked.
///
/// A calculator is a pure function of (shift inputs, EmploymentType, these
/// rates) — it has no repository dependency of its own, same rationale as
/// IRosterComplianceValidator staying pure. The caller (command handler)
/// resolves the venue's award and fetches the effective rates before
/// calling Calculate.
/// </summary>
public sealed record AwardCalculationRates(
    decimal CasualLoadingPercent,
    IReadOnlyDictionary<PenaltyType, decimal> PenaltyMultipliers)
{
    /// <summary>Throws if the calculator's award doesn't have a seeded multiplier for this PenaltyType — a missing row is a seed-data gap, not a "treat as zero" situation.</summary>
    public decimal GetMultiplier(PenaltyType penaltyType) =>
        PenaltyMultipliers.TryGetValue(penaltyType, out var multiplier)
            ? multiplier
            : throw new InvalidOperationException(
                $"No penalty multiplier is configured for {penaltyType}. This award's AwardCalculationRateVersion seed data is incomplete.");
}
