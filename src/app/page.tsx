import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

// 添加动态页面配置
export const dynamic = 'force-dynamic'; // 强制动态渲染
export const fetchCache = 'force-no-store'; // 禁用页面响应缓存
export const revalidate = 0; // 不进行重新验证
export const dynamicParams = true; // 动态参数

// 这个页面是静态的，不依赖于服务器数据或会话状态
export default function HomePage() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">客户管理系统</CardTitle>
          <CardDescription className="text-lg">高效管理您的客户和业务关系</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            欢迎使用我们的客户管理系统。该系统提供客户管理、申诉处理、数据分析等功能，
            帮助您更高效地管理客户关系，提升业务表现。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="flex flex-col items-center p-4 rounded-lg border">
              <h3 className="font-semibold">客户管理</h3>
              <p className="text-sm text-muted-foreground">全面管理客户信息</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg border">
              <h3 className="font-semibold">申诉处理</h3>
              <p className="text-sm text-muted-foreground">高效处理客户申诉</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg border">
              <h3 className="font-semibold">数据分析</h3>
              <p className="text-sm text-muted-foreground">深入分析业务数据</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg border">
              <h3 className="font-semibold">系统管理</h3>
              <p className="text-sm text-muted-foreground">灵活配置系统设置</p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center space-x-4">
          <Link href="/login">
            <Button size="lg">登录系统</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">注册账号</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
