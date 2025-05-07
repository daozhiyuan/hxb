import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getServerSideProps } from '@/lib/static-page-props';

// 导出getServerSideProps以确保使用SSR
export { getServerSideProps };

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // 如果未登录，重定向到登录页
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard');
    }
  }, [router, status]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-10">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">加载中...</h1>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-10">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">请先登录</h1>
          <Link href="/login?callbackUrl=/dashboard" passHref>
            <Button>登录</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">仪表盘</h1>
          <div>
            <span className="mr-4">欢迎, {session.user.name || session.user.email}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">客户管理</h2>
            <p className="mb-4">查看和管理您的所有客户信息。</p>
            <Link href="/crm/customers" passHref>
              <Button variant="outline">进入客户管理</Button>
            </Link>
          </div>

          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">数据报表</h2>
            <p className="mb-4">查看客户行为和销售数据分析报表。</p>
            <Link href="/crm/reports" passHref>
              <Button variant="outline">查看报表</Button>
            </Link>
          </div>

          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">系统设置</h2>
            <p className="mb-4">管理系统设置和用户权限。</p>
            <Link href="/crm/settings" passHref>
              <Button variant="outline">系统设置</Button>
            </Link>
          </div>
        </div>

        {session.user.role === 'ADMIN' && (
          <div className="bg-muted p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-3">管理员功能</h2>
            <div className="flex gap-4">
              <Link href="/admin/users" passHref>
                <Button>用户管理</Button>
              </Link>
              <Link href="/admin/export" passHref>
                <Button>数据导出</Button>
              </Link>
            </div>
          </div>
        )}

        {session.user.role === 'PARTNER' && (
          <div className="bg-muted p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-3">合作伙伴功能</h2>
            <div className="flex gap-4">
              <Link href="/appeals" passHref>
                <Button>查看申诉</Button>
              </Link>
              <Link href="/appeals/submit" passHref>
                <Button>提交申诉</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 