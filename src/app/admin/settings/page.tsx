'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Settings, Shield, Save, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Role } from '@prisma/client';
import { toast } from 'sonner';
import { isSuperAdmin } from '@/lib/auth-helpers';

// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic';

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState({
    systemName: '客户管理系统',
    logoUrl: '/logo.png',
    primaryColor: '#0070f3',
    enableNotifications: true,
    defaultLanguage: 'zh-CN',
    dataRetentionDays: 365,
    maintenanceMode: false,
    debugMode: false,
    copyright: '© 2024 航向标. 保留所有权利。',
    companyName: '',
    icp: '',
  });

  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // 从API获取当前设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(prevSettings => ({ ...prevSettings, ...data }));
        }
      } catch (error) {
        console.error('获取设置失败:', error);
      }
    };

    if (session && isSuperAdmin(session)) {
      fetchSettings();
    }
  }, [session]);

  const handleSaveSettings = async () => {
    setLoading(true);
    setSaveError('');
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        // 显示成功对话框
        setShowSuccessDialog(true);
        toast.success('设置已成功保存');
      } else {
        const errorData = await response.json();
        setSaveError(errorData.message || '保存设置失败');
        toast.error('保存设置失败');
      }
    } catch (error) {
      console.error('保存设置出错:', error);
      setSaveError('无法连接到服务器，请稍后再试');
      toast.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 权限检查
  if (status === 'loading') {
    return <div className="container py-10">加载中...</div>;
  }

  if (status === 'unauthenticated') {
    return <div className="container py-10">请先登录</div>;
  }

  if (!isSuperAdmin(session)) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>访问被拒绝</AlertTitle>
          <AlertDescription>
            您没有权限访问系统设置页面。此页面仅供超级管理员使用。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Settings className="h-6 w-6 mr-2" />
          <h1 className="text-2xl font-bold">系统设置</h1>
        </div>
        <Button onClick={handleSaveSettings} disabled={loading}>
          {loading ? '保存中...' : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存设置
            </>
          )}
        </Button>
      </div>

      {saveError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>保存失败</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Alert className="mb-6 bg-yellow-50 border-yellow-200">
        <Shield className="h-4 w-4 text-yellow-800" />
        <AlertTitle className="text-yellow-800">超级管理员区域</AlertTitle>
        <AlertDescription className="text-yellow-700">
          此页面允许您配置系统的全局设置。请谨慎操作，这些更改将影响所有用户。
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">基本设置</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="appearance">外观设置</TabsTrigger>
          <TabsTrigger value="advanced">高级设置</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>系统信息</CardTitle>
                <CardDescription>配置系统的基本信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="systemName">系统名称</Label>
                  <Input
                    id="systemName"
                    name="systemName"
                    value={settings.systemName}
                    onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">公司名称</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    placeholder="输入公司名称"
                    autoComplete="organization"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">默认语言</Label>
                  <Select 
                    value={settings.defaultLanguage}
                    onValueChange={(value) => setSettings({ ...settings, defaultLanguage: value })}
                  >
                    <SelectTrigger id="defaultLanguage">
                      <SelectValue placeholder="选择默认语言" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="en-US">英文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="copyright">版权信息</Label>
                  <Input
                    id="copyright"
                    name="copyright"
                    value={settings.copyright}
                    onChange={(e) => setSettings({ ...settings, copyright: e.target.value })}
                    placeholder="版权信息将显示在网站底部"
                    autoComplete="off"
                  />
                  <p className="text-sm text-muted-foreground">
                    例如：© 2024 公司名称. 保留所有权利。
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icp">ICP备案号</Label>
                  <Input
                    id="icp"
                    name="icp"
                    value={settings.icp}
                    onChange={(e) => setSettings({ ...settings, icp: e.target.value })}
                    placeholder="例如：京ICP备XXXXXXXX号"
                    autoComplete="off"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>通知设置</CardTitle>
                <CardDescription>配置系统通知</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enableNotifications">启用系统通知</Label>
                  <Switch
                    id="enableNotifications"
                    name="enableNotifications"
                    checked={settings.enableNotifications}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, enableNotifications: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>数据安全</CardTitle>
              <CardDescription>配置数据安全和保留策略</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dataRetentionDays">数据保留天数</Label>
                <Input
                  id="dataRetentionDays"
                  name="dataRetentionDays"
                  type="number"
                  value={settings.dataRetentionDays}
                  onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
                  min="30"
                  max="3650"
                  autoComplete="off"
                />
                <p className="text-sm text-muted-foreground">
                  设置系统自动清理过期数据的天数（最短30天，最长10年）
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>品牌设置</CardTitle>
              <CardDescription>配置系统品牌和视觉标识</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  value={settings.logoUrl}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  autoComplete="off"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="primaryColor">主题色</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primaryColor"
                    name="primaryColor"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    autoComplete="off"
                  />
                  <div 
                    className="w-10 h-10 rounded-md border" 
                    style={{ backgroundColor: settings.primaryColor }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>高级选项</CardTitle>
              <CardDescription>谨慎调整这些设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenanceMode">维护模式</Label>
                  <p className="text-sm text-muted-foreground">
                    启用维护模式将使系统只对管理员可访问
                  </p>
                </div>
                <Switch
                  id="maintenanceMode"
                  name="maintenanceMode"
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, maintenanceMode: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="debugMode">调试模式</Label>
                  <p className="text-sm text-muted-foreground">
                    启用调试模式将显示详细的错误信息
                  </p>
                </div>
                <Switch
                  id="debugMode"
                  name="debugMode"
                  checked={settings.debugMode}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, debugMode: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 成功保存对话框 */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>设置已保存</AlertDialogTitle>
            <AlertDialogDescription>
              系统设置已成功保存，更改将立即生效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>
              <Check className="mr-2 h-4 w-4" />
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 