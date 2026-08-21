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
