import { useMutation } from '@tanstack/react-query';

import * as api from './api';
import { mapSignUpResult } from './types';

export function useSignUp() {
  return useMutation({
    mutationFn: async ({ fullName, venueName }: { fullName: string; venueName: string }) =>
      mapSignUpResult(await api.signUp(fullName, venueName)),
  });
}
