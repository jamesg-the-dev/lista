using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>Write-side port for the Role entity, same read/write split as IStaffMemberRepository/IStaffLookup.</summary>
public interface IRoleRepository
{
    Task<Role?> GetByIdAsync(Guid roleId, CancellationToken cancellationToken);
    void Add(Role role);
}
