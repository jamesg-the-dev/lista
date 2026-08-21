using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Application.Tenancy;

/// <summary>
/// Venue-level toggle (not per-staff) per FEATURE_SETTINGS_STAFF_ROLES.md
/// §2 AC5 — updated in place, unlike AwardConfiguration/RoleAwardMapping,
/// since it's a workflow setting rather than a compliance/pay figure. See
/// VenueAvailabilitySettings' doc comment.
/// </summary>
public sealed record UpdateVenueAvailabilitySettingsCommand(Guid VenueId, string SelfServiceMode, int AdvanceNoticeDays)
    : IRequest<VenueDto>, IVenueScopedRequest;

public sealed class UpdateVenueAvailabilitySettingsCommandValidator : AbstractValidator<UpdateVenueAvailabilitySettingsCommand>
{
    public UpdateVenueAvailabilitySettingsCommandValidator()
    {
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.SelfServiceMode)
            .Must(EnumWireValidation.IsDefinedName<SelfServiceMode>)
            .WithMessage("Invalid self-service mode.");
        RuleFor(c => c.AdvanceNoticeDays).GreaterThanOrEqualTo(0).LessThanOrEqualTo(365);
    }
}

public sealed class UpdateVenueAvailabilitySettingsCommandHandler(
    IVenueRepository venueRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<UpdateVenueAvailabilitySettingsCommand, VenueDto>
{
    public async Task<VenueDto> Handle(UpdateVenueAvailabilitySettingsCommand request, CancellationToken cancellationToken)
    {
        var venue = await venueRepository.GetByIdAsync(request.VenueId, cancellationToken);
        if (venue is null)
        {
            throw new NotFoundException($"Venue '{request.VenueId}' was not found.");
        }

        venue.UpdateAvailabilitySettings(Enum.Parse<SelfServiceMode>(request.SelfServiceMode), request.AdvanceNoticeDays);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return VenueDto.FromDomain(venue);
    }
}
