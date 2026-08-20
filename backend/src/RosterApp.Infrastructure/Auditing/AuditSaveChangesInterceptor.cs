using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RosterApp.Application.Common;
using RosterApp.Domain.Auditing;
using RosterApp.Domain.Common;

namespace RosterApp.Infrastructure.Auditing;

/// <summary>
/// Append-only audit trail, driven entirely by domain events raised on
/// AggregateRoot entities — not by generic EF change-tracking diffs. Wired
/// into RosterDbContext now (Phase 0) so every subsequent aggregate
/// (Shift from Phase 1 onward) only needs to call AddDomainEvent to get an
/// audit entry for free.
/// </summary>
public sealed class AuditSaveChangesInterceptor(ICurrentTenantContext tenantContext) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        AppendAuditEntries(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        AppendAuditEntries(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    private void AppendAuditEntries(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        // A Phase 5 staff-authenticated request (e.g. RequestSwapCommand) has
        // no ManagerId — fall back to StaffMemberId so the audit trail still
        // records who acted instead of silently recording no one.
        var actorId = tenantContext.IsAuthenticated
            ? (tenantContext.IsManager ? tenantContext.ManagerId : tenantContext.StaffMemberId)
            : null;
        var organisationId = tenantContext.IsAuthenticated ? tenantContext.OrganisationId : (Guid?)null;

        foreach (var entry in context.ChangeTracker.Entries<AggregateRoot>().ToList())
        {
            if (entry.Entity.DomainEvents.Count == 0)
            {
                continue;
            }

            var entityId = TryGetPrimaryKeyValue(entry);

            foreach (var domainEvent in entry.Entity.DomainEvents)
            {
                context.Set<AuditLogEntry>().Add(AuditLogEntry.Create(
                    organisationId,
                    actorId,
                    domainEvent.GetType().Name,
                    entry.Entity.GetType().Name,
                    entityId,
                    JsonSerializer.Serialize(domainEvent, domainEvent.GetType())));
            }

            entry.Entity.ClearDomainEvents();
        }
    }

    private static Guid? TryGetPrimaryKeyValue(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<AggregateRoot> entry)
    {
        var key = entry.Metadata.FindPrimaryKey();
        if (key is null || key.Properties.Count != 1)
        {
            return null;
        }

        var value = entry.Property(key.Properties[0].Name).CurrentValue;
        return value as Guid?;
    }
}
