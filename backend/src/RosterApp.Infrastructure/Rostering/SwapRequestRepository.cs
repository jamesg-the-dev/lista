using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Rostering;
using RosterApp.Domain.Rostering;

namespace RosterApp.Infrastructure.Rostering;

public sealed class SwapRequestRepository(RosterDbContext dbContext) : ISwapRequestRepository
{
    public Task<SwapRequest?> GetByIdAsync(Guid swapRequestId, CancellationToken cancellationToken) =>
        dbContext.SwapRequests.FirstOrDefaultAsync(s => s.Id == swapRequestId, cancellationToken);

    public void Add(SwapRequest swapRequest) => dbContext.SwapRequests.Add(swapRequest);
}
