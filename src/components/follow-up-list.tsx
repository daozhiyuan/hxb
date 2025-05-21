'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isValid } from 'date-fns';
import { User, MessageCircle, Phone, Calendar, Mail, CalendarIcon, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { zhCN } from 'date-fns/locale';

interface FollowUp {
  id: number;
  content: string;
  createdAt: string;
  type: string;
  createdBy: {
    id: number;
    name: string | null;
    email: string;
  };
}

interface FollowUpListProps {
  customerId: number;
}

export function FollowUpList({ customerId }: FollowUpListProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    console.log(`[FollowUpList] 组件挂载，客户ID: ${customerId}，类型: ${typeof customerId}`);
  }, [customerId]);

  useEffect(() => {
    if (customerId && !isNaN(Number(customerId))) {
      fetchFollowUps();
    } else {
      console.error('无效的客户ID:', customerId, typeof customerId);
      setError(`客户ID无效 (${customerId})，无法加载跟进记录`);
      setIsLoading(false);
    }
  }, [customerId]);

  const fetchFollowUps = async (nextPage = 1) => {
    if (!customerId || isNaN(Number(customerId))) {
      console.error('尝试请求跟进记录时客户ID无效:', customerId);
      setError('客户ID无效，无法加载跟进记录');
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }
    
    const isInitialLoad = nextPage === 1;
    
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    setError('');

    try {
      console.log(`[FollowUpList] 获取客户ID ${customerId} 的跟进记录, 页码: ${nextPage}`);
      const response = await fetch(`/api/crm/customers/${customerId}/follow-ups?page=${nextPage}&pageSize=${pageSize}`);
      if (!response.ok) {
        throw new Error('获取跟进记录失败');
      }
      
      const result = await response.json();
      console.log(`[FollowUpList] 获取到的跟进记录响应:`, result);
      
      const data = result.data || [];
      const pagination = result.pagination || { totalPages: 0, total: 0 };
      
      if (isInitialLoad) {
        setFollowUps(data);
      } else {
        setFollowUps(prev => [...prev, ...data]);
      }
      
      setTotalPages(pagination.totalPages);
      setHasMore(nextPage < pagination.totalPages);
    } catch (error) {
      console.error('获取跟进记录失败:', error);
      setError('获取跟进记录失败，请重试');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFollowUps(nextPage);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MEETING':
        return <CalendarIcon className="h-4 w-4 text-blue-500" />;
      case 'CALL':
        return <Phone className="h-4 w-4 text-green-500" />;
      case 'EMAIL':
        return <Mail className="h-4 w-4 text-purple-500" />;
      case 'VISIT':
        return <User className="h-4 w-4 text-amber-500" />;
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'MEETING':
        return '会议';
      case 'CALL':
        return '电话';
      case 'EMAIL':
        return '邮件';
      case 'VISIT':
        return '拜访';
      default:
        return '其他';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'MEETING':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'CALL':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'EMAIL':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'VISIT':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDateSafe = (dateString: string | null | undefined, formatPattern = 'yyyy-MM-dd HH:mm'): string => {
    if (!dateString) return '-';
    
    try {
      console.log(`[FollowUpList] 尝试格式化日期: ${dateString}, 类型: ${typeof dateString}`);
      
      const date = new Date(dateString);
      
      if (!isValid(date)) {
        console.warn(`[FollowUpList] 无效的日期值: ${dateString}, 类型: ${typeof dateString}`);
        return String(dateString);
      }
      
      const year = date.getFullYear();
      if (year < 1970 || year > 2100) {
        console.warn(`[FollowUpList] 日期年份超出合理范围: ${year}, 原始值: ${dateString}`);
        return String(dateString);
      }
      
      return format(date, formatPattern, { locale: zhCN });
    } catch (error) {
      console.error('[FollowUpList] 日期格式化错误:', error, dateString, typeof dateString);
      return String(dateString || '-');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>跟进记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3].map((index) => (
              <div key={index} className="space-y-2 border-b pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (followUps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>跟进记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <div className="text-lg font-medium mb-1">暂无跟进记录</div>
            <p className="text-sm">添加第一条跟进记录，记录与客户的沟通情况。</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <MessageCircle className="h-5 w-5 mr-2 text-primary" />
          跟进记录
          <Badge variant="outline" className="ml-2">
            {followUps.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {followUps.map((followUp) => (
            <div key={followUp.id} className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    {followUp.createdBy?.name || (followUp.createdBy?.email ? followUp.createdBy.email.split('@')[0] : '未知用户')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateSafe(followUp.createdAt)}
                  </span>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getTypeBadgeColor(followUp.type)}`}>
                    {getTypeIcon(followUp.type)}
                    <span className="ml-1">{getTypeText(followUp.type)}</span>
                  </span>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{followUp.content}</p>
            </div>
          ))}
        </div>
        
        {hasMore && (
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadMore} 
              disabled={isLoadingMore}
              className="w-full"
            >
              {isLoadingMore ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⟳</span> 加载中...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <ArrowDown className="h-4 w-4 mr-1" /> 加载更多
                </span>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 