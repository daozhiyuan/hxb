'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SidebarContextType {
  open: boolean;
  state: 'expanded' | 'collapsed';
  isMobile: boolean;
  openMobile: boolean;
  setOpen: (open: boolean) => void;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (context === null) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// 检测是否为移动设备的钩子
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // 初始检查
    checkIsMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkIsMobile);
    
    // 清理监听器
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
};

export interface SidebarProviderProps {
  children: ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = true
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [openState, setOpenState] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);
  
  const state = openState ? 'expanded' : 'collapsed';
  
  // 提供切换sidebar的方法
  const toggleSidebar = () => {
    return isMobile
      ? setOpenMobile(prev => !prev)
      : setOpenState(prev => !prev);
  };
  
  // 提供sidebar状态上下文
  const contextValue: SidebarContextType = {
    open: openState,
    state,
    isMobile,
    openMobile,
    setOpen: setOpenState,
    setOpenMobile,
    toggleSidebar
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
} 