using RosterApp.Domain.Common;

namespace RosterApp.Domain.Timekeeping;

public sealed record TimeEntryClockedIn(Guid TimeEntryId, Guid VenueId, Guid ShiftId, Guid StaffId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record TimeEntryClockedOut(
    Guid TimeEntryId,
    Guid VenueId,
    Guid ShiftId,
    int VarianceMinutes,
    string VarianceStatus,
    DateTime OccurredAtUtc) : IDomainEvent;

public sealed record TimeEntryAdjusted(Guid TimeEntryId, Guid VenueId, Guid ShiftId, string Reason, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record TimeEntryApproved(Guid TimeEntryId, Guid VenueId, Guid ShiftId, DateTime OccurredAtUtc) : IDomainEvent;
