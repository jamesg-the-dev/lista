using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicHolidayAndFlatDollarLoading : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AwardCalculationRateFlatDollarLoadings",
                columns: table => new
                {
                    AwardCalculationRateVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PenaltyType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    DollarPerHour = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardCalculationRateFlatDollarLoadings", x => new { x.AwardCalculationRateVersionId, x.Id });
                    table.ForeignKey(
                        name: "FK_AwardCalculationRateFlatDollarLoadings_AwardCalculationRate~",
                        column: x => x.AwardCalculationRateVersionId,
                        principalTable: "AwardCalculationRateVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AwardCalculationRateFlatDollarLoadings");
        }
    }
}
