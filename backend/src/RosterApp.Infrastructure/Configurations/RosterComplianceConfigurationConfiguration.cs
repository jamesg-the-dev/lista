using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.RosterCompliance;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Configurations;

public sealed class RosterComplianceConfigurationConfiguration : IEntityTypeConfiguration<RosterComplianceConfiguration>
{
    public void Configure(EntityTypeBuilder<RosterComplianceConfiguration> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.Property(c => c.CreatedByManagerId).IsRequired();

        // Covers GetRosterComplianceConfigurationHistoryQuery's "all versions
        // for this venue, newest first" lookup — a distinct column set from
        // the partial index below so EF Core keeps them as two separate
        // indexes rather than merging repeated HasIndex(VenueId) calls into
        // one (same pattern as AwardConfigurationConfiguration).
        builder.HasIndex(c => new { c.VenueId, c.EffectiveFromUtc });

        // Enforces "only one currently-active config per venue" at the DB
        // level — see RosterComplianceConfiguration.CreateNewVersion/Supersede.
        builder.HasIndex(c => c.VenueId)
            .HasDatabaseName("IX_RosterComplianceConfigurations_VenueId_Active")
            .IsUnique()
            .HasFilter("\"EffectiveToUtc\" IS NULL");

        builder
            .HasOne<Venue>()
            .WithMany()
            .HasForeignKey(c => c.VenueId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.OwnsOne(c => c.MinorRules, minor =>
        {
            minor.Property(m => m.MaxDailyHours).HasColumnName("MinorMaxDailyHours").HasPrecision(4, 2).IsRequired();
            minor.Property(m => m.MaxWeeklyHours).HasColumnName("MinorMaxWeeklyHours").HasPrecision(5, 2).IsRequired();
            minor.Property(m => m.EarliestStartTime).HasColumnName("MinorEarliestStartTime").IsRequired();
            minor.Property(m => m.LatestFinishTime).HasColumnName("MinorLatestFinishTime").IsRequired();
        });

        builder.Navigation(c => c.MinorRules).IsRequired();

        // Real relational table, not jsonb — read on every shift creation/
        // update to feed IRosterComplianceValidator, not just settings.
        builder.OwnsMany(c => c.MealBreakRules, rule =>
        {
            rule.ToTable("RosterComplianceMealBreakRules");
            rule.WithOwner().HasForeignKey("RosterComplianceConfigurationId");
            rule.Property<int>("Id");
            rule.HasKey("RosterComplianceConfigurationId", "Id");

            rule.Property(r => r.AfterHoursWorked).HasPrecision(4, 2);
            rule.Property(r => r.BreakDurationMinutes);
            rule.Property(r => r.IsPaid);
        });
    }
}
