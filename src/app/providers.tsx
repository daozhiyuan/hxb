'use client';

import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  session?: any;
}

export function Providers({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  session
}: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider 
        attribute={attribute} 
        defaultTheme={defaultTheme} 
        enableSystem={enableSystem}
      >
        <SidebarProvider defaultOpen={true}>
          {children}
        </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 