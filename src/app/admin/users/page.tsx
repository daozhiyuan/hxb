'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminUserApproval } from '@/components/admin-user-approval';
import { AdminPartnerList } from '@/components/admin-partner-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Role } from '@prisma/client';
import { isAdmin } from '@/lib/auth-helpers';

// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 检查权限 - 使用权限辅助函数
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && !isAdmin(session)) {
      router.replace('/unauthorized');
    }
  }, [status, session, router]);

  // 显示加载状态
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>加载中...</p>
      </div>
    );
  }

  // 只有管理员可以访问
  if (status === 'authenticated' && isAdmin(session)) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>用户管理</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminUserApproval />
            <div className="my-8" />
            <AdminPartnerList />
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
} 