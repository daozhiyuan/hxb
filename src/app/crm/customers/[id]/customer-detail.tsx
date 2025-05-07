'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Phone, Mail, Building, User, Calendar, FileText, 
  ArrowLeft, Edit, Trash2, Clock, Briefcase, MapPin,
  Share2, DollarSign, ShieldAlert
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
import { Role } from '@prisma/client';
import { ClientProvider } from '@/components/client-provider';

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

interface EditCustomerFormProps {
  customer: Customer;
  onSuccess: () => void;
}

export default function CustomerDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [decryptedIdCardNumber, setDecryptedIdCardNumber] = useState<string>('');
  const isSuperAdmin = String(session?.user?.role) === 'SUPER_ADMIN';

  useEffect(() => {
    if (params?.id) {
      fetchCustomer();
    }
  }, [params?.id, isSuperAdmin]);

  const fetchCustomer = async () => {
    if (!params?.id) return;
    
    setIsLoading(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const response = await fetch(`/api/admin/customers/${params.id}`);
        if (!response.ok) {
          throw new Error('获取客户详情失败');
        }
        const data = await response.json();
        setCustomer(data);
        if (data.decryptedIdCardNumber) {
          setDecryptedIdCardNumber(data.decryptedIdCardNumber);
        }
        setIsLoading(false);
        return;
      }
      
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

  // 使用 ClientProvider 包装组件内容
  return (
    <ClientProvider requireAuth>
      {isLoading ? (
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
      ) : error ? (
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
      ) : !customer ? (
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
              <div className="text-gray-500 mb-4">
                未找到客户信息
              </div>
              <Button asChild>
                <Link href="/crm/customers">返回客户列表</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
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
              <Badge
                variant={getStatusBadgeVariant(customer.status) as any}
                className="ml-4"
              >
                {getStatusText(customer.status)}
              </Badge>
            </div>
            <div className="flex gap-2">
              {/* 编辑客户按钮 */}
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-4 w-4" />
                    编辑
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>编辑客户</DialogTitle>
                    <DialogDescription>
                      更新客户的基本信息和状态
                    </DialogDescription>
                  </DialogHeader>
                  {customer && (
                    <EditCustomerForm
                      customer={customer}
                      onSuccess={() => {
                        setShowEditDialog(false);
                        fetchCustomer();
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>

              {/* 删除客户按钮 */}
              <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      您确定要删除 <span className="font-bold">{customer.name}</span>{" "}
                      这个客户吗？此操作不可逆转，相关的所有跟进记录和标签数据也将被删除。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "删除中..." : "确认删除"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* 客户详细信息显示区 */}
          <div className="grid gap-6">
            {/* 基础卡片 */}
            <Card>
              <div className="md:flex md:flex-wrap">
                <div className="p-6 md:w-1/2 lg:w-3/5">
                  <CardTitle className="mb-4">基本信息</CardTitle>
                  <div className="grid gap-y-4 gap-x-6 grid-cols-1 md:grid-cols-2">
                    <div className="flex items-start">
                      <User className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">姓名</div>
                        <div>{customer.name}</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Building className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">公司</div>
                        <div>{customer.companyName || '-'}</div>
                      </div>
                    </div>
                    
                    {/* 超级管理员身份证号码显示 */}
                    {isSuperAdmin && (
                      <div className={`flex items-start md:col-span-2 ${decryptedIdCardNumber.includes('解密失败') || decryptedIdCardNumber.includes('格式错误') || decryptedIdCardNumber.includes('无效') ? 'bg-red-50 p-2 rounded' : 'bg-yellow-50 p-2 rounded'}`}>
                        <ShieldAlert className={`h-5 w-5 mr-2 ${decryptedIdCardNumber.includes('解密失败') || decryptedIdCardNumber.includes('格式错误') || decryptedIdCardNumber.includes('无效') ? 'text-red-500' : 'text-yellow-500'} mt-0.5`} />
                        <div>
                          <div className="text-sm text-yellow-700 font-semibold">身份证号码 (仅超级管理员可见)</div>
                          {decryptedIdCardNumber.includes('解密失败') || decryptedIdCardNumber.includes('格式错误') || decryptedIdCardNumber.includes('无效') ? (
                            <>
                              <div className="font-mono text-red-700">{decryptedIdCardNumber}</div>
                              <div className="text-xs text-red-600 mt-1">
                                <Link href={`/admin/super-edit/${customer.id}`} className="underline">
                                  点击这里重新设置身份证号码
                                </Link>
                                <button 
                                  onClick={() => fetchCustomer()} 
                                  className="underline text-blue-600 ml-3"
                                  title="刷新数据，检查问题是否已解决"
                                >
                                  刷新数据
                                </button>
                              </div>
                            </>
                          ) : decryptedIdCardNumber.startsWith('0000') ? (
                            <>
                              <div className="font-mono text-amber-700">临时占位数据，需要设置实际身份证号码</div>
                              <div className="text-xs text-amber-600 mt-1">
                                <Link href={`/admin/super-edit/${customer.id}`} className="underline">
                                  点击这里设置正确的身份证号码
                                </Link>
                              </div>
                            </>
                          ) : (
                            <div className="font-mono text-yellow-900">
                              {decryptedIdCardNumber || '未设置'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start">
                      <Briefcase className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">职位</div>
                        <div>{customer.jobTitle || '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">地址</div>
                        <div>{customer.address || '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">邮箱</div>
                        <div>{customer.email || '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">电话</div>
                        <div>{customer.phone || '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <DollarSign className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">上年度营收</div>
                        <div>
                          {customer.lastYearRevenue
                            ? `¥${customer.lastYearRevenue.toLocaleString('zh-CN')}`
                            : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">登记日期</div>
                        <div>
                          {format(new Date(customer.registrationDate), 'yyyy-MM-dd', { locale: zhCN })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Share2 className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">登记人</div>
                        <div>{customer.registeredBy.name || customer.registeredBy.email}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 md:w-1/2 lg:w-2/5 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <CardTitle>客户标签</CardTitle>
                    </div>
                    <div className="min-h-[50px] mb-6">
                      <CustomerTags 
                        customerId={customer.id}
                        tags={customer.tags || []}
                        onTagsChange={(tags) => {
                          setCustomer({
                            ...customer,
                            tags
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="mb-2">备注</CardTitle>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 min-h-[120px] text-sm">
                      {customer.notes || <span className="text-gray-500">暂无备注</span>}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* 客户跟进选项卡 */}
            <Card>
              <CardHeader>
                <CardTitle>客户跟进</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="records" className="w-full">
                  <TabsList className="px-6">
                    <TabsTrigger value="records">跟进记录</TabsTrigger>
                    <TabsTrigger value="add">添加跟进</TabsTrigger>
                  </TabsList>
                  <TabsContent value="records" className="p-6 pt-4">
                    <FollowUpList 
                      customerId={customer.id}
                    />
                  </TabsContent>
                  <TabsContent value="add" className="p-6 pt-4">
                    <FollowUpForm 
                      customerId={customer.id}
                      onSuccess={() => fetchCustomer()}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </ClientProvider>
  );
}

// 编辑客户表单组件
function EditCustomerForm({ customer, onSuccess }: EditCustomerFormProps) {
  // 表单状态
  const [formData, setFormData] = useState({
    name: customer.name,
    companyName: customer.companyName || '',
    phone: customer.phone || '',
    email: customer.email || '',
    status: customer.status,
    notes: customer.notes || '',
    jobTitle: customer.jobTitle || '',
    address: customer.address || '',
    lastYearRevenue: customer.lastYearRevenue?.toString() || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      lastYearRevenue: formData.lastYearRevenue 
        ? parseInt(formData.lastYearRevenue, 10) 
        : null
    };

    try {
      const response = await fetch(`/api/crm/customers/${customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('更新客户失败');
      }

      onSuccess();
    } catch (error) {
      console.error('更新客户失败:', error);
      alert('更新客户失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 渲染表单
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              姓名
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="companyName" className="text-sm font-medium">
              公司名称
            </label>
            <Input
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              电话
            </label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
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
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="jobTitle" className="text-sm font-medium">
              职位
            </label>
            <Input
              id="jobTitle"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastYearRevenue" className="text-sm font-medium">
              上年度营收
            </label>
            <Input
              id="lastYearRevenue"
              name="lastYearRevenue"
              type="number"
              value={formData.lastYearRevenue}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              状态
            </label>
            <Select
              name="status"
              value={formData.status}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FOLLOWING">跟进中</SelectItem>
                <SelectItem value="NEGOTIATING">洽谈中</SelectItem>
                <SelectItem value="PENDING">待签约</SelectItem>
                <SelectItem value="SIGNED">已签约</SelectItem>
                <SelectItem value="COMPLETED">已完成</SelectItem>
                <SelectItem value="LOST">已流失</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="address" className="text-sm font-medium">
            地址
          </label>
          <Input
            id="address"
            name="address"
            value={formData.address}
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
            value={formData.notes}
            onChange={handleChange}
            rows={4}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "保存修改"}
        </Button>
      </DialogFooter>
    </form>
  );
} 