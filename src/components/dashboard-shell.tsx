'use client';

import { ReactNode } from 'react';
import { 
  Sidebar, 
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider  
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
  
  // 如果没有会话或会话加载中，只显示内容（登录页等将单独处理）
  if (status !== 'authenticated' || !session) {
    return <>{children}</>;
  }

  // 安全获取用户角色，使用可选链和默认值防止未定义错误
  const userRole = session?.user?.role || 'USER';

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar className="border-r">
          <SidebarHeader className="flex flex-col gap-2 py-4">
            <div className="px-2 font-semibold text-lg text-center">
              客户管理系统
            </div>
          </SidebarHeader>
          <SidebarContent>
            <MainNav />
          </SidebarContent>
          <SidebarFooter className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <ThemeModeToggle />
              <div className="text-xs text-muted-foreground">
                {userRole === 'ADMIN' ? '管理员' : 
                 userRole === 'SUPER_ADMIN' ? '超级管理员' :
                 userRole === 'PARTNER' ? '合作伙伴' : '用户'}
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto md:ml-[16rem]">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 