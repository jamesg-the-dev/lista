namespace RosterApp.Domain.Tenancy;

/// <summary>
/// One card on the post-signup setup checklist (FEATURE_ONBOARDING_FLOW.md).
/// "BuildFirstRoster" has no Skipped state in the UI — it's the destination,
/// not a task — enforced by SetOnboardingStepStatusCommandValidator, not
/// here, matching the rest of this codebase's "domain factory stays
/// permissive, command validator enforces the request-shape rule" split
/// (e.g. Abn.Create vs CreateVenueCommandValidator).
/// </summary>
public enum OnboardingStep
{
    VenueProfile,
    AwardPaySetup,
    AddStaff,
    BuildFirstRoster,
}

/// <summary>
/// Pending is declared first so the enum's CLR default matches
/// VenueConfiguration's HasDefaultValue(Pending) — see PermissionLevel's
/// doc comment for why this ordering matters for EF Core.
/// </summary>
public enum OnboardingStepState
{
    Pending,
    Completed,
    Skipped,
}

/// <summary>
/// Owned value object on Venue tracking the post-signup setup checklist.
/// Plain in-place mutable settings, same "simple owned value on the
/// aggregate" pattern as VenueAvailabilitySettings — no temporal
/// versioning, since this is workflow-progress tracking, not a
/// compliance/pay figure.
/// </summary>
public sealed record VenueOnboardingStatus(
    OnboardingStepState VenueProfile,
    OnboardingStepState AwardPaySetup,
    OnboardingStepState AddStaff,
    OnboardingStepState BuildFirstRoster,
    bool ChecklistDismissed)
{
    public static VenueOnboardingStatus CreateDefault() =>
        new(
            OnboardingStepState.Pending,
            OnboardingStepState.Pending,
            OnboardingStepState.Pending,
            OnboardingStepState.Pending,
            ChecklistDismissed: false);

    public VenueOnboardingStatus WithStepState(OnboardingStep step, OnboardingStepState state) =>
        step switch
        {
            OnboardingStep.VenueProfile => this with { VenueProfile = state },
            OnboardingStep.AwardPaySetup => this with { AwardPaySetup = state },
            OnboardingStep.AddStaff => this with { AddStaff = state },
            OnboardingStep.BuildFirstRoster => this with { BuildFirstRoster = state },
            _ => throw new ArgumentOutOfRangeException(nameof(step), step, "Unknown onboarding step."),
        };

    public VenueOnboardingStatus Dismiss() => this with { ChecklistDismissed = true };
}
