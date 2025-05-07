'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppealStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ClientProvider } from '@/components/client-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';

interface Appeal {
  id: number;
  customerName: string;
  idNumber: string;
  reason: string;
  evidence: string[];
  status: AppealStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  partner: {
    name: string;
    email: string;
  };
  operator?: {
    name: string;
    email: string;
  };
  logs: Array<{
    id: number;
    action: string;
    remarks?: string;
    createdAt: string;
    operator: {
      name: string;
    };
  }>;
}

const statusMap = {
  [AppealStatus.PENDING]: { label: '待处理', color: 'bg-yellow-500' },
  [AppealStatus.PROCESSING]: { label: '处理中', color: 'bg-blue-500' },
  [AppealStatus.APPROVED]: { label: '已通过', color: 'bg-green-500' },
  [AppealStatus.REJECTED]: { label: '已驳回', color: 'bg-red-500' },
};

export default function AppealDetail({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<AppealStatus | ''>('');
  const [remarks, setRemarks] = useState('');
  const router = useRouter();

  const fetchAppealDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/appeals/${params.id}`);
      if (!response.ok) throw new Error('获取申诉详情失败');

      const data = await response.json();
      setAppeal(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error instanceof Error ? error.message : '获取申诉详情失败',
      });
    } finally {
      setLoading(false);
    }
  };

  // 更新申诉状态
  const handleUpdateStatus = async () => {
    if (!newStatus || !remarks) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '请选择新状态并填写处理备注',
      });
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/appeals/${params.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          remarks,
        }),
      });

      if (!response.ok) throw new Error('更新申诉状态失败');

      const updatedAppeal = await response.json();
      setAppeal(updatedAppeal);
      setShowUpdateDialog(false);
      setNewStatus('');
      setRemarks('');

      toast({
        title: '成功',
        description: '申诉状态已更新',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error instanceof Error ? error.message : '更新申诉状态失败',
      });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchAppealDetail();
  }, [params.id]);

  // 使用 ClientProvider 包装页面
  return (
    <ClientProvider requireAuth>
      {loading ? (
        <div className="container mx-auto py-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !appeal ? (
        <div className="container mx-auto py-10">
          <Card>
            <CardContent className="py-10 text-center">
              申诉不存在或已被删除
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="container mx-auto py-10">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>申诉详情 #{appeal.id}</CardTitle>
              <div className="flex gap-2">
                {appeal.status === AppealStatus.REJECTED && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      router.push(`/appeals/new?previousAppealId=${appeal.id}`);
                    }}
                  >
                    重新上诉
                  </Button>
                )}
                {session?.user?.role === 'ADMIN' && appeal.status !== AppealStatus.APPROVED && appeal.status !== AppealStatus.REJECTED && (
                  <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
                    <DialogTrigger asChild>
                      <Button>更新状态</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>更新申诉状态</DialogTitle>
                        <DialogDescription>
                          请选择新状态并填写处理备注
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <label>新状态</label>
                          <Select
                            value={newStatus}
                            onValueChange={(value) => setNewStatus(value as AppealStatus)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择新状态" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusMap).map(([value, { label }]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <label>处理备注</label>
                          <Textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="请输入处理备注..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowUpdateDialog(false)}
                        >
                          取消
                        </Button>
                        <Button onClick={handleUpdateStatus} disabled={updating}>
                          {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          确认
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* 基本信息 */}
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">基本信息</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">客户姓名</label>
                      <p>{appeal.customerName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">身份证号码</label>
                      <p>{appeal.idNumber ? appeal.idNumber : '保密'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">当前状态</label>
                      <div>
                        <Badge
                          variant="secondary"
                          className={statusMap[appeal.status]?.color || 'bg-gray-500' + ' text-white'}
                        >
                          {statusMap[appeal.status]?.label || '未知状态'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">提交时间</label>
                      <p>
                        {appeal.createdAt ? format(new Date(appeal.createdAt), 'yyyy-MM-dd HH:mm:ss', {
                          locale: zhCN,
                        }) : '未知时间'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 申诉原因 */}
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">申诉原因</h3>
                  <p className="whitespace-pre-wrap">{appeal.reason}</p>
                </div>

                {/* 证据材料 */}
                {appeal.evidence && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">证据材料</h3>
                    <div className="grid gap-2">
                      {appeal.evidence.split(',').map((file, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Icons.fileText className="h-4 w-4 text-gray-500" />
                          <a
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            证据文件 {index + 1}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 处理记录 */}
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">处理记录</h3>
                  <div className="space-y-4">
                    {appeal.logs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border p-4 text-sm space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{log.operator.name}</span>
                          <span className="text-gray-500">
                            {log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss', {
                              locale: zhCN,
                            }) : '未知时间'}
                          </span>
                        </div>
                        <p>{log.remarks}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ClientProvider>
  );
}