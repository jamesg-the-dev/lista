using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Staff-initiated, not manager-initiated — RequestingStaffId comes from
/// ICurrentTenantContext.StaffMemberId, not the request body, so a staff
/// member can only ever request a swap on their own shift. No VenueId on
/// the request (so no IVenueScopedRequest) — the venue is only known once
/// the Shift is loaded, same pattern as SubmitLeaveRequestCommand.
/// </summary>
public sealed record RequestSwapCommand(Guid ShiftId, Guid TargetStaffId, string? Reason) : IRequest<SwapRequestDto>;

public sealed class RequestSwapCommandValidator : AbstractValidator<RequestSwapCommand>
{
    public RequestSwapCommandValidator(ICurrentTenantContext tenantContext)
    {
        RuleFor(c => c.ShiftId).NotEmpty();
        RuleFor(c => c.TargetStaffId).NotEmpty();
        RuleFor(c => c.Reason).MaximumLength(1000);

        RuleFor(c => c.TargetStaffId)
            .Must(targetStaffId => tenantContext.StaffMemberId != targetStaffId)
            .WithMessage("You can't request a swap targeting yourself.");
    }
}

public sealed class RequestSwapCommandHandler(
    IShiftRepository shiftRepository,
    IStaffLookup staffLookup,
    ISwapRequestRepository swapRequestRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<RequestSwapCommand, SwapRequestDto>
{
    public async Task<SwapRequestDto> Handle(RequestSwapCommand request, CancellationToken cancellationToken)
    {
        if (tenantContext.StaffMemberId is not { } requestingStaffId)
        {
            throw new ForbiddenAccessException("Only an authenticated staff member can request a shift swap.");
        }

        var shift = await shiftRepository.GetByIdAsync(request.ShiftId, cancellationToken);
        if (shift is null || shift.EmployeeId != requestingStaffId)
        {
            // Not-found rather than forbidden even for "the shift exists but
            // isn't mine" — same existence-leak rationale as NotFoundException's
            // doc comment.
            throw new NotFoundException($"Shift '{request.ShiftId}' was not found.");
        }

        var targetStaff = await staffLookup.GetStaffMemberAsync(request.TargetStaffId, cancellationToken);
        if (targetStaff is null || !targetStaff.VenueIds.Contains(shift.VenueId))
        {
            throw new NotFoundException($"Staff member '{request.TargetStaffId}' was not found for this venue.");
        }

        var swapRequest = SwapRequest.Request(shift.VenueId, shift.Id, requestingStaffId, request.TargetStaffId, request.Reason);
        swapRequestRepository.Add(swapRequest);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return SwapRequestDto.FromDomain(swapRequest);
    }
}
