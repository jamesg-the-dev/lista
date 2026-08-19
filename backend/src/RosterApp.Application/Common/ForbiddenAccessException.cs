namespace RosterApp.Application.Common;

/// <summary>
/// Thrown by TenantScopingBehavior when a request's VenueId/OrganisationId
/// doesn't belong to the authenticated caller. Mapped to 403 by the Api
/// layer's exception-handling middleware.
/// </summary>
public sealed class ForbiddenAccessException(string message) : Exception(message);
