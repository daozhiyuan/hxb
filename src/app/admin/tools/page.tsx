'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Shield, ShieldAlert, WrenchIcon, RotateCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { isSuperAdmin } from '@/lib/auth-helpers';

interface FixResult {
  message: string;
  results?: {
    total: number;
    fixed: number;
    fixedWithHash: number;
    resetToTemp: number;
    alreadyValid: number;
    unfixable: number;
    details: Array<{
      id: number;
      name: string;
      status: 'fixed' | 'fixed_with_hash' | 'already_valid' | 'unfixable' | 'reset_to_temp';
    }>;
  };
  customer?: { id: number; name: string };
  error?: string;
}

export default function AdminToolsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [singleCustomerId, setSingleCustomerId] = useState<string>('');
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [isFixingAll, setIsFixingAll] = useState<boolean>(false);
  const [result, setResult] = useState<FixResult | null>(null);

  // 检查权限 - 使用权限辅助函数
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && !isSuperAdmin(session)) {
      router.replace('/unauthorized');
    }
  }, [status, session, router]);

  // 修复单个客户身份证数据
  const handleFixSingle = async () => {
    if (!singleCustomerId || !/^\d+$/.test(singleCustomerId)) {
      toast({
        title: "错误",
        description: "请输入有效的客户ID",
        variant: "destructive"
      });
      return;
    }

    setIsFixing(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/fix-id-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customerId: singleCustomerId })
      });

      const data = await response.json();
      setResult(data);

      // 显示操作结果
      toast({
        title: response.ok ? "操作成功" : "操作失败",
        description: data.message || data.error,
        variant: response.ok ? "default" : "destructive"
      });
    } catch (error) {
      console.error('修复失败:', error);
      toast({
        title: "操作失败",
        description: "网络错误或服务器异常",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  // 修复所有客户身份证数据
  const handleFixAll = async () => {
    const confirm = window.confirm('您确定要修复所有客户的身份证数据吗？这可能需要一些时间。');
    if (!confirm) return;

    setIsFixingAll(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/fix-id-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      setResult(data);

      // 显示操作结果
      toast({
        title: response.ok ? "批量修复完成" : "批量修复失败",
        description: data.message || data.error,
        variant: response.ok ? "default" : "destructive"
      });
    } catch (error) {
      console.error('批量修复失败:', error);
      toast({
        title: "操作失败",
        description: "网络错误或服务器异常",
        variant: "destructive"
      });
    } finally {
      setIsFixingAll(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>加载中...</p>
      </div>
    );
  }

  if (status === 'authenticated' && isSuperAdmin(session)) {
    return (
      <div className="container mx-auto py-10">
        <Card className="mb-6">
          <CardHeader className="bg-yellow-50">
            <div className="flex items-center gap-2">
              <WrenchIcon className="h-6 w-6 text-yellow-600" />
              <CardTitle>系统管理工具</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Alert className="mb-4">
              <Shield className="h-4 w-4" />
              <AlertTitle>高级管理区域</AlertTitle>
              <AlertDescription>
                这些工具只供超级管理员使用，可以帮助修复系统中的数据问题。请谨慎操作。
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="single">
              <TabsList className="mb-4">
                <TabsTrigger value="single">修复单个客户</TabsTrigger>
                <TabsTrigger value="all">修复所有客户</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="p-4 border rounded-md">
                <h3 className="text-lg font-medium mb-3">修复单个客户身份证数据</h3>
                <div className="flex gap-2 mb-4">
                  <Input
                    type="number"
                    placeholder="输入客户ID"
                    value={singleCustomerId}
                    onChange={(e) => setSingleCustomerId(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Button 
                    onClick={handleFixSingle} 
                    disabled={isFixing || !singleCustomerId}
                  >
                    {isFixing ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        修复中...
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4 mr-2" />
                        修复数据
                      </>
                    )}
                  </Button>
                </div>
                
                {result && result.customer && (
                  <div className={`p-3 rounded-md ${
                    result.error ? 'bg-red-50' : 
                    result.message.includes('重置') ? 'bg-amber-50' : 'bg-green-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {result.error ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : result.message.includes('重置') ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      <p className="font-medium">
                        {result.message || result.error}
                      </p>
                    </div>
                    <p>
                      客户: ID {result.customer.id} - {result.customer.name}
                    </p>
                    {(result.error || result.message.includes('重置') || result.message.includes('手动')) && (
                      <div className="mt-2">
                        <Link 
                          href={`/admin/super-edit/${result.customer.id}`}
                          className="text-blue-600 underline"
                        >
                          编辑此客户
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="all" className="p-4 border rounded-md">
                <h3 className="text-lg font-medium mb-3">批量修复所有客户身份证数据</h3>
                <Alert className="mb-4 bg-amber-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>谨慎操作</AlertTitle>
                  <AlertDescription>
                    此操作将尝试修复所有客户的身份证数据。如果数据量大，可能需要一些时间。
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleFixAll} 
                  disabled={isFixingAll}
                  variant="destructive"
                >
                  {isFixingAll ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      修复中...这可能需要一些时间
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4 mr-2" />
                      修复所有数据
                    </>
                  )}
                </Button>
                
                {result && result.results && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <h4 className="font-medium mb-2">修复结果</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      <div className="p-2 bg-blue-50 rounded-md">
                        <div className="text-sm text-blue-500">总客户数</div>
                        <div className="text-lg font-medium">{result.results.total}</div>
                      </div>
                      <div className="p-2 bg-green-50 rounded-md">
                        <div className="text-sm text-green-500">修复成功</div>
                        <div className="text-lg font-medium">
                          {result.results.fixed + (result.results.fixedWithHash || 0)}
                        </div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-md">
                        <div className="text-sm text-gray-500">已经正确</div>
                        <div className="text-lg font-medium">{result.results.alreadyValid}</div>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-md">
                        <div className="text-sm text-amber-500">重置为临时数据</div>
                        <div className="text-lg font-medium">{result.results.resetToTemp || 0}</div>
                      </div>
                    </div>
                    
                    {/* 备注说明 */}
                    {(result.results.fixed > 0 || result.results.fixedWithHash > 0 || result.results.resetToTemp > 0) && (
                      <div className="mb-4 text-sm p-2 bg-yellow-50 rounded-md">
                        <p className="font-medium mb-1">修复详情:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {result.results.fixedWithHash > 0 && (
                            <li className="text-green-700">
                              {result.results.fixedWithHash} 个客户的身份证号码和哈希值均已修复
                            </li>
                          )}
                          {result.results.fixed > 0 && (
                            <li className="text-yellow-700">
                              {result.results.fixed} 个客户的身份证号码已修复，但哈希值需要手动设置
                            </li>
                          )}
                          {result.results.resetToTemp > 0 && (
                            <li className="text-amber-700">
                              {result.results.resetToTemp} 个客户的数据无法自动修复，已设置为临时数据，需要手动输入身份证号码
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {/* 结果详情 */}
                    {result.results.unfixable > 0 && (
                      <div>
                        <h5 className="font-medium mb-2">需要手动修复的客户：</h5>
                        <div className="max-h-[200px] overflow-y-auto">
                          <ul className="space-y-1">
                            {result.results.details
                              .filter(item => item.status === 'unfixable')
                              .map(item => (
                                <li key={item.id} className="flex items-center justify-between py-1 px-2 bg-red-50 rounded">
                                  <span>ID {item.id} - {item.name}</span>
                                  <Link 
                                    href={`/admin/super-edit/${item.id}`}
                                    className="text-blue-600 text-sm underline"
                                  >
                                    编辑
                                  </Link>
                                </li>
                              ))
                            }
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* 重置为临时数据的客户 */}
                    {(result.results.resetToTemp > 0) && (
                      <div className="mt-4">
                        <h5 className="font-medium mb-2 text-amber-700">需要手动输入身份证号码的客户：</h5>
                        <div className="max-h-[200px] overflow-y-auto">
                          <ul className="space-y-1">
                            {result.results.details
                              .filter(item => item.status === 'reset_to_temp')
                              .map(item => (
                                <li key={item.id} className="flex items-center justify-between py-1 px-2 bg-amber-50 rounded">
                                  <span>ID {item.id} - {item.name}</span>
                                  <Link 
                                    href={`/admin/super-edit/${item.id}`}
                                    className="text-blue-600 text-sm underline"
                                  >
                                    编辑
                                  </Link>
                                </li>
                              ))
                            }
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* 只修复了加密但未修复哈希的客户 */}
                    {(result.results.fixed > 0) && (
                      <div className="mt-4">
                        <h5 className="font-medium mb-2">需要手动设置身份证的客户：</h5>
                        <div className="max-h-[200px] overflow-y-auto">
                          <ul className="space-y-1">
                            {result.results.details
                              .filter(item => item.status === 'fixed')
                              .map(item => (
                                <li key={item.id} className="flex items-center justify-between py-1 px-2 bg-yellow-50 rounded">
                                  <span>ID {item.id} - {item.name}</span>
                                  <Link 
                                    href={`/admin/super-edit/${item.id}`}
                                    className="text-blue-600 text-sm underline"
                                  >
                                    编辑
                                  </Link>
                                </li>
                              ))
                            }
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/admin/super">
              <Button variant="outline">返回管理面板</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null;
} 