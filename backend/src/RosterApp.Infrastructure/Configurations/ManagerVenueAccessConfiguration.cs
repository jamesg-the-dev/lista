using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Configurations;

public sealed class ManagerVenueAccessConfiguration : IEntityTypeConfiguration<ManagerVenueAccess>
{
    public void Configure(EntityTypeBuilder<ManagerVenueAccess> builder)
    {
        builder.HasKey(a => new { a.ManagerId, a.VenueId });
        builder.HasOne<Manager>().WithMany().HasForeignKey(a => a.ManagerId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Venue>().WithMany().HasForeignKey(a => a.VenueId).OnDelete(DeleteBehavior.Cascade);
    }
}
