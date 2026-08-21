using Microsoft.EntityFrameworkCore;
using RosterApp.Application.AwardConfig;

namespace RosterApp.Infrastructure.AwardConfig;

public sealed class AwardReferenceDataLookup(RosterDbContext dbContext) : IAwardReferenceDataLookup
{
    public async Task<IReadOnlyList<AwardDto>> GetAvailableAwardsAsync(CancellationToken cancellationToken)
    {
        var awards = await dbContext.AwardDefinitions
            .AsNoTracking()
            .OrderBy(a => a.Name)
            .ToListAsync(cancellationToken);

        // Same "strictest currently-active classification" resolution as
        // GetMinimumCasualLoadingPercentAsync, just grouped across every
        // award in one query instead of scoped to a single one — an award
        // with no classification/rate data seeded yet (see AwardDefinition)
        // simply has no entry here, so TryGetValue below falls through to
        // null rather than a misleading 0%.
        var minimumsByAward = await dbContext.AwardRates
            .AsNoTracking()
            .Where(r => r.EffectiveToUtc == null)
            .Join(
                dbContext.AwardClassificationDefinitions.AsNoTracking(),
                rate => rate.AwardClassificationId,
                classification => classification.Id,
                (rate, classification) => new { classification.AwardId, rate.CasualLoadingPercentMin })
            .GroupBy(x => x.AwardId)
            .Select(g => new { AwardId = g.Key, Minimum = g.Max(x => x.CasualLoadingPercentMin) })
            .ToDictionaryAsync(x => x.AwardId, x => x.Minimum, cancellationToken);

        return awards
            .Select(a => AwardDto.FromDomain(
                a,
                minimumsByAward.TryGetValue(a.Id, out var minimum) ? minimum : null))
            .ToList();
    }

    public Task<bool> AwardExistsAsync(Guid awardId, CancellationToken cancellationToken) =>
        dbContext.AwardDefinitions.AsNoTracking().AnyAsync(a => a.Id == awardId, cancellationToken);

    public async Task<IReadOnlyList<AwardClassificationDto>> GetClassificationsForAwardAsync(Guid awardId, CancellationToken cancellationToken)
    {
        var classifications = await dbContext.AwardClassificationDefinitions
            .AsNoTracking()
            .Where(c => c.AwardId == awardId)
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);

        return classifications.Select(AwardClassificationDto.FromDomain).ToList();
    }

    public Task<bool> ClassificationExistsAsync(Guid awardClassificationId, CancellationToken cancellationToken) =>
        dbContext.AwardClassificationDefinitions.AsNoTracking().AnyAsync(c => c.Id == awardClassificationId, cancellationToken);

    public async Task<decimal?> GetMinimumCasualLoadingPercentAsync(Guid awardId, CancellationToken cancellationToken)
    {
        var minimums = await dbContext.AwardRates
            .AsNoTracking()
            .Where(r => r.EffectiveToUtc == null)
            .Join(
                dbContext.AwardClassificationDefinitions.AsNoTracking(),
                rate => rate.AwardClassificationId,
                classification => classification.Id,
                (rate, classification) => new { classification.AwardId, rate.CasualLoadingPercentMin })
            .Where(x => x.AwardId == awardId)
            .Select(x => x.CasualLoadingPercentMin)
            .ToListAsync(cancellationToken);

        return minimums.Count == 0 ? null : minimums.Max();
    }
}
