using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.AwardConfig;

/// <summary>Feeds the Award &amp; Pay screen's RoleAwardMappingTable (§7) — one row per currently-mapped role.</summary>
public sealed record GetRoleAwardMappingsForVenueQuery(Guid VenueId)
    : IRequest<IReadOnlyList<RoleAwardMappingDto>>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class GetRoleAwardMappingsForVenueQueryHandler(IRoleAwardMappingLookup lookup)
    : IRequestHandler<GetRoleAwardMappingsForVenueQuery, IReadOnlyList<RoleAwardMappingDto>>
{
    public Task<IReadOnlyList<RoleAwardMappingDto>> Handle(GetRoleAwardMappingsForVenueQuery request, CancellationToken cancellationToken) =>
        lookup.GetActiveMappingsForVenueAsync(request.VenueId, cancellationToken);
}
