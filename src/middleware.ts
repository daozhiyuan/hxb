import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Role } from '@prisma/client';

// 此中间件用于处理认证和动态 API 路由
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 公共路径列表 - 这些路径无需认证
  const publicPaths = ['/', '/login', '/register', '/auth', '/api/auth', '/favicon.ico', '/_next'];
  
  // 检查当前路径是否是公共路径
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // 如果是公共路径、静态资源或API路由，直接放行
  if (isPublicPath || 
      pathname.startsWith('/api/') || 
      pathname.includes('/_next/') || 
      pathname.includes('/static/') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.jpeg') ||
      pathname.endsWith('.ico')) {
    return NextResponse.next();
  }

  // 获取JWT令牌以验证用户身份
  const token = await getToken({ req: request });

  // 如果用户未登录，重定向到登录页
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // 针对特定路径的角色检查
  const role = token.role as string;

  // 管理员路由检查 - 只有管理员和超级管理员可以访问
  if (pathname.startsWith('/admin')) {
    if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    // 超级管理员专用路径
    if ((pathname.startsWith('/admin/super') || pathname.startsWith('/admin/tools')) && role !== Role.SUPER_ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // 允许任何已登录用户访问申诉提交页面
  // 之前的代码: 合作伙伴路由检查
  // if (pathname.startsWith('/appeals/submit') && role !== 'PARTNER') {
  //   return NextResponse.redirect(new URL('/unauthorized', request.url));
  // }

  // 用户已登录且有适当的权限，允许访问
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 跳过静态文件和公共资产
    '/((?!_next/static|_next/image|favicon.ico|images|public).*)',
  ],
}; 