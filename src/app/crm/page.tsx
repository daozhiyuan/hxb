'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { PartnerCRMDashboard } from '@/components/partner-crm-dashboard';
import { Button } from '@/components/ui/button';
import { ClientProvider } from '@/components/client-provider';
import { Role } from '@prisma/client';

export default function CrmPage() {
  const { data: session } = useSession();

  // 使用 ClientProvider 处理认证
  return (
    <ClientProvider requireAuth>
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">客户关系管理</h1>
        
        {/* 根据用户角色显示不同的CRM面板 */}
        {session?.user?.role === Role.PARTNER && (
          <PartnerCRMDashboard />
        )}
        
        {session?.user?.role === Role.ADMIN && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">管理员CRM控制面板</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">客户管理</h3>
                <div className="space-y-2">
                  <Link href="/crm/customers">
                    <Button className="w-full">查看所有客户</Button>
                  </Link>
                  <Link href="/admin/export">
                    <Button variant="outline" className="w-full">导出客户数据</Button>
                  </Link>
                </div>
              </div>
              
              <div className="border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">报表分析</h3>
                <div className="space-y-2">
                  <Link href="/crm/reports">
                    <Button className="w-full">查看销售报表</Button>
                  </Link>
                  <Link href="/crm/settings">
                    <Button variant="outline" className="w-full">系统设置</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 如果用户既不是管理员也不是合作伙伴，显示提示信息 */}
        {session?.user?.role !== Role.ADMIN && session?.user?.role !== Role.PARTNER && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-700">
              您当前的用户角色无法访问CRM功能。请联系管理员获取合适的权限。
            </p>
            <div className="mt-4">
              <Link href="/dashboard">
                <Button variant="outline">返回仪表板</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </ClientProvider>
  );
} 