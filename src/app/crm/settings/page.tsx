'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function CRMSettingsPage() {
  const [settings, setSettings] = useState({
    notificationEmail: '',
    autoFollowUp: true,
    defaultPipeline: 'standard',
    dataRetentionDays: 365,
  });

  const handleSave = async () => {
    try {
      // TODO: 实现保存设置的 API 调用
      console.log('保存设置:', settings);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">CRM 设置</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>通知设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notificationEmail">通知邮箱</Label>
              <Input
                id="notificationEmail"
                type="email"
                value={settings.notificationEmail}
                onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
                placeholder="输入接收通知的邮箱地址"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>自动化设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoFollowUp"
                checked={settings.autoFollowUp}
                onChange={(e) => setSettings({ ...settings, autoFollowUp: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="autoFollowUp">启用自动跟进</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataRetentionDays">数据保留天数</Label>
              <Input
                id="dataRetentionDays"
                type="number"
                value={settings.dataRetentionDays}
                onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
                min="30"
                max="3650"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>保存设置</Button>
        </div>
      </div>
    </div>
  );
} 