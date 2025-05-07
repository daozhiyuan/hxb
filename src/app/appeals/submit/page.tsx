'use client';

import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import AppealForm from '@/components/appeal-form';

// 创建一个内部组件来处理会话状态和重定向
function AppealFormWithAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 修改为仅检查用户是否登录，不再检查角色
    if (status !== 'loading' && !session) {
      router.push('/login?callbackUrl=/appeals/submit');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="text-center">加载中...</div>
    );
  }

  if (!session) {
    return (
      <div className="text-center">正在重定向到登录页面...</div>
    );
  }

  return <AppealForm />;
}

export default function SubmitAppealPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">提交申诉</h1>
        <Suspense fallback={<div className="text-center">加载中...</div>}>
          <AppealFormWithAuth />
        </Suspense>
      </div>
    </div>
  );
} 