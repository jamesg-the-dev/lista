using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Not named in docs/backend-step-by-step.md's Phase 2 command list (only
/// ApproveLeaveRequestCommand is listed), but "approval state" implies a
/// decline path too, and the frontend's LeaveRequestStatus already has a
/// "declined" state (frontend/app/routes/staff/types.ts) with an
/// updateLeaveRequestStatus call expecting it — filling this in as the
/// natural symmetric command.
/// </summary>
public sealed record DeclineLeaveRequestCommand(Guid LeaveRequestId)
    : IRequest<LeaveRequestDto>, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Supervisor;
}

public sealed class DeclineLeaveRequestCommandHandler(
    ILeaveRequestRepository leaveRequestRepository,
    IStaffMemberRepository staffMemberRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<DeclineLeaveRequestCommand, LeaveRequestDto>
{
    public async Task<LeaveRequestDto> Handle(DeclineLeaveRequestCommand request, CancellationToken cancellationToken)
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

        leaveRequest.Decline();
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return LeaveRequestDto.FromDomain(leaveRequest);
    }
}
