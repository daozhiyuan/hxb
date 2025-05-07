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
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 定义合作伙伴个人资料字段
const profileSchema = z.object({
  name: z.string().min(1, { message: "姓名不能为空" }).trim(),
  email: z.string().email({ message: "请输入有效的邮箱地址" }).trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
});

// 定义收款账户信息字段
const paymentSchema = z.object({
  bankName: z.string().min(1, { message: "开户银行不能为空" }).trim(),
  bankAccount: z.string().min(1, { message: "银行账号不能为空" }).trim(),
  accountName: z.string().min(1, { message: "开户名不能为空" }).trim(),
  alipayAccount: z.string().optional(),
  wechatAccount: z.string().optional(),
});

// 定义发票信息字段
const invoiceSchema = z.object({
  invoiceTitle: z.string().min(1, { message: "发票抬头不能为空" }).trim(),
  taxId: z.string().min(1, { message: "税号不能为空" }).trim(),
  invoiceAddress: z.string().optional(),
  invoicePhone: z.string().optional(),
  invoiceBank: z.string().optional(),
  invoiceBankAccount: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;
type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export function PartnerProfile() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // 个人资料表单
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      company: "",
      position: "",
    },
  });

  // 收款账户表单
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      bankName: "",
      bankAccount: "",
      accountName: "",
      alipayAccount: "",
      wechatAccount: "",
    },
  });

  // 发票信息表单
  const invoiceForm = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceTitle: "",
      taxId: "",
      invoiceAddress: "",
      invoicePhone: "",
      invoiceBank: "",
      invoiceBankAccount: "",
    },
  });

  // 加载合作伙伴数据
  useEffect(() => {
    if (session?.user?.id) {
      loadPartnerData();
    }
  }, [session]);

  // 加载合作伙伴数据
  const loadPartnerData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/partners/profile`);
      if (response.ok) {
        const data = await response.json();
        
        // 更新个人资料表单
        profileForm.reset({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          company: data.company || "",
          position: data.position || "",
        });
        
        // 更新收款账户表单
        paymentForm.reset({
          bankName: data.bankName || "",
          bankAccount: data.bankAccount || "",
          accountName: data.accountName || "",
          alipayAccount: data.alipayAccount || "",
          wechatAccount: data.wechatAccount || "",
        });
        
        // 更新发票信息表单
        invoiceForm.reset({
          invoiceTitle: data.invoiceTitle || "",
          taxId: data.taxId || "",
          invoiceAddress: data.invoiceAddress || "",
          invoicePhone: data.invoicePhone || "",
          invoiceBank: data.invoiceBank || "",
          invoiceBankAccount: data.invoiceBankAccount || "",
        });
      }
    } catch (error) {
      console.error("加载合作伙伴数据失败:", error);
      toast({
        title: "加载失败",
        description: "无法加载个人资料，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 保存个人资料
  const onProfileSubmit = async (values: ProfileFormValues) => {
    await savePartnerData("profile", values);
  };

  // 保存收款账户信息
  const onPaymentSubmit = async (values: PaymentFormValues) => {
    await savePartnerData("payment", values);
  };

  // 保存发票信息
  const onInvoiceSubmit = async (values: InvoiceFormValues) => {
    await savePartnerData("invoice", values);
  };

  // 保存合作伙伴数据
  const savePartnerData = async (type: string, values: any) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/partners/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          data: values,
        }),
      });

      if (response.ok) {
        toast({
          title: "保存成功",
          description: "您的信息已成功更新",
        });
      } else {
        const error = await response.json();
        toast({
          title: "保存失败",
          description: error.message || "无法保存您的信息，请稍后重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("保存合作伙伴数据失败:", error);
      toast({
        title: "保存失败",
        description: "无法保存您的信息，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>个人中心</CardTitle>
        <CardDescription>管理您的个人信息和财务设置</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="profile">基本资料</TabsTrigger>
            <TabsTrigger value="payment">收款账户</TabsTrigger>
            <TabsTrigger value="invoice">发票信息</TabsTrigger>
          </TabsList>

          {/* 个人资料表单 */}
          <TabsContent value="profile">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入您的姓名" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入您的邮箱" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>联系电话</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入您的联系电话" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>联系地址</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入您的联系地址" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>公司名称</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入您的公司名称" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>职位</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入您的职位" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "保存中..." : "保存基本资料"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* 收款账户表单 */}
          <TabsContent value="payment">
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                <FormField
                  control={paymentForm.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>开户银行</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入开户银行" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>银行账号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入银行账号" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>开户名</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入开户名" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="alipayAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>支付宝账号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入支付宝账号" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="wechatAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>微信账号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入微信账号" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "保存中..." : "保存收款账户"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* 发票信息表单 */}
          <TabsContent value="invoice">
            <Form {...invoiceForm}>
              <form onSubmit={invoiceForm.handleSubmit(onInvoiceSubmit)} className="space-y-4">
                <FormField
                  control={invoiceForm.control}
                  name="invoiceTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>发票抬头</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入发票抬头" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={invoiceForm.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>税号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入税号" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={invoiceForm.control}
                  name="invoiceAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>开票地址</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入开票地址" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={invoiceForm.control}
                  name="invoicePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>开票电话</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入开票电话" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={invoiceForm.control}
                  name="invoiceBank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>开户银行</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入开户银行" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={invoiceForm.control}
                  name="invoiceBankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>银行账号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入银行账号" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "保存中..." : "保存发票信息"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 