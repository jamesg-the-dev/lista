using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

public interface ILeaveRequestRepository
{
    Task<LeaveRequest?> GetByIdAsync(Guid leaveRequestId, CancellationToken cancellationToken);
    void Add(LeaveRequest leaveRequest);
}
