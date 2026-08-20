using MediatR;
using RosterApp.Application.Common;

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
}
