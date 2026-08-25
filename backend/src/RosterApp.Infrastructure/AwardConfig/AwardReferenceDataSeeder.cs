using Microsoft.EntityFrameworkCore;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Infrastructure.AwardConfig;

/// <summary>
/// Seeds the system-maintained award reference data (AwardDefinition,
/// AwardClassificationDefinition, AwardRate + penalty multipliers) — see
/// AwardReferenceDataSeed for the single source of truth on the ids and
/// figures inserted here. Runs as an idempotent startup step (see
/// Program.cs/DatabaseSeeder) rather than migration-embedded InsertData —
/// pulled out so schema migrations can be squashed to a clean baseline
/// without re-embedding seed rows, and so a reference-data correction (a
/// new award, a corrected rate) is a data change, not a migration. Checks
/// for an existing AwardDefinition before inserting anything, since it has
/// no migrations-history table backing a "runs exactly once" guarantee the
/// way InsertData did.
/// </summary>
public static class AwardReferenceDataSeeder
{
    public static async Task SeedAsync(RosterDbContext dbContext, CancellationToken cancellationToken = default)
    {
        if (await dbContext.AwardDefinitions.AnyAsync(cancellationToken))
        {
            return;
        }

        dbContext.AwardDefinitions.AddRange(
            AwardDefinition.Create(AwardReferenceDataSeed.HospitalityGeneralAwardId, "MA000009", "Hospitality Industry (General) Award", "National"),
            AwardDefinition.Create(AwardReferenceDataSeed.RestaurantIndustryAwardId, "MA000119", "Restaurant Industry Award", "National"),
            AwardDefinition.Create(AwardReferenceDataSeed.RegisteredClubsAwardId, "MA000058", "Registered and Licensed Clubs Award", "National"),
            AwardDefinition.Create(AwardReferenceDataSeed.FastFoodIndustryAwardId, "MA000003", "Fast Food Industry Award", "National"));

        foreach (var classification in AwardReferenceDataSeed.HospitalityGeneralClassifications)
        {
            dbContext.AwardClassificationDefinitions.Add(
                AwardClassificationDefinition.Create(
                    classification.ClassificationId,
                    AwardReferenceDataSeed.HospitalityGeneralAwardId,
                    classification.Name,
                    description: null));

            var penaltyMultipliers = AwardReferenceDataSeed.HospitalityGeneralPenaltyMultipliers
                .Select(m => PenaltyMultiplier.Create(m.Type, m.Multiplier));

            dbContext.AwardRates.Add(
                AwardRate.Create(
                    classification.RateId,
                    classification.ClassificationId,
                    AwardReferenceDataSeed.CurrentRatesEffectiveFromUtc,
                    classification.BaseHourlyRate,
                    AwardReferenceDataSeed.HospitalityGeneralCasualLoadingPercentMin,
                    penaltyMultipliers));
        }

        foreach (var version in AwardReferenceDataSeed.CalculationRateVersions)
        {
            dbContext.AwardCalculationRateVersions.Add(
                AwardCalculationRateVersion.Create(
                    version.VersionId,
                    version.AwardId,
                    version.EffectiveFromUtc,
                    version.CasualLoadingPercent,
                    version.PenaltyMultipliers.Select(m => PenaltyMultiplier.Create(m.Type, m.Multiplier))));
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
