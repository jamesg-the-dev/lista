namespace RosterApp.Domain.Common;

/// <summary>
/// Marker for an event raised by an aggregate root. Picked up by the
/// audit interceptor (see RosterApp.Infrastructure.Auditing) and written
/// as an append-only AuditLogEntry — the audit trail is driven by these
/// events, not by generic EF change-tracking diffs.
/// </summary>
public interface IDomainEvent
{
    DateTime OccurredAtUtc { get; }
}
