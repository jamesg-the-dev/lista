using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Rostering;

/// <summary>Manager-only.</summary>
public sealed record RejectSwapCommand(Guid SwapRequestId, string? Reason) : IRequest<SwapRequestDto>;

public sealed class RejectSwapCommandValidator : AbstractValidator<RejectSwapCommand>
{
    public RejectSwapCommandValidator()
    {
        RuleFor(c => c.Reason).MaximumLength(1000);
    }
}

public sealed class RejectSwapCommandHandler(
    ISwapRequestRepository swapRequestRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<RejectSwapCommand, SwapRequestDto>
{
    public async Task<SwapRequestDto> Handle(RejectSwapCommand request, CancellationToken cancellationToken)
    {
        var swapRequest = await swapRequestRepository.GetByIdAsync(request.SwapRequestId, cancellationToken);
        if (swapRequest is null)
        {
            throw new NotFoundException($"Swap request '{request.SwapRequestId}' was not found.");
        }

        if (tenantContext.PermissionLevel is null or PermissionLevel.Staff || !tenantContext.AccessibleVenueIds.Contains(swapRequest.VenueId))
        {
            throw new NotFoundException($"Swap request '{request.SwapRequestId}' was not found.");
        }

        swapRequest.Reject(request.Reason);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return SwapRequestDto.FromDomain(swapRequest);
    }
}
