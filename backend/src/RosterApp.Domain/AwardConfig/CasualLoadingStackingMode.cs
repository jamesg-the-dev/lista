namespace RosterApp.Domain.AwardConfig;

/// <summary>
/// Names how a Modern Award's casual loading combines with its weekend/
/// public-holiday penalty rates for a shift — see
/// docs/casual-loading-calculation.md for the primary-source audit this
/// captures. This exists so the stacking behaviour is an explicit, cited
/// decision per award rather than an assumption buried in a calculator's
/// arithmetic (a wrong guess here either underpays or double-counts a
/// casual employee's pay).
/// </summary>
public enum CasualLoadingStackingMode
{
    /// <summary>
    /// Casual loading is added as flat percentage points on top of the
    /// permanent (full-time/part-time) penalty percentage for the same
    /// period — e.g. Saturday 125% (permanent) + 25 points = 150%
    /// (casual) — never compounded/multiplied. Confirmed for MA000009
    /// (Hospitality) clause 11.1 ("a loading of 25% ... for each hour
    /// worked ... in addition to the ordinary hourly rate") cross-checked
    /// against its own Table 14 Saturday/Sunday figures, and independently
    /// confirmed for MA000003 (Fast Food) via an explicit award Note:
    /// "The penalty rates for casual employees have been calculated by
    /// adding the casual loading specified in clause 11.2(b) to the
    /// penalty rates for full-time and part-time employees" (Table 6,
    /// clause 20.6 Note 1 / clause 21 Note 1). MA000119 (Restaurant)
    /// shares near-identical clause 11.1 wording with MA000009 and the
    /// same drafting family as MA000003, so is very likely governed by
    /// the same mode, but this has not been confirmed against its own
    /// Table 8 with the same certainty — treat any MA000119 use of this
    /// mode as unverified until independently checked.
    /// </summary>
    AdditivePercentagePoints,

    /// <summary>
    /// Stacking behaviour could not be established against primary source
    /// text with confidence — sources for MA000058 (Registered and
    /// Licensed Clubs Award) actively conflicted on whether weekend/public
    /// holiday loadings apply flatly to "all employees" with the 25%
    /// casual loading then added separately, or whether clauses 24.1/24.2
    /// already publish all-inclusive casual percentages the way MA000009/
    /// MA000003 do. No IAwardRateCalculator may be shipped for an award
    /// carrying this value — do not silently pick an interpretation; get
    /// primary-source clause text (or a licensed award-interpretation
    /// feed) and resolve this to AdditivePercentagePoints or a new named
    /// mode before implementing.
    /// </summary>
    Unverified,
}
