using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Application.RosterCompliance;

public sealed record PublicHolidayDto(Guid Id, string State, DateOnly Date, string Name, bool IsNational)
{
    public static PublicHolidayDto FromDomain(PublicHoliday holiday) =>
        new(holiday.Id, holiday.State.ToString(), holiday.Date, holiday.Name, holiday.IsNational);
}
