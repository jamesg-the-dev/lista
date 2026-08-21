using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.AwardConfig;

/// <summary>"What's active right now" for the settings UI. Null response is a valid empty state (venue hasn't configured its award yet), not a 404.</summary>
public sealed record GetActiveAwardConfigurationQuery(Guid VenueId) : IRequest<AwardConfigurationDto?>, IVenueScopedRequest;

public sealed class GetActiveAwardConfigurationQueryHandler(IAwardConfigurationLookup lookup)
    : IRequestHandler<GetActiveAwardConfigurationQuery, AwardConfigurationDto?>
{
    public Task<AwardConfigurationDto?> Handle(GetActiveAwardConfigurationQuery request, CancellationToken cancellationToken) =>
        lookup.GetActiveAsync(request.VenueId, cancellationToken);
}
