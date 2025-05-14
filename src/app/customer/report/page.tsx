"use client";

import { useState, FormEvent } from 'react'; // Import FormEvent
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE_URL, CustomerStatusEnum } from '@/config/client-config';
import { useRouter } from 'next/navigation'; // 导入路由钩子
import { IdCardType } from '@/lib/client-validation';
// 不要在客户端组件中直接导入Prisma模型
// import { CustomerStatus } from '@prisma/client';

// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic';

export default function CustomerReportPage() {
  const [idNumber, setIdNumber] = useState('');
  const [idCardType, setIdCardType] = useState<IdCardType>(IdCardType.CHINA_MAINLAND);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [lastYearRevenue, setLastYearRevenue] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [source, setSource] = useState('');
  const [position, setPosition] = useState('');
  const [notes, setNotes] = useState('');
  const [isDuplicate, setIsDuplicate] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false); // For duplication check
  const [submitting, setSubmitting] = useState(false); // For form submission
  const { toast } = useToast();
  const [customerStatus, setCustomerStatus] = useState<string>(CustomerStatusEnum.FOLLOWING); // 使用客户端枚举
  const router = useRouter(); // 初始化路由钩子

  const handleCustomerStatusChange = (value: string) => {
    setCustomerStatus(value);
  };

  const handleIdCardTypeChange = (value: string) => {
    setIdCardType(value as IdCardType);
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

  const handleCheckDuplication = async () => {
    if (!idNumber.trim()) {
       toast({
        title: '请输入证件号码',
        description: '需要证件号码才能进行查重。',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setIsDuplicate(null); // Reset previous check

    try {
      // 使用相对路径而非绝对URL
      const response = await fetch(`/api/customers/check-duplicate?idNumber=${encodeURIComponent(idNumber)}&idCardType=${encodeURIComponent(idCardType)}`, {
        method: 'GET',
      });
      
      const result = await response.json();
      setIsDuplicate(result.isDuplicate);

      if (result.isDuplicate) {
        toast({
          title: '客户查重结果',
          description: '该客户已被报备，请检查或提交申诉。',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '客户查重结果',
          description: '该客户可以报备。',
        });
      }
    } catch (error: any) {
      console.error('客户查重失败', error);
      toast({
        title: '客户查重失败',
        description: error.message || '查重时发生错误，请重试。',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
  
    // 验证必填字段（仅保留证件号码、姓名和备注为必填项）
    if (!name || !idNumber || !notes) {
      toast({
        title: '表单不完整',
        description: '请填写所有必填字段（姓名、证件号码和备注）。',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }
  
    // 确保已进行查重检查且客户不是重复的
    if (isDuplicate === true) {
      toast({
        title: '无法提交',
        description: '该客户已被报备，请提交申诉。',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }
    if (isDuplicate === null) {
      toast({
        title: '无法提交',
        description: '请先执行客户查重操作。',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }
  
    const customerData = {
      name,
      idCardNumber: idNumber,
      idCardType: idCardType,
      companyName: companyName || null,
      lastYearRevenue: lastYearRevenue ? parseFloat(lastYearRevenue) : null,
      phone: phone || null,
      address: address || null,
      status: customerStatus,
      jobTitle: jobTitle || null,
      industry: industry || null,
      source: source || null,
      position: position || null,
      notes: notes || null,
    };
    
    console.log('提交客户数据:', customerData);

    try {
      console.log('开始提交客户数据...');
      // 使用相对路径而非绝对URL
      const response = await fetch('/api/customers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      console.log('API响应状态:', response.status);
      const result = await response.json();
      console.log('API响应结果:', result);

      if (!response.ok) {
        throw new Error(result.message || `服务器错误: ${response.statusText} (${response.status})`);
      }

      // Submission successful
      toast({
        title: '提交成功',
        description: result.message || '客户信息已成功提交！即将返回客户列表...',
      });

      // Clear the form
      clearForm();
      
      // 延迟两秒后跳转，确保用户能看到提交成功的提示
      setTimeout(() => {
        router.push('/crm/customers');
      }, 2000);

    } catch (error: any) {
      console.error('提交报备失败', error);
      toast({
        title: '提交失败',
        description: error.message || '提交客户信息时发生错误，请重试。',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 在清除表单时也使用客户端枚举
  const clearForm = () => {
    setIdNumber('');
    setIdCardType(IdCardType.CHINA_MAINLAND);
    setName('');
    setCompanyName('');
    setLastYearRevenue('');
    setPhone('');
    setAddress('');
    setJobTitle('');
    setIndustry('');
    setSource('');
    setPosition('');
    setNotes('');
    setIsDuplicate(null);
    setCustomerStatus(CustomerStatusEnum.FOLLOWING);
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
          <CardTitle>客户报备</CardTitle>
          <CardDescription>请填写客户的详细信息。提交前请先检查客户是否重复。</CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.push('/crm/customers')}>
              返回客户列表
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 基本信息字段 - 必填项 */}
            <div>
              <Label htmlFor="idCardType">证件类型 <span className="text-red-500">*</span></Label>
              <Select onValueChange={handleIdCardTypeChange} defaultValue={idCardType}>
                <SelectTrigger id="idCardType" className="w-full">
                  <SelectValue placeholder="选择证件类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={IdCardType.CHINA_MAINLAND}>中国大陆身份证</SelectItem>
                  <SelectItem value={IdCardType.PASSPORT}>护照</SelectItem>
                  <SelectItem value={IdCardType.HONG_KONG_ID}>香港身份证</SelectItem>
                  <SelectItem value={IdCardType.FOREIGN_ID}>其他证件</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="idNumber">证件号码 <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                id="idNumber"
                placeholder={getIdCardPlaceholder()}
                value={idNumber}
                onChange={e => setIdNumber(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <div>
              <Label htmlFor="name">姓名 <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                id="name"
                placeholder="请输入姓名"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <div>
              <Label htmlFor="phone">电话号码</Label>
              <Input
                type="tel"
                id="phone"
                placeholder="请输入电话号码"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="address">联系地址</Label>
              <Textarea
                id="address"
                placeholder="请输入联系地址"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
            
            {/* 公司相关信息 - 选填项 */}
            <div>
              <Label htmlFor="companyName">单位名称</Label>
              <Input
                type="text"
                id="companyName"
                placeholder="请输入单位名称 (可选)"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="jobTitle">职位</Label>
              <Input
                id="jobTitle"
                placeholder="请输入客户职位"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              />
            </div>
            
            {/* 其他信息 - 选填项 */}
            <div>
              <Label htmlFor="industry">行业</Label>
              <Input
                id="industry"
                placeholder="请输入客户行业"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastYearRevenue">去年营收 (元)</Label>
              <Input
                type="number"
                id="lastYearRevenue"
                placeholder="请输入去年营收 (可选)"
                value={lastYearRevenue}
                onChange={e => setLastYearRevenue(e.target.value)}
                min="0"
                step="any"
              />
            </div>
            <div>
              <Label htmlFor="source">来源</Label>
              <Input
                id="source"
                placeholder="请输入客户来源"
                value={source}
                onChange={e => setSource(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">备注 <span className="text-red-500">*</span></Label>
              <Textarea
                id="notes"
                placeholder="请输入客户备注"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            
            <div>
                <Label htmlFor="customerStatus">客户状态</Label>
                <Select onValueChange={handleCustomerStatusChange} defaultValue={customerStatus}>
                    <SelectTrigger id="customerStatus" className="w-full md:w-[180px]">
                        <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={CustomerStatusEnum.FOLLOWING}>跟进中</SelectItem>
                        <SelectItem value={CustomerStatusEnum.NEGOTIATING}>洽谈中</SelectItem>
                        <SelectItem value={CustomerStatusEnum.PENDING}>待定</SelectItem>
                        <SelectItem value={CustomerStatusEnum.SIGNED}>已签约</SelectItem>
                        <SelectItem value={CustomerStatusEnum.COMPLETED}>已完成</SelectItem>
                        <SelectItem value={CustomerStatusEnum.LOST}>已流失</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 pt-2">
              <Button type="button" variant="secondary" onClick={handleCheckDuplication} disabled={loading || submitting || !idNumber} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                    检查中...
                  </>
                ) : (
                  '1. 检查客户是否重复'
                )}
              </Button>

              <Button 
                type="submit" 
                disabled={loading || submitting || isDuplicate === true || isDuplicate === null} 
                className="w-full sm:w-auto"
                onClick={(e) => {
                  if (!loading && !submitting && isDuplicate === false) {
                    handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
                  }
                }}
              >
                {submitting ? (
                  <>
                    <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  '2. 提交报备'
                )}
              </Button>
             </div>

            {isDuplicate !== null && (
              <div className="mt-4 text-sm">
                {isDuplicate ? (
                  <p className="text-red-600 font-semibold">⚠ 该客户已被报备，无法提交。如需申诉请联系管理员。</p>
                ) : (
                  <p className="text-green-600 font-semibold">✅ 该客户可以报备，请填写完整信息后提交。</p>
                )}
              </div>
            )}

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
