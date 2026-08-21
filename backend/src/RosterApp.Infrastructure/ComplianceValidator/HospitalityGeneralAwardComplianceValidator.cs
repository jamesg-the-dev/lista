using RosterApp.Application.Rostering;
using RosterApp.Domain.Rostering;

namespace RosterApp.Infrastructure.ComplianceValidator;

/// <summary>
/// MA000009 (Hospitality Industry General Award) only, MVP rule set:
/// shift length, insufficient rest, missing break, and max consecutive days.
/// Shift-length, rest, and break thresholds are venue-configurable (see
/// RosterApp.Domain.RosterCompliance.RosterComplianceConfiguration,
/// FEATURE_SETTINGS_ROSTER_RULES_COMPLIANCE.md) and resolved by the caller
/// via IRosterComplianceThresholdsLookup, falling back to
/// RosterComplianceThresholds.Default for a venue that hasn't configured
/// its roster rules yet. MaxConsecutiveDays has no corresponding
/// configuration field (out of that feature's scope) and stays hardcoded.
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
    private const int MaxConsecutiveDays = 6;

    public Task<IReadOnlyList<ComplianceViolation>> ValidateAsync(
        Shift proposedShift,
        IReadOnlyList<Shift> staffMemberContext,
        RosterComplianceThresholds thresholds,
        CancellationToken cancellationToken)
    {
        var violations = new List<ComplianceViolation>();

        CheckShiftLength(proposedShift, thresholds, violations);
        CheckMissingBreak(proposedShift, thresholds, violations);
        CheckInsufficientRest(proposedShift, staffMemberContext, thresholds, violations);
        CheckMaxConsecutiveDays(proposedShift, staffMemberContext, violations);

        return Task.FromResult<IReadOnlyList<ComplianceViolation>>(violations);
    }

    private static void CheckShiftLength(Shift shift, RosterComplianceThresholds thresholds, List<ComplianceViolation> violations)
    {
        var spanMinutes = (shift.End.ToTimeSpan() - shift.Start.ToTimeSpan()).TotalMinutes;

        if (spanMinutes < thresholds.MinShiftLengthMinutes)
        {
            violations.Add(new ComplianceViolation(
                ComplianceViolationType.ShiftBelowMinimumLength,
                ComplianceSeverity.Warning,
                $"Shift is {spanMinutes / 60:0.#} hours, below the {thresholds.MinShiftLengthMinutes / 60m:0.#}-hour minimum shift length."));
        }

        if (spanMinutes > thresholds.MaxShiftLengthMinutes)
        {
            violations.Add(new ComplianceViolation(
                ComplianceViolationType.SpanOfHoursExceeded,
                ComplianceSeverity.Warning,
                $"Shift spans {spanMinutes / 60:0.#} hours, more than the {thresholds.MaxShiftLengthMinutes / 60m:0.#}-hour maximum shift length."));
        }
    }

    private static void CheckMissingBreak(Shift shift, RosterComplianceThresholds thresholds, List<ComplianceViolation> violations)
    {
        var workedMinutes = (shift.End.ToTimeSpan() - shift.Start.ToTimeSpan()).TotalMinutes - shift.UnpaidBreakMinutes;

        // The most demanding applicable rule (highest AfterHoursWorked actually crossed) —
        // avoids raising one violation per configured rule when several apply.
        var applicableRule = thresholds.MealBreakRules
            .Where(r => workedMinutes > (double)r.AfterHoursWorked * 60)
            .OrderByDescending(r => r.AfterHoursWorked)
            .FirstOrDefault();

        if (applicableRule is not null && shift.UnpaidBreakMinutes < applicableRule.BreakDurationMinutes)
        {
            violations.Add(new ComplianceViolation(
                ComplianceViolationType.MissingBreak,
                ComplianceSeverity.Warning,
                $"Shift exceeds {applicableRule.AfterHoursWorked:0.#} hours worked with less than the required {applicableRule.BreakDurationMinutes}-minute unpaid break recorded."));
        }
    }

    private static void CheckInsufficientRest(
        Shift shift,
        IReadOnlyList<Shift> context,
        RosterComplianceThresholds thresholds,
        List<ComplianceViolation> violations)
    {
        var minimumRestHours = thresholds.MinRestBetweenShiftsMinutes / 60.0;
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

            if (restHours < minimumRestHours)
            {
                violations.Add(new ComplianceViolation(
                    ComplianceViolationType.InsufficientRest,
                    ComplianceSeverity.Warning,
                    $"Only {restHours:0.#} hours rest before/after another shift for this employee — less than the {minimumRestHours:0.#}-hour minimum."));
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
