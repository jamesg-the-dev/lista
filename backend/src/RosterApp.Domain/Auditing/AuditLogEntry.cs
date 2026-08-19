namespace RosterApp.Domain.Auditing;

/// <summary>
/// Append-only record written by AuditSaveChangesInterceptor for every
/// domain event raised on an AggregateRoot during a SaveChanges call.
/// Never updated or deleted once written.
/// </summary>
public sealed class AuditLogEntry
{
    public Guid Id { get; private set; }
    public DateTime OccurredAtUtc { get; private set; }
    public Guid? OrganisationId { get; private set; }
    public Guid? ActorId { get; private set; } // Manager or StaffMember id, when known
    public string EventType { get; private set; } = null!;
    public string EntityType { get; private set; } = null!;
    public Guid? EntityId { get; private set; }
    public string PayloadJson { get; private set; } = null!;

    private AuditLogEntry() { } // EF Core

    public static AuditLogEntry Create(
        Guid? organisationId,
        Guid? actorId,
        string eventType,
        string entityType,
        Guid? entityId,
        string payloadJson)
    {
        return new AuditLogEntry
        {
            Id = Guid.NewGuid(),
            OccurredAtUtc = DateTime.UtcNow,
            OrganisationId = organisationId,
            ActorId = actorId,
            EventType = eventType,
            EntityType = entityType,
            EntityId = entityId,
            PayloadJson = payloadJson,
        };
    }
}
