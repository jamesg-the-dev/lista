using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.RosterCompliance;

/// <summary>"What's active right now" for the settings UI. Null response is a valid empty state (venue hasn't configured its roster rules yet), not a 404.</summary>
public sealed record GetActiveRosterComplianceConfigurationQuery(Guid VenueId)
    : IRequest<RosterComplianceConfigurationDto?>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Supervisor;
}

public sealed class GetActiveRosterComplianceConfigurationQueryHandler(IRosterComplianceConfigurationLookup lookup)
    : IRequestHandler<GetActiveRosterComplianceConfigurationQuery, RosterComplianceConfigurationDto?>
{
    public Task<RosterComplianceConfigurationDto?> Handle(GetActiveRosterComplianceConfigurationQuery request, CancellationToken cancellationToken) =>
        lookup.GetActiveAsync(request.VenueId, cancellationToken);
}
