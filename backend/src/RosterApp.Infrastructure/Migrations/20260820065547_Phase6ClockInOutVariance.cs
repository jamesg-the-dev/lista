using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase6ClockInOutVariance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TimeEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VenueId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClockInUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClockInLatitude = table.Column<decimal>(type: "numeric(8,6)", precision: 8, scale: 6, nullable: false),
                    ClockInLongitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: false),
                    ClockInAccuracyMetres = table.Column<decimal>(type: "numeric(7,2)", precision: 7, scale: 2, nullable: false),
                    ClockOutUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClockOutLatitude = table.Column<decimal>(type: "numeric(8,6)", precision: 8, scale: 6, nullable: true),
                    ClockOutLongitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    ClockOutAccuracyMetres = table.Column<decimal>(type: "numeric(7,2)", precision: 7, scale: 2, nullable: true),
                    VarianceMinutes = table.Column<int>(type: "integer", nullable: true),
                    VarianceStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AdjustmentReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimeEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimeEntries_Shifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "Shifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimeEntries_Venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "Venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_ShiftId",
                table: "TimeEntries",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_StaffId",
                table: "TimeEntries",
                column: "StaffId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_VenueId",
                table: "TimeEntries",
                column: "VenueId",
                filter: "\"VarianceStatus\" = 'Flagged'");

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_VenueId_ClockInUtc",
                table: "TimeEntries",
                columns: new[] { "VenueId", "ClockInUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TimeEntries");
        }
    }
}
