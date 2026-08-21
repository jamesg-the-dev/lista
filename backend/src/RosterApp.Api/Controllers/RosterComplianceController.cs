using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.RosterCompliance;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Roster Rules &amp; Compliance settings
/// (docs/features/FEATURE_SETTINGS_ROSTER_RULES_COMPLIANCE.md). Per-venue
/// reads/writes under /api/venues/{venueId}, same as AwardConfigurationController;
/// the public holiday reference-data list is global (keyed by state, not
/// venue), so it gets its own top-level route, same treatment as /api/awards.
/// </summary>
[Authorize]
public sealed class RosterComplianceController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet("~/api/venues/{venueId:guid}/roster-compliance-configuration")]
    public async Task<ActionResult<ApiResponse<RosterComplianceConfigurationDto?>>> GetActiveRosterComplianceConfiguration(
        Guid venueId,
        CancellationToken cancellationToken)
    {
        var config = await Mediator.Send(new GetActiveRosterComplianceConfigurationQuery(venueId), cancellationToken);
        return Ok(ApiResponse<RosterComplianceConfigurationDto?>.Ok(config));
    }

    [HttpGet("~/api/venues/{venueId:guid}/roster-compliance-configuration/history")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RosterComplianceConfigurationDto>>>> GetRosterComplianceConfigurationHistory(
        Guid venueId,
        CancellationToken cancellationToken)
    {
        var history = await Mediator.Send(new GetRosterComplianceConfigurationHistoryQuery(venueId), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<RosterComplianceConfigurationDto>>.Ok(history));
    }

    [HttpPut("~/api/venues/{venueId:guid}/roster-compliance-configuration")]
    public async Task<ActionResult<ApiResponse<RosterComplianceConfigurationDto>>> UpdateRosterComplianceConfiguration(
        Guid venueId,
        UpdateRosterComplianceConfigurationRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateRosterComplianceConfigurationCommand(
            venueId,
            request.MinShiftLengthMinutes,
            request.MaxShiftLengthMinutes,
            request.MinRestBetweenShiftsMinutes,
            request.WeeklyOvertimeThresholdMinutes,
            request.MinorRules,
            request.MealBreakRules);

        var config = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<RosterComplianceConfigurationDto>.Ok(config));
    }

    [HttpGet("~/api/public-holidays")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PublicHolidayDto>>>> GetPublicHolidays(
        [FromQuery] string state,
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        CancellationToken cancellationToken)
    {
        var holidays = await Mediator.Send(new GetPublicHolidaysQuery(state, from, to), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PublicHolidayDto>>.Ok(holidays));
    }

    [HttpGet("~/api/venues/{venueId:guid}/holiday-overrides")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<VenueHolidayOverrideDto>>>> GetVenueHolidayOverrides(
        Guid venueId,
        CancellationToken cancellationToken)
    {
        var overrides = await Mediator.Send(new GetVenueHolidayOverridesQuery(venueId), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<VenueHolidayOverrideDto>>.Ok(overrides));
    }

    [HttpPost("~/api/venues/{venueId:guid}/holiday-overrides")]
    public async Task<ActionResult<ApiResponse<VenueHolidayOverrideDto>>> AddVenueHolidayOverride(
        Guid venueId,
        AddVenueHolidayOverrideRequest request,
        CancellationToken cancellationToken)
    {
        var command = new AddVenueHolidayOverrideCommand(venueId, request.OverrideDate, request.Name);
        var venueHolidayOverride = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<VenueHolidayOverrideDto>.Ok(venueHolidayOverride));
    }
}

public sealed record UpdateRosterComplianceConfigurationRequest(
    int MinShiftLengthMinutes,
    int MaxShiftLengthMinutes,
    int MinRestBetweenShiftsMinutes,
    int WeeklyOvertimeThresholdMinutes,
    MinorRosterRuleInput MinorRules,
    IReadOnlyList<MealBreakRuleInput> MealBreakRules
);

public sealed record AddVenueHolidayOverrideRequest(DateOnly OverrideDate, string Name);
