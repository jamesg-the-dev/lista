using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Staffing;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Staff &amp; Roles settings — the Role half (docs/features/FEATURE_SETTINGS_STAFF_ROLES.md).
/// Roles are single-venue-scoped (unlike StaffMember, which can span
/// several), so creation and listing both nest under /api/venues/{venueId},
/// same route-nesting rationale as AwardConfigurationController.
/// </summary>
[Authorize]
public sealed class RoleController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet("~/api/venues/{venueId:guid}/roles")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RoleDto>>>> GetRolesForVenue(
        Guid venueId,
        CancellationToken cancellationToken)
    {
        var roles = await Mediator.Send(new GetRolesForVenueQuery(venueId), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<RoleDto>>.Ok(roles));
    }

    [HttpGet("~/api/venues/{venueId:guid}/roles/unmapped")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RoleDto>>>> GetUnmappedRoles(
        Guid venueId,
        CancellationToken cancellationToken)
    {
        var roles = await Mediator.Send(new GetUnmappedRolesQuery(venueId), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<RoleDto>>.Ok(roles));
    }

    [HttpPost("~/api/venues/{venueId:guid}/roles")]
    public async Task<ActionResult<ApiResponse<RoleDto>>> CreateRole(
        Guid venueId,
        CreateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var role = await Mediator.Send(new CreateRoleCommand(venueId, request.DisplayName, request.ColorTag), cancellationToken);
        return Ok(ApiResponse<RoleDto>.Ok(role));
    }

    [HttpPost("~/api/roles/{id:guid}/deactivate")]
    public async Task<ActionResult> DeactivateRole(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeactivateRoleCommand(id), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateRoleRequest(string DisplayName, string? ColorTag);
