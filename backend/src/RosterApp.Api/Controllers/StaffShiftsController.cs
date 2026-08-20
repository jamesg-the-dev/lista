using System.ComponentModel.DataAnnotations;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Rostering;
using RosterApp.Application.Staffing;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Staff-facing side of Phase 5 — the counterpart to RosterController's
/// manager-facing shift routes. Routes don't fit api/[controller] (staff's
/// own view sits under /api/staff/me, swap actions under /api/shifts and
/// /api/swap-requests), so every action overrides it, same as RosterController.
/// </summary>
[Authorize]
public sealed class StaffShiftsController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet("~/api/staff/me/shifts")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ShiftDto>>>> GetMyShifts(
        [Required] [FromQuery] DateOnly from,
        [Required] [FromQuery] DateOnly to,
        CancellationToken cancellationToken)
    {
        var shifts = await Mediator.Send(new GetMyShiftsQuery(from, to), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ShiftDto>>.Ok(shifts));
    }

    [HttpPost("~/api/shifts/{id:guid}/swap-requests")]
    public async Task<ActionResult<ApiResponse<SwapRequestDto>>> RequestSwap(
        Guid id,
        RequestSwapRequest request,
        CancellationToken cancellationToken)
    {
        var command = new RequestSwapCommand(id, request.TargetStaffId, request.Reason);
        var swapRequest = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<SwapRequestDto>.Ok(swapRequest));
    }

    [HttpPost("~/api/swap-requests/{id:guid}/respond")]
    public async Task<ActionResult<ApiResponse<SwapRequestDto>>> RespondToSwap(
        Guid id,
        RespondToSwapRequest request,
        CancellationToken cancellationToken)
    {
        var command = new RespondToSwapCommand(id, request.Accepted);
        var swapRequest = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<SwapRequestDto>.Ok(swapRequest));
    }

    /// <summary>
    /// Not in docs/backend-step-by-step.md's Phase 5 route table — see
    /// LinkStaffSupabaseAccountCommand's doc comment for why it's needed
    /// alongside the routes that are.
    /// </summary>
    [HttpPost("~/api/staff/me/link-account")]
    public async Task<ActionResult<ApiResponse<StaffMemberDto>>> LinkAccount(CancellationToken cancellationToken)
    {
        var staff = await Mediator.Send(new LinkStaffSupabaseAccountCommand(), cancellationToken);
        return Ok(ApiResponse<StaffMemberDto>.Ok(staff));
    }
}

public sealed record RequestSwapRequest(Guid TargetStaffId, string? Reason);

public sealed record RespondToSwapRequest(bool Accepted);
