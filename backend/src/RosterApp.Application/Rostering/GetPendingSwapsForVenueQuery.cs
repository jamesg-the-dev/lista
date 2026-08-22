using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Manager inbox (CLAUDE.md: "manager-side approval handled as an inbox
/// rather than a separate screen"). IVenueScopedRequest alone would also
/// let a staff member with matching venue claims call this — gated to
/// Supervisor+ via IRequiresPermissionLevel since this is explicitly
/// manager-facing.
/// </summary>
public sealed record GetPendingSwapsForVenueQuery(Guid VenueId)
    : IRequest<IReadOnlyList<SwapRequestDto>>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Supervisor;
}

public sealed class GetPendingSwapsForVenueQueryHandler(ISwapRequestLookup swapRequestLookup)
    : IRequestHandler<GetPendingSwapsForVenueQuery, IReadOnlyList<SwapRequestDto>>
{
    public Task<IReadOnlyList<SwapRequestDto>> Handle(GetPendingSwapsForVenueQuery request, CancellationToken cancellationToken) =>
        swapRequestLookup.GetPendingForVenueAsync(request.VenueId, cancellationToken);
}
