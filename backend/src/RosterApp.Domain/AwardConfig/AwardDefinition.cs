namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// System-maintained reference data (FEATURE_SETTINGS_AWARD_PAY_CONFIG.md
/// §2 AC1) — owners pick from this list, they don't author it. Seeded via
/// EF Core migration data seeding, not a hardcoded enum, so a new award or a
/// Fair Work restructure is a data change, not a code deploy. MVP seeds real
/// AwardClassificationDefinition/AwardRate rows for MA000009 only (matching
/// HospitalityGeneralAwardRateCalculator, the only award actually wired into
/// IAwardRateCalculator); the other three awards in the minimum list exist
/// here as selectable entries with no classification data yet.
/// </summary>
public sealed class AwardDefinition
{
    public Guid Id { get; private set; }
    public string AwardCode { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string Jurisdiction { get; private set; } = null!;

    private AwardDefinition() { } // EF Core

    public static AwardDefinition Create(Guid id, string awardCode, string name, string jurisdiction) =>
        new()
        {
            Id = id,
            AwardCode = awardCode,
            Name = name,
            Jurisdiction = jurisdiction,
        };
}
