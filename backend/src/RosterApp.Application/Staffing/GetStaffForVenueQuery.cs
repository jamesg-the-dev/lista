using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

public sealed record GetStaffForVenueQuery(Guid VenueId) : IRequest<IReadOnlyList<StaffMemberDto>>, IVenueScopedRequest;

public sealed class GetStaffForVenueQueryHandler(IStaffLookup staffLookup)
    : IRequestHandler<GetStaffForVenueQuery, IReadOnlyList<StaffMemberDto>>
{
    public Task<IReadOnlyList<StaffMemberDto>> Handle(GetStaffForVenueQuery request, CancellationToken cancellationToken) =>
        staffLookup.GetStaffForVenueAsync(request.VenueId, cancellationToken);
}

/// <summary>
/// Thin read port over persistence, same pattern as IRosterLookup — no
/// tracking, kept separate from the write-side repositories so the read
/// path never shares tracked entities with commands.
/// </summary>
public interface IStaffLookup
{
    Task<IReadOnlyList<StaffMemberDto>> GetStaffForVenueAsync(Guid venueId, CancellationToken cancellationToken);
    Task<StaffMemberDto?> GetStaffMemberAsync(Guid staffMemberId, CancellationToken cancellationToken);

    Task<StaffAvailabilityDto> GetAvailabilityAsync(
        Guid staffMemberId,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken);

    /// <summary>Backs DeactivateRoleCommandValidator's "role still in use" guard (§6).</summary>
    Task<bool> AnyStaffWithPrimaryRoleAsync(Guid roleId, CancellationToken cancellationToken);

    /// <summary>
    /// Backs UpdateStaffPermissionLevelCommandHandler's "last remaining
    /// Owner" check — counted per-organisation (not per-venue) since a
    /// staff member can span multiple venues and there's no separate
    /// per-venue owner concept in this data model. See StaffMember.
    /// UpdatePermissionLevel's doc comment.
    /// </summary>
    Task<int> CountByPermissionLevelAsync(Guid organisationId, PermissionLevel permissionLevel, CancellationToken cancellationToken);
}
