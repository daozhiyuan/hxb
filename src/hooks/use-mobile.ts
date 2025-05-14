'use client';

import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // 立即检查窗口宽度
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    // 初始检查
    if (typeof window !== 'undefined') {
      checkIsMobile();
    }
    
    // 添加监听器
    window.addEventListener('resize', checkIsMobile);
    
    // 清理监听器
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, [breakpoint]);
  
  return isMobile;
} 