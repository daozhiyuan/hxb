'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  Search, Eye, FileText, Phone, Mail, Plus, Trash2, Download, 
  ArrowUp, ArrowDown, Filter, RefreshCcw, SortAsc, SortDesc
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { CustomerAddDialog } from '@/components/customer-add-dialog';
import { idCardTypeMap } from '@/config/constants';

interface Customer {
  id: number;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  registrationDate: Date | string;
  updatedAt: Date | string;
  partner?: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  jobTitle: string | null;
  idCard: string;
  createdAt: Date | string;
  idCardType?: string;
  decryptedIdCardNumber?: string;
  idCardNumberEncrypted?: string;
}

interface CustomerAddDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic';

export default function CRMCustomersPage() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('registrationDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [deleteCustomerId, setDeleteCustomerId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleAddSuccess = () => {
    fetchCustomers();
    setShowAddDialog(false);
  };

  const handleViewDetails = (customer: Customer) => {
    window.location.href = `/crm/customers/${customer.id}`;
  };

  const formatDate = (date: Date | string | null | undefined) => {
    try {
      if (!date) return '-';
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.warn('无效的日期值:', date);
        return '-';
      }
      return format(dateObj, 'yyyy-MM-dd HH:mm');
    } catch (error) {
      console.error('日期格式化错误:', error, '原始日期值:', date);
      return '-';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'FOLLOWING': return 'default';
      case 'NEGOTIATING': return 'outline';
      case 'PENDING': return 'secondary';
      case 'SIGNED': return 'default';
      case 'COMPLETED': return 'default';
      case 'LOST': return 'destructive';
      default: return 'outline';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'FOLLOWING': return '跟进中';
      case 'NEGOTIATING': return '洽谈中';
      case 'PENDING': return '待处理';
      case 'SIGNED': return '已签约';
      case 'COMPLETED': return '已完成';
      case 'LOST': return '已流失';
      default: return status;
    }
  };

  const statusOptions = [
    { value: 'ALL', label: '全部状态' },
    { value: 'FOLLOWING', label: '跟进中' },
    { value: 'NEGOTIATING', label: '洽谈中' },
    { value: 'PENDING', label: '待处理' },
    { value: 'SIGNED', label: '已签约' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'LOST', label: '已流失' },
  ];

  const sortOptions = [
    { value: 'registrationDate', label: '报备时间' },
    { value: 'name', label: '客户名称' },
    { value: 'updatedAt', label: '更新时间' },
    { value: 'status', label: '状态' },
  ];

  // 分页组件
  const totalPages = Math.ceil(total / pageSize);
  const renderPagination = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
      <div className="text-sm text-muted-foreground">
        共 <span className="font-medium text-foreground">{total}</span> 条记录
      </div>
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={page === 1} 
          onClick={() => setPage(page - 1)}
        >
          上一页
        </Button>
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm">第</span>
          <Select
            value={page.toString()}
            onValueChange={(value) => setPage(Number(value))}
          >
            <SelectTrigger className="h-8 w-14">
              <SelectValue placeholder={page} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalPages }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm">/ {totalPages || 1} 页</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={page === totalPages || totalPages === 0} 
          onClick={() => setPage(page + 1)}
        >
          下一页
        </Button>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => {
            setPageSize(Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-24">
            <SelectValue placeholder={`${pageSize}条/页`} />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}条/页
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line
  }, [page, pageSize, searchQuery, filterStatus, sortBy, sortOrder]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: searchQuery,
        status: filterStatus,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
      
      const response = await fetch(`/api/crm/customers?${params.toString()}`);
      if (!response.ok) throw new Error('获取客户数据失败');
      
      const result = await response.json();
      console.log('客户API返回数据', result);
      
      if (result.success && result.data) {
        const { data, pagination } = result.data;
        if (Array.isArray(data)) {
          setCustomers(data);
          setTotal(pagination?.total || 0);
        } else {
          setCustomers([]);
          setTotal(0);
        }
      } else {
        setCustomers([]);
        setTotal(0);
      }
    } catch (err) {
      setError('获取客户数据失败');
      console.error(err);
      setCustomers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        status: filterStatus
      });
      const response = await fetch(`/api/admin/export/customers?${params.toString()}`);
      if (!response.ok) throw new Error('导出失败');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `客户列表_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('导出失败');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCustomerId) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/crm/customers/${deleteCustomerId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      fetchCustomers();
      setShowDeleteDialog(false);
    } catch (err) {
      console.error(err);
      alert('删除失败');
    } finally {
      setIsDeleting(false);
      setDeleteCustomerId(null);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteCustomerId(id);
    setShowDeleteDialog(true);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleSortByChange = (value: string) => {
    if (value === sortBy) {
      toggleSortOrder();
    } else {
      setSortBy(value);
      setSortOrder('desc'); // 默认降序
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>客户管理</CardTitle>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              添加客户
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              导出
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="搜索客户..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>客户名称</TableHead>
                        <TableHead>公司</TableHead>
                        <TableHead>联系方式</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>报备时间</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(customers) && customers.length > 0 ? (
                        customers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>{customer.name}</TableCell>
                            <TableCell>{customer.companyName || '-'}</TableCell>
                            <TableCell>
                              <div className="flex flex-col space-y-1">
                                {customer.phone && (
                                  <div className="flex items-center">
                                    <Phone className="mr-2 h-4 w-4" />
                                    {customer.phone}
                                  </div>
                                )}
                                {customer.email && (
                                  <div className="flex items-center">
                                    <Mail className="mr-2 h-4 w-4" />
                                    {customer.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(customer.status)}>
                                {getStatusText(customer.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(customer.registrationDate)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    查看详情
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteClick(customer.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    删除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            暂无数据
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {renderPagination()}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <CustomerAddDialog
        isOpen={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleAddSuccess}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这个客户吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// 新增客户表单组件
function AddCustomerForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    jobTitle: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('新增失败');
      onSuccess();
    } catch {
      setError('新增失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium">客户名称<span className="text-red-500">*</span></label>
          <Input name="name" value={form.name} onChange={handleChange} required disabled={loading} />
        </div>
        <div>
          <label className="block mb-1 font-medium">公司名称</label>
          <Input name="companyName" value={form.companyName} onChange={handleChange} disabled={loading} />
        </div>
        <div>
          <label className="block mb-1 font-medium">手机号</label>
          <Input name="phone" value={form.phone} onChange={handleChange} disabled={loading} />
        </div>
        <div>
          <label className="block mb-1 font-medium">邮箱</label>
          <Input name="email" value={form.email} onChange={handleChange} type="email" disabled={loading} />
        </div>
        <div>
          <label className="block mb-1 font-medium">职位</label>
          <Input name="jobTitle" value={form.jobTitle} onChange={handleChange} disabled={loading} />
        </div>
        <div className="col-span-2">
          <label className="block mb-1 font-medium">备注</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full border rounded px-2 py-1" rows={2} disabled={loading} />
        </div>
      </div>
      {error && <div className="text-red-500 text-center">{error}</div>}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? '提交中...' : '提交'}
        </Button>
      </div>
    </form>
  );
}