using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Separate from UpdateStaffMemberCommand per FEATURE_SETTINGS_STAFF_ROLES.md
/// §5's CQRS table — this is the one field in the profile that carries the
/// "last remaining Owner can't be demoted" invariant (§6), so it gets its
/// own narrow command rather than being buried in the general profile-edit
/// form's field list. Owner-only via IRequiresPermissionLevel, enforced by
/// AuthorizationBehavior.
/// </summary>
public sealed record UpdateStaffPermissionLevelCommand(Guid StaffMemberId, string PermissionLevel)
    : IRequest<StaffMemberDto>, IRequiresPermissionLevel
{
    RosterApp.Domain.Staffing.PermissionLevel? IRequiresPermissionLevel.MinimumPermissionLevel => RosterApp.Domain.Staffing.PermissionLevel.Owner;
}

public sealed class UpdateStaffPermissionLevelCommandValidator : AbstractValidator<UpdateStaffPermissionLevelCommand>
{
    public UpdateStaffPermissionLevelCommandValidator(IStaffLookup staffLookup, ICurrentTenantContext tenantContext)
    {
        RuleFor(c => c.StaffMemberId).NotEmpty();
        RuleFor(c => c.PermissionLevel)
            .Must(EnumWireValidation.IsDefinedName<Domain.Staffing.PermissionLevel>)
            .WithMessage("Invalid permission level.");

        RuleFor(c => c)
            .MustAsync(async (command, ct) =>
            {
                if (!EnumWireValidation.IsDefinedName<Domain.Staffing.PermissionLevel>(command.PermissionLevel))
                {
                    return true; // already flagged by the rule above
                }

                var staff = await staffLookup.GetStaffMemberAsync(command.StaffMemberId, ct);
                var isDemotionFromOwner =
                    staff is not null
                    && staff.PermissionLevel == nameof(Domain.Staffing.PermissionLevel.Owner)
                    && command.PermissionLevel != nameof(Domain.Staffing.PermissionLevel.Owner);

                if (!isDemotionFromOwner)
                {
                    return true;
                }

                var ownerCount = await staffLookup.CountByPermissionLevelAsync(
                    tenantContext.OrganisationId, Domain.Staffing.PermissionLevel.Owner, ct);
                return ownerCount > 1;
            })
            .WithMessage("Cannot demote the last remaining Owner. Promote another staff member to Owner first.")
            .WithName(nameof(UpdateStaffPermissionLevelCommand.PermissionLevel));
    }
}

public sealed class UpdateStaffPermissionLevelCommandHandler(
    IStaffMemberRepository staffMemberRepository,
    IStaffLookup staffLookup,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<UpdateStaffPermissionLevelCommand, StaffMemberDto>
{
    public async Task<StaffMemberDto> Handle(UpdateStaffPermissionLevelCommand request, CancellationToken cancellationToken)
    {
        var staff = await staffMemberRepository.GetByIdAsync(request.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Staff member '{request.StaffMemberId}' was not found.");
        }

        var newLevel = Enum.Parse<PermissionLevel>(request.PermissionLevel);
        var isLastOwner = staff.PermissionLevel == PermissionLevel.Owner
            && newLevel != PermissionLevel.Owner
            && await staffLookup.CountByPermissionLevelAsync(tenantContext.OrganisationId, PermissionLevel.Owner, cancellationToken) <= 1;

        staff.UpdatePermissionLevel(newLevel, isLastOwner);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await staffLookup.GetStaffMemberAsync(staff.Id, cancellationToken)
            ?? throw new InvalidOperationException($"Staff member '{staff.Id}' vanished immediately after being saved.");
    }
}
