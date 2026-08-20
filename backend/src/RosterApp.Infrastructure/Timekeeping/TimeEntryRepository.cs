using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Timekeeping;
using RosterApp.Domain.Timekeeping;

namespace RosterApp.Infrastructure.Timekeeping;

public sealed class TimeEntryRepository(RosterDbContext dbContext) : ITimeEntryRepository
{
    public Task<TimeEntry?> GetByIdAsync(Guid timeEntryId, CancellationToken cancellationToken) =>
        dbContext.TimeEntries.FirstOrDefaultAsync(t => t.Id == timeEntryId, cancellationToken);

    public Task<TimeEntry?> GetOpenEntryForShiftAsync(Guid shiftId, CancellationToken cancellationToken) =>
        dbContext.TimeEntries.FirstOrDefaultAsync(t => t.ShiftId == shiftId && t.ClockOutUtc == null, cancellationToken);

    public void Add(TimeEntry timeEntry) => dbContext.TimeEntries.Add(timeEntry);
}
