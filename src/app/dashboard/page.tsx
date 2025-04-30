'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useEffect, useState } from 'react'; // Import useState
import { CustomerRegistrationForm } from '@/components/customer-registration-form';
import { CustomerList } from '@/components/customer-list';
import { AdminCustomerList } from '@/components/admin-customer-list'; 
import { AdminPartnerList } from '@/components/admin-partner-list'; 
import { AdminCreatePartnerForm } from '@/components/admin-create-partner-form'; // Import the create form
import { CRMDashboard } from '@/components/crm-dashboard';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

// 删除这个函数的声明，保留注释作为提示
// 删除这个函数
// export default function Dashboard() {
//   return (
//     <div>
//       <h1>Dashboard</h1>
//       <p>Welcome to your dashboard</p>
//     </div>
//   );
// }

// 保留这个函数
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State to trigger partner list refresh
  const [partnerListRefreshCounter, setPartnerListRefreshCounter] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  // Callback function for successful partner creation
  const handlePartnerCreated = () => {
      console.log("Partner created, triggering partner list refresh...");
      setPartnerListRefreshCounter(prev => prev + 1); // Increment counter to trigger refresh
  };

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>加载中...</p>
        </div>
    );
  }

  // Only render content if authenticated
  if (status === 'authenticated' && session?.user) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">
          欢迎回来，{session?.user?.name || '用户'}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>客户管理</CardTitle>
              <CardDescription>管理您的客户信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/customers">
                  <Button className="w-full">查看客户列表</Button>
                </Link>
                <Link href="/customer/report">
                  <Button variant="outline" className="w-full">新增客户</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>申诉管理</CardTitle>
              <CardDescription>处理客户申诉</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/appeals">
                  <Button className="w-full">查看申诉列表</Button>
                </Link>
                <Link href="/appeals/new">
                  <Button variant="outline" className="w-full">提交新申诉</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {session?.user?.role === 'ADMIN' && (
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
                  <Link href="/admin/settings">
                    <Button variant="outline" className="w-full">系统设置</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Fallback for any other state (shouldn't normally be reached if logic is correct)
  return null;
}
