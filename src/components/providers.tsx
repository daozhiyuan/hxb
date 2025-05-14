'use client';

import * as React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { SidebarProvider } from '@/providers/sidebar-provider';
import { UIProvider } from '@/contexts/ui-context';
import { Toaster } from '@/components/ui/toaster';

// 路由变更时的处理函数
function RouteHandler() {
  return null;
}

interface ProvidersProps {
  children: React.ReactNode;
  session?: any;
  attribute?: 'class' | 'data-theme';
  defaultTheme?: string;
  enableSystem?: boolean;
}

// 应用的全局提供者组件
export function Providers({
  children,
  session,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
}: ProvidersProps) {
  return (
    <SessionProvider session={session} refetchInterval={5 * 60} refetchWhenOffline={false}>
      <UIProvider>
        <ThemeProvider 
          attribute={attribute} 
          defaultTheme={defaultTheme} 
          enableSystem={enableSystem}
        >
          <SidebarProvider defaultOpen={true}>
            <RouteHandler />
            {children}
            <Toaster />
          </SidebarProvider>
        </ThemeProvider>
      </UIProvider>
    </SessionProvider>
  );
}

// 简化的认证提供者
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
