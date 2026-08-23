using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Tenancy;

/// <summary>
/// Collapses/hides the setup checklist (FEATURE_ONBOARDING_FLOW.md Phase 2).
/// Deliberately not reversible via a command — there is no "un-dismiss" in
/// the spec (the checklist persists until explicitly dismissed, not
/// afterwards).
/// </summary>
public sealed record DismissOnboardingChecklistCommand(Guid VenueId)
    : IRequest<VenueDto>, IVenueScopedRequest, IRequiresPermissionLevel
{
    public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
}

public sealed class DismissOnboardingChecklistCommandValidator : AbstractValidator<DismissOnboardingChecklistCommand>
{
    public DismissOnboardingChecklistCommandValidator()
    {
        RuleFor(c => c.VenueId).NotEmpty();
    }
}

public sealed class DismissOnboardingChecklistCommandHandler(
    IVenueRepository venueRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<DismissOnboardingChecklistCommand, VenueDto>
{
    public async Task<VenueDto> Handle(DismissOnboardingChecklistCommand request, CancellationToken cancellationToken)
    {
        var venue = await venueRepository.GetByIdAsync(request.VenueId, cancellationToken);
        if (venue is null)
        {
            throw new NotFoundException($"Venue '{request.VenueId}' was not found.");
        }

        venue.DismissOnboardingChecklist();
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return VenueDto.FromDomain(venue);
    }
}
