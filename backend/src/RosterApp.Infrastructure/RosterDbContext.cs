using Microsoft.EntityFrameworkCore;
using RosterApp.Domain.Auditing;
using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.RosterCompliance;
using RosterApp.Domain.Staffing;
using RosterApp.Domain.Tenancy;
using RosterApp.Domain.Timekeeping;

namespace RosterApp.Infrastructure;

/// <summary>
/// Targets Postgres (Supabase-managed in all environments). EF Core owns all
/// writes via this context — the frontend never talks to Supabase directly
/// for anything that mutates roster/shift/audit data, only for Realtime
/// subscriptions on read models and Supabase Auth.
/// </summary>
public sealed class RosterDbContext(DbContextOptions<RosterDbContext> options) : DbContext(options)
{
    public DbSet<Shift> Shifts => Set<Shift>();
    public DbSet<SwapRequest> SwapRequests => Set<SwapRequest>();
    public DbSet<Organisation> Organisations => Set<Organisation>();
    public DbSet<Venue> Venues => Set<Venue>();
    public DbSet<AuditLogEntry> AuditLogEntries => Set<AuditLogEntry>();
    public DbSet<StaffMember> StaffMembers => Set<StaffMember>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<StandingUnavailability> StandingUnavailabilities => Set<StandingUnavailability>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<AwardDefinition> AwardDefinitions => Set<AwardDefinition>();
    public DbSet<AwardClassificationDefinition> AwardClassificationDefinitions => Set<AwardClassificationDefinition>();
    public DbSet<AwardRate> AwardRates => Set<AwardRate>();
    public DbSet<AwardConfiguration> AwardConfigurations => Set<AwardConfiguration>();
    public DbSet<AwardCalculationRateVersion> AwardCalculationRateVersions => Set<AwardCalculationRateVersion>();
    public DbSet<RoleAwardMapping> RoleAwardMappings => Set<RoleAwardMapping>();
    public DbSet<RosterComplianceConfiguration> RosterComplianceConfigurations => Set<RosterComplianceConfiguration>();
    public DbSet<PublicHoliday> PublicHolidays => Set<PublicHoliday>();
    public DbSet<VenueHolidayOverride> VenueHolidayOverrides => Set<VenueHolidayOverride>();

    // TODO: global query filter for tenant scoping (VenueId / OrganisationId) once
    // more venue-scoped aggregates exist (Shift is the first candidate in Phase 1).

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RosterDbContext).Assembly);
    }
}
