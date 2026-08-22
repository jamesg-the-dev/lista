using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Manager-only. Returns the reassigned ShiftDto (not SwapRequestDto) —
/// the useful response for the manager inbox UI is the updated shift, same
/// as OverrideComplianceViolationCommand's return shape.
/// </summary>
public sealed record ApproveSwapCommand(Guid SwapRequestId) : IRequest<ShiftDto>;

/// <summary>
/// Reassigns the Shift and re-runs both IAwardRateCalculator and
/// IRosterComplianceValidator against the new employee — see CLAUDE.md
/// Phase 5: "a swap can silently create a rest-hours breach." SwapRequest.
/// Approve() only flips the swap's own status; this handler owns the
/// cross-aggregate write, same separation of concerns as every other
/// multi-aggregate command in this codebase.
/// </summary>
public sealed class ApproveSwapCommandHandler(
    ISwapRequestRepository swapRequestRepository,
    IShiftRepository shiftRepository,
    IRosterLookup rosterLookup,
    IAwardRateCalculator awardRateCalculator,
    IRosterComplianceValidator complianceValidator,
    IRosterComplianceThresholdsLookup complianceThresholdsLookup,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<ApproveSwapCommand, ShiftDto>
{
    // Same context window as CreateShiftCommandHandler — see the comment there.
    private const int ComplianceContextDays = 8;

    public async Task<ShiftDto> Handle(ApproveSwapCommand request, CancellationToken cancellationToken)
    {
        var swapRequest = await swapRequestRepository.GetByIdAsync(request.SwapRequestId, cancellationToken);
        if (swapRequest is null)
        {
            throw new NotFoundException($"Swap request '{request.SwapRequestId}' was not found.");
        }

        if (tenantContext.PermissionLevel is null or PermissionLevel.Staff || !tenantContext.AccessibleVenueIds.Contains(swapRequest.VenueId))
        {
            throw new NotFoundException($"Swap request '{request.SwapRequestId}' was not found.");
        }

        var shift = await shiftRepository.GetByIdAsync(swapRequest.ShiftId, cancellationToken);
        if (shift is null)
        {
            throw new NotFoundException($"Shift '{swapRequest.ShiftId}' was not found.");
        }

        // Approve() throws if TargetStaffId hasn't accepted yet — validated
        // here first so a rejected approval doesn't still reassign the shift.
        swapRequest.Approve();

        var newEmployeeId = swapRequest.TargetStaffId
            ?? throw new InvalidOperationException($"Swap request '{swapRequest.Id}' has no target staff member to reassign to.");

        var awardBreakdown = awardRateCalculator.Calculate(
            shift.ShiftDate.DayOfWeek,
            shift.Start,
            shift.End,
            shift.UnpaidBreakMinutes,
            shift.BaseRatePerHour);

        shift.UpdateSchedule(
            newEmployeeId,
            shift.ShiftDate,
            shift.Start,
            shift.End,
            shift.UnpaidBreakMinutes,
            shift.BaseRatePerHour,
            awardBreakdown);

        var adjacentShifts = await rosterLookup.GetShiftsForEmployeeAsync(
            newEmployeeId,
            shift.ShiftDate.AddDays(-ComplianceContextDays),
            shift.ShiftDate.AddDays(ComplianceContextDays),
            excludeShiftId: shift.Id,
            cancellationToken);

        var thresholds = await complianceThresholdsLookup.GetActiveThresholdsAsync(shift.VenueId, cancellationToken);
        var violations = await complianceValidator.ValidateAsync(shift, adjacentShifts, thresholds, cancellationToken);
        shift.SetComplianceViolations(violations);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ShiftDto.FromDomain(shift);
    }
}
