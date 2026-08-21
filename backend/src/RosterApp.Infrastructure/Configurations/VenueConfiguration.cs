using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Tenancy;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Infrastructure.Configurations;

public sealed class VenueConfiguration : IEntityTypeConfiguration<Venue>
{
    public void Configure(EntityTypeBuilder<Venue> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).ValueGeneratedNever();
        builder.Property(v => v.Name).IsRequired().HasMaxLength(200);
        builder.Property(v => v.Timezone).IsRequired().HasMaxLength(100);
        builder.Property(v => v.IsActive).IsRequired();
        builder.Property(v => v.CreatedByManagerId).IsRequired();
        builder.Property(v => v.ForecastSalesTarget).HasPrecision(10, 2);
        builder.HasIndex(v => v.OrganisationId);

        builder
            .HasOne<Organisation>()
            .WithMany()
            .HasForeignKey(v => v.OrganisationId)
            .OnDelete(DeleteBehavior.Cascade);

        // Abn always normalizes to 11 digits before it reaches here — see
        // Abn.Create — same scalar-conversion pattern as StaffMember.Phone.
        var abnComparer = new ValueComparer<Abn>(
            (left, right) => left!.Value == right!.Value,
            abn => abn.Value.GetHashCode(),
            abn => Abn.Create(abn.Value));

        builder.Property(v => v.Abn)
            .HasConversion(abn => abn.Value, value => Abn.Create(value), abnComparer)
            .IsRequired()
            .HasMaxLength(11);

        builder.OwnsOne(v => v.Address, address =>
        {
            address.Property(a => a.Line1).HasColumnName("Address_Line1").IsRequired().HasMaxLength(200);
            address.Property(a => a.Line2).HasColumnName("Address_Line2").HasMaxLength(200);
            address.Property(a => a.Suburb).HasColumnName("Address_Suburb").IsRequired().HasMaxLength(100);
            address.Property(a => a.State).HasColumnName("Address_State").HasConversion<string>().HasMaxLength(10).IsRequired();
            address.Property(a => a.Postcode).HasColumnName("Address_Postcode").IsRequired().HasMaxLength(4);
            address.Property(a => a.Country).HasColumnName("Address_Country").IsRequired().HasMaxLength(60);
        });

        builder.Navigation(v => v.Address).IsRequired();

        // Real relational table, not jsonb — same rationale as Shift's
        // owned collections (see ShiftConfiguration): a manager's trading
        // hours are read on every roster-builder load, not just settings.
        builder.OwnsMany(v => v.TradingHours, session =>
        {
            session.ToTable("VenueTradingHours");
            session.WithOwner().HasForeignKey("VenueId");
            session.Property<int>("Id");
            session.HasKey("VenueId", "Id");

            session.Property(s => s.DayOfWeek).HasConversion<string>().HasMaxLength(10);
            session.Property(s => s.SessionLabel).HasMaxLength(50);
            session.Property(s => s.IsClosed);
            session.Property(s => s.CrossesMidnight);
        });
    }
}
