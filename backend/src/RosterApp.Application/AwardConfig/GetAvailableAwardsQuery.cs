using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.AwardConfig;

/// <summary>
/// Populates the award dropdown. Unscoped (no IVenueScopedRequest/
/// IOrganisationScopedRequest) — this is system-wide reference data, not
/// tenant data, so there's nothing for TenantScopingBehavior to check;
/// [Authorize] at the controller is enough to gate it to authenticated
/// callers. Still Manager+ via IRequiresPermissionLevel — it only feeds the
/// Award &amp; Pay settings screen, which isn't Staff-facing.
/// </summary>
public sealed record GetAvailableAwardsQuery : IRequest<IReadOnlyList<AwardDto>>, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class GetAvailableAwardsQueryHandler(IAwardReferenceDataLookup referenceDataLookup)
    : IRequestHandler<GetAvailableAwardsQuery, IReadOnlyList<AwardDto>>
{
    public Task<IReadOnlyList<AwardDto>> Handle(GetAvailableAwardsQuery request, CancellationToken cancellationToken) =>
        referenceDataLookup.GetAvailableAwardsAsync(cancellationToken);
}
