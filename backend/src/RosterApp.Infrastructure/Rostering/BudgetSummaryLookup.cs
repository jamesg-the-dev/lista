using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Rostering;

namespace RosterApp.Infrastructure.Rostering;

public sealed class BudgetSummaryLookup(RosterDbContext dbContext) : IBudgetSummaryLookup
{
    public async Task<BudgetSummaryDto> GetBudgetSummaryAsync(
        Guid venueId,
        DateOnly weekStart,
        CancellationToken cancellationToken)
    {
        var weekEnd = weekStart.AddDays(6);

        var totalCost = await dbContext.Shifts
            .AsNoTracking()
            .Where(s => s.VenueId == venueId && s.ShiftDate >= weekStart && s.ShiftDate <= weekEnd)
            .SelectMany(s => s.AwardBreakdown)
            .SumAsync(line => (decimal?)line.Amount, cancellationToken) ?? 0m;

        var forecastSalesTarget = await dbContext.Venues
            .AsNoTracking()
            .Where(v => v.Id == venueId)
            .Select(v => v.ForecastSalesTarget)
            .FirstOrDefaultAsync(cancellationToken);

        var percentOfTarget = forecastSalesTarget is > 0
            ? Math.Round(totalCost / forecastSalesTarget.Value * 100m, 1)
            : (decimal?)null;

        return new BudgetSummaryDto(venueId, weekStart, totalCost, forecastSalesTarget, percentOfTarget);
    }
}
