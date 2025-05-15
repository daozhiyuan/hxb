'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { isValidSession, repairSessionOrSignOut } from '@/lib/auth-helpers';

interface ClientProviderProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

/**
 * 客户端组件提供者 - 处理认证和授权逻辑
 * 为客户端组件提供统一的会话处理和加载状态
 */
export function ClientProvider({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireSuperAdmin = false
}: ClientProviderProps) {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const [isSessionRepairing, setIsSessionRepairing] = useState(false);

  // 处理客户端挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 会话修复和日志记录
  useEffect(() => {
    if (status === 'authenticated' && session) {
      // 检查会话是否有效
      if (!isValidSession(session)) {
        console.warn('[ClientProvider] 用户会话无效，尝试修复会话');
        
        // 如果尝试次数少于3次，且当前没有正在进行修复，尝试更新会话
        if (sessionAttempts < 3 && !isSessionRepairing) {
          setSessionAttempts(prev => prev + 1);
          setIsSessionRepairing(true);
          
          // 使用setTimeout避免状态更新风暴
          setTimeout(() => {
            // 尝试刷新会话数据
            updateSession()
              .then(() => {
                console.log('[ClientProvider] 会话更新请求已发送');
                setIsSessionRepairing(false);
              })
              .catch(error => {
                console.error('[ClientProvider] 会话更新失败:', error);
                setIsSessionRepairing(false);
              });
          }, 1500);
        } else if (sessionAttempts >= 3) {
          console.error('[ClientProvider] 无法恢复会话，尝试使用更强修复方法');
          
          // 严重问题时，使用辅助函数处理会话问题
          if (requireAuth) {
            repairSessionOrSignOut('/login');
          }
        }
      } else {
        // 会话有效则重置尝试计数
        if (sessionAttempts > 0) {
          setSessionAttempts(0);
          console.log('[ClientProvider] 会话已恢复正常');
        }
      }
    }
  }, [session, status, sessionAttempts, updateSession, requireAuth, router, isSessionRepairing]);

  // 处理认证重定向
  useEffect(() => {
    // 只有在已挂载且会话状态已确定且没有正在进行修复的情况下进行处理
    if (!mounted || status === 'loading' || isSessionRepairing) {
      console.log('[ClientProvider] 等待挂载或会话加载:', { mounted, status, isSessionRepairing });
      return;
    }

    console.log('[ClientProvider] 会话状态:', {
      status,
      requireAuth,
      session: session ? {
        id: session.user?.id,
        email: session.user?.email,
        role: session.user?.role
      } : null
    });

    // 需要认证但未认证时重定向到登录页
    if (requireAuth && status === 'unauthenticated') {
      console.log('[ClientProvider] 未认证，重定向到登录页');
      window.location.href = '/login';
      return;
    }

    // 只有在已认证的情况下才检查角色
    if (status === 'authenticated') {
      // 安全地访问会话用户角色，添加可选链和默认值
      const userRole = session?.user?.role || '';
      const userId = session?.user?.id;
      
      // 输出调试信息，帮助排查会话问题
      console.log('[ClientProvider] 认证会话信息:', {
        userId,
        userRole,
        sessionAttempts,
        isSessionRepairing
      });
      
      // 如果用户ID无效且需要认证，则可能是会话损坏
      if (requireAuth && !userId && sessionAttempts >= 3) {
        console.error('[ClientProvider] 用户已认证但ID缺失，会话可能损坏');
        window.location.href = '/login';
        return;
      }
      
      // 需要超级管理员权限但用户不是超级管理员
      if (requireSuperAdmin && userRole !== 'SUPER_ADMIN') {
        console.log('[ClientProvider] 需要超级管理员权限，重定向到未授权页面');
        window.location.href = '/unauthorized';
        return;
      }
      
      // 需要管理员权限但用户既不是管理员也不是超级管理员
      if (requireAdmin && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        console.log('[ClientProvider] 需要管理员权限，重定向到未授权页面');
        window.location.href = '/unauthorized';
        return;
      }
    }
  }, [status, requireAuth, requireAdmin, requireSuperAdmin, router, mounted, session, sessionAttempts, isSessionRepairing]);

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
    // 不直接返回null，而是显示一个友好的消息
    // 重定向会在useEffect中处理
    return (
      <div className="w-full max-w-md mx-auto p-6 text-center">
        <h2 className="text-lg font-semibold mb-2">需要登录</h2>
        <p className="text-muted-foreground mb-4">您需要登录才能访问此页面</p>
        <p className="text-sm text-muted-foreground">正在跳转到登录页面...</p>
      </div>
    );
  }

  // 处理需要管理员或超级管理员权限但用户权限不足的情况
  if (status === 'authenticated') {
    // 安全地访问会话用户角色，添加可选链和默认值
    const userRole = session?.user?.role || '';
    
    if (requireSuperAdmin && userRole !== 'SUPER_ADMIN') {
      return (
        <div className="w-full max-w-md mx-auto p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">权限不足</h2>
          <p className="text-muted-foreground mb-4">您需要超级管理员权限才能访问此页面</p>
          <p className="text-sm text-muted-foreground">正在跳转到未授权页面...</p>
        </div>
      );
    }
    
    if (requireAdmin && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return (
        <div className="w-full max-w-md mx-auto p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">权限不足</h2>
          <p className="text-muted-foreground mb-4">您需要管理员权限才能访问此页面</p>
          <p className="text-sm text-muted-foreground">正在跳转到未授权页面...</p>
        </div>
      );
    }
  }

  // 一切正常，显示子组件
  return <>{children}</>;
} 