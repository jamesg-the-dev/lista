using Microsoft.EntityFrameworkCore;
using RosterApp.Application.LabourCost;

namespace RosterApp.Infrastructure.LabourCost;

public sealed class LabourCostLookup(RosterDbContext dbContext) : ILabourCostLookup
{
    public async Task<IReadOnlyList<CostTrendPointDto>> GetCostTrendAsync(
        Guid venueId,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var costsByDate = await dbContext.Shifts
            .AsNoTracking()
            .Where(s => s.VenueId == venueId && s.ShiftDate >= from && s.ShiftDate <= to)
            .SelectMany(s => s.AwardBreakdown, (shift, line) => new { shift.ShiftDate, line.Amount })
            .GroupBy(x => x.ShiftDate)
            .Select(g => new { Date = g.Key, TotalCost = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.Date, x => x.TotalCost, cancellationToken);

        var points = new List<CostTrendPointDto>();
        for (var date = from; date <= to; date = date.AddDays(1))
        {
            // ActualCost/IsActualAvailable stub until Phase 6's
            // GetActualVsRosteredQuery exists — see CostTrendPointDto.
            points.Add(new CostTrendPointDto(date, costsByDate.GetValueOrDefault(date, 0m), null, false));
        }

        return points;
    }

    public async Task<IReadOnlyList<CostByRoleDto>> GetCostByRoleAsync(
        Guid venueId,
        DateOnly weekStart,
        CancellationToken cancellationToken)
    {
        var weekEnd = weekStart.AddDays(6);

        var costsByClassification =
            await (
                from shift in dbContext.Shifts.AsNoTracking()
                where shift.VenueId == venueId && shift.ShiftDate >= weekStart && shift.ShiftDate <= weekEnd
                join staff in dbContext.StaffMembers.AsNoTracking() on shift.EmployeeId equals staff.Id
                from line in shift.AwardBreakdown
                group line.Amount by staff.Classification into byClassification
                select new { Classification = byClassification.Key, TotalCost = byClassification.Sum() }
            ).ToListAsync(cancellationToken);

        return costsByClassification
            .Select(x => new CostByRoleDto(x.Classification.ToString(), x.TotalCost))
            .ToList();
    }

    public async Task<IReadOnlyList<CostByVenueDto>> GetCostByVenueAsync(
        Guid organisationId,
        DateOnly weekStart,
        CancellationToken cancellationToken)
    {
        var weekEnd = weekStart.AddDays(6);

        var venues = await dbContext.Venues
            .AsNoTracking()
            .Where(v => v.OrganisationId == organisationId)
            .Select(v => new { v.Id, v.Name })
            .ToListAsync(cancellationToken);

        var venueIds = venues.Select(v => v.Id).ToList();

        var costsByVenue = await dbContext.Shifts
            .AsNoTracking()
            .Where(s => venueIds.Contains(s.VenueId) && s.ShiftDate >= weekStart && s.ShiftDate <= weekEnd)
            .SelectMany(s => s.AwardBreakdown, (shift, line) => new { shift.VenueId, line.Amount })
            .GroupBy(x => x.VenueId)
            .Select(g => new { VenueId = g.Key, TotalCost = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.VenueId, x => x.TotalCost, cancellationToken);

        return venues
            .Select(v => new CostByVenueDto(v.Id, v.Name, costsByVenue.GetValueOrDefault(v.Id, 0m)))
            .ToList();
    }
}
