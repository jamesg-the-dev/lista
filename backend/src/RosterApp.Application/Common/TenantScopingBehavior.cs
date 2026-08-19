using MediatR;

namespace RosterApp.Application.Common;

/// <summary>
/// First stage of the pipeline (tenant-scoping → authorization → audit →
/// validation — see project docs). Confirms the venue/organisation a
/// request targets actually belongs to the authenticated caller's
/// organisation before anything else runs. Requests that implement
/// neither IVenueScopedRequest nor IOrganisationScopedRequest (e.g.
/// GetCurrentAccountQuery, which establishes identity in the first place)
/// pass through untouched.
/// </summary>
public sealed class TenantScopingBehavior<TRequest, TResponse>(ICurrentTenantContext tenantContext)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken
    )
    {
        if (request is IVenueScopedRequest venueScoped)
        {
            if (!tenantContext.IsAuthenticated)
            {
                throw new ForbiddenAccessException("No authenticated tenant context.");
            }

            if (!tenantContext.AccessibleVenueIds.Contains(venueScoped.VenueId))
            {
                throw new ForbiddenAccessException(
                    $"Venue '{venueScoped.VenueId}' is not accessible to the current manager."
                );
            }
        }
        else if (request is IOrganisationScopedRequest orgScoped)
        {
            if (!tenantContext.IsAuthenticated)
            {
                throw new ForbiddenAccessException("No authenticated tenant context.");
            }

            if (orgScoped.OrganisationId != tenantContext.OrganisationId)
            {
                throw new ForbiddenAccessException(
                    $"Organisation '{orgScoped.OrganisationId}' is not accessible to the current manager."
                );
            }
        }

        return next();
    }
}
