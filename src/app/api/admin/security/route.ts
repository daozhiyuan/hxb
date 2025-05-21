import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { hasPermission } from '@/lib/auth-helpers';
import { 
  successResponse, 
  unauthorizedResponse, 
  forbiddenResponse,
  serverErrorResponse
} from '@/lib/api-response';
import os from 'os';

// 禁用缓存，确保每次请求获取最新状态
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * 安全监控API路由
 * 提供系统和环境安全信息，仅供管理员访问
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // 权限检查：仅超级管理员可访问
    if (!hasPermission(session, null, Role.SUPER_ADMIN)) {
      return session ? forbiddenResponse() : unauthorizedResponse();
    }
    
    // 收集系统信息
    const systemInfo = {
      environment: process.env.NODE_ENV || 'production',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCores: os.cpus().length,
      memory: {
        total: Math.round(os.totalmem() / (1024 * 1024 * 1024) * 100) / 100 + ' GB',
        free: Math.round(os.freemem() / (1024 * 1024 * 1024) * 100) / 100 + ' GB',
        usage: Math.round((1 - os.freemem() / os.totalmem()) * 10000) / 100 + '%'
      },
      uptime: Math.floor(os.uptime() / 3600) + ' hours'
    };
    
    // 检查安全配置
    const securityConfig = {
      encryptionKeyConfigured: !!process.env.ENCRYPTION_KEY,
      oldEncryptionKeyConfigured: !!process.env.OLD_ENCRYPTION_KEY,
      nextAuthSecretConfigured: !!process.env.NEXTAUTH_SECRET,
      databaseUrlConfigured: !!process.env.DATABASE_URL,
      csrfProtectionEnabled: true,
      rateLimit: {
        enabled: true,
        apiLimit: 60,
        healthLimit: 30
      }
    };
    
    // 安全头部配置
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': process.env.CSP_POLICY || '未配置'
    };
    
    // 构建完整响应
    const securityReport = {
      timestamp: new Date().toISOString(),
      systemInfo,
      securityConfig,
      securityHeaders,
      user: {
        id: session?.user?.id,
        email: session?.user?.email,
        role: session?.user?.role
      }
    };
    
    return successResponse(securityReport);
  } catch (error) {
    return serverErrorResponse(error);
  }
} 