import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0, // Real-time fresh data on every fetch
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  }
});
