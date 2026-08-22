using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Application.Rostering;

namespace RosterApp.Application.Tenancy;

public sealed record DeactivateVenueCommand(Guid VenueId)
    : IRequest, IVenueScopedRequest, RosterApp.Application.Common.IRequiresPermissionLevel
{
    public RosterApp.Domain.Staffing.PermissionLevel? MinimumPermissionLevel => RosterApp.Domain.Staffing.PermissionLevel.Owner;
}

public sealed class DeactivateVenueCommandValidator : AbstractValidator<DeactivateVenueCommand>
{
    public DeactivateVenueCommandValidator()
    {
        RuleFor(c => c.VenueId).NotEmpty();
    }
}

public sealed class DeactivateVenueCommandHandler(
    IVenueRepository venueRepository,
    IShiftRepository shiftRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<DeactivateVenueCommand>
{
    public async Task Handle(DeactivateVenueCommand request, CancellationToken cancellationToken)
    {
        var venue = await venueRepository.GetByIdAsync(request.VenueId, cancellationToken);
        if (venue is null)
        {
            throw new NotFoundException($"Venue '{request.VenueId}' was not found.");
        }

        var activeVenueCount = await venueRepository.CountActiveAsync(venue.OrganisationId, cancellationToken);
        if (activeVenueCount <= 1)
        {
            throw new InvalidOperationException("An organisation must have at least one active venue.");
        }

        var hasFuturePublishedShifts = await shiftRepository.HasFuturePublishedShiftsAsync(
            venue.Id, DateOnly.FromDateTime(DateTime.UtcNow), cancellationToken);
        if (hasFuturePublishedShifts)
        {
            throw new InvalidOperationException("Cannot deactivate a venue with published rosters in the future.");
        }

        venue.Deactivate();
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
