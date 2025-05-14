'use client';

// 导入原始的sidebar中的SidebarRoot
import { SidebarRoot } from "@/components/ui/sidebar";
import React from 'react';

export type SidebarProviderProps = {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

// 创建一个包装器，将SidebarRoot重新导出为SidebarProvider
export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  return (
    <SidebarRoot defaultOpen={defaultOpen}>
      {children}
    </SidebarRoot>
  );
}

// 从原始sidebar组件中重新导出useSidebar钩子
export { useSidebar } from "@/components/ui/sidebar"; 