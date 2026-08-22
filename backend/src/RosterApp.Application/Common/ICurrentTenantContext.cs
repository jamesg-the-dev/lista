using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Common;

/// <summary>
/// Resolved once per request by SupabaseClaimsTransformation (Api layer)
/// from the validated JWT's claims, then consumed by TenantScopingBehavior
/// and by query/command handlers that need to know who's asking. Scoped
/// per-request (not a singleton) — populated after auth, before the
/// request reaches MediatR.
///
/// Every authenticated actor — Owner, Manager, Supervisor, or plain Staff —
/// is a StaffMember row; there is no separate Manager population to
/// distinguish (see StaffMember.PermissionLevel).
/// </summary>
public interface ICurrentTenantContext
{
    bool IsAuthenticated { get; }
    Guid OrganisationId { get; }
    IReadOnlyCollection<Guid> AccessibleVenueIds { get; }

    /// <summary>
    /// Resolved StaffMember identity — null for a Supabase-authenticated
    /// request that hasn't been linked to a StaffMember yet (see
    /// LinkStaffSupabaseAccountCommand, which runs precisely in that
    /// window).
    /// </summary>
    Guid? StaffMemberId { get; }

    /// <summary>
    /// The resolved StaffMember's permission tier — null under the same
    /// "not yet linked" condition as StaffMemberId. Used by command/query
    /// handlers that need to distinguish management-capable actors from
    /// plain Staff-tier self-service ones (e.g. ApproveSwapCommand vs
    /// RequestSwapCommand): compare against PermissionLevel.Staff rather
    /// than introducing a separate population check.
    /// </summary>
    PermissionLevel? PermissionLevel { get; }

    /// <summary>
    /// Raw Supabase Auth "sub" claim, available as soon as the JWT is valid
    /// — independent of whether it's been resolved to a StaffMember yet.
    /// Needed by LinkStaffSupabaseAccountCommand, which runs precisely in
    /// the "not resolved yet" window.
    /// </summary>
    string? SupabaseUserId { get; }

    /// <summary>
    /// Raw Supabase Auth "email" claim — same "available before resolution"
    /// caveat as SupabaseUserId. Used to match a newly-signed-up staff
    /// member's account to the StaffMember profile their manager already
    /// created with that email.
    /// </summary>
    string? Email { get; }
}
