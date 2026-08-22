using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.LabourCost;

public sealed record GetCostByVenueQuery(Guid OrganisationId, DateOnly WeekStart)
    : IRequest<IReadOnlyList<CostByVenueDto>>,
        IOrganisationScopedRequest,
        IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class GetCostByVenueQueryHandler(ILabourCostLookup labourCostLookup)
    : IRequestHandler<GetCostByVenueQuery, IReadOnlyList<CostByVenueDto>>
{
    public Task<IReadOnlyList<CostByVenueDto>> Handle(GetCostByVenueQuery request, CancellationToken cancellationToken) =>
        labourCostLookup.GetCostByVenueAsync(request.OrganisationId, request.WeekStart, cancellationToken);
}

/// <summary>
/// One row per Venue owned by the organisation, including venues with no
/// shifts in the week (TotalCost 0) — unlike CostByRoleDto, the venue list
/// is a fixed set the org owns, so omitting a quiet venue would read as a
/// missing row rather than "nothing rostered here".
/// </summary>
public sealed record CostByVenueDto(
    Guid VenueId,
    string VenueName,
    decimal TotalCost);
