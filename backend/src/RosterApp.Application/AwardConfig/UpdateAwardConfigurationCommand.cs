using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Application.AwardConfig;

public sealed record PenaltyRateToggleInput(string PenaltyType, bool IsEnabled);

/// <summary>
/// Never updates AwardConfiguration in place — the handler supersedes the
/// current active row (if any) and inserts a new one, per
/// FEATURE_SETTINGS_AWARD_PAY_CONFIG.md §3's temporal-versioning decision.
/// One command covers the whole "Award &amp; Pay" form (award, casual
/// loading, super rate, penalty toggles, pay period) since the UI mockup
/// saves it all behind a single "Save Changes" button — there's no separate
/// per-field save, so a dedicated TogglePenaltyRateCommand would just be an
/// unused extra entry point.
/// </summary>
public sealed record UpdateAwardConfigurationCommand(
    Guid VenueId,
    Guid AwardId,
    decimal CasualLoadingPercent,
    decimal SuperannuationRatePercent,
    bool ConfirmBelowMinimumSuper,
    string PayPeriod,
    string PayPeriodCutoffDay,
    IReadOnlyList<PenaltyRateToggleInput> PenaltyToggles
) : IRequest<AwardConfigurationDto>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public RosterApp.Domain.Staffing.PermissionLevel? MinimumPermissionLevel => RosterApp.Domain.Staffing.PermissionLevel.Owner;
}

/// <summary>
/// Casual loading below the award minimum is a hard block (no override —
/// it's a legal minimum, per §6). Super rate below the statutory minimum is
/// a soft block: it fails validation unless ConfirmBelowMinimumSuper is set,
/// giving the owner an explicit "below minimum — are you sure?" confirm step
/// rather than a silent save.
/// </summary>
public sealed class UpdateAwardConfigurationCommandValidator : AbstractValidator<UpdateAwardConfigurationCommand>
{
    public UpdateAwardConfigurationCommandValidator(IAwardReferenceDataLookup referenceDataLookup)
    {
        RuleFor(c => c.VenueId).NotEmpty();

        RuleFor(c => c.AwardId)
            .NotEmpty()
            .MustAsync(async (awardId, ct) => await referenceDataLookup.AwardExistsAsync(awardId, ct))
            .WithMessage("Selected award does not exist.");

        RuleFor(c => c.CasualLoadingPercent).InclusiveBetween(0, 100);
        RuleFor(c => c.SuperannuationRatePercent).InclusiveBetween(0, 100);

        RuleFor(c => c)
            .MustAsync(async (command, ct) =>
            {
                var minimum = await referenceDataLookup.GetMinimumCasualLoadingPercentAsync(command.AwardId, ct);
                return minimum is null || command.CasualLoadingPercent >= minimum;
            })
            .WithName(nameof(UpdateAwardConfigurationCommand.CasualLoadingPercent))
            .WithMessage("Casual loading is below the award-mandated minimum for this award's classifications.");

        RuleFor(c => c.SuperannuationRatePercent)
            .GreaterThanOrEqualTo(SuperannuationGuarantee.CurrentStatutoryMinimumPercent)
            .When(c => !c.ConfirmBelowMinimumSuper)
            .WithMessage(
                $"Super rate is below the statutory minimum ({SuperannuationGuarantee.CurrentStatutoryMinimumPercent}%). " +
                "Set confirmBelowMinimumSuper to save it anyway.");

        RuleFor(c => c.PayPeriod)
            .Must(EnumWireValidation.IsDefinedName<PayPeriod>)
            .WithMessage("Invalid pay period.");

        RuleFor(c => c.PayPeriodCutoffDay)
            .Must(EnumWireValidation.IsDefinedName<DayOfWeek>)
            .WithMessage("Invalid pay period cutoff day.");

        RuleForEach(c => c.PenaltyToggles).ChildRules(toggle =>
        {
            toggle.RuleFor(t => t.PenaltyType)
                .Must(EnumWireValidation.IsDefinedName<PenaltyType>)
                .WithMessage("Invalid penalty type.");
        });
    }
}

public sealed class UpdateAwardConfigurationCommandHandler(
    IAwardConfigurationRepository repository,
    IAwardReferenceDataLookup referenceDataLookup,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<UpdateAwardConfigurationCommand, AwardConfigurationDto>
{
    public async Task<AwardConfigurationDto> Handle(UpdateAwardConfigurationCommand request, CancellationToken cancellationToken)
    {
        if (tenantContext.StaffMemberId is not { } staffMemberId)
        {
            throw new ForbiddenAccessException("No authenticated tenant context.");
        }

        var currentConfig = await repository.GetActiveByVenueIdAsync(request.VenueId, cancellationToken);
        var minCasualLoadingPercent = await referenceDataLookup.GetMinimumCasualLoadingPercentAsync(request.AwardId, cancellationToken) ?? 0m;

        var toggles = request.PenaltyToggles
            .Select(t => PenaltyRateToggle.Create(Enum.Parse<PenaltyType>(t.PenaltyType), t.IsEnabled))
            .ToList();

        var newConfig = AwardConfiguration.CreateNewVersion(
            request.VenueId,
            request.AwardId,
            request.CasualLoadingPercent,
            minCasualLoadingPercent,
            request.SuperannuationRatePercent,
            SuperannuationGuarantee.CurrentStatutoryMinimumPercent,
            Enum.Parse<PayPeriod>(request.PayPeriod),
            Enum.Parse<DayOfWeek>(request.PayPeriodCutoffDay),
            toggles,
            staffMemberId,
            request.ConfirmBelowMinimumSuper);

        currentConfig?.Supersede(DateTime.UtcNow);
        repository.Add(newConfig);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return AwardConfigurationDto.FromDomain(newConfig);
    }
}
