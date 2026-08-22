using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

public sealed record GetRolesForVenueQuery(Guid VenueId)
    : IRequest<IReadOnlyList<RoleDto>>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => null;
}

public sealed class GetRolesForVenueQueryHandler(IRoleLookup roleLookup)
    : IRequestHandler<GetRolesForVenueQuery, IReadOnlyList<RoleDto>>
{
    public Task<IReadOnlyList<RoleDto>> Handle(GetRolesForVenueQuery request, CancellationToken cancellationToken) =>
        roleLookup.GetRolesForVenueAsync(request.VenueId, cancellationToken);
}

/// <summary>
/// Thin read port over persistence, same pattern as IStaffLookup — kept
/// separate from IRoleRepository so the read path never shares tracked
/// entities with commands. Joins across into AwardConfig's RoleAwardMapping
/// table (see RoleDto) despite Role living in Staffing, same
/// "Infrastructure implementation may cross bounded contexts even though
/// the application-layer ports don't" pattern used throughout this
/// codebase's *Lookup implementations.
/// </summary>
public interface IRoleLookup
{
    Task<IReadOnlyList<RoleDto>> GetRolesForVenueAsync(Guid venueId, CancellationToken cancellationToken);
    Task<RoleDto?> GetRoleAsync(Guid roleId, CancellationToken cancellationToken);
}
