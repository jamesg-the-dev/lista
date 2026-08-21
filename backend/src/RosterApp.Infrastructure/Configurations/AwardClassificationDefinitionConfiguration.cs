using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Infrastructure.Configurations;

public sealed class AwardClassificationDefinitionConfiguration : IEntityTypeConfiguration<AwardClassificationDefinition>
{
    public void Configure(EntityTypeBuilder<AwardClassificationDefinition> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.Property(c => c.Name).IsRequired().HasMaxLength(100);
        builder.Property(c => c.Description).HasMaxLength(500);
        builder.HasIndex(c => c.AwardId);

        builder
            .HasOne<AwardDefinition>()
            .WithMany()
            .HasForeignKey(c => c.AwardId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
