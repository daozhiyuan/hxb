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
import { ShieldAlert, ArrowLeft, Save, AlertTriangle, RotateCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { validateIdCard, IdCardType } from '@/lib/client-validation';
import { isSuperAdmin } from '@/lib/auth-helpers';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { idCardTypeMap } from '@/config/constants';

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
  idCardType?: string;
}

export default function CustomerEditPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [idNumber, setIdNumber] = useState('');
  const [idCardType, setIdCardType] = useState<IdCardType>(IdCardType.CHINA_MAINLAND);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
    setSaveStatus('idle'); // 重置保存状态
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
      setIdCardType(data.idCardType || IdCardType.CHINA_MAINLAND);
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

    // 清理身份证号码（如果有格式无效的标记）
    let cleanIdNumber = idNumber;
    if (idNumber.includes(' (格式无效)')) {
      cleanIdNumber = idNumber.replace(' (格式无效)', '');
    }

    // 检查证件号码情况
    const isInvalidIdNumber = 
      cleanIdNumber.includes('解密失败') || 
      cleanIdNumber.includes('格式错误') || 
      cleanIdNumber.includes('无效') || 
      cleanIdNumber.includes('异常') || 
      cleanIdNumber.startsWith('0000') || 
      cleanIdNumber.startsWith('110101199001');
    
    // 超级管理员页面不验证证件号码格式，只检查是否为空
    if (cleanIdNumber && !isInvalidIdNumber && cleanIdNumber !== customer.decryptedIdCardNumber) {
      if (!cleanIdNumber.trim()) {
      toast({
          title: '证件号码不能为空',
          description: '请输入有效的证件号码',
        variant: 'destructive'
      });
      return;
      }
    }

    // 如果是解密失败但用户未输入新的证件号码
    if (isInvalidIdNumber && cleanIdNumber === customer.decryptedIdCardNumber) {
      toast({
        title: '需要重新设置证件号码',
        description: '由于原证件号码无法解密、临时数据或者格式错误，请输入新的证件号码',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSaving(true);
    setSaveStatus('idle');
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
          idNumber: cleanIdNumber === customer.decryptedIdCardNumber ? undefined : cleanIdNumber,
          idCardType: idCardType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || '更新客户信息失败');
      }

      toast({
        title: '保存成功',
        description: '客户敏感信息已更新',
      });
      
      setSaveStatus('success');
      
      // 更新后重新加载数据
      setTimeout(() => {
      fetchCustomerDetail();
      }, 1000);
    } catch (error) {
      console.error('保存客户信息失败:', error);
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '更新客户信息失败',
        variant: 'destructive'
      });
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // 判断当前证件是否有效（超级管理员只检查是否为空）
  const isIdCardValid = (value: string, type: IdCardType) => {
    if (!value) return false;
    
    // 排除异常情况
    if (
      value.includes('解密失败') || 
      value.includes('格式错误') || 
      value.includes('无效') || 
      value.includes('异常') || 
      value.startsWith('0000') || 
      value.startsWith('110101199001')
    ) {
      return false;
    }
    
    // 超级管理员页面只检查输入不为空，不验证格式
    return value.trim().length > 0;
  };

  // 处理证件类型变更
  const handleIdCardTypeChange = (value: string) => {
    setIdCardType(value as IdCardType);
  };

  // 处理修复请求
  const handleRepairIdCard = async () => {
    if (!customer) return;
    
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      // 增加确认提示，避免意外操作
      if (idNumber !== customer.decryptedIdCardNumber && isIdCardValid(idNumber, idCardType)) {
        const confirmAction = window.confirm(
          '您已经输入了一个有效的证件号码。是否继续执行修复操作？\n\n' +
          '- 点击"确定"：系统将尝试修复现有数据，您的输入可能会被覆盖\n' +
          '- 点击"取消"：保留您的输入，可以点击保存按钮直接更新'
        );
        
        if (!confirmAction) {
          setIsSaving(false);
          return;
        }
      }
      
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
        await fetchCustomerDetail();
        
        // 如果修复成功，但重置为临时数据，提示用户更新
        if (data.message?.includes('临时数据')) {
          setTimeout(() => {
            toast({
              title: '请更新证件号码',
              description: '系统已重置为临时数据，请输入正确的证件号码并保存',
              variant: 'warning'
            });
          }, 1000);
        }
        
        setSaveStatus('success');
      } else {
        toast({
          title: '修复失败',
          description: data.error || '修复证件数据失败',
          variant: 'destructive'
        });
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('修复证件数据失败:', error);
      toast({
        title: '修复失败',
        description: '发生未知错误，请查看控制台日志',
        variant: 'destructive'
      });
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // 获取证件类型提示信息
  const getIdCardPlaceholder = () => {
    switch (idCardType) {
      case IdCardType.CHINA_MAINLAND:
        return '请输入18位身份证号码';
      case IdCardType.PASSPORT:
        return '请输入护照号码，例如：E12345678';
      case IdCardType.HONG_KONG_ID:
        return '请输入香港身份证号码，例如：A123456(7)';
      case IdCardType.FOREIGN_ID:
        return '请输入证件号码';
      default:
        return '请输入证件号码';
    }
  };

  // 自定义身份证号码编辑组件
  const IdCardEditor = () => {
    // 处理解密失败的情况
    const isDecryptFailed = customer?.decryptedIdCardNumber?.includes('解密失败') 
      || customer?.decryptedIdCardNumber?.includes('格式错误')
      || customer?.decryptedIdCardNumber?.includes('无效')
      || customer?.decryptedIdCardNumber?.includes('异常')
      || customer?.decryptedIdCardNumber?.includes('处理异常');
      
    // 处理临时数据的情况  
    const isTempData = customer?.decryptedIdCardNumber?.startsWith('110101199001')
      || !customer?.decryptedIdCardNumber
      || customer?.decryptedIdCardNumber === '';
    
    // 处理格式无效的情况
    const isInvalidFormat = customer?.decryptedIdCardNumber?.includes('格式无效');
    
    // 证件验证状态 (仅检查是否有输入，不验证格式)
    const isValid = !isDecryptFailed && !isTempData && !isInvalidFormat && 
      customer?.decryptedIdCardNumber && customer.decryptedIdCardNumber.trim().length > 0;
    
    // 处理修复进行中的提示
    const isProcessing = customer?.decryptedIdCardNumber?.includes('数据已修复');
    
    // 清理显示值
    let displayValue = idNumber;
    if (isInvalidFormat && !isDecryptFailed && !isProcessing) {
      // 移除格式无效的标记，只展示值
      displayValue = idNumber.replace(' (格式无效)', '');
    }
    
    // 处理异常情况下的重置表单
    const handleResetForm = () => {
      // 清空当前输入，让用户重新输入
      setIdNumber('');
      toast({
        title: '已重置表单',
        description: '请输入新的有效证件号码',
        variant: 'default'
      });
    };
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <Label htmlFor="idCardType" className="flex items-center">
            <ShieldAlert className="h-4 w-4 mr-1 text-yellow-500" />
            证件类型
          </Label>
        </div>
        
        <div className="mb-4">
          <Select 
            value={idCardType} 
            onValueChange={handleIdCardTypeChange}
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

        <div className="flex items-center justify-between">
          <Label htmlFor="idNumber" className="flex items-center">
            <ShieldAlert className="h-4 w-4 mr-1 text-yellow-500" />
            证件号码
          </Label>
          <div className="flex space-x-2">
          {isDecryptFailed && (
            <Badge variant="destructive" className="text-xs">需要重置</Badge>
          )}
          {isTempData && (
            <Badge variant="secondary" className="text-xs">临时数据</Badge>
          )}
            {isInvalidFormat && !isDecryptFailed && (
              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">格式无效</Badge>
            )}
            {isProcessing && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">处理中</Badge>
            )}
            {isValid && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                格式有效
              </Badge>
            )}
          </div>
        </div>
        
        {isDecryptFailed ? (
          <Alert variant="destructive" className="mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>解密失败或处理异常</AlertTitle>
            <AlertDescription className="flex flex-col space-y-2">
              <span>无法解密原始证件数据。请输入新的证件号码以替换损坏的数据，或点击下方的按钮尝试修复。</span>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button 
                  onClick={handleRepairIdCard} 
                  variant="outline" 
                  size="sm"
                >
                  <RotateCw className="h-3 w-3 mr-1" />
                  尝试修复
                </Button>
                <Button 
                  onClick={handleResetForm} 
                  variant="outline" 
                  size="sm"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  重置表单
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : isTempData ? (
          <Alert className="mb-2 bg-yellow-50 border-yellow-200 text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>临时数据</AlertTitle>
            <AlertDescription>
              当前显示的是系统生成的临时证件号码或未设置。请选择证件类型并输入真实的证件号码。
            </AlertDescription>
          </Alert>
        ) : isInvalidFormat && !isProcessing ? (
          <Alert className="mb-2 bg-yellow-50 border-yellow-200 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>格式无效</AlertTitle>
            <AlertDescription className="flex flex-col space-y-2">
              <span>当前证件号码格式无效，但可以解密。请选择正确的证件类型并修正格式，或点击修复按钮。</span>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button 
                  onClick={handleRepairIdCard} 
                  variant="outline" 
                  size="sm"
                >
                  <RotateCw className="h-3 w-3 mr-1" />
                  尝试修复
                </Button>
                <Button 
                  onClick={handleResetForm} 
                  variant="outline" 
                  size="sm"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  重置表单
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : isProcessing ? (
          <Alert className="mb-2 bg-blue-50 border-blue-200 text-blue-800">
            <RotateCw className="h-4 w-4" />
            <AlertTitle>数据处理中</AlertTitle>
            <AlertDescription>
              系统正在处理证件数据。请刷新页面查看最新状态。
              <Button 
                onClick={fetchCustomerDetail} 
                variant="outline" 
                size="sm"
                className="ml-2"
              >
                刷新数据
              </Button>
            </AlertDescription>
          </Alert>
        ) : isValid ? (
          <Alert className="mb-2 bg-green-50 border-green-200 text-green-800">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>数据有效</AlertTitle>
            <AlertDescription>
              证件号码已正确加密。
            </AlertDescription>
          </Alert>
        ) : null}
        
        <Input 
          id="idNumber" 
          value={displayValue}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder={getIdCardPlaceholder()}
          className={`font-mono ${isDecryptFailed ? 'border-red-500' : isInvalidFormat ? 'border-yellow-500' : ''}`}
        />
        
        <div className="text-xs text-muted-foreground flex items-start space-x-1">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>请输入任意有效的证件号码，系统将对其进行加密存储。为保护数据安全，证件号码仅对超级管理员可见。支持多种证件类型，所有格式均可接受。</span>
        </div>
      </div>
    );
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
            
            <div className="space-y-6">
              <IdCardEditor />
              
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
              
              <div className="space-y-2">
                <Label htmlFor="address">地址</Label>
                <Input 
                  id="address" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="居住或工作地址"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea 
                  id="notes" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="其他需要注意的信息"
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/super">取消</Link>
            </Button>
              <Button 
                variant="outline" 
                onClick={handleRepairIdCard}
                disabled={isSaving}
              >
                <RotateCw className="h-4 w-4 mr-2" />
                尝试修复数据
              </Button>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className={`${
                saveStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                saveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : 
                'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {saveStatus === 'success' ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : saveStatus === 'error' ? (
                <AlertTriangle className="h-4 w-4 mr-2" />
              ) : (
              <Save className="h-4 w-4 mr-2" />
              )}
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