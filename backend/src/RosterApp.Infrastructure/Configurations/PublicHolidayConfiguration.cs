using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Infrastructure.Configurations;

public sealed class PublicHolidayConfiguration : IEntityTypeConfiguration<PublicHoliday>
{
    public void Configure(EntityTypeBuilder<PublicHoliday> builder)
    {
        builder.HasKey(h => h.Id);
        builder.Property(h => h.Id).ValueGeneratedNever();
        builder.Property(h => h.State).HasConversion<string>().HasMaxLength(10).IsRequired();
        builder.Property(h => h.Name).IsRequired().HasMaxLength(200);
        builder.Property(h => h.IsNational).IsRequired();

        builder.HasIndex(h => new { h.State, h.Date });
    }
}
