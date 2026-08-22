using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Drives the "3 roles are not yet mapped to an award classification"
/// warning banner shared between the Staff &amp; Roles and Award &amp; Pay
/// settings screens (FEATURE_SETTINGS_STAFF_ROLES.md §5,
/// FEATURE_SETTINGS_AWARD_PAY_CONFIG.md §5's GetUnmappedRolesQuery — one
/// query, two screens, per both specs). Reuses IRoleLookup rather than a
/// dedicated repository query — at MVP scale (a handful of roles per
/// venue) filtering the already-composed role+mapping list in memory is
/// simpler than a second SQL shape for the same join.
/// </summary>
public sealed record GetUnmappedRolesQuery(Guid VenueId)
    : IRequest<IReadOnlyList<RoleDto>>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class GetUnmappedRolesQueryHandler(IRoleLookup roleLookup)
    : IRequestHandler<GetUnmappedRolesQuery, IReadOnlyList<RoleDto>>
{
    public async Task<IReadOnlyList<RoleDto>> Handle(GetUnmappedRolesQuery request, CancellationToken cancellationToken)
    {
        var roles = await roleLookup.GetRolesForVenueAsync(request.VenueId, cancellationToken);
        return roles.Where(r => r.IsActive && r.MappedAwardClassificationId is null).ToList();
    }
}
