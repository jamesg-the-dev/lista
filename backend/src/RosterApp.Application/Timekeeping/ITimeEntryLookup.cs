namespace RosterApp.Application.Timekeeping;

/// <summary>
/// Thin read port over persistence, same pattern as IBudgetSummaryLookup/
/// ISwapRequestLookup — no-tracking, kept separate from the write side.
/// </summary>
public interface ITimeEntryLookup
{
    Task<IReadOnlyList<TimeEntryDto>> GetFlaggedForVenueAsync(Guid venueId, CancellationToken cancellationToken);

    Task<IReadOnlyList<ShiftVarianceDto>> GetActualVsRosteredAsync(Guid venueId, DateOnly weekStart, CancellationToken cancellationToken);
}
