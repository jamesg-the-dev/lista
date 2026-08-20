using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.Configurations;

public sealed class StandingUnavailabilityConfiguration : IEntityTypeConfiguration<StandingUnavailability>
{
    public void Configure(EntityTypeBuilder<StandingUnavailability> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).ValueGeneratedNever();
        builder.Property(u => u.DayOfWeek).HasConversion<string>().HasMaxLength(20);

        // One exception per (StaffMemberId, DayOfWeek) — enforced here, not
        // just by SetStandingUnavailabilityCommand's upsert logic. Also
        // covers the FK-index best practice for StaffMemberId as the
        // leading column.
        builder.HasIndex(u => new { u.StaffMemberId, u.DayOfWeek }).IsUnique();

        builder
            .HasOne<StaffMember>()
            .WithMany()
            .HasForeignKey(u => u.StaffMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
