import { useEffect, useState } from 'react';
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
  const { toast } = useToast();

  // 获取待审核用户列表
  const fetchPendingUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/pending');
      if (!response.ok) {
        throw new Error('获取待审核用户列表失败');
      }
      const data = await response.json();
      setPendingUsers(data.users);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '获取待审核用户列表失败，请稍后重试',
      });
    }
  };

  // 处理用户激活/禁用
  const handleUserActivation = async (userId: number, activate: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/activate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: activate }),
      });

      if (!response.ok) {
        throw new Error('操作失败');
      }

      const data = await response.json();
      toast({
        title: '成功',
        description: data.message,
      });

      // 刷新用户列表
      fetchPendingUsers();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '操作失败，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取待审核用户列表
  useEffect(() => {
    fetchPendingUsers();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>待审核用户</CardTitle>
        <CardDescription>管理待审核的合作伙伴账号</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
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
                      onClick={() => handleUserActivation(user.id, true)}
                      disabled={loading}
                      className="mr-2"
                    >
                      通过
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUserActivation(user.id, false)}
                      disabled={loading}
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