using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RosterApp.Api.Common;
using RosterApp.Application.Tenancy;

namespace RosterApp.Api.Controllers;

/// <summary>
/// Venue Profile settings (docs/features/FEATURE_SETTINGS_VENUE_PROFILE.md).
/// Creation and org-wide listing are nested under
/// /api/organisations/{organisationId}, per-venue reads/writes under
/// /api/venues/{venueId} — same org-vs-venue route split as
/// LabourCostController — so every action overrides the inherited
/// api/[controller] route with an absolute "~/" route.
/// </summary>
[Authorize]
public sealed class VenueController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet("~/api/organisations/{organisationId:guid}/venues")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<VenueDto>>>> GetVenuesForOrganisation(
        Guid organisationId,
        CancellationToken cancellationToken
    )
    {
        var venues = await Mediator.Send(
            new GetVenuesForOrganisationQuery(organisationId),
            cancellationToken
        );
        return Ok(ApiResponse<IReadOnlyList<VenueDto>>.Ok(venues));
    }

    [HttpPost("~/api/organisations/{organisationId:guid}/venues")]
    public async Task<ActionResult<ApiResponse<VenueDto>>> CreateVenue(
        Guid organisationId,
        CreateVenueRequest request,
        CancellationToken cancellationToken
    )
    {
        var command = new CreateVenueCommand(
            organisationId,
            request.Name,
            request.Abn,
            request.AddressLine1,
            request.AddressLine2,
            request.Suburb,
            request.State,
            request.Postcode,
            request.Country,
            request.Timezone
        );

        var venue = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<VenueDto>.Ok(venue));
    }

    [HttpGet("~/api/venues/{venueId:guid}/profile")]
    public async Task<ActionResult<ApiResponse<VenueDto>>> GetVenueProfile(
        Guid venueId,
        CancellationToken cancellationToken
    )
    {
        var venue = await Mediator.Send(new GetVenueProfileQuery(venueId), cancellationToken);
        return Ok(ApiResponse<VenueDto>.Ok(venue));
    }

    [HttpPut("~/api/venues/{venueId:guid}/profile")]
    public async Task<ActionResult<ApiResponse<VenueDto>>> UpdateVenueProfile(
        Guid venueId,
        UpdateVenueProfileRequest request,
        CancellationToken cancellationToken
    )
    {
        var command = new UpdateVenueProfileCommand(
            venueId,
            request.Name,
            request.Abn,
            request.AddressLine1,
            request.AddressLine2,
            request.Suburb,
            request.State,
            request.Postcode,
            request.Country,
            request.Timezone
        );

        var venue = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<VenueDto>.Ok(venue));
    }

    [HttpPut("~/api/venues/{venueId:guid}/trading-hours")]
    public async Task<ActionResult<ApiResponse<VenueDto>>> UpdateVenueTradingHours(
        Guid venueId,
        UpdateVenueTradingHoursRequest request,
        CancellationToken cancellationToken
    )
    {
        var command = new UpdateVenueTradingHoursCommand(venueId, request.Sessions);
        var venue = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<VenueDto>.Ok(venue));
    }

    [HttpPut("~/api/venues/{venueId:guid}/availability-settings")]
    public async Task<ActionResult<ApiResponse<VenueDto>>> UpdateVenueAvailabilitySettings(
        Guid venueId,
        UpdateVenueAvailabilitySettingsRequest request,
        CancellationToken cancellationToken
    )
    {
        var command = new UpdateVenueAvailabilitySettingsCommand(
            venueId,
            request.SelfServiceMode,
            request.AdvanceNoticeDays
        );
        var venue = await Mediator.Send(command, cancellationToken);
        return Ok(ApiResponse<VenueDto>.Ok(venue));
    }

    [HttpPost("~/api/venues/{venueId:guid}/deactivate")]
    public async Task<ActionResult> DeactivateVenue(
        Guid venueId,
        CancellationToken cancellationToken
    )
    {
        await Mediator.Send(new DeactivateVenueCommand(venueId), cancellationToken);
        return NoContent();
    }

}

public sealed record CreateVenueRequest(
    string Name,
    string? Abn,
    string AddressLine1,
    string? AddressLine2,
    string Suburb,
    string State,
    string Postcode,
    string Country,
    string Timezone
);

public sealed record UpdateVenueProfileRequest(
    string Name,
    string? Abn,
    string AddressLine1,
    string? AddressLine2,
    string Suburb,
    string State,
    string Postcode,
    string Country,
    string Timezone
);

public sealed record UpdateVenueTradingHoursRequest(
    IReadOnlyList<TradingHourSessionInput> Sessions
);

public sealed record UpdateVenueAvailabilitySettingsRequest(
    string SelfServiceMode,
    int AdvanceNoticeDays
);
