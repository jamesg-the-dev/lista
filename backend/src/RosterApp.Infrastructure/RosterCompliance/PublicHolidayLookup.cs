using Microsoft.EntityFrameworkCore;
using RosterApp.Application.RosterCompliance;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Infrastructure.RosterCompliance;

public sealed class PublicHolidayLookup(RosterDbContext dbContext) : IPublicHolidayLookup
{
    public async Task<IReadOnlyList<PublicHolidayDto>> GetForStateAsync(string state, DateOnly from, DateOnly to, CancellationToken cancellationToken)
    {
        var parsedState = Enum.Parse<AustralianState>(state);

        var holidays = await dbContext.PublicHolidays
            .AsNoTracking()
            .Where(h => h.State == parsedState && h.Date >= from && h.Date <= to)
            .OrderBy(h => h.Date)
            .ToListAsync(cancellationToken);

        return holidays.Select(PublicHolidayDto.FromDomain).ToList();
    }
}
