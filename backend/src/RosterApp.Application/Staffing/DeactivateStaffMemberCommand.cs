using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Rostering;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Soft-delete only, same contract as DeactivateRoleCommand/
/// DeactivateVenueCommand — a staff member is never hard-deleted since past
/// shifts/timesheets reference them by EmployeeId with no FK (see
/// Shift.EmployeeId's doc comment). No corresponding "reactivate" command,
/// matching Role. Not IVenueScopedRequest, same reasoning as
/// UpdateStaffMemberCommand: a staff member can span multiple venues, so
/// the handler checks access itself via ICurrentTenantContext.
/// AccessibleVenueIds rather than a single VenueId representing tenant
/// scope. Manager-tier minimum, matching CreateStaffMemberCommand/
/// UpdateStaffMemberCommand — deactivation is the natural counterpart to
/// those profile-lifecycle actions, not an Owner-only action the way
/// permission-level/pay-rate changes are.
/// </summary>
public sealed record DeactivateStaffMemberCommand(Guid StaffMemberId) : IRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class DeactivateStaffMemberCommandValidator : AbstractValidator<DeactivateStaffMemberCommand>
{
    public DeactivateStaffMemberCommandValidator(
        IStaffLookup staffLookup,
        IShiftRepository shiftRepository,
        ICurrentTenantContext tenantContext)
    {
        RuleFor(c => c.StaffMemberId).NotEmpty();

        // Mirrors DeactivateRoleCommandValidator's "still in use" guard —
        // a future/published roster shouldn't lose the person it's built
        // around out from under it.
        RuleFor(c => c)
            .MustAsync(async (command, ct) =>
                !await shiftRepository.HasFuturePublishedShiftsForStaffMemberAsync(
                    command.StaffMemberId, DateOnly.FromDateTime(DateTime.UtcNow), ct))
            .WithMessage("This staff member has published rosters in the future and cannot be deactivated.")
            .WithName(nameof(DeactivateStaffMemberCommand.StaffMemberId));

        // Same "last remaining Owner" invariant as
        // UpdateStaffPermissionLevelCommandValidator, checked here too
        // since deactivating an Owner removes their access just as
        // effectively as demoting them would.
        RuleFor(c => c)
            .MustAsync(async (command, ct) =>
            {
                var staff = await staffLookup.GetStaffMemberAsync(command.StaffMemberId, ct);
                if (staff is null || staff.PermissionLevel != nameof(PermissionLevel.Owner))
                {
                    return true;
                }

                var ownerCount = await staffLookup.CountByPermissionLevelAsync(
                    tenantContext.OrganisationId, PermissionLevel.Owner, ct);
                return ownerCount > 1;
            })
            .WithMessage("Cannot deactivate the last remaining Owner. Promote another staff member to Owner first.")
            .WithName(nameof(DeactivateStaffMemberCommand.StaffMemberId));
    }
}

public sealed class DeactivateStaffMemberCommandHandler(
    IStaffMemberRepository staffMemberRepository,
    IStaffLookup staffLookup,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<DeactivateStaffMemberCommand>
{
    public async Task Handle(DeactivateStaffMemberCommand request, CancellationToken cancellationToken)
    {
        var staff = await staffMemberRepository.GetByIdAsync(request.StaffMemberId, cancellationToken);
        if (staff is null || !staff.VenueIds.Any(tenantContext.AccessibleVenueIds.Contains))
        {
            throw new NotFoundException($"Staff member '{request.StaffMemberId}' was not found.");
        }

        var isLastActiveOwner = staff.PermissionLevel == PermissionLevel.Owner
            && await staffLookup.CountByPermissionLevelAsync(tenantContext.OrganisationId, PermissionLevel.Owner, cancellationToken) <= 1;

        staff.Deactivate(isLastActiveOwner);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
