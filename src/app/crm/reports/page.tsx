'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { isAdmin } from '@/lib/auth-helpers';

// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic';

export default function CRMReportsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('customers');
  const [customerData, setCustomerData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  const isAdminUser = isAdmin(session);

  // 获取报表数据
  const fetchReportData = async () => {
    setLoading(true);
    try {
      // 获取客户分析数据
      const customerResponse = await fetch(`/api/analytics/customers?period=${period}`);
      if (!customerResponse.ok) {
        throw new Error('获取客户分析数据失败');
      }
      const customerAnalytics = await customerResponse.json();
      setCustomerData(customerAnalytics);

      // 如果是管理员，获取用户分析数据
      if (isAdminUser) {
        const userResponse = await fetch(`/api/analytics/users?period=${period}`);
        if (!userResponse.ok) {
          throw new Error('获取用户分析数据失败');
        }
        const userAnalytics = await userResponse.json();
        setUserData(userAnalytics);
      }
    } catch (error) {
      console.error('获取报表数据失败:', error);
      toast({
        variant: 'destructive',
        title: '获取报表数据失败',
        description: error instanceof Error ? error.message : '请稍后重试'
      });
    } finally {
      setLoading(false);
    }
  };

  // 当周期或活跃标签变化时刷新数据
  useEffect(() => {
    if (status === 'authenticated') {
      fetchReportData();
    }
  }, [period, activeTab, status]);

  // 处理周期选择变化
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
  };

  // 处理标签变化
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">CRM 报表分析</h1>
        <Card>
          <CardHeader>
            <CardTitle>加载中...</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>需要登录</CardTitle>
            <CardDescription>请登录后查看报表分析</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">CRM 报表分析</h1>
        <div className="flex gap-4">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择时间范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">最近一个月</SelectItem>
              <SelectItem value="quarter">最近一个季度</SelectItem>
              <SelectItem value="year">最近一年</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchReportData} variant="outline">刷新数据</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="customers">客户分析</TabsTrigger>
          {isAdminUser && <TabsTrigger value="users">用户分析</TabsTrigger>}
        </TabsList>

        <TabsContent value="customers">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-[100px] w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : customerData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>总客户数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{customerData.totalCustomers}</p>
                    {customerData.isAdminView && (
                      <p className="text-sm text-muted-foreground">所有合作伙伴的客户</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>新增客户</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{customerData.newCustomers}</p>
                    <p className="text-sm text-muted-foreground">
                      {period === 'month' ? '过去一个月' : 
                       period === 'quarter' ? '过去一个季度' : '过去一年'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>客户状态分布</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(customerData.statusStatistics || {}).map(([status, count]) => (
                        <div key={status} className="flex justify-between">
                          <span>{status}</span>
                          <span className="font-medium">{String(count)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>没有数据</CardTitle>
                <CardDescription>暂无客户分析数据</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        {isAdminUser && (
          <TabsContent value="users">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-[100px] w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : userData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>总合作伙伴</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{userData.totalPartners}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>新增合作伙伴</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{userData.newPartners}</p>
                      <p className="text-sm text-muted-foreground">
                        {period === 'month' ? '过去一个月' : 
                         period === 'quarter' ? '过去一个季度' : '过去一年'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>活跃合作伙伴</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{userData.activePartners}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>待激活合作伙伴</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{userData.inactivePartners}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>合作伙伴客户报备排名</CardTitle>
                    <CardDescription>合作伙伴客户数量排名（前10名）</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userData.topPartners && userData.topPartners.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="py-2 text-left">合作伙伴</th>
                              <th className="py-2 text-left">邮箱</th>
                              <th className="py-2 text-right">客户数量</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userData.topPartners.map((partner: any) => (
                              <tr key={partner.id} className="border-b">
                                <td className="py-2">{partner.name}</td>
                                <td className="py-2">{partner.email}</td>
                                <td className="py-2 text-right">{partner.customerCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">暂无合作伙伴排名数据</p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>没有数据</CardTitle>
                  <CardDescription>暂无用户分析数据</CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 