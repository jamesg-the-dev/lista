using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AwardPayConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AwardDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AwardCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Jurisdiction = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AwardClassificationDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AwardId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardClassificationDefinitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AwardClassificationDefinitions_AwardDefinitions_AwardId",
                        column: x => x.AwardId,
                        principalTable: "AwardDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AwardConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VenueId = table.Column<Guid>(type: "uuid", nullable: false),
                    AwardId = table.Column<Guid>(type: "uuid", nullable: false),
                    EffectiveFromUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveToUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CasualLoadingPercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    SuperannuationRatePercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    PayPeriod = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PayPeriodCutoffDay = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CreatedByManagerId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AwardConfigurations_AwardDefinitions_AwardId",
                        column: x => x.AwardId,
                        principalTable: "AwardDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AwardConfigurations_Venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "Venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AwardRates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AwardClassificationId = table.Column<Guid>(type: "uuid", nullable: false),
                    EffectiveFromUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveToUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BaseHourlyRate = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    CasualLoadingPercentMin = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardRates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AwardRates_AwardClassificationDefinitions_AwardClassificati~",
                        column: x => x.AwardClassificationId,
                        principalTable: "AwardClassificationDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AwardConfigurationPenaltyToggles",
                columns: table => new
                {
                    AwardConfigurationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PenaltyType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardConfigurationPenaltyToggles", x => new { x.AwardConfigurationId, x.Id });
                    table.ForeignKey(
                        name: "FK_AwardConfigurationPenaltyToggles_AwardConfigurations_AwardC~",
                        column: x => x.AwardConfigurationId,
                        principalTable: "AwardConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AwardRatePenaltyMultipliers",
                columns: table => new
                {
                    AwardRateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PenaltyType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Multiplier = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AwardRatePenaltyMultipliers", x => new { x.AwardRateId, x.Id });
                    table.ForeignKey(
                        name: "FK_AwardRatePenaltyMultipliers_AwardRates_AwardRateId",
                        column: x => x.AwardRateId,
                        principalTable: "AwardRates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AwardClassificationDefinitions_AwardId",
                table: "AwardClassificationDefinitions",
                column: "AwardId");

            migrationBuilder.CreateIndex(
                name: "IX_AwardConfigurations_AwardId",
                table: "AwardConfigurations",
                column: "AwardId");

            migrationBuilder.CreateIndex(
                name: "IX_AwardConfigurations_VenueId_Active",
                table: "AwardConfigurations",
                column: "VenueId",
                unique: true,
                filter: "\"EffectiveToUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AwardConfigurations_VenueId_EffectiveFromUtc",
                table: "AwardConfigurations",
                columns: new[] { "VenueId", "EffectiveFromUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AwardDefinitions_AwardCode",
                table: "AwardDefinitions",
                column: "AwardCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AwardRates_AwardClassificationId_Active",
                table: "AwardRates",
                column: "AwardClassificationId",
                unique: true,
                filter: "\"EffectiveToUtc\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AwardConfigurationPenaltyToggles");

            migrationBuilder.DropTable(
                name: "AwardRatePenaltyMultipliers");

            migrationBuilder.DropTable(
                name: "AwardConfigurations");

            migrationBuilder.DropTable(
                name: "AwardRates");

            migrationBuilder.DropTable(
                name: "AwardClassificationDefinitions");

            migrationBuilder.DropTable(
                name: "AwardDefinitions");
        }
    }
}
