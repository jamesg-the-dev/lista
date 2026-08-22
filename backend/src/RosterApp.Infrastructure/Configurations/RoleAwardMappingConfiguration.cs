using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Staffing;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Configurations;

public sealed class RoleAwardMappingConfiguration : IEntityTypeConfiguration<RoleAwardMapping>
{
    public void Configure(EntityTypeBuilder<RoleAwardMapping> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).ValueGeneratedNever();
        builder.Property(m => m.CreatedByStaffMemberId).IsRequired();

        builder.HasIndex(m => m.VenueId);

        // Enforces "only one currently-active mapping per role" at the DB
        // level — same temporal-versioning backstop as AwardConfiguration's
        // partial unique index on VenueId.
        builder.HasIndex(m => m.RoleId)
            .HasDatabaseName("IX_RoleAwardMappings_RoleId_Active")
            .IsUnique()
            .HasFilter("\"EffectiveToUtc\" IS NULL");

        builder
            .HasOne<Venue>()
            .WithMany()
            .HasForeignKey(m => m.VenueId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne<Role>()
            .WithMany()
            .HasForeignKey(m => m.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne<AwardClassificationDefinition>()
            .WithMany()
            .HasForeignKey(m => m.AwardClassificationId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
