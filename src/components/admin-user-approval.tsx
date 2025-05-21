import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

interface PendingUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export function AdminUserApproval() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // 获取待审核用户列表
  const fetchPendingUsers = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    setLoading(true);
    setError(null);

    try {
      console.log(`尝试获取待审核用户列表 (第 ${retryCount + 1} 次)`);
      const response = await fetch('/api/admin/users/pending', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取待审核用户列表失败');
      }

      const data = await response.json();
      if (!data.users || !Array.isArray(data.users)) {
        throw new Error('返回数据格式不正确');
      }

      setPendingUsers(data.users);
      console.log(`成功获取到 ${data.users.length} 个待审核用户`);
    } catch (error) {
      console.error('获取待审核用户列表失败:', error);
      setError(error instanceof Error ? error.message : '未知错误');

      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.log(`${delay}ms 后重试...`);
        setTimeout(() => fetchPendingUsers(retryCount + 1), delay);
      } else {
        toast({
          variant: 'destructive',
          title: '错误',
          description: '获取待审核用户列表失败，请稍后重试',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // 处理用户激活/禁用
  const handleUserActivation = async (userId: number, activate: boolean) => {
    console.log('按钮点击事件触发:', { userId, activate });
    setLoading(true);
    try {
      console.log(`开始${activate ? '激活' : '禁用'}用户 ${userId}...`);
      
      const url = `/api/admin/users/${userId}/activate`;
      console.log('请求URL:', url);
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ isActive: activate }),
      });

      console.log('收到响应:', response.status);
      const data = await response.json();
      console.log('响应数据:', data);
      
      if (!response.ok) {
        console.error('操作失败:', data);
        throw new Error(data.message || '操作失败');
      }

      console.log('操作成功:', data);
      toast({
        title: '成功',
        description: data.message,
      });

      // 刷新用户列表
      console.log('开始刷新用户列表...');
      await fetchPendingUsers();
      console.log('用户列表刷新完成');
    } catch (error) {
      console.error('操作失败:', error);
      toast({
        variant: 'destructive',
        title: '错误',
        description: error instanceof Error ? error.message : '操作失败，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取待审核用户列表
  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>待审核用户</CardTitle>
        <CardDescription>管理待审核的合作伙伴账号</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && pendingUsers.length === 0 ? (
          <p className="text-center text-muted-foreground">加载中...</p>
        ) : error ? (
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchPendingUsers()} variant="outline">
              重试
            </Button>
          </div>
        ) : pendingUsers.length === 0 ? (
          <p className="text-center text-muted-foreground">暂无待审核用户</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        console.log('通过按钮点击:', user.id);
                        handleUserActivation(user.id, true);
                      }}
                      className="mr-2"
                    >
                      通过
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        console.log('拒绝按钮点击:', user.id);
                        handleUserActivation(user.id, false);
                      }}
                    >
                      拒绝
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 