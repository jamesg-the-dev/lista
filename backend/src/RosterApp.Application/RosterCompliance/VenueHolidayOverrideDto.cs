using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Application.RosterCompliance;

public sealed record VenueHolidayOverrideDto(Guid Id, Guid VenueId, DateOnly OverrideDate, string Name, Guid CreatedByManagerId, DateTime CreatedAtUtc)
{
    public static VenueHolidayOverrideDto FromDomain(VenueHolidayOverride entity) =>
        new(entity.Id, entity.VenueId, entity.OverrideDate, entity.Name, entity.CreatedByManagerId, entity.CreatedAtUtc);
}
