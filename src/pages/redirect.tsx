import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerSideProps } from '@/lib/static-page-props';
import { useSession } from 'next-auth/react';

// 导出getServerSideProps以确保使用SSR
export { getServerSideProps };

export default function RedirectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { to = '/dashboard' } = router.query;

  useEffect(() => {
    if (status === 'loading') return;

    if (session) {
      // 如果已登录，重定向到目标页面
      setTimeout(() => {
        router.push(typeof to === 'string' ? to : '/dashboard');
      }, 1000);
    } else {
      // 如果未登录，重定向到登录页面
      router.push(`/login?callbackUrl=${encodeURIComponent(typeof to === 'string' ? to : '/dashboard')}`);
    }
  }, [router, session, status, to]);

  return (
    <div className="container mx-auto py-10 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">正在重定向</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            {status === 'loading' 
              ? '正在加载...' 
              : session 
                ? '正在重定向到目标页面...' 
                : '正在重定向到登录页面...'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 