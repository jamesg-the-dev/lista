using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Wire shape deliberately matches frontend/app/routes/staff/types.ts
/// (StaffMemberDto/AvailabilityExceptionDto/LeaveRequestDto), which was
/// built ahead of this backend against CLAUDE.md's own illustrative wire
/// convention ("status: number; // enum as int over the wire"). Enums are
/// therefore serialized as ints here, unlike ShiftDto/ComplianceViolationDto
/// in Rostering which chose strings — that's an intentional divergence to
/// avoid reshaping the already-built frontend contract, not an oversight.
/// Storage in Postgres still uses strings for every enum column (see the
/// Configurations), matching the rest of the codebase's enum-storage
/// convention; only the DTO boundary differs.
/// </summary>
public sealed record StaffMemberDto(
    Guid Id,
    string Name,
    string Email,
    string Phone,
    int EmploymentType,
    int Classification,
    int MaxWeeklyHours,
    IReadOnlyList<Guid> VenueIds,
    IReadOnlyList<AvailabilityExceptionDto> Unavailability,
    IReadOnlyList<LeaveRequestDto> LeaveRequests)
{
    public static StaffMemberDto FromDomain(
        StaffMember staff,
        IReadOnlyList<StandingUnavailability> unavailability,
        IReadOnlyList<LeaveRequest> leaveRequests) => new(
            staff.Id,
            staff.Name,
            staff.Email,
            staff.Phone.Value,
            (int)staff.EmploymentType,
            (int)staff.Classification,
            staff.MaxWeeklyHours,
            staff.VenueIds,
            unavailability.Select(AvailabilityExceptionDto.FromDomain).ToList(),
            leaveRequests.Select(LeaveRequestDto.FromDomain).ToList());
}

public sealed record AvailabilityExceptionDto(Guid Id, int DayOfWeek, bool IsAllDay, IReadOnlyList<int> Blocks)
{
    public static AvailabilityExceptionDto FromDomain(StandingUnavailability unavailability) => new(
        unavailability.Id,
        (int)unavailability.DayOfWeek,
        unavailability.IsAllDay,
        unavailability.Blocks.Select(b => (int)b).ToList());
}

public sealed record LeaveRequestDto(Guid Id, DateOnly StartDate, DateOnly EndDate, int Status, string? Reason)
{
    public static LeaveRequestDto FromDomain(LeaveRequest leaveRequest) => new(
        leaveRequest.Id,
        leaveRequest.StartDate,
        leaveRequest.EndDate,
        (int)leaveRequest.Status,
        leaveRequest.Reason);
}

/// <summary>
/// Response shape for GetStaffAvailabilityQuery — feeds the roster builder's
/// double-booking prevention (CLAUDE.md build order step 2). Only Approved
/// leave is included; Requested/Declined must never block rostering.
/// </summary>
public sealed record StaffAvailabilityDto(
    Guid StaffMemberId,
    IReadOnlyList<AvailabilityExceptionDto> Unavailability,
    IReadOnlyList<LeaveRequestDto> ApprovedLeave);
