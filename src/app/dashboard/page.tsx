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
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

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
      <div className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>仪表盘</CardTitle>
            <CardDescription>
              欢迎回来, {session.user.name || session.user.email}! (角色: {session.user.role})
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            {/* Content based on role */}
            {session.user.role === 'ADMIN' && (
              <div>
                <Separator className="my-4" /> 
                <AdminCustomerList /> 
                 <Separator className="my-4" /> 
                 {/* Pass refresh trigger to the list */}
                 <AdminPartnerList refreshTrigger={partnerListRefreshCounter} /> 
                 <Separator className="my-4" /> 
                 {/* Pass callback to the form */}
                 <AdminCreatePartnerForm onPartnerCreated={handlePartnerCreated} /> 
                 <Separator className="my-4" /> 
                 {/* Data Export Section */}
                 <div className="mt-4 p-4 border rounded-md">
                   <h4 className="text-md font-medium mb-2">数据导出</h4>
                   <Link href="/api/admin/export/customers" target="_blank" rel="noopener noreferrer" className="mr-2">
                     <Button variant="outline" size="sm">
                       导出所有客户数据 (CSV)
                     </Button>
                   </Link>
                   <Link href="/api/admin/export/partners" target="_blank" rel="noopener noreferrer">
                     <Button variant="outline" size="sm">
                       导出合作伙伴数据 (CSV)
                     </Button>
                   </Link>
                 </div>
              </div>
            )}

            {session.user.role === 'PARTNER' && (
              <div>
                <Separator className="my-4" /> 
                <CustomerRegistrationForm /> 
                <Separator className="my-4" /> 
                <CustomerList /> 
              </div>
            )}

            <Button 
              onClick={() => signOut({ callbackUrl: '/login' })} 
              variant="outline" 
              className="mt-6"
            >
              登出
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback for any other state (shouldn't normally be reached if logic is correct)
  return null;
}
