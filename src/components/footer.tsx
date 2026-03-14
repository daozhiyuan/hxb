'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type FooterSettings = {
  copyright: string;
  companyName: string;
  icp: string;
};

export function Footer() {
  const [settings, setSettings] = useState<FooterSettings>({
    copyright: '© 2024 航向标. 保留所有权利。',
    companyName: '',
    icp: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // 标记组件是否已卸载
    let isMounted = true;
    
    // 尝试获取系统设置
    const fetchSettings = async () => {
      // 如果已经加载过或有错误，不重复加载
      if (hasError || !isLoading) return;
      
      try {
        setIsLoading(true);
        const response = await fetch('/api/public/settings');
        
        // 确保组件仍然挂载
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          setSettings({
            copyright: data.copyright || settings.copyright,
            companyName: data.companyName || '',
            icp: data.icp || '',
          });
        } else {
          console.error('获取页脚设置失败:', response.status);
          setHasError(true);
          // 保持默认值
        }
      } catch (error) {
        // 确保组件仍然挂载
        if (!isMounted) return;
        
        console.error('获取页脚设置失败:', error);
        setHasError(true);
        // 保持默认值
      } finally {
        // 确保组件仍然挂载
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSettings();
    
    // 清理函数
    return () => {
      isMounted = false;
    };
  }, []);  // 仅在组件挂载时获取一次

  return (
    <footer className="w-full py-6 mt-auto border-t">
      <div className="container flex flex-col items-center justify-center gap-2 md:flex-row md:justify-between">
        <div className="text-center md:text-left">
          <p className="text-sm text-muted-foreground">
            {settings.copyright}
          </p>
        </div>
        {settings.icp && (
          <div className="flex items-center gap-2">
            <Link 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:underline"
            >
              {settings.icp}
            </Link>
          </div>
        )}
      </div>
    </footer>
  );
} 