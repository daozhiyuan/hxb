'use client';

import { SessionProvider } from 'next-auth/react';
import { SidebarRoot } from '@/components/ui/sidebar';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
  session?: any;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <SidebarRoot defaultOpen={true}>{children}</SidebarRoot>
    </SessionProvider>
  );
}
