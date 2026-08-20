using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Rostering;

namespace RosterApp.Infrastructure.Rostering;

public sealed class RosterLookup(RosterDbContext dbContext) : IRosterLookup
{
    public async Task<IReadOnlyList<ShiftDto>> GetRosterForWeekAsync(
        Guid venueId,
        DateOnly weekStart,
        CancellationToken cancellationToken)
    {
        var weekEnd = weekStart.AddDays(6);

        var shifts = await dbContext.Shifts
            .AsNoTracking()
            .Where(s => s.VenueId == venueId && s.ShiftDate >= weekStart && s.ShiftDate <= weekEnd)
            .OrderBy(s => s.ShiftDate)
            .ThenBy(s => s.Start)
            .ToListAsync(cancellationToken);

        return shifts.Select(ShiftDto.FromDomain).ToList();
    }
}
