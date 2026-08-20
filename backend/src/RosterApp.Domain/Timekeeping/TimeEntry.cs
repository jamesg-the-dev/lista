using RosterApp.Domain.Common;

namespace RosterApp.Domain.Timekeeping;

public enum TimeEntryVarianceStatus
{
    WithinTolerance,
    Flagged,
    Approved,
}

/// <summary>
/// Aggregate root for a single staff clock-in/clock-out against a rostered
/// Shift. VarianceMinutes/VarianceStatus are computed once, at clock-out,
/// rather than left for a downstream report to derive — see CLAUDE.md
/// Phase 6: "Build the variance comparison inside the clock-out command,
/// not as a follow-up... the comparison is the differentiated value, not
/// the clock itself." Approved is a locked terminal state: once a manager
/// approves, ClockOut/Adjust/Approve all reject further changes so payroll
/// export (Phase 7) can trust Approved entries as final.
/// </summary>
public sealed class TimeEntry : AggregateRoot
{
    public Guid Id { get; private set; }
    public Guid VenueId { get; private set; }
    public Guid ShiftId { get; private set; }
    public Guid StaffId { get; private set; }

    public DateTime ClockInUtc { get; private set; }
    public decimal ClockInLatitude { get; private set; }
    public decimal ClockInLongitude { get; private set; }
    public decimal ClockInAccuracyMetres { get; private set; }

    public DateTime? ClockOutUtc { get; private set; }
    public decimal? ClockOutLatitude { get; private set; }
    public decimal? ClockOutLongitude { get; private set; }
    public decimal? ClockOutAccuracyMetres { get; private set; }

    public int? VarianceMinutes { get; private set; }
    public TimeEntryVarianceStatus? VarianceStatus { get; private set; }
    public string? AdjustmentReason { get; private set; }

    private TimeEntry() { } // EF Core

    public static TimeEntry ClockIn(
        Guid venueId,
        Guid shiftId,
        Guid staffId,
        decimal latitude,
        decimal longitude,
        decimal accuracyMetres)
    {
        var entry = new TimeEntry
        {
            Id = Guid.NewGuid(),
            VenueId = venueId,
            ShiftId = shiftId,
            StaffId = staffId,
            ClockInUtc = DateTime.UtcNow,
            ClockInLatitude = latitude,
            ClockInLongitude = longitude,
            ClockInAccuracyMetres = accuracyMetres,
        };

        entry.AddDomainEvent(new TimeEntryClockedIn(entry.Id, venueId, shiftId, staffId, DateTime.UtcNow));

        return entry;
    }

    public void ClockOut(decimal latitude, decimal longitude, decimal accuracyMetres, int rosteredMinutes, int toleranceMinutes)
    {
        if (ClockOutUtc is not null)
        {
            throw new InvalidOperationException($"Time entry '{Id}' has already been clocked out.");
        }

        ClockOutUtc = DateTime.UtcNow;
        ClockOutLatitude = latitude;
        ClockOutLongitude = longitude;
        ClockOutAccuracyMetres = accuracyMetres;

        ApplyVariance(rosteredMinutes, toleranceMinutes);

        AddDomainEvent(new TimeEntryClockedOut(Id, VenueId, ShiftId, VarianceMinutes!.Value, VarianceStatus!.Value.ToString(), DateTime.UtcNow));
    }

    /// <summary>
    /// Manager correction of erroneous clock times (e.g. a forgotten
    /// clock-out), recomputing variance from the corrected times rather
    /// than letting the original mistake stand. Doesn't itself approve the
    /// entry — Approve is the separate, explicit lock step, same
    /// distinction as SwapRequest's TargetStaffAccepted vs Status.
    /// </summary>
    public void Adjust(DateTime clockInUtc, DateTime clockOutUtc, int rosteredMinutes, int toleranceMinutes, string reason)
    {
        EnsureNotLocked();

        ClockInUtc = clockInUtc;
        ClockOutUtc = clockOutUtc;
        AdjustmentReason = reason;

        ApplyVariance(rosteredMinutes, toleranceMinutes);

        AddDomainEvent(new TimeEntryAdjusted(Id, VenueId, ShiftId, reason, DateTime.UtcNow));
    }

    public void Approve()
    {
        EnsureNotLocked();

        if (ClockOutUtc is null)
        {
            throw new InvalidOperationException($"Time entry '{Id}' must be clocked out before it can be approved.");
        }

        VarianceStatus = TimeEntryVarianceStatus.Approved;
        AddDomainEvent(new TimeEntryApproved(Id, VenueId, ShiftId, DateTime.UtcNow));
    }

    private void ApplyVariance(int rosteredMinutes, int toleranceMinutes)
    {
        var actualMinutes = (int)(ClockOutUtc!.Value - ClockInUtc).TotalMinutes;
        VarianceMinutes = actualMinutes - rosteredMinutes;
        VarianceStatus = Math.Abs(VarianceMinutes.Value) > toleranceMinutes
            ? TimeEntryVarianceStatus.Flagged
            : TimeEntryVarianceStatus.WithinTolerance;
    }

    private void EnsureNotLocked()
    {
        if (VarianceStatus == TimeEntryVarianceStatus.Approved)
        {
            throw new InvalidOperationException($"Time entry '{Id}' has already been approved and is locked.");
        }
    }
}
