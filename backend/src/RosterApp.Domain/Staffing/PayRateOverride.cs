namespace RosterApp.Domain.Staffing;

/// <summary>
/// Owned value object on StaffMember (see FEATURE_SETTINGS_STAFF_ROLES.md
/// §3) — an above-award hourly rate applied on top of (never instead of)
/// the award-derived base rate, so payroll export can show both figures
/// transparently, per CLAUDE.md's "why it exists" transparency principle.
/// Reason is required so the override is auditable rather than a bare
/// number a future owner/staff member has to take on faith.
/// </summary>
public sealed record PayRateOverride(decimal OverrideHourlyRate, string Reason, DateTime EffectiveFromUtc, Guid SetByManagerId)
{
    public static PayRateOverride Create(decimal overrideHourlyRate, string reason, Guid setByManagerId)
    {
        if (overrideHourlyRate <= 0)
        {
            throw new ArgumentException("Override rate must be positive.", nameof(overrideHourlyRate));
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("A reason is required for pay rate overrides.", nameof(reason));
        }

        return new PayRateOverride(overrideHourlyRate, reason.Trim(), DateTime.UtcNow, setByManagerId);
    }
}
