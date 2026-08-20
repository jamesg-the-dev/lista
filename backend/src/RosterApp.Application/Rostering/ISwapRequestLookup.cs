namespace RosterApp.Application.Rostering;

/// <summary>
/// Thin read port over persistence, same pattern as IBudgetSummaryLookup —
/// no-tracking, kept separate from ISwapRequestRepository (the write side).
/// Only a Pending filter is implemented for now — GetPendingSwapsForVenueQuery
/// is the only read named in docs/backend-step-by-step.md's Phase 5 route
/// table.
/// </summary>
public interface ISwapRequestLookup
{
    Task<IReadOnlyList<SwapRequestDto>> GetPendingForVenueAsync(Guid venueId, CancellationToken cancellationToken);
}
