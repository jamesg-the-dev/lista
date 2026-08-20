using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Application.Tenancy;

public sealed record SetVenueForecastSalesTargetCommand(Guid VenueId, decimal? ForecastSalesTarget)
    : IRequest<VenueDto>,
        IVenueScopedRequest;

public sealed class SetVenueForecastSalesTargetCommandValidator : AbstractValidator<SetVenueForecastSalesTargetCommand>
{
    public SetVenueForecastSalesTargetCommandValidator()
    {
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.ForecastSalesTarget).GreaterThanOrEqualTo(0).When(c => c.ForecastSalesTarget.HasValue);
    }
}

public sealed class SetVenueForecastSalesTargetCommandHandler(
    IVenueRepository venueRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<SetVenueForecastSalesTargetCommand, VenueDto>
{
    public async Task<VenueDto> Handle(SetVenueForecastSalesTargetCommand request, CancellationToken cancellationToken)
    {
        var venue = await venueRepository.GetByIdAsync(request.VenueId, cancellationToken);
        if (venue is null)
        {
            throw new NotFoundException($"Venue '{request.VenueId}' was not found.");
        }

        venue.UpdateForecastSalesTarget(request.ForecastSalesTarget);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return VenueDto.FromDomain(venue);
    }
}

/// <summary>
/// Write-side port for the Venue aggregate — first Tenancy write command,
/// so this is the first port in this namespace. Follows the same
/// tracked-entity repository shape as IShiftRepository/IStaffMemberRepository.
/// </summary>
public interface IVenueRepository
{
    Task<Venue?> GetByIdAsync(Guid venueId, CancellationToken cancellationToken);
}

public sealed record VenueDto(Guid Id, Guid OrganisationId, string Name, decimal? ForecastSalesTarget)
{
    public static VenueDto FromDomain(Venue venue) =>
        new(venue.Id, venue.OrganisationId, venue.Name, venue.ForecastSalesTarget);
}
