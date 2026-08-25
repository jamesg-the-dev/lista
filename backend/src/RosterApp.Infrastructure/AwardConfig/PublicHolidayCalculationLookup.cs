using Microsoft.EntityFrameworkCore;
using RosterApp.Application.AwardConfig;
using RosterApp.Application.Common;

namespace RosterApp.Infrastructure.AwardConfig;

/// <summary>
/// See IPublicHolidayCalculationLookup for the "why venueId, not state" and
/// "why not VenueHolidayOverride" decisions.
///
/// Jurisdiction handling for a venue with no Address on record (State
/// unknown — Venue.Address is optional until the owner completes the Venue
/// Profile form): falls back to matching only nationally-observed holiday
/// rows (PublicHoliday.IsNational) rather than guessing a specific state.
/// National dates are seeded identically across every state (see
/// PublicHolidayReferenceDataSeed), so this correctly detects the
/// nationally-observed public holidays even with jurisdiction unknown, but
/// deliberately misses a state-specific-only holiday (e.g. VIC's Melbourne
/// Cup Day) for that venue until its Address is set. This is a considered
/// fallback, not a guess at "the" state — the alternative (defaulting to a
/// specific state, the way the Settings screen's public-holiday list
/// currently does per its own documented TODO) would silently mis-price a
/// shift for any venue actually in a different state, which is worse than
/// under-detecting a handful of state-only dates. Flagged in
/// docs/urgent-award-bugs-to-fix.md's audit as a decision needing human
/// confirmation once venue jurisdiction modelling is revisited more broadly
/// (see CLAUDE.md's TODO on RosterRulesTab.tsx's own "silently 'VIC'"
/// fallback for the unrelated but same-shaped UI-display gap).
/// </summary>
public sealed class PublicHolidayCalculationLookup(RosterDbContext dbContext) : IPublicHolidayCalculationLookup
{
    public async Task<bool> IsPublicHolidayAsync(Guid venueId, DateOnly date, CancellationToken cancellationToken)
    {
        var venue = await dbContext.Venues
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == venueId, cancellationToken)
            ?? throw new NotFoundException($"Venue '{venueId}' was not found.");

        if (venue.Address is null)
        {
            return await dbContext.PublicHolidays
                .AsNoTracking()
                .AnyAsync(h => h.IsNational && h.Date == date, cancellationToken);
        }

        var state = venue.Address.State;
        return await dbContext.PublicHolidays
            .AsNoTracking()
            .AnyAsync(h => h.State == state && h.Date == date, cancellationToken);
    }
}
