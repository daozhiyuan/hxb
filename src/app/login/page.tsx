'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast'; 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false, 
        email,
        password,
      });

      if (result?.error) {
        // Check if the error is due to inactive account (this relies on the authorize callback returning null for inactive users)
        // The default error from NextAuth might be generic, so customize the message.
        setError('登录失败：邮箱或密码错误，或账号等待管理员审核激活。'); 
        toast({
          title: "登录失败",
          description: "请检查您的邮箱和密码，或联系管理员确认账号状态。",
          variant: "destructive",
        });
        console.error('Sign-in error:', result.error);
      } else if (result?.ok) {
        toast({
          title: "登录成功",
          description: "即将跳转到仪表盘...",
        });
        router.push('/dashboard');
      } else {
         setError('发生未知错误，请重试。');
         toast({
            title: "登录出错",
            description: "发生未知错误，请稍后重试。",
            variant: "destructive",
         });
      }
    } catch (err) {
      console.error('Login submission error:', err);
      setError('发生网络错误，请稍后重试。');
      toast({
        title: "网络错误",
        description: "无法连接到服务器，请检查您的网络连接。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">登录</CardTitle>
          <CardDescription>
            输入您的邮箱和密码登录系统。
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4"> {/* Updated footer for stacking */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '登录中...' : '登录'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              还没有账号?{" "}
              <Link href="/register" className="underline hover:text-primary">
                立即注册合作伙伴
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
