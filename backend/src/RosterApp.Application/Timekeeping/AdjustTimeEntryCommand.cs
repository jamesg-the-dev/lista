using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Rostering;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Timekeeping;

public sealed record AdjustTimeEntryCommand(Guid TimeEntryId, DateTime ClockInUtc, DateTime ClockOutUtc, string Reason) : IRequest<TimeEntryDto>;

public sealed class AdjustTimeEntryCommandValidator : AbstractValidator<AdjustTimeEntryCommand>
{
    public AdjustTimeEntryCommandValidator()
    {
        RuleFor(c => c.TimeEntryId).NotEmpty();
        RuleFor(c => c.ClockOutUtc).GreaterThan(c => c.ClockInUtc).WithMessage("Clock-out must be after clock-in.");
        RuleFor(c => c.Reason).NotEmpty().WithMessage("An adjustment reason is required.");
    }
}

/// <summary>
/// Manager-only correction of a flagged entry's clock times, recomputing
/// variance from the corrected times — see CLAUDE.md Phase 6: "manager
/// resolves a flagged entry before hours lock". Doesn't itself approve the
/// entry; ApproveTimeEntryCommand is the separate, explicit lock step.
/// </summary>
public sealed class AdjustTimeEntryCommandHandler(
    ITimeEntryRepository timeEntryRepository,
    IShiftRepository shiftRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<AdjustTimeEntryCommand, TimeEntryDto>
{
    // Same tolerance value as ClockOutCommandHandler — duplicated privately
    // rather than shared, same as CreateShiftCommandHandler/
    // ApproveSwapCommandHandler's ComplianceContextDays.
    private const int ToleranceMinutes = 15;

    public async Task<TimeEntryDto> Handle(AdjustTimeEntryCommand request, CancellationToken cancellationToken)
    {
        var entry = await timeEntryRepository.GetByIdAsync(request.TimeEntryId, cancellationToken);
        if (entry is null || tenantContext.PermissionLevel is null or PermissionLevel.Staff || !tenantContext.AccessibleVenueIds.Contains(entry.VenueId))
        {
            throw new NotFoundException($"Time entry '{request.TimeEntryId}' was not found.");
        }

        var shift = await shiftRepository.GetByIdAsync(entry.ShiftId, cancellationToken)
            ?? throw new NotFoundException($"Shift '{entry.ShiftId}' was not found.");

        var rosteredMinutes = (int)((shift.End.ToTimeSpan() - shift.Start.ToTimeSpan()).TotalMinutes - shift.UnpaidBreakMinutes);

        entry.Adjust(request.ClockInUtc, request.ClockOutUtc, rosteredMinutes, ToleranceMinutes, request.Reason);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return TimeEntryDto.FromDomain(entry);
    }
}
