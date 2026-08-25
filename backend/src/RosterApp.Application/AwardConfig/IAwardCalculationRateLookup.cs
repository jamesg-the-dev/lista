using RosterApp.Domain.AwardConfig;

namespace RosterApp.Application.AwardConfig;

/// <summary>
/// Resolves the effective-dated casual-loading/penalty-multiplier figures
/// (AwardCalculationRateVersion) an IAwardRateCalculator needs for one
/// shift — the "numbers" half of the hybrid architecture described in
/// docs/award-calculator-routing-fix.md. Read side only; this reference
/// data is system-maintained (see AwardReferenceDataSeeder), not
/// venue-editable, so there's no corresponding write-side repository.
/// </summary>
public interface IAwardCalculationRateLookup
{
    /// <summary>
    /// awardId is the calculator's award (see IAwardRateCalculatorFactory);
    /// shiftDate is the date the shift falls on, used to pick the version in
    /// force on that date (see AwardCalculationRateVersion.SelectEffectiveAsOf)
    /// so a past pay period recalculates correctly after a wage-review
    /// update. Throws if the award has no seeded AwardCalculationRateVersion
    /// rows at all — that's a seed-data gap for a supported award, not a
    /// legitimate "no data" case.
    /// </summary>
    Task<AwardCalculationRates> GetEffectiveRatesAsync(Guid awardId, DateOnly shiftDate, CancellationToken cancellationToken);
}
