using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAwardCalculationRateVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AwardCalculationRateVersions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AwardId = table.Column<Guid>(type: "uuid", nullable: false),
                    EffectiveFromUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveToUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CasualLoadingPercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardCalculationRateVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AwardCalculationRateVersions_AwardDefinitions_AwardId",
                        column: x => x.AwardId,
                        principalTable: "AwardDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AwardCalculationRatePenaltyMultipliers",
                columns: table => new
                {
                    AwardCalculationRateVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PenaltyType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Multiplier = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardCalculationRatePenaltyMultipliers", x => new { x.AwardCalculationRateVersionId, x.Id });
                    table.ForeignKey(
                        name: "FK_AwardCalculationRatePenaltyMultipliers_AwardCalculationRate~",
                        column: x => x.AwardCalculationRateVersionId,
                        principalTable: "AwardCalculationRateVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AwardCalculationRateVersions_AwardId_Active",
                table: "AwardCalculationRateVersions",
                column: "AwardId",
                unique: true,
                filter: "\"EffectiveToUtc\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AwardCalculationRatePenaltyMultipliers");

            migrationBuilder.DropTable(
                name: "AwardCalculationRateVersions");
        }
    }
}
