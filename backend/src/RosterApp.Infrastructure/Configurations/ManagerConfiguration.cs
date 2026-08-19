using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Configurations;

public sealed class ManagerConfiguration : IEntityTypeConfiguration<Manager>
{
    public void Configure(EntityTypeBuilder<Manager> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).ValueGeneratedNever();
        builder.Property(m => m.SupabaseUserId).IsRequired().HasMaxLength(200);
        builder.Property(m => m.Name).IsRequired().HasMaxLength(200);
        builder.Property(m => m.Email).IsRequired().HasMaxLength(320);
        builder.HasIndex(m => m.SupabaseUserId).IsUnique();
        builder.HasIndex(m => m.OrganisationId);
        builder.HasOne<Organisation>().WithMany().HasForeignKey(m => m.OrganisationId).OnDelete(DeleteBehavior.Cascade);
    }
}
