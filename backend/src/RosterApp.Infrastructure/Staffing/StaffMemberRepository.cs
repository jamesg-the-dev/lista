using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.Staffing;

public sealed class StaffMemberRepository(RosterDbContext dbContext) : IStaffMemberRepository
{
    public Task<StaffMember?> GetByIdAsync(Guid staffMemberId, CancellationToken cancellationToken) =>
        dbContext.StaffMembers.FirstOrDefaultAsync(s => s.Id == staffMemberId, cancellationToken);

    public void Add(StaffMember staffMember) => dbContext.StaffMembers.Add(staffMember);
}
