'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CRMReportsPage() {
  const reports = [
    { id: 'customer-growth', name: '客户增长分析' },
    { id: 'sales-pipeline', name: '销售管道分析' },
    { id: 'activity-tracking', name: '活动跟踪报告' },
    { id: 'conversion-rates', name: '转化率分析' },
  ];

  const handleGenerateReport = async (reportId: string) => {
    try {
      // TODO: 实现生成报告的 API 调用
      console.log('生成报告:', reportId);
    } catch (error) {
      console.error('生成报告失败:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">CRM 报表分析</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>可用报表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => handleGenerateReport(report.id)}
                      className="w-full"
                    >
                      生成报告
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 