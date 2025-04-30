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
import { validateIdCard } from '@/lib/encryption';

export default function AppealForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    idNumber: '',
    reason: '',
    evidence: [] as string[],
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

    if (!validateIdCard(formData.idNumber)) {
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
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '提交申诉失败');
      }

      const appeal = await response.json();
      toast({
        title: '成功',
        description: '申诉已提交，请等待处理',
      });

      // 跳转到申诉详情页
      // 错误写法
      // router.push(\`/appeals/\${appeal.id}\`);
      
      // 正确写法
      router.push(`/appeals/${appeal.id}`);
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
            <label className="text-sm font-medium">身份证号码</label>
            <Input
              name="idNumber"
              value={formData.idNumber}
              onChange={handleChange}
              placeholder="请输入身份证号码"
              required
            />
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
              accept="image/*,.pdf,.doc,.docx"
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