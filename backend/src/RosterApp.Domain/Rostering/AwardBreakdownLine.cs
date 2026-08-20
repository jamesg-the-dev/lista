namespace RosterApp.Domain.Rostering;

/// <summary>
/// One itemised line of a shift's award-rate calculation (e.g. "Saturday
/// (+25%)" or "Weekday evening (+10%)"). Never collapse a shift's cost into
/// a single total — the itemised breakdown is the product's differentiator,
/// surfaced on the shift editor's receipt-style panel (see CLAUDE.md "Why
/// it exists").
/// </summary>
public sealed record AwardBreakdownLine(string Label, decimal Hours, decimal RatePerHour, decimal Amount);
