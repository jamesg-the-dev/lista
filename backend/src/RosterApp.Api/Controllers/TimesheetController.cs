using System.ComponentModel.DataAnnotations;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Timekeeping;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Manager-facing timesheet review — the flagged-variance inbox, the
/// rostered-vs-actual report, and the approve/adjust actions that resolve
/// a flagged entry before hours lock (CLAUDE.md Phase 6).
/// </summary>
[Authorize]
public sealed class TimesheetController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet("~/api/venues/{venueId:guid}/time-entries/flagged")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<TimeEntryDto>>>> GetFlaggedTimeEntries(
        Guid venueId,
        CancellationToken cancellationToken
    )
    {
        var entries = await Mediator.Send(
            new GetFlaggedTimeEntriesQuery(venueId),
            cancellationToken
        );
        return Ok(ApiResponse<IReadOnlyList<TimeEntryDto>>.Ok(entries));
    }

    [HttpGet("~/api/venues/{venueId:guid}/time-entries/variance")]
    public async Task<
        ActionResult<ApiResponse<IReadOnlyList<ShiftVarianceDto>>>
    > GetActualVsRostered(
        Guid venueId,
        [Required] [FromQuery] DateOnly weekStart,
        CancellationToken cancellationToken
    )
    {
        var variance = await Mediator.Send(
            new GetActualVsRosteredQuery(venueId, weekStart),
            cancellationToken
        );
        return Ok(ApiResponse<IReadOnlyList<ShiftVarianceDto>>.Ok(variance));
    }

    [HttpPost("~/api/time-entries/{id:guid}/approve")]
    public async Task<ActionResult<ApiResponse<TimeEntryDto>>> ApproveTimeEntry(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        var entry = await Mediator.Send(new ApproveTimeEntryCommand(id), cancellationToken);
        return Ok(ApiResponse<TimeEntryDto>.Ok(entry));
    }

    [HttpPost("~/api/time-entries/{id:guid}/adjust")]
    public async Task<ActionResult<ApiResponse<TimeEntryDto>>> AdjustTimeEntry(
        Guid id,
        AdjustTimeEntryRequest request,
        CancellationToken cancellationToken
    )
    {
        var command = new AdjustTimeEntryCommand(
            id,
            request.ClockInUtc,
            request.ClockOutUtc,
            request.Reason
        );
        var entry = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<TimeEntryDto>.Ok(entry));
    }
}

public sealed record AdjustTimeEntryRequest(
    DateTime ClockInUtc,
    DateTime ClockOutUtc,
    string Reason
);
