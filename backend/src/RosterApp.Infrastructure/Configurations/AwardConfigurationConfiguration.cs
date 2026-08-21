using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Configurations;

public sealed class AwardConfigurationConfiguration : IEntityTypeConfiguration<AwardConfiguration>
{
    public void Configure(EntityTypeBuilder<AwardConfiguration> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.Property(c => c.CasualLoadingPercent).HasPrecision(5, 2);
        builder.Property(c => c.SuperannuationRatePercent).HasPrecision(5, 2);
        builder.Property(c => c.PayPeriod).HasConversion<string>().HasMaxLength(20);
        builder.Property(c => c.PayPeriodCutoffDay).HasConversion<string>().HasMaxLength(10);
        builder.Property(c => c.CreatedByManagerId).IsRequired();

        builder.HasIndex(c => c.AwardId);

        // Covers GetAwardConfigurationHistoryQuery's "all versions for this
        // venue, newest first" lookup — a distinct column set from the
        // partial index below so EF Core keeps them as two separate
        // indexes rather than merging repeated HasIndex(VenueId) calls into
        // one.
        builder.HasIndex(c => new { c.VenueId, c.EffectiveFromUtc });

        // Enforces "only one currently-active config per venue" at the DB
        // level — see AwardConfiguration.CreateNewVersion/Supersede, the
        // temporal-versioning decision this whole aggregate exists for.
        builder.HasIndex(c => c.VenueId)
            .HasDatabaseName("IX_AwardConfigurations_VenueId_Active")
            .IsUnique()
            .HasFilter("\"EffectiveToUtc\" IS NULL");

        builder
            .HasOne<Venue>()
            .WithMany()
            .HasForeignKey(c => c.VenueId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne<AwardDefinition>()
            .WithMany()
            .HasForeignKey(c => c.AwardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.OwnsMany(c => c.PenaltyToggles, toggle =>
        {
            toggle.ToTable("AwardConfigurationPenaltyToggles");
            toggle.WithOwner().HasForeignKey("AwardConfigurationId");
            toggle.Property<int>("Id");
            toggle.HasKey("AwardConfigurationId", "Id");

            toggle.Property(t => t.PenaltyType).HasConversion<string>().HasMaxLength(30);
            toggle.Property(t => t.IsEnabled);
        });
    }
}
