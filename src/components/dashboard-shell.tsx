'use client';

import { ReactNode } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarRoot,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Header } from '@/components/header';
import { ThemeModeToggle } from '@/components/theme-mode-toggle';
import { useSession } from 'next-auth/react';

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { data: session, status } = useSession();

  if (status !== 'authenticated' || !session) {
    return <>{children}</>;
  }

  const userRole = session?.user?.role || 'USER';

  return (
    <SidebarRoot defaultOpen={true}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar className="border-r">
            <SidebarHeader className="flex flex-col gap-2 py-4">
              <div className="px-2 text-center text-lg font-semibold">客户管理系统</div>
            </SidebarHeader>
            <SidebarContent>
              <MainNav />
            </SidebarContent>
            <SidebarFooter className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <ThemeModeToggle />
                <div className="text-xs text-muted-foreground">
                  {userRole === 'ADMIN'
                    ? '管理员'
                    : userRole === 'SUPER_ADMIN'
                      ? '超级管理员'
                      : userRole === 'PARTNER'
                        ? '合作伙伴'
                        : '用户'}
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>
          <main className="flex-1 overflow-auto md:ml-[16rem]">
            <div className="container py-6">{children}</div>
          </main>
        </div>
      </div>
    </SidebarRoot>
  );
}
