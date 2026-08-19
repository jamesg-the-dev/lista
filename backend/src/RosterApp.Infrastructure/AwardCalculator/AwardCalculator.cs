using RosterApp.Application.Rostering;

namespace RosterApp.Infrastructure.AwardCalculator;

public class AwardRateCalculator : IAwardRateCalculator
{
    public ShiftRateResult Calculate(
        DayOfWeek dayOfWeek,
        TimeOnly start,
        TimeOnly end,
        int unpaidBreakMinutes,
        decimal baseRatePerHour
    )
    {
        return new ShiftRateResult(0, 0, string.Empty, 0);
    }
}
