import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchCurrentAccount } from "./api";
import { mapAccount } from "./types";

// Exported (not just used inline) so AppLayout's clientLoader can prime this
// exact query via queryClient.ensureQueryData before the route renders —
// one query definition shared between the loader and the hook, per CLAUDE.md
// § React Router route modules and data loading.
export const currentAccountQueryOptions = queryOptions({
  queryKey: ["account", "me"] as const,
  queryFn: async () => mapAccount(await fetchCurrentAccount()),
});

export function useCurrentAccount() {
  return useQuery(currentAccountQueryOptions);
}
