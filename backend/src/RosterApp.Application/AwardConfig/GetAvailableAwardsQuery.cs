using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Rostering;
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

/// <summary>
/// Filters out any award with no verified IAwardRateCalculator behind it
/// (currently MA000058 — see CasualLoadingStackingMode.Unverified) so it
/// can never be selected in Settings, not just silently mispriced if
/// selected. See docs/award-calculator-routing-fix.md.
/// </summary>
public sealed class GetAvailableAwardsQueryHandler(
    IAwardReferenceDataLookup referenceDataLookup,
    IAwardRateCalculatorFactory calculatorFactory)
    : IRequestHandler<GetAvailableAwardsQuery, IReadOnlyList<AwardDto>>
{
    public async Task<IReadOnlyList<AwardDto>> Handle(GetAvailableAwardsQuery request, CancellationToken cancellationToken)
    {
        var awards = await referenceDataLookup.GetAvailableAwardsAsync(cancellationToken);
        return awards.Where(a => calculatorFactory.IsSupported(a.Id)).ToList();
    }
}
