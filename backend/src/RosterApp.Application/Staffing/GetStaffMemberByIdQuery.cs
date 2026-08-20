using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Not in docs/backend-step-by-step.md's Phase 2 query list, but needed to
/// back the frontend staff profile screen's fetchStaffMember(staffId) and
/// to give UpdateStaffMemberCommand's response a reusable source — natural
/// complement to GetStaffForVenueQuery. Not IVenueScopedRequest for the
/// same multi-venue reason as UpdateStaffMemberCommand; the handler checks
/// access itself.
/// </summary>
public sealed record GetStaffMemberByIdQuery(Guid StaffMemberId) : IRequest<StaffMemberDto>;

public sealed class GetStaffMemberByIdQueryHandler(
    IStaffLookup staffLookup,
    ICurrentTenantContext tenantContext
) : IRequestHandler<GetStaffMemberByIdQuery, StaffMemberDto>
{
    public async Task<StaffMemberDto> Handle(GetStaffMemberByIdQuery request, CancellationToken cancellationToken)
    {
        var staff = await staffLookup.GetStaffMemberAsync(request.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Staff member '{request.StaffMemberId}' was not found.");
        }

        return staff;
    }
}
