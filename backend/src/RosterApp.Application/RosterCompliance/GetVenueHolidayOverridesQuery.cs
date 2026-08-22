using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.RosterCompliance;

/// <summary>The settings screen's "your venue-specific closures" list, alongside the read-only system-maintained calendar from GetPublicHolidaysQuery.</summary>
public sealed record GetVenueHolidayOverridesQuery(Guid VenueId)
    : IRequest<IReadOnlyList<VenueHolidayOverrideDto>>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Supervisor;
}

public sealed class GetVenueHolidayOverridesQueryHandler(IVenueHolidayOverrideLookup lookup)
    : IRequestHandler<GetVenueHolidayOverridesQuery, IReadOnlyList<VenueHolidayOverrideDto>>
{
    public Task<IReadOnlyList<VenueHolidayOverrideDto>> Handle(GetVenueHolidayOverridesQuery request, CancellationToken cancellationToken) =>
        lookup.GetForVenueAsync(request.VenueId, cancellationToken);
}
