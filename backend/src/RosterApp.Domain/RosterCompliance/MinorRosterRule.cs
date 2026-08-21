namespace RosterApp.Domain.RosterCompliance;

/// <summary>
/// Owned value object on RosterComplianceConfiguration — always present
/// (never null, never disabled), since under-18 rostering limits are a legal
/// requirement, not a feature toggle (§6). Applying these limits against a
/// specific shift requires knowing the rostered employee's age, which is
/// derived from Staff.DateOfBirth at validation time per §2 AC2 — that field
/// doesn't exist on StaffMember yet (Staff & Roles, build order step 4), so
/// IRosterComplianceValidator doesn't enforce this rule set yet. The
/// configuration is captured and persisted here so the settings screen isn't
/// blocked on that later step.
/// </summary>
public sealed record MinorRosterRule(
    decimal MaxDailyHours,
    decimal MaxWeeklyHours,
    TimeOnly EarliestStartTime,
    TimeOnly LatestFinishTime)
{
    public static MinorRosterRule Create(decimal maxDailyHours, decimal maxWeeklyHours, TimeOnly earliestStartTime, TimeOnly latestFinishTime) =>
        new(maxDailyHours, maxWeeklyHours, earliestStartTime, latestFinishTime);
}
