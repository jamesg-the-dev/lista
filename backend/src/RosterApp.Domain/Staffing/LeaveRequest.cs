using RosterApp.Domain.Common;

namespace RosterApp.Domain.Staffing;

public enum LeaveRequestStatus
{
    Requested,
    Approved,
    Declined,
}

/// <summary>
/// Aggregate root for a one-off leave request. GetStaffAvailabilityQuery and
/// IStaffAvailabilityChecker (the double-booking guard on
/// CreateShiftCommand/UpdateShiftCommand) only ever consider Approved
/// requests — a Requested or Declined leave request must never block
/// rostering.
/// </summary>
public sealed class LeaveRequest : AggregateRoot
{
    public Guid Id { get; private set; }
    public Guid StaffMemberId { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public LeaveRequestStatus Status { get; private set; } = LeaveRequestStatus.Requested;
    public string? Reason { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private LeaveRequest() { } // EF Core

    public static LeaveRequest Submit(Guid staffMemberId, DateOnly startDate, DateOnly endDate, string? reason)
    {
        var leaveRequest = new LeaveRequest
        {
            Id = Guid.NewGuid(),
            StaffMemberId = staffMemberId,
            StartDate = startDate,
            EndDate = endDate,
            Reason = reason,
            Status = LeaveRequestStatus.Requested,
            CreatedAtUtc = DateTime.UtcNow,
        };

        leaveRequest.AddDomainEvent(new LeaveRequestSubmitted(leaveRequest.Id, staffMemberId, DateTime.UtcNow));

        return leaveRequest;
    }

    public void Approve()
    {
        if (Status != LeaveRequestStatus.Requested)
        {
            throw new InvalidOperationException($"Leave request '{Id}' has already been {Status}.");
        }

        Status = LeaveRequestStatus.Approved;
        AddDomainEvent(new LeaveRequestApproved(Id, StaffMemberId, DateTime.UtcNow));
    }

    public void Decline()
    {
        if (Status != LeaveRequestStatus.Requested)
        {
            throw new InvalidOperationException($"Leave request '{Id}' has already been {Status}.");
        }

        Status = LeaveRequestStatus.Declined;
        AddDomainEvent(new LeaveRequestDeclined(Id, StaffMemberId, DateTime.UtcNow));
    }
}
