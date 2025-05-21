import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getServerSideProps } from '@/lib/static-page-props';

// 导出getServerSideProps以确保使用SSR
export { getServerSideProps };

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // 如果已登录，重定向到仪表盘
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [router, session, status]);

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4">欢迎使用CRM系统</h1>
          <p className="text-xl text-muted-foreground">
            管理您的客户关系，提高业务效率
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-3">客户管理</h2>
            <p className="mb-4">全面的客户信息管理，轻松跟踪客户状态和互动历史。</p>
            {status === 'authenticated' ? (
              <Link href="/crm/customers" passHref>
                <Button>进入客户管理</Button>
              </Link>
            ) : (
              <Link href="/login?callbackUrl=/crm/customers" passHref>
                <Button>登录以访问</Button>
              </Link>
            )}
          </div>

          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-3">数据报表</h2>
            <p className="mb-4">直观的数据分析和报表功能，助您做出明智的业务决策。</p>
            {status === 'authenticated' ? (
              <Link href="/crm/reports" passHref>
                <Button>查看报表</Button>
              </Link>
            ) : (
              <Link href="/login?callbackUrl=/crm/reports" passHref>
                <Button>登录以访问</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="text-center space-y-4">
          {status === 'authenticated' ? (
            <Link href="/dashboard" passHref>
              <Button size="lg">进入仪表盘</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" passHref>
                <Button className="mx-2" size="lg">登录</Button>
              </Link>
              <Link href="/register" passHref>
                <Button className="mx-2" variant="outline" size="lg">注册</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 