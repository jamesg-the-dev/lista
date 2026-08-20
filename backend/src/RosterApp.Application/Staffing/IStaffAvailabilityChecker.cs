namespace RosterApp.Application.Staffing;

/// <summary>
/// Narrow read port consumed from Rostering (CreateShiftCommandValidator /
/// UpdateShiftCommandValidator) to block double-booking a staff member who
/// is on approved leave or marked all-day unavailable for the shift's date
/// — see CLAUDE.md build order step 2 ("the roster builder can't stop a
/// manager double-booking someone on leave without it") and
/// docs/backend-step-by-step.md Phase 2. Deliberately narrower than
/// IStaffLookup so Rostering doesn't depend on the full Staffing read
/// model, just this one yes/no check.
/// </summary>
public interface IStaffAvailabilityChecker
{
    Task<bool> IsAvailableAsync(Guid staffMemberId, DateOnly shiftDate, CancellationToken cancellationToken);
}
