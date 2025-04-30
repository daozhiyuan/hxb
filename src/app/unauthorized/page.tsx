'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="container mx-auto py-10 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">无权限访问</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            抱歉，您没有权限访问此页面
          </p>
          <Link href={session ? '/dashboard' : '/login'}>
            <Button>
              {session ? '返回仪表盘' : '返回登录'}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
} 