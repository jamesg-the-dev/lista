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
}
