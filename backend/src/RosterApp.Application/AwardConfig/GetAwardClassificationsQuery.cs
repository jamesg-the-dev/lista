using MediatR;

namespace RosterApp.Application.AwardConfig;

/// <summary>Populates RoleAwardMappingTable's per-row classification dropdown, scoped to a single award.</summary>
public sealed record GetAwardClassificationsQuery(Guid AwardId) : IRequest<IReadOnlyList<AwardClassificationDto>>;

public sealed class GetAwardClassificationsQueryHandler(IAwardReferenceDataLookup referenceDataLookup)
    : IRequestHandler<GetAwardClassificationsQuery, IReadOnlyList<AwardClassificationDto>>
{
    public Task<IReadOnlyList<AwardClassificationDto>> Handle(GetAwardClassificationsQuery request, CancellationToken cancellationToken) =>
        referenceDataLookup.GetClassificationsForAwardAsync(request.AwardId, cancellationToken);
}
