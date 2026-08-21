import { apiClient } from '~/lib/api-client';

import type { AccountDto } from './types';

export function fetchCurrentAccount(): Promise<AccountDto> {
  return apiClient.get<AccountDto>('/api/account/me');
}
