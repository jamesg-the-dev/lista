using RosterApp.Application.Common;

namespace RosterApp.Infrastructure.Persistence;

public sealed class UnitOfWork(RosterDbContext dbContext) : IUnitOfWork
{
    public async Task SaveChangesAsync(CancellationToken cancellationToken) =>
        await dbContext.SaveChangesAsync(cancellationToken);
}
