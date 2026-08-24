using RosterApp.Domain.Tenancy;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Application.Tenancy;

public sealed record AddressDto(string Line1, string? Line2, string Suburb, string State, string Postcode, string Country)
{
    public static AddressDto FromDomain(Address address) =>
        new(address.Line1, address.Line2, address.Suburb, address.State.ToString(), address.Postcode, address.Country);
}

public sealed record TradingHourSessionDto(
    string DayOfWeek,
    string? SessionLabel,
    TimeOnly? OpenTime,
    TimeOnly? CloseTime,
    bool IsClosed,
    bool CrossesMidnight)
{
    public static TradingHourSessionDto FromDomain(TradingHourSession session) =>
        new(
            session.DayOfWeek.ToString(),
            session.SessionLabel,
            session.OpenTime,
            session.CloseTime,
            session.IsClosed,
            session.CrossesMidnight);
}

public sealed record VenueAvailabilitySettingsDto(string SelfServiceMode, int AdvanceNoticeDays)
{
    public static VenueAvailabilitySettingsDto FromDomain(VenueAvailabilitySettings settings) =>
        new(settings.SelfServiceMode.ToString(), settings.AdvanceNoticeDays);
}

public sealed record VenueDto(
    Guid Id,
    Guid OrganisationId,
    string Name,
    string? Abn,
    AddressDto? Address,
    string Timezone,
    bool IsActive,
    decimal? ForecastSalesTarget,
    IReadOnlyList<TradingHourSessionDto> TradingHours,
    VenueAvailabilitySettingsDto AvailabilitySettings)
{
    public static VenueDto FromDomain(Venue venue) =>
        new(
            venue.Id,
            venue.OrganisationId,
            venue.Name,
            venue.Abn?.Value,
            venue.Address is null ? null : AddressDto.FromDomain(venue.Address),
            venue.Timezone,
            venue.IsActive,
            venue.ForecastSalesTarget,
            venue.TradingHours.Select(TradingHourSessionDto.FromDomain).ToList(),
            VenueAvailabilitySettingsDto.FromDomain(venue.AvailabilitySettings));
}
