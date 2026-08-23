// Onboarding sign-up bootstrap — backed by OnboardingController
// (backend/src/RosterApp.Api/Controllers/OnboardingController.cs) and
// SignUpCommand. See docs/features/FEATURE_ONBOARDING_FLOW.md.
//
// Password itself never reaches this DTO — it's handled entirely by
// Supabase Auth (supabase.auth.signUp / signInWithOAuth) in route.tsx, and
// this command only runs once that call has produced a valid session.

export interface SignUpResultDto {
  organisationId: string;
  venueId: string;
  staffMemberId: string;
}

export interface SignUpResult {
  organisationId: string;
  venueId: string;
  staffMemberId: string;
}

export function mapSignUpResult(dto: SignUpResultDto): SignUpResult {
  return {
    organisationId: dto.organisationId,
    venueId: dto.venueId,
    staffMemberId: dto.staffMemberId,
  };
}

export function toSignUpRequestDto(fullName: string, venueName: string) {
  return { fullName, venueName };
}
