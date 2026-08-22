using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Application.Tenancy;

public sealed record UpdateVenueProfileCommand(
    Guid VenueId,
    string Name,
    string Abn,
    string AddressLine1,
    string? AddressLine2,
    string Suburb,
    string State,
    string Postcode,
    string Country,
    string Timezone
) : IRequest<VenueDto>, IVenueScopedRequest, RosterApp.Application.Common.IRequiresPermissionLevel
{
    public RosterApp.Domain.Staffing.PermissionLevel? MinimumPermissionLevel => RosterApp.Domain.Staffing.PermissionLevel.Manager;
}

public sealed class UpdateVenueProfileCommandValidator : AbstractValidator<UpdateVenueProfileCommand>
{
    public UpdateVenueProfileCommandValidator()
    {
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.Name).NotEmpty().MaximumLength(200);
        RuleFor(c => c.Abn).Must(abn => Abn.TryCreate(abn, out _, out _)).WithMessage("ABN is not valid.");
        RuleFor(c => c.AddressLine1).NotEmpty().MaximumLength(200);
        RuleFor(c => c.AddressLine2).MaximumLength(200);
        RuleFor(c => c.Suburb).NotEmpty().MaximumLength(100);
        RuleFor(c => c.State).Must(EnumWireValidation.IsDefinedName<AustralianState>).WithMessage("Invalid state.");
        RuleFor(c => c.Postcode).Matches(@"^\d{4}$").WithMessage("Postcode must be 4 digits.");
        RuleFor(c => c.Country).NotEmpty().MaximumLength(60);
        RuleFor(c => c.Timezone).Must(TimezoneWireValidation.IsValidIanaId).WithMessage("Timezone is not a recognised IANA identifier.");
    }
}

public sealed class UpdateVenueProfileCommandHandler(
    IVenueRepository venueRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<UpdateVenueProfileCommand, VenueDto>
{
    public async Task<VenueDto> Handle(UpdateVenueProfileCommand request, CancellationToken cancellationToken)
    {
        var venue = await venueRepository.GetByIdAsync(request.VenueId, cancellationToken);
        if (venue is null)
        {
            throw new NotFoundException($"Venue '{request.VenueId}' was not found.");
        }

        var abn = Abn.Create(request.Abn);
        var address = new Address(
            request.AddressLine1,
            request.AddressLine2,
            request.Suburb,
            Enum.Parse<AustralianState>(request.State),
            request.Postcode,
            request.Country);

        venue.UpdateProfile(request.Name, abn, address, request.Timezone);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return VenueDto.FromDomain(venue);
    }
}
