using System.ComponentModel.DataAnnotations;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.LabourCost;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Reporting layer over Phase 1-3 data — no writes here, see CLAUDE.md
/// build order step 4. Routes are nested under /api/venues/{venueId} and
/// /api/organisations/{orgId}, so every action overrides the inherited
/// api/[controller] route with an absolute "~/" route, same as
/// RosterController.
/// </summary>
[Authorize]
public sealed class LabourCostController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet("~/api/venues/{venueId:guid}/labour-cost/trend")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CostTrendPointDto>>>> GetCostTrend(
        Guid venueId,
        [Required] [FromQuery] DateOnly from,
        [Required] [FromQuery] DateOnly to,
        CancellationToken cancellationToken
    )
    {
        var trend = await Mediator.Send(new GetCostTrendQuery(venueId, from, to), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CostTrendPointDto>>.Ok(trend));
    }

    [HttpGet("~/api/venues/{venueId:guid}/labour-cost/by-role")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CostByRoleDto>>>> GetCostByRole(
        Guid venueId,
        [Required] [FromQuery] DateOnly weekStart,
        CancellationToken cancellationToken
    )
    {
        var costByRole = await Mediator.Send(new GetCostByRoleQuery(venueId, weekStart), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CostByRoleDto>>.Ok(costByRole));
    }

    [HttpGet("~/api/organisations/{orgId:guid}/labour-cost/by-venue")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CostByVenueDto>>>> GetCostByVenue(
        Guid orgId,
        [Required] [FromQuery] DateOnly weekStart,
        CancellationToken cancellationToken
    )
    {
        var costByVenue = await Mediator.Send(new GetCostByVenueQuery(orgId, weekStart), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CostByVenueDto>>.Ok(costByVenue));
    }
}
