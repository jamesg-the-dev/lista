using FluentValidation;
using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Layered on top of the award-derived rate, never instead of it — see
/// PayRateOverride's doc comment. §6's "soft warning if below the
/// award-derived rate for the staff member's mapped role" isn't implemented
/// here: computing that award-derived rate requires resolving
/// PrimaryRoleId -> RoleAwardMapping -> AwardRate through
/// IAwardRateCalculator, which isn't wired to Role yet (see
/// AwardClassificationDefinition's doc comment) — that's pay-calc-engine
/// work, not a settings CRUD concern, so this command stores the override
/// without that comparison rather than half-implementing it.
/// </summary>
public sealed record SetStaffPayRateOverrideCommand(Guid StaffMemberId, decimal OverrideHourlyRate, string Reason)
    : IRequest<StaffMemberDto>;

public sealed class SetStaffPayRateOverrideCommandValidator : AbstractValidator<SetStaffPayRateOverrideCommand>
{
    public SetStaffPayRateOverrideCommandValidator()
    {
        RuleFor(c => c.StaffMemberId).NotEmpty();
        RuleFor(c => c.OverrideHourlyRate).GreaterThan(0);
        RuleFor(c => c.Reason).NotEmpty().MaximumLength(500);
    }
}

public sealed class SetStaffPayRateOverrideCommandHandler(
    IStaffMemberRepository staffMemberRepository,
    IStaffLookup staffLookup,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<SetStaffPayRateOverrideCommand, StaffMemberDto>
{
    public async Task<StaffMemberDto> Handle(SetStaffPayRateOverrideCommand request, CancellationToken cancellationToken)
    {
        var staff = await staffMemberRepository.GetByIdAsync(request.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Staff member '{request.StaffMemberId}' was not found.");
        }

        staff.SetPayRateOverride(request.OverrideHourlyRate, request.Reason, tenantContext.ManagerId);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await staffLookup.GetStaffMemberAsync(staff.Id, cancellationToken)
            ?? throw new InvalidOperationException($"Staff member '{staff.Id}' vanished immediately after being saved.");
    }
}
