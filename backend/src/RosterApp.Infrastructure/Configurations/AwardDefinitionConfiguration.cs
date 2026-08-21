using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Infrastructure.Configurations;

public sealed class AwardDefinitionConfiguration : IEntityTypeConfiguration<AwardDefinition>
{
    public void Configure(EntityTypeBuilder<AwardDefinition> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.Property(a => a.AwardCode).IsRequired().HasMaxLength(20);
        builder.Property(a => a.Name).IsRequired().HasMaxLength(200);
        builder.Property(a => a.Jurisdiction).IsRequired().HasMaxLength(50);
        builder.HasIndex(a => a.AwardCode).IsUnique();
    }
}
