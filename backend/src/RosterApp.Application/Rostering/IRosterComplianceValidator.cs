using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Answers "is this shift legal" — a separate pluggable concern from
/// IAwardRateCalculator, which answers "what does this shift cost" (see
/// CLAUDE.md "Pay-rate math and legality checks are two separate pluggable
/// concerns — do not merge them"). MVP ships a single hardcoded
/// implementation (HospitalityGeneralAwardComplianceValidator, MA000009
/// rules only) but command handlers depend on this interface only. Pure
/// function: takes the proposed shift plus the employee's adjacent shifts
/// (fetched by the caller, not by the validator itself) and returns
/// violations, so it stays easy to unit test without a repository. Config-
/// driven thresholds (min/max shift length, min rest, meal breaks) are
/// likewise resolved by the caller via IRosterComplianceThresholdsLookup and
/// passed in, rather than looked up here — same "resolved by caller"
/// discipline as AwardConfiguration.CreateNewVersion's minimum-percent
/// parameters.
/// </summary>
public interface IRosterComplianceValidator
{
    Task<IReadOnlyList<ComplianceViolation>> ValidateAsync(
        Shift proposedShift,
        IReadOnlyList<Shift> staffMemberContext,
        RosterComplianceThresholds thresholds,
        CancellationToken cancellationToken);
}
