using RosterApp.Infrastructure.AwardConfig;
using RosterApp.Infrastructure.RosterCompliance;

namespace RosterApp.Infrastructure;

/// <summary>
/// Single entry point for every idempotent reference-data seeder — called
/// from Program.cs on app start, after migrations have already been applied
/// via `dotnet ef database update`. Each seeder checks for existing rows
/// before inserting, so calling this on every start is safe and cheap once
/// seeded (one no-op existence check per seeder). See
/// AwardReferenceDataSeeder's doc comment for why this replaced
/// migration-embedded InsertData.
/// </summary>
public static class DatabaseSeeder
{
    public static async Task SeedAsync(RosterDbContext dbContext, CancellationToken cancellationToken = default)
    {
        await AwardReferenceDataSeeder.SeedAsync(dbContext, cancellationToken);
        await PublicHolidayReferenceDataSeeder.SeedAsync(dbContext, cancellationToken);
    }
}
