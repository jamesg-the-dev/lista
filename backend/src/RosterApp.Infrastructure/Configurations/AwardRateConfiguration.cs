using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Infrastructure.Configurations;

public sealed class AwardRateConfiguration : IEntityTypeConfiguration<AwardRate>
{
    public void Configure(EntityTypeBuilder<AwardRate> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.BaseHourlyRate).HasPrecision(8, 2);
        builder.Property(r => r.CasualLoadingPercentMin).HasPrecision(5, 2);

        builder.HasIndex(r => r.AwardClassificationId);

        // Partial unique index mirrors AwardConfiguration's "one currently
        // active row" invariant, scoped per classification rather than per
        // venue — see AwardConfigurationConfiguration.
        builder.HasIndex(r => r.AwardClassificationId)
            .HasDatabaseName("IX_AwardRates_AwardClassificationId_Active")
            .IsUnique()
            .HasFilter("\"EffectiveToUtc\" IS NULL");

        builder
            .HasOne<AwardClassificationDefinition>()
            .WithMany()
            .HasForeignKey(r => r.AwardClassificationId)
            .OnDelete(DeleteBehavior.Cascade);

        // Real relational table, not jsonb — same rationale as
        // Shift.AwardBreakdown/ComplianceViolations (see ShiftConfiguration):
        // future consumers (e.g. IAwardRateCalculator once wired to
        // classification) need to query/aggregate individual multipliers,
        // not just deserialize a blob.
        builder.OwnsMany(r => r.PenaltyMultipliers, multiplier =>
        {
            multiplier.ToTable("AwardRatePenaltyMultipliers");
            multiplier.WithOwner().HasForeignKey("AwardRateId");
            multiplier.Property<int>("Id");
            multiplier.HasKey("AwardRateId", "Id");

            multiplier.Property(m => m.PenaltyType).HasConversion<string>().HasMaxLength(30);
            multiplier.Property(m => m.Multiplier).HasPrecision(5, 2);
        });
    }
}
