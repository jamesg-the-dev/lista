using FluentValidation;
using MediatR;
using RosterApp.Application.AwardConfig;
using RosterApp.Application.Common;
using RosterApp.Application.Staffing;
using RosterApp.Domain.AwardConfig;
using RosterApp.Domain.Rostering;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Rostering;

public sealed record CreateShiftCommand(
    Guid VenueId,
    Guid EmployeeId,
    DateOnly ShiftDate,
    TimeOnly Start,
    TimeOnly End,
    int UnpaidBreakMinutes,
    decimal BaseRatePerHour
) : IRequest<ShiftDto>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Supervisor;
}

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
    IAwardRateCalculatorFactory awardRateCalculatorFactory,
    IAwardCalculationRateLookup awardCalculationRateLookup,
    IAwardConfigurationLookup awardConfigurationLookup,
    IRosterComplianceValidator complianceValidator,
    IRosterComplianceThresholdsLookup complianceThresholdsLookup,
    IStaffLookup staffLookup,
    IShiftRepository shiftRepository,
    IRosterLookup rosterLookup,
    IUnitOfWork unitOfWork
) : IRequestHandler<CreateShiftCommand, ShiftDto>
{
    /// <summary>
    /// Days either side of the shift date fetched as compliance context —
    /// wide enough to catch a rest-between-shifts breach against the
    /// adjoining day and a consecutive-day streak past the 6-day guideline
    /// (see HospitalityGeneralAwardComplianceValidator) without pulling in
    /// the whole roster.
    /// </summary>
    private const int ComplianceContextDays = 8;

    public async Task<ShiftDto> Handle(CreateShiftCommand request, CancellationToken cancellationToken)
    {
        var employee = await staffLookup.GetStaffMemberAsync(request.EmployeeId, cancellationToken)
            ?? throw new NotFoundException($"Staff member '{request.EmployeeId}' was not found.");

        // Resolves the venue's configured award (defaults to Hospitality if
        // never configured) rather than always pricing under MA000009 — see
        // IAwardRateCalculatorFactory.
        var awardConfig = await awardConfigurationLookup.GetActiveAsync(request.VenueId, cancellationToken);
        var awardId = awardConfig?.AwardId ?? WellKnownAwards.HospitalityGeneralAwardId;
        var awardRateCalculator = awardRateCalculatorFactory.GetCalculator(awardId);
        var rates = await awardCalculationRateLookup.GetEffectiveRatesAsync(awardId, request.ShiftDate, cancellationToken);

        var awardBreakdown = awardRateCalculator.Calculate(
            request.ShiftDate.DayOfWeek,
            request.Start,
            request.End,
            request.UnpaidBreakMinutes,
            request.BaseRatePerHour,
            Enum.Parse<EmploymentType>(employee.EmploymentType),
            rates);

        var shift = Shift.Create(
            request.VenueId,
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
            excludeShiftId: null,
            cancellationToken);

        var thresholds = await complianceThresholdsLookup.GetActiveThresholdsAsync(request.VenueId, cancellationToken);
        var violations = await complianceValidator.ValidateAsync(shift, adjacentShifts, thresholds, cancellationToken);
        shift.SetComplianceViolations(violations);

        shiftRepository.Add(shift);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ShiftDto.FromDomain(shift);
    }
}
