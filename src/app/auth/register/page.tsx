import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';

// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>合作伙伴注册</CardTitle>
          <CardDescription>请填写以下信息进行注册，等待管理员审核通过后登录系统。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>注册页面正在开发中，敬请期待！</p>
          <Button disabled>注册</Button>
        </CardContent>
      </Card>
    </div>
  );
}
