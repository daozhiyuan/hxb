'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientProviderProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

/**
 * 客户端组件提供者 - 处理认证和授权逻辑
 * 为客户端组件提供统一的会话处理和加载状态
 */
export function ClientProvider({
  children,
  requireAuth = true,
  requireAdmin = false
}: ClientProviderProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // 处理客户端挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理认证重定向
  useEffect(() => {
    if (mounted && status === 'unauthenticated' && requireAuth) {
      router.replace('/login');
    }

    if (mounted && status === 'authenticated' && requireAdmin && session?.user?.role !== 'ADMIN') {
      router.replace('/unauthorized');
    }
  }, [status, requireAuth, requireAdmin, router, mounted, session?.user?.role]);

  // 处理初始加载状态
  if (!mounted || status === 'loading') {
    return (
      <div className="w-full p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-6 w-[400px]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[350px]" />
            <Skeleton className="h-4 w-[300px]" />
            <Skeleton className="h-4 w-[400px]" />
          </div>
        </div>
      </div>
    );
  }

  // 处理未认证状态
  if (requireAuth && status === 'unauthenticated') {
    return null; // 将重定向到登录页面
  }

  // 处理需要管理员权限但用户不是管理员的情况
  if (requireAdmin && session?.user?.role !== 'ADMIN') {
    return null; // 将重定向到未授权页面
  }

  // 一切正常，显示子组件
  return <>{children}</>;
} 