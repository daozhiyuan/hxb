'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { isAdmin } from '@/lib/auth-helpers';

type QualityData = {
  status: 'OK';
  generatedAt: string;
  latestSiteAudit: null | {
    name: string;
    path: string;
    updatedAt: string;
    sizeBytes: number;
  };
  siteAuditCount: number;
  suggestedCommands: string[];
};

export const dynamic = 'force-dynamic';

export default function AdminQualityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QualityData | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/quality-overview', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `请求失败: ${res.status}`);
      }
      setData((await res.json()) as QualityData);
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
      load();
    }
  }, [status, session, router]);

  if (status === 'loading' || loading) {
    return <div className="p-6">加载质量概览中...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">质量与验收概览</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>刷新</Button>
          <Link href="/admin/system-overview">
            <Button variant="secondary">返回系统概览</Button>
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
              <CardTitle>最近审计报告</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>报告总数：{data.siteAuditCount}</p>
              {data.latestSiteAudit ? (
                <div className="space-y-1">
                  <p>文件：{data.latestSiteAudit.name}</p>
                  <p>更新时间：{new Date(data.latestSiteAudit.updatedAt).toLocaleString()}</p>
                  <p>大小：{data.latestSiteAudit.sizeBytes} bytes</p>
                </div>
              ) : (
                <p>暂无站点审计报告</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>建议验收命令</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1">
                {data.suggestedCommands.map((cmd) => (
                  <li key={cmd} className="font-mono text-sm">{cmd}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
