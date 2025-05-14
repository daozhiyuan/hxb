import { NextResponse } from 'next/server';

// 禁用缓存，确保每次请求获取最新状态
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * 健康检查API
 * 简化版，仅返回状态和时间戳
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
} 