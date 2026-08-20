using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Rostering;

public sealed record GetBudgetSummaryQuery(Guid VenueId, DateOnly WeekStart)
    : IRequest<BudgetSummaryDto>,
        IVenueScopedRequest;

public sealed class GetBudgetSummaryQueryHandler(IBudgetSummaryLookup budgetSummaryLookup)
    : IRequestHandler<GetBudgetSummaryQuery, BudgetSummaryDto>
{
    public Task<BudgetSummaryDto> Handle(GetBudgetSummaryQuery request, CancellationToken cancellationToken) =>
        budgetSummaryLookup.GetBudgetSummaryAsync(request.VenueId, request.WeekStart, cancellationToken);
}

/// <summary>
/// Aggregation over existing Shift/AwardBreakdownLine data plus
/// Venue.ForecastSalesTarget — no new write model, per CLAUDE.md build order
/// step 3 ("reuses the award-breakdown data already computed for the
/// shift-level receipt panel, so it's a UI/aggregation feature, not a new
/// pricing engine").
/// </summary>
public interface IBudgetSummaryLookup
{
    Task<BudgetSummaryDto> GetBudgetSummaryAsync(Guid venueId, DateOnly weekStart, CancellationToken cancellationToken);
}

/// <summary>
/// PercentOfTarget is null when ForecastSalesTarget hasn't been set (or is
/// zero) for the venue — never divide by a missing/zero target.
/// </summary>
public sealed record BudgetSummaryDto(
    Guid VenueId,
    DateOnly WeekStart,
    decimal TotalCost,
    decimal? ForecastSalesTarget,
    decimal? PercentOfTarget);
