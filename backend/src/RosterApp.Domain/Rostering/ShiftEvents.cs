using RosterApp.Domain.Common;

namespace RosterApp.Domain.Rostering;

public sealed record ShiftCreated(Guid ShiftId, Guid VenueId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record ShiftUpdated(Guid ShiftId, Guid VenueId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record ShiftDeleted(Guid ShiftId, Guid VenueId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record ComplianceViolationOverridden(
    Guid ShiftId,
    Guid VenueId,
    ComplianceViolationType ViolationType,
    string Reason,
    DateTime OccurredAtUtc) : IDomainEvent;
