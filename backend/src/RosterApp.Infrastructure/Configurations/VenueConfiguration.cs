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

        builder.Property(v => v.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(v => v.CreatedByStaffMemberId).IsRequired();
        builder.Property(v => v.ForecastSalesTarget).HasPrecision(10, 2);
        builder.HasIndex(v => v.OrganisationId);

        builder
            .HasOne<Organisation>()
            .WithMany()
            .HasForeignKey(v => v.OrganisationId)
            .OnDelete(DeleteBehavior.Cascade);

        var abnComparer = new ValueComparer<Abn?>(
            (left, right) => left == null || right == null ? left == right : left.Value == right.Value,
            abn => abn == null ? 0 : abn.Value.GetHashCode(),
            abn => abn == null ? null : Abn.Create(abn.Value)
        );

        // Nullable — see Abn's doc comment on Venue: unset until the owner
        // completes the Venue Profile onboarding step/settings form.
        builder
            .Property(v => v.Abn)
            .HasConversion(abn => abn == null ? null : abn.Value, value => value == null ? null : Abn.Create(value), abnComparer)
            .HasMaxLength(11);

        // Optional owned entity — see Address's doc comment on Venue: unset
        // until the owner completes the Venue Profile onboarding step. None
        // of the sub-properties are marked .IsRequired() (even though the
        // Address record's own C# properties are non-nullable) so their
        // columns stay nullable in the DB; EF Core materializes the whole
        // navigation as null when every column in the row is null, and as a
        // real Address otherwise. Field-level "must be fully filled in"
        // validation still lives in UpdateVenueProfileCommandValidator,
        // same as before.
        builder.OwnsOne(
            v => v.Address,
            address =>
            {
                address.Property(a => a.Line1).HasColumnName("Address_Line1").HasMaxLength(200);
                address.Property(a => a.Line2).HasColumnName("Address_Line2").HasMaxLength(200);
                address.Property(a => a.Suburb).HasColumnName("Address_Suburb").HasMaxLength(100);
                address
                    .Property(a => a.State)
                    .HasColumnName("Address_State")
                    .HasConversion<string>()
                    .HasMaxLength(10);
                address.Property(a => a.Postcode).HasColumnName("Address_Postcode").HasMaxLength(4);
                address.Property(a => a.Country).HasColumnName("Address_Country").HasMaxLength(60);
            }
        );

        builder.OwnsOne(
            v => v.AvailabilitySettings,
            settings =>
            {
                settings
                    .Property(s => s.SelfServiceMode)
                    .HasColumnName("AvailabilitySelfServiceMode")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired()
                    .HasDefaultValue(SelfServiceMode.RequiresApproval)
                    .ValueGeneratedNever();

                settings
                    .Property(s => s.AdvanceNoticeDays)
                    .HasColumnName("AvailabilityAdvanceNoticeDays")
                    .IsRequired()
                    .HasDefaultValue(7)
                    .ValueGeneratedNever();
            }
        );

        builder.Navigation(v => v.AvailabilitySettings).IsRequired();

        // Real relational table, not jsonb — same rationale as Shift's
        // owned collections (see ShiftConfiguration): a manager's trading
        // hours are read on every roster-builder load, not just settings.
        builder.OwnsMany(
            v => v.TradingHours,
            session =>
            {
                session.ToTable("VenueTradingHours");
                session.WithOwner().HasForeignKey("VenueId");
                session.Property<int>("Id");
                session.HasKey("VenueId", "Id");

                session.Property(s => s.DayOfWeek).HasConversion<string>().HasMaxLength(10);
                session.Property(s => s.SessionLabel).HasMaxLength(50);
                session.Property(s => s.IsClosed);
                session.Property(s => s.CrossesMidnight);
            }
        );
    }
}
