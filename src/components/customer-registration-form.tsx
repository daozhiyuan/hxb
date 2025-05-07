'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';
// 不再直接引入Prisma枚举
// import { customers_status } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerStatusEnum, CustomerStatusText } from "@/config/client-config";

// 客户状态枚举值列表，用于zod
const validStatuses = Object.values(CustomerStatusEnum);

// Re-define the schema for client-side validation (can be shared from a common file later)
const formSchema = z.object({
  name: z.string().min(1, { message: "客户姓名不能为空" }).trim(),
  companyName: z.string().optional().nullable(),
  lastYearRevenue: z.string()
      .refine(value => !isNaN(Number(value)), {
          message: "去年营收必须是数字",
      })
      .optional()
      .nullable(),
  idCardNumber: z.string().regex(/^\d{17}(\d|X)$/i, { message: "请输入有效的18位身份证号码" }).trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(validStatuses as [string, ...string[]]).default(CustomerStatusEnum.FOLLOWING),
  notes: z.string().optional(),
  jobTitle: z.string().optional().nullable(), // Added jobTitle
});

type CustomerFormValues = z.infer<typeof formSchema>;

export function CustomerRegistrationForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      companyName: "",
      lastYearRevenue: "",
      idCardNumber: "",
      phone: "",
      address: "",
      status: CustomerStatusEnum.FOLLOWING,
      notes: "",
      jobTitle: "", // Added jobTitle
    },
  });

  async function onSubmit(values: CustomerFormValues) {
    setIsLoading(true);
    console.log("Submitting values:", values);

    try {
      const response = await fetch('/api/customers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle errors (conflict, validation, server errors)
        let errorMessage = "报备失败，请稍后重试。";
        if (response.status === 409) {
          errorMessage = result.message || "冲突：该客户已被报备。";
        } else if (response.status === 400) {
          errorMessage = result.message || "提交的数据无效，请检查。";
          // Optionally parse result.errors if needed
        } else {
            errorMessage = result.message || `服务器错误 (${response.status})`;
        }
        toast({
          title: "报备失败",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        // Handle success
        toast({
          title: "报备成功",
          description: `客户 ${values.name} 已成功报备。`,
        });
        form.reset(); // Clear the form after successful submission
      }
    } catch (error) {
      console.error("客户报备表单提交错误:", error);
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 border p-4 rounded-md">
        <h3 className="text-lg font-medium">客户报备表单</h3>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>客户姓名 *</FormLabel>
              <FormControl>
                <Input placeholder="请输入客户姓名" {...field} disabled={isLoading} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
          <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>单位名称</FormLabel>
                      <FormControl>
                          <Input placeholder="请输入单位名称 (可选)" {...field} disabled={isLoading} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
              )}
          />
          <FormField
              control={form.control}
              name="lastYearRevenue"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>去年营收</FormLabel>
                      <FormControl>
                          <Input placeholder="请输入去年营收 (可选)" {...field} disabled={isLoading} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
              )}
          />
           <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>职务</FormLabel>
                      <FormControl>
                          <Input placeholder="请输入客户职务 (可选)" {...field} disabled={isLoading} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
              )}
          />
        <FormField
          control={form.control}
          name="idCardNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>身份证号码 *</FormLabel>
              <FormControl>
                <Input placeholder="请输入18位身份证号码" {...field} disabled={isLoading} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>联系电话</FormLabel>
              <FormControl>
                <Input placeholder="请输入客户联系电话 (可选)" {...field} value={field.value || ''} disabled={isLoading}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>联系地址</FormLabel>
              <FormControl>
                <Input placeholder="请输入客户联系地址 (可选)" {...field} value={field.value || ''} disabled={isLoading}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

          <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>客户状态</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="选择客户状态" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value={CustomerStatusEnum.FOLLOWING}>{CustomerStatusText.FOLLOWING}</SelectItem>
                              <SelectItem value={CustomerStatusEnum.NEGOTIATING}>{CustomerStatusText.NEGOTIATING}</SelectItem>
                              <SelectItem value={CustomerStatusEnum.PENDING}>{CustomerStatusText.PENDING}</SelectItem>
                              <SelectItem value={CustomerStatusEnum.SIGNED}>{CustomerStatusText.SIGNED}</SelectItem>
                              <SelectItem value={CustomerStatusEnum.COMPLETED}>{CustomerStatusText.COMPLETED}</SelectItem>
                              <SelectItem value={CustomerStatusEnum.LOST}>{CustomerStatusText.LOST}</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )}
          />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>备注</FormLabel>
              <FormControl>
                <Textarea placeholder="请输入备注信息 (可选)" {...field} value={field.value || ''} disabled={isLoading}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '提交中...' : '提交报备'}
        </Button>
      </form>
    </Form>
  );
}
