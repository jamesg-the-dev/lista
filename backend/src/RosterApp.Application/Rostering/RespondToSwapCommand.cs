using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Target staff member accept/decline — see SwapRequest's doc comment for
/// how this differs from the manager's Approve/Reject. No IVenueScopedRequest;
/// same "venue only known once the aggregate is loaded" pattern as
/// RequestSwapCommand.
/// </summary>
public sealed record RespondToSwapCommand(Guid SwapRequestId, bool Accepted)
    : IRequest<SwapRequestDto>, IRequiresPermissionLevel
{
    public RosterApp.Domain.Staffing.PermissionLevel? MinimumPermissionLevel => null;
}

public sealed class RespondToSwapCommandHandler(
    ISwapRequestRepository swapRequestRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<RespondToSwapCommand, SwapRequestDto>
{
    public async Task<SwapRequestDto> Handle(RespondToSwapCommand request, CancellationToken cancellationToken)
    {
        if (tenantContext.StaffMemberId is not { } staffMemberId)
        {
            throw new ForbiddenAccessException("Only an authenticated staff member can respond to a swap request.");
        }

        var swapRequest = await swapRequestRepository.GetByIdAsync(request.SwapRequestId, cancellationToken);
        if (swapRequest is null || swapRequest.TargetStaffId != staffMemberId)
        {
            throw new NotFoundException($"Swap request '{request.SwapRequestId}' was not found.");
        }

        swapRequest.RespondAsTarget(request.Accepted);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return SwapRequestDto.FromDomain(swapRequest);
    }
}
