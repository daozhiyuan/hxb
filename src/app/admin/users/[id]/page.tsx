'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdminPartnerDetail } from '@/components/admin-partner-detail';
import { isAdmin } from '@/lib/auth-helpers';

interface PageProps {
  params: {
    id: string;
  };
}

export default function PartnerDetailPage({ params }: PageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = params;

  // 验证管理员权限
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !isAdmin(session)) {
      router.push('/unauthorized');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[300px]">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (status === 'authenticated' && isAdmin(session)) {
    return (
      <div className="container mx-auto py-8">
        <AdminPartnerDetail partnerId={id} />
      </div>
    );
  }

  return null;
} 