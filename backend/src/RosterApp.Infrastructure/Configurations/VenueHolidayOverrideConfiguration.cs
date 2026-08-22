using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.RosterCompliance;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Configurations;

public sealed class VenueHolidayOverrideConfiguration : IEntityTypeConfiguration<VenueHolidayOverride>
{
    public void Configure(EntityTypeBuilder<VenueHolidayOverride> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id).ValueGeneratedNever();
        builder.Property(o => o.Name).IsRequired().HasMaxLength(200);
        builder.Property(o => o.CreatedByStaffMemberId).IsRequired();

        builder.HasIndex(o => new { o.VenueId, o.OverrideDate });

        builder
            .HasOne<Venue>()
            .WithMany()
            .HasForeignKey(o => o.VenueId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
