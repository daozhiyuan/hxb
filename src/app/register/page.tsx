'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form";

// Schema matching the registration API
const formSchema = z.object({
    name: z.string().min(1, { message: "名称不能为空" }).trim(),
    email: z.string().email({ message: "无效的邮箱格式" }).trim(),
    password: z.string().min(8, { message: "密码至少需要8位" }),
});

type RegisterFormValues = z.infer<typeof formSchema>;

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle errors (conflict, validation, server errors)
        setServerError(result.message || `注册失败 (${response.status})`);
        toast({
            title: "注册失败",
            description: result.message || "发生未知错误，请稍后重试。",
            variant: "destructive",
        });
      } else {
        // Handle success
        toast({
          title: "注册成功",
          description: result.message || "请等待管理员审核您的账号。", // Show message from API
        });
        // Optionally redirect to login page or a confirmation page
        // router.push('/login?registered=true'); // Example redirect
        form.reset(); // Clear form
        // Consider showing the success message more prominently instead of just a toast
        setServerError(result.message); // Display success message below form too
      }
    } catch (err) {
      console.error('Registration submission error:', err);
      const errorMessage = '发生网络错误，请稍后重试。';
      setServerError(errorMessage);
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
          <CardTitle className="text-2xl">合作伙伴注册</CardTitle>
          <CardDescription>
            输入信息以创建您的合作伙伴账号。
          </CardDescription>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid gap-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>公司/团队名称 *</FormLabel>
                        <FormControl>
                            <Input placeholder="请输入您的名称" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>登录邮箱 *</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="m@example.com" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>设置密码 *</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="输入至少8位密码" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                {serverError && (
                    <p className={`text-sm ${serverError.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
                        {serverError}
                    </p>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '注册中...' : '注册账号'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                   已有账号?{" "}
                    <Link href="/login" className="underline hover:text-primary">
                        前往登录
                    </Link>
                </p>
            </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}
