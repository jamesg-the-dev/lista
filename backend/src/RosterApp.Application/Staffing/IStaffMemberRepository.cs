using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Write-side port for the StaffMember aggregate, same split as
/// IShiftRepository/IRosterLookup in Rostering — read-heavy queries go
/// through IStaffLookup instead.
/// </summary>
public interface IStaffMemberRepository
{
    Task<StaffMember?> GetByIdAsync(Guid staffMemberId, CancellationToken cancellationToken);
    void Add(StaffMember staffMember);
}
