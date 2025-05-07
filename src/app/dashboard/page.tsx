'use client';

import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { ClientProvider } from '@/components/client-provider';
import { Header } from '@/components/header';
import Link from 'next/link';
import { Role } from '@prisma/client';

export default function DashboardPage() {
  // 去掉不必要的状态和路由逻辑，使用 ClientProvider 处理
  const { data: session } = useSession();
  const [partnerListRefreshCounter, setPartnerListRefreshCounter] = useState(0);

  // 回调函数，用于伙伴创建成功时
  const handlePartnerCreated = () => {
    console.log("Partner created, triggering partner list refresh...");
    setPartnerListRefreshCounter(prev => prev + 1);
  };

  // 使用 ClientProvider 处理认证、加载状态和路由跳转
  return (
    <ClientProvider requireAuth>
      <Header />
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">
          欢迎回来，{session?.user?.name || '用户'}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>报备详情</CardTitle>
              <CardDescription>客户报备与管理</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/crm/customers">
                  <Button className="w-full">报备详情</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>申诉进度查询</CardTitle>
              <CardDescription>查看申诉处理进度</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/appeals">
                  <Button className="w-full">申诉进度查询</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {session?.user?.role === Role.ADMIN && (
            <Card>
              <CardHeader>
                <CardTitle>系统管理</CardTitle>
                <CardDescription>管理系统设置和用户</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/admin/users">
                    <Button className="w-full">用户管理</Button>
                  </Link>
                  <Link href="/admin/export">
                    <Button variant="outline" className="w-full">数据导出</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>用户信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mt-2">
                <p>
                  <span className="font-medium">邮箱:</span> {session?.user?.email}
                </p>
                <p>
                  <span className="font-medium">姓名:</span> {session?.user?.name || '未设置'}
                </p>
                <p>
                  <span className="font-medium">用户角色:</span> {session?.user?.role || '未知'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientProvider>
  );
}
