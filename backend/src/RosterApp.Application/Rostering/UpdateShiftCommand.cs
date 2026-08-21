using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Staffing;

namespace RosterApp.Application.Rostering;

public sealed record UpdateShiftCommand(
    Guid ShiftId,
    Guid VenueId,
    Guid EmployeeId,
    DateOnly ShiftDate,
    TimeOnly Start,
    TimeOnly End,
    int UnpaidBreakMinutes,
    decimal BaseRatePerHour
) : IRequest<ShiftDto>, IVenueScopedRequest;

/// <summary>
/// Same double-booking guard as CreateShiftCommandValidator — see the
/// comment there for why this is an async validation rule rather than an
/// inline handler check.
/// </summary>
public sealed class UpdateShiftCommandValidator : AbstractValidator<UpdateShiftCommand>
{
    public UpdateShiftCommandValidator(IStaffAvailabilityChecker staffAvailabilityChecker)
    {
        RuleFor(c => c.ShiftId).NotEmpty();
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.EmployeeId).NotEmpty();
        RuleFor(c => c.End).GreaterThan(c => c.Start).WithMessage("Shift end must be after start.");
        RuleFor(c => c.UnpaidBreakMinutes).GreaterThanOrEqualTo(0);
        RuleFor(c => c.BaseRatePerHour).GreaterThan(0);

        RuleFor(c => c)
            .MustAsync((command, cancellationToken) =>
                staffAvailabilityChecker.IsAvailableAsync(command.EmployeeId, command.ShiftDate, cancellationToken))
            .WithMessage("This staff member is on approved leave or marked unavailable for the selected date.")
            .WithName("EmployeeId");
    }
}

public sealed class UpdateShiftCommandHandler(
    IAwardRateCalculator awardRateCalculator,
    IRosterComplianceValidator complianceValidator,
    IRosterComplianceThresholdsLookup complianceThresholdsLookup,
    IShiftRepository shiftRepository,
    IRosterLookup rosterLookup,
    IUnitOfWork unitOfWork
) : IRequestHandler<UpdateShiftCommand, ShiftDto>
{
    // Same context window as CreateShiftCommandHandler — see the comment there.
    private const int ComplianceContextDays = 8;

    public async Task<ShiftDto> Handle(UpdateShiftCommand request, CancellationToken cancellationToken)
    {
        var shift = await shiftRepository.GetByIdAsync(request.ShiftId, cancellationToken);
        if (shift is null || shift.VenueId != request.VenueId)
        {
            throw new NotFoundException($"Shift '{request.ShiftId}' was not found.");
        }

        var awardBreakdown = awardRateCalculator.Calculate(
            request.ShiftDate.DayOfWeek,
            request.Start,
            request.End,
            request.UnpaidBreakMinutes,
            request.BaseRatePerHour);

        shift.UpdateSchedule(
            request.EmployeeId,
            request.ShiftDate,
            request.Start,
            request.End,
            request.UnpaidBreakMinutes,
            request.BaseRatePerHour,
            awardBreakdown);

        var adjacentShifts = await rosterLookup.GetShiftsForEmployeeAsync(
            request.EmployeeId,
            request.ShiftDate.AddDays(-ComplianceContextDays),
            request.ShiftDate.AddDays(ComplianceContextDays),
            excludeShiftId: shift.Id,
            cancellationToken);

        var thresholds = await complianceThresholdsLookup.GetActiveThresholdsAsync(request.VenueId, cancellationToken);
        var violations = await complianceValidator.ValidateAsync(shift, adjacentShifts, thresholds, cancellationToken);
        shift.SetComplianceViolations(violations);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ShiftDto.FromDomain(shift);
    }
}
