using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Shared response shape for CreateShiftCommand, UpdateShiftCommand, and
/// GetRosterForWeekQuery. Keeps awardBreakdown/complianceViolations
/// itemised all the way to the wire — never collapsed into a total or a
/// boolean flag (see CLAUDE.md "Why it exists").
/// </summary>
public sealed record ShiftDto(
    Guid Id,
    Guid VenueId,
    Guid EmployeeId,
    DateOnly ShiftDate,
    TimeOnly Start,
    TimeOnly End,
    int UnpaidBreakMinutes,
    decimal BaseRatePerHour,
    string Status,
    IReadOnlyList<AwardBreakdownLineDto> AwardBreakdown,
    IReadOnlyList<ComplianceViolationDto> ComplianceViolations)
{
    public static ShiftDto FromDomain(Shift shift) => new(
        shift.Id,
        shift.VenueId,
        shift.EmployeeId,
        shift.ShiftDate,
        shift.Start,
        shift.End,
        shift.UnpaidBreakMinutes,
        shift.BaseRatePerHour,
        shift.Status.ToString(),
        shift.AwardBreakdown.Select(AwardBreakdownLineDto.FromDomain).ToList(),
        shift.ComplianceViolations.Select(ComplianceViolationDto.FromDomain).ToList());
}

public sealed record AwardBreakdownLineDto(string Label, decimal Hours, decimal RatePerHour, decimal Amount)
{
    public static AwardBreakdownLineDto FromDomain(AwardBreakdownLine line) =>
        new(line.Label, line.Hours, line.RatePerHour, line.Amount);
}

public sealed record ComplianceViolationDto(
    string Type,
    string Severity,
    string Message,
    bool Acknowledged,
    string? OverrideReason)
{
    public static ComplianceViolationDto FromDomain(ComplianceViolation violation) =>
        new(
            violation.Type.ToString(),
            violation.Severity.ToString(),
            violation.Message,
            violation.Acknowledged,
            violation.OverrideReason);
}
