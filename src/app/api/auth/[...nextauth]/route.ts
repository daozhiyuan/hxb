import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// 静态导出NextAuth路由处理器，添加正确的配置
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 