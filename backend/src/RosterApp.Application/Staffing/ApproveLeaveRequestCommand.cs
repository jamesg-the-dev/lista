using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Staffing;

public sealed record ApproveLeaveRequestCommand(Guid LeaveRequestId) : IRequest<LeaveRequestDto>;

public sealed class ApproveLeaveRequestCommandHandler(
    ILeaveRequestRepository leaveRequestRepository,
    IStaffMemberRepository staffMemberRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<ApproveLeaveRequestCommand, LeaveRequestDto>
{
    public async Task<LeaveRequestDto> Handle(ApproveLeaveRequestCommand request, CancellationToken cancellationToken)
    {
        var leaveRequest = await leaveRequestRepository.GetByIdAsync(request.LeaveRequestId, cancellationToken);
        if (leaveRequest is null)
        {
            throw new NotFoundException($"Leave request '{request.LeaveRequestId}' was not found.");
        }

        var staff = await staffMemberRepository.GetByIdAsync(leaveRequest.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Leave request '{request.LeaveRequestId}' was not found.");
        }

        leaveRequest.Approve();
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return LeaveRequestDto.FromDomain(leaveRequest);
    }
}
