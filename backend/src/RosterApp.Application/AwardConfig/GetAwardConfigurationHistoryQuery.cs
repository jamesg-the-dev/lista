using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.AwardConfig;

/// <summary>For the settings UI's collapsed "Configuration History" audit panel, and for payroll recalculation debugging.</summary>
public sealed record GetAwardConfigurationHistoryQuery(Guid VenueId)
    : IRequest<IReadOnlyList<AwardConfigurationDto>>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class GetAwardConfigurationHistoryQueryHandler(IAwardConfigurationLookup lookup)
    : IRequestHandler<GetAwardConfigurationHistoryQuery, IReadOnlyList<AwardConfigurationDto>>
{
    public Task<IReadOnlyList<AwardConfigurationDto>> Handle(GetAwardConfigurationHistoryQuery request, CancellationToken cancellationToken) =>
        lookup.GetHistoryAsync(request.VenueId, cancellationToken);
}
