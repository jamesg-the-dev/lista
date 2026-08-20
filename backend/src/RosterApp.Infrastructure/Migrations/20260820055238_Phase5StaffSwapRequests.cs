using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase5StaffSwapRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SupabaseUserId",
                table: "StaffMembers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SwapRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VenueId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestingStaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetStaffId = table.Column<Guid>(type: "uuid", nullable: true),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TargetStaffAccepted = table.Column<bool>(type: "boolean", nullable: true),
                    ManagerDecisionReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SwapRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SwapRequests_Shifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "Shifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SwapRequests_Venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "Venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StaffMembers_SupabaseUserId",
                table: "StaffMembers",
                column: "SupabaseUserId",
                unique: true,
                filter: "\"SupabaseUserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SwapRequests_RequestingStaffId",
                table: "SwapRequests",
                column: "RequestingStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_SwapRequests_ShiftId",
                table: "SwapRequests",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_SwapRequests_TargetStaffId",
                table: "SwapRequests",
                column: "TargetStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_SwapRequests_VenueId",
                table: "SwapRequests",
                column: "VenueId",
                filter: "\"Status\" = 'Pending'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SwapRequests");

            migrationBuilder.DropIndex(
                name: "IX_StaffMembers_SupabaseUserId",
                table: "StaffMembers");

            migrationBuilder.DropColumn(
                name: "SupabaseUserId",
                table: "StaffMembers");
        }
    }
}
