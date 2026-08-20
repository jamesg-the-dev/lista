using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddShiftVenueForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddForeignKey(
                name: "FK_Shifts_Venues_VenueId",
                table: "Shifts",
                column: "VenueId",
                principalTable: "Venues",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Shifts_Venues_VenueId",
                table: "Shifts");
        }
    }
}
