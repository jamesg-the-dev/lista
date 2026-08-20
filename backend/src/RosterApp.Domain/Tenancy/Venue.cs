namespace RosterApp.Domain.Tenancy;

/// <summary>
/// Child of Organisation. Staff, shifts, and rosters all carry a VenueId —
/// this is the unit tenant-scoping actually checks against, not the
/// Organisation directly (a manager can be scoped to a subset of venues
/// within their org).
/// </summary>
public sealed class Venue
{
    public Guid Id { get; private set; }
    public Guid OrganisationId { get; private set; }
    public string Name { get; private set; } = null!;
    public DateTime CreatedAtUtc { get; private set; }

    /// <summary>
    /// A single flat weekly target, not a value stored per specific week —
    /// the roster builder's budget bar (build order step 3) compares each
    /// week's actual cost against this one recurring figure. Null until a
    /// manager sets it; GetBudgetSummaryQuery reports percentOfTarget as
    /// null rather than dividing by zero/missing data.
    /// </summary>
    public decimal? ForecastSalesTarget { get; private set; }

    private Venue() { } // EF Core

    public static Venue Create(Guid organisationId, string name)
    {
        return new Venue
        {
            Id = Guid.NewGuid(),
            OrganisationId = organisationId,
            Name = name,
            CreatedAtUtc = DateTime.UtcNow,
        };
    }

    public void UpdateForecastSalesTarget(decimal? forecastSalesTarget)
    {
        ForecastSalesTarget = forecastSalesTarget;
    }
}
