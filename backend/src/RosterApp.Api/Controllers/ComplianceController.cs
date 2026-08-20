using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Rostering;

namespace RosterApp.Api.Controllers;

[Authorize]
public sealed class ComplianceController(ISender mediator) : ApiControllerBase(mediator)
{
    // violationType is the exact ComplianceViolationType member name (e.g.
    // "InsufficientRest"), same wire convention as ShiftDto/
    // ComplianceViolationDto — validated against the enum's defined names in
    // OverrideComplianceViolationCommandValidator, not bound straight to the
    // domain enum type.
    [HttpPost("~/api/shifts/{id:guid}/compliance-violations/{violationType}/override")]
    public async Task<ActionResult<ApiResponse<ShiftDto>>> OverrideComplianceViolation(
        Guid id,
        string violationType,
        [FromQuery] Guid venueId,
        OverrideComplianceViolationRequest request,
        CancellationToken cancellationToken
    )
    {
        var command = new OverrideComplianceViolationCommand(id, venueId, violationType, request.Reason);
        var shift = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<ShiftDto>.Ok(shift));
    }
}

public sealed record OverrideComplianceViolationRequest(string Reason);
