using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore.Migrations;
using RosterApp.Infrastructure.RosterCompliance;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <summary>
    /// Seeds the system-maintained public holiday reference data — see
    /// PublicHolidayReferenceDataSeed for the single source of truth on the
    /// ids and dates inserted here, and its doc comment for why only the
    /// 2026 calendar year is seeded in MVP.
    /// </summary>
    public partial class SeedPublicHolidayReferenceData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "PublicHolidays",
                columns: ["Id", "State", "Date", "Name", "IsNational"],
                values: To2D(
                    PublicHolidayReferenceDataSeed.AllSeeds
                        .Select(s => new object[] { s.Id, s.State.ToString(), s.Date, s.Name, s.IsNational })
                        .ToList()));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM \"PublicHolidays\";");
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
