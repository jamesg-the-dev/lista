using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Timekeeping;
using RosterApp.Domain.Timekeeping;

namespace RosterApp.Infrastructure.Timekeeping;

public sealed class TimeEntryLookup(RosterDbContext dbContext) : ITimeEntryLookup
{
    public async Task<IReadOnlyList<TimeEntryDto>> GetFlaggedForVenueAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var entries = await dbContext.TimeEntries
            .AsNoTracking()
            .Where(t => t.VenueId == venueId && t.VarianceStatus == TimeEntryVarianceStatus.Flagged)
            .OrderBy(t => t.ClockInUtc)
            .ToListAsync(cancellationToken);

        return entries.Select(TimeEntryDto.FromDomain).ToList();
    }

    public async Task<IReadOnlyList<ShiftVarianceDto>> GetActualVsRosteredAsync(
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

        var shiftIds = shifts.Select(s => s.Id).ToList();

        var entries = await dbContext.TimeEntries
            .AsNoTracking()
            .Where(t => shiftIds.Contains(t.ShiftId))
            .ToListAsync(cancellationToken);

        // A shift could in principle have more than one entry (e.g. a
        // re-clock after an earlier one was corrected) — the most recent
        // clock-in is the one that represents the shift's actual hours.
        var latestEntryByShift = entries
            .GroupBy(t => t.ShiftId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(t => t.ClockInUtc).First());

        return shifts.Select(s =>
        {
            var rosteredMinutes = (int)((s.End.ToTimeSpan() - s.Start.ToTimeSpan()).TotalMinutes - s.UnpaidBreakMinutes);
            latestEntryByShift.TryGetValue(s.Id, out var entry);

            var actualMinutes = entry?.ClockOutUtc is { } clockOutUtc
                ? (int)(clockOutUtc - entry.ClockInUtc).TotalMinutes
                : (int?)null;

            return new ShiftVarianceDto(
                s.Id,
                s.EmployeeId,
                s.ShiftDate,
                rosteredMinutes,
                entry?.Id,
                actualMinutes,
                entry?.VarianceMinutes,
                entry?.VarianceStatus?.ToString());
        }).ToList();
    }
}
