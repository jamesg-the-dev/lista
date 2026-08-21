using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Rostering;
using RosterApp.Domain.Rostering;

namespace RosterApp.Infrastructure.RosterCompliance;

public sealed class RosterComplianceThresholdsLookup(RosterDbContext dbContext) : IRosterComplianceThresholdsLookup
{
    public async Task<RosterComplianceThresholds> GetActiveThresholdsAsync(Guid venueId, CancellationToken cancellationToken)
    {
        // Owned collections (MealBreakRules) are always loaded with their
        // owner by default in EF Core — no explicit Include needed.
        var config = await dbContext.RosterComplianceConfigurations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.VenueId == venueId && c.EffectiveToUtc == null, cancellationToken);

        if (config is null)
        {
            return RosterComplianceThresholds.Default;
        }

        return new RosterComplianceThresholds(
            config.MinShiftLengthMinutes,
            config.MaxShiftLengthMinutes,
            config.MinRestBetweenShiftsMinutes,
            config.MealBreakRules.Select(r => new MealBreakThreshold(r.AfterHoursWorked, r.BreakDurationMinutes)).ToList());
    }
}
