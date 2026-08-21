using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore.Migrations;
using RosterApp.Infrastructure.AwardConfig;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <summary>
    /// Seeds the system-maintained award reference data (AwardDefinition,
    /// AwardClassificationDefinition, AwardRate + penalty multipliers) — see
    /// AwardReferenceDataSeed for the single source of truth on the ids and
    /// figures inserted here, and its doc comment for why only MA000009 gets
    /// real classification/rate rows in MVP.
    /// </summary>
    public partial class SeedAwardReferenceData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "AwardDefinitions",
                columns: ["Id", "AwardCode", "Name", "Jurisdiction"],
                values: To2D(
                [
                    [AwardReferenceDataSeed.HospitalityGeneralAwardId, "MA000009", "Hospitality Industry (General) Award", "National"],
                    [AwardReferenceDataSeed.RestaurantIndustryAwardId, "MA000119", "Restaurant Industry Award", "National"],
                    [AwardReferenceDataSeed.RegisteredClubsAwardId, "MA000058", "Registered and Licensed Clubs Award", "National"],
                    [AwardReferenceDataSeed.FastFoodIndustryAwardId, "MA000003", "Fast Food Industry Award", "National"],
                ]));

            migrationBuilder.InsertData(
                table: "AwardClassificationDefinitions",
                columns: ["Id", "AwardId", "Name", "Description"],
                values: To2D(
                    AwardReferenceDataSeed.HospitalityGeneralClassifications
                        .Select(c => new object[] { c.ClassificationId, AwardReferenceDataSeed.HospitalityGeneralAwardId, c.Name, null })
                        .ToList()));

            migrationBuilder.InsertData(
                table: "AwardRates",
                columns: ["Id", "AwardClassificationId", "EffectiveFromUtc", "EffectiveToUtc", "BaseHourlyRate", "CasualLoadingPercentMin"],
                values: To2D(
                    AwardReferenceDataSeed.HospitalityGeneralClassifications
                        .Select(c => new object[]
                        {
                            c.RateId,
                            c.ClassificationId,
                            AwardReferenceDataSeed.CurrentRatesEffectiveFromUtc,
                            null,
                            c.BaseHourlyRate,
                            AwardReferenceDataSeed.HospitalityGeneralCasualLoadingPercentMin,
                        })
                        .ToList()));

            var multiplierRows = new List<object[]>();
            var multiplierId = 1;
            foreach (var classification in AwardReferenceDataSeed.HospitalityGeneralClassifications)
            {
                foreach (var (type, multiplier) in AwardReferenceDataSeed.HospitalityGeneralPenaltyMultipliers)
                {
                    multiplierRows.Add([classification.RateId, multiplierId, type.ToString(), multiplier]);
                    multiplierId++;
                }
            }

            migrationBuilder.InsertData(
                table: "AwardRatePenaltyMultipliers",
                columns: ["AwardRateId", "Id", "PenaltyType", "Multiplier"],
                values: To2D(multiplierRows));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM \"AwardRatePenaltyMultipliers\";");
            migrationBuilder.Sql("DELETE FROM \"AwardRates\";");
            migrationBuilder.Sql("DELETE FROM \"AwardClassificationDefinitions\";");
            migrationBuilder.Sql("DELETE FROM \"AwardDefinitions\";");
        }

        private static object[,] To2D(IReadOnlyList<object[]> rows)
        {
            var columnCount = rows[0].Length;
            var result = new object[rows.Count, columnCount];
            for (var row = 0; row < rows.Count; row++)
            {
                for (var column = 0; column < columnCount; column++)
                {
                    result[row, column] = rows[row][column];
                }
            }

            return result;
        }
    }
}
