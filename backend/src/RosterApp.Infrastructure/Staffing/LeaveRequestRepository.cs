using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.Staffing;

public sealed class LeaveRequestRepository(RosterDbContext dbContext) : ILeaveRequestRepository
{
    public Task<LeaveRequest?> GetByIdAsync(Guid leaveRequestId, CancellationToken cancellationToken) =>
        dbContext.LeaveRequests.FirstOrDefaultAsync(l => l.Id == leaveRequestId, cancellationToken);

    public void Add(LeaveRequest leaveRequest) => dbContext.LeaveRequests.Add(leaveRequest);
}
