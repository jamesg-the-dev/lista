using RosterApp.Domain.Common;

namespace RosterApp.Domain.Staffing;

public sealed record StandingUnavailabilitySet(Guid UnavailabilityId, Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record StandingUnavailabilityRemoved(Guid UnavailabilityId, Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;
