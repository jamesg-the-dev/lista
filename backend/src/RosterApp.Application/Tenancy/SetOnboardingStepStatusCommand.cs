using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Application.Tenancy;

/// <summary>
/// Marks one setup-checklist card Completed or Skipped
/// (FEATURE_ONBOARDING_FLOW.md Phase 2). "BuildFirstRoster" has no skip
/// option in the UI — it's the destination, not a task — enforced below,
/// not on the domain method, matching this codebase's usual "validator
/// enforces the request-shape rule" split.
/// </summary>
public sealed record SetOnboardingStepStatusCommand(Guid VenueId, string Step, string Status)
    : IRequest<VenueDto>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class SetOnboardingStepStatusCommandValidator : AbstractValidator<SetOnboardingStepStatusCommand>
{
    public SetOnboardingStepStatusCommandValidator()
    {
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.Step).Must(EnumWireValidation.IsDefinedName<OnboardingStep>).WithMessage("Invalid onboarding step.");
        RuleFor(c => c.Status).Must(EnumWireValidation.IsDefinedName<OnboardingStepState>).WithMessage("Invalid onboarding step status.");
        RuleFor(c => c)
            .Must(c => c.Step != nameof(OnboardingStep.BuildFirstRoster) || c.Status != nameof(OnboardingStepState.Skipped))
            .WithMessage("The 'build first roster' step cannot be skipped.");
    }
}

public sealed class SetOnboardingStepStatusCommandHandler(
    IVenueRepository venueRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<SetOnboardingStepStatusCommand, VenueDto>
{
    public async Task<VenueDto> Handle(SetOnboardingStepStatusCommand request, CancellationToken cancellationToken)
    {
        var venue = await venueRepository.GetByIdAsync(request.VenueId, cancellationToken);
        if (venue is null)
        {
            throw new NotFoundException($"Venue '{request.VenueId}' was not found.");
        }

        venue.SetOnboardingStepStatus(
            Enum.Parse<OnboardingStep>(request.Step),
            Enum.Parse<OnboardingStepState>(request.Status));

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return VenueDto.FromDomain(venue);
    }
}
