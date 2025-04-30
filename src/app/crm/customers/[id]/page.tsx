'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  Phone, Mail, Building, User, Calendar, FileText, 
  ArrowLeft, Edit, Trash2, Clock, Briefcase, MapPin,
  Share2, DollarSign
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FollowUpForm } from '@/components/follow-up-form';
import { FollowUpList } from '@/components/follow-up-list';
import { useSession } from 'next-auth/react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerTags } from '@/components/crm/customer-tags';

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
  jobTitle: string | null;
  address: string | null;
  lastYearRevenue: number | null;
  registeredBy: {
    id: number;
    name: string | null;
    email: string;
  };
  followUps?: Array<{
    id: number;
    content: string;
    createdAt: string;
    createdBy: {
      id: number;
      name: string | null;
      email: string;
    };
  }>;
  tags?: Array<{
    id: number;
    name: string;
    color: string;
  }>;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [params.id]);

  const fetchCustomer = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/crm/customers/${params.id}`);
      if (!response.ok) {
        throw new Error('获取客户详情失败');
      }
      const data = await response.json();
      setCustomer(data);
    } catch (error) {
      console.error('获取客户详情失败:', error);
      setError('获取客户详情失败，请刷新页面重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/crm/customers/${customer.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('删除客户失败');
      }
      
      router.push('/crm/customers');
    } catch (error) {
      console.error('删除客户失败:', error);
      alert('删除客户失败，请重试');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'FOLLOWING':
        return 'default';
      case 'NEGOTIATING':
        return 'outline';
      case 'PENDING':
        return 'secondary';
      case 'SIGNED':
        return 'default';
      case 'COMPLETED':
        return 'default';
      case 'LOST':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'FOLLOWING':
        return '跟进中';
      case 'NEGOTIATING':
        return '洽谈中';
      case 'PENDING':
        return '待签约';
      case 'SIGNED':
        return '已签约';
      case 'COMPLETED':
        return '已完成';
      case 'LOST':
        return '已流失';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/crm/customers">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回列表
            </Link>
          </Button>
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    ))}
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/crm/customers">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回列表
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-red-500 mb-4 text-lg">
              {error}
            </div>
            <Button onClick={fetchCustomer}>
              重试
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/crm/customers">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回列表
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-lg font-medium mb-4">
              未找到客户信息
            </div>
            <Button asChild>
              <Link href="/crm/customers">
                返回客户列表
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = session?.user?.role === 'ADMIN';
  const isCreator = session?.user?.id === String(customer.registeredBy.id);
  const canEdit = isAdmin || isCreator;
  const canDelete = isAdmin;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/crm/customers">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回列表
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <Badge variant={getStatusBadgeVariant(customer.status)} className="ml-3">
            {getStatusText(customer.status)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {canEdit && (
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Edit className="h-4 w-4 mr-1" />
                  编辑客户
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>编辑客户信息</DialogTitle>
                  <DialogDescription>
                    修改客户信息，点击保存更新数据
                  </DialogDescription>
                </DialogHeader>
                <EditCustomerForm 
                  customer={customer} 
                  onSuccess={() => {
                    setShowEditDialog(false);
                    fetchCustomer();
                  }} 
                />
              </DialogContent>
            </Dialog>
          )}

          {canDelete && (
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除客户
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除客户</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将删除该客户及其所有跟进记录，且无法恢复。确定要继续吗？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-red-500 hover:bg-red-600" 
                    onClick={handleDelete} 
                    disabled={isDeleting}
                  >
                    {isDeleting ? '删除中...' : '确认删除'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm hover:shadow transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">客户信息</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="grid gap-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium text-muted-foreground">姓名:</span>
                      <span>{customer.name}</span>
                    </div>
                    
                    {customer.jobTitle && (
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <span className="font-medium text-muted-foreground">职位:</span>
                        <span>{customer.jobTitle}</span>
                      </div>
                    )}
                    
                    {customer.companyName && (
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-primary" />
                        <span className="font-medium text-muted-foreground">公司:</span>
                        <span>{customer.companyName}</span>
                      </div>
                    )}
                    
                    {customer.lastYearRevenue && (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="font-medium text-muted-foreground">去年营收:</span>
                        <span>{customer.lastYearRevenue.toLocaleString('zh-CN')} 元</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {customer.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="font-medium text-muted-foreground">电话:</span>
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    
                    {customer.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <span className="font-medium text-muted-foreground">邮箱:</span>
                        <span>{customer.email}</span>
                      </div>
                    )}
                    
                    {customer.address && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-primary mt-1" />
                        <span className="font-medium text-muted-foreground mt-0.5">地址:</span>
                        <span className="flex-1">{customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Separator className="my-4" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Share2 className="h-4 w-4" />
                      <span>报备人: </span>
                      <span className="font-medium">{customer.registeredBy.name || customer.registeredBy.email}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>报备时间: </span>
                      <span>{format(new Date(customer.registrationDate), 'yyyy-MM-dd HH:mm')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>更新时间: </span>
                      <span>{format(new Date(customer.updatedAt), 'yyyy-MM-dd HH:mm')}</span>
                    </div>
                  </div>
                </div>

                {customer.notes && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium text-muted-foreground">备注:</span>
                    </div>
                    <p className="text-sm rounded-md bg-accent/30 p-3 whitespace-pre-wrap">{customer.notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">客户标签</h3>
                  <CustomerTags 
                    customerId={customer.id} 
                    tags={customer.tags || []} 
                    onTagsChange={(tags) => setCustomer({ ...customer, tags })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="follow-ups" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="follow-ups">跟进记录</TabsTrigger>
              <TabsTrigger value="documents">相关文档</TabsTrigger>
            </TabsList>
            <TabsContent value="follow-ups" className="space-y-4">
              <FollowUpForm customerId={customer.id} onSuccess={fetchCustomer} />
              <FollowUpList customerId={customer.id} />
            </TabsContent>
            <TabsContent value="documents">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mb-4" />
                  <div className="text-center text-muted-foreground">
                    <div className="text-lg font-medium mb-1">暂无相关文档</div>
                    <p className="text-sm">您可以上传客户相关的合同、方案等文档资料</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">状态记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <div className="text-lg font-medium mb-1">暂无状态变更记录</div>
                <p className="text-sm">客户状态变更将会记录在此</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild variant="outline">
                <Link href={`/crm/customers/${customer.id}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  记录电话跟进
                </Link>
              </Button>
              <Button className="w-full" asChild variant="outline">
                <Link href={`/crm/customers/${customer.id}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  发送邮件
                </Link>
              </Button>
              <Button className="w-full" asChild variant="outline">
                <Link href={`/crm/customers/${customer.id}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  预约会议
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// 编辑客户表单组件
function EditCustomerForm({ customer, onSuccess }: { customer: Customer, onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: customer.name,
    companyName: customer.companyName || '',
    phone: customer.phone || '',
    email: customer.email || '',
    status: customer.status,
    notes: customer.notes || '',
    jobTitle: customer.jobTitle || '',
    address: customer.address || '',
    lastYearRevenue: customer.lastYearRevenue || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!form.name) {
      setError('客户名称不能为空');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/crm/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error('更新客户信息失败');
      }

      onSuccess();
    } catch (err) {
      console.error('更新失败:', err);
      setError('更新客户信息失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 'FOLLOWING', label: '跟进中' },
    { value: 'NEGOTIATING', label: '洽谈中' },
    { value: 'PENDING', label: '待处理' },
    { value: 'SIGNED', label: '已签约' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'LOST', label: '已流失' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            客户名称 <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="jobTitle" className="text-sm font-medium">
              职位
            </label>
            <Input
              id="jobTitle"
              name="jobTitle"
              value={form.jobTitle}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="companyName" className="text-sm font-medium">
              公司名称
            </label>
            <Input
              id="companyName"
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              电话
            </label>
            <Input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              邮箱
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              状态
            </label>
            <Select 
              value={form.status} 
              onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择客户状态" />
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

          <div className="space-y-2">
            <label htmlFor="lastYearRevenue" className="text-sm font-medium">
              去年营收 (元)
            </label>
            <Input
              id="lastYearRevenue"
              name="lastYearRevenue"
              type="number"
              value={form.lastYearRevenue}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="address" className="text-sm font-medium">
            地址
          </label>
          <Input
            id="address"
            name="address"
            value={form.address}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium">
            备注
          </label>
          <Textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
          />
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '保存更改'}
        </Button>
      </DialogFooter>
    </form>
  );
} 