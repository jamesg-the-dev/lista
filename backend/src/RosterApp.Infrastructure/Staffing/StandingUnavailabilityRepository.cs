using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.Staffing;

public sealed class StandingUnavailabilityRepository(RosterDbContext dbContext) : IStandingUnavailabilityRepository
{
    public Task<StandingUnavailability?> GetByIdAsync(Guid unavailabilityId, CancellationToken cancellationToken) =>
        dbContext.StandingUnavailabilities.FirstOrDefaultAsync(u => u.Id == unavailabilityId, cancellationToken);

    public Task<StandingUnavailability?> GetByStaffAndDayAsync(
        Guid staffMemberId,
        Weekday dayOfWeek,
        CancellationToken cancellationToken) =>
        dbContext.StandingUnavailabilities.FirstOrDefaultAsync(
            u => u.StaffMemberId == staffMemberId && u.DayOfWeek == dayOfWeek,
            cancellationToken);

    public void Add(StandingUnavailability unavailability) => dbContext.StandingUnavailabilities.Add(unavailability);

    public void Remove(StandingUnavailability unavailability) => dbContext.StandingUnavailabilities.Remove(unavailability);
}
