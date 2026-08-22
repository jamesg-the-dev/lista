using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Common;

/// <summary>
/// Declares that this command/query targets a specific staff member
/// (TargetStaffMemberId) who may always act on their own record — anyone
/// else needs at least MinimumPermissionLevelForOthers. Use this instead
/// of IRequiresPermissionLevel whenever a request carries a client-supplied
/// StaffMemberId distinct from the caller (e.g. viewing/editing another
/// staff member's availability or profile), so a flat minimum tier doesn't
/// accidentally lock the resource owner out of their own data, and so a
/// low-tier caller can't act on someone else's record just because the
/// action is "self-service-shaped."
///
/// Every MediatR request implements exactly one of this interface or
/// IRequiresPermissionLevel — PermissionPolicyCoverageTests enforces that
/// at build time.
/// </summary>
public interface IPermitsSelfOrMinimumLevel
{
    Guid TargetStaffMemberId { get; }

    /// <summary>
    /// Minimum PermissionLevel required when tenantContext.StaffMemberId
    /// differs from TargetStaffMemberId. Never consulted when the caller
    /// is acting on their own record.
    /// </summary>
    PermissionLevel MinimumPermissionLevelForOthers { get; }
}
