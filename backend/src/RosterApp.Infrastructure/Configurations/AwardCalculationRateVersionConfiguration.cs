using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Infrastructure.Configurations;

public sealed class AwardCalculationRateVersionConfiguration : IEntityTypeConfiguration<AwardCalculationRateVersion>
{
    public void Configure(EntityTypeBuilder<AwardCalculationRateVersion> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).ValueGeneratedNever();
        builder.Property(v => v.CasualLoadingPercent).HasPrecision(5, 2);

        builder.HasIndex(v => v.AwardId);

        // Mirrors AwardRate's "one currently active row" invariant, scoped
        // per award rather than per classification — see
        // AwardCalculationRateVersion's doc comment for why this is the
        // right grain for MVP's calculators.
        builder.HasIndex(v => v.AwardId)
            .HasDatabaseName("IX_AwardCalculationRateVersions_AwardId_Active")
            .IsUnique()
            .HasFilter("\"EffectiveToUtc\" IS NULL");

        builder
            .HasOne<AwardDefinition>()
            .WithMany()
            .HasForeignKey(v => v.AwardId)
            .OnDelete(DeleteBehavior.Restrict);

        // Real relational table, not jsonb — same rationale as AwardRate's
        // PenaltyMultipliers (see AwardRateConfiguration).
        builder.OwnsMany(v => v.PenaltyMultipliers, multiplier =>
        {
            multiplier.ToTable("AwardCalculationRatePenaltyMultipliers");
            multiplier.WithOwner().HasForeignKey("AwardCalculationRateVersionId");
            multiplier.Property<int>("Id");
            multiplier.HasKey("AwardCalculationRateVersionId", "Id");

            multiplier.Property(m => m.PenaltyType).HasConversion<string>().HasMaxLength(30);
            multiplier.Property(m => m.Multiplier).HasPrecision(5, 2);
        });

        // Same real-table treatment as PenaltyMultipliers above, kept in its
        // own table (not folded into the multipliers table) so the two
        // figure types — percentage vs flat dollar — stay structurally
        // separate all the way down to the schema.
        builder.OwnsMany(v => v.FlatDollarLoadings, loading =>
        {
            loading.ToTable("AwardCalculationRateFlatDollarLoadings");
            loading.WithOwner().HasForeignKey("AwardCalculationRateVersionId");
            loading.Property<int>("Id");
            loading.HasKey("AwardCalculationRateVersionId", "Id");

            loading.Property(f => f.PenaltyType).HasConversion<string>().HasMaxLength(30);
            loading.Property(f => f.DollarPerHour).HasPrecision(6, 2);
        });
    }
}
