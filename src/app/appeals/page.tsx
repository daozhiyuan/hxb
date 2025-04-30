'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppealStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Appeal {
  id: number;
  customerName: string;
  reason: string;
  status: AppealStatus;
  createdAt: string;
  partner: {
    name: string;
    email: string;
  };
  operator?: {
    name: string;
  };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const statusMap = {
  [AppealStatus.PENDING]: { label: '待处理', color: 'bg-yellow-500' },
  [AppealStatus.PROCESSING]: { label: '处理中', color: 'bg-blue-500' },
  [AppealStatus.APPROVED]: { label: '已通过', color: 'bg-green-500' },
  [AppealStatus.REJECTED]: { label: '已驳回', color: 'bg-red-500' },
};

export default function AppealsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AppealStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // 获取申诉列表
  const fetchAppeals = async () => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/appeals?${searchParams}`);
      if (!response.ok) throw new Error('获取申诉列表失败');

      const data = await response.json();
      setAppeals(data.items);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error instanceof Error ? error.message : '获取申诉列表失败',
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理状态筛选变化
  const handleStatusChange = (value: string) => {
    setStatusFilter(value as AppealStatus | '');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 处理页码变化
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 查看详情
  const handleViewDetails = (appealId: number) => {
    // 跳转到详情页
    window.location.href = \`/appeals/\${appealId}\`;
  };

  useEffect(() => {
    fetchAppeals();
  }, [pagination.page, statusFilter, searchQuery]);

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>申诉管理</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 筛选工具栏 */}
          <div className="mb-6 flex gap-4">
            <div className="w-[200px]">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部状态</SelectItem>
                  {Object.entries(statusMap).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                placeholder="搜索客户姓名或申诉原因..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>
          </div>

          {/* 申诉列表 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>客户姓名</TableHead>
                  <TableHead>申诉原因</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead>提交人</TableHead>
                  <TableHead>处理人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : appeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  appeals.map(appeal => (
                    <TableRow key={appeal.id}>
                      <TableCell>{appeal.id}</TableCell>
                      <TableCell>{appeal.customerName}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {appeal.reason}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusMap[appeal.status].color + ' text-white'}
                        >
                          {statusMap[appeal.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(appeal.createdAt), 'yyyy-MM-dd HH:mm', {
                          locale: zhCN,
                        })}
                      </TableCell>
                      <TableCell>{appeal.partner.name}</TableCell>
                      <TableCell>{appeal.operator?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(appeal.id)}
                        >
                          查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              共 {pagination.total} 条记录
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1 || loading}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  pagination.page === pagination.totalPages || loading
                }
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
