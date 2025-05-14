'use client';

import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, UserPlus, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function AdminPartnerList() {
  const router = useRouter();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // 加载合作伙伴列表
  const fetchPartners = async (page = 1, searchTerm = '') => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      const response = await fetch(`/api/admin/partners?${queryParams}`);
      if (!response.ok) {
        throw new Error('获取合作伙伴列表失败');
      }
      
      const data = await response.json();
      setPartners(data.partners);
      setPagination(data.pagination);
    } catch (error) {
      console.error('获取合作伙伴列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners(pagination.page, search);
  }, [pagination.page]);

  // 点击创建新合作伙伴按钮
  const handleCreatePartner = () => {
    // TODO: 实现创建合作伙伴的功能
    console.log('点击了创建合作伙伴按钮');
  };

  // 点击查看详情按钮
  const handleViewDetails = (partnerId: number) => {
    router.push(`/admin/users/${partnerId}`);
  };

  // 处理搜索
  const handleSearch = () => {
    fetchPartners(1, search);
  };

  // 处理翻页
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 格式化创建时间
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd', { locale: zhCN });
    } catch {
      return '';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">合作伙伴管理</h2>
        <Button onClick={handleCreatePartner}>
          <UserPlus className="mr-2 h-4 w-4" />
          添加合作伙伴
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="搜索合作伙伴..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} variant="outline">搜索</Button>
      </div>

      {loading ? (
        <div className="text-center py-10">加载中...</div>
      ) : partners.length === 0 ? (
        <div className="text-center py-10">暂无合作伙伴数据</div>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableCaption>合作伙伴列表</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>公司名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>客户数量</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.id}</TableCell>
                    <TableCell>{partner.name || '未设置'}</TableCell>
                    <TableCell>{partner.email}</TableCell>
                    <TableCell>{partner.companyName || '未设置'}</TableCell>
                    <TableCell>
                      {partner.isActive ? (
                        <span className="inline-flex items-center text-green-600">
                          <CheckCircle className="mr-1 h-4 w-4" /> 已激活
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-600">
                          <XCircle className="mr-1 h-4 w-4" /> 未激活
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{partner._count?.customers || 0}</TableCell>
                    <TableCell>{formatDate(partner.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewDetails(partner.id)}
                      >
                        <Eye className="mr-1 h-4 w-4" /> 详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页控件 */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                上一页
              </Button>
              <span>
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
