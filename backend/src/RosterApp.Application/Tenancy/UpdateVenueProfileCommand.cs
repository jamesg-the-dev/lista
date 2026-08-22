using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Application.Tenancy;

// TODO: this currently allows any authenticated StaffMember to edit a
// venue's profile. The spec calls for Owner-only edit with Manager/Staff
// read-only — ICurrentTenantContext exposes PermissionLevel (Owner/
// Manager/Supervisor/Staff) now, but nothing here reads it yet. A real
// permission tier system is a near-term priority, not just for this
// screen: every upcoming settings feature (Award & Pay Config, Roster
// Rules & Compliance, Staff & Roles) has the same Owner-only requirement.
// See AuthorizationBehavior.cs for the pipeline stage this eventually
// plugs into.
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
) : IRequest<VenueDto>, IVenueScopedRequest;

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
