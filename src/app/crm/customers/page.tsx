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

interface Customer {
  id: number;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  registrationDate: string;
  updatedAt: string;
  registeredBy?: {
    id: number;
    name: string | null;
    email: string;
  };
  jobTitle: string | null;
}

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
      
      const data = await response.json();
      setCustomers(data.data);
      setTotal(data.pagination.total);
    } catch (err) {
      setError('获取客户数据失败');
      console.error(err);
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

  const getStatusBadgeVariant = (status: string) => {
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

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">客户管理</h1>
          <div className="flex gap-2 self-end sm:self-auto">
            {session?.user?.role === 'ADMIN' && (
              <Button size="sm" variant="outline" onClick={handleExport} title="导出客户列表">
                <Download className="h-4 w-4 mr-1" /> 导出
              </Button>
            )}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default">
                  <Plus className="h-4 w-4 mr-1" /> 新增客户
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>新增客户</DialogTitle>
                  <DialogDescription>
                    填写客户信息，创建新客户记录
                  </DialogDescription>
                </DialogHeader>
                {/* 新增客户表单 */}
                <AddCustomerForm onSuccess={() => { setShowAddDialog(false); fetchCustomers(); }} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-lg font-medium">客户列表</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchCustomers}
              title="刷新"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
              {/* 搜索框 */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索客户名称、公司名称、电话或邮箱..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-8 w-full"
                />
              </div>
              
              {/* 状态筛选 */}
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <Select
                  value={filterStatus}
                  onValueChange={(value) => { setFilterStatus(value); setPage(1); }}
                >
                  <SelectTrigger className="h-10 w-full md:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* 排序选项 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      {sortOrder === 'asc' ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {sortOptions.map((option) => (
                      <DropdownMenuItem 
                        key={option.value}
                        onClick={() => handleSortByChange(option.value)}
                        className="flex justify-between"
                      >
                        {option.label}
                        {sortBy === option.value && (
                          sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 p-4 rounded-md mb-4 text-red-800 text-center">
                {error}
                <Button 
                  variant="link" 
                  className="ml-2 text-red-800 underline" 
                  onClick={fetchCustomers}
                >
                  重试
                </Button>
              </div>
            )}
            
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <div className="text-lg font-medium mb-1">暂无客户数据</div>
                <p className="text-sm mb-4">添加第一位客户或调整搜索条件</p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> 添加客户
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">客户名称</TableHead>
                      <TableHead className="hidden md:table-cell">公司名称</TableHead>
                      <TableHead className="hidden lg:table-cell">联系方式</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="hidden md:table-cell">报备人</TableHead>
                      <TableHead className="hidden sm:table-cell">报备时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-accent/5">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{customer.name}</span>
                            {customer.jobTitle && (
                              <span className="text-xs text-muted-foreground mt-1">{customer.jobTitle}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {customer.companyName || "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col space-y-1">
                            {customer.phone && (
                              <div className="flex items-center text-xs">
                                <Phone className="h-3 w-3 mr-1 text-muted-foreground" /> 
                                <span>{customer.phone}</span>
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center text-xs">
                                <Mail className="h-3 w-3 mr-1 text-muted-foreground" /> 
                                <span>{customer.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(customer.status)}>
                            {getStatusText(customer.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {customer.registeredBy?.name || customer.registeredBy?.email || "-"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {format(new Date(customer.registrationDate), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              asChild 
                              className="h-8 w-8 p-0" 
                              title="查看详情"
                            >
                              <Link href={`/crm/customers/${customer.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            
                            {session?.user?.role === 'ADMIN' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" 
                                title="删除客户"
                                onClick={() => handleDeleteClick(customer.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {!isLoading && customers.length > 0 && renderPagination()}
          </CardContent>
        </Card>
      </div>
      
      {/* 删除确认弹窗 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除操作不可撤销，客户的所有跟进记录也将被删除。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? '删除中...' : '删除'}
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