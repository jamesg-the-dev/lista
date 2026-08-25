using Microsoft.EntityFrameworkCore;
using RosterApp.Application.AwardConfig;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Infrastructure.AwardConfig;

public sealed class AwardCalculationRateLookup(RosterDbContext dbContext) : IAwardCalculationRateLookup
{
    public async Task<AwardCalculationRates> GetEffectiveRatesAsync(Guid awardId, DateOnly shiftDate, CancellationToken cancellationToken)
    {
        // PenaltyMultipliers is an owned collection (separate table) — EF Core
        // loads it automatically, same as AwardConfiguration.PenaltyToggles in
        // AwardConfigurationLookup, no explicit Include needed.
        var versions = await dbContext.AwardCalculationRateVersions
            .AsNoTracking()
            .Where(v => v.AwardId == awardId)
            .ToListAsync(cancellationToken);

        if (versions.Count == 0)
        {
            throw new InvalidOperationException(
                $"No AwardCalculationRateVersion rows are seeded for award '{awardId}'. " +
                "A supported award (see IAwardRateCalculatorFactory.IsSupported) must always have at least one.");
        }

        // Midday UTC avoids any ambiguity at a version's exact
        // EffectiveFromUtc boundary (which is always midnight UTC per the
        // seeder) landing on the wrong side due to the shift's local time
        // zone — this only matters on the literal day of a wage-review
        // cutover.
        var asOfUtc = shiftDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).AddHours(12);

        var effectiveVersion = AwardCalculationRateVersion.SelectEffectiveAsOf(versions, asOfUtc);
        return effectiveVersion.ToRates();
    }
}
