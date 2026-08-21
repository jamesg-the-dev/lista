using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Tenancy;

/// <summary>Powers the venue switcher for multi-venue organisations.</summary>
public sealed record GetVenuesForOrganisationQuery(Guid OrganisationId) : IRequest<IReadOnlyList<VenueDto>>, IOrganisationScopedRequest;

public sealed class GetVenuesForOrganisationQueryHandler(IVenueLookup venueLookup)
    : IRequestHandler<GetVenuesForOrganisationQuery, IReadOnlyList<VenueDto>>
{
    public Task<IReadOnlyList<VenueDto>> Handle(GetVenuesForOrganisationQuery request, CancellationToken cancellationToken) =>
        venueLookup.GetForOrganisationAsync(request.OrganisationId, cancellationToken);
}
