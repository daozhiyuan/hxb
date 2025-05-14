'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppealStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShieldAlert, AlertTriangle } from 'lucide-react';
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
import Link from 'next/link';
import { isSuperAdmin } from '@/lib/auth-helpers';
import { IdCardType } from '@/lib/client-validation';

interface Appeal {
  id: number;
  customerName: string;
  idNumber: string;
  idCardType: IdCardType;
  reason: string;
  evidence: string | null;
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
  decryptionError?: string;
}

// 证件类型显示名称
const idCardTypeMap: Record<string, string> = {
  CHINA_MAINLAND: '中国大陆身份证',
  PASSPORT: '护照',
  HONG_KONG_ID: '香港身份证',
  FOREIGN_ID: '外国证件',
};

// 状态显示名称和颜色
const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待处理', color: 'bg-yellow-500' },
  PROCESSING: { label: '处理中', color: 'bg-blue-500' },
  APPROVED: { label: '已批准', color: 'bg-green-500' },
  REJECTED: { label: '已拒绝', color: 'bg-red-500' },
};

// 身份证号码显示组件
const IdNumberDisplay = ({ idNumber, idCardType, isSuper, decryptionError }: { 
  idNumber: string, 
  idCardType: IdCardType,
  isSuper: boolean, 
  decryptionError?: string 
}) => {
  if (!idNumber) return <p>保密</p>;
  
  // 处理特定的错误标识
  if (idNumber === '[加密数据]') { // 普通用户看到的固定掩码
    return <p>{idNumber}</p>;
  }
  
  // 超级管理员看到的解密错误
  if (isSuper && decryptionError) {
    return (
      <div className="space-y-1">
        <div className="flex items-center">
           {/* 显示原始加密数据 */}
          <p className="font-mono bg-red-50 p-1 border border-red-200 rounded text-xs break-all">
            {idNumber}
          </p>
          <ShieldAlert className="ml-1 h-4 w-4 text-red-500" aria-label="超级管理员视图" />
        </div>
        <p className="text-xs text-red-600 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          解密失败: {decryptionError}。请检查密钥或运行修复脚本。
        </p>
      </div>
    );
  }
  
  // 处理其他已知错误（向后兼容）
  if (idNumber === '[解密失败]' || idNumber === '[解密出错]') {
    return (
      <div className="flex items-center">
        <p className="text-yellow-600">{idNumber}</p>
        {isSuper && <AlertTriangle className="ml-1 h-4 w-4 text-yellow-500" aria-label="解密错误" />}
      </div>
    );
  }
  
  // 检查是否是标准加密格式 (IV:EncryptedHex)
  const isStandardEncryptedFormat = (text: string): boolean => {
    if (!text || typeof text !== 'string') return false;
    return text.includes(':') && /^[0-9a-f]+:[0-9a-f]+$/i.test(text);
  };
  
  // Base64格式检测 (主要用于显示警告，实际解密已在后端完成)
  const isPotentiallyBase64 = (text: string) => {
    if (!text || typeof text !== 'string' || text.length < 20 || text.length > 200) return false;
    return /^[A-Za-z0-9+/=_-]+$/.test(text) && !text.includes(':');
  };

  let displayIdNumber = idNumber;
  let isPossibleEncrypted = isPotentiallyBase64(idNumber) || isStandardEncryptedFormat(idNumber);
  let isValidId = isValidIdCardFormat(idNumber, idCardType);

  // 超级管理员视图 - 处理加密格式
  if (isSuper && isPossibleEncrypted && !isValidId) {
    return (
      <div className="space-y-1">
        <div className="flex items-center">
          <p className="font-mono bg-yellow-50 p-1 border border-yellow-200 rounded text-xs break-all">
            {idNumber}
          </p>
          <ShieldAlert className="ml-1 h-4 w-4 text-yellow-500" aria-label="超级管理员视图" />
        </div>
        <p className="text-xs text-yellow-600 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          警告：数据是加密格式，未能成功解密。请检查解密配置。
        </p>
      </div>
    );
  }

  // 超级管理员视图 - 显示完整解密后的号码
  if (isSuper && !isPossibleEncrypted) {
    return (
      <div className="flex items-center">
        <p className="font-mono bg-green-50 p-1 border border-green-200 rounded">{displayIdNumber}</p>
        <ShieldAlert className="ml-1 h-4 w-4 text-green-500" aria-label="超级管理员视图" />
      </div>
    );
  }
  
  // 普通用户视图 - 显示掩码
  let maskedIdNumber = displayIdNumber;
  if (idCardType === IdCardType.CHINA_MAINLAND && displayIdNumber.length >= 18) {
    maskedIdNumber = `${displayIdNumber.substring(0, 4)}************${displayIdNumber.substring(displayIdNumber.length - 2)}`;
  } else if (idCardType === IdCardType.PASSPORT && displayIdNumber.length >= 5) {
    const letterPart = displayIdNumber.match(/^[A-Z]+/i) || [''];
    maskedIdNumber = `${letterPart[0]}*****${displayIdNumber.substring(displayIdNumber.length - 1)}`;
  } else if (idCardType === IdCardType.HONG_KONG_ID && displayIdNumber.length >= 8) {
    const letterPart = displayIdNumber.match(/^[A-Z]+/i) || [''];
    const checkDigit = displayIdNumber.match(/\([0-9A]\)$/) || [''];
    maskedIdNumber = `${letterPart[0]}******${checkDigit[0] || displayIdNumber.substring(displayIdNumber.length - 1)}`;
  } else if (displayIdNumber.length > 4) {
    maskedIdNumber = `${displayIdNumber.substring(0, 2)}****${displayIdNumber.substring(displayIdNumber.length - 2)}`;
  }

  // 如果是无法识别的加密数据，普通用户也看到固定掩码
  if (isPossibleEncrypted || idNumber.startsWith('[') || maskedIdNumber === displayIdNumber) {
    maskedIdNumber = '[证件信息已加密]';
  }
  
  return <p>{maskedIdNumber}</p>;
};

// 新增：辅助函数检查证件号码格式（简化版，仅用于前端提示）
function isValidIdCardFormat(text: string, idCardType: IdCardType): boolean {
  if (!text) return false;
  switch (idCardType) {
    case IdCardType.CHINA_MAINLAND: return /^\d{17}[\dX]$/i.test(text);
    case IdCardType.PASSPORT: return /^[A-Z]{1,2}\d{7,8}$/i.test(text);
    case IdCardType.HONG_KONG_ID: return /^[A-Z][0-9]{6}(\([0-9A]\))?$/i.test(text);
    case IdCardType.FOREIGN_ID: return text.length >= 5;
    default: return false;
  }
}

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
  const [error, setError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // 判断当前用户是否为超级管理员
  const isSuper = isSuperAdmin(session);

  const fetchAppealDetail = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/appeals/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('找不到申诉记录');
        } else if (response.status === 403) {
          setError('您没有权限查看此申诉');
        } else {
          setError(`请求错误: ${response.status}`);
        }
        setAppeal(null);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setAppeal(data.data);
      } else {
        setError(data.error || '获取申诉详情失败');
        setAppeal(null);
      }
    } catch (err) {
      console.error('获取申诉详情出错:', err);
      setError('网络错误，请稍后重试');
      setAppeal(null);
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

  // 处理删除申诉
  const handleDeleteAppeal = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/appeals/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除申诉失败');
      }

      toast({
        title: '成功',
        description: '申诉记录已删除',
      });

      // 删除成功后跳转到申诉列表页面
      router.push('/appeals');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error instanceof Error ? error.message : '删除申诉失败',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  useEffect(() => {
    fetchAppealDetail();
  }, [params.id]);

  // 使用 ClientProvider 包装页面
  return (
    <ClientProvider requireAuth>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>加载申诉详情中...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md">
            <p><strong>错误:</strong> {error}</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => fetchAppealDetail()}
            >
              重试
            </Button>
          </div>
        </div>
      ) : !appeal ? (
        <div className="flex justify-center items-center h-64">
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 px-4 py-3 rounded-md">
            <p>未找到申诉记录或无法获取详情</p>
          </div>
        </div>
      ) : (
        <div className="container mx-auto py-8">
          <Card className="border-none shadow-md">
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
                {/* 超级管理员删除按钮 */}
                {isSuper && (
                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">删除申诉</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>确认删除</DialogTitle>
                        <DialogDescription>
                          您确定要删除此申诉记录吗？此操作无法撤销。
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteDialog(false)}
                        >
                          取消
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={handleDeleteAppeal} 
                          disabled={deleting}
                        >
                          {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          确认删除
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                {(session?.user?.role === 'ADMIN' || isSuper) && appeal.status !== AppealStatus.APPROVED && appeal.status !== AppealStatus.REJECTED && (
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
                      <label className="text-sm text-gray-500">证件类型</label>
                      <p>{appeal?.idCardType && idCardTypeMap[appeal.idCardType] || '未知证件类型'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">证件号码</label>
                      <IdNumberDisplay 
                        idNumber={appeal.idNumber} 
                        idCardType={appeal.idCardType} 
                        isSuper={isSuper} 
                        decryptionError={appeal.decryptionError}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">当前状态</label>
                      <div>
                        <Badge
                          variant="secondary"
                          className={(appeal?.status && statusMap[appeal.status]?.color) || 'bg-gray-500' + ' text-white'}
                        >
                          {(appeal?.status && statusMap[appeal.status]?.label) || '未知状态'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">提交时间</label>
                      <p>
                        {appeal?.createdAt ? 
                          format(new Date(appeal.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })
                          : '未知时间'}
                      </p>
                    </div>
                    
                    {/* 添加更新时间显示 */}
                    <div>
                      <label className="text-sm text-gray-500">更新时间</label>
                      <p>
                        {appeal?.updatedAt ? 
                          format(new Date(appeal.updatedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })
                          : '未知时间'}
                      </p>
                    </div>
                    
                    {/* 添加处理人信息 */}
                    {appeal.operator && (
                      <div>
                        <label className="text-sm text-gray-500">处理人</label>
                        <p>{appeal.operator.name || '未知'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 申诉原因 */}
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">申诉原因</h3>
                  <p className="whitespace-pre-wrap">{appeal?.reason || '无申诉原因'}</p>
                </div>

                {/* 证据材料 */}
                {appeal?.evidence && (
                  <div className="grid gap-4">
                    <h3 className="text-lg font-medium">证据材料</h3>
                    <div className="grid gap-2">
                      {appeal.evidence.split(',').map((file: string, index: number) => {
                        const fileName = file.trim();
                        if (!fileName) return null;
                        const displayName = fileName.split('/').pop() || fileName;
                        return (
                          <Link
                            key={index}
                            href={fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                              />
                            </svg>
                            {displayName}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 处理记录 */}
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">处理记录</h3>
                  <div className="space-y-4">
                    {appeal?.logs && appeal.logs.length > 0 ? (
                      appeal.logs.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-lg border p-4 text-sm space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{log.operator?.name || '未知操作员'}</span>
                            <span className="text-gray-500">
                              {log.createdAt ? 
                                format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })
                                : '未知时间'}
                            </span>
                          </div>
                          <p>{log.remarks || log.action || '无详细记录'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">暂无处理记录</p>
                    )}
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