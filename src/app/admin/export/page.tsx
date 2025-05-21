'use client';

import { ClientProvider } from '@/components/client-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';

export default function AdminExportPage() {
  const { toast } = useToast();
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingPartners, setLoadingPartners] = useState(false);

  const exportCustomers = async () => {
    setLoadingCustomers(true);
    try {
      // 在静态构建模式下不执行实际的导出逻辑
      toast({
        title: '导出客户数据',
        description: '此功能在应用程序部署后可用',
      });
    } catch (error) {
      console.error('导出客户数据失败:', error);
      toast({
        variant: 'destructive',
        title: '导出失败',
        description: '导出客户数据时发生错误，请稍后重试',
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const exportPartners = async () => {
    setLoadingPartners(true);
    try {
      // 在静态构建模式下不执行实际的导出逻辑
      toast({
        title: '导出合作伙伴数据',
        description: '此功能在应用程序部署后可用',
      });
    } catch (error) {
      console.error('导出合作伙伴数据失败:', error);
      toast({
        variant: 'destructive',
        title: '导出失败',
        description: '导出合作伙伴数据时发生错误，请稍后重试',
      });
    } finally {
      setLoadingPartners(false);
    }
  };

  return (
    <ClientProvider requireAuth requireAdmin>
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">数据导出</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>客户数据导出</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-gray-500">
                导出所有客户数据为 CSV 文件，包含客户的基本信息、状态和注册时间等。
              </p>
              <Button 
                onClick={exportCustomers} 
                disabled={loadingCustomers}
                className="w-full"
              >
                {loadingCustomers ? '导出中...' : '导出客户数据'}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>合作伙伴数据导出</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-gray-500">
                导出所有合作伙伴数据为 CSV 文件，包含合作伙伴的基本信息和注册的客户数量等。
              </p>
              <Button 
                onClick={exportPartners} 
                disabled={loadingPartners}
                className="w-full"
              >
                {loadingPartners ? '导出中...' : '导出合作伙伴数据'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientProvider>
  );
}
