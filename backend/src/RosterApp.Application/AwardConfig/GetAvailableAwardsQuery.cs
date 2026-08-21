using MediatR;

namespace RosterApp.Application.AwardConfig;

/// <summary>
/// Populates the award dropdown. Unscoped (no IVenueScopedRequest/
/// IOrganisationScopedRequest) — this is system-wide reference data, not
/// tenant data, so there's nothing for TenantScopingBehavior to check;
/// [Authorize] at the controller is enough to gate it to authenticated
/// callers.
/// </summary>
public sealed record GetAvailableAwardsQuery : IRequest<IReadOnlyList<AwardDto>>;

public sealed class GetAvailableAwardsQueryHandler(IAwardReferenceDataLookup referenceDataLookup)
    : IRequestHandler<GetAvailableAwardsQuery, IReadOnlyList<AwardDto>>
{
    public Task<IReadOnlyList<AwardDto>> Handle(GetAvailableAwardsQuery request, CancellationToken cancellationToken) =>
        referenceDataLookup.GetAvailableAwardsAsync(cancellationToken);
}
