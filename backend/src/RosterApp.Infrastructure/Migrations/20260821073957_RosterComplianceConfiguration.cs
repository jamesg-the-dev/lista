using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RosterComplianceConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PublicHolidays",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    State = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsNational = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicHolidays", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RosterComplianceConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VenueId = table.Column<Guid>(type: "uuid", nullable: false),
                    EffectiveFromUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveToUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MinShiftLengthMinutes = table.Column<int>(type: "integer", nullable: false),
                    MaxShiftLengthMinutes = table.Column<int>(type: "integer", nullable: false),
                    MinRestBetweenShiftsMinutes = table.Column<int>(type: "integer", nullable: false),
                    WeeklyOvertimeThresholdMinutes = table.Column<int>(type: "integer", nullable: false),
                    MinorMaxDailyHours = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false),
                    MinorMaxWeeklyHours = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    MinorEarliestStartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    MinorLatestFinishTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    CreatedByManagerId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RosterComplianceConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RosterComplianceConfigurations_Venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "Venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VenueHolidayOverrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VenueId = table.Column<Guid>(type: "uuid", nullable: false),
                    OverrideDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedByManagerId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VenueHolidayOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VenueHolidayOverrides_Venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "Venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RosterComplianceMealBreakRules",
                columns: table => new
                {
                    RosterComplianceConfigurationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AfterHoursWorked = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false),
                    BreakDurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    IsPaid = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RosterComplianceMealBreakRules", x => new { x.RosterComplianceConfigurationId, x.Id });
                    table.ForeignKey(
                        name: "FK_RosterComplianceMealBreakRules_RosterComplianceConfiguratio~",
                        column: x => x.RosterComplianceConfigurationId,
                        principalTable: "RosterComplianceConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PublicHolidays_State_Date",
                table: "PublicHolidays",
                columns: new[] { "State", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_RosterComplianceConfigurations_VenueId_Active",
                table: "RosterComplianceConfigurations",
                column: "VenueId",
                unique: true,
                filter: "\"EffectiveToUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RosterComplianceConfigurations_VenueId_EffectiveFromUtc",
                table: "RosterComplianceConfigurations",
                columns: new[] { "VenueId", "EffectiveFromUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_VenueHolidayOverrides_VenueId_OverrideDate",
                table: "VenueHolidayOverrides",
                columns: new[] { "VenueId", "OverrideDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PublicHolidays");

            migrationBuilder.DropTable(
                name: "RosterComplianceMealBreakRules");

            migrationBuilder.DropTable(
                name: "VenueHolidayOverrides");

            migrationBuilder.DropTable(
                name: "RosterComplianceConfigurations");
        }
    }
}
