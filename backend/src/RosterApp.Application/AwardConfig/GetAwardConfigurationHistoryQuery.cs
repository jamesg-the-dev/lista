using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.AwardConfig;

/// <summary>For the settings UI's collapsed "Configuration History" audit panel, and for payroll recalculation debugging.</summary>
public sealed record GetAwardConfigurationHistoryQuery(Guid VenueId) : IRequest<IReadOnlyList<AwardConfigurationDto>>, IVenueScopedRequest;

public sealed class GetAwardConfigurationHistoryQueryHandler(IAwardConfigurationLookup lookup)
    : IRequestHandler<GetAwardConfigurationHistoryQuery, IReadOnlyList<AwardConfigurationDto>>
{
    public Task<IReadOnlyList<AwardConfigurationDto>> Handle(GetAwardConfigurationHistoryQuery request, CancellationToken cancellationToken) =>
        lookup.GetHistoryAsync(request.VenueId, cancellationToken);
}
