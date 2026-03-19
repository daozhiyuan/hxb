'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { validateIdCard, IdCardType } from '@/lib/client-validation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AppealForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [idCardError, setIdCardError] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    idNumber: '',
    idCardType: IdCardType.CHINA_MAINLAND,
    reason: '',
    evidence: [] as string[],
    jobTitle: '',
    industry: '',
    source: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表单验证，只验证必填字段
    if (!formData.customerName || !formData.idNumber || !formData.reason) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '请填写所有必填字段（姓名、证件号码和申诉原因）',
      });
      return;
    }

    // 检查是否有身份证验证错误
    if (idCardError) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: idCardError,
      });
      return;
    }

    // 只检查证件号码不为空
    if (!formData.idNumber.trim()) {
      const errorMsg = '请输入证件号码';
      setIdCardError(errorMsg);
      toast({
        variant: 'destructive',
        title: '错误',
        description: errorMsg,
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/appeals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = '提交申诉失败';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          if (errorData.errors) {
            errorMessage += ': ' + Object.values(errorData.errors).flat().join(', ');
          }
        } catch (e) {
          console.error('解析错误响应失败:', e);
        }
        throw new Error(errorMessage);
      }

      const appeal = await response.json();
      toast({
        title: '成功',
        description: '申诉已提交，请等待处理',
      });

      // 使用setTimeout延迟跳转，确保toast能够显示
      setTimeout(() => {
        // 直接跳转到申诉列表页
        router.push('/appeals');
        router.refresh();
      }, 1500);
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error instanceof Error ? error.message : '提交申诉失败',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 实时验证身份证号码
    if (name === 'idNumber' && value) {
      validateIdCardInput(value);
    } else if (name === 'idNumber' && !value) {
      setIdCardError('');
    }
  };

  // 验证证件号码输入
  const validateIdCardInput = (value: string) => {
    if (!value.trim()) {
      setIdCardError('请输入证件号码');
      return;
    }
    
    // 根据证件类型验证格式
    const isValid = validateIdCard(value, formData.idCardType as IdCardType);
    
    if (!isValid) {
      // 根据证件类型显示不同的错误信息
      switch (formData.idCardType) {
        case IdCardType.CHINA_MAINLAND:
          setIdCardError('请输入有效的18位居民身份证号码');
          break;
        case IdCardType.PASSPORT:
          setIdCardError('请输入有效的护照号码，1-2位字母加7-8位数字');
          break;
        case IdCardType.HONG_KONG_ID:
          setIdCardError('请输入有效的香港身份证号码，字母加6位数字及可选的校验位');
          break;
        case IdCardType.FOREIGN_ID:
          setIdCardError('请输入有效的证件号码，至少5个字符');
          break;
        default:
          setIdCardError('证件号码格式无效');
      }
    } else {
      setIdCardError('');
    }
  };

  // 处理证件类型变更
  const handleIdCardTypeChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      idCardType: value as IdCardType 
    }));
    // 当类型变更时重新验证当前输入
    if (formData.idNumber) {
      setTimeout(() => validateIdCardInput(formData.idNumber), 0);
    }
  };

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

      if (!response.ok) throw new Error('上传文件失败');

      const { urls } = await response.json();
      setFormData(prev => ({
        ...prev,
        evidence: [...prev.evidence, ...urls],
      }));

      toast({
        title: '成功',
        description: '文件上传成功',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error instanceof Error ? error.message : '上传文件失败',
      });
    }
  };

  // 获取证件类型提示信息
  const getIdCardPlaceholder = () => {
    switch (formData.idCardType) {
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
  
  // 获取证件类型说明文本
  const getIdCardDescription = () => {
    switch (formData.idCardType) {
      case IdCardType.CHINA_MAINLAND:
        return '请输入有效的18位居民身份证号码';
      case IdCardType.PASSPORT:
        return '请输入有效的护照号码，1-2位字母加7-8位数字';
      case IdCardType.HONG_KONG_ID:
        return '请输入有效的香港身份证号码，字母加6位数字及可选的校验位';
      case IdCardType.FOREIGN_ID:
        return '请输入有效的外国证件号码';
      default:
        return '请输入有效的证件号码';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>提交申诉</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-2">
            <label htmlFor="customerName" className="text-sm font-medium">客户姓名</label>
            <Input
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              placeholder="请输入客户姓名"
              required
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="jobTitle" className="text-sm font-medium">职位</label>
            <Input
              id="jobTitle"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              placeholder="请输入客户职位"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="industry" className="text-sm font-medium">行业</label>
            <Input
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              placeholder="请输入客户行业"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="source" className="text-sm font-medium">来源</label>
            <Input
              id="source"
              name="source"
              value={formData.source}
              onChange={handleChange}
              placeholder="请输入客户来源"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="idCardType" className="text-sm font-medium">证件类型</label>
            <Select 
              value={formData.idCardType} 
              onValueChange={handleIdCardTypeChange}
            >
              <SelectTrigger id="idCardType">
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
            <label htmlFor="idNumber" className="text-sm font-medium">证件号码</label>
            <Input
              id="idNumber"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleChange}
              placeholder={getIdCardPlaceholder()}
              className={idCardError ? "border-red-500" : ""}
              required
            />
            {idCardError && (
              <p className="text-xs text-red-500">{idCardError}</p>
            )}
            <p className="text-xs text-gray-500">{getIdCardDescription()}</p>
          </div>

          <div className="grid gap-2">
            <label htmlFor="reason" className="text-sm font-medium">申诉原因</label>
            <Textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="请详细说明申诉原因..."
              required
              rows={5}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="evidence" className="text-sm font-medium">证据材料</label>
            <Input
              id="evidence"
              type="file"
              onChange={handleFileChange}
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.zip,.rar"
            />
            {formData.evidence.length > 0 && (
              <div className="mt-2 space-y-2">
                {formData.evidence.map((file, index) => (
                  <div key={index} className="text-sm text-blue-600">
                    已上传文件 #{index + 1}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">
              支持的文件类型：图片、PDF、Word文档、Excel表格、PowerPoint演示文稿、文本文件、压缩文件等
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            提交申诉
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}