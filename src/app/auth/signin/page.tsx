'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// 创建一个内部组件来使用useSearchParams
function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    // 重定向到登录页面
    const loginUrl = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    router.replace(loginUrl);
  }, [router, callbackUrl]);

  return (
    <div className="text-center">
      <p className="text-gray-500">正在重定向到登录页面...</p>
    </div>
  );
}

// 主组件使用Suspense包裹内部组件
export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Suspense fallback={<p className="text-gray-500">加载中...</p>}>
        <SignInContent />
      </Suspense>
    </div>
  );
}

// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic'; 