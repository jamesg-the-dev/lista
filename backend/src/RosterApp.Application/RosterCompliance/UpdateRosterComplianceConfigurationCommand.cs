using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Application.RosterCompliance;

public sealed record MealBreakRuleInput(decimal AfterHoursWorked, int BreakDurationMinutes, bool IsPaid);

public sealed record MinorRosterRuleInput(decimal MaxDailyHours, decimal MaxWeeklyHours, TimeOnly EarliestStartTime, TimeOnly LatestFinishTime);

/// <summary>
/// Never updates RosterComplianceConfiguration in place — the handler
/// supersedes the current active row (if any) and inserts a new one, per
/// FEATURE_SETTINGS_ROSTER_RULES_COMPLIANCE.md §3's temporal-versioning
/// decision. One command covers the whole "Roster Rules" form (shift
/// length, rest period, meal breaks, overtime threshold, minor rules) since
/// the UI mockup saves it all behind a single "Save Changes" button.
/// </summary>
public sealed record UpdateRosterComplianceConfigurationCommand(
    Guid VenueId,
    int MinShiftLengthMinutes,
    int MaxShiftLengthMinutes,
    int MinRestBetweenShiftsMinutes,
    int WeeklyOvertimeThresholdMinutes,
    MinorRosterRuleInput MinorRules,
    IReadOnlyList<MealBreakRuleInput> MealBreakRules
) : IRequest<RosterComplianceConfigurationDto>, IVenueScopedRequest;

/// <summary>
/// Minimum rest below the 10-hour floor is a hard block with no override —
/// it's a legal minimum, per §6 — enforced here as the primary 400-with-
/// field-error path, and again as a domain invariant in CreateNewVersion as
/// a defense-in-depth backstop (same "both layers check it" pattern as
/// UpdateAwardConfigurationCommandValidator's casual-loading floor).
/// </summary>
public sealed class UpdateRosterComplianceConfigurationCommandValidator : AbstractValidator<UpdateRosterComplianceConfigurationCommand>
{
    public UpdateRosterComplianceConfigurationCommandValidator()
    {
        RuleFor(c => c.VenueId).NotEmpty();

        RuleFor(c => c.MinShiftLengthMinutes).GreaterThan(0);
        RuleFor(c => c.MaxShiftLengthMinutes)
            .GreaterThanOrEqualTo(c => c.MinShiftLengthMinutes)
            .WithMessage("Maximum shift length cannot be less than the minimum shift length.");

        RuleFor(c => c.MinRestBetweenShiftsMinutes)
            .GreaterThanOrEqualTo(RosterComplianceConfiguration.MinimumRestBetweenShiftsMinutesFloor)
            .WithMessage(
                $"Minimum rest between shifts cannot be set below {RosterComplianceConfiguration.MinimumRestBetweenShiftsMinutesFloor / 60} hours — this is a legal minimum.");

        RuleFor(c => c.WeeklyOvertimeThresholdMinutes).GreaterThan(0);

        RuleFor(c => c.MinorRules.MaxDailyHours).InclusiveBetween(0, 24);
        RuleFor(c => c.MinorRules.MaxWeeklyHours).InclusiveBetween(0, 168);
        RuleFor(c => c.MinorRules.LatestFinishTime)
            .GreaterThan(c => c.MinorRules.EarliestStartTime)
            .WithMessage("Latest finish time must be after earliest start time for under-18 rostering rules.");

        RuleForEach(c => c.MealBreakRules).ChildRules(rule =>
        {
            rule.RuleFor(r => r.AfterHoursWorked).GreaterThan(0).LessThanOrEqualTo(24);
            rule.RuleFor(r => r.BreakDurationMinutes).GreaterThan(0);
        });
    }
}

public sealed class UpdateRosterComplianceConfigurationCommandHandler(
    IRosterComplianceConfigurationRepository repository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<UpdateRosterComplianceConfigurationCommand, RosterComplianceConfigurationDto>
{
    public async Task<RosterComplianceConfigurationDto> Handle(UpdateRosterComplianceConfigurationCommand request, CancellationToken cancellationToken)
    {
        var currentConfig = await repository.GetActiveByVenueIdAsync(request.VenueId, cancellationToken);

        var minorRules = MinorRosterRule.Create(
            request.MinorRules.MaxDailyHours,
            request.MinorRules.MaxWeeklyHours,
            request.MinorRules.EarliestStartTime,
            request.MinorRules.LatestFinishTime);

        var mealBreakRules = request.MealBreakRules
            .Select(r => MealBreakRule.Create(r.AfterHoursWorked, r.BreakDurationMinutes, r.IsPaid))
            .ToList();

        var newConfig = RosterComplianceConfiguration.CreateNewVersion(
            request.VenueId,
            request.MinShiftLengthMinutes,
            request.MaxShiftLengthMinutes,
            request.MinRestBetweenShiftsMinutes,
            request.WeeklyOvertimeThresholdMinutes,
            minorRules,
            mealBreakRules,
            tenantContext.ManagerId);

        currentConfig?.Supersede(DateTime.UtcNow);
        repository.Add(newConfig);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return RosterComplianceConfigurationDto.FromDomain(newConfig);
    }
}
