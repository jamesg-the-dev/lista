using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase3RosterBuilderEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ForecastSalesTarget",
                table: "Venues",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BaseRatePerHour",
                table: "Shifts",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "Acknowledged",
                table: "ShiftComplianceViolations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OverrideReason",
                table: "ShiftComplianceViolations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ForecastSalesTarget",
                table: "Venues");

            migrationBuilder.DropColumn(
                name: "BaseRatePerHour",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "Acknowledged",
                table: "ShiftComplianceViolations");

            migrationBuilder.DropColumn(
                name: "OverrideReason",
                table: "ShiftComplianceViolations");
        }
    }
}
