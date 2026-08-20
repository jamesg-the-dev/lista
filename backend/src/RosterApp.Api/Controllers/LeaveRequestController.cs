using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Staffing;

namespace RosterApp.Api.Controllers;

[Authorize]
public sealed class LeaveRequestController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpPost("~/api/staff/{id:guid}/leave-requests")]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> SubmitLeaveRequest(
        Guid id,
        SubmitLeaveRequestRequest request,
        CancellationToken cancellationToken
    )
    {
        var command = new SubmitLeaveRequestCommand(
            id,
            request.StartDate,
            request.EndDate,
            request.Reason
        );
        var leaveRequest = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<LeaveRequestDto>.Ok(leaveRequest));
    }

    [HttpPost("~/api/leave-requests/{id:guid}/approve")]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> ApproveLeaveRequest(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        var leaveRequest = await Mediator.Send(
            new ApproveLeaveRequestCommand(id),
            cancellationToken
        );
        return Ok(ApiResponse<LeaveRequestDto>.Ok(leaveRequest));
    }

    [HttpPost("~/api/leave-requests/{id:guid}/decline")]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> DeclineLeaveRequest(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        var leaveRequest = await Mediator.Send(
            new DeclineLeaveRequestCommand(id),
            cancellationToken
        );
        return Ok(ApiResponse<LeaveRequestDto>.Ok(leaveRequest));
    }
}

public sealed record SubmitLeaveRequestRequest(
    DateOnly StartDate,
    DateOnly EndDate,
    string? Reason
);
