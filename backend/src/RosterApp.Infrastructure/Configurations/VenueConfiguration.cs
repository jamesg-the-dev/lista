using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Configurations;

public sealed class VenueConfiguration : IEntityTypeConfiguration<Venue>
{
    public void Configure(EntityTypeBuilder<Venue> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).ValueGeneratedNever();
        builder.Property(v => v.Name).IsRequired().HasMaxLength(200);
        builder.HasIndex(v => v.OrganisationId);
        builder.HasOne<Organisation>().WithMany().HasForeignKey(v => v.OrganisationId).OnDelete(DeleteBehavior.Cascade);
    }
}
