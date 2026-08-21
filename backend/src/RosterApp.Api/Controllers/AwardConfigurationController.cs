using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.AwardConfig;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Award &amp; Pay settings (docs/features/FEATURE_SETTINGS_AWARD_PAY_CONFIG.md).
/// Per-venue reads/writes under /api/venues/{venueId}, same as
/// VenueController; the award reference-data list is global, not
/// venue-scoped, so it gets its own top-level route.
/// </summary>
[Authorize]
public sealed class AwardConfigurationController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet("~/api/awards")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AwardDto>>>> GetAvailableAwards(CancellationToken cancellationToken)
    {
        var awards = await Mediator.Send(new GetAvailableAwardsQuery(), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AwardDto>>.Ok(awards));
    }

    [HttpGet("~/api/venues/{venueId:guid}/award-configuration")]
    public async Task<ActionResult<ApiResponse<AwardConfigurationDto?>>> GetActiveAwardConfiguration(
        Guid venueId,
        CancellationToken cancellationToken)
    {
        var config = await Mediator.Send(new GetActiveAwardConfigurationQuery(venueId), cancellationToken);
        return Ok(ApiResponse<AwardConfigurationDto?>.Ok(config));
    }

    [HttpGet("~/api/venues/{venueId:guid}/award-configuration/history")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AwardConfigurationDto>>>> GetAwardConfigurationHistory(
        Guid venueId,
        CancellationToken cancellationToken)
    {
        var history = await Mediator.Send(new GetAwardConfigurationHistoryQuery(venueId), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AwardConfigurationDto>>.Ok(history));
    }

    [HttpPut("~/api/venues/{venueId:guid}/award-configuration")]
    public async Task<ActionResult<ApiResponse<AwardConfigurationDto>>> UpdateAwardConfiguration(
        Guid venueId,
        UpdateAwardConfigurationRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateAwardConfigurationCommand(
            venueId,
            request.AwardId,
            request.CasualLoadingPercent,
            request.SuperannuationRatePercent,
            request.ConfirmBelowMinimumSuper,
            request.PayPeriod,
            request.PayPeriodCutoffDay,
            request.PenaltyToggles);

        var config = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<AwardConfigurationDto>.Ok(config));
    }

    [HttpGet("~/api/awards/{awardId:guid}/classifications")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AwardClassificationDto>>>> GetAwardClassifications(
        Guid awardId,
        CancellationToken cancellationToken)
    {
        var classifications = await Mediator.Send(new GetAwardClassificationsQuery(awardId), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AwardClassificationDto>>.Ok(classifications));
    }

    [HttpGet("~/api/venues/{venueId:guid}/role-award-mappings")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RoleAwardMappingDto>>>> GetRoleAwardMappings(
        Guid venueId,
        CancellationToken cancellationToken)
    {
        var mappings = await Mediator.Send(new GetRoleAwardMappingsForVenueQuery(venueId), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<RoleAwardMappingDto>>.Ok(mappings));
    }

    [HttpPut("~/api/venues/{venueId:guid}/role-award-mappings/{roleId:guid}")]
    public async Task<ActionResult<ApiResponse<RoleAwardMappingDto>>> SetRoleAwardMapping(
        Guid venueId,
        Guid roleId,
        SetRoleAwardMappingRequest request,
        CancellationToken cancellationToken)
    {
        var command = new SetRoleAwardMappingCommand(venueId, roleId, request.AwardClassificationId);
        var mapping = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<RoleAwardMappingDto>.Ok(mapping));
    }
}

public sealed record SetRoleAwardMappingRequest(Guid AwardClassificationId);

public sealed record UpdateAwardConfigurationRequest(
    Guid AwardId,
    decimal CasualLoadingPercent,
    decimal SuperannuationRatePercent,
    bool ConfirmBelowMinimumSuper,
    string PayPeriod,
    string PayPeriodCutoffDay,
    IReadOnlyList<PenaltyRateToggleInput> PenaltyToggles
);
