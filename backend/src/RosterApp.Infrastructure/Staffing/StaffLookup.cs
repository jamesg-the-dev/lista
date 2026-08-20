using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.Staffing;

public sealed class StaffLookup(RosterDbContext dbContext) : IStaffLookup
{
    public async Task<IReadOnlyList<StaffMemberDto>> GetStaffForVenueAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var staffMembers = await dbContext.StaffMembers
            .AsNoTracking()
            .Where(s => s.VenueAssignments.Any(a => a.VenueId == venueId))
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);

        return await ComposeAsync(staffMembers, cancellationToken);
    }

    public async Task<StaffMemberDto?> GetStaffMemberAsync(Guid staffMemberId, CancellationToken cancellationToken)
    {
        var staff = await dbContext.StaffMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == staffMemberId, cancellationToken);

        if (staff is null)
        {
            return null;
        }

        var composed = await ComposeAsync([staff], cancellationToken);
        return composed[0];
    }

    public async Task<StaffAvailabilityDto> GetAvailabilityAsync(
        Guid staffMemberId,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var unavailability = await dbContext.StandingUnavailabilities
            .AsNoTracking()
            .Where(u => u.StaffMemberId == staffMemberId)
            .ToListAsync(cancellationToken);

        var approvedLeave = await dbContext.LeaveRequests
            .AsNoTracking()
            .Where(l => l.StaffMemberId == staffMemberId
                && l.Status == LeaveRequestStatus.Approved
                && l.StartDate <= to
                && l.EndDate >= from)
            .ToListAsync(cancellationToken);

        return new StaffAvailabilityDto(
            staffMemberId,
            unavailability.Select(AvailabilityExceptionDto.FromDomain).ToList(),
            approvedLeave.Select(LeaveRequestDto.FromDomain).ToList());
    }

    private async Task<IReadOnlyList<StaffMemberDto>> ComposeAsync(
        IReadOnlyList<StaffMember> staffMembers,
        CancellationToken cancellationToken)
    {
        var staffIds = staffMembers.Select(s => s.Id).ToList();

        var unavailability = await dbContext.StandingUnavailabilities
            .AsNoTracking()
            .Where(u => staffIds.Contains(u.StaffMemberId))
            .ToListAsync(cancellationToken);

        var leaveRequests = await dbContext.LeaveRequests
            .AsNoTracking()
            .Where(l => staffIds.Contains(l.StaffMemberId))
            .ToListAsync(cancellationToken);

        var unavailabilityByStaff = unavailability.ToLookup(u => u.StaffMemberId);
        var leaveByStaff = leaveRequests.ToLookup(l => l.StaffMemberId);

        return staffMembers
            .Select(s => StaffMemberDto.FromDomain(
                s,
                unavailabilityByStaff[s.Id].ToList(),
                leaveByStaff[s.Id].ToList()))
            .ToList();
    }
}
