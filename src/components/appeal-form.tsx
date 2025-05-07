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
import { validateIdCard } from '@/lib/client-validation';

// 定义当前应用的BASE_URL，确保与运行的端口一致
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';

export default function AppealForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [idCardError, setIdCardError] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    idNumber: '',
    reason: '',
    evidence: [] as string[],
    jobTitle: '',
    industry: '',
    source: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表单验证
    if (!formData.customerName || !formData.idNumber || !formData.reason) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '请填写所有必填字段',
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

    if (!validateIdCard(formData.idNumber)) {
      setIdCardError('请输入有效的身份证号码');
      toast({
        variant: 'destructive',
        title: '错误',
        description: '请输入有效的身份证号码',
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
        body: JSON.stringify({
          customerName: formData.customerName,
          idNumber: formData.idNumber,
          reason: formData.reason,
          evidence: formData.evidence,
          jobTitle: formData.jobTitle,
          industry: formData.industry,
          source: formData.source
        }),
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
      if (value.length !== 18) {
        setIdCardError('身份证号码必须为18位');
      } else if (!validateIdCard(value)) {
        setIdCardError('身份证号码格式不正确');
      } else {
        setIdCardError('');
      }
    } else if (name === 'idNumber' && !value) {
      setIdCardError('');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>提交申诉</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium">客户姓名</label>
            <Input
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              placeholder="请输入客户姓名"
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">职位</label>
            <Input
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              placeholder="请输入客户职位"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">行业</label>
            <Input
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              placeholder="请输入客户行业"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">来源</label>
            <Input
              name="source"
              value={formData.source}
              onChange={handleChange}
              placeholder="请输入客户来源"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">身份证号码</label>
            <Input
              name="idNumber"
              value={formData.idNumber}
              onChange={handleChange}
              placeholder="请输入身份证号码"
              className={idCardError ? "border-red-500" : ""}
              required
            />
            {idCardError && (
              <p className="text-xs text-red-500">{idCardError}</p>
            )}
            <p className="text-xs text-gray-500">请输入有效的18位居民身份证号码</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">申诉原因</label>
            <Textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="请详细说明申诉原因..."
              required
              rows={5}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">证据材料</label>
            <Input
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