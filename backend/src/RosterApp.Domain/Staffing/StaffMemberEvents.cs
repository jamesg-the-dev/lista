using RosterApp.Domain.Common;

namespace RosterApp.Domain.Staffing;

public sealed record StaffMemberCreated(Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record StaffMemberUpdated(Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record StaffMemberSupabaseAccountLinked(Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record StaffMemberPermissionLevelChanged(Guid StaffMemberId, PermissionLevel PermissionLevel, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record StaffMemberPayRateOverrideSet(Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record StaffMemberPayRateOverrideCleared(Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record StaffMemberDeactivated(Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;
