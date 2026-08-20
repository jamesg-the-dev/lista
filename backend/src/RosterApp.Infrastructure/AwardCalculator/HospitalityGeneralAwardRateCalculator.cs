using RosterApp.Application.Rostering;
using RosterApp.Domain.Rostering;

namespace RosterApp.Infrastructure.AwardCalculator;

/// <summary>
/// MA000009 (Hospitality Industry General Award) only, MVP rule set:
/// ordinary hours, Saturday +25%, Sunday +50%, weekday evening (after 7pm)
/// +10%. Figures are illustrative for UI/architecture purposes only — not
/// sourced from Fair Work's Pay Calculator or verified against a licensed
/// award-interpretation feed. Do not ship real payroll calculations against
/// this logic without that verification step (see CLAUDE.md).
/// </summary>
public sealed class HospitalityGeneralAwardRateCalculator : IAwardRateCalculator
{
    private static readonly TimeSpan EveningBoundary = new(19, 0, 0);

    public IReadOnlyList<AwardBreakdownLine> Calculate(
        DayOfWeek dayOfWeek,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes,
        decimal baseRatePerHour)
    {
        var totalMinutes = (end.ToTimeSpan() - start.ToTimeSpan()).TotalMinutes - unpaidBreakMinutes;
        if (totalMinutes <= 0)
        {
            return [];
        }

        if (dayOfWeek == DayOfWeek.Sunday)
        {
            return [BuildLine("Sunday (+50%)", totalMinutes, baseRatePerHour * 1.5m)];
        }

        if (dayOfWeek == DayOfWeek.Saturday)
        {
            return [BuildLine("Saturday (+25%)", totalMinutes, baseRatePerHour * 1.25m)];
        }

        return BuildWeekdayLines(start, totalMinutes, baseRatePerHour);
    }

    private static List<AwardBreakdownLine> BuildWeekdayLines(TimeOnly start, double totalMinutes, decimal baseRatePerHour)
    {
        var startOfDay = start.ToTimeSpan();

        double ordinaryMinutes;
        double eveningMinutes;

        if (startOfDay >= EveningBoundary)
        {
            ordinaryMinutes = 0;
            eveningMinutes = totalMinutes;
        }
        else
        {
            var minutesBeforeEvening = (EveningBoundary - startOfDay).TotalMinutes;
            ordinaryMinutes = Math.Min(minutesBeforeEvening, totalMinutes);
            eveningMinutes = totalMinutes - ordinaryMinutes;
        }

        var lines = new List<AwardBreakdownLine>();
        if (ordinaryMinutes > 0)
        {
            lines.Add(BuildLine("Ordinary hours", ordinaryMinutes, baseRatePerHour));
        }

        if (eveningMinutes > 0)
        {
            lines.Add(BuildLine("Weekday evening (+10%)", eveningMinutes, baseRatePerHour * 1.10m));
        }

        return lines;
    }

    private static AwardBreakdownLine BuildLine(string label, double minutes, decimal ratePerHour)
    {
        var hours = Math.Round((decimal)(minutes / 60.0), 2);
        return new AwardBreakdownLine(label, hours, ratePerHour, Math.Round(hours * ratePerHour, 2));
    }
}
