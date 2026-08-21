import { queryOptions, useQuery } from '@tanstack/react-query';

import { fetchCurrentAccount } from './api';
import { mapAccount } from './types';

export const currentAccountQueryOptions = queryOptions({
  queryKey: ['account', 'me'] as const,
  queryFn: async () => mapAccount(await fetchCurrentAccount()),
  staleTime: Infinity,
});

export function useCurrentAccount() {
  return useQuery(currentAccountQueryOptions);
}
