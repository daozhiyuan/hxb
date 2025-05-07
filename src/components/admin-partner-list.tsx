'use client';

import { useEffect, useState, useCallback } from 'react'; // Added useCallback
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

interface Partner {
  id: number;
  name: string | null;
  email: string;
  isActive: boolean;
  createdAt: string; // ISO string initially
}

// Add props to accept a trigger for refreshing
interface AdminPartnerListProps {
   refreshTrigger?: number; // A number that changes to trigger refresh
}

export function AdminPartnerList({ refreshTrigger = 0 }: AdminPartnerListProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Wrap fetchPartners in useCallback
  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log("Fetching partners..."); // Add log for debugging refresh
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptFetch = async (): Promise<Partner[]> => {
      try {
        const response = await fetch('/api/admin/partners', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `获取合作伙伴列表失败 (HTTP ${response.status})`);
        }
        
        const data: Partner[] = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('服务器返回的数据格式不正确');
        }
        
        return data;
      } catch (err: any) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`重试获取合作伙伴列表 (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // 递增延迟
          return attemptFetch();
        }
        throw err;
      }
    };
    
    try {
      const data = await attemptFetch();
      setPartners(data);
    } catch (err: any) {
      console.error("获取合作伙伴列表失败 (Admin):", err);
      setError(err.message || '无法加载合作伙伴数据');
      toast({
        title: "加载错误",
        description: err.message || '无法加载合作伙伴数据，请稍后重试。',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // Keep dependencies minimal for useCallback, toast is likely stable

  // Fetch partners on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchPartners();
  }, [fetchPartners, refreshTrigger]); // Add refreshTrigger to dependency array

  // Function to handle status change
  const handleStatusChange = async (partnerId: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // 先乐观更新UI
    setPartners(prevPartners =>
      prevPartners.map(p => p.id === partnerId ? { ...p, isActive: newStatus } : p)
    );
  
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '更新状态失败');
      }
      
      // 成功提示
      toast({
        title: "更新成功",
        description: `合作伙伴状态已${newStatus ? '启用' : '禁用'}。`,
      });
    } catch (err: any) {
      console.error("更新合作伙伴状态失败:", err);
      toast({
        title: "更新失败",
        description: err.message || '无法更新合作伙伴状态，请稍后重试。',
        variant: "destructive",
      });
      // 发生错误时恢复原状态
      setPartners(prevPartners =>
        prevPartners.map(p => p.id === partnerId ? { ...p, isActive: currentStatus } : p)
      );
    }
  };

  const renderSkeleton = () => (
    [...Array(3)].map((_, index) => (
      <TableRow key={`skeleton-partner-${index}`}>
        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">合作伙伴账号管理</h3>
      {error && <p className="text-red-600">加载失败: {error}</p>}
      <Table>
        <TableCaption>管理合作伙伴账号状态</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>邮箱</TableHead>
            <TableHead>注册日期</TableHead>
            <TableHead>状态 (启用/禁用)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            renderSkeleton()
          ) : partners.length > 0 ? (
            partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name || 'N/A'}</TableCell>
                <TableCell>{partner.email}</TableCell>
                <TableCell>{format(new Date(partner.createdAt), 'yyyy-MM-dd')}</TableCell>
                <TableCell>
                  <Switch
                    checked={partner.isActive}
                    onCheckedChange={() => handleStatusChange(partner.id, partner.isActive)}
                    aria-label={partner.isActive ? '禁用该伙伴' : '启用该伙伴'}
                  />
                   <span className="ml-2 text-sm text-muted-foreground">
                    {partner.isActive ? '已启用' : '已禁用'}
                   </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center">系统中还没有任何合作伙伴账号。</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
