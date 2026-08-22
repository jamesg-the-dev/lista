using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Account;

namespace RosterApp.Infrastructure.Account;

public sealed class AccountLookup(RosterDbContext dbContext) : IAccountLookup
{
    public async Task<AccountDto> GetAccountAsync(
        Guid staffMemberId,
        CancellationToken cancellationToken
    )
    {
        var staffMember =
            await dbContext
                .StaffMembers.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == staffMemberId, cancellationToken)
            ?? throw new InvalidOperationException($"Staff member '{staffMemberId}' not found.");

        var venues = await dbContext
            .StaffMembers.AsNoTracking()
            .Where(s => s.Id == staffMemberId)
            .SelectMany(s => s.VenueAssignments)
            .Join(
                dbContext.Venues,
                assignment => assignment.VenueId,
                venue => venue.Id,
                (assignment, venue) => new AccountVenueDto(venue.Id, venue.Name)
            )
            .ToListAsync(cancellationToken);

        return new AccountDto(
            staffMember.Id,
            staffMember.OrganisationId,
            staffMember.Name,
            staffMember.Email,
            venues
        );
    }
}
