using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.LabourCost;

public sealed record GetCostByRoleQuery(Guid VenueId, DateOnly WeekStart)
    : IRequest<IReadOnlyList<CostByRoleDto>>,
        IVenueScopedRequest,
        IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class GetCostByRoleQueryHandler(ILabourCostLookup labourCostLookup)
    : IRequestHandler<GetCostByRoleQuery, IReadOnlyList<CostByRoleDto>>
{
    public Task<IReadOnlyList<CostByRoleDto>> Handle(GetCostByRoleQuery request, CancellationToken cancellationToken) =>
        labourCostLookup.GetCostByRoleAsync(request.VenueId, request.WeekStart, cancellationToken);
}

/// <summary>
/// One row per AwardClassification with at least one shift in the week;
/// classifications with no shifts are omitted rather than shown at zero,
/// since "role" here is StaffMember.Classification, not a fixed roster of
/// positions the venue always staffs.
/// </summary>
public sealed record CostByRoleDto(
    string Classification, // AwardClassification member name — see CLAUDE.md "Wire format for enums"
    decimal TotalCost);
