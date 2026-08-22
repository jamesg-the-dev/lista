using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

public sealed record SubmitLeaveRequestCommand(
    Guid StaffMemberId,
    DateOnly StartDate,
    DateOnly EndDate,
    string? Reason
) : IRequest<LeaveRequestDto>, IPermitsSelfOrMinimumLevel
{
    Guid IPermitsSelfOrMinimumLevel.TargetStaffMemberId => StaffMemberId;
    PermissionLevel IPermitsSelfOrMinimumLevel.MinimumPermissionLevelForOthers => PermissionLevel.Supervisor;
}

public sealed class SubmitLeaveRequestCommandValidator : AbstractValidator<SubmitLeaveRequestCommand>
{
    public SubmitLeaveRequestCommandValidator()
    {
        RuleFor(c => c.StaffMemberId).NotEmpty();
        RuleFor(c => c.EndDate).GreaterThanOrEqualTo(c => c.StartDate)
            .WithMessage("Leave end date must be on or after the start date.");
        RuleFor(c => c.Reason).MaximumLength(1000);
    }
}

public sealed class SubmitLeaveRequestCommandHandler(
    IStaffMemberRepository staffMemberRepository,
    ILeaveRequestRepository leaveRequestRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<SubmitLeaveRequestCommand, LeaveRequestDto>
{
    public async Task<LeaveRequestDto> Handle(SubmitLeaveRequestCommand request, CancellationToken cancellationToken)
    {
        var staff = await staffMemberRepository.GetByIdAsync(request.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Staff member '{request.StaffMemberId}' was not found.");
        }

        var leaveRequest = LeaveRequest.Submit(request.StaffMemberId, request.StartDate, request.EndDate, request.Reason);
        leaveRequestRepository.Add(leaveRequest);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return LeaveRequestDto.FromDomain(leaveRequest);
    }
}
