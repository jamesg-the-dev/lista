using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.Staffing;

public sealed class StaffAvailabilityChecker(RosterDbContext dbContext) : IStaffAvailabilityChecker
{
    public async Task<bool> IsAvailableAsync(Guid staffMemberId, DateOnly shiftDate, CancellationToken cancellationToken)
    {
        var weekday = ToWeekday(shiftDate.DayOfWeek);

        var hasAllDayUnavailability = await dbContext.StandingUnavailabilities
            .AsNoTracking()
            .AnyAsync(u => u.StaffMemberId == staffMemberId && u.DayOfWeek == weekday && u.IsAllDay, cancellationToken);

        if (hasAllDayUnavailability)
        {
            return false;
        }

        var hasApprovedLeave = await dbContext.LeaveRequests
            .AsNoTracking()
            .AnyAsync(l => l.StaffMemberId == staffMemberId
                && l.Status == LeaveRequestStatus.Approved
                && l.StartDate <= shiftDate
                && l.EndDate >= shiftDate, cancellationToken);

        return !hasApprovedLeave;
    }

    private static Weekday ToWeekday(DayOfWeek dayOfWeek) => dayOfWeek switch
    {
        DayOfWeek.Monday => Weekday.Monday,
        DayOfWeek.Tuesday => Weekday.Tuesday,
        DayOfWeek.Wednesday => Weekday.Wednesday,
        DayOfWeek.Thursday => Weekday.Thursday,
        DayOfWeek.Friday => Weekday.Friday,
        DayOfWeek.Saturday => Weekday.Saturday,
        DayOfWeek.Sunday => Weekday.Sunday,
        _ => throw new ArgumentOutOfRangeException(nameof(dayOfWeek)),
    };
}
