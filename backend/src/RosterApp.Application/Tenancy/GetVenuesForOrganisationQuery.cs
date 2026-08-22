using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Tenancy;

/// <summary>Powers the venue switcher for multi-venue organisations.</summary>
public sealed record GetVenuesForOrganisationQuery(Guid OrganisationId)
    : IRequest<IReadOnlyList<VenueDto>>, IOrganisationScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => null;
}

public sealed class GetVenuesForOrganisationQueryHandler(IVenueLookup venueLookup)
    : IRequestHandler<GetVenuesForOrganisationQuery, IReadOnlyList<VenueDto>>
{
    public Task<IReadOnlyList<VenueDto>> Handle(GetVenuesForOrganisationQuery request, CancellationToken cancellationToken) =>
        venueLookup.GetForOrganisationAsync(request.OrganisationId, cancellationToken);
}
