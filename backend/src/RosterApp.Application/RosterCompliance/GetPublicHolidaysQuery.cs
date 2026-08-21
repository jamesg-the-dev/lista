using FluentValidation;
using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Application.RosterCompliance;

/// <summary>
/// Roster builder calendar rendering + penalty rate calculation, and the
/// settings screen's read-only public holiday list. Unscoped (no
/// IVenueScopedRequest) — this is system-wide reference data keyed by
/// state, not tenant data, same treatment as GetAvailableAwardsQuery.
/// </summary>
public sealed record GetPublicHolidaysQuery(string State, DateOnly From, DateOnly To) : IRequest<IReadOnlyList<PublicHolidayDto>>;

public sealed class GetPublicHolidaysQueryValidator : AbstractValidator<GetPublicHolidaysQuery>
{
    public GetPublicHolidaysQueryValidator()
    {
        RuleFor(q => q.State).Must(EnumWireValidation.IsDefinedName<AustralianState>).WithMessage("Invalid state.");
        RuleFor(q => q.To).GreaterThanOrEqualTo(q => q.From).WithMessage("'to' date must not be before 'from' date.");
    }
}

public sealed class GetPublicHolidaysQueryHandler(IPublicHolidayLookup lookup) : IRequestHandler<GetPublicHolidaysQuery, IReadOnlyList<PublicHolidayDto>>
{
    public Task<IReadOnlyList<PublicHolidayDto>> Handle(GetPublicHolidaysQuery request, CancellationToken cancellationToken) =>
        lookup.GetForStateAsync(request.State, request.From, request.To, cancellationToken);
}
