using MediatR;

namespace RosterApp.Application.Common;

/// <summary>
/// Second pipeline stage (tenant-scoping → authorization → audit →
/// validation). Currently a pass-through: MVP has a single "Manager" role
/// and coarse authentication is already enforced by ASP.NET's
/// [Authorize]/UseAuthorization before a request reaches MediatR at all.
/// This is the extension point for per-command permission checks once a
/// finer-grained role/permission model exists — deliberately not built out
/// further until there's a real second role to check against.
///
/// TODO: the Venue Profile settings feature is the first place this gap
/// actually bites — its spec calls for Owner-only edit with Manager/Staff
/// read-only, but there's no Owner/Manager/Staff distinction to enforce
/// (ICurrentTenantContext only has IsManager/IsStaff). Every subsequent
/// settings feature (Award &amp; Pay Config, Roster Rules &amp; Compliance,
/// Staff &amp; Roles) has the same Owner-only requirement, so this needs a
/// real permission-tier model soon, not a one-off fix on a single command.
/// UpdateAwardConfigurationCommand (RosterApp.Application.AwardConfig) is
/// the concrete instance for Award &amp; Pay Config — any authenticated
/// Manager can call it today, with Owner-only enforcement deferred until
/// this behavior is built out. When it's built: the domain needs room for
/// multiple venue owners, multiple managers, and multiple staff per
/// organisation, and Managers should be modelled as a kind of Staff for
/// data-access purposes rather than a separate population.
///
/// Staff &amp; Roles (RosterApp.Application.Staffing/AwardConfig) is the next
/// concrete instance: CreateRoleCommand, DeactivateRoleCommand,
/// SetRoleAwardMappingCommand, UpdateStaffPermissionLevelCommand,
/// SetStaffPayRateOverrideCommand/ClearStaffPayRateOverrideCommand, and
/// UpdateVenueAvailabilitySettingsCommand are all spec'd Owner-only but,
/// same as above, any authenticated Manager can call them today.
/// StaffMember now carries a PermissionLevel field (Owner/Manager/
/// Supervisor/Staff) that captures which tier an owner has assigned
/// someone to, but nothing here reads it yet — it's data capture ahead of
/// enforcement, not enforcement itself. The one piece of this that IS
/// enforced today is a data-integrity invariant, not access control:
/// StaffMember.UpdatePermissionLevel throws if it would demote the last
/// remaining Owner in an organisation.
/// </summary>
public sealed class AuthorizationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        return next();
    }
}
