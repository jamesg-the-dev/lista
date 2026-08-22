using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.RosterCompliance;

/// <summary>For the settings UI's configuration history panel.</summary>
public sealed record GetRosterComplianceConfigurationHistoryQuery(Guid VenueId)
    : IRequest<IReadOnlyList<RosterComplianceConfigurationDto>>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class GetRosterComplianceConfigurationHistoryQueryHandler(IRosterComplianceConfigurationLookup lookup)
    : IRequestHandler<GetRosterComplianceConfigurationHistoryQuery, IReadOnlyList<RosterComplianceConfigurationDto>>
{
    public Task<IReadOnlyList<RosterComplianceConfigurationDto>> Handle(GetRosterComplianceConfigurationHistoryQuery request, CancellationToken cancellationToken) =>
        lookup.GetHistoryAsync(request.VenueId, cancellationToken);
}
