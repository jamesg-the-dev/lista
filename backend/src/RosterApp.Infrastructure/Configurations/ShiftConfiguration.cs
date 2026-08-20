using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Configurations;

public sealed class ShiftConfiguration : IEntityTypeConfiguration<Shift>
{
    public void Configure(EntityTypeBuilder<Shift> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.BaseRatePerHour).HasPrecision(10, 2);

        builder.HasIndex(s => new { s.VenueId, s.ShiftDate });
        builder.HasIndex(s => new { s.EmployeeId, s.ShiftDate });

        // EmployeeId is not an FK: staff records live in a separate schema
        // (out of this bounded context), so it stays a bare Guid.
        builder
            .HasOne<Venue>()
            .WithMany()
            .HasForeignKey(s => s.VenueId)
            .OnDelete(DeleteBehavior.Restrict);

        // Itemised breakdown/violations are owned value objects (no
        // identity/lifecycle of their own outside the shift) but kept as
        // real relational tables, not jsonb — the labour cost dashboard
        // (build order step 4) needs to SUM/GROUP BY award-breakdown lines
        // across many shifts, which a JSON blob can't index or aggregate
        // efficiently. EF Core always loads owned navigations with their
        // owner regardless of storage shape, so this needs no query changes.
        builder.OwnsMany(s => s.AwardBreakdown, line =>
        {
            line.ToTable("ShiftAwardBreakdownLines");
            line.WithOwner().HasForeignKey("ShiftId");
            line.Property<int>("Id");
            line.HasKey("ShiftId", "Id");

            line.Property(l => l.Label).IsRequired().HasMaxLength(200);
            line.Property(l => l.Hours).HasPrecision(6, 2);
            line.Property(l => l.RatePerHour).HasPrecision(10, 2);
            line.Property(l => l.Amount).HasPrecision(10, 2);
        });

        builder.OwnsMany(s => s.ComplianceViolations, violation =>
        {
            violation.ToTable("ShiftComplianceViolations");
            violation.WithOwner().HasForeignKey("ShiftId");
            violation.Property<int>("Id");
            violation.HasKey("ShiftId", "Id");

            violation.Property(v => v.Type).HasConversion<string>().HasMaxLength(30);
            violation.Property(v => v.Severity).HasConversion<string>().HasMaxLength(20);
            violation.Property(v => v.Message).IsRequired().HasMaxLength(500);
            violation.Property(v => v.Acknowledged);
            violation.Property(v => v.OverrideReason).HasMaxLength(500);
        });
    }
}
