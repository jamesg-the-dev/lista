using RosterApp.Domain.Timekeeping;

namespace RosterApp.Application.Timekeeping;

public sealed record TimeEntryDto(
    Guid Id,
    Guid VenueId,
    Guid ShiftId,
    Guid StaffId,
    DateTime ClockInUtc,
    decimal ClockInLatitude,
    decimal ClockInLongitude,
    decimal ClockInAccuracyMetres,
    DateTime? ClockOutUtc,
    decimal? ClockOutLatitude,
    decimal? ClockOutLongitude,
    decimal? ClockOutAccuracyMetres,
    int? VarianceMinutes,
    string? VarianceStatus,
    string? AdjustmentReason)
{
    public static TimeEntryDto FromDomain(TimeEntry entry) => new(
        entry.Id,
        entry.VenueId,
        entry.ShiftId,
        entry.StaffId,
        entry.ClockInUtc,
        entry.ClockInLatitude,
        entry.ClockInLongitude,
        entry.ClockInAccuracyMetres,
        entry.ClockOutUtc,
        entry.ClockOutLatitude,
        entry.ClockOutLongitude,
        entry.ClockOutAccuracyMetres,
        entry.VarianceMinutes,
        entry.VarianceStatus?.ToString(),
        entry.AdjustmentReason);
}
