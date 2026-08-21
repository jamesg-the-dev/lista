namespace RosterApp.Domain.Tenancy;

/// <summary>
/// One trading session for a single day of the week. Multiple sessions per
/// day are supported (e.g. lunch + dinner service with a gap) by having more
/// than one row share the same DayOfWeek with a different SessionLabel —
/// UpdateVenueTradingHoursCommand replaces the full week's sessions in one
/// call rather than patching per-day, so there's no uniqueness constraint on
/// DayOfWeek here. CrossesMidnight is an explicit flag rather than inferring
/// "trades past midnight" from CloseTime &lt; OpenTime, since silently
/// misinterpreting that matters a lot for shift/roster date attribution.
/// </summary>
public sealed record TradingHourSession(
    DayOfWeek DayOfWeek,
    string? SessionLabel,
    TimeOnly? OpenTime,
    TimeOnly? CloseTime,
    bool IsClosed,
    bool CrossesMidnight = false);
