using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Rostering;

namespace RosterApp.Application.Timekeeping;

public sealed record ClockOutCommand(Guid TimeEntryId, decimal Latitude, decimal Longitude, decimal AccuracyMetres)
    : IRequest<TimeEntryDto>, IRequiresPermissionLevel
{
    public RosterApp.Domain.Staffing.PermissionLevel? MinimumPermissionLevel => null;
}

public sealed class ClockOutCommandValidator : AbstractValidator<ClockOutCommand>
{
    public ClockOutCommandValidator()
    {
        RuleFor(c => c.TimeEntryId).NotEmpty();
        RuleFor(c => c.Latitude).InclusiveBetween(-90m, 90m);
        RuleFor(c => c.Longitude).InclusiveBetween(-180m, 180m);
        RuleFor(c => c.AccuracyMetres).GreaterThanOrEqualTo(0);
    }
}

/// <summary>
/// Computes the rostered-vs-actual variance inline (CLAUDE.md Phase 6:
/// "Build the variance comparison inside the clock-out command, not as a
/// follow-up") rather than deferring it to a report. RosteredMinutes comes
/// from the Shift's Start/End/UnpaidBreakMinutes — the same paid-hours
/// definition IAwardRateCalculator uses.
/// </summary>
public sealed class ClockOutCommandHandler(
    ITimeEntryRepository timeEntryRepository,
    IShiftRepository shiftRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<ClockOutCommand, TimeEntryDto>
{
    /// <summary>
    /// Minutes either side of the rostered time before a discrepancy is
    /// flagged for manager review rather than treated as normal
    /// early/late clock-in noise. Illustrative starting point, not sourced
    /// from an award/EBA rule — same disclaimer as IAwardRateCalculator's
    /// figures (see CLAUDE.md).
    /// </summary>
    private const int ToleranceMinutes = 15;

    public async Task<TimeEntryDto> Handle(ClockOutCommand request, CancellationToken cancellationToken)
    {
        if (tenantContext.StaffMemberId is not { } staffMemberId)
        {
            throw new ForbiddenAccessException("Only an authenticated staff member can clock out.");
        }

        var entry = await timeEntryRepository.GetByIdAsync(request.TimeEntryId, cancellationToken);
        if (entry is null || entry.StaffId != staffMemberId)
        {
            throw new NotFoundException($"Time entry '{request.TimeEntryId}' was not found.");
        }

        var shift = await shiftRepository.GetByIdAsync(entry.ShiftId, cancellationToken)
            ?? throw new NotFoundException($"Shift '{entry.ShiftId}' was not found.");

        var rosteredMinutes = (int)((shift.End.ToTimeSpan() - shift.Start.ToTimeSpan()).TotalMinutes - shift.UnpaidBreakMinutes);

        entry.ClockOut(request.Latitude, request.Longitude, request.AccuracyMetres, rosteredMinutes, ToleranceMinutes);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return TimeEntryDto.FromDomain(entry);
    }
}
