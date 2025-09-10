import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data trong 10 phút
      staleTime: 10 * 60 * 1000, // 10 minutes
      // Giữ data trong cache 30 phút kể cả khi không sử dụng
      cacheTime: 30 * 60 * 1000, // 30 minutes
      // Không refetch khi window focus lại
      refetchOnWindowFocus: false,
      // Retry 1 lần nếu lỗi
      retry: 1,
      // Không ép refetch khi component mount lại để tránh nháy
      refetchOnMount: false,
    },
  },
});

export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools chỉ hiện trong development
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )} */}
    </QueryClientProvider>
  );
}