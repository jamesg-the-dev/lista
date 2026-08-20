using RosterApp.Application.Rostering;
using RosterApp.Domain.Rostering;

namespace RosterApp.Infrastructure.ComplianceValidator;

/// <summary>
/// MA000009 (Hospitality Industry General Award) only, MVP rule set:
/// insufficient rest, missing break, span-of-hours, max consecutive days.
/// Figures are illustrative for UI/architecture purposes only — not sourced
/// from Fair Work's Pay Calculator or verified against a licensed
/// award-interpretation feed. Do not ship real payroll/compliance decisions
/// against this logic without that verification step (see CLAUDE.md §
/// Award compliance). All violations start at Warning severity per the
/// locked "warning by default" decision — none of these MVP rules are
/// escalated to Blocking.
/// </summary>
public sealed class HospitalityGeneralAwardComplianceValidator : IRosterComplianceValidator
{
    private const int MinimumRestHours = 10;
    private const int MaxSpanOfHoursMinutes = 12 * 60;
    private const int BreakRequiredAfterMinutes = 5 * 60;
    private const int MaxConsecutiveDays = 6;

    public Task<IReadOnlyList<ComplianceViolation>> ValidateAsync(
        Shift proposedShift,
        IReadOnlyList<Shift> staffMemberContext,
        CancellationToken cancellationToken)
    {
        var violations = new List<ComplianceViolation>();

        CheckSpanOfHours(proposedShift, violations);
        CheckMissingBreak(proposedShift, violations);
        CheckInsufficientRest(proposedShift, staffMemberContext, violations);
        CheckMaxConsecutiveDays(proposedShift, staffMemberContext, violations);

        return Task.FromResult<IReadOnlyList<ComplianceViolation>>(violations);
    }

    private static void CheckSpanOfHours(Shift shift, List<ComplianceViolation> violations)
    {
        var spanMinutes = (shift.End.ToTimeSpan() - shift.Start.ToTimeSpan()).TotalMinutes;
        if (spanMinutes > MaxSpanOfHoursMinutes)
        {
            violations.Add(new ComplianceViolation(
                ComplianceViolationType.SpanOfHoursExceeded,
                ComplianceSeverity.Warning,
                $"Shift spans {spanMinutes / 60:0.#} hours, more than the {MaxSpanOfHoursMinutes / 60}-hour span-of-hours guideline."));
        }
    }

    private static void CheckMissingBreak(Shift shift, List<ComplianceViolation> violations)
    {
        var workedMinutes = (shift.End.ToTimeSpan() - shift.Start.ToTimeSpan()).TotalMinutes - shift.UnpaidBreakMinutes;
        if (workedMinutes > BreakRequiredAfterMinutes && shift.UnpaidBreakMinutes == 0)
        {
            violations.Add(new ComplianceViolation(
                ComplianceViolationType.MissingBreak,
                ComplianceSeverity.Warning,
                $"Shift exceeds {BreakRequiredAfterMinutes / 60} hours worked with no unpaid break recorded."));
        }
    }

    private static void CheckInsufficientRest(Shift shift, IReadOnlyList<Shift> context, List<ComplianceViolation> violations)
    {
        var shiftStart = shift.ShiftDate.ToDateTime(shift.Start);
        var shiftEnd = shift.ShiftDate.ToDateTime(shift.End);

        foreach (var other in context)
        {
            if (other.EmployeeId != shift.EmployeeId || other.Id == shift.Id)
            {
                continue;
            }

            var otherStart = other.ShiftDate.ToDateTime(other.Start);
            var otherEnd = other.ShiftDate.ToDateTime(other.End);

            double restHours;
            if (otherEnd <= shiftStart)
            {
                restHours = (shiftStart - otherEnd).TotalHours;
            }
            else if (shiftEnd <= otherStart)
            {
                restHours = (otherStart - shiftEnd).TotalHours;
            }
            else
            {
                continue; // overlapping shifts — not a rest-between-shifts concern
            }

            if (restHours < MinimumRestHours)
            {
                violations.Add(new ComplianceViolation(
                    ComplianceViolationType.InsufficientRest,
                    ComplianceSeverity.Warning,
                    $"Only {restHours:0.#} hours rest before/after another shift for this employee — less than the {MinimumRestHours}-hour minimum."));
                return; // one flagged pair is enough; don't add a duplicate per adjacent shift
            }
        }
    }

    private static void CheckMaxConsecutiveDays(Shift shift, IReadOnlyList<Shift> context, List<ComplianceViolation> violations)
    {
        var rosteredDates = context
            .Where(s => s.EmployeeId == shift.EmployeeId && s.Id != shift.Id)
            .Select(s => s.ShiftDate)
            .Append(shift.ShiftDate)
            .ToHashSet();

        var streakLength = 1;

        var cursor = shift.ShiftDate.AddDays(-1);
        while (rosteredDates.Contains(cursor))
        {
            streakLength++;
            cursor = cursor.AddDays(-1);
        }

        cursor = shift.ShiftDate.AddDays(1);
        while (rosteredDates.Contains(cursor))
        {
            streakLength++;
            cursor = cursor.AddDays(1);
        }

        if (streakLength > MaxConsecutiveDays)
        {
            violations.Add(new ComplianceViolation(
                ComplianceViolationType.MaxConsecutiveDays,
                ComplianceSeverity.Warning,
                $"Rostered {streakLength} consecutive days, more than the {MaxConsecutiveDays}-day guideline."));
        }
    }
}
