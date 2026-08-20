namespace RosterApp.Domain.Rostering;

public enum ComplianceViolationType
{
    InsufficientRest,
    MissingBreak,
    SpanOfHoursExceeded,
    MaxConsecutiveDays,
}

public enum ComplianceSeverity
{
    Warning,
    Blocking,
}

/// <summary>
/// One rule violation raised by IRosterComplianceValidator. Acknowledged and
/// OverrideReason capture the audit-logged manager override flow — an
/// overridden violation stays in the collection (never deleted) with
/// Acknowledged flipped to true, so a manager can see what was overridden
/// and why. Re-running the validator (any shift schedule edit) replaces the
/// whole collection with freshly computed violations, so an override does
/// not carry across an edit to the shift it was raised against.
/// </summary>
public sealed record ComplianceViolation(
    ComplianceViolationType Type,
    ComplianceSeverity Severity,
    string Message,
    bool Acknowledged = false,
    string? OverrideReason = null
);
