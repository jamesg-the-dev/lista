namespace RosterApp.Application.Common;

/// <summary>
/// Resolved once per request by SupabaseClaimsTransformation (Api layer)
/// from the validated JWT's claims, then consumed by TenantScopingBehavior
/// and by query/command handlers that need to know who's asking. Scoped
/// per-request (not a singleton) — populated after auth, before the
/// request reaches MediatR.
/// </summary>
public interface ICurrentTenantContext
{
    bool IsAuthenticated { get; }
    Guid ManagerId { get; }
    Guid OrganisationId { get; }
    IReadOnlyCollection<Guid> AccessibleVenueIds { get; }

    /// <summary>
    /// True once SupabaseClaimsTransformation has resolved this principal to
    /// a Manager record. Manager- and staff-only command handlers (e.g.
    /// ApproveSwapCommand vs RequestSwapCommand) use this instead of
    /// AccessibleVenueIds to tell the two roles apart, since a staff
    /// member's own assigned venues also satisfy AccessibleVenueIds.
    /// </summary>
    bool IsManager { get; }

    /// <summary>
    /// Resolved StaffMember identity (Phase 5) — null for a Manager-
    /// authenticated request, or for a Supabase-authenticated request that
    /// hasn't been linked to a StaffMember yet (see
    /// LinkStaffSupabaseAccountCommand).
    /// </summary>
    Guid? StaffMemberId { get; }

    /// <summary>
    /// True once SupabaseClaimsTransformation has resolved this principal to
    /// a StaffMember record (i.e. StaffMemberId is set).
    /// </summary>
    bool IsStaff { get; }

    /// <summary>
    /// Raw Supabase Auth "sub" claim, available as soon as the JWT is valid
    /// — independent of whether it's been resolved to a Manager or
    /// StaffMember yet. Needed by LinkStaffSupabaseAccountCommand, which
    /// runs precisely in the "not resolved yet" window.
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
