using System.ComponentModel.DataAnnotations;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Staffing;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Routes don't fit the api/[controller] convention inherited from
/// ApiControllerBase (staff listing is nested under /api/venues/{venueId},
/// everything else — including creation, since a staff member can belong
/// to several venues and has no single owning route — sits directly under
/// /api/staff), so every action overrides it with an absolute "~/" route —
/// same rationale as RosterController.
/// </summary>
[Authorize]
public sealed class StaffController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet("~/api/venues/{venueId:guid}/staff")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<StaffMemberDto>>>> GetStaffForVenue(
        Guid venueId,
        CancellationToken cancellationToken)
    {
        var staff = await Mediator.Send(new GetStaffForVenueQuery(venueId), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<StaffMemberDto>>.Ok(staff));
    }

    [HttpPost("~/api/staff")]
    public async Task<ActionResult<ApiResponse<StaffMemberDto>>> CreateStaffMember(
        CreateStaffMemberRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateStaffMemberCommand(
            request.Name,
            request.Email,
            request.Phone,
            request.DateOfBirth,
            request.EmploymentType,
            request.Classification,
            request.MaxWeeklyHours,
            request.VenueIds,
            request.PermissionLevel,
            request.PrimaryRoleId);

        var staff = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<StaffMemberDto>.Ok(staff));
    }

    [HttpGet("~/api/staff/{id:guid}")]
    public async Task<ActionResult<ApiResponse<StaffMemberDto>>> GetStaffMember(Guid id, CancellationToken cancellationToken)
    {
        var staff = await Mediator.Send(new GetStaffMemberByIdQuery(id), cancellationToken);
        return Ok(ApiResponse<StaffMemberDto>.Ok(staff));
    }

    [HttpPut("~/api/staff/{id:guid}")]
    public async Task<ActionResult<ApiResponse<StaffMemberDto>>> UpdateStaffMember(
        Guid id,
        UpdateStaffMemberRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateStaffMemberCommand(
            id,
            request.Name,
            request.Email,
            request.Phone,
            request.DateOfBirth,
            request.EmploymentType,
            request.Classification,
            request.MaxWeeklyHours,
            request.VenueIds,
            request.PrimaryRoleId);

        var staff = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<StaffMemberDto>.Ok(staff));
    }

    [HttpPut("~/api/staff/{id:guid}/permission-level")]
    public async Task<ActionResult<ApiResponse<StaffMemberDto>>> UpdateStaffPermissionLevel(
        Guid id,
        UpdateStaffPermissionLevelRequest request,
        CancellationToken cancellationToken)
    {
        var staff = await Mediator.Send(new UpdateStaffPermissionLevelCommand(id, request.PermissionLevel), cancellationToken);
        return Ok(ApiResponse<StaffMemberDto>.Ok(staff));
    }

    [HttpPut("~/api/staff/{id:guid}/pay-rate-override")]
    public async Task<ActionResult<ApiResponse<StaffMemberDto>>> SetStaffPayRateOverride(
        Guid id,
        SetStaffPayRateOverrideRequest request,
        CancellationToken cancellationToken)
    {
        var command = new SetStaffPayRateOverrideCommand(id, request.OverrideHourlyRate, request.Reason);
        var staff = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<StaffMemberDto>.Ok(staff));
    }

    [HttpDelete("~/api/staff/{id:guid}/pay-rate-override")]
    public async Task<ActionResult<ApiResponse<StaffMemberDto>>> ClearStaffPayRateOverride(
        Guid id,
        CancellationToken cancellationToken)
    {
        var staff = await Mediator.Send(new ClearStaffPayRateOverrideCommand(id), cancellationToken);
        return Ok(ApiResponse<StaffMemberDto>.Ok(staff));
    }

    [HttpPost("~/api/staff/{id:guid}/deactivate")]
    public async Task<ActionResult> DeactivateStaffMember(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeactivateStaffMemberCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpGet("~/api/staff/{id:guid}/availability")]
    public async Task<ActionResult<ApiResponse<StaffAvailabilityDto>>> GetAvailability(
        Guid id,
        [Required] [FromQuery] DateOnly from,
        [Required] [FromQuery] DateOnly to,
        CancellationToken cancellationToken)
    {
        var availability = await Mediator.Send(new GetStaffAvailabilityQuery(id, from, to), cancellationToken);
        return Ok(ApiResponse<StaffAvailabilityDto>.Ok(availability));
    }

    [HttpPost("~/api/staff/{id:guid}/unavailability")]
    public async Task<ActionResult<ApiResponse<AvailabilityExceptionDto>>> SetStandingUnavailability(
        Guid id,
        SetStandingUnavailabilityRequest request,
        CancellationToken cancellationToken)
    {
        var command = new SetStandingUnavailabilityCommand(id, request.DayOfWeek, request.IsAllDay, request.Blocks);
        var exception = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<AvailabilityExceptionDto>.Ok(exception));
    }

    [HttpDelete("~/api/staff/{id:guid}/unavailability/{exceptionId:guid}")]
    public async Task<ActionResult> RemoveStandingUnavailability(
        Guid id,
        Guid exceptionId,
        CancellationToken cancellationToken)
    {
        await Mediator.Send(new RemoveStandingUnavailabilityCommand(id, exceptionId), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateStaffMemberRequest(
    string Name,
    string Email,
    string Phone,
    DateOnly DateOfBirth,
    string EmploymentType,
    string Classification,
    int MaxWeeklyHours,
    IReadOnlyList<Guid> VenueIds,
    string PermissionLevel,
    Guid? PrimaryRoleId
);

public sealed record UpdateStaffMemberRequest(
    string Name,
    string Email,
    string Phone,
    DateOnly DateOfBirth,
    string EmploymentType,
    string Classification,
    int MaxWeeklyHours,
    IReadOnlyList<Guid> VenueIds,
    Guid? PrimaryRoleId
);

public sealed record UpdateStaffPermissionLevelRequest(string PermissionLevel);

public sealed record SetStaffPayRateOverrideRequest(decimal OverrideHourlyRate, string Reason);

public sealed record SetStandingUnavailabilityRequest(string DayOfWeek, bool IsAllDay, IReadOnlyList<string> Blocks);
