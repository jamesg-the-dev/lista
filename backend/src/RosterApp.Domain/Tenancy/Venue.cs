using RosterApp.Domain.Common;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Domain.Tenancy;

/// <summary>
/// Child of Organisation. Staff, shifts, and rosters all carry a VenueId —
/// this is the unit tenant-scoping actually checks against, not the
/// Organisation directly (a manager can be scoped to a subset of venues
/// within their org). AggregateRoot since the Venue Profile settings
/// feature, so profile/trading-hours changes get an audit trail via
/// AuditSaveChangesInterceptor, same as Shift/StaffMember.
/// </summary>
public sealed class Venue : AggregateRoot
{
    public Guid Id { get; private set; }
    public Guid OrganisationId { get; private set; }
    public string Name { get; private set; } = null!;
    public Abn Abn { get; private set; } = null!;
    public Address Address { get; private set; } = null!;
    public string Timezone { get; private set; } = "Australia/Melbourne";
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAtUtc { get; private set; }
    public Guid CreatedByManagerId { get; private set; }

    /// <summary>
    /// A single flat weekly target, not a value stored per specific week —
    /// the roster builder's budget bar (build order step 3) compares each
    /// week's actual cost against this one recurring figure. Null until a
    /// manager sets it; GetBudgetSummaryQuery reports percentOfTarget as
    /// null rather than dividing by zero/missing data.
    /// </summary>
    public decimal? ForecastSalesTarget { get; private set; }

    /// <summary>
    /// Never null — defaults to RequiresApproval/7 days at creation (see
    /// VenueAvailabilitySettings.CreateDefault), since "no self-service" is
    /// a meaningful choice an owner should make explicitly, not an implicit
    /// null state to check for everywhere it's read.
    /// </summary>
    public VenueAvailabilitySettings AvailabilitySettings { get; private set; } = null!;

    private readonly List<TradingHourSession> _tradingHours = [];
    public IReadOnlyList<TradingHourSession> TradingHours => _tradingHours.AsReadOnly();

    private Venue() { } // EF Core

    public static Venue Create(
        Guid organisationId,
        string name,
        Abn abn,
        Address address,
        string timezone,
        Guid createdByManagerId
    )
    {
        var venue = new Venue
        {
            Id = Guid.NewGuid(),
            OrganisationId = organisationId,
            Name = name.Trim(),
            Abn = abn,
            Address = address,
            Timezone = timezone,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByManagerId = createdByManagerId,
            AvailabilitySettings = VenueAvailabilitySettings.CreateDefault(),
        };

        venue.AddDomainEvent(new VenueCreated(venue.Id, venue.OrganisationId, DateTime.UtcNow));

        return venue;
    }

    public void UpdateProfile(string name, Abn abn, Address address, string timezone)
    {
        Name = name.Trim();
        Abn = abn;
        Address = address;
        Timezone = timezone;

        AddDomainEvent(new VenueProfileUpdated(Id, OrganisationId, DateTime.UtcNow));
    }

    /// <summary>Replaces the full week's sessions in one call — simpler than a per-day patch, matches UpdateVenueTradingHoursCommand.</summary>
    public void UpdateTradingHours(IEnumerable<TradingHourSession> sessions)
    {
        _tradingHours.Clear();
        _tradingHours.AddRange(sessions);

        AddDomainEvent(new VenueTradingHoursUpdated(Id, OrganisationId, DateTime.UtcNow));
    }

    public void UpdateForecastSalesTarget(decimal? forecastSalesTarget)
    {
        ForecastSalesTarget = forecastSalesTarget;
    }

    public void UpdateAvailabilitySettings(SelfServiceMode selfServiceMode, int advanceNoticeDays)
    {
        AvailabilitySettings = new VenueAvailabilitySettings(selfServiceMode, advanceNoticeDays);
        AddDomainEvent(new VenueAvailabilitySettingsUpdated(Id, OrganisationId, DateTime.UtcNow));
    }

    public void Deactivate()
    {
        if (!IsActive)
        {
            return;
        }

        IsActive = false;
        AddDomainEvent(new VenueDeactivated(Id, OrganisationId, DateTime.UtcNow));
    }
}
