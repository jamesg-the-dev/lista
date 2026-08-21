using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Application.RosterCompliance;

/// <summary>Rare, owner-initiated exception only — a venue-specific closure day (e.g. a private event), additive to the system-maintained calendar, never a replacement for it (§6).</summary>
public sealed record AddVenueHolidayOverrideCommand(Guid VenueId, DateOnly OverrideDate, string Name)
    : IRequest<VenueHolidayOverrideDto>, IVenueScopedRequest;

public sealed class AddVenueHolidayOverrideCommandValidator : AbstractValidator<AddVenueHolidayOverrideCommand>
{
    public AddVenueHolidayOverrideCommandValidator()
    {
        RuleFor(c => c.VenueId).NotEmpty();
        RuleFor(c => c.Name).NotEmpty().MaximumLength(200);
    }
}

public sealed class AddVenueHolidayOverrideCommandHandler(
    IVenueHolidayOverrideRepository repository,
    ICurrentTenantContext tenantContext,
    IUnitOfWork unitOfWork
) : IRequestHandler<AddVenueHolidayOverrideCommand, VenueHolidayOverrideDto>
{
    public async Task<VenueHolidayOverrideDto> Handle(AddVenueHolidayOverrideCommand request, CancellationToken cancellationToken)
    {
        var entity = VenueHolidayOverride.Create(request.VenueId, request.OverrideDate, request.Name, tenantContext.ManagerId);

        repository.Add(entity);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return VenueHolidayOverrideDto.FromDomain(entity);
    }
}
