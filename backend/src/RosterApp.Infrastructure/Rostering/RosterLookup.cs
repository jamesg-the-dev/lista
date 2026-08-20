using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Rostering;
using RosterApp.Domain.Rostering;

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

    public async Task<IReadOnlyList<Shift>> GetShiftsForEmployeeAsync(
        Guid employeeId,
        DateOnly from,
        DateOnly to,
        Guid? excludeShiftId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Shifts
            .AsNoTracking()
            .Where(s => s.EmployeeId == employeeId && s.ShiftDate >= from && s.ShiftDate <= to);

        if (excludeShiftId.HasValue)
        {
            query = query.Where(s => s.Id != excludeShiftId.Value);
        }

        return await query
            .OrderBy(s => s.ShiftDate)
            .ThenBy(s => s.Start)
            .ToListAsync(cancellationToken);
    }
}
