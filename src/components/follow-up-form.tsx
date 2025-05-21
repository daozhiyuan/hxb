'use client';

import { useState, useEffect } from 'react';
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
  const [sessionChecked, setSessionChecked] = useState(false);
  const { data: session, status } = useSession();

  // 监控会话状态变化
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setSessionChecked(true);
      console.log('[FollowUpForm] 会话已初始化:', {
        userId: session.user.id,
        userIdType: typeof session.user.id,
        userEmail: session.user.email,
        userRole: session.user.role
      });
    } else if (status === 'unauthenticated') {
      setSessionChecked(true);
      console.warn('[FollowUpForm] 未认证状态');
    }
  }, [session, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 检查会话状态
    if (status === 'loading') {
      toast.info('正在加载用户信息，请稍后重试');
      console.log('[FollowUpForm] 会话正在加载中, 请稍后再试');
      return;
    }
    
    if (status !== 'authenticated' || !session) {
      toast.error('当前会话无效，请刷新页面重新登录');
      console.error('[FollowUpForm] 无效会话:', status, session);
      return;
    }
    
    // 详细检查用户ID
    if (!session?.user?.id) {
      toast.error('无法获取用户ID，请重新登录');
      console.error('[FollowUpForm] 会话中缺少用户ID:', session?.user);
      return;
    }
    
    console.log('[FollowUpForm] 用户ID信息:', {
      id: session.user.id,
      type: typeof session.user.id,
      role: session.user.role,
      email: session.user.email
    });

    if (!content.trim()) {
      toast.error('请输入跟进内容');
      return;
    }

    // 验证客户ID有效性
    if (!customerId || isNaN(Number(customerId))) {
      toast.error('无效的客户ID，无法添加跟进记录');
      console.error('[FollowUpForm] 尝试提交跟进记录时客户ID无效:', customerId, typeof customerId);
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[FollowUpForm] 发送跟进记录请求:', {
        customerId,
        content: content.trim().substring(0, 20) + '...',
        contentLength: content.trim().length,
        type,
        userId: session.user.id,
        userIdType: typeof session.user.id
      });

      const response = await fetch(`/api/crm/customers/${customerId}/follow-ups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          type,
          // 显式传递用户ID，避免在API端解析错误
          createdById: session.user.id
        }),
      });

      // 先读取响应数据，再检查响应状态
      const responseData = await response.json().catch(err => {
        console.error('[FollowUpForm] 解析响应数据失败:', err);
        return null;
      });
      
      console.log('[FollowUpForm] 服务器响应:', responseData);

      if (!response.ok) {
        throw new Error(responseData?.error || '添加跟进记录失败');
      }

      console.log('[FollowUpForm] 添加跟进记录成功:', responseData?.id);

      setContent('');
      toast.success('跟进记录添加成功');
      onSuccess();
    } catch (error) {
      console.error('[FollowUpForm] 添加跟进记录失败:', error);
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
          {!sessionChecked && status === 'loading' && (
            <span className="ml-2 text-xs text-amber-500">正在加载会话...</span>
          )}
          {sessionChecked && !session?.user?.id && (
            <span className="ml-2 text-xs text-red-500">会话无效，请刷新页面</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="follow-up-type" className="text-sm font-medium">跟进类型</label>
            <Select 
              value={type} 
              onValueChange={setType}
              name="type"
            >
              <SelectTrigger id="follow-up-type" className="w-full">
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
            <label htmlFor="follow-up-content" className="text-sm font-medium">跟进内容</label>
            <Textarea
              id="follow-up-content"
              name="content"
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