using FluentValidation;
using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Staffing;

public sealed record ClearStaffPayRateOverrideCommand(Guid StaffMemberId) : IRequest<StaffMemberDto>;

public sealed class ClearStaffPayRateOverrideCommandValidator : AbstractValidator<ClearStaffPayRateOverrideCommand>
{
    public ClearStaffPayRateOverrideCommandValidator()
    {
        RuleFor(c => c.StaffMemberId).NotEmpty();
    }
}

public sealed class ClearStaffPayRateOverrideCommandHandler(
    IStaffMemberRepository staffMemberRepository,
    IStaffLookup staffLookup,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<ClearStaffPayRateOverrideCommand, StaffMemberDto>
{
    public async Task<StaffMemberDto> Handle(ClearStaffPayRateOverrideCommand request, CancellationToken cancellationToken)
    {
        var staff = await staffMemberRepository.GetByIdAsync(request.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Staff member '{request.StaffMemberId}' was not found.");
        }

        staff.ClearPayRateOverride();
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await staffLookup.GetStaffMemberAsync(staff.Id, cancellationToken)
            ?? throw new InvalidOperationException($"Staff member '{staff.Id}' vanished immediately after being saved.");
    }
}
