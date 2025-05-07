'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { CustomLink } from '@/components/ui/custom-link';
import { useEffect } from 'react';

// 创建一个内部组件来使用useSearchParams
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 处理URL参数中可能存在的错误信息
  useEffect(() => {
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      let errorMessage = '登录失败';
      
      switch (errorParam) {
        case 'CredentialsSignin':
          errorMessage = '邮箱或密码错误';
          break;
        case 'SessionRequired':
          errorMessage = '请先登录';
          break;
        default:
          errorMessage = `登录失败: ${errorParam}`;
      }
      
      setError(errorMessage);
      
      toast({
        variant: 'destructive',
        title: '认证错误',
        description: errorMessage,
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      if (!email || !password) {
        throw new Error('请输入邮箱和密码');
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: callbackUrl
      });

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: '登录失败',
          description: result.error,
        });
        setError(result.error);
        return;
      }

      toast({
        title: '登录成功',
        description: '正在跳转...',
      });

      // 使用setTimeout延迟跳转，确保toast能够显示
      setTimeout(() => {
        router.push(callbackUrl);
        router.refresh();
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录过程中发生错误';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: '登录失败',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>登录</CardTitle>
        <CardDescription>
          登录您的账号以继续
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-2 bg-red-50 text-red-600 rounded text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="请输入邮箱"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="请输入密码"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </Button>
          <div className="text-center text-sm">
            <CustomLink href="/register" prefetch={false} className="text-blue-500 hover:underline">
              还没有账号？立即注册
            </CustomLink>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// 主组件使用Suspense包裹内部组件
export default function LoginPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-md mx-auto">
        <Suspense fallback={<p className="text-center">加载中...</p>}>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}

