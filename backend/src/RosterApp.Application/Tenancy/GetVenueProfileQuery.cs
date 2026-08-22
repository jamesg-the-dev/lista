using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Tenancy;

public sealed record GetVenueProfileQuery(Guid VenueId)
    : IRequest<VenueDto>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class GetVenueProfileQueryHandler(IVenueLookup venueLookup) : IRequestHandler<GetVenueProfileQuery, VenueDto>
{
    public async Task<VenueDto> Handle(GetVenueProfileQuery request, CancellationToken cancellationToken)
    {
        var venue = await venueLookup.GetByIdAsync(request.VenueId, cancellationToken);
        if (venue is null)
        {
            throw new NotFoundException($"Venue '{request.VenueId}' was not found.");
        }

        return venue;
    }
}
