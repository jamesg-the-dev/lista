using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RosterApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLogEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OrganisationId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: true),
                    EventType = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    PayloadJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogEntries", x => x.Id);
                });

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
                name: "Organisations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organisations", x => x.Id);
                });

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
                name: "Venues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganisationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Abn = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: false),
                    Address_Line1 = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address_Line2 = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Address_Suburb = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Address_State = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Address_Postcode = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    Address_Country = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Timezone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByStaffMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    ForecastSalesTarget = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    AvailabilitySelfServiceMode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "RequiresApproval"),
                    AvailabilityAdvanceNoticeDays = table.Column<int>(type: "integer", nullable: false, defaultValue: 7)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Venues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Venues_Organisations_OrganisationId",
                        column: x => x.OrganisationId,
                        principalTable: "Organisations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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
                    CreatedByStaffMemberId = table.Column<Guid>(type: "uuid", nullable: false),
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
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VenueId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ColorTag = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedByStaffMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Roles_Venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "Venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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
                    CreatedByStaffMemberId = table.Column<Guid>(type: "uuid", nullable: false),
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
                name: "Shifts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VenueId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Start = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    End = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    UnpaidBreakMinutes = table.Column<int>(type: "integer", nullable: false),
                    BaseRatePerHour = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shifts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Shifts_Venues_VenueId",
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
                    CreatedByStaffMemberId = table.Column<Guid>(type: "uuid", nullable: false),
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
                name: "RoleAwardMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VenueId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    AwardClassificationId = table.Column<Guid>(type: "uuid", nullable: false),
                    EffectiveFromUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveToUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedByStaffMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleAwardMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoleAwardMappings_AwardClassificationDefinitions_AwardClass~",
                        column: x => x.AwardClassificationId,
                        principalTable: "AwardClassificationDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RoleAwardMappings_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RoleAwardMappings_Venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "Venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StaffMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganisationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Phone = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    EmploymentType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Classification = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    MaxWeeklyHours = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateOfBirth = table.Column<DateOnly>(type: "date", nullable: false),
                    PermissionLevel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Staff"),
                    PrimaryRoleId = table.Column<Guid>(type: "uuid", nullable: true),
                    OverrideHourlyRate = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    OverrideReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    OverrideEffectiveFromUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    OverrideSetByStaffMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    SupabaseUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffMembers", x => x.Id);
                    table.CheckConstraint("CK_StaffMembers_Phone_E164", "\"Phone\" ~ '^\\+[1-9]\\d{6,14}$'");
                    table.ForeignKey(
                        name: "FK_StaffMembers_Roles_PrimaryRoleId",
                        column: x => x.PrimaryRoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
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
                    Message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Acknowledged = table.Column<bool>(type: "boolean", nullable: false),
                    OverrideReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
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

            migrationBuilder.CreateTable(
                name: "LeaveRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaveRequests_StaffMembers_StaffMemberId",
                        column: x => x.StaffMemberId,
                        principalTable: "StaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StaffMemberVenueAssignments",
                columns: table => new
                {
                    VenueId = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffMemberId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffMemberVenueAssignments", x => new { x.StaffMemberId, x.VenueId });
                    table.ForeignKey(
                        name: "FK_StaffMemberVenueAssignments_StaffMembers_StaffMemberId",
                        column: x => x.StaffMemberId,
                        principalTable: "StaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StandingUnavailabilities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsAllDay = table.Column<bool>(type: "boolean", nullable: false),
                    IncludesMorning = table.Column<bool>(type: "boolean", nullable: false),
                    IncludesAfternoon = table.Column<bool>(type: "boolean", nullable: false),
                    IncludesEvening = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StandingUnavailabilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StandingUnavailabilities_StaffMembers_StaffMemberId",
                        column: x => x.StaffMemberId,
                        principalTable: "StaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogEntries_EntityType_EntityId",
                table: "AuditLogEntries",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogEntries_OrganisationId",
                table: "AuditLogEntries",
                column: "OrganisationId");

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

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_StaffMemberId_StartDate",
                table: "LeaveRequests",
                columns: new[] { "StaffMemberId", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PublicHolidays_State_Date",
                table: "PublicHolidays",
                columns: new[] { "State", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_RoleAwardMappings_AwardClassificationId",
                table: "RoleAwardMappings",
                column: "AwardClassificationId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleAwardMappings_RoleId_Active",
                table: "RoleAwardMappings",
                column: "RoleId",
                unique: true,
                filter: "\"EffectiveToUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RoleAwardMappings_VenueId",
                table: "RoleAwardMappings",
                column: "VenueId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_VenueId",
                table: "Roles",
                column: "VenueId");

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
                name: "IX_Shifts_EmployeeId_ShiftDate",
                table: "Shifts",
                columns: new[] { "EmployeeId", "ShiftDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_VenueId_ShiftDate",
                table: "Shifts",
                columns: new[] { "VenueId", "ShiftDate" });

            migrationBuilder.CreateIndex(
                name: "IX_StaffMembers_OrganisationId_Email",
                table: "StaffMembers",
                columns: new[] { "OrganisationId", "Email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StaffMembers_OrganisationId_Phone",
                table: "StaffMembers",
                columns: new[] { "OrganisationId", "Phone" },
                unique: true,
                filter: "\"Phone\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_StaffMembers_PrimaryRoleId",
                table: "StaffMembers",
                column: "PrimaryRoleId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffMembers_SupabaseUserId",
                table: "StaffMembers",
                column: "SupabaseUserId",
                unique: true,
                filter: "\"SupabaseUserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_StaffMemberVenueAssignments_VenueId",
                table: "StaffMemberVenueAssignments",
                column: "VenueId");

            migrationBuilder.CreateIndex(
                name: "IX_StandingUnavailabilities_StaffMemberId_DayOfWeek",
                table: "StandingUnavailabilities",
                columns: new[] { "StaffMemberId", "DayOfWeek" },
                unique: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_VenueHolidayOverrides_VenueId_OverrideDate",
                table: "VenueHolidayOverrides",
                columns: new[] { "VenueId", "OverrideDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Venues_OrganisationId",
                table: "Venues",
                column: "OrganisationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogEntries");

            migrationBuilder.DropTable(
                name: "AwardConfigurationPenaltyToggles");

            migrationBuilder.DropTable(
                name: "AwardRatePenaltyMultipliers");

            migrationBuilder.DropTable(
                name: "LeaveRequests");

            migrationBuilder.DropTable(
                name: "PublicHolidays");

            migrationBuilder.DropTable(
                name: "RoleAwardMappings");

            migrationBuilder.DropTable(
                name: "RosterComplianceMealBreakRules");

            migrationBuilder.DropTable(
                name: "ShiftAwardBreakdownLines");

            migrationBuilder.DropTable(
                name: "ShiftComplianceViolations");

            migrationBuilder.DropTable(
                name: "StaffMemberVenueAssignments");

            migrationBuilder.DropTable(
                name: "StandingUnavailabilities");

            migrationBuilder.DropTable(
                name: "SwapRequests");

            migrationBuilder.DropTable(
                name: "TimeEntries");

            migrationBuilder.DropTable(
                name: "VenueHolidayOverrides");

            migrationBuilder.DropTable(
                name: "VenueTradingHours");

            migrationBuilder.DropTable(
                name: "AwardConfigurations");

            migrationBuilder.DropTable(
                name: "AwardRates");

            migrationBuilder.DropTable(
                name: "RosterComplianceConfigurations");

            migrationBuilder.DropTable(
                name: "StaffMembers");

            migrationBuilder.DropTable(
                name: "Shifts");

            migrationBuilder.DropTable(
                name: "AwardClassificationDefinitions");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "AwardDefinitions");

            migrationBuilder.DropTable(
                name: "Venues");

            migrationBuilder.DropTable(
                name: "Organisations");
        }
    }
}
