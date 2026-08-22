using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Soft-delete only, per §6. Blocked while the role is any active staff
/// member's PrimaryRoleId. The spec's second guard — "or used in a
/// future/published roster" — can't be checked yet: Shift has no RoleId at
/// all today (roles are new as of this build-order step), so there's
/// nothing in Rostering to query against. That check is deferred until
/// Shift gains a role reference, not silently skipped — don't add a
/// same-named guard here that always passes.
/// </summary>
public sealed record DeactivateRoleCommand(Guid RoleId) : IRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Owner;
}

public sealed class DeactivateRoleCommandValidator : AbstractValidator<DeactivateRoleCommand>
{
    public DeactivateRoleCommandValidator(IStaffLookup staffLookup)
    {
        RuleFor(c => c.RoleId).NotEmpty();

        RuleFor(c => c)
            .MustAsync(async (command, ct) => !await staffLookup.AnyStaffWithPrimaryRoleAsync(command.RoleId, ct))
            .WithMessage("This role is still assigned as a staff member's primary role and cannot be deactivated.")
            .WithName(nameof(DeactivateRoleCommand.RoleId));
    }
}

public sealed class DeactivateRoleCommandHandler(
    IRoleRepository roleRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<DeactivateRoleCommand>
{
    public async Task Handle(DeactivateRoleCommand request, CancellationToken cancellationToken)
    {
        var role = await roleRepository.GetByIdAsync(request.RoleId, cancellationToken);
        if (role is null || !tenantContext.AccessibleVenueIds.Contains(role.VenueId))
        {
            throw new NotFoundException($"Role '{request.RoleId}' was not found.");
        }

        role.Deactivate();
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
