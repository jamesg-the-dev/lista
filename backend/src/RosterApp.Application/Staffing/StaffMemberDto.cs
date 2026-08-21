using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Staffing;

/// <summary>
/// Every enum on this DTO (and every other DTO/command in the API) travels
/// as its exact member name string, matching how Postgres stores it (see
/// the Configurations' HasConversion&lt;string&gt;()) — not as a number. See
/// CLAUDE.md § Wire format for enums.
/// </summary>
public sealed record PayRateOverrideDto(decimal OverrideHourlyRate, string Reason, DateTime EffectiveFromUtc, Guid SetByManagerId)
{
    public static PayRateOverrideDto FromDomain(PayRateOverride override_) =>
        new(override_.OverrideHourlyRate, override_.Reason, override_.EffectiveFromUtc, override_.SetByManagerId);
}

public sealed record StaffMemberDto(
    Guid Id,
    string Name,
    string Email,
    string Phone,
    DateOnly DateOfBirth,
    string EmploymentType,
    string Classification,
    int MaxWeeklyHours,
    string PermissionLevel,
    Guid? PrimaryRoleId,
    PayRateOverrideDto? PayRateOverride,
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
            staff.DateOfBirth,
            staff.EmploymentType.ToString(),
            staff.Classification.ToString(),
            staff.MaxWeeklyHours,
            staff.PermissionLevel.ToString(),
            staff.PrimaryRoleId,
            staff.PayRateOverride is null ? null : PayRateOverrideDto.FromDomain(staff.PayRateOverride),
            staff.VenueIds,
            unavailability.Select(AvailabilityExceptionDto.FromDomain).ToList(),
            leaveRequests.Select(LeaveRequestDto.FromDomain).ToList());
}

public sealed record AvailabilityExceptionDto(Guid Id, string DayOfWeek, bool IsAllDay, IReadOnlyList<string> Blocks)
{
    public static AvailabilityExceptionDto FromDomain(StandingUnavailability unavailability) => new(
        unavailability.Id,
        unavailability.DayOfWeek.ToString(),
        unavailability.IsAllDay,
        unavailability.Blocks.Select(b => b.ToString()).ToList());
}

public sealed record LeaveRequestDto(Guid Id, DateOnly StartDate, DateOnly EndDate, string Status, string? Reason)
{
    public static LeaveRequestDto FromDomain(LeaveRequest leaveRequest) => new(
        leaveRequest.Id,
        leaveRequest.StartDate,
        leaveRequest.EndDate,
        leaveRequest.Status.ToString(),
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
