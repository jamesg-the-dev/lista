using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class VenueProfileTradingHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Abn",
                table: "Venues",
                type: "character varying(11)",
                maxLength: 11,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Address_Country",
                table: "Venues",
                type: "character varying(60)",
                maxLength: 60,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Address_Line1",
                table: "Venues",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Address_Line2",
                table: "Venues",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Address_Postcode",
                table: "Venues",
                type: "character varying(4)",
                maxLength: 4,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Address_State",
                table: "Venues",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Address_Suburb",
                table: "Venues",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByManagerId",
                table: "Venues",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Venues",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Timezone",
                table: "Venues",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "VenueTradingHours",
                columns: table => new
                {
                    VenueId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DayOfWeek = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    SessionLabel = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    OpenTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    CloseTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    IsClosed = table.Column<bool>(type: "boolean", nullable: false),
                    CrossesMidnight = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VenueTradingHours", x => new { x.VenueId, x.Id });
                    table.ForeignKey(
                        name: "FK_VenueTradingHours_Venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "Venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VenueTradingHours");

            migrationBuilder.DropColumn(
                name: "Abn",
                table: "Venues");

            migrationBuilder.DropColumn(
                name: "Address_Country",
                table: "Venues");

            migrationBuilder.DropColumn(
                name: "Address_Line1",
                table: "Venues");

            migrationBuilder.DropColumn(
                name: "Address_Line2",
                table: "Venues");

            migrationBuilder.DropColumn(
                name: "Address_Postcode",
                table: "Venues");

            migrationBuilder.DropColumn(
                name: "Address_State",
                table: "Venues");

            migrationBuilder.DropColumn(
                name: "Address_Suburb",
                table: "Venues");

            migrationBuilder.DropColumn(
                name: "CreatedByManagerId",
                table: "Venues");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Venues");

            migrationBuilder.DropColumn(
                name: "Timezone",
                table: "Venues");
        }
    }
}
