using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Staffing;

public sealed record RemoveStandingUnavailabilityCommand(Guid StaffMemberId, Guid ExceptionId) : IRequest;

public sealed class RemoveStandingUnavailabilityCommandHandler(
    IStaffMemberRepository staffMemberRepository,
    IStandingUnavailabilityRepository unavailabilityRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<RemoveStandingUnavailabilityCommand>
{
    public async Task Handle(RemoveStandingUnavailabilityCommand request, CancellationToken cancellationToken)
    {
        var staff = await staffMemberRepository.GetByIdAsync(request.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Staff member '{request.StaffMemberId}' was not found.");
        }

        var unavailability = await unavailabilityRepository.GetByIdAsync(request.ExceptionId, cancellationToken);
        if (unavailability is null || unavailability.StaffMemberId != request.StaffMemberId)
        {
            throw new NotFoundException($"Unavailability exception '{request.ExceptionId}' was not found.");
        }

        unavailability.MarkForRemoval();
        unavailabilityRepository.Remove(unavailability);

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
