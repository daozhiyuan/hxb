
'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // To display status
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns'; // For date formatting
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

// Define the expected shape of customer data from the API
interface Customer {
  id: number;
  name: string;
  companyName: string | null;
  lastYearRevenue: number | null;
  phone: string | null;
  address: string | null;
  status: string; // Use the string type
  notes: string | null;
  registrationDate: string; // ISO string initially
  updatedAt: string; // ISO string initially
}

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchCustomers() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/customers');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '获取客户列表失败');
        }
        const data: Customer[] = await response.json();
        setCustomers(data);
      } catch (err: any) {
        console.error("获取客户列表失败:", err);
        setError(err.message || '无法加载客户数据');
        toast({
          title: "加载错误",
          description: err.message || '无法加载客户数据，请稍后重试。',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCustomers();
  }, [toast]); // Dependency array includes toast to satisfy linter

  const renderSkeleton = () => (
    [...Array(3)].map((_, index) => ( // Removed extra backslash
      <TableRow key={`skeleton-${index}`}>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">已报备客户列表</h3>
      {error && <p className="text-red-600">加载失败: {error}</p>}
      <Table>
        <TableCaption>您报备的客户信息</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>姓名</TableHead>
              <TableHead>单位名称</TableHead>
              <TableHead>去年营收</TableHead>
            <TableHead>联系电话</TableHead>
            <TableHead>地址</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>报备日期</TableHead>
            {/* <TableHead>备注</TableHead> */}
             {/* <TableHead>操作</TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            renderSkeleton()
          ) : customers.length > 0 ? (
            customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.companyName || '-'}</TableCell>
                  <TableCell>{customer.lastYearRevenue || '-'}</TableCell>
                <TableCell>{customer.phone || '-'}</TableCell>
                <TableCell>{customer.address || '-'}</TableCell>
                <TableCell>
                    {/* Use Badge for status, potentially colored based on value */}
                    <Badge variant={customer.status === 'approved' ? 'default' : (customer.status === 'rejected' ? 'destructive' : 'secondary')}>
                        {customer.status}
                    </Badge>
                </TableCell>
                <TableCell>{format(new Date(customer.registrationDate), 'yyyy-MM-dd HH:mm')}</TableCell>
                 {/* Optional: Display notes or add action buttons (Edit, View Details) later */}
                {/* <TableCell>{customer.notes || '-'}</TableCell> */}
                {/* <TableCell>...</TableCell> */}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center">您还没有报备任何客户。</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
