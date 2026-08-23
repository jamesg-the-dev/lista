import { apiClient } from '~/lib/api-client';

import type { SignUpResultDto } from './types';
import { toSignUpRequestDto } from './types';

export function signUp(fullName: string, venueName: string): Promise<SignUpResultDto> {
  return apiClient.post<SignUpResultDto>(
    '/api/onboarding/sign-up',
    toSignUpRequestDto(fullName, venueName),
  );
}
