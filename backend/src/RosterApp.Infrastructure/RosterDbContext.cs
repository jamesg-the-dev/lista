using Microsoft.EntityFrameworkCore;
using RosterApp.Domain.Rostering;

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

    // TODO: DbSet<Organisation>, DbSet<Venue>, DbSet<Employee>, DbSet<ShiftAuditEntry>

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // TODO: entity configurations (mirror Pentana's .ValueGeneratedNever() pattern
        //       for any natural keys, e.g. reference numbers)
        // TODO: global query filter for tenant scoping (VenueId / OrganisationId)
        // TODO: apply all IEntityTypeConfiguration<> from this assembly via ApplyConfigurationsFromAssembly
    }
}
