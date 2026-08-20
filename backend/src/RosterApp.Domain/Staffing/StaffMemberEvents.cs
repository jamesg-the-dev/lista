using RosterApp.Domain.Common;

namespace RosterApp.Domain.Staffing;

public sealed record StaffMemberCreated(Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record StaffMemberUpdated(Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record StaffMemberSupabaseAccountLinked(Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;
