using RosterApp.Domain.Common;

namespace RosterApp.Domain.Rostering;

public sealed record SwapRequestCreated(Guid SwapRequestId, Guid VenueId, Guid ShiftId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record SwapRequestApproved(Guid SwapRequestId, Guid VenueId, Guid ShiftId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record SwapRequestRejected(
    Guid SwapRequestId,
    Guid VenueId,
    Guid ShiftId,
    string? Reason,
    DateTime OccurredAtUtc) : IDomainEvent;
