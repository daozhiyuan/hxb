'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AdminCustomerDetailDialog } from './admin-customer-detail-dialog'; // Import the detail dialog
import { useSession } from 'next-auth/react';
import { isSuperAdmin } from '@/lib/auth-helpers';

import { ChevronLeft, ChevronRight, Search, CheckCircle, XCircle, CircleDot, Eye } from 'lucide-react'; // Import Eye icon

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

interface AdminCustomer { id: number; name: string; companyName: string | null; lastYearRevenue: number | null; phone: string | null; address: string | null; status: string; notes: string | null; registrationDate: string; updatedAt: string; registeredBy: { id: number; name: string | null; email: string; }; jobTitle: string | null; decryptedIdCardNumber?: string; }
interface PaginationInfo { page: number; pageSize: number; totalCount: number; totalPages: number; }

const DEFAULT_PAGE_SIZE = 10;
const DEBOUNCE_DELAY = 500;

type CustomerStatus = 'submitted' | 'processing' | 'approved' | 'rejected';

export function AdminCustomerList() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomerIdForDetail, setSelectedCustomerIdForDetail] = useState<number | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { toast } = useToast();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session } = useSession();
  
  // 判断当前用户是否为超级管理员
  const userIsSuperAdmin = useMemo(() => isSuperAdmin(session), [session]);

  const fetchAdminCustomers = useCallback(async (page: number, search: string) => {
    if (isUpdatingStatus !== null) return;
    setIsLoading(true);
    setError(null);
    try {
      const encodedSearchQuery = encodeURIComponent(search);
      const response = await fetch(`/api/admin/customers?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}&searchQuery=${encodedSearchQuery}`); 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取客户列表失败 (Admin)');
      }
      const result = await response.json();
      setCustomers(result.data);
      setPagination(result.pagination);
      setCurrentPage(result.pagination.page);
    } catch (err: any) {
      console.error("获取客户列表失败 (Admin):", err);
      setError(err.message || '无法加载客户数据 (Admin)');
      toast({
        title: "加载错误",
        description: err.message || '无法加载客户数据，请稍后重试。 (Admin)',
        variant: "destructive",
      });
      setCustomers([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, isUpdatingStatus]); 

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1); 
      fetchAdminCustomers(1, searchQuery);
    }, DEBOUNCE_DELAY);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery, fetchAdminCustomers]);

   useEffect(() => {
    fetchAdminCustomers(currentPage, searchQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]); 

  const handleStatusUpdate = async (customerId: number, currentStatus: string, newStatus: CustomerStatus) => {
      setIsUpdatingStatus(customerId); 
      const originalCustomers = [...customers]; 
      
      // 乐观更新UI
      setCustomers(prev => 
          prev.map(c => c.id === customerId ? { ...c, status: newStatus } : c)
      );
      
      try {
          const response = await fetch(`/api/admin/customers/${customerId}/status`, {
              method: 'PATCH',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: newStatus }),
          });

          if (!response.ok) {
            throw new Error('更新状态失败');
          }

          toast({
              title: "状态更新成功",
            description: `客户状态已更新为 ${newStatus}`,
          });
    } catch (error) {
        console.error('更新状态失败:', error);
        // 恢复原始状态
        setCustomers(originalCustomers);
          toast({
              title: "更新失败",
            description: "无法更新客户状态，请稍后重试",
              variant: "destructive",
          });
      } finally {
          setIsUpdatingStatus(null); 
      }
  };

  const handlePreviousPage = () => {
      if (pagination && pagination.page > 1) {
          setCurrentPage(pagination.page - 1);
      }
  };

  const handleNextPage = () => {
      if (pagination && pagination.page < pagination.totalPages) {
          setCurrentPage(pagination.page + 1);
      }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleViewDetails = (customerId: number) => {
      setSelectedCustomerIdForDetail(customerId);
      setIsDetailDialogOpen(true);
  };

  const renderSkeleton = () => (
    [...Array(DEFAULT_PAGE_SIZE)].map((_, index) => ( 
      <TableRow key={`skeleton-admin-${index}`}>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell> 
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
      </TableRow>
    ))
  );

  const getBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
          case 'approved': return 'default';
          case 'rejected': return 'destructive';
          case 'processing': return 'outline';
          case 'submitted': return 'secondary';
          default: return 'secondary';
      }
  };

  const updateCustomerStatus = async (customerId: number, status: CustomerStatus) => {
    const response = await fetch(`/api/customers/${customerId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('更新状态失败');
      }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">所有客户列表 (管理员视图)</h3>
      
      <div className="flex items-center mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search" 
                placeholder="搜索客户姓名、伙伴名称或邮箱..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8"
                disabled={isLoading || isUpdatingStatus !== null} 
            />
          </div>
      </div>

      {error && <p className="text-red-600 mb-4">加载失败: {error}</p>}
      <div className="border rounded-md">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>单位名称</TableHead>
                {userIsSuperAdmin && (
                  <TableHead>证件号码</TableHead>
                )}
                <TableHead>去年营收</TableHead>
                <TableHead>职务</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>地址</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>报备人</TableHead>
                <TableHead>报备日期</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && !isUpdatingStatus ? (
                renderSkeleton()
              ) : customers.length > 0 ? (
                customers.map((customer) => (
                  <TableRow key={customer.id} className={isUpdatingStatus === customer.id ? 'opacity-50' : ''}> 
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.companyName || '-'}</TableCell>
                    {userIsSuperAdmin && (
                      <TableCell>
                        {customer.decryptedIdCardNumber ? (
                          <div className="font-mono bg-yellow-50 px-2 py-1 border border-yellow-200 rounded">
                            {customer.decryptedIdCardNumber}
                          </div>
                        ) : (
                          <span className="text-gray-500">未设置</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>{customer.lastYearRevenue || '-'}</TableCell>
                    <TableCell>{customer.jobTitle || '-'}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{customer.address || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(customer.status)}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.registeredBy.name || customer.registeredBy.email}</TableCell>
                    <TableCell>{format(new Date(customer.registrationDate), 'yyyy-MM-dd HH:mm')}</TableCell>
                    <TableCell className="space-x-1"> 
                        {/* View Details Button */} 
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                            onClick={() => handleViewDetails(customer.id)}
                            disabled={isUpdatingStatus !== null}
                        >
                           <Eye className="h-3 w-3 mr-1"/> 详情
                        </Button>
                        
                        {/* Status Update Buttons */}
                        {(customer.status === 'submitted' || customer.status === 'processing') && (
                            <div className="inline-flex space-x-1">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 px-2 text-xs text-green-600 hover:bg-green-50 border-green-300"
                                    onClick={() => handleStatusUpdate(customer.id, customer.status, 'approved')}
                                    disabled={isUpdatingStatus !== null}
                                >
                                    <CheckCircle className="h-3 w-3 mr-1"/> 通过
                                    </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 border-red-300"
                                    onClick={() => handleStatusUpdate(customer.id, customer.status, 'rejected')}
                                    disabled={isUpdatingStatus !== null}
                                >
                                        <XCircle className="h-3 w-3 mr-1"/> 拒绝
                                    </Button>
                            </div>
                        )}
                        
                         {(customer.status === 'approved' || customer.status === 'rejected') && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 px-2 text-xs text-gray-600 hover:bg-gray-100 border-gray-300" 
                                        disabled={isUpdatingStatus !== null}
                                    >
                                         <CircleDot className="h-3 w-3 mr-1"/> 标记处理中
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>标记处理中</AlertDialogTitle>
                                    </AlertDialogHeader>
                                    <AlertDialogDescription>
                                        您确定要将客户 "{customer.name}" 的状态改回 "processing" 吗？
                                    </AlertDialogDescription>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleStatusUpdate(customer.id, customer.status, 'processing')}>
                                            确认
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                         )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    {isLoading ? '加载中...' : (searchQuery ? `没有找到与 "${searchQuery}" 相关的客户。` : '系统中还没有任何客户报备记录。')}
                  </TableCell> 
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
      {/* Pagination Controls */} 
      {pagination && pagination.totalPages > 0 && (
          <div className="flex items-center justify-between space-x-2 py-4">
               <span className="text-sm text-muted-foreground">
                    共 {pagination.totalCount} 条记录
               </span>
              {pagination.totalPages > 1 && ( 
                 <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                         第 {pagination.page} 页 / 共 {pagination.totalPages} 页
                    </span>
                    <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={pagination.page <= 1 || isLoading || isUpdatingStatus !== null}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> 上一页
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={pagination.page >= pagination.totalPages || isLoading || isUpdatingStatus !== null}>
                        下一页 <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                 </div>
                )}
          </div>
      )}
       {pagination && pagination.totalCount > 0 && (
           <p className="text-sm text-muted-foreground text-center mt-2">系统中的所有客户报备记录</p>
       )}
       
       {/* Render the Detail Dialog */} 
       <AdminCustomerDetailDialog 
          customerId={selectedCustomerIdForDetail}
          isOpen={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
       />
    </div>
  );
}
