import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
// 移除 Prisma 导入，改用枚举定义
// import { Role } from '@prisma/client';

// 定义Role枚举替代Prisma导入
enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  PARTNER = 'PARTNER'
}

// 内存存储最近的请求（生产环境应使用Redis等分布式存储）
const ipRequestMap = new Map<string, { count: number; timestamp: number }>();

// 清理过期记录的间隔（毫秒）
const CLEANUP_INTERVAL = 60 * 1000; // 1分钟

// 速率限制配置
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟窗口
const API_RATE_LIMIT = 60; // API路由每分钟最大请求数
const HEALTH_RATE_LIMIT = 30; // 健康检查每分钟最大请求数

// 定期清理过期的速率限制记录
if (typeof global !== 'undefined') {
  const cleanup = () => {
    const now = Date.now();
    for (const [ip, data] of ipRequestMap.entries()) {
      if (now - data.timestamp > RATE_LIMIT_WINDOW) {
        ipRequestMap.delete(ip);
      }
    }
  };
  
  // 启动清理任务
  setInterval(cleanup, CLEANUP_INTERVAL);
}

/**
 * 检查IP是否超出速率限制
 * @param ip 客户端IP
 * @param limit 允许的最大请求数
 * @returns 是否超出限制
 */
function isRateLimited(ip: string, limit: number): boolean {
  const now = Date.now();
  const requestData = ipRequestMap.get(ip);
  
  if (!requestData || now - requestData.timestamp > RATE_LIMIT_WINDOW) {
    // 新窗口期，重置计数
    ipRequestMap.set(ip, { count: 1, timestamp: now });
    return false;
  }
  
  // 更新计数
  requestData.count += 1;
  
  // 检查是否超出限制
  return requestData.count > limit;
}

// 此中间件用于处理认证和动态 API 路由
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('[Middleware] Processing request for:', pathname);
  console.log('[Middleware] Request Headers:', Object.fromEntries(request.headers.entries()));

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
    // 获取客户端IP
    const ip = request.ip || 
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      '127.0.0.1';
    
    // 仅限制API路由
    if (pathname.startsWith('/api/')) {
      // 健康检查路由使用不同的限制配置
      const limit = pathname === '/api/health' ? HEALTH_RATE_LIMIT : API_RATE_LIMIT;
      
      if (isRateLimited(ip, limit)) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: { 
              message: '请求过于频繁，请稍后再试',
              code: 'RATE_LIMITED'  
            },
            timestamp: new Date().toISOString()
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString()
            }
          }
        );
      }
    }
    return NextResponse.next();
  }

  // 获取JWT令牌以验证用户身份
  console.log('[Middleware] Processing request for:', pathname);
  console.log('[Middleware] Request Headers:', Object.fromEntries(request.headers.entries()));
  
  const cookieName = 'next-auth.session-token'; // 与 authOptions 中定义的 cookie 名称一致
    
  // 在生产环境中，cookie 应该是 secure 的
  // next-auth 内部会根据 secure: true 和 sameSite: "none" 正确处理
  // const isSecureCookie = process.env.NODE_ENV === 'production'; // getToken v4 会自动处理 secure

  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: cookieName, // 明确指定 cookie 名称
  });
  
  console.log('[Middleware] Token status:', token ? 'Found' : 'Not found');
  if (token) {
    console.log('[Middleware] Token details:', { 
      role: token.role,
      email: token.email,
    });
  }

  // 如果用户未登录，重定向到登录页
  if (!token) {
    console.log('[Middleware] Token not found, redirecting to login.');
    const baseUrl = process.env.NEXTAUTH_URL || 'https://bb.keti.eu.org';
    const loginUrl = new URL('/login', baseUrl);
    
    // 确保回调URL是完整的路径
    const fullPath = request.nextUrl.pathname + request.nextUrl.search;
    loginUrl.searchParams.set('callbackUrl', fullPath);
    
    console.log('[Middleware] Redirecting to:', loginUrl.toString());
    
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('X-Debug-Middleware-Token', 'not-found');
    return response;
  }

  // 针对特定路径的角色检查
  const role = token.role as string;
  console.log('[Middleware] Checking role access:', { path: pathname, role });

  // 管理员路由检查
  if (pathname.startsWith('/admin')) {
    if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
      console.log('[Middleware] Access denied to admin route');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    // 超级管理员专用路径
    if ((pathname.startsWith('/admin/super') || pathname.startsWith('/admin/tools')) && role !== Role.SUPER_ADMIN) {
      console.log('[Middleware] Access denied to super admin route');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  console.log('[Middleware] Access granted');
  return NextResponse.next();
}

// 中间件配置，只对API请求和需要认证的页面请求应用
export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/admin/:path*',
    '/appeals/submit',
    // 添加其他需要认证的路径
  ],
}; 