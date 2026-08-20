using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

public sealed record CreateShiftCommand(
    Guid VenueId,
    Guid EmployeeId,
    DateOnly ShiftDate,
    TimeOnly Start,
    TimeOnly End,
    int UnpaidBreakMinutes,
    decimal BaseRatePerHour
) : IRequest<ShiftDto>, IVenueScopedRequest;

/// <summary>
/// Double-booking guard (CLAUDE.md build order step 2: "the roster builder
/// can't stop a manager double-booking someone on leave without it") runs
/// as an async FluentValidation rule via IStaffAvailabilityChecker, rather
/// than an inline check in the handler — this stays in the pipeline's
/// existing validation stage and gets the same 400 + field-level error
/// shape as every other validation failure, for free.
/// </summary>
public sealed class CreateShiftCommandValidator : AbstractValidator<CreateShiftCommand>
{
    public CreateShiftCommandValidator(IStaffAvailabilityChecker staffAvailabilityChecker)
    {
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

public sealed class CreateShiftCommandHandler(
    IAwardRateCalculator awardRateCalculator,
    IShiftRepository shiftRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<CreateShiftCommand, ShiftDto>
{
    public async Task<ShiftDto> Handle(CreateShiftCommand request, CancellationToken cancellationToken)
    {
        var awardBreakdown = awardRateCalculator.Calculate(
            request.ShiftDate.DayOfWeek,
            request.Start,
            request.End,
            request.UnpaidBreakMinutes,
            request.BaseRatePerHour);

        var shift = Shift.Create(
            request.VenueId,
            request.EmployeeId,
            request.ShiftDate,
            request.Start,
            request.End,
            request.UnpaidBreakMinutes,
            awardBreakdown);

        shiftRepository.Add(shift);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ShiftDto.FromDomain(shift);
    }
}
