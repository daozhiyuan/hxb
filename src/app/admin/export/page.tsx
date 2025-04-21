import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';

export default function ExportDataPage() {
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>数据导出 (管理员)</CardTitle>
          <CardDescription>导出合作伙伴和客户信息 (仅限管理员)</CardDescription>
        </CardHeader>
        <CardContent>
          <p>此功能正在开发中，敬请期待！</p>
        </CardContent>
      </Card>
    </div>
  );
}
