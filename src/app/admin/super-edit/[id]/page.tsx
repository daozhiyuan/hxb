'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, ArrowLeft, Save, AlertTriangle, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { validateIdCard } from '@/lib/client-validation';
import { isSuperAdmin } from '@/lib/auth-helpers';

interface CustomerDetail {
  id: number;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  address: string | null;
  jobTitle: string | null;
  notes: string | null;
  registrationDate: string;
  registeredByPartnerId: number;
  decryptedIdCardNumber: string;
}

export default function CustomerEditPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [idNumber, setIdNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // 检查权限 - 使用权限辅助函数
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && !isSuperAdmin(session)) {
      router.replace('/unauthorized');
    } else if (status === 'authenticated' && isSuperAdmin(session)) {
      fetchCustomerDetail();
    }
  }, [status, session, router, params.id]);

  const fetchCustomerDetail = async () => {
    if (!params.id) return;
    
    setIsLoading(true);
    setError('');
    try {
      console.log(`尝试获取客户ID ${params.id} 的详情...`);
      const response = await fetch(`/api/admin/customers/${params.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取客户详情失败');
      }
      
      const data = await response.json();
      console.log(`成功获取客户ID ${params.id} 的详情`);
      setCustomer(data);
      setIdNumber(data.decryptedIdCardNumber || '');
      setName(data.name || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
      setNotes(data.notes || '');
    } catch (error) {
      console.error('获取客户详情失败:', error);
      setError(error instanceof Error ? error.message : '获取客户详情失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customer) return;

    // 检查身份证号码情况
    const needsNewIdNumber = idNumber.includes('解密失败') || idNumber.includes('格式错误') || idNumber.includes('无效') || idNumber.startsWith('0000');
    
    // 验证身份证号码
    if (idNumber && !needsNewIdNumber && !validateIdCard(idNumber)) {
      toast({
        title: '身份证号码格式无效',
        description: '请输入有效的18位身份证号码',
        variant: 'destructive'
      });
      return;
    }

    // 如果是解密失败但用户未输入新的身份证号码
    if (needsNewIdNumber && idNumber === customer.decryptedIdCardNumber) {
      toast({
        title: '需要重新设置身份证号码',
        description: '由于原身份证号码无法解密或是临时数据，请输入新的身份证号码',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          phone,
          address,
          notes,
          idNumber
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '更新客户信息失败');
      }

      toast({
        title: '保存成功',
        description: '客户敏感信息已更新',
      });
      
      // 更新后重新加载数据
      fetchCustomerDetail();
    } catch (error) {
      console.error('保存客户信息失败:', error);
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '更新客户信息失败',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 尝试修复身份证数据
  const handleRepairIdCard = async () => {
    if (!customer) return;
    
    if (!confirm('您确定要尝试修复此客户的身份证数据吗？')) {
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/fix-id-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customerId: customer.id })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: '修复尝试完成',
          description: data.message,
        });
        
        // 重新加载客户数据
        fetchCustomerDetail();
      } else {
        toast({
          title: '修复失败',
          description: data.error || '修复身份证数据失败',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('修复身份证数据失败:', error);
      toast({
        title: '修复失败',
        description: '发生未知错误，请查看控制台日志',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'authenticated' && isSuperAdmin(session) && customer) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" asChild className="mr-4">
              <Link href="/admin/super">
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回管理面板
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">编辑敏感信息</h1>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="bg-yellow-50">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-yellow-600" />
              <CardTitle>敏感信息编辑 - {customer.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>数据安全警告</AlertTitle>
              <AlertDescription>
                您正在编辑高度敏感的客户个人信息。此操作将被记录，请确保遵守数据保护规定。
              </AlertDescription>
            </Alert>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="客户姓名"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">电话</Label>
                <Input 
                  id="phone" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="联系电话"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="idNumber" className="font-bold text-yellow-800">身份证号码</Label>
                <div className="flex gap-2 items-center">
                  <Input 
                    id="idNumber" 
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="18位身份证号码"
                    className={`bg-yellow-50 border-yellow-300 flex-1 ${
                      idNumber.includes('解密失败') || idNumber.includes('格式错误') || idNumber.includes('无效') ? 
                      'border-red-500 bg-red-50' : 
                      idNumber.startsWith('0000') ? 'border-amber-500 bg-amber-50' : ''
                    }`}
                  />
                  {idNumber.includes('解密失败') || idNumber.includes('格式错误') || idNumber.includes('无效') || idNumber.startsWith('0000') ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
                      onClick={handleRepairIdCard}
                      disabled={isSaving}
                    >
                      <RotateCw className="h-4 w-4 mr-1" />
                      尝试修复
                    </Button>
                  ) : null}
                </div>
                {idNumber.includes('解密失败') || idNumber.includes('格式错误') || idNumber.includes('无效') ? (
                  <p className="text-xs text-red-600">身份证号码解密失败，请输入新的有效身份证号码进行重置或尝试修复</p>
                ) : idNumber.startsWith('0000') ? (
                  <p className="text-xs text-amber-600">当前为临时占位数据，请输入实际的身份证号码</p>
                ) : validateIdCard(idNumber) ? (
                  <p className="text-xs text-green-600">身份证号码有效 - 请注意保护身份证信息安全 ({idNumber.substring(0, 6)}********{idNumber.substring(14)})</p>
                ) : (
                  <p className="text-xs text-gray-500">请确保输入正确的18位身份证号码，系统将对信息进行加密存储</p>
                )}
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">地址</Label>
                <Input 
                  id="address" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="客户地址"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea 
                  id="notes" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="客户备注信息"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/admin/super">取消</Link>
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存敏感信息'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="container mx-auto py-10 px-4">加载中...</div>;
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchCustomerDetail}>重试</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
} 