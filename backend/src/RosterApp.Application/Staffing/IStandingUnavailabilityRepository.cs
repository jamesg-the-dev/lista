using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

public interface IStandingUnavailabilityRepository
{
    Task<StandingUnavailability?> GetByIdAsync(Guid unavailabilityId, CancellationToken cancellationToken);

    Task<StandingUnavailability?> GetByStaffAndDayAsync(
        Guid staffMemberId,
        Weekday dayOfWeek,
        CancellationToken cancellationToken);

    void Add(StandingUnavailability unavailability);
    void Remove(StandingUnavailability unavailability);
}
