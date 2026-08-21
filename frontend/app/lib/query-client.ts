import { QueryClient } from '@tanstack/react-query';

// Single QueryClient instance shared between the QueryClientProvider (root.tsx)
// and route clientLoaders (e.g. AppLayout's auth gate), which prime the cache
// via queryClient.ensureQueryData before a route with SSR disabled renders.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});
