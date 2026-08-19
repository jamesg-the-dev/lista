namespace RosterApp.Application.Common;

/// <summary>
/// Implemented by requests that operate across a whole Organisation rather
/// than a single Venue (e.g. Phase 4's GetCostByVenueQuery). Checked by
/// TenantScopingBehavior against ICurrentTenantContext.OrganisationId.
/// </summary>
public interface IOrganisationScopedRequest
{
    Guid OrganisationId { get; }
}
