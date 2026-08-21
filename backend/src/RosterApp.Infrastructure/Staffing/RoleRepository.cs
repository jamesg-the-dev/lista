using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.Staffing;

public sealed class RoleRepository(RosterDbContext dbContext) : IRoleRepository
{
    public Task<Role?> GetByIdAsync(Guid roleId, CancellationToken cancellationToken) =>
        dbContext.Roles.FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

    public void Add(Role role) => dbContext.Roles.Add(role);
}
