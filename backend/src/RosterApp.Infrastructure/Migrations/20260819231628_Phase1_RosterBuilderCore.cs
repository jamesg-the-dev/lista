using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase1_RosterBuilderCore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Shifts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "AwardBreakdown",
                table: "Shifts",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComplianceViolations",
                table: "Shifts",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_EmployeeId_ShiftDate",
                table: "Shifts",
                columns: new[] { "EmployeeId", "ShiftDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_VenueId_ShiftDate",
                table: "Shifts",
                columns: new[] { "VenueId", "ShiftDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Shifts_EmployeeId_ShiftDate",
                table: "Shifts");

            migrationBuilder.DropIndex(
                name: "IX_Shifts_VenueId_ShiftDate",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "AwardBreakdown",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "ComplianceViolations",
                table: "Shifts");

            migrationBuilder.AlterColumn<int>(
                name: "Status",
                table: "Shifts",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);
        }
    }
}
