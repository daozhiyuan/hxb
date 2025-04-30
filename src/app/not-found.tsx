import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="container mx-auto py-10 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">404</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            抱歉，您访问的页面不存在
          </p>
          <Link href="/dashboard">
            <Button>
              返回仪表盘
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
} 