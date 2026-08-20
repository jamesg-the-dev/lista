using RosterApp.Domain.Timekeeping;

namespace RosterApp.Application.Timekeeping;

/// <summary>
/// Write-side port for the TimeEntry aggregate, same split as
/// IShiftRepository/IRosterLookup — read-heavy manager queries (the flagged
/// inbox, the variance report) go through ITimeEntryLookup instead.
/// </summary>
public interface ITimeEntryRepository
{
    Task<TimeEntry?> GetByIdAsync(Guid timeEntryId, CancellationToken cancellationToken);

    /// <summary>
    /// The still-open (not clocked out) entry for a shift, if any — used by
    /// ClockInCommand to reject a duplicate clock-in on the same shift.
    /// </summary>
    Task<TimeEntry?> GetOpenEntryForShiftAsync(Guid shiftId, CancellationToken cancellationToken);

    void Add(TimeEntry timeEntry);
}
