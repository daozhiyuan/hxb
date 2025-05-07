'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ShieldAlert, UserCheck, Key, Shield, Search, WrenchIcon } from 'lucide-react';
import Link from 'next/link';
import { isSuperAdmin } from '@/lib/auth-helpers';

interface Customer {
  id: number;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  registrationDate: string;
  updatedAt: string;
  registeredByPartnerId: number;
}

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 检查权限 - 使用权限辅助函数
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && !isSuperAdmin(session)) {
      router.replace('/unauthorized');
    } else if (status === 'authenticated' && isSuperAdmin(session)) {
      // 加载客户数据
      fetchCustomers();
    }
  }, [status, session, router]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/crm/customers');
      if (!response.ok) throw new Error('获取客户数据失败');
      
      const data = await response.json();
      setCustomers(data.data || []);
    } catch (error) {
      console.error('获取客户数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 搜索过滤
  const filteredCustomers = customers.filter(customer => 
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.companyName && customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 显示加载状态
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>加载中...</p>
      </div>
    );
  }

  // 只有超级管理员可以访问
  if (status === 'authenticated' && isSuperAdmin(session)) {
    return (
      <div className="container mx-auto py-10">
        <Card className="mb-6">
          <CardHeader className="bg-yellow-50">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-yellow-600" />
              <CardTitle>超级管理员控制面板</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Alert className="mb-4">
              <Shield className="h-4 w-4" />
              <AlertTitle>高级功能区域</AlertTitle>
              <AlertDescription>
                您现在以超级管理员身份登录，拥有查看和编辑所有客户敏感信息的权限，请谨慎操作。
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="搜索客户姓名、电话或公司..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Link href="/admin/tools">
                  <Button variant="outline" className="ml-2 bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100">
                    <WrenchIcon className="h-4 w-4 mr-1" />
                    管理工具
                  </Button>
                </Link>
              </div>
              <Button onClick={fetchCustomers} variant="outline">刷新数据</Button>
            </div>

            {isLoading ? (
              <div className="text-center py-10">
                <p>加载客户数据中...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-10">
                <p>未找到符合条件的客户{searchTerm ? `"${searchTerm}"` : ""}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>客户姓名</TableHead>
                      <TableHead>公司</TableHead>
                      <TableHead>联系方式</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.companyName || "-"}</TableCell>
                        <TableCell>
                          {customer.phone || customer.email || "-"}
                        </TableCell>
                        <TableCell>
                          {customer.status === 'FOLLOWING' && '跟进中'}
                          {customer.status === 'NEGOTIATING' && '洽谈中'}
                          {customer.status === 'PENDING' && '待签约'}
                          {customer.status === 'SIGNED' && '已签约'}
                          {customer.status === 'COMPLETED' && '已完成'}
                          {customer.status === 'LOST' && '已流失'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/crm/customers/${customer.id}`}>
                              <Button size="sm" variant="outline">
                                查看详情
                              </Button>
                            </Link>
                            <Link href={`/admin/super-edit/${customer.id}`}>
                              <Button size="sm" variant="default" className="bg-yellow-600 hover:bg-yellow-700">
                                <Key className="h-4 w-4 mr-1"/>
                                敏感信息
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
} 