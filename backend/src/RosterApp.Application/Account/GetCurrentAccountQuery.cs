using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Account;

/// <summary>
/// Resolves the authenticated Supabase user to their internal Manager
/// identity and accessible venues. Deliberately implements neither
/// IVenueScopedRequest nor IOrganisationScopedRequest — this is the
/// request that establishes tenant identity in the first place, so
/// TenantScopingBehavior passes it through untouched. Smoke test for the
/// whole Phase 0 pipeline: JWT validation → claims transformation →
/// tenant context → this query.
/// </summary>
public sealed record GetCurrentAccountQuery : IRequest<AccountDto>;

public sealed record AccountDto(
    Guid ManagerId,
    Guid OrganisationId,
    string Name,
    string Email,
    IReadOnlyCollection<AccountVenueDto> Venues
);

public sealed record AccountVenueDto(Guid VenueId, string Name);

public sealed class GetCurrentAccountQueryHandler(
    ICurrentTenantContext tenantContext,
    IAccountLookup accountLookup
) : IRequestHandler<GetCurrentAccountQuery, AccountDto>
{
    public async Task<AccountDto> Handle(
        GetCurrentAccountQuery request,
        CancellationToken cancellationToken
    )
    {
        if (!tenantContext.IsAuthenticated)
        {
            throw new ForbiddenAccessException("No authenticated tenant context.");
        }

        return await accountLookup.GetAccountAsync(tenantContext.ManagerId, cancellationToken);
    }
}

/// <summary>
/// Thin read port over persistence so this handler stays in Application
/// without a direct EF Core dependency. Implemented in Infrastructure.
/// </summary>
public interface IAccountLookup
{
    Task<AccountDto> GetAccountAsync(Guid managerId, CancellationToken cancellationToken);
}
