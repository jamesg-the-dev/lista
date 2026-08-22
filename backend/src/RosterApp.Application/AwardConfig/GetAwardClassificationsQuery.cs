using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.AwardConfig;

/// <summary>Populates RoleAwardMappingTable's per-row classification dropdown, scoped to a single award.</summary>
public sealed record GetAwardClassificationsQuery(Guid AwardId)
    : IRequest<IReadOnlyList<AwardClassificationDto>>, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class GetAwardClassificationsQueryHandler(IAwardReferenceDataLookup referenceDataLookup)
    : IRequestHandler<GetAwardClassificationsQuery, IReadOnlyList<AwardClassificationDto>>
{
    public Task<IReadOnlyList<AwardClassificationDto>> Handle(GetAwardClassificationsQuery request, CancellationToken cancellationToken) =>
        referenceDataLookup.GetClassificationsForAwardAsync(request.AwardId, cancellationToken);
}
