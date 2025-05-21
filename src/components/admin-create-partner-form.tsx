'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';

// Schema for the creation form (matches API)
const formSchema = z.object({
  name: z.string().min(1, { message: "名称不能为空" }).trim(),
  email: z.string().email({ message: "无效的邮箱格式" }).trim(),
  password: z.string().min(8, { message: "密码至少需要8位" }),
});

type PartnerFormValues = z.infer<typeof formSchema>;

interface CreatePartnerFormProps {
  onPartnerCreated?: () => void; // Optional callback after successful creation
}

export function AdminCreatePartnerForm({ onPartnerCreated }: CreatePartnerFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: PartnerFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        let errorMessage = "创建失败，请稍后重试。";
        if (response.status === 409) {
          errorMessage = result.message || "该邮箱已被注册。";
        } else if (response.status === 400) {
          errorMessage = result.message || "提交的数据无效，请检查。";
          // You could potentially display field-specific errors from result.errors
        } else {
            errorMessage = result.message || `服务器错误 (${response.status})`;
        }
        toast({
          title: "创建失败",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "创建成功",
          description: `合作伙伴账号 ${values.email} 已成功创建。`,
        });
        form.reset(); // Clear the form
        onPartnerCreated?.(); // Call the callback if provided (e.g., to refresh the partner list)
      }
    } catch (error) {
      console.error("创建合作伙伴表单提交错误:", error);
      toast({
        title: "网络错误",
        description: "无法连接到服务器，请检查您的网络连接。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-6 p-4 border rounded-md">
         <h3 className="text-lg font-medium mb-4">创建新合作伙伴</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入合作伙伴名称" {...field} disabled={isLoading} />
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
                    <Input type="email" placeholder="请输入登录邮箱" {...field} disabled={isLoading} />
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
                  <FormLabel>初始密码 *</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="设置初始登录密码 (至少8位)" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '创建中...' : '创建账号'}
            </Button>
          </form>
        </Form>
    </div>
  );
}
