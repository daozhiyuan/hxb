'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, MessageCircle, Phone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface FollowUpFormProps {
  customerId: number;
  onSuccess: () => void;
}

export function FollowUpForm({ customerId, onSuccess }: FollowUpFormProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState('MEETING');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      toast.error('请先登录');
      return;
    }

    if (!content.trim()) {
      toast.error('请输入跟进内容');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('发送请求:', {
        customerId,
        content,
        type,
      });

      const response = await fetch(`/api/crm/customers/${customerId}/follow-ups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '添加跟进记录失败');
      }

      setContent('');
      toast.success('跟进记录添加成功');
      onSuccess();
    } catch (error) {
      console.error('添加跟进记录失败:', error);
      toast.error(error instanceof Error ? error.message : '添加跟进记录失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <MessageCircle className="h-5 w-5 mr-2 text-primary" />
          添加跟进记录
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">跟进类型</label>
            <Select 
              value={type} 
              onValueChange={setType}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择跟进类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEETING">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    会议
                  </div>
                </SelectItem>
                <SelectItem value="CALL">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    电话
                  </div>
                </SelectItem>
                <SelectItem value="EMAIL">
                  <div className="flex items-center">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    邮件
                  </div>
                </SelectItem>
                <SelectItem value="VISIT">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    拜访
                  </div>
                </SelectItem>
                <SelectItem value="OTHER">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">跟进内容</label>
            <Textarea
              placeholder="请输入详细的跟进内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-y"
              disabled={isSubmitting}
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full"
          >
            {isSubmitting ? '提交中...' : '提交跟进记录'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 