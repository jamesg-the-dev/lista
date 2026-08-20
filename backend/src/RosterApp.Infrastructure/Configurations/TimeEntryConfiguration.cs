using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Tenancy;
using RosterApp.Domain.Timekeeping;

namespace RosterApp.Infrastructure.Configurations;

public sealed class TimeEntryConfiguration : IEntityTypeConfiguration<TimeEntry>
{
    public void Configure(EntityTypeBuilder<TimeEntry> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();

        builder.Property(t => t.VarianceStatus).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.AdjustmentReason).HasMaxLength(1000);

        // Precision covers the full lat/lng range at ~11cm resolution
        // (6 decimal places): latitude is at most 2 integer digits (+/-90),
        // longitude at most 3 (+/-180).
        builder.Property(t => t.ClockInLatitude).HasPrecision(8, 6);
        builder.Property(t => t.ClockInLongitude).HasPrecision(9, 6);
        builder.Property(t => t.ClockInAccuracyMetres).HasPrecision(7, 2);
        builder.Property(t => t.ClockOutLatitude).HasPrecision(8, 6);
        builder.Property(t => t.ClockOutLongitude).HasPrecision(9, 6);
        builder.Property(t => t.ClockOutAccuracyMetres).HasPrecision(7, 2);

        builder.HasIndex(t => t.ShiftId);
        builder.HasIndex(t => t.StaffId);
        builder.HasIndex(t => new { t.VenueId, t.ClockInUtc });

        // The manager "flagged" inbox (GetFlaggedTimeEntriesQuery) always
        // filters VenueId + VarianceStatus = 'Flagged' — a partial index
        // matching that exact filter, same pattern as SwapRequestConfiguration's
        // pending-swap index.
        builder.HasIndex(t => t.VenueId).HasFilter("\"VarianceStatus\" = 'Flagged'");

        // Rostered actual-hours record — deliberately Restrict (not Cascade
        // like SwapRequest->Shift) so deleting a Shift can't silently drop
        // clocked/paid time data.
        builder
            .HasOne<Shift>()
            .WithMany()
            .HasForeignKey(t => t.ShiftId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne<Venue>()
            .WithMany()
            .HasForeignKey(t => t.VenueId)
            .OnDelete(DeleteBehavior.Restrict);

        // StaffId is not an FK — same rationale as Shift.EmployeeId: staff
        // records live in a separate bounded context.
    }
}
