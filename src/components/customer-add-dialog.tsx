'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerStatusEnum } from '@/config/client-config';

interface CustomerAddDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CustomerAddDialog({ isOpen, onOpenChange, onSuccess }: CustomerAddDialogProps) {
  const router = useRouter();
  const [idNumber, setIdNumber] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [lastYearRevenue, setLastYearRevenue] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [isDuplicate, setIsDuplicate] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false); // For duplication check
  const [submitting, setSubmitting] = useState(false); // For form submission
  const { toast } = useToast();
  const [customerStatus, setCustomerStatus] = useState<string>(CustomerStatusEnum.FOLLOWING); // Default status
  const [idCardType, setIdCardType] = useState<string>('CHINA_MAINLAND'); // 新增证件类型状态，默认为中国大陆身份证
  
  // 申诉相关状态
  const [showAppealDialog, setShowAppealDialog] = useState<boolean>(false);
  const [appealReason, setAppealReason] = useState<string>('');
  const [appealEvidence, setAppealEvidence] = useState<string[]>([]);
  const [submittingAppeal, setSubmittingAppeal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCustomerStatusChange = (value: string) => {
    setCustomerStatus(value);
  };

  // 处理证件类型变更
  const handleIdCardTypeChange = (value: string) => {
    setIdCardType(value);
  };

  const handleCheckDuplication = async () => {
    if (!idNumber) {
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
      // 实现查重功能，添加证件类型参数
      const response = await fetch(`/api/customers/check-duplicate?idNumber=${encodeURIComponent(idNumber)}&idCardType=${encodeURIComponent(idCardType)}`, {
        method: 'GET',
      });
      
      const result = await response.json();
      setIsDuplicate(result.isDuplicate);

      if (result.isDuplicate) {
        // 当发现客户重复时，弹出申诉对话框选项
        setShowAppealDialog(true);
        toast({
          title: '客户查重结果',
          description: '该客户已被报备，请选择提交申诉或取消。',
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
  
    // 验证必填字段
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
      // 如果客户重复，提示使用申诉功能
      setShowAppealDialog(true);
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
      notes: notes || null,
    };
    
    console.log('提交客户数据:', customerData);

    try {
      console.log('开始提交客户数据...');
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
        // 检查是否为身份证号冲突
        if (response.status === 409 || (result.error && result.error.includes('身份证'))) {
          // 自动弹出申诉对话框
          setShowAppealDialog(true);
          toast({
            title: '客户已存在',
            description: '该身份证号码已被报备，如有异议请提交申诉。',
            variant: 'destructive',
          });
          return;
        }
        throw new Error(result.error || '新增客户失败');
      }

      // 提交成功
      toast({
        title: '提交成功',
        description: '客户信息已成功提交!',
      });

      // 清空表单
      resetForm();
      
      // 关闭对话框并通知父组件成功
      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);

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

  // 处理文件上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`解析响应失败: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(result.message || '上传文件失败');
      }

      if (result.urls && Array.isArray(result.urls)) {
        setAppealEvidence(prev => [...prev, ...result.urls]);
        toast({
          title: '成功',
          description: '文件上传成功',
        });
      } else {
        throw new Error('文件上传响应格式不正确');
      }
    } catch (error: any) {
      console.error('文件上传失败:', error);
      toast({
        variant: 'destructive',
        title: '上传失败',
        description: error.message || '上传文件时发生错误，请重试',
      });
    }
  };

  // 提交申诉的处理函数
  const handleSubmitAppeal = async () => {
    // 验证申诉理由
    if (!appealReason || appealReason.length < 10) {
      toast({
        title: '申诉理由不足',
        description: '请提供至少10个字符的详细申诉理由',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingAppeal(true);

    try {
      const appealData = {
        customerName: name,
        idNumber: idNumber,
        idCardType: idCardType,
        reason: appealReason,
        evidence: appealEvidence.length > 0 ? appealEvidence.join(',') : null,
        jobTitle: jobTitle || '',
        industry: industry || '',
        source: source || '',
        previousAppealId: new URLSearchParams(window.location.search).get('previousAppealId')
      };

      console.log("提交申诉数据:", appealData);

      const response = await fetch('/api/appeals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appealData),
      });

      const responseText = await response.text();
      console.log("申诉提交响应:", responseText);
      
      let appeal;
      try {
        // 安全解析JSON响应
        if (responseText && responseText.trim()) {
          try {
            appeal = JSON.parse(responseText);
          } catch (parseError) {
            console.error('JSON解析失败:', parseError);
            appeal = { 
              message: '响应格式错误', 
              details: `无法解析服务器响应: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}` 
            };
          }
        } else {
          appeal = { message: '服务器返回空响应' };
        }
      } catch (e) {
        appeal = { message: `处理响应失败: ${responseText ? responseText.substring(0, 100) : '空响应'}` };
      }

      if (!response.ok) {
        toast({
          title: '申诉提交失败',
          description: appeal.details || appeal.message || '提交申诉时发生错误，请重试',
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }
      
      // 显示成功提示
      toast({
        title: '提交成功',
        description: '申诉已提交，3秒后自动跳转到申诉列表...',
        duration: 3000,
      });

      // 关闭对话框
      setShowAppealDialog(false);
      onOpenChange(false);
      
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        router.push('/appeals');
      }, 3000);
    } catch (error: any) {
      console.error("申诉提交错误:", error);
      toast({
        title: '申诉提交失败',
        description: error.message || '提交申诉时发生错误，请重试',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const resetForm = () => {
    setIdNumber('');
    setName('');
    setCompanyName('');
    setLastYearRevenue('');
    setPhone('');
    setAddress('');
    setJobTitle('');
    setIndustry('');
    setSource('');
    setNotes('');
    setIsDuplicate(null);
    setCustomerStatus(CustomerStatusEnum.FOLLOWING);
    setIdCardType('CHINA_MAINLAND');
    setAppealReason('');
    setAppealEvidence([]);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>新增客户</DialogTitle>
          <DialogDescription>
            请填写客户信息，带 * 的字段为必填项。提交前请先检查客户是否重复。
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="idCardType">证件类型</Label>
              <Select onValueChange={handleIdCardTypeChange} defaultValue={idCardType}>
                <SelectTrigger id="idCardType" className="w-full">
                  <SelectValue placeholder="选择证件类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHINA_MAINLAND">中国大陆身份证</SelectItem>
                  <SelectItem value="PASSPORT">护照</SelectItem>
                  <SelectItem value="HONG_KONG_ID">香港身份证</SelectItem>
                  <SelectItem value="FOREIGN_ID">其他证件</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="idNumber">证件号码 <span className="text-red-500">*</span></Label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  id="idNumber"
                  placeholder="请输入证件号码"
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleCheckDuplication} 
                  disabled={loading || submitting || !idNumber}
                  className="whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                      查重中
                    </>
                  ) : (
                    '查重'
                  )}
                </Button>
              </div>
              {isDuplicate !== null && (
                <div className="mt-1 text-sm">
                  {isDuplicate ? (
                    <p className="text-red-600">⚠ 该客户已被报备</p>
                  ) : (
                    <p className="text-green-600">✅ 该客户可以报备</p>
                  )}
                </div>
              )}
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
              />
            </div>
            
            <div>
              <Label htmlFor="companyName">单位名称</Label>
              <Input
                type="text"
                id="companyName"
                placeholder="请输入单位名称"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="jobTitle">职位</Label>
              <Input
                type="text"
                id="jobTitle"
                placeholder="请输入职位"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
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
              <Label htmlFor="lastYearRevenue">去年营收 (元)</Label>
              <Input
                type="number"
                id="lastYearRevenue"
                placeholder="请输入去年营收"
                value={lastYearRevenue}
                onChange={e => setLastYearRevenue(e.target.value)}
                min="0"
                step="any"
              />
            </div>
            
            <div>
              <Label htmlFor="industry">行业</Label>
              <Input
                type="text"
                id="industry"
                placeholder="请输入行业"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="source">来源</Label>
              <Input
                type="text"
                id="source"
                placeholder="请输入来源"
                value={source}
                onChange={e => setSource(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="status">客户状态</Label>
              <Select onValueChange={handleCustomerStatusChange} defaultValue={customerStatus}>
                <SelectTrigger id="status">
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
            
            <div className="md:col-span-2">
              <Label htmlFor="address">联系地址</Label>
              <Textarea
                id="address"
                placeholder="请输入联系地址"
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="notes">备注 <span className="text-red-500">*</span></Label>
              <Textarea
                id="notes"
                placeholder="请输入备注信息"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={loading || submitting || isDuplicate === true || isDuplicate === null}
            >
              {submitting ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

      {/* 申诉提交对话框 */}
      <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>提交客户申诉</DialogTitle>
            <DialogDescription>
              该客户已被其他合作伙伴报备，您可以提交申诉说明情况
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-sm text-gray-500">客户姓名</Label>
                  <p className="font-medium">{name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">身份证号码</Label>
                  <p className="font-medium">{idNumber}</p>
                </div>
                {jobTitle && (
                  <div>
                    <Label className="text-sm text-gray-500">职位</Label>
                    <p className="font-medium">{jobTitle}</p>
                  </div>
                )}
                {industry && (
                  <div>
                    <Label className="text-sm text-gray-500">行业</Label>
                    <p className="font-medium">{industry}</p>
                  </div>
                )}
              </div>
              
              <Label htmlFor="appealReason" className="text-sm font-medium">申诉理由 <span className="text-red-500">*</span></Label>
              <Textarea
                id="appealReason"
                placeholder="请详细说明您的申诉理由，如何认识该客户，您与客户的关系等信息..."
                value={appealReason}
                onChange={e => setAppealReason(e.target.value)}
                rows={5}
                required
              />
              <p className="text-xs text-gray-500">请提供至少10个字符的详细申诉理由</p>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-medium">证据材料 <span className="text-gray-500">(可选)</span></Label>
              <p className="text-xs text-gray-500 mb-2">上传与客户的沟通记录、拜访照片等能证明您与客户关系的材料</p>
              <Input
                type="file"
                onChange={handleFileChange}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.zip,.rar"
              />
              {appealEvidence.length > 0 && (
                <div className="mt-2 space-y-1">
                  {appealEvidence.map((file, index) => (
                    <div key={index} className="text-sm text-blue-600 flex items-center">
                      <Icons.fileText className="h-4 w-4 mr-1" />
                      已上传文件 #{index + 1}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                支持的文件类型：图片、PDF、Word文档、Excel表格、PowerPoint演示文稿、文本文件、压缩文件等
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAppealDialog(false);
                setAppealReason('');
                setAppealEvidence([]);
              }}
              disabled={submittingAppeal}
            >
              放弃申诉
            </Button>
            <Button
              type="button"
              onClick={handleSubmitAppeal}
              disabled={submittingAppeal || !appealReason || appealReason.length < 10}
            >
              {submittingAppeal ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交申诉'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}