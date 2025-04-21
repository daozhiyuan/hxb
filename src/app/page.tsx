import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5">欢迎使用 客盈宝</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>合作伙伴注册/登录</CardTitle>
            <CardDescription>注册或登录以访问系统功能</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/register">
              <Button className="w-full">注册/登录</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>客户报备</CardTitle>
            <CardDescription>录入客户详细信息</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/customer/report">
              <Button className="w-full">客户报备</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>申诉管理</CardTitle>
            <CardDescription>查看和管理您的申诉</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/appeals">
              <Button className="w-full">申诉管理</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>数据导出 (管理员)</CardTitle>
            <CardDescription>导出合作伙伴和客户信息 (仅限管理员)</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/export">
              <Button disabled className="w-full">
                数据导出 (即将推出)
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
