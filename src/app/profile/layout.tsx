'use client';

import { DashboardShell } from '@/components/dashboard-shell';

// 客户端组件不能导出服务端配置，移除dynamic标记

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
} 