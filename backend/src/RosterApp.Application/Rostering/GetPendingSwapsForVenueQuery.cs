using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Manager inbox (CLAUDE.md: "manager-side approval handled as an inbox
/// rather than a separate screen"). IVenueScopedRequest alone would also
/// let a staff member with matching venue claims call this — the handler
/// additionally requires IsManager since this is explicitly manager-facing.
/// </summary>
public sealed record GetPendingSwapsForVenueQuery(Guid VenueId) : IRequest<IReadOnlyList<SwapRequestDto>>, IVenueScopedRequest;

public sealed class GetPendingSwapsForVenueQueryHandler(
    ISwapRequestLookup swapRequestLookup,
    ICurrentTenantContext tenantContext
) : IRequestHandler<GetPendingSwapsForVenueQuery, IReadOnlyList<SwapRequestDto>>
{
    public async Task<IReadOnlyList<SwapRequestDto>> Handle(GetPendingSwapsForVenueQuery request, CancellationToken cancellationToken)
    {
        if (!tenantContext.IsManager)
        {
            throw new ForbiddenAccessException("Only a manager can view the swap-request inbox.");
        }

        return await swapRequestLookup.GetPendingForVenueAsync(request.VenueId, cancellationToken);
    }
}
