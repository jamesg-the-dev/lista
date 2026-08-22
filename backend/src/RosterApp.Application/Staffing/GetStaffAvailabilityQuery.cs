using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

public sealed record GetStaffAvailabilityQuery(Guid StaffMemberId, DateOnly From, DateOnly To)
    : IRequest<StaffAvailabilityDto>, IPermitsSelfOrMinimumLevel
{
    Guid IPermitsSelfOrMinimumLevel.TargetStaffMemberId => StaffMemberId;
    PermissionLevel IPermitsSelfOrMinimumLevel.MinimumPermissionLevelForOthers => PermissionLevel.Supervisor;
}

public sealed class GetStaffAvailabilityQueryHandler(
    IStaffMemberRepository staffMemberRepository,
    IStaffLookup staffLookup,
    ICurrentTenantContext tenantContext
) : IRequestHandler<GetStaffAvailabilityQuery, StaffAvailabilityDto>
{
    public async Task<StaffAvailabilityDto> Handle(GetStaffAvailabilityQuery request, CancellationToken cancellationToken)
    {
        var staff = await staffMemberRepository.GetByIdAsync(request.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Staff member '{request.StaffMemberId}' was not found.");
        }

        return await staffLookup.GetAvailabilityAsync(request.StaffMemberId, request.From, request.To, cancellationToken);
    }
}
