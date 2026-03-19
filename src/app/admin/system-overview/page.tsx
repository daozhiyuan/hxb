'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { isAdmin } from '@/lib/auth-helpers';

type Overview = {
  runtime: {
    status: 'OK';
    timestamp: string;
    nodeEnv: string;
    uptimeSeconds: number;
  };
  counts: {
    users: number;
    customers: number;
    appeals: number;
    pendingAppeals: number;
  };
};

export const dynamic = 'force-dynamic';

export default function SystemOverviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/system-overview', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `请求失败: ${res.status}`);
      }
      const json = (await res.json()) as Overview;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && !isAdmin(session)) {
      router.replace('/unauthorized');
      return;
    }
    if (status === 'authenticated' && isAdmin(session)) {
      fetchOverview();
    }
  }, [status, session, router]);

  if (status === 'loading' || loading) {
    return <div className="p-6">加载系统概览中...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系统概览</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchOverview}>刷新</Button>
          <Link href="/admin/super">
            <Button variant="secondary">返回超级管理</Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6 text-red-600">加载失败：{error}</CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>运行状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p>状态：{data.runtime.status}</p>
              <p>环境：{data.runtime.nodeEnv}</p>
              <p>运行时长：{data.runtime.uptimeSeconds} 秒</p>
              <p>采样时间：{new Date(data.runtime.timestamp).toLocaleString()}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">用户总数</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.counts.users}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">客户总数</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.counts.customers}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">申诉总数</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.counts.appeals}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">待处理申诉</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.counts.pendingAppeals}</CardContent></Card>
          </div>
        </>
      )}
    </div>
  );
}
