'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CRMDashboard() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>CRM 管理</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/crm/customers">
            <Button className="w-full">客户管理</Button>
          </Link>
          <Link href="/crm/contacts">
            <Button className="w-full">联系人管理</Button>
          </Link>
          <Link href="/crm/opportunities">
            <Button className="w-full">商机管理</Button>
          </Link>
          <Link href="/crm/activities">
            <Button className="w-full">活动管理</Button>
          </Link>
          <Link href="/crm/reports">
            <Button className="w-full">报表分析</Button>
          </Link>
          <Link href="/crm/settings">
            <Button className="w-full">CRM 设置</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
} 