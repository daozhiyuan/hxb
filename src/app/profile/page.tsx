'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClientProvider } from '@/components/client-provider';
import { Header } from '@/components/header';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Role } from '@prisma/client';
import { ShieldAlert } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DecryptionTool from './components/decryption-tool';

// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic';

// 证件类型枚举
enum IdCardType {
  CHINA_MAINLAND = 'CHINA_MAINLAND', // 中国大陆身份证
  PASSPORT = 'PASSPORT', // 护照
  HONG_KONG_ID = 'HONG_KONG_ID', // 香港身份证
  FOREIGN_ID = 'FOREIGN_ID', // 外国证件
}

// 证件类型显示名称
const idCardTypeMap: Record<string, string> = {
  CHINA_MAINLAND: '中国大陆身份证',
  PASSPORT: '护照',
  HONG_KONG_ID: '香港身份证',
  FOREIGN_ID: '外国证件',
};

// 身份证号码显示组件
const IdNumberDisplay = ({ idNumber }: { idNumber: string }) => {
  if (!idNumber) return <p>未设置</p>;
  
  if (idNumber.includes('解密失败') || idNumber.includes('格式错误') || idNumber.includes('无效')) {
    return (
      <div className="flex items-center">
        <p className="text-yellow-600">{idNumber}</p>
      </div>
    );
  }
  
  return (
    <div className="flex items-center">
      <p className="font-mono bg-green-50 p-1 border border-green-200 rounded">{idNumber}</p>
      <ShieldAlert className="ml-1 h-4 w-4 text-green-500" aria-label="超级管理员视图" />
    </div>
  );
};

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // 基本信息
    name: '',
    email: '',
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
    // 证件信息
    idNumber: '',
    idCardType: IdCardType.CHINA_MAINLAND,
  });

  // 当前活动标签
  const [activeTab, setActiveTab] = useState('basic');
  
  // 判断是否为超级管理员
  const isSuperAdmin = session?.user?.role === Role.SUPER_ADMIN;

  // 页面加载时获取当前用户资料
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // 仅更新已知存在于session中的字段
        setFormData(prev => ({
          ...prev,
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        }));

        // 获取完整的用户资料
        const response = await fetch('/api/profile');
        if (response.ok) {
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || '获取用户资料失败');
          }
          const userData = result.data || {};
          setFormData(prev => ({
            ...prev,
            // 基本信息
            name: userData.name || '',
            email: userData.email || '',
            // 公司基本信息
            companyName: userData.companyName || '',
            phone: userData.phone || '',
            address: userData.address || '',
            // 银行账户信息
            bankName: userData.bankName || '',
            bankAccount: userData.bankAccount || '',
            accountHolder: userData.accountHolder || '',
            // 发票信息
            taxId: userData.taxId || '',
            invoiceTitle: userData.invoiceTitle || '',
            invoiceAddress: userData.invoiceAddress || '',
            invoicePhone: userData.invoicePhone || '',
            // 证件信息
            idNumber: userData.decryptedIdCardNumber || '',
            idCardType: userData.idCardType || IdCardType.CHINA_MAINLAND,
          }));
        } else {
          throw new Error('获取用户资料失败');
        }
      } catch (error) {
        console.error('获取用户资料失败:', error);
        toast.error('获取用户资料失败，请刷新页面重试');
      }
    };

    if (session?.user) {
      fetchUserProfile();
    }
  }, [session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新个人信息失败');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '更新个人信息失败');
      }
      
      // 更新session中的基本信息
      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
        },
      });

      toast.success('个人信息更新成功');
    } catch (error) {
      console.error('更新个人信息失败:', error);
      toast.error('更新个人信息失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 判断是否为合作伙伴
  const isPartner = session?.user?.role === Role.PARTNER;

  return (
    <ClientProvider requireAuth>
      <Header />
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">个人中心</h1>

        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>个人资料</CardTitle>
              <CardDescription>查看和更新您的个人和公司信息</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                  {isPartner && <TabsTrigger value="company">公司信息</TabsTrigger>}
                  {isPartner && <TabsTrigger value="bank">银行账户</TabsTrigger>}
                  {isPartner && <TabsTrigger value="invoice">发票信息</TabsTrigger>}
                  {isSuperAdmin && <TabsTrigger value="idcard">证件信息</TabsTrigger>}
                </TabsList>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">邮箱</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
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
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="请输入您的姓名"
                      />
                    </div>
                  </TabsContent>

                  {isPartner && (
                    <TabsContent value="company" className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="companyName">公司名称</Label>
                        <Input
                          id="companyName"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleChange}
                          placeholder="请输入公司名称"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phone">联系电话</Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="请输入联系电话"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="address">公司地址</Label>
                        <Input
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="请输入公司地址"
                        />
                      </div>
                    </TabsContent>
                  )}

                  {isPartner && (
                    <TabsContent value="bank" className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="bankName">开户银行</Label>
                        <Input
                          id="bankName"
                          name="bankName"
                          value={formData.bankName}
                          onChange={handleChange}
                          placeholder="请输入开户银行名称"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="accountHolder">开户名</Label>
                        <Input
                          id="accountHolder"
                          name="accountHolder"
                          value={formData.accountHolder}
                          onChange={handleChange}
                          placeholder="请输入银行账户开户名"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="bankAccount">银行账号</Label>
                        <Input
                          id="bankAccount"
                          name="bankAccount"
                          value={formData.bankAccount}
                          onChange={handleChange}
                          placeholder="请输入银行账号"
                        />
                      </div>
                    </TabsContent>
                  )}

                  {isPartner && (
                    <TabsContent value="invoice" className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="taxId">税号</Label>
                        <Input
                          id="taxId"
                          name="taxId"
                          value={formData.taxId}
                          onChange={handleChange}
                          placeholder="请输入税号"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="invoiceTitle">发票抬头</Label>
                        <Input
                          id="invoiceTitle"
                          name="invoiceTitle"
                          value={formData.invoiceTitle}
                          onChange={handleChange}
                          placeholder="请输入发票抬头"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="invoiceAddress">发票地址</Label>
                        <Input
                          id="invoiceAddress"
                          name="invoiceAddress"
                          value={formData.invoiceAddress}
                          onChange={handleChange}
                          placeholder="请输入发票地址"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="invoicePhone">发票电话</Label>
                        <Input
                          id="invoicePhone"
                          name="invoicePhone"
                          value={formData.invoicePhone}
                          onChange={handleChange}
                          placeholder="请输入发票电话"
                        />
                      </div>
                    </TabsContent>
                  )}
                  
                  {isSuperAdmin && (
                    <TabsContent value="idcard" className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="idCardType" className="flex items-center">
                          <ShieldAlert className="h-4 w-4 mr-1 text-yellow-500" />
                          证件类型
                        </Label>
                        <Select 
                          value={formData.idCardType} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, idCardType: value as IdCardType }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="请选择证件类型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={IdCardType.CHINA_MAINLAND}>中国大陆身份证</SelectItem>
                            <SelectItem value={IdCardType.PASSPORT}>护照</SelectItem>
                            <SelectItem value={IdCardType.HONG_KONG_ID}>香港身份证</SelectItem>
                            <SelectItem value={IdCardType.FOREIGN_ID}>其他证件</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="idNumber" className="flex items-center">
                          <ShieldAlert className="h-4 w-4 mr-1 text-yellow-500" />
                          证件号码
                        </Label>
                        <div className="mb-2">
                          <IdNumberDisplay idNumber={formData.idNumber} />
                        </div>
                        <Input
                          id="idNumber"
                          name="idNumber"
                          value={formData.idNumber}
                          onChange={handleChange}
                          placeholder="请输入证件号码"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          证件号码仅超级管理员可见，将被加密存储
                        </p>
                      </div>
                    </TabsContent>
                  )}

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? '保存中...' : '保存修改'}
                  </Button>
                </form>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* 超级管理员解密工具 */}
          {isSuperAdmin && (
            <div className="mt-6">
              <DecryptionTool isSuperAdmin={isSuperAdmin} />
            </div>
          )}
        </div>
      </div>
    </ClientProvider>
  );
}