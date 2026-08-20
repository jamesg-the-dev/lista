using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Rostering;
using RosterApp.Domain.Rostering;

namespace RosterApp.Infrastructure.Rostering;

public sealed class SwapRequestLookup(RosterDbContext dbContext) : ISwapRequestLookup
{
    public async Task<IReadOnlyList<SwapRequestDto>> GetPendingForVenueAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var swapRequests = await dbContext.SwapRequests
            .AsNoTracking()
            .Where(s => s.VenueId == venueId && s.Status == SwapRequestStatus.Pending)
            .OrderBy(s => s.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return swapRequests.Select(SwapRequestDto.FromDomain).ToList();
    }
}
