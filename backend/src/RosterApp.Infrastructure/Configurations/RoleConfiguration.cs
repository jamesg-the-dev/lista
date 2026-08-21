using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Staffing;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Configurations;

public sealed class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.DisplayName).IsRequired().HasMaxLength(100);
        builder.Property(r => r.ColorTag).HasMaxLength(30);
        builder.Property(r => r.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(r => r.CreatedByManagerId).IsRequired();

        builder.HasIndex(r => r.VenueId);

        // Case-insensitive uniqueness among active roles (§6) is enforced
        // by RoleUniquenessChecker's async check; the matching DB-level
        // backstop is a raw-SQL expression index added directly in the
        // migration (EF's fluent HasIndex API has no way to express
        // lower(display_name)) — see the StaffRolesSettings migration.
        builder
            .HasOne<Venue>()
            .WithMany()
            .HasForeignKey(r => r.VenueId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
