using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Write-side port for the SwapRequest aggregate, same split as
/// IShiftRepository/IRosterLookup — read-heavy queries (the manager inbox)
/// go through ISwapRequestLookup instead.
/// </summary>
public interface ISwapRequestRepository
{
    Task<SwapRequest?> GetByIdAsync(Guid swapRequestId, CancellationToken cancellationToken);
    void Add(SwapRequest swapRequest);
}
