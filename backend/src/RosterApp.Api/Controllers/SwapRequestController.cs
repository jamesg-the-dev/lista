using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Rostering;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Manager-facing inbox for staff-initiated swap requests — the
/// counterpart to StaffShiftsController. See CLAUDE.md: "manager-side
/// approval handled as an inbox rather than a separate screen."
/// </summary>
[Authorize]
public sealed class SwapRequestController(ISender mediator) : ApiControllerBase(mediator)
{
    // Only "pending" is implemented — see ISwapRequestLookup's doc comment.
    [HttpGet("~/api/venues/{venueId:guid}/swap-requests")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SwapRequestDto>>>> GetPendingSwapsForVenue(
        Guid venueId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var swapRequests = await Mediator.Send(new GetPendingSwapsForVenueQuery(venueId), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<SwapRequestDto>>.Ok(swapRequests));
    }

    [HttpPost("~/api/swap-requests/{id:guid}/approve")]
    public async Task<ActionResult<ApiResponse<ShiftDto>>> ApproveSwap(Guid id, CancellationToken cancellationToken)
    {
        var shift = await Mediator.Send(new ApproveSwapCommand(id), cancellationToken);
        return Ok(ApiResponse<ShiftDto>.Ok(shift));
    }

    [HttpPost("~/api/swap-requests/{id:guid}/reject")]
    public async Task<ActionResult<ApiResponse<SwapRequestDto>>> RejectSwap(
        Guid id,
        RejectSwapRequest request,
        CancellationToken cancellationToken)
    {
        var swapRequest = await Mediator.Send(new RejectSwapCommand(id, request.Reason), cancellationToken);
        return Ok(ApiResponse<SwapRequestDto>.Ok(swapRequest));
    }
}

public sealed record RejectSwapRequest(string? Reason);
