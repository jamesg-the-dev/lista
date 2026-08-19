using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Account;

namespace RosterApp.Infrastructure.Account;

public sealed class AccountLookup(RosterDbContext dbContext) : IAccountLookup
{
    public async Task<AccountDto> GetAccountAsync(
        Guid managerId,
        CancellationToken cancellationToken
    )
    {
        var manager =
            await dbContext
                .Managers.AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == managerId, cancellationToken)
            ?? throw new InvalidOperationException($"Manager '{managerId}' not found.");

        var venues = await dbContext
            .ManagerVenueAccesses.AsNoTracking()
            .Where(access => access.ManagerId == managerId)
            .Join(
                dbContext.Venues,
                access => access.VenueId,
                venue => venue.Id,
                (access, venue) => new AccountVenueDto(venue.Id, venue.Name)
            )
            .ToListAsync(cancellationToken);

        return new AccountDto(
            manager.Id,
            manager.OrganisationId,
            manager.Name,
            manager.Email,
            venues
        );
    }
}
