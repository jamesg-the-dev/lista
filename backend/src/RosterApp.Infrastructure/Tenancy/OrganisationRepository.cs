using RosterApp.Application.Tenancy;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Tenancy;

public sealed class OrganisationRepository(RosterDbContext dbContext) : IOrganisationRepository
{
    public void Add(Organisation organisation) => dbContext.Organisations.Add(organisation);
}
