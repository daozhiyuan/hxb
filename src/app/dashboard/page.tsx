'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClientProvider } from '@/components/client-provider';
import { useSession } from 'next-auth/react';
import { BarChart3, FileText, Settings, Users, User } from 'lucide-react';
import { Role } from '@prisma/client';

// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { data: session } = useSession();

  // 使用 ClientProvider 处理认证、加载状态和路由跳转
  return (
    <ClientProvider requireAuth>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          欢迎回来，{session?.user?.name || '用户'}
        </h1>
        
        <p className="text-muted-foreground">
          通过以下功能模块快速管理您的客户和申诉。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                客户管理
              </CardTitle>
              <CardDescription>管理您的客户信息和跟进记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/crm/customers">
                  <Button className="w-full">查看客户列表</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                申诉管理
              </CardTitle>
              <CardDescription>处理和跟踪客户申诉</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/appeals">
                  <Button className="w-full">查看申诉列表</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {session?.user?.role !== Role.USER && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                  数据报表
                </CardTitle>
                <CardDescription>查看业务统计和分析数据</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/crm/reports">
                    <Button className="w-full">查看报表</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {(session?.user?.role === Role.ADMIN || session?.user?.role === Role.SUPER_ADMIN) && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <User className="mr-2 h-5 w-5 text-primary" />
                  用户管理
                </CardTitle>
                <CardDescription>管理系统用户和权限</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/admin/users">
                    <Button className="w-full">管理用户</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {session?.user?.role === Role.SUPER_ADMIN && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Settings className="mr-2 h-5 w-5 text-primary" />
                  系统设置
                </CardTitle>
                <CardDescription>配置系统参数和全局设置</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/admin/settings">
                    <Button className="w-full">系统设置</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ClientProvider>
  );
}
