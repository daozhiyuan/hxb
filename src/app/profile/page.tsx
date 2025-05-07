'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClientProvider } from '@/components/client-provider';
import { Header } from '@/components/header';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  });

  // 页面加载时获取当前用户资料
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // 仅更新已知存在于session中的字段
        setFormData(prev => ({
          ...prev,
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        }));

        // 获取完整的用户资料
        const response = await fetch('/api/profile');
        if (response.ok) {
          const userData = await response.json();
          setFormData(prev => ({
            ...prev,
            company: userData.company || '',
            phone: userData.phone || '',
          }));
        }
      } catch (error) {
        console.error('获取用户资料失败:', error);
      }
    };

    if (session?.user) {
      fetchUserProfile();
    }
  }, [session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          company: formData.company,
          phone: formData.phone,
        }),
      });

      if (!response.ok) {
        throw new Error('更新个人信息失败');
      }

      const data = await response.json();
      
      // 只更新session中已知存在的字段
      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
        },
      });

      toast.success('个人信息更新成功');
    } catch (error) {
      console.error('更新个人信息失败:', error);
      toast.error('更新个人信息失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ClientProvider requireAuth>
      <Header />
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">个人中心</h1>

        <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>个人资料</CardTitle>
              <CardDescription>查看和更新您的个人信息</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    disabled
                    readOnly
                  />
                  <p className="text-xs text-muted-foreground">邮箱地址不可修改</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="请输入您的姓名"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="company">公司名称</Label>
                  <Input
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="请输入您的公司名称"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">联系电话</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="请输入您的联系电话"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? '保存中...' : '保存修改'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientProvider>
  );
}