
'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Added Footer
  DialogClose, // Added Close button
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert } from 'lucide-react'; // Icons for warnings
import { format } from 'date-fns';

// Define the detailed customer shape returned by the new API
interface CustomerDetail {
    id: number;
    name: string;
    companyName: string | null;
    lastYearRevenue: number | null;
    decryptedIdCardNumber: string; // Includes decrypted value or error
    phone: string | null;
    address: string | null;
    status: string;
    notes: string | null;
    registrationDate: string;
    createdAt: string;
    updatedAt: string;
    registeredByPartnerId: number;
    registeredBy: {
        id: number;
        name: string | null;
        email: string;
    };
}

interface AdminCustomerDetailDialogProps {
  customerId: number | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AdminCustomerDetailDialog({ customerId, isOpen, onOpenChange }: AdminCustomerDetailDialogProps) {
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      const fetchCustomerDetail = async () => {
        setIsLoading(true);
        setError(null);
        setCustomerDetail(null); // Reset previous data
        try {
          const response = await fetch(`/api/admin/customers/${customerId}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '获取客户详情失败');
          }
          const data: CustomerDetail = await response.json();
          setCustomerDetail(data);
        } catch (err: any) {
          console.error("获取客户详情失败:", err);
          setError(err.message || '无法加载客户详情数据');
        } finally {
          setIsLoading(false);
        }
      };
      fetchCustomerDetail();
    }
  }, [isOpen, customerId]); // Refetch when dialog opens or customerId changes

  const getBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
          case 'approved': return 'default';
          case 'rejected': return 'destructive';
          case 'processing': return 'outline';
          case 'submitted': return 'secondary';
          default: return 'secondary';
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>客户详情 (ID: {customerId})</DialogTitle>
          <DialogDescription>
            查看客户的详细报备信息。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/5" />
               <Skeleton className="h-5 w-4/5" />
            </div>
          )}
          {error && (
            <div className="text-red-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" /> {error}
            </div>
          )}
          {!isLoading && !error && customerDetail && (
            <div className="space-y-2 text-sm">
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <span className="font-medium text-muted-foreground">姓名:</span> <span>{customerDetail.name}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <span className="font-medium text-muted-foreground">单位名称:</span> <span>{customerDetail.companyName || '-'}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <span className="font-medium text-muted-foreground">去年营收:</span> <span>{customerDetail.lastYearRevenue || '-'}</span>
                </div>
                 <div className="grid grid-cols-[100px_1fr] items-center gap-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                    <span className="font-medium text-muted-foreground flex items-center"><ShieldAlert className="h-4 w-4 mr-1 text-yellow-600"/>身份证号:</span> 
                    <span className="font-mono text-yellow-800">{customerDetail.decryptedIdCardNumber}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <span className="font-medium text-muted-foreground">联系电话:</span> <span>{customerDetail.phone || '-'}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <span className="font-medium text-muted-foreground">联系地址:</span> <span>{customerDetail.address || '-'}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <span className="font-medium text-muted-foreground">状态:</span> 
                    <Badge variant={getBadgeVariant(customerDetail.status)} className="w-fit">
                        {customerDetail.status}
                    </Badge>
                </div>
                 <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <span className="font-medium text-muted-foreground">备注:</span> <span className="whitespace-pre-wrap">{customerDetail.notes || '-'}</span>
                </div>
                 <hr className="my-2" />
                 <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <span className="font-medium text-muted-foreground">报备人:</span> <span>{customerDetail.registeredBy.name || customerDetail.registeredBy.email} (ID: {customerDetail.registeredBy.id})</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <span className="font-medium text-muted-foreground">报备日期:</span> <span>{format(new Date(customerDetail.registrationDate), 'yyyy-MM-dd HH:mm:ss')}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                    <span className="font-medium text-muted-foreground">最后更新:</span> <span>{format(new Date(customerDetail.updatedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">关闭</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
