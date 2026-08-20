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
/// One rule violation raised by IRosterComplianceValidator (Phase 3). The
/// Shift aggregate carries this collection from Phase 1 onward so the
/// schema doesn't need a retrofit once the validator is implemented — the
/// collection is simply empty until Phase 3 wires a validator into the
/// command handlers.
/// </summary>
public sealed record ComplianceViolation(ComplianceViolationType Type, ComplianceSeverity Severity, string Message);
