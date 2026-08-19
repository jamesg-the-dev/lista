namespace RosterApp.Domain.Common;

/// <summary>
/// Base for aggregate roots that raise domain events. Every subsequent
/// aggregate (Shift in Phase 1, StaffMember in Phase 2, ...) inherits this
/// so the audit interceptor has a single ChangeTracker shape to scan for
/// pending events, instead of each aggregate wiring its own event list.
/// </summary>
public abstract class AggregateRoot
{
    private readonly List<IDomainEvent> _domainEvents = [];

    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    protected void AddDomainEvent(IDomainEvent domainEvent) => _domainEvents.Add(domainEvent);

    public void ClearDomainEvents() => _domainEvents.Clear();
}
