using MediatR;
using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

public sealed record CreateShiftCommand(
    Guid VenueId,
    Guid EmployeeId,
    DateOnly ShiftDate,
    TimeOnly Start,
    TimeOnly End,
    int UnpaidBreakMinutes
) : IRequest<CreateShiftResult>;

public sealed record CreateShiftResult(Guid ShiftId, decimal CalculatedCost, string RateLabel);

public sealed class CreateShiftCommandHandler(
    IAwardRateCalculator awardRateCalculator
    // IShiftRepository repository,
    // ITenantContext tenantContext
) : IRequestHandler<CreateShiftCommand, CreateShiftResult>
{
    public Task<CreateShiftResult> Handle(CreateShiftCommand request, CancellationToken cancellationToken)
    {
        // TODO: load employee's base rate + classification from repository (tenant-scoped)
        // TODO: construct Shift aggregate, raise ShiftCreated domain event (picked up by
        //       the audit interceptor, same pattern as CauseCorrectionSubmission in Pentana)
        // TODO: persist via repository, SaveChangesAsync

        var rate = awardRateCalculator.Calculate(
            request.ShiftDate.DayOfWeek,
            request.Start,
            request.End,
            request.UnpaidBreakMinutes,
            baseRatePerHour: 0m // placeholder until employee lookup is wired up
        );

        return Task.FromResult(new CreateShiftResult(Guid.NewGuid(), rate.TotalCost, rate.RateLabel));
    }
}
