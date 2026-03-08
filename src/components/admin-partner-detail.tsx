'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Role } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Save, XCircle } from 'lucide-react';

interface PartnerDetailProps {
  partnerId: string;
}

export function AdminPartnerDetail({ partnerId }: PartnerDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [partnerData, setPartnerData] = useState<any>({
    // 基本信息
    name: '',
    email: '',
    role: 'PARTNER',
    isActive: true,
    // 公司基本信息
    companyName: '',
    phone: '',
    address: '',
    // 银行账户信息
    bankName: '',
    bankAccount: '',
    accountHolder: '',
    // 发票信息
    taxId: '',
    invoiceTitle: '',
    invoiceAddress: '',
    invoicePhone: '',
    // 统计
    _count: { customers: 0 },
  });

  // 加载合作伙伴数据
  useEffect(() => {
    const fetchPartnerData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/partners/${partnerId}`);
        if (!response.ok) {
          throw new Error('获取合作伙伴数据失败');
        }
        const data = await response.json();
        setPartnerData(data);
      } catch (error) {
        console.error('获取合作伙伴数据失败:', error);
        toast.error('获取合作伙伴数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (partnerId) {
      fetchPartnerData();
    }
  }, [partnerId]);

  // 处理表单变更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPartnerData((prev: any) => ({ ...prev, [name]: value }));
  };

  // 处理开关切换
  const handleSwitchChange = (name: string, checked: boolean) => {
    setPartnerData((prev: any) => ({ ...prev, [name]: checked }));
  };

  // 保存合作伙伴数据
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partnerData),
      });

      if (!response.ok) {
        throw new Error('更新合作伙伴数据失败');
      }

      toast.success('合作伙伴信息已更新');
    } catch (error) {
      console.error('更新合作伙伴数据失败:', error);
      toast.error('更新合作伙伴数据失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 返回合作伙伴列表
  const handleBack = () => {
    router.push('/admin/users');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <CardTitle>合作伙伴详情</CardTitle>
              <CardDescription>{partnerData.email}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {partnerData.isActive ? (
              <span className="flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" /> 已激活
              </span>
            ) : (
              <span className="flex items-center text-red-600">
                <XCircle className="h-4 w-4 mr-1" /> 未激活
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm font-medium">客户数量: </span>
            <span className="bg-slate-100 px-2 py-1 rounded text-sm">{partnerData._count?.customers || 0}</span>
          </div>
          <div>
            <span className="text-sm font-medium mr-2">账户状态:</span>
            <Switch 
              checked={partnerData.isActive} 
              onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
            />
          </div>
        </div>

        <Separator className="my-4" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="company">公司信息</TabsTrigger>
            <TabsTrigger value="bank">银行账户</TabsTrigger>
            <TabsTrigger value="invoice">发票信息</TabsTrigger>
          </TabsList>

          <div className="space-y-4">
            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  name="email"
                  value={partnerData.email}
                  disabled
                  readOnly
                />
                <p className="text-xs text-muted-foreground">邮箱地址不可修改</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">姓名</Label>
                <Input
                  id="name"
                  name="name"
                  value={partnerData.name || ''}
                  onChange={handleChange}
                  placeholder="输入合作伙伴姓名"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">角色</Label>
                <select
                  id="role"
                  name="role"
                  value={partnerData.role}
                  onChange={(e) => setPartnerData({ ...partnerData, role: e.target.value })}
                  className="border rounded p-2"
                >
                  <option value="PARTNER">合作伙伴</option>
                  <option value="ADMIN">管理员</option>
                  <option value="USER">普通用户</option>
                </select>
              </div>
            </TabsContent>

            <TabsContent value="company" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="companyName">公司名称</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={partnerData.companyName || ''}
                  onChange={handleChange}
                  placeholder="输入公司名称"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">联系电话</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={partnerData.phone || ''}
                  onChange={handleChange}
                  placeholder="输入联系电话"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">公司地址</Label>
                <Input
                  id="address"
                  name="address"
                  value={partnerData.address || ''}
                  onChange={handleChange}
                  placeholder="输入公司地址"
                />
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="bankName">开户银行</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={partnerData.bankName || ''}
                  onChange={handleChange}
                  placeholder="输入开户银行名称"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accountHolder">开户名</Label>
                <Input
                  id="accountHolder"
                  name="accountHolder"
                  value={partnerData.accountHolder || ''}
                  onChange={handleChange}
                  placeholder="输入银行账户开户名"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bankAccount">银行账号</Label>
                <Input
                  id="bankAccount"
                  name="bankAccount"
                  value={partnerData.bankAccount || ''}
                  onChange={handleChange}
                  placeholder="输入银行账号"
                />
              </div>
            </TabsContent>

            <TabsContent value="invoice" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="invoiceTitle">发票抬头</Label>
                <Input
                  id="invoiceTitle"
                  name="invoiceTitle"
                  value={partnerData.invoiceTitle || ''}
                  onChange={handleChange}
                  placeholder="输入发票抬头"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="taxId">税号</Label>
                <Input
                  id="taxId"
                  name="taxId"
                  value={partnerData.taxId || ''}
                  onChange={handleChange}
                  placeholder="输入税号"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invoiceAddress">发票地址</Label>
                <Input
                  id="invoiceAddress"
                  name="invoiceAddress"
                  value={partnerData.invoiceAddress || ''}
                  onChange={handleChange}
                  placeholder="输入发票地址"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invoicePhone">发票电话</Label>
                <Input
                  id="invoicePhone"
                  name="invoicePhone"
                  value={partnerData.invoicePhone || ''}
                  onChange={handleChange}
                  placeholder="输入发票电话"
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-end border-t pt-4">
        <Button onClick={handleBack} variant="outline" className="mr-2">
          取消
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? '保存中...' : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存更改
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 