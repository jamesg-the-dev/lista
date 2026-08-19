namespace RosterApp.Application.Common;

/// <summary>
/// Implemented by any MediatR command/query that carries a single VenueId
/// (nearly everything past Phase 0). TenantScopingBehavior checks this
/// VenueId against ICurrentTenantContext.AccessibleVenueIds and throws
/// ForbiddenAccessException if it doesn't belong to the caller's org.
/// Requests that establish identity itself (GetCurrentAccountQuery) or
/// operate at the Organisation level implement neither this nor
/// IOrganisationScopedRequest and skip tenant scoping entirely.
/// </summary>
public interface IVenueScopedRequest
{
    Guid VenueId { get; }
}
