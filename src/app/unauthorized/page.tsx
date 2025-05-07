'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense } from 'react';

// 创建包含useSession逻辑的内部组件
function UnauthorizedContent() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">加载中...</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            正在加载页面，请稍候...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">无权限访问</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          抱歉，您没有权限访问此页面
        </p>
        <Link href={session ? '/dashboard' : '/login'} prefetch={false}>
          <Button>
            {session ? '返回仪表盘' : '返回登录'}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// 主组件使用Suspense包装内部组件
export default function UnauthorizedPage() {
  return (
    <div className="container mx-auto py-10 flex items-center justify-center min-h-screen">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">加载中...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">正在加载页面，请稍候...</p>
          </CardContent>
        </Card>
      }>
        <UnauthorizedContent />
      </Suspense>
    </div>
  );
} 