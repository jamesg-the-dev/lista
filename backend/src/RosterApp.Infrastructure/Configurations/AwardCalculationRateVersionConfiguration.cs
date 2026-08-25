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
    }
}
