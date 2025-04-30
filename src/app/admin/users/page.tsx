'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminUserApproval } from '@/components/admin-user-approval';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 检查权限
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && session.user.role !== 'ADMIN') {
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
  if (status === 'authenticated' && session.user.role === 'ADMIN') {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>用户管理</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminUserApproval />
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
} 