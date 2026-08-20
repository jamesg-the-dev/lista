using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Configurations;

public sealed class SwapRequestConfiguration : IEntityTypeConfiguration<SwapRequest>
{
    public void Configure(EntityTypeBuilder<SwapRequest> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.Reason).HasMaxLength(1000);
        builder.Property(s => s.ManagerDecisionReason).HasMaxLength(1000);

        builder.HasIndex(s => s.ShiftId);
        builder.HasIndex(s => s.RequestingStaffId);
        builder.HasIndex(s => s.TargetStaffId);

        // The manager inbox (GetPendingSwapsForVenueQuery) always filters
        // VenueId + Status = 'Pending' — a partial index matching that
        // exact filter stays small even as old resolved swaps accumulate.
        builder.HasIndex(s => s.VenueId).HasFilter("\"Status\" = 'Pending'");

        builder
            .HasOne<Venue>()
            .WithMany()
            .HasForeignKey(s => s.VenueId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne<Shift>()
            .WithMany()
            .HasForeignKey(s => s.ShiftId)
            .OnDelete(DeleteBehavior.Cascade);

        // RequestingStaffId/TargetStaffId are not FKs — same rationale as
        // Shift.EmployeeId (see ShiftConfiguration): staff records live in
        // a separate bounded context, validated at the application layer.
    }
}
