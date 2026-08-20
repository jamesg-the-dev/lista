using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Timekeeping;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Staff-facing clock in/out — the counterpart to StaffShiftsController.
/// Routes don't fit api/[controller] (clock-in sits under /api/shifts,
/// clock-out under /api/time-entries), so every action overrides it with
/// an absolute "~/" route, same as RosterController/StaffShiftsController.
/// </summary>
[Authorize]
public sealed class TimeClockController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpPost("~/api/shifts/{id:guid}/clock-in")]
    public async Task<ActionResult<ApiResponse<TimeEntryDto>>> ClockIn(
        Guid id,
        ClockInRequest request,
        CancellationToken cancellationToken)
    {
        var command = new ClockInCommand(id, request.Latitude, request.Longitude, request.AccuracyMetres);
        var entry = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<TimeEntryDto>.Ok(entry));
    }

    [HttpPost("~/api/time-entries/{id:guid}/clock-out")]
    public async Task<ActionResult<ApiResponse<TimeEntryDto>>> ClockOut(
        Guid id,
        ClockOutRequest request,
        CancellationToken cancellationToken)
    {
        var command = new ClockOutCommand(id, request.Latitude, request.Longitude, request.AccuracyMetres);
        var entry = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<TimeEntryDto>.Ok(entry));
    }
}

public sealed record ClockInRequest(decimal Latitude, decimal Longitude, decimal AccuracyMetres);

public sealed record ClockOutRequest(decimal Latitude, decimal Longitude, decimal AccuracyMetres);
