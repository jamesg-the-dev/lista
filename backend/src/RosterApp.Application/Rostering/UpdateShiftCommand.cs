using FluentValidation;
using MediatR;
using RosterApp.Application.Common;

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

public sealed class UpdateShiftCommandValidator : AbstractValidator<UpdateShiftCommand>
{
    public UpdateShiftCommandValidator()
    {
        RuleFor(c => c.ShiftId).NotEmpty();
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.EmployeeId).NotEmpty();
        RuleFor(c => c.End).GreaterThan(c => c.Start).WithMessage("Shift end must be after start.");
        RuleFor(c => c.UnpaidBreakMinutes).GreaterThanOrEqualTo(0);
        RuleFor(c => c.BaseRatePerHour).GreaterThan(0);
    }
}

public sealed class UpdateShiftCommandHandler(
    IAwardRateCalculator awardRateCalculator,
    IShiftRepository shiftRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<UpdateShiftCommand, ShiftDto>
{
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
            awardBreakdown);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ShiftDto.FromDomain(shift);
    }
}
