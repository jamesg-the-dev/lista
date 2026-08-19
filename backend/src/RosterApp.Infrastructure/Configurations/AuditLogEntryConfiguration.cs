using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Auditing;

namespace RosterApp.Infrastructure.Configurations;

public sealed class AuditLogEntryConfiguration : IEntityTypeConfiguration<AuditLogEntry>
{
    public void Configure(EntityTypeBuilder<AuditLogEntry> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.EventType).IsRequired().HasMaxLength(200);
        builder.Property(e => e.EntityType).IsRequired().HasMaxLength(200);
        builder.Property(e => e.PayloadJson).IsRequired();
        builder.HasIndex(e => e.OrganisationId);
        builder.HasIndex(e => new { e.EntityType, e.EntityId });
    }
}
