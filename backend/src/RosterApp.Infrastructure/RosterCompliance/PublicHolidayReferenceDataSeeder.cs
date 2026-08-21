using Microsoft.EntityFrameworkCore;
using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Infrastructure.RosterCompliance;

/// <summary>
/// Seeds the system-maintained public holiday reference data — see
/// PublicHolidayReferenceDataSeed for the single source of truth on the
/// ids/dates inserted here. Same idempotent-startup-step rationale as
/// AwardReferenceDataSeeder (see its doc comment) rather than
/// migration-embedded InsertData.
/// </summary>
public static class PublicHolidayReferenceDataSeeder
{
    public static async Task SeedAsync(RosterDbContext dbContext, CancellationToken cancellationToken = default)
    {
        if (await dbContext.PublicHolidays.AnyAsync(cancellationToken))
        {
            return;
        }

        var holidays = PublicHolidayReferenceDataSeed.AllSeeds
            .Select(s => PublicHoliday.Create(s.Id, s.State, s.Date, s.Name, s.IsNational));

        dbContext.PublicHolidays.AddRange(holidays);

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
