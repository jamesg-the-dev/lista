using FluentValidation;
using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.LabourCost;

public sealed record GetCostTrendQuery(Guid VenueId, DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<CostTrendPointDto>>,
        IVenueScopedRequest;

public sealed class GetCostTrendQueryValidator : AbstractValidator<GetCostTrendQuery>
{
    public GetCostTrendQueryValidator()
    {
        RuleFor(q => q.To)
            .GreaterThanOrEqualTo(q => q.From)
            .WithMessage("'to' must not be before 'from'.");

        // Guards against an unbounded day-by-day fill (see LabourCostLookup.GetCostTrendAsync)
        // being handed a pathological range, e.g. a fat-fingered year.
        RuleFor(q => q)
            .Must(q => q.To.DayNumber - q.From.DayNumber <= 366)
            .WithMessage("Date range must not exceed 366 days.");
    }
}

public sealed class GetCostTrendQueryHandler(ILabourCostLookup labourCostLookup)
    : IRequestHandler<GetCostTrendQuery, IReadOnlyList<CostTrendPointDto>>
{
    public Task<IReadOnlyList<CostTrendPointDto>> Handle(GetCostTrendQuery request, CancellationToken cancellationToken) =>
        labourCostLookup.GetCostTrendAsync(request.VenueId, request.From, request.To, cancellationToken);
}

/// <summary>
/// Reporting layer over Phase 1-3 data — no new domain writes, per
/// CLAUDE.md build order step 4. All three queries are pure aggregations
/// over Shift.AwardBreakdownLine.Amount, so they share one lookup port
/// rather than one per query (same shape as IStaffLookup/IRosterLookup).
/// </summary>
public interface ILabourCostLookup
{
    Task<IReadOnlyList<CostTrendPointDto>> GetCostTrendAsync(
        Guid venueId,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<CostByRoleDto>> GetCostByRoleAsync(
        Guid venueId,
        DateOnly weekStart,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<CostByVenueDto>> GetCostByVenueAsync(
        Guid organisationId,
        DateOnly weekStart,
        CancellationToken cancellationToken);
}

/// <summary>
/// One point per day in the requested range (including days with no
/// shifts, at TotalCost 0). ActualCost/IsActualAvailable are an explicit
/// stub until Phase 6's GetActualVsRosteredQuery exists — never backfilled
/// with fake data in the meantime, per CLAUDE.md build order step 4.
/// </summary>
public sealed record CostTrendPointDto(
    DateOnly Date,
    decimal TotalCost,
    decimal? ActualCost,
    bool IsActualAvailable);
