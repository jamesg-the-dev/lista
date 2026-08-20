using RosterApp.Domain.Common;

namespace RosterApp.Domain.Rostering;

public enum SwapRequestStatus
{
    Pending,
    Approved,
    Rejected,
    Cancelled,
}

/// <summary>
/// Aggregate root for a staff-initiated request to hand off a rostered
/// shift to another staff member. TargetStaffId is nullable to match
/// CLAUDE.md's aggregate spec ("nullable if open"), but RequestSwapCommand
/// currently requires it — an "anyone can claim this" open-swap flow needs
/// its own claiming semantics (who becomes the assignee, and when) that
/// aren't specified yet, so it's left as a domain-model affordance rather
/// than built out this phase.
///
/// TargetStaffAccepted tracks the target's accept/decline
/// (RespondToSwapCommand) as a step distinct from Status, which only the
/// manager's Approve/Reject moves to its terminal value. This keeps Status
/// exactly the four values CLAUDE.md specifies rather than growing a
/// "PendingManagerReview" status to represent the same information — a
/// decline from the target still resolves Status to Rejected immediately,
/// since there's nothing left for a manager to decide.
/// </summary>
public sealed class SwapRequest : AggregateRoot
{
    public Guid Id { get; private set; }
    public Guid VenueId { get; private set; }
    public Guid ShiftId { get; private set; }
    public Guid RequestingStaffId { get; private set; }
    public Guid? TargetStaffId { get; private set; }
    public string? Reason { get; private set; }
    public SwapRequestStatus Status { get; private set; } = SwapRequestStatus.Pending;
    public bool? TargetStaffAccepted { get; private set; }
    public string? ManagerDecisionReason { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private SwapRequest() { } // EF Core

    public static SwapRequest Request(
        Guid venueId,
        Guid shiftId,
        Guid requestingStaffId,
        Guid? targetStaffId,
        string? reason)
    {
        var swapRequest = new SwapRequest
        {
            Id = Guid.NewGuid(),
            VenueId = venueId,
            ShiftId = shiftId,
            RequestingStaffId = requestingStaffId,
            TargetStaffId = targetStaffId,
            Reason = reason,
            Status = SwapRequestStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow,
        };

        swapRequest.AddDomainEvent(new SwapRequestCreated(swapRequest.Id, venueId, shiftId, DateTime.UtcNow));

        return swapRequest;
    }

    public void RespondAsTarget(bool accepted)
    {
        EnsurePending();

        if (TargetStaffId is null)
        {
            throw new InvalidOperationException($"Swap request '{Id}' has no target staff member to respond.");
        }

        TargetStaffAccepted = accepted;

        if (!accepted)
        {
            Status = SwapRequestStatus.Rejected;
            AddDomainEvent(new SwapRequestRejected(Id, VenueId, ShiftId, "Declined by target staff member.", DateTime.UtcNow));
        }
    }

    /// <summary>
    /// Only flips this aggregate's own state — reassigning the Shift and
    /// re-running IAwardRateCalculator/IRosterComplianceValidator is the
    /// command handler's job (see ApproveSwapCommandHandler), same
    /// separation as every other cross-aggregate write in this codebase.
    /// </summary>
    public void Approve()
    {
        EnsurePending();

        if (TargetStaffId is not null && TargetStaffAccepted != true)
        {
            // TODO: throws InvalidOperationException, which ApiExceptionHandler
            // has no specific case for and falls through to a 500 — this is a
            // predictable "not ready yet" condition that deserves a proper
            // 409, not a generic server error. Same gap as
            // Shift.AcknowledgeComplianceViolation's InvalidOperationException.
            // Introduce a dedicated exception (e.g. DomainConflictException)
            // that ApiExceptionHandler maps to 409, and use it for both.
            throw new InvalidOperationException(
                $"Swap request '{Id}' cannot be approved before the target staff member accepts.");
        }

        Status = SwapRequestStatus.Approved;
        AddDomainEvent(new SwapRequestApproved(Id, VenueId, ShiftId, DateTime.UtcNow));
    }

    public void Reject(string? reason)
    {
        EnsurePending();

        Status = SwapRequestStatus.Rejected;
        ManagerDecisionReason = reason;
        AddDomainEvent(new SwapRequestRejected(Id, VenueId, ShiftId, reason, DateTime.UtcNow));
    }

    private void EnsurePending()
    {
        if (Status != SwapRequestStatus.Pending)
        {
            throw new InvalidOperationException($"Swap request '{Id}' has already been {Status}.");
        }
    }
}
