'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

// 创建一个组件用于处理全局预加载和路由行为
function RouteHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 清除所有无效的预加载请求
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      // 如果是RSC请求，并且URL中包含_rsc参数
      if (typeof input === 'string' && input.includes('_rsc=')) {
        // 检查是否为预加载请求
        if (init?.signal?.aborted) {
          return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
      }
      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [pathname, searchParams]);

  return null;
}

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <SessionProvider>
      <NextThemesProvider {...props}>
        <RouteHandler />
        {children}
      </NextThemesProvider>
    </SessionProvider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
