using RosterApp.Domain.Common;

namespace RosterApp.Domain.Staffing;

public sealed record LeaveRequestSubmitted(Guid LeaveRequestId, Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record LeaveRequestApproved(Guid LeaveRequestId, Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;

public sealed record LeaveRequestDeclined(Guid LeaveRequestId, Guid StaffMemberId, DateTime OccurredAtUtc) : IDomainEvent;
