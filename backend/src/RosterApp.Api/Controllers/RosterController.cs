using System.ComponentModel.DataAnnotations;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Rostering;
using RosterApp.Application.Tenancy;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Routes don't fit the api/[controller] convention inherited from
/// ApiControllerBase (roster reads are nested under /api/venues/{venueId},
/// shift writes sit directly under /api/shifts), so every action overrides
/// it with an absolute "~/" route instead.
/// </summary>
[Authorize]
public sealed class RosterController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet("~/api/venues/{venueId:guid}/roster")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ShiftDto>>>> GetRosterForWeek(
        Guid venueId,
        [Required] [FromQuery] DateOnly weekStart,
        CancellationToken cancellationToken
    )
    {
        var shifts = await Mediator.Send(
            new GetRosterForWeekQuery(venueId, weekStart),
            cancellationToken
        );
        return Ok(ApiResponse<IReadOnlyList<ShiftDto>>.Ok(shifts));
    }

    [HttpPost("~/api/shifts")]
    public async Task<ActionResult<ApiResponse<ShiftDto>>> CreateShift(
        CreateShiftCommand command,
        CancellationToken cancellationToken
    )
    {
        var shift = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<ShiftDto>.Ok(shift));
    }

    [HttpPut("~/api/shifts/{id:guid}")]
    public async Task<ActionResult<ApiResponse<ShiftDto>>> UpdateShift(
        Guid id,
        UpdateShiftRequest request,
        CancellationToken cancellationToken
    )
    {
        var command = new UpdateShiftCommand(
            id,
            request.VenueId,
            request.EmployeeId,
            request.ShiftDate,
            request.Start,
            request.End,
            request.UnpaidBreakMinutes,
            request.BaseRatePerHour
        );

        var shift = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<ShiftDto>.Ok(shift));
    }

    [HttpDelete("~/api/shifts/{id:guid}")]
    public async Task<ActionResult> DeleteShift(
        Guid id,
        [FromQuery] Guid venueId,
        CancellationToken cancellationToken
    )
    {
        await Mediator.Send(new DeleteShiftCommand(id, venueId), cancellationToken);
        return NoContent();
    }

    [HttpGet("~/api/venues/{venueId:guid}/roster/budget-summary")]
    public async Task<ActionResult<ApiResponse<BudgetSummaryDto>>> GetBudgetSummary(
        Guid venueId,
        [Required] [FromQuery] DateOnly weekStart,
        CancellationToken cancellationToken
    )
    {
        var summary = await Mediator.Send(new GetBudgetSummaryQuery(venueId, weekStart), cancellationToken);
        return Ok(ApiResponse<BudgetSummaryDto>.Ok(summary));
    }

    [HttpPost("~/api/venues/{venueId:guid}/roster/duplicate")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ShiftDto>>>> DuplicateRoster(
        Guid venueId,
        DuplicateRosterRequest request,
        CancellationToken cancellationToken
    )
    {
        var command = new DuplicateRosterCommand(venueId, request.SourceWeekStart, request.TargetWeekStart);
        var shifts = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ShiftDto>>.Ok(shifts));
    }

    [HttpPut("~/api/venues/{venueId:guid}/roster/forecast-sales-target")]
    public async Task<ActionResult<ApiResponse<VenueDto>>> SetForecastSalesTarget(
        Guid venueId,
        SetVenueForecastSalesTargetRequest request,
        CancellationToken cancellationToken
    )
    {
        var command = new SetVenueForecastSalesTargetCommand(venueId, request.ForecastSalesTarget);
        var venue = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<VenueDto>.Ok(venue));
    }
}

/// <summary>
/// PUT body — ShiftId comes from the route rather than being duplicated in
/// the body, so this feeds UpdateShiftCommand alongside the route's id.
/// </summary>
public sealed record UpdateShiftRequest(
    Guid VenueId,
    Guid EmployeeId,
    DateOnly ShiftDate,
    TimeOnly Start,
    TimeOnly End,
    int UnpaidBreakMinutes,
    decimal BaseRatePerHour
);

public sealed record DuplicateRosterRequest(DateOnly SourceWeekStart, DateOnly TargetWeekStart);

/// <summary>
/// Not in docs/backend-step-by-step.md's Phase 3 route table (only the read
/// side, GetBudgetSummaryQuery, is listed there) — but Venue.ForecastSalesTarget
/// is specced as "weekly, editable" and needs some write path, so this fills
/// that gap on the same controller as the rest of the budget-bar routes.
/// </summary>
public sealed record SetVenueForecastSalesTargetRequest(decimal? ForecastSalesTarget);
