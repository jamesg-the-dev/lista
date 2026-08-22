using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Tenancy;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Application.Tenancy;

/// <summary>
/// Org-scoped, not venue-scoped — the venue doesn't exist yet, so there's
/// nothing for IVenueScopedRequest to check against. See
/// FEATURE_SETTINGS_VENUE_PROFILE.md — profile fields are required at
/// creation (not filled in later), since the actual Venue aggregate has no
/// two-phase "bare venue, then profile" creation path.
/// </summary>
public sealed record CreateVenueCommand(
    Guid OrganisationId,
    string Name,
    string Abn,
    string AddressLine1,
    string? AddressLine2,
    string Suburb,
    string State,
    string Postcode,
    string Country,
    string Timezone
) : IRequest<VenueDto>, IOrganisationScopedRequest;

public sealed class CreateVenueCommandValidator : AbstractValidator<CreateVenueCommand>
{
    public CreateVenueCommandValidator()
    {
        RuleFor(c => c.OrganisationId).NotEmpty();
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

public sealed class CreateVenueCommandHandler(
    IVenueRepository venueRepository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<CreateVenueCommand, VenueDto>
{
    public async Task<VenueDto> Handle(CreateVenueCommand request, CancellationToken cancellationToken)
    {
        if (tenantContext.StaffMemberId is not { } staffMemberId)
        {
            throw new ForbiddenAccessException("No authenticated tenant context.");
        }

        var abn = Abn.Create(request.Abn);
        var address = new Address(
            request.AddressLine1,
            request.AddressLine2,
            request.Suburb,
            Enum.Parse<AustralianState>(request.State),
            request.Postcode,
            request.Country);

        var venue = Venue.Create(request.OrganisationId, request.Name, abn, address, request.Timezone, staffMemberId);

        venueRepository.Add(venue);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return VenueDto.FromDomain(venue);
    }
}
