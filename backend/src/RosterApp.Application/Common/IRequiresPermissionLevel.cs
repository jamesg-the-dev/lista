using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Common;

/// <summary>
/// Declares the minimum PermissionLevel a caller must hold for
/// AuthorizationBehavior to let this command/query through. Every
/// MediatR request implements exactly one of this interface or
/// IPermitsSelfOrMinimumLevel — PermissionPolicyCoverageTests enforces
/// that at build time, so a new command with neither fails the build
/// rather than silently defaulting to open access.
///
/// Use this one when the request has no notion of "acting on a specific
/// other staff member" — either it's inherently self-scoped (identity
/// derived from ICurrentTenantContext, never the request body) or it
/// operates on venue/org-level data rather than another staff member's
/// record. For requests that carry an explicit target StaffMemberId
/// distinct from the caller, use IPermitsSelfOrMinimumLevel instead so
/// the resource owner keeps self-service access.
/// </summary>
public interface IRequiresPermissionLevel
{
    /// <summary>
    /// null means "authenticated staff member required, no minimum tier"
    /// — AuthorizationBehavior still requires ICurrentTenantContext.IsAuthenticated,
    /// it just doesn't compare PermissionLevel at all. Compared with >=
    /// against the enum's declared order (Staff &lt; Supervisor &lt; Manager &lt; Owner)
    /// when non-null.
    /// </summary>
    PermissionLevel? MinimumPermissionLevel { get; }
}
