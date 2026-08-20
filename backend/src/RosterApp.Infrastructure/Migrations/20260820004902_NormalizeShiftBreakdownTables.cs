using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeShiftBreakdownTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AwardBreakdown",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "ComplianceViolations",
                table: "Shifts");

            migrationBuilder.CreateTable(
                name: "ShiftAwardBreakdownLines",
                columns: table => new
                {
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Hours = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    RatePerHour = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftAwardBreakdownLines", x => new { x.ShiftId, x.Id });
                    table.ForeignKey(
                        name: "FK_ShiftAwardBreakdownLines_Shifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "Shifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShiftComplianceViolations",
                columns: table => new
                {
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftComplianceViolations", x => new { x.ShiftId, x.Id });
                    table.ForeignKey(
                        name: "FK_ShiftComplianceViolations_Shifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "Shifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShiftAwardBreakdownLines");

            migrationBuilder.DropTable(
                name: "ShiftComplianceViolations");

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
        }
    }
}
