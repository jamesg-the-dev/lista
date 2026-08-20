using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.Configurations;

public sealed class LeaveRequestConfiguration : IEntityTypeConfiguration<LeaveRequest>
{
    public void Configure(EntityTypeBuilder<LeaveRequest> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).ValueGeneratedNever();
        builder.Property(l => l.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(l => l.Reason).HasMaxLength(1000);

        builder.HasIndex(l => new { l.StaffMemberId, l.StartDate });

        builder
            .HasOne<StaffMember>()
            .WithMany()
            .HasForeignKey(l => l.StaffMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
