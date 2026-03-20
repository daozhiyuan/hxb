'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { isAdmin } from '@/lib/auth-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

type Suggestion = {
  id: string;
  level: 'info' | 'medium' | 'high';
  title: string;
  description: string;
};

export default function AdminAssistantPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated' && !isAdmin(session)) router.replace('/unauthorized');
    if (status === 'authenticated' && isAdmin(session)) {
      fetch('/api/admin/assistant-suggestions', { cache: 'no-store' })
        .then((r) => r.json())
        .then((json) => setSuggestions(json.data?.suggestions || []));
    }
  }, [status, session, router]);

  if (status === 'loading') return <div className="p-6">加载中...</div>;

  return (
    <div className="container mx-auto py-8 space-y-4">
      <h1 className="text-2xl font-bold">智能助手（规则建议版）</h1>
      {suggestions.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">级别：{item.level}</p>
            <p>{item.description}</p>
          </CardContent>
        </Card>
      ))}
      {suggestions.length === 0 && <p className="text-sm text-gray-500">当前暂无建议</p>}
    </div>
  );
}
