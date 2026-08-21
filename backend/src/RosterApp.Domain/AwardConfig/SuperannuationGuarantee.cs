namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// Illustrative only — see CLAUDE.md § Award compliance disclaimer. The real
/// statutory minimum is set under the Superannuation Guarantee
/// (Administration) Act 1992 and increases periodically (11.5% -> 12% from
/// 1 July 2025, per FEATURE_SETTINGS_AWARD_PAY_CONFIG.md). This constant has
/// to be reviewed/updated by hand each time the statutory rate changes until
/// a real source (e.g. an ATO reference feed) is wired in.
/// </summary>
public static class SuperannuationGuarantee
{
    public const decimal CurrentStatutoryMinimumPercent = 12.00m;
}
